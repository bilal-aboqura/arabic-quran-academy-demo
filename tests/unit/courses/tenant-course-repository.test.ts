import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  delete: vi.fn(),
  categoryFindFirst: vi.fn(),
  categoryFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    course: { findFirst: calls.findFirst, findMany: calls.findMany },
    category: { findFirst: calls.categoryFindFirst, findMany: calls.categoryFindMany, delete: calls.delete },
  },
}));

import {
  findPublishedCourseByIdForTenant,
  findPublishedCourseBySlugForTenant,
  findPublishedCourseMarketingBySlugForTenant,
  listCategoriesForTenant,
  listPublishedCoursesForTenant,
} from "@/modules/courses/repository";

describe("tenant course repository", () => {
  it("always scopes an ID lookup to the resolved tenant, preventing Tenant A from fetching Tenant B IDs", async () => {
    calls.findFirst.mockResolvedValue(null);

    await expect(findPublishedCourseByIdForTenant("tenant-a", "course-owned-by-b")).resolves.toBeNull();

    expect(calls.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "course-owned-by-b", tenantId: "tenant-a", isPublished: true },
      }),
    );
  });

  it("allows identical slugs to be resolved only inside the hostname-derived tenant", async () => {
    calls.findFirst.mockResolvedValue(null);

    await expect(findPublishedCourseBySlugForTenant("tenant-a", "physics")).resolves.toBeNull();

    expect(calls.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "physics", tenantId: "tenant-a", isPublished: true },
      }),
    );
  });

  it("loads anonymous marketing data with the tenant slug boundary and no course-content include", async () => {
    calls.findFirst.mockResolvedValue(null);
    await expect(findPublishedCourseMarketingBySlugForTenant("tenant-alpha", "physics")).resolves.toBeNull();
    expect(calls.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { slug: "physics", tenantId: "tenant-alpha", isPublished: true },
      include: expect.not.objectContaining({ lessons: expect.anything(), quizzes: expect.anything() }),
    }));
  });

  it("lists only published catalog courses owned by the resolved tenant", async () => {
    calls.findMany.mockResolvedValue([]);
    await listPublishedCoursesForTenant("tenant-a");
    expect(calls.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "tenant-a", isPublished: true } }));
  });

  it("keeps teacher category listings inside their own tenant and creator scope", async () => {
    calls.categoryFindMany.mockResolvedValue([]);
    await listCategoriesForTenant("tenant-a", {
      tenantId: "tenant-a", tenantSlug: "a", hostname: "a.nexaclass.app", domainKind: "SUBDOMAIN",
      userId: "teacher-a", membershipId: "membership-a", role: "TEACHER",
    });
    expect(calls.categoryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: "tenant-a", createdById: "teacher-a" },
    }));
  });
});
