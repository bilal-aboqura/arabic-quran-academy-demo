import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  courseFindFirst: vi.fn(),
  moduleFindFirst: vi.fn(),
  moduleFindMany: vi.fn(),
  moduleUpdate: vi.fn(),
  lessonFindFirst: vi.fn(),
  lessonUpdate: vi.fn(),
  quizFindFirst: vi.fn(),
  quizUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: { findFirst: calls.courseFindFirst },
    courseModule: { findFirst: calls.moduleFindFirst, findMany: calls.moduleFindMany, update: calls.moduleUpdate },
    lesson: { findFirst: calls.lessonFindFirst, update: calls.lessonUpdate },
    quiz: { findFirst: calls.quizFindFirst, update: calls.quizUpdate },
    $transaction: vi.fn((work: unknown) => typeof work === "function" ? work({}) : Promise.all(work as Promise<unknown>[])),
  },
}));

import {
  listCourseModulesForTenant,
  moveCourseContentForTenant,
  reorderCourseModulesForTenant,
} from "@/modules/courses/modules.repository";

const teacher = {
  tenantId: "tenant-a", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT" as const,
  userId: "teacher-a", membershipId: "membership-a", role: "TEACHER" as const,
};

describe("course module repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes a teacher against the tenant-owned course before listing its modules", async () => {
    calls.courseFindFirst.mockResolvedValue(null);
    await expect(listCourseModulesForTenant({ tenantId: "tenant-a", courseId: "course-b", actor: teacher })).resolves.toBeNull();
    expect(calls.courseFindFirst).toHaveBeenCalledWith({
      where: { id: "course-b", tenantId: "tenant-a", createdById: "teacher-a" }, select: { id: true },
    });
    expect(calls.moduleFindMany).not.toHaveBeenCalled();
  });

  it("cannot move a lesson from another tenant even when its opaque ID is known", async () => {
    calls.courseFindFirst.mockResolvedValue({ id: "course-a" });
    calls.lessonFindFirst.mockResolvedValue(null);
    await expect(moveCourseContentForTenant({
      tenantId: "tenant-a", courseId: "course-a", actor: teacher, kind: "LESSON", contentId: "lesson-b", moduleId: null, order: 0,
    })).resolves.toEqual({ error: "CONTENT_NOT_FOUND" });
    expect(calls.lessonFindFirst).toHaveBeenCalledWith({
      where: { id: "lesson-b", courseId: "course-a", course: { tenantId: "tenant-a" } }, select: { id: true },
    });
    expect(calls.lessonUpdate).not.toHaveBeenCalled();
  });

  it("rejects a stale or partial module reorder instead of losing a section", async () => {
    calls.courseFindFirst.mockResolvedValue({ id: "course-a" });
    calls.moduleFindMany.mockResolvedValue([{ id: "module-1" }, { id: "module-2" }]);
    await expect(reorderCourseModulesForTenant({
      tenantId: "tenant-a", courseId: "course-a", actor: teacher, moduleIds: ["module-1"],
    })).resolves.toEqual({ error: "INVALID_MODULE_SET" });
    expect(calls.moduleUpdate).not.toHaveBeenCalled();
  });
});
