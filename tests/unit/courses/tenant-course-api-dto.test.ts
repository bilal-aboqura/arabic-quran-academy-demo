import { describe, expect, it } from "vitest";
import { toTenantCourseApiDto } from "@/modules/courses/api-dto";

const course = {
  id: "course-b",
  tenantId: "tenant-a",
  title: "Physics",
  titleAr: "فيزياء",
  slug: "physics",
  description: "Marketing description",
  descriptionEn: "Marketing description",
  shortDesc: null,
  shortDescEn: null,
  imageUrl: null,
  price: "200",
  duration: null,
  level: null,
  isPublished: true,
  category: null,
  lessons: [{ id: "lesson-b", title: "Private", titleAr: null, slug: "private", content: "private body", videoUrl: "https://private.test/video", pdfUrl: null, duration: null, order: 1, acceptsHomework: false }],
  quizzes: [{ id: "quiz-b", title: "Private quiz", order: 2, timeLimitMinutes: null, _count: { questions: 2 } }],
};

describe("tenant course API DTO", () => {
  it("does not emit protected content when a request lacks active membership entitlement", () => {
    const dto = toTenantCourseApiDto(course, { mode: "none", allowedLessonIds: new Set(), allowedQuizIds: new Set() });

    expect(dto.contentAccess).toBe("none");
    expect(dto.lessons).toEqual([]);
    expect(dto.quizzes).toEqual([]);
    expect(JSON.stringify(dto)).not.toContain("private.test");
    expect(JSON.stringify(dto)).not.toContain("private body");
  });
});
