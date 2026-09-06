import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  create: vi.fn(),
  createMany: vi.fn(),
  membershipFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: calls.findMany,
      count: calls.count,
      updateMany: calls.updateMany,
      create: calls.create,
      createMany: calls.createMany,
    },
    tenantMembership: {
      findMany: calls.membershipFindMany,
    },
  },
}));

import {
  listTenantNotifications,
  getTenantUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createTenantNotification,
  notifyTenantStaff,
} from "@/modules/notifications/repository";

describe("tenant notifications repository", () => {
  const tenantId = "tenant-alpha";
  const recipientMembershipId = "member-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists notifications strictly scoped to tenantId and recipientMembershipId", async () => {
    calls.findMany.mockResolvedValue([
      {
        id: "notif-1",
        kind: "ENROLLMENT",
        title: "Enrolled in Course",
        titleAr: null,
        message: "You have enrolled in Physics",
        messageAr: null,
        linkUrl: "/courses/physics",
        isRead: false,
        readAt: null,
        createdAt: new Date("2026-09-03T10:00:00Z"),
      },
    ]);

    const result = await listTenantNotifications({ tenantId, recipientMembershipId });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("notif-1");
    expect(calls.findMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        recipientMembershipId,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      skip: 0,
    });
  });

  it("counts unread notifications for membership", async () => {
    calls.count.mockResolvedValue(4);
    const count = await getTenantUnreadNotificationCount({ tenantId, recipientMembershipId });
    expect(count).toBe(4);
    expect(calls.count).toHaveBeenCalledWith({
      where: {
        tenantId,
        recipientMembershipId,
        isRead: false,
      },
    });
  });

  it("marks a notification as read strictly within tenant and membership bounds", async () => {
    calls.updateMany.mockResolvedValue({ count: 1 });
    const success = await markNotificationAsRead({
      tenantId,
      recipientMembershipId,
      notificationId: "notif-1",
    });
    expect(success).toBe(true);
    expect(calls.updateMany).toHaveBeenCalledWith({
      where: {
        id: "notif-1",
        tenantId,
        recipientMembershipId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: expect.any(Date),
      },
    });
  });

  it("notifies all active tenant staff members", async () => {
    calls.membershipFindMany.mockResolvedValue([
      { id: "staff-1" },
      { id: "staff-2" },
    ]);
    calls.createMany.mockResolvedValue({ count: 2 });

    const count = await notifyTenantStaff({
      tenantId,
      kind: "ASSIGNMENT_SUBMITTED",
      title: "New Assignment Submission",
      message: "Student A submitted Physics Assignment",
    });

    expect(count).toBe(2);
    expect(calls.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId,
          recipientMembershipId: "staff-1",
          kind: "ASSIGNMENT_SUBMITTED",
          title: "New Assignment Submission",
          titleAr: null,
          message: "Student A submitted Physics Assignment",
          messageAr: null,
          linkUrl: null,
        },
        {
          tenantId,
          recipientMembershipId: "staff-2",
          kind: "ASSIGNMENT_SUBMITTED",
          title: "New Assignment Submission",
          titleAr: null,
          message: "Student A submitted Physics Assignment",
          messageAr: null,
          linkUrl: null,
        },
      ],
    });
  });

  it("marks all notifications as read for a membership", async () => {
    calls.updateMany.mockResolvedValue({ count: 5 });
    const count = await markAllNotificationsAsRead({ tenantId, recipientMembershipId });
    expect(count).toBe(5);
    expect(calls.updateMany).toHaveBeenCalledWith({
      where: { tenantId, recipientMembershipId, isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it("creates a single tenant notification", async () => {
    calls.create.mockResolvedValue({
      id: "notif-created",
      kind: "PAYMENT",
      title: "Payment Received",
      titleAr: null,
      message: "Order #123 was completed",
      messageAr: null,
      linkUrl: null,
      isRead: false,
      createdAt: new Date("2026-09-03T11:00:00Z"),
    });

    const notif = await createTenantNotification({
      tenantId,
      recipientMembershipId,
      kind: "PAYMENT",
      title: "Payment Received",
      message: "Order #123 was completed",
    });

    expect(notif.id).toBe("notif-created");
    expect(calls.create).toHaveBeenCalled();
  });
});
