import { prisma } from "@/lib/prisma";
import type { NotificationKind } from "@prisma/client";

export type TenantNotificationDto = {
  id: string;
  kind: NotificationKind;
  title: string;
  titleAr: string | null;
  message: string;
  messageAr: string | null;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export async function listTenantNotifications({
  tenantId,
  recipientMembershipId,
  limit = 30,
  offset = 0,
  onlyUnread = false,
}: {
  tenantId: string;
  recipientMembershipId: string;
  limit?: number;
  offset?: number;
  onlyUnread?: boolean;
}): Promise<TenantNotificationDto[]> {
  const rows = await prisma.notification.findMany({
    where: {
      tenantId,
      recipientMembershipId,
      ...(onlyUnread ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    titleAr: r.titleAr,
    message: r.message,
    messageAr: r.messageAr,
    linkUrl: r.linkUrl,
    isRead: r.isRead,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getTenantUnreadNotificationCount({
  tenantId,
  recipientMembershipId,
}: {
  tenantId: string;
  recipientMembershipId: string;
}): Promise<number> {
  return prisma.notification.count({
    where: {
      tenantId,
      recipientMembershipId,
      isRead: false,
    },
  });
}

export async function markNotificationAsRead({
  tenantId,
  recipientMembershipId,
  notificationId,
}: {
  tenantId: string;
  recipientMembershipId: string;
  notificationId: string;
}): Promise<boolean> {
  const res = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      tenantId,
      recipientMembershipId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return res.count > 0;
}

export async function markAllNotificationsAsRead({
  tenantId,
  recipientMembershipId,
}: {
  tenantId: string;
  recipientMembershipId: string;
}): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: {
      tenantId,
      recipientMembershipId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
  return res.count;
}

export async function createTenantNotification({
  tenantId,
  recipientMembershipId,
  kind,
  title,
  titleAr,
  message,
  messageAr,
  linkUrl,
}: {
  tenantId: string;
  recipientMembershipId: string;
  kind: NotificationKind;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  linkUrl?: string | null;
}): Promise<TenantNotificationDto> {
  const r = await prisma.notification.create({
    data: {
      tenantId,
      recipientMembershipId,
      kind,
      title,
      titleAr: titleAr ?? null,
      message,
      messageAr: messageAr ?? null,
      linkUrl: linkUrl ?? null,
    },
  });
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    titleAr: r.titleAr,
    message: r.message,
    messageAr: r.messageAr,
    linkUrl: r.linkUrl,
    isRead: r.isRead,
    readAt: null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function notifyTenantStaff({
  tenantId,
  kind,
  title,
  titleAr,
  message,
  messageAr,
  linkUrl,
}: {
  tenantId: string;
  kind: NotificationKind;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  linkUrl?: string | null;
}): Promise<number> {
  const staff = await prisma.tenantMembership.findMany({
    where: {
      tenantId,
      role: { in: ["OWNER", "ADMIN", "ASSISTANT"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (staff.length === 0) return 0;

  await prisma.notification.createMany({
    data: staff.map((s) => ({
      tenantId,
      recipientMembershipId: s.id,
      kind,
      title,
      titleAr: titleAr ?? null,
      message,
      messageAr: messageAr ?? null,
      linkUrl: linkUrl ?? null,
    })),
  });

  return staff.length;
}
