import { beforeEach, describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ member: vi.fn(), site: vi.fn(), settings: vi.fn(), lesson: vi.fn(), notifications: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { tenantMembership: { findFirst: calls.member }, site: { findUnique: calls.site }, tenantSettings: { findUnique: calls.settings }, liveStream: { findFirst: calls.lesson }, notification: { findMany: calls.notifications } } }));
import { getAcademyStudentExtras } from '@/modules/sites/academy-student';
const actor = { tenantId: 'a', tenantSlug: 'a', hostname: 'a.example.org', domainKind: 'CUSTOM' as const, userId: 'u', membershipId: 'm', role: 'STUDENT' as const };
describe('academy student isolation', () => {
  beforeEach(() => { vi.clearAllMocks(); calls.member.mockResolvedValue({ id: 'm' }); calls.site.mockResolvedValue({ template: { code: 'global-arabic-quran' } }); calls.settings.mockResolvedValue({ timezone: 'UTC' }); calls.lesson.mockResolvedValue(null); calls.notifications.mockResolvedValue([]); });
  it('rejects mismatched tenants and nonstudents before querying', async () => {
    expect(await getAcademyStudentExtras('b', actor)).toBeNull();
    expect(await getAcademyStudentExtras('a', { ...actor, role: 'TEACHER' })).toBeNull();
    expect(calls.member).not.toHaveBeenCalled();
  });
  it('requires active membership before reading private content', async () => {
    calls.member.mockResolvedValue(null); expect(await getAcademyStudentExtras('a', actor)).toBeNull(); expect(calls.lesson).not.toHaveBeenCalled();
  });
  it('restricts lessons to enrollment and notifications to the membership', async () => {
    await getAcademyStudentExtras('a', actor);
    expect(calls.lesson).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'a', course: { tenantId: 'a', isPublished: true, enrollments: { some: { tenantId: 'a', studentMembershipId: 'm' } } } }) }));
    expect(calls.notifications).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'a', recipientMembershipId: 'm' } }));
  });
  it('does not change other template dashboards', async () => {
    calls.site.mockResolvedValue({ template: { code: 'clean-education' } }); expect(await getAcademyStudentExtras('a', actor)).toBeNull(); expect(calls.lesson).not.toHaveBeenCalled();
  });
});
