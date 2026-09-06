import { describe, expect, it } from "vitest";
import { __tenantSettingsTestables } from "@/modules/settings/tenant-settings";

describe("tenant public settings sanitization", () => {
  it("publishes only safe, normalized social URLs", () => {
    expect(
      __tenantSettingsTestables.publicSocialLinks({
        Instagram: " https://instagram.com/nexa ",
        bad: "javascript:alert(1)",
        "bad key!": "https://example.test",
        mail: "mailto:teacher@example.test",
      }),
    ).toEqual({ instagram: "https://instagram.com/nexa" });
  });
});
