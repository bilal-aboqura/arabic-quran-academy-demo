import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  membershipFindFirst: vi.fn(),
  assignmentFindFirst: vi.fn(),
  submissionFindFirst: vi.fn(),
  submissionCreate: vi.fn(),
  access: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: calls.membershipFindFirst },
    assignment: { findFirst: calls.assignmentFindFirst },
    assignmentSubmission: { findFirst: calls.submissionFindFirst, create: calls.submissionCreate },
  },
}));
vi.mock("@/modules/courses/repository", () => ({ getTenantCourseContentAccess: calls.access }));

import { getAssignmentSubmissionFileForTenant, submitAssignmentForTenant } from "@/modules/assignments/repository";

const student = {
  tenantId: "ckz9f8x2w000001l2abcd1234", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT" as const,
  userId: "student-a", membershipId: "membership-a", role: "STUDENT" as const,
};
const assignment = {
  id: "assignment-a", tenantId: student.tenantId, isPublished: true, deadline: null,
  course: { id: "course-a", tenantId: student.tenantId, createdById: "teacher-a", price: 0, isPublished: true },
};

describe("assignment repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.membershipFindFirst.mockResolvedValue({ id: student.membershipId });
    calls.assignmentFindFirst.mockResolvedValue(assignment);
    calls.access.mockResolvedValue({ mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() });
  });

  it("rejects a file key that was not minted in the assignment namespace", async () => {
    calls.submissionFindFirst.mockResolvedValue(null);
    await expect(submitAssignmentForTenant({
      tenantId: student.tenantId, assignmentId: assignment.id, actor: student,
      files: [{ storageKey: `tenants/${student.tenantId}/homework/other.pdf` }],
    })).rejects.toThrow("INVALID_ASSIGNMENT_FILE_KEY");
    expect(calls.submissionCreate).not.toHaveBeenCalled();
  });

  it("allows a student to retrieve only a file recorded on their own tenant submission", async () => {
    const key = `tenants/${student.tenantId}/assignments/1a4d80e3-57ff-42a8-8061-a960401b5f86.pdf`;
    calls.submissionFindFirst.mockResolvedValue({ files: [{ storageKey: key, fileName: "work.pdf" }], studentMembershipId: student.membershipId });
    await expect(getAssignmentSubmissionFileForTenant({
      tenantId: student.tenantId, assignmentId: assignment.id, submissionId: "submission-a", storageKey: key, actor: student,
    })).resolves.toEqual({ storageKey: key, fileName: "work.pdf" });
    await expect(getAssignmentSubmissionFileForTenant({
      tenantId: student.tenantId, assignmentId: assignment.id, submissionId: "submission-a", storageKey: `tenants/${student.tenantId}/assignments/not-recorded.pdf`, actor: student,
    })).resolves.toBeNull();
  });
});
