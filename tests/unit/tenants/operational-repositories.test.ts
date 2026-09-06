import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  enrollmentFindFirst: vi.fn(),
  conversationFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    enrollment: { findFirst: spies.enrollmentFindFirst },
    conversation: { findFirst: spies.conversationFindFirst },
  },
}));

import { findEnrollmentForTenant } from "@/modules/enrollments/repository";
import { getConversationForTenant } from "@/modules/messaging/repository";

describe("tenant-bound operational repositories", () => {
  it("never looks up an enrollment by opaque IDs without its tenant boundary", async () => {
    spies.enrollmentFindFirst.mockResolvedValue(null);
    await findEnrollmentForTenant({ tenantId: "tenant-a", userId: "student-b", courseId: "course-b" });
    expect(spies.enrollmentFindFirst).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a", userId: "student-b", courseId: "course-b", course: { tenantId: "tenant-a" } },
    });
  });

  it("turns a cross-tenant conversation ID into a scoped not-found lookup", async () => {
    spies.conversationFindFirst.mockResolvedValue(null);
    await getConversationForTenant({ tenantId: "tenant-a", conversationId: "conversation-b" });
    expect(spies.conversationFindFirst).toHaveBeenCalledWith({ where: { id: "conversation-b", tenantId: "tenant-a" } });
  });
});
