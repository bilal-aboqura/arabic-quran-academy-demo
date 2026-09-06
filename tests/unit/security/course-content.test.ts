import { describe, expect, it } from "vitest";
import { toCourseApiDto, type CourseContentSource } from "@/lib/security/course-content";

const source: CourseContentSource = {
  course: {
    id: "course_1",
    title: "Public marketing title",
    titleAr: "عنوان تسويقي",
    slug: "private-course",
    description: "A safe public description",
    descriptionEn: "A safe public description",
    shortDesc: "Short description",
    shortDescEn: "Short description",
    imageUrl: "https://images.example.test/course.jpg",
    price: "200.00",
    duration: "4 hours",
    level: "beginner",
    isPublished: true,
    createdById: "teacher_1",
    category: {
      id: "category_1",
      name: "Physics",
      nameAr: "فيزياء",
      slug: "physics",
    },
  },
  lessons: [
    {
      id: "lesson_1",
      title: "Private lesson",
      titleAr: "درس خاص",
      slug: "private-lesson",
      content: "This lesson body must not be public.",
      videoUrl: "https://private.example.test/video.m3u8",
      pdfUrl: "https://private.example.test/lesson.pdf",
      order: 1,
    },
  ],
  quizzes: [
    {
      id: "quiz_1",
      title: "Private quiz",
      order: 2,
      timeLimitMinutes: 30,
      _count: { questions: 4 },
    },
  ],
};

describe("toCourseApiDto", () => {
  it("returns marketing metadata but never lesson, quiz, or private URLs to a public visitor", async () => {
    const result = await toCourseApiDto(source, null);
    const serialized = JSON.stringify(result);

    expect(result.contentAccess).toBe("none");
    expect(result.lessonCount).toBe(1);
    expect(result.quizCount).toBe(1);
    expect(result.lessons).toEqual([]);
    expect(result.quizzes).toEqual([]);
    expect(serialized).not.toContain("private.example.test");
    expect(serialized).not.toContain("This lesson body must not be public.");
  });

  it("allows the owning teacher to see their own course content", async () => {
    const result = await toCourseApiDto(source, {
      userId: "teacher_1",
      role: "TEACHER",
    });

    expect(result.contentAccess).toBe("full");
    expect(result.lessons).toHaveLength(1);
    expect(result.lessons[0]).toMatchObject({
      id: "lesson_1",
      videoUrl: "https://private.example.test/video.m3u8",
      pdfUrl: "https://private.example.test/lesson.pdf",
    });
    expect(result.quizzes).toEqual([
      expect.objectContaining({ id: "quiz_1", questionCount: 4 }),
    ]);
  });

  it("does not grant another teacher course-content access", async () => {
    const result = await toCourseApiDto(source, {
      userId: "teacher_2",
      role: "TEACHER",
    });

    expect(result.contentAccess).toBe("none");
    expect(result.lessons).toEqual([]);
    expect(result.quizzes).toEqual([]);
  });
});
