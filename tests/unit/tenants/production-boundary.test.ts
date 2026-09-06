import { describe, expect, it } from "vitest";
import { isProductionTenantBoundaryBlockedPath, isReviewedTenantApiPath } from "@/modules/tenants/production-boundary";

describe("production tenant safety boundary", () => {
  it("denies unreviewed legacy tenant APIs by default", () => {
    for (const path of [
      "/api/dashboard/legacy-unreviewed-endpoint",
    ]) {
      expect(isReviewedTenantApiPath(path)).toBe(false);
    }
  });

  it("allows only reviewed tenant-safe API surfaces", () => {
    expect(isReviewedTenantApiPath("/api/courses/tenant-course")).toBe(true);
    expect(isReviewedTenantApiPath("/api/courses/slug/physics")).toBe(true);
    expect(isReviewedTenantApiPath("/api/upload/pdf")).toBe(true);
    expect(isReviewedTenantApiPath("/api/messages/conversations/conversation-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/live-streams/stream-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/lessons/lesson-a/playback/start")).toBe(true);
    expect(isReviewedTenantApiPath("/api/lessons/lesson-a/rating")).toBe(true);
    expect(isReviewedTenantApiPath("/api/quizzes/quiz-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/quizzes/quiz-a/start")).toBe(true);
    expect(isReviewedTenantApiPath("/api/quizzes/quiz-a/product")).toBe(true);
    expect(isReviewedTenantApiPath("/api/store/purchase")).toBe(true);
    expect(isReviewedTenantApiPath("/api/subscriptions/purchase")).toBe(true);
    expect(isReviewedTenantApiPath("/api/payments/orders")).toBe(true);
    expect(isReviewedTenantApiPath("/api/payments/webhooks/local_test")).toBe(true);
    expect(isReviewedTenantApiPath("/api/payments/webhooks/paymob")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/students/student-a/balance")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/students/student-a/enrollments")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/platform-subscriptions")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/platform-subscriptions/sub-123")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/settings/copyright-overlay")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/settings/add-balance")).toBe(true);
    expect(isReviewedTenantApiPath("/api/platform/tenants/tenant-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/teachers/teacher-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/teachers/homepage-featured")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/settings/teachers-enabled")).toBe(true);
    expect(isReviewedTenantApiPath("/api/upload/assignments/assignment-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/files/assignments/assignment-a/submission-a")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/codes")).toBe(true);
    expect(isReviewedTenantApiPath("/api/dashboard/site/pages")).toBe(true);
  });

  it("permits all migrated core routes across courses and dashboard", () => {
    expect(isProductionTenantBoundaryBlockedPath("/courses")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/courses/physics/lessons/one")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/profile")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/students")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/students/student-1")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/assignments")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/quizzes")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/teachers")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/courses")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/subscription-students")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/settings")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/settings/copyright-overlay")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/settings/add-balance")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/dashboard/website")).toBe(false);
    expect(isProductionTenantBoundaryBlockedPath("/store")).toBe(false);
  });
});
