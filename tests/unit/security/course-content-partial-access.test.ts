import { describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({
  enrollment: vi.fn(),
  fullCourse: vi.fn(),
  lessons: vi.fn(),
  quizzes: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getEnrollment: access.enrollment,
  hasFullCourseAccessAsStudent: access.fullCourse,
  getAllowedLessonIdsForUserCourse: access.lessons,
  getAllowedQuizIdsForUserCourse: access.quizzes,
}));

import { toCourseApiDto, type CourseContentSource } from "@/lib/security/course-content";

const source: CourseContentSource = {
  course: {
    id: "course_1",
    title: "Course",
    slug: "course",
    description: "Description",
    createdById: "teacher_1",
  },
  lessons: [
    { id: "lesson_allowed", title: "Allowed", videoUrl: "https://private.test/a" },
    { id: "lesson_blocked", title: "Blocked", videoUrl: "https://private.test/b" },
  ],
  quizzes: [
    { id: "quiz_allowed", title: "Allowed quiz", _count: { questions: 2 } },
    { id: "quiz_blocked", title: "Blocked quiz", _count: { questions: 3 } },
  ],
};

describe("toCourseApiDto partial activation-code access", () => {
  it("only emits the content IDs authorized by the server", async () => {
    access.enrollment.mockResolvedValue(null);
    access.fullCourse.mockResolvedValue(false);
    access.lessons.mockResolvedValue(["lesson_allowed"]);
    access.quizzes.mockResolvedValue(["quiz_allowed"]);

    const result = await toCourseApiDto(source, {
      userId: "student_1",
      role: "STUDENT",
    });

    expect(result.contentAccess).toBe("partial");
    expect(result.lessons).toEqual([
      expect.objectContaining({ id: "lesson_allowed", videoUrl: "https://private.test/a" }),
    ]);
    expect(result.quizzes).toEqual([
      expect.objectContaining({ id: "quiz_allowed", questionCount: 2 }),
    ]);
    expect(JSON.stringify(result)).not.toContain("lesson_blocked");
    expect(JSON.stringify(result)).not.toContain("quiz_blocked");
    expect(access.lessons).toHaveBeenCalledWith("student_1", "course_1");
    expect(access.quizzes).toHaveBeenCalledWith("student_1", "course_1");
  });
});
