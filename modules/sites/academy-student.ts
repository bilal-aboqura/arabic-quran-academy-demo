import { prisma } from '@/lib/prisma';
import type { TenantActor } from '@/modules/tenants/types';

/** Only an enrolled student's own tenant can supply the lesson card. */
export async function getAcademyStudentExtras(tenantId: string, actor: TenantActor) {
  if (actor.tenantId !== tenantId || actor.role !== 'STUDENT') return null;
  const membership = await prisma.tenantMembership.findFirst({ where: { id: actor.membershipId, tenantId, userId: actor.userId, role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } });
  if (!membership) return null;
  const site = await prisma.site.findUnique({ where: { tenantId }, select: { template: { select: { code: true } } } });
  if (site?.template?.code !== 'global-arabic-quran') return null;
  const [settings, lesson, notifications] = await Promise.all([
    prisma.tenantSettings.findUnique({ where: { tenantId }, select: { timezone: true } }),
    prisma.liveStream.findFirst({ where: { tenantId, scheduledAt: { gte: new Date() }, course: { tenantId, isPublished: true, enrollments: { some: { tenantId, studentMembershipId: membership.id } } } }, select: { title: true, titleAr: true, scheduledAt: true, course: { select: { title: true, titleAr: true, slug: true } } }, orderBy: { scheduledAt: 'asc' } }),
    prisma.notification.findMany({ where: { tenantId, recipientMembershipId: membership.id }, select: { id: true, title: true, titleAr: true, message: true, messageAr: true, isRead: true }, orderBy: { createdAt: 'desc' }, take: 4 }),
  ]);
  return { timezone: settings?.timezone || 'UTC', lesson: lesson ? { ...lesson, scheduledAt: lesson.scheduledAt.toISOString() } : null, notifications };
}


