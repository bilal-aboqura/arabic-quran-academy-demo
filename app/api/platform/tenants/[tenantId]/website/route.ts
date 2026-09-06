import { NextRequest,NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { applyWebsiteTemplate,publishTenantWebsite,type BrandingInput } from "@/modules/sites/template-service";

export async function POST(request:NextRequest,{params}:{params:Promise<{tenantId:string}>}) {
  const actor=await getPlatformActor(); if(!actor)return NextResponse.json({error:"Unauthorized"},{status:401});
  try { const {tenantId}=await params; const body=await request.json() as {action?:string;templateCode?:string;branding?:BrandingInput;publish?:boolean};
    if(body.action==="publish")return NextResponse.json({site:await publishTenantWebsite({actor,tenantId})});
    if(!body.templateCode)return NextResponse.json({error:"Template is required"},{status:400});
    return NextResponse.json({site:await applyWebsiteTemplate({actor,tenantId,templateCode:body.templateCode,branding:body.branding,publish:body.publish})});
  } catch(error) { const message=error instanceof Error?error.message:"Unable to update website"; const status=message==="TENANT_NOT_FOUND"||message==="TEMPLATE_NOT_FOUND"?404:message==="TEMPLATE_INACTIVE"?409:400; return NextResponse.json({error:message},{status}); }
}
