import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Production Health & Uptime Probe:
 * Verifies database connectivity and essential authentication configuration.
 */
export async function GET(request: NextRequest) {
  const hasDbUrl = !!process.env.DATABASE_URL?.trim();
  const hasAuthSecret = !!process.env.NEXTAUTH_SECRET?.trim();
  const hasAuthUrl = !!process.env.NEXTAUTH_URL?.trim();

  let dbStatus: "ok" | "missing_url" | "error" = hasDbUrl ? "ok" : "missing_url";
  let dbMessage = "";

  if (hasDbUrl) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      dbMessage = "connected";
    } catch (e) {
      dbStatus = "error";
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Can't reach") || msg.includes("ECONNREFUSED") || msg.includes("connection")) {
        dbMessage = "Cannot reach database. Verify DATABASE_URL points to an active PostgreSQL instance.";
      } else if (msg.includes("Authentication failed") || msg.includes("password")) {
        dbMessage = "Authentication failed: verify database username and password in DATABASE_URL.";
      } else {
        dbMessage = "Database query error.";
      }
    }
  } else {
    dbMessage = "Environment variable not found: DATABASE_URL.";
  }

  const authOk = hasAuthSecret && hasAuthUrl;
  const authMessages: string[] = [];
  if (!hasAuthSecret) authMessages.push("NEXTAUTH_SECRET is not set.");
  if (!hasAuthUrl) authMessages.push("NEXTAUTH_URL is not set.");

  const ok = dbStatus === "ok" && authOk;

  const detail = {
    ok,
    status: ok ? "healthy" : "unhealthy",
    database: {
      status: dbStatus,
      message: dbMessage,
    },
    auth: {
      ready: authOk,
      messages: authMessages.length ? authMessages : ["configured"],
    },
  };

  const configuredToken = process.env.HEALTHCHECK_TOKEN?.trim();
  const providedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const canSeeDetail =
    process.env.NODE_ENV !== "production" ||
    (configuredToken && providedToken === configuredToken);

  return NextResponse.json(canSeeDetail ? detail : { ok }, { status: ok ? 200 : 503 });
}
