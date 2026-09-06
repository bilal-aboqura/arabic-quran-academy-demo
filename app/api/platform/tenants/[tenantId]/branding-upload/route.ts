import { NextRequest,NextResponse } from "next/server";
import { getPlatformActor } from "@/modules/platform/actor";
import { prisma } from "@/lib/prisma";
import { isR2Configured,uploadToR2 } from "@/lib/r2";
import { buildTenantObjectKey } from "@/modules/storage/tenant-storage";

const types=new Set(["image/jpeg","image/png","image/webp","image/gif","image/svg+xml"]);
export async function POST(request:NextRequest,{params}:{params:Promise<{tenantId:string}>}) {
  const actor=await getPlatformActor(); if(!actor)return NextResponse.json({error:"Unauthorized"},{status:401});
  const {tenantId}=await params; if(!await prisma.tenant.findUnique({where:{id:tenantId},select:{id:true}}))return NextResponse.json({error:"Tenant not found"},{status:404});
  if(!isR2Configured())return NextResponse.json({error:"Storage is not configured"},{status:503});
  const form=await request.formData(); const file=form.get("file");
  if(!(file instanceof File)||!types.has(file.type)||file.size>5*1024*1024)return NextResponse.json({error:"Invalid image"},{status:400});
  const key=buildTenantObjectKey({tenantId,kind:"branding",fileName:file.name}); const uploaded=await uploadToR2(Buffer.from(await file.arrayBuffer()),key,file.type);
  return NextResponse.json(uploaded);
}
