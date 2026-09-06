import { describe, expect, it, vi } from "vitest";

const spies = vi.hoisted(() => ({
  pageFindFirst: vi.fn(), pageUpdateMany: vi.fn(), pageUpdate: vi.fn(),
  sectionFindFirst: vi.fn(), sectionUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sitePage: { findFirst: spies.pageFindFirst, updateMany: spies.pageUpdateMany, update: spies.pageUpdate },
    pageSection: { findFirst: spies.sectionFindFirst, update: spies.sectionUpdate },
    $transaction: spies.transaction,
  },
}));

import { updatePageSectionForTenant, updateSitePageForTenant } from "@/modules/sites/repository";

const owner = {
  tenantId: "tenant-alpha", tenantSlug: "alpha", hostname: "alpha.test", domainKind: "DEVELOPMENT" as const,
  userId: "owner-a", membershipId: "member-a", role: "OWNER" as const,
};

describe("site repository tenant mutations", () => {
  it("updates only a tenant-owned page and atomically promotes its home flag", async () => {
    spies.pageFindFirst.mockResolvedValue({ id: "page-a", siteId: "site-a" });
    spies.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      sitePage: { updateMany: spies.pageUpdateMany, update: spies.pageUpdate },
    }));
    spies.pageUpdate.mockResolvedValue({ id: "page-a", title: "Home" });

    await updateSitePageForTenant({ tenantId: "tenant-alpha", actor: owner, pageId: "page-a", title: "Home", slug: "home", isHome: true, isPublished: true });

    expect(spies.pageFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "page-a", site: { tenantId: "tenant-alpha" } } }));
    expect(spies.pageUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ siteId: "site-a", isHome: true }) }));
    expect(spies.pageUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "Home", slug: "home", isHome: true, isPublished: true }) }));
  });

  it("never updates a section that cannot be resolved through the active tenant", async () => {
    spies.sectionFindFirst.mockResolvedValue(null);
    await expect(updatePageSectionForTenant({ tenantId: "tenant-alpha", actor: owner, sectionId: "beta-section", enabled: false })).resolves.toBeNull();
    expect(spies.sectionFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "beta-section", page: { site: { tenantId: "tenant-alpha" } } } }));
    expect(spies.sectionUpdate).not.toHaveBeenCalled();
  });

  it("validates a changed variant against the section type before persisting it", async () => {
    spies.sectionFindFirst.mockResolvedValue({ id: "section-a", type: "HERO", variant: "split", config: { title: "Welcome" } });
    await expect(updatePageSectionForTenant({ tenantId: "tenant-alpha", actor: owner, sectionId: "section-a", variant: "cards" })).rejects.toThrow("INVALID_SECTION_VARIANT");
    expect(spies.sectionUpdate).not.toHaveBeenCalled();
  });
});
