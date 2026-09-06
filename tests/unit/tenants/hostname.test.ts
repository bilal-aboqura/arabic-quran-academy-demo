import { describe, expect, it } from "vitest";
import { normalizeHostname, tenantSlugFromWildcardHostname } from "@/modules/tenants/hostname";

describe("tenant hostname parsing", () => {
  it("normalizes valid host names and rejects protocol, port, and path input", () => {
    expect(normalizeHostname(" Ahmed.NexaClass.App. ")).toBe("ahmed.nexaclass.app");
    expect(normalizeHostname("ahmed.nexaclass.app:3000")).toBe("ahmed.nexaclass.app");
    expect(normalizeHostname("https://ahmed.nexaclass.app")).toBeNull();
    expect(normalizeHostname("ahmed.nexaclass.app/path")).toBeNull();
  });

  it("only derives a single valid tenant label from the configured wildcard domain", () => {
    expect(tenantSlugFromWildcardHostname("academy-x.nexaclass.app", "nexaclass.app")).toBe("academy-x");
    expect(tenantSlugFromWildcardHostname("a.b.nexaclass.app", "nexaclass.app")).toBeNull();
    expect(tenantSlugFromWildcardHostname("nexaclass.app", "nexaclass.app")).toBeNull();
    expect(tenantSlugFromWildcardHostname("academy-x.other.app", "nexaclass.app")).toBeNull();
  });
});
