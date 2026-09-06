import { describe, expect, it } from "vitest";
import { resolveNextAuthSecret, DEV_ONLY_FALLBACK_SECRET } from "@/lib/auth";

describe("NEXTAUTH_SECRET production safety gate", () => {
  it("allows dev-only fallback in development when secret is not configured", () => {
    const secret = resolveNextAuthSecret({
      NODE_ENV: "development",
      NEXTAUTH_SECRET: "",
    });
    expect(secret).toBe(DEV_ONLY_FALLBACK_SECRET);
  });

  it("uses configured secret in development", () => {
    const secret = resolveNextAuthSecret({
      NODE_ENV: "development",
      NEXTAUTH_SECRET: "my-custom-dev-secret",
    });
    expect(secret).toBe("my-custom-dev-secret");
  });

  it("allows fallback during static page data collection at build phase", () => {
    const secret = resolveNextAuthSecret({
      NODE_ENV: "production",
      NEXT_PHASE: "phase-production-build",
      NEXTAUTH_SECRET: "",
    });
    expect(secret).toBe(DEV_ONLY_FALLBACK_SECRET);
  });

  it("fails safely at production runtime when secret is missing", () => {
    expect(() =>
      resolveNextAuthSecret({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: "",
      })
    ).toThrow(/NEXTAUTH_SECRET or AUTH_SECRET must be set/);
  });

  it("fails safely at production runtime if dev-only fallback secret is passed", () => {
    expect(() =>
      resolveNextAuthSecret({
        NODE_ENV: "production",
        NEXTAUTH_SECRET: DEV_ONLY_FALLBACK_SECRET,
      })
    ).toThrow(/dev-only fallback secret cannot be used at production runtime/);
  });

  it("accepts real secure secret at production runtime", () => {
    const secret = resolveNextAuthSecret({
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "e7c10b42-real-production-secret-9948-abcde",
    });
    expect(secret).toBe("e7c10b42-real-production-secret-9948-abcde");
  });
});
