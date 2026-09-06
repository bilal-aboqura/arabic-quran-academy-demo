import { describe, expect, it } from "vitest";
import { tenantSettingsPatchSchema } from "@/modules/settings/admin.repository";

describe("tenant settings write validation", () => {
  it("accepts only bounded tenant-owned branding fields", () => {
    const settings = tenantSettingsPatchSchema.parse({
      platformName: "Academy A",
      primaryColor: "#0d9488",
      defaultLocale: "ar",
      socialLinks: { instagram: "https://instagram.com/academy-a" },
    });
    expect(settings.platformName).toBe("Academy A");
  });

  it("rejects arbitrary singleton fields and unsafe links", () => {
    expect(() => tenantSettingsPatchSchema.parse({ heroTitle: "cross-tenant" })).toThrow();
    expect(() => tenantSettingsPatchSchema.parse({ socialLinks: { x: "javascript:alert(1)" } })).toThrow();
  });
});
