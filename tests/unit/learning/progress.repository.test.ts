import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  membershipFindFirst: vi.fn(),
  lessonFindFirst: vi.fn(),
  lessonCount: vi.fn(),
  lessonProgressCount: vi.fn(),
  lessonProgressUpsert: vi.fn(),
  lessonProgressFindMany: vi.fn(),
  courseProgressUpsert: vi.fn(),
  courseProgressFindMany: vi.fn(),
  courseFindFirst: vi.fn(),
}));

const tx = vi.hoisted(() => ({
  lesson: { count: calls.lessonCount },
  lessonProgress: { count: calls.lessonProgressCount, upsert: calls.lessonProgressUpsert },
  courseProgress: { upsert: calls.courseProgressUpsert },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantMembership: { findFirst: calls.membershipFindFirst },
    lesson: { findFirst: calls.lessonFindFirst, count: calls.lessonCount },
    course: { findFirst: calls.courseFindFirst },
    lessonProgress: { count: calls.lessonProgressCount, upsert: calls.lessonProgressUpsert, findMany: calls.lessonProgressFindMany },
    courseProgress: { upsert: calls.courseProgressUpsert, findMany: calls.courseProgressFindMany, findFirst: vi.fn() },
    $transaction: vi.fn((work: (client: typeof tx) => unknown) => work(tx)),
  },
}));

vi.mock("@/modules/courses/repository", () => ({
  getTenantCourseContentAccess: vi.fn(async () => ({ mode: "full", allowedLessonIds: new Set(), allowedQuizIds: new Set() })),
}));

import { listContinueLearningForTenant, recordLessonProgressForTenant } from "@/modules/learning/progress.repository";

const student = {
  tenantId: "tenant-a", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT" as const,
  userId: "student-a", membershipId: "membership-a", role: "STUDENT" as const,
};

describe("learning progress repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    calls.membershipFindFirst.mockResolvedValue({ id: "membership-a" });
    calls.lessonFindFirst.mockResolvedValue({
      id: "lesson-a", courseId: "course-a",
      course: { id: "course-a", tenantId: "tenant-a", createdById: "teacher-a", price: 0 },
    });
    calls.lessonProgressUpsert.mockResolvedValue({});
    calls.lessonCount.mockResolvedValue(4);
    calls.lessonProgressCount.mockResolvedValue(2);
    calls.courseProgressUpsert.mockImplementation(async (args: { create: unknown }) => args.create);
  });

  it("requires the active student membership before any progress write", async () => {
    calls.membershipFindFirst.mockResolvedValue(null);
    await expect(recordLessonProgressForTenant({
      tenantId: "tenant-a", courseId: "course-a", lessonId: "lesson-a", actor: student, positionSeconds: 42,
    })).resolves.toEqual({ error: "FORBIDDEN" });
    expect(calls.lessonFindFirst).not.toHaveBeenCalled();
    expect(calls.membershipFindFirst).toHaveBeenCalledWith({
      where: { id: "membership-a", tenantId: "tenant-a", userId: "student-a", role: "STUDENT", status: "ACTIVE" },
      select: { id: true },
    });
  });

  it("writes membership-owned lesson progress and recomputes the server course roll-up", async () => {
    const result = await recordLessonProgressForTenant({
      tenantId: "tenant-a", courseId: "course-a", lessonId: "lesson-a", actor: student, positionSeconds: 91.8, markCompleted: true,
    });
    expect(calls.lessonFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "lesson-a", courseId: "course-a", course: { tenantId: "tenant-a", isPublished: true } },
    }));
    expect(calls.lessonProgressUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_studentMembershipId_lessonId: { tenantId: "tenant-a", studentMembershipId: "membership-a", lessonId: "lesson-a" } },
      create: expect.objectContaining({ courseId: "course-a", positionSeconds: 91, completed: true }),
    }));
    expect(calls.courseProgressUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ completedLessons: 2, totalLessons: 4, progressPercent: 50, completed: false }),
    }));
    expect(result).toEqual(expect.objectContaining({ lessonId: "lesson-a", courseProgress: expect.objectContaining({ progressPercent: 50 }) }));
  });

  it("derives the next lesson from persisted completion rows, never browser state", async () => {
    calls.courseProgressFindMany.mockResolvedValue([{
      courseId: "course-a", completedLessons: 1, totalLessons: 3, progressPercent: 33, completed: false,
      lastViewedAt: new Date("2026-01-01"), completedAt: null,
      course: {
        id: "course-a", slug: "physics", title: "Physics", titleAr: "فيزياء", imageUrl: null,
        lessons: [
          { id: "lesson-1", slug: "one", title: "One", titleAr: null, order: 0, createdAt: new Date() },
          { id: "lesson-2", slug: "two", title: "Two", titleAr: null, order: 1, createdAt: new Date() },
        ],
      },
    }]);
    calls.lessonProgressFindMany.mockResolvedValue([{ courseId: "course-a", lessonId: "lesson-1" }]);
    const items = await listContinueLearningForTenant({ tenantId: "tenant-a", actor: student });
    expect(calls.courseProgressFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-a", studentMembershipId: "membership-a", completed: false }) }));
    expect(items[0]?.nextLesson?.id).toBe("lesson-2");
  });
});
