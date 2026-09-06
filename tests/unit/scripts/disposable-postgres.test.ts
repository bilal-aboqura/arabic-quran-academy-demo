import { describe, expect, it } from "vitest";
import { assertDisposableRehearsalDatabaseUrl, REHEARSAL_CONFIRMATION } from "../../../scripts/lib/disposable-postgres";

describe("disposable PostgreSQL rehearsal guard", () => {
  it("accepts only a deliberately named local rehearsal database", () => {
    expect(assertDisposableRehearsalDatabaseUrl(
      "postgresql://user:password@127.0.0.1:5432/nexaclass_rehearsal_ci?schema=public",
      REHEARSAL_CONFIRMATION,
    )).toContain("nexaclass_rehearsal_ci");
  });

  it("refuses DATABASE_URL-like and remote targets even with confirmation", () => {
    expect(() => assertDisposableRehearsalDatabaseUrl(undefined, REHEARSAL_CONFIRMATION)).toThrow("NEXACLASS_REHEARSAL_DATABASE_URL");
    expect(() => assertDisposableRehearsalDatabaseUrl("postgresql://user:password@db.example.test:5432/nexaclass_rehearsal", REHEARSAL_CONFIRMATION)).toThrow("localhost");
    expect(() => assertDisposableRehearsalDatabaseUrl("postgresql://user:password@localhost:5432/app", REHEARSAL_CONFIRMATION)).toThrow("nexaclass_rehearsal");
    expect(() => assertDisposableRehearsalDatabaseUrl("postgresql://user:password@localhost:5432/nexaclass_rehearsal", "yes")).toThrow("NEXACLASS_REHEARSAL_CONFIRM");
  });
});
