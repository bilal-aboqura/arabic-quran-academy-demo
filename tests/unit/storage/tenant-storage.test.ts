import { describe, expect, it } from "vitest";
import { buildTenantObjectKey, isTenantObjectKeyForActor } from "@/modules/storage/tenant-storage";

const tenantId = "ckz9f8x2w000001l2abcd1234";
const actorUserId = "ckz9f8x2w000001l2abcd5678";

describe("tenant storage object keys", () => {
  it("places new objects below an application-derived tenant prefix", () => {
    const key = buildTenantObjectKey({ tenantId, kind: "homework", fileName: "solution.PDF" });
    expect(key).toMatch(new RegExp(`^tenants/${tenantId}/homework/[0-9a-f-]+\\.pdf$`));
    expect(key).not.toContain("../");
  });

  it("keeps assignment attachments in their own tenant-controlled namespace", () => {
    const key = buildTenantObjectKey({ tenantId, kind: "assignments", fileName: "research.pdf" });
    expect(isTenantObjectKeyForActor({ tenantId, kind: "assignments", key })).toBe(true);
    expect(isTenantObjectKeyForActor({ tenantId, kind: "homework", key })).toBe(false);
  });

  it("requires a user segment for message uploads and validates it", () => {
    const key = buildTenantObjectKey({ tenantId, kind: "messages", actorUserId, fileName: "photo.png" });
    expect(isTenantObjectKeyForActor({ tenantId, kind: "messages", actorUserId, key })).toBe(true);
    expect(isTenantObjectKeyForActor({ tenantId, kind: "messages", actorUserId: "ckz9f8x2w000001l2abcd9999", key })).toBe(false);
  });

  it("refuses traversal-style identities and cross-tenant keys", () => {
    expect(() => buildTenantObjectKey({ tenantId: "../other", kind: "courses" })).toThrow();
    expect(isTenantObjectKeyForActor({ tenantId: "ckz9f8x2w000001l2abcd9999", kind: "courses", key: `tenants/${tenantId}/courses/a.pdf` })).toBe(false);
  });
});
