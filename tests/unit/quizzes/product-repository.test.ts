import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  findFirst: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
  access: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quiz: { findFirst: spies.findFirst, update: spies.update },
    quizAttempt: { findMany: spies.findMany },
  },
}));
vi.mock("@/modules/courses/repository", () => ({ getTenantCourseContentAccess: spies.access }));

import {
  effectiveQuizAttemptLimit,
  getStudentQuizAttemptHistoryForTenant,
  getTeacherQuizAttemptHistoryForTenant,
  isQuizAvailableAt,
  quizAttemptSummary,
  updateQuizProductSettingsForTenant,
} from "@/modules/quizzes/product.repository";

const student = { tenantId: "tenant-alpha", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT" as const, userId: "user-a", membershipId: "member-a", role: "STUDENT" as const };
const teacher = { ...student, userId: "teacher-a", membershipId: "teacher-member", role: "TEACHER" as const };
const settingsQuiz = {
  id: "quiz-a", maxAttempts: 2, passingScore: 70, isPublished: true, availableFrom: null, availableUntil: null,
  course: { id: "course-a", tenantId: "tenant-alpha", createdById: "teacher-a", maxQuizAttempts: 5, price: 0 },
};

describe("quiz product repository", () => {
  it("derives pass state and availability only from server fields", () => {
    expect(quizAttemptSummary({ score: 7, totalQuestions: 10 }, 70)).toEqual({ score: 7, totalQuestions: 10, percentage: 70, passed: true });
    expect(quizAttemptSummary({ score: 0, totalQuestions: 0 }, 70).passed).toBe(false);
    expect(effectiveQuizAttemptLimit(settingsQuiz)).toBe(2);
    expect(isQuizAvailableAt({ ...settingsQuiz, isPublished: false }, new Date())).toBe(false);
  });

  it("writes settings only through a tenant-scoped, teacher-owned quiz", async () => {
    spies.findFirst.mockResolvedValue(settingsQuiz);
    spies.update.mockResolvedValue({ ...settingsQuiz });
    await updateQuizProductSettingsForTenant({ tenantId: "tenant-alpha", quizId: "quiz-a", actor: teacher, input: { passingScore: 80, maxAttempts: 3 } });
    expect(spies.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quiz-a", course: { tenantId: "tenant-alpha" } } }));
    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passingScore: 80, maxAttempts: 3 }) }));
  });

  it("does not return another membership's history and omits answer snapshots", async () => {
    spies.findFirst.mockResolvedValue(settingsQuiz);
    spies.access.mockResolvedValue({ mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() });
    spies.findMany.mockResolvedValue([{ id: "attempt-a", score: 8, totalQuestions: 10, startedAt: new Date("2026-01-01"), submittedAt: new Date("2026-01-01T00:05:00Z") }]);
    const history = await getStudentQuizAttemptHistoryForTenant({ tenantId: "tenant-alpha", quizId: "quiz-a", actor: student });
    expect(spies.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-alpha", studentMembershipId: "member-a", userId: "user-a", quizId: "quiz-a" }) }));
    expect(history?.[0]).not.toHaveProperty("answers");
    expect(history?.[0].passed).toBe(true);
  });

  it("limits teacher result history to teacher-owned tenant courses", async () => {
    spies.findFirst.mockResolvedValue({ ...settingsQuiz, course: { ...settingsQuiz.course, createdById: "other-teacher" } });
    await expect(getTeacherQuizAttemptHistoryForTenant({ tenantId: "tenant-alpha", quizId: "quiz-a", actor: teacher })).resolves.toBeNull();
    expect(spies.findMany).not.toHaveBeenCalledTimes(1);
  });
});
