import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isProductionTenantBoundaryBlockedPath, isReviewedTenantApiPath } from "@/modules/tenants/production-boundary";

function unavailableApiResponse() {
  return NextResponse.json(
    { error: "This endpoint is temporarily unavailable while tenant isolation is completed.", code: "TENANT_MIGRATION_REQUIRED" },
    { status: 503 },
  );
}

/**
 * Next.js 16 request boundary. Tenant resolution remains server-side because
 * the authoritative TenantDomain lookup is database backed; this proxy only
 * prevents an unreviewed legacy route from running globally in production.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV === "production") {
    if (pathname.startsWith("/api/") && !isReviewedTenantApiPath(pathname)) {
      return unavailableApiResponse();
    }
    if (isProductionTenantBoundaryBlockedPath(pathname)) {
      return new NextResponse("Unavailable during tenant migration", { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  }

  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  // This edge boundary verifies only that a session exists. It deliberately
  // does not interpret the legacy global JWT role: tenant authorization is
  // database-backed and must happen in the page/route through a resolved
  // TenantMembership.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*", "/courses/:path*", "/courses"],
};
