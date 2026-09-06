import { describe, expect, it } from "vitest";
import { gradeObjectiveAnswers, studentQuizDto } from "@/modules/quizzes/repository";

describe("secure quiz grading", () => {
  const questions = [
    { id: "question-a", type: "MULTIPLE_CHOICE", options: [{ id: "a-right", isCorrect: true }, { id: "a-wrong", isCorrect: false }] },
    { id: "question-b", type: "TRUE_FALSE", options: [{ id: "b-right", isCorrect: true }] },
    { id: "essay", type: "ESSAY", options: [] },
  ];

  it("grades canonical options on the server and ignores client score fields", () => {
    const result = gradeObjectiveAnswers(questions, { "question-a": "a-right", "question-b": "b-wrong", score: 9999 });
    expect(result).toEqual({ score: 1, totalQuestions: 2 });
  });

  it("never serializes correct-answer flags into the student quiz payload", () => {
    const dto = studentQuizDto({
      id: "quiz-a", title: "Quiz", courseId: "course-a", order: 0, timeLimitMinutes: null,
      course: { id: "course-a", tenantId: "tenant-a", createdById: "teacher-a", title: "Course", titleAr: null, slug: "physics", price: 0, maxQuizAttempts: 3 },
      questions: [{ id: "question-a", type: "MULTIPLE_CHOICE", questionText: "Question", order: 0, options: [{ id: "answer-a", text: "Answer", isCorrect: true, createdAt: new Date(), updatedAt: new Date(), questionId: "question-a" }] }],
    } as never, 0);
    expect(JSON.stringify(dto)).not.toContain("isCorrect");
    expect(dto.questions[0].options[0]).toEqual({ id: "answer-a", text: "Answer" });
  });
});
