import { describe, expect, it, vi } from "vitest";

/**
 * These tests intentionally inspect repository query shapes.  They are an
 * inexpensive adversarial regression suite: an opaque ID from Tenant Beta
 * must never cause a repository called in Tenant Alpha to omit tenantId.
 */
const spies = vi.hoisted(() => ({
  membershipFindMany: vi.fn(),
  homeworkFindMany: vi.fn(),
  homeworkDeleteMany: vi.fn(),
  enrollmentFindFirst: vi.fn(),
  lessonFindFirst: vi.fn(),
  homeworkCreate: vi.fn(),
  liveFindFirst: vi.fn(),
  liveUpdate: vi.fn(),
  courseFindFirst: vi.fn(),
  productFindMany: vi.fn(),
  productUpdateMany: vi.fn(),
  planFindMany: vi.fn(),
  purchaseFindMany: vi.fn(),
  reviewsFindMany: vi.fn(),
  settingsUpsert: vi.fn(),
  conversationFindFirst: vi.fn(),
  messageFindMany: vi.fn(),
  messageCreate: vi.fn(),
  conversationUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  const tx = {
    enrollment: { findFirst: spies.enrollmentFindFirst },
    lesson: { findFirst: spies.lessonFindFirst },
    homeworkSubmission: { create: spies.homeworkCreate },
    conversation: { findFirst: spies.conversationFindFirst, update: spies.conversationUpdate },
    message: { create: spies.messageCreate },
  };
  return {
    prisma: {
      tenantMembership: { findMany: spies.membershipFindMany },
      homeworkSubmission: { findMany: spies.homeworkFindMany, deleteMany: spies.homeworkDeleteMany },
      liveStream: { findFirst: spies.liveFindFirst, update: spies.liveUpdate },
      course: { findFirst: spies.courseFindFirst },
      storeProduct: { findMany: spies.productFindMany, updateMany: spies.productUpdateMany },
      subscriptionPlan: { findMany: spies.planFindMany },
      userStorePurchase: { findMany: spies.purchaseFindMany },
      review: { findMany: spies.reviewsFindMany },
      tenantSettings: { upsert: spies.settingsUpsert },
      message: { findMany: spies.messageFindMany },
      $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
    },
  };
});

import { listTeacherStudentsForTenant } from "@/modules/students/repository";
import { createHomeworkForTenant, deleteHomeworkForTenant } from "@/modules/homework/repository";
import { updateLiveStreamForTenant } from "@/modules/live-streams/repository";
import {
  getStorePurchasesForTenantStudent,
  listPublicStoreProductsForTenant,
  listSubscriptionPlansForTenant,
  updateStoreProductForTenant,
} from "@/modules/commerce/repository";
import { updateTenantSettingsForAdmin } from "@/modules/settings/admin.repository";
import { listReviewsForTenant } from "@/modules/settings/reviews.repository";
import { listPublicTeachersForTenant } from "@/modules/tenants/public-teachers.repository";
import { createMessageForTenant, getConversationMessagesForTenant } from "@/modules/messaging/repository";

const tenantA = "tenant-alpha";
const tenantB = "tenant-beta";

describe("Tenant Alpha versus Tenant Beta repository attacks", () => {
  it("does not enumerate Tenant Beta students through an Alpha teacher's course roster", async () => {
    spies.membershipFindMany.mockResolvedValue([]);

    await listTeacherStudentsForTenant({ tenantId: tenantA, teacherUserId: "teacher-alpha" });

    expect(spies.membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: tenantA,
        studentEnrollments: { some: { tenantId: tenantA, course: { tenantId: tenantA, createdById: "teacher-alpha" } } },
      }),
    }));
  });

  it("rejects a Beta lesson ID supplied to an Alpha homework submission", async () => {
    spies.enrollmentFindFirst.mockResolvedValue({ id: "enrollment-alpha" });
    spies.lessonFindFirst.mockResolvedValue(null);

    await expect(createHomeworkForTenant({
      tenantId: tenantA, userId: "student-alpha", courseId: "course-alpha", lessonId: "lesson-beta", submissionType: "FILE",
    })).resolves.toBeNull();

    expect(spies.lessonFindFirst).toHaveBeenCalledWith({
      where: { id: "lesson-beta", courseId: "course-alpha", course: { tenantId: tenantA } },
      select: { id: true },
    });
  });

  it("does not delete Beta homework IDs through Alpha staff deletion", async () => {
    spies.homeworkDeleteMany.mockResolvedValue({ count: 0 });

    await deleteHomeworkForTenant({ tenantId: tenantA, ids: ["homework-beta"], teacherUserId: "teacher-alpha" });

    expect(spies.homeworkDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: tenantA, id: { in: ["homework-beta"] }, course: { tenantId: tenantA, createdById: "teacher-alpha" } },
    });
  });

  it("does not permit an Alpha live stream to be reassigned to a Beta course", async () => {
    spies.liveFindFirst.mockResolvedValue({ id: "stream-alpha", course: { id: "course-alpha", createdById: "teacher-alpha" } });
    spies.courseFindFirst.mockResolvedValue(null);

    await expect(updateLiveStreamForTenant({ tenantId: tenantA, id: "stream-alpha", data: { courseId: "course-beta" } })).resolves.toBeNull();

    expect(spies.courseFindFirst).toHaveBeenCalledWith({ where: { id: "course-beta", tenantId: tenantA }, select: { id: true } });
    expect(spies.liveUpdate).not.toHaveBeenCalled();
  });

  it("tenant-scopes public products, purchases, subscription plans, and product mutation", async () => {
    spies.productFindMany.mockResolvedValue([]);
    spies.purchaseFindMany.mockResolvedValue([]);
    spies.planFindMany.mockResolvedValue([]);
    spies.productUpdateMany.mockResolvedValue({ count: 0 });

    await Promise.all([
      listPublicStoreProductsForTenant(tenantA),
      getStorePurchasesForTenantStudent(tenantA, "student-alpha"),
      listSubscriptionPlansForTenant(tenantA, true),
      updateStoreProductForTenant(tenantA, "product-beta", { title: "attack" }),
    ]);

    expect(spies.productFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: tenantA, isActive: true } }));
    expect(spies.purchaseFindMany).toHaveBeenCalledWith({ where: { tenantId: tenantA, userId: "student-alpha" }, select: { productId: true } });
    expect(spies.planFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: tenantA, isActive: true } }));
    expect(spies.productUpdateMany).toHaveBeenCalledWith({ where: { id: "product-beta", tenantId: tenantA }, data: { title: "attack" } });
  });

  it("tenant-scopes reviews, public teachers, and branding writes", async () => {
    spies.reviewsFindMany.mockResolvedValue([]);
    spies.membershipFindMany.mockResolvedValue([]);
    spies.settingsUpsert.mockResolvedValue({ tenantId: tenantA });

    await Promise.all([
      listReviewsForTenant(tenantA),
      listPublicTeachersForTenant(tenantA),
      updateTenantSettingsForAdmin(tenantA, { platformName: "Alpha Academy" }),
    ]);

    expect(spies.reviewsFindMany).toHaveBeenCalledWith({ where: { tenantId: tenantA }, orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
    expect(spies.membershipFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: tenantA, role: "TEACHER", status: "ACTIVE" } }));
    expect(spies.settingsUpsert).toHaveBeenCalledWith({
      where: { tenantId: tenantA },
      create: { tenantId: tenantA, platformName: "Alpha Academy" },
      update: { platformName: "Alpha Academy" },
    });
  });

  it("does not read or post to a Beta conversation while handling an Alpha request", async () => {
    spies.messageFindMany.mockResolvedValue([]);
    spies.conversationFindFirst.mockResolvedValue(null);

    await getConversationMessagesForTenant({ tenantId: tenantA, conversationId: "conversation-beta" });
    await expect(createMessageForTenant({
      tenantId: tenantA, conversationId: "conversation-beta", senderId: "student-alpha", messageType: "TEXT", content: "attack",
    })).resolves.toBeNull();

    expect(spies.messageFindMany).toHaveBeenCalledWith({
      where: { tenantId: tenantA, conversationId: "conversation-beta" },
      orderBy: { createdAt: "asc" },
    });
    expect(spies.conversationFindFirst).toHaveBeenCalledWith({ where: { id: "conversation-beta", tenantId: tenantA } });
    expect(spies.messageCreate).not.toHaveBeenCalled();
  });
});
