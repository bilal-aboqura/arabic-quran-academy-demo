import { describe,expect,it } from "vitest";
import { SYSTEM_WEBSITE_TEMPLATES,WEBSITE_TEMPLATE_CODES,getSystemTemplate } from "@/modules/sites/templates";
import { mapSemanticSections } from "@/modules/sites/template-service";
import { DEFAULT_SAAS_FEATURE_FLAGS } from "@/modules/platform/saas.repository";

describe("managed website template registry",()=>{
  it("registers all eight stable, unique template codes",()=>{
    expect(SYSTEM_WEBSITE_TEMPLATES).toHaveLength(8);
    expect(SYSTEM_WEBSITE_TEMPLATES.map(t=>t.code)).toEqual([...WEBSITE_TEMPLATE_CODES]);
    expect(new Set(SYSTEM_WEBSITE_TEMPLATES.map(t=>t.code)).size).toBe(8);
  });
  it("looks templates up without accepting unknown codes",()=>{
    expect(getSystemTemplate("premium-dark")?.name).toBe("Premium Dark");
    expect(getSystemTemplate("unknown")).toBeNull();
  });
  it("ships genuinely different semantic compositions",()=>{
    const signatures=SYSTEM_WEBSITE_TEMPLATES.map(t=>t.sections.map(s=>`${s.type}:${s.variant}`).join("|"));
    expect(new Set(signatures).size).toBe(8);
    expect(getSystemTemplate("course-funnel")?.sections.length).toBeGreaterThan(getSystemTemplate("clean-education")?.sections.length??99);
  });
  it("is Arabic-first and versioned",()=>{
    for(const template of SYSTEM_WEBSITE_TEMPLATES){expect(template.nameAr.length).toBeGreaterThan(2);expect(template.version).toBeGreaterThan(0);expect(template.supportedFeatures).toContain("rtl");}
  });
});

describe("semantic template switching",()=>{
  it("preserves tenant-owned content while adopting the new presentation variant and order",()=>{
    const target=getSystemTemplate("premium-dark")!;
    const plan=mapSemanticSections(target.sections,[{type:"HERO",config:{title:"عنوان الأكاديمية",body:"نص حقيقي",buttonLabel:"سجل"}},{type:"TESTIMONIALS",config:{items:[{title:"طالب",body:"رأي حقيقي"}]}}]);
    expect(plan.find(s=>s.type==="HERO")).toMatchObject({variant:"cinematic",sortOrder:0,config:{title:"عنوان الأكاديمية",body:"نص حقيقي",buttonLabel:"سجل"}});
    expect(plan.find(s=>s.type==="TESTIMONIALS")?.config).toMatchObject({items:[{title:"طالب",body:"رأي حقيقي"}]});
  });
  it("does not carry template-specific variants into the destination",()=>{
    const plan=mapSemanticSections(getSystemTemplate("clean-education")!.sections,[{type:"HERO",config:{title:"Preserved"}}]);
    expect(plan[0]).toMatchObject({type:"HERO",variant:"calm",config:{title:"Preserved"}});
  });
  it("defaults the commercial managed-SaaS flags safely",()=>{
    expect(DEFAULT_SAAS_FEATURE_FLAGS.websiteTemplate).toBe(true);
    expect(DEFAULT_SAAS_FEATURE_FLAGS.advancedWebsiteBuilder).toBe(false);
  });
});
