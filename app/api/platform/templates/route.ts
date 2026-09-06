import { NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { listWebsiteTemplates } from "@/modules/sites/template-service";

export async function GET() {
  const actor=await getPlatformActor();
  if(!actor)return NextResponse.json({error:"Unauthorized"},{status:401});
  return NextResponse.json({templates:await listWebsiteTemplates({activeOnly:false})});
}
