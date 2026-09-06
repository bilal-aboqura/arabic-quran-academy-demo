import { NextResponse } from "next/server";

/**
 * A temporary production fail-closed boundary for legacy routes that still
 * read the global singleton or make non-tenant-scoped financial writes.
 * New tenant hosts must never receive that global data while their route is
 * being migrated. Development keeps legacy compatibility for local work.
 */
export function legacyGlobalDataUnavailableInProduction(): NextResponse | null {
  if (process.env.NODE_ENV !== "production") return null;
  return NextResponse.json(
    { error: "This legacy operation is unavailable while tenant migration is in progress." },
    { status: 503 },
  );
}
