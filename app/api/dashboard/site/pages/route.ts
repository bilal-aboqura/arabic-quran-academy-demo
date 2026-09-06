import { NextRequest, NextResponse } from "next/server";
import { PageSectionType, type Prisma } from "@prisma/client";
import {
  createPageSectionForTenant, createSitePageForTenant, deletePageSectionForTenant, deleteSitePageForTenant,
  listSitePagesForTenant, reorderPageSectionsForTenant, updatePageSectionForTenant, updateSitePageForTenant,
} from "@/modules/sites/repository";
import { requireTenantActor, tenantRequestErrorResponse } from "@/modules/tenants/request-context";
import { tenantHasSaaSFeature } from "@/modules/platform/saas.repository";

async function advancedEnabled(tenantId:string){return tenantHasSaaSFeature(tenantId,"advancedWebsiteBuilder");}

export async function GET(request: NextRequest) {
  try { const actor = await requireTenantActor(request); if(!await advancedEnabled(actor.tenantId))return NextResponse.json({error:"Advanced website builder is disabled"},{status:403}); return NextResponse.json({ pages: await listSitePagesForTenant({ tenantId: actor.tenantId, actor }) }); }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to load site pages" }, { status: 403 }); }
}
export async function POST(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request); if(!await advancedEnabled(actor.tenantId))return NextResponse.json({error:"Advanced website builder is disabled"},{status:403}); const body = await request.json() as Record<string, unknown>;
    if (body.kind === "section") {
      if (typeof body.pageId !== "string" || typeof body.type !== "string" || !Object.values(PageSectionType).includes(body.type as PageSectionType) || typeof body.variant !== "string" || !body.config || typeof body.config !== "object" || Array.isArray(body.config)) return NextResponse.json({ error: "Invalid section" }, { status: 400 });
      const section = await createPageSectionForTenant({ tenantId: actor.tenantId, actor, pageId: body.pageId, type: body.type as PageSectionType, variant: body.variant, config: body.config as Prisma.JsonObject });
      return section ? NextResponse.json({ section }, { status: 201 }) : NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    if (typeof body.title !== "string" || typeof body.slug !== "string") return NextResponse.json({ error: "title and slug are required" }, { status: 400 });
    return NextResponse.json({ page: await createSitePageForTenant({ tenantId: actor.tenantId, actor, title: body.title, slug: body.slug, isHome: body.isHome === true, isPublished: body.isPublished === true }) }, { status: 201 });
  } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create site content" }, { status: 400 }); }
}
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request); if(!await advancedEnabled(actor.tenantId))return NextResponse.json({error:"Advanced website builder is disabled"},{status:403}); const body = await request.json() as Record<string, unknown>;
    if (body.kind === "reorder" || (typeof body.pageId === "string" && Array.isArray(body.sectionIds))) {
      if (typeof body.pageId !== "string" || !Array.isArray(body.sectionIds) || !body.sectionIds.every((id): id is string => typeof id === "string")) return NextResponse.json({ error: "pageId and sectionIds are required" }, { status: 400 });
      const result = await reorderPageSectionsForTenant({ tenantId: actor.tenantId, actor, pageId: body.pageId, sectionIds: body.sectionIds });
      return "error" in result ? NextResponse.json(result, { status: 400 }) : NextResponse.json(result);
    }
    if (body.kind === "page") {
      if (typeof body.pageId !== "string" || (body.title !== undefined && typeof body.title !== "string") || (body.slug !== undefined && typeof body.slug !== "string") || (body.isHome !== undefined && typeof body.isHome !== "boolean") || (body.isPublished !== undefined && typeof body.isPublished !== "boolean")) return NextResponse.json({ error: "Invalid page update" }, { status: 400 });
      const page = await updateSitePageForTenant({ tenantId: actor.tenantId, actor, pageId: body.pageId, title: body.title as string | undefined, slug: body.slug as string | undefined, isHome: body.isHome as boolean | undefined, isPublished: body.isPublished as boolean | undefined });
      return page ? NextResponse.json({ page }) : NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    if (body.kind === "section") {
      if (typeof body.sectionId !== "string" || (body.type !== undefined && (typeof body.type !== "string" || !Object.values(PageSectionType).includes(body.type as PageSectionType))) || (body.variant !== undefined && typeof body.variant !== "string") || (body.enabled !== undefined && typeof body.enabled !== "boolean") || (body.config !== undefined && (!body.config || typeof body.config !== "object" || Array.isArray(body.config)))) return NextResponse.json({ error: "Invalid section update" }, { status: 400 });
      const section = await updatePageSectionForTenant({ tenantId: actor.tenantId, actor, sectionId: body.sectionId, type: body.type as PageSectionType | undefined, variant: body.variant as string | undefined, enabled: body.enabled as boolean | undefined, config: body.config as Prisma.JsonObject | undefined });
      return section ? NextResponse.json({ section }) : NextResponse.json({ error: "Section not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Unsupported site update" }, { status: 400 });
  }
  catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to reorder sections" }, { status: 403 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireTenantActor(request); if(!await advancedEnabled(actor.tenantId))return NextResponse.json({error:"Advanced website builder is disabled"},{status:403}); const body = await request.json() as { kind?: unknown; pageId?: unknown; sectionId?: unknown };
    if (body.kind === "page" && typeof body.pageId === "string") return (await deleteSitePageForTenant({ tenantId: actor.tenantId, actor, pageId: body.pageId })) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Page not found" }, { status: 404 });
    if (body.kind === "section" && typeof body.sectionId === "string") return (await deletePageSectionForTenant({ tenantId: actor.tenantId, actor, sectionId: body.sectionId })) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Section not found" }, { status: 404 });
    return NextResponse.json({ error: "Invalid deletion request" }, { status: 400 });
  } catch (error) { return tenantRequestErrorResponse(error) ?? NextResponse.json({ error: "Unable to delete site content" }, { status: 403 }); }
}
