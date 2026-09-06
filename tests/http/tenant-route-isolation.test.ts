import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Application-handler boundary tests. These invoke real Next route handlers
 * with Host headers; infrastructure (session/database) is mocked only below
 * that boundary. The invariant under test is that an opaque Beta identifier
 * is always passed to a tenant-bound service with Alpha's server-resolved
 * tenant, never a browser-selected tenant.
 */
const spies = vi.hoisted(() => ({
  findCourse: vi.fn(),
  findCourseBySlug: vi.fn(),
  courseAccess: vi.fn(),
  findLesson: vi.fn(),
  upsertRating: vi.fn(),
  ratingSummary: vi.fn(),
  startAttempt: vi.fn(),
  dto: vi.fn(),
}));

vi.mock("@/modules/tenants/request-context", () => ({
  resolveTenantFromRequest: vi.fn(async (request: Request) => {
    const host = request.headers.get("host");
    return host === "alpha.nexaclass.test" ? { tenantId: "tenant-alpha", slug: "alpha" } : host === "beta.nexaclass.test" ? { tenantId: "tenant-beta", slug: "beta" } : null;
  }),
  requireTenantActor: vi.fn(async (request: Request) => {
    if (request.headers.get("host") !== "alpha.nexaclass.test") throw Object.assign(new Error("not found"), { code: "TENANT_NOT_FOUND" });
    return { tenantId: "tenant-alpha", userId: "student-alpha", membershipId: "membership-alpha", role: "STUDENT", permissions: [] };
  }),
  tenantRequestErrorResponse: vi.fn((error: unknown) => {
    const code = (error as { code?: string })?.code;
    return code === "TENANT_NOT_FOUND" ? Response.json({ error: "Not found" }, { status: 404 }) : null;
  }),
}));

vi.mock("@/modules/tenants/actor", () => ({ getTenantActor: vi.fn(async () => null) }));
vi.mock("@/modules/courses/repository", () => ({
  findPublishedCourseByIdForTenant: spies.findCourse,
  findPublishedCourseBySlugForTenant: spies.findCourseBySlug,
  getTenantCourseContentAccess: spies.courseAccess,
  findAccessibleLessonForTenant: spies.findLesson,
}));
vi.mock("@/modules/courses/api-dto", () => ({ toTenantCourseApiDto: spies.dto }));
vi.mock("@/modules/courses/playback.repository", () => ({
  upsertLessonRatingForTenant: spies.upsertRating,
  getLessonRatingSummaryForTenant: spies.ratingSummary,
}));
vi.mock("@/modules/quizzes/repository", () => ({ startQuizAttemptForTenant: spies.startAttempt }));

describe("HTTP route tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spies.dto.mockReturnValue({ id: "course-alpha", title: "Alpha physics", protectedContent: false });
    spies.ratingSummary.mockResolvedValue({ average: 0, count: 0, viewerRating: null });
  });

  it("does not disclose a Beta course ID through the Alpha host", async () => {
    spies.findCourse.mockResolvedValue(null);
    const { GET } = await import("@/app/api/courses/[id]/route");
    const response = await GET(new NextRequest("https://alpha.nexaclass.test/api/courses/course-beta", { headers: { host: "alpha.nexaclass.test" } }), { params: Promise.resolve({ id: "course-beta" }) });
    expect(response.status).toBe(404);
    expect(spies.findCourse).toHaveBeenCalledWith("tenant-alpha", "course-beta");
    expect(await response.json()).toEqual({ error: "الدورة غير موجودة" });
  });

  it("returns only a marketing DTO to an anonymous visitor", async () => {
    spies.findCourse.mockResolvedValue({ id: "course-alpha", tenantId: "tenant-alpha", title: "Alpha physics" });
    spies.courseAccess.mockResolvedValue({ canAccessContent: false, reason: "NOT_ENTITLED" });
    const { GET } = await import("@/app/api/courses/[id]/route");
    const response = await GET(new NextRequest("https://alpha.nexaclass.test/api/courses/course-alpha", { headers: { host: "alpha.nexaclass.test" } }), { params: Promise.resolve({ id: "course-alpha" }) });
    expect(response.status).toBe(200);
    expect(spies.courseAccess).toHaveBeenCalledWith("tenant-alpha", expect.anything(), null);
    expect(spies.dto).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ canAccessContent: false }));
    expect(await response.json()).not.toHaveProperty("videoUrl");
  });

  it("cannot create a rating for a Beta lesson while on Alpha", async () => {
    spies.findLesson.mockResolvedValue(null);
    const { POST } = await import("@/app/api/lessons/[lessonId]/rating/route");
    const response = await POST(new NextRequest("https://alpha.nexaclass.test/api/lessons/lesson-beta/rating", { method: "POST", headers: { host: "alpha.nexaclass.test", "content-type": "application/json" }, body: JSON.stringify({ rating: 5 }) }), { params: Promise.resolve({ lessonId: "lesson-beta" }) });
    expect(response.status).toBe(404);
    expect(spies.findLesson).toHaveBeenCalledWith("tenant-alpha", "lesson-beta", expect.objectContaining({ tenantId: "tenant-alpha" }));
    expect(spies.upsertRating).not.toHaveBeenCalled();
  });

  it("does not start a Beta quiz attempt from an Alpha host", async () => {
    spies.startAttempt.mockResolvedValue({ error: "NOT_FOUND" });
    const { POST } = await import("@/app/api/quizzes/[quizId]/start/route");
    const response = await POST(new NextRequest("https://alpha.nexaclass.test/api/quizzes/quiz-beta/start", { method: "POST", headers: { host: "alpha.nexaclass.test" } }), { params: Promise.resolve({ quizId: "quiz-beta" }) });
    expect(response.status).toBe(404);
    expect(spies.startAttempt).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant-alpha", quizId: "quiz-beta", actor: expect.objectContaining({ tenantId: "tenant-alpha" }) }));
  });

  it("uses the same opaque slug independently under each hostname", async () => {
    spies.findCourseBySlug.mockImplementation(async (tenantId: string) => ({ id: tenantId === "tenant-alpha" ? "alpha-physics" : "beta-physics", tenantId, title: `${tenantId} physics` }));
    spies.courseAccess.mockResolvedValue({ canAccessContent: false, reason: "NOT_ENTITLED" });
    const { GET } = await import("@/app/api/courses/slug/[slug]/route");
    const alpha = await GET(new NextRequest("https://alpha.nexaclass.test/api/courses/slug/physics", { headers: { host: "alpha.nexaclass.test" } }), { params: Promise.resolve({ slug: "physics" }) });
    const beta = await GET(new NextRequest("https://beta.nexaclass.test/api/courses/slug/physics", { headers: { host: "beta.nexaclass.test" } }), { params: Promise.resolve({ slug: "physics" }) });
    expect(alpha.status).toBe(200);
    expect(beta.status).toBe(200);
    expect(spies.findCourseBySlug).toHaveBeenNthCalledWith(1, "tenant-alpha", "physics");
    expect(spies.findCourseBySlug).toHaveBeenNthCalledWith(2, "tenant-beta", "physics");
  });
});
