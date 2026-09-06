import { notFound } from "next/navigation";
import { getSystemTemplate, TEMPLATE_DEMO_PRESETS, type WebsiteTemplateCode } from "@/modules/sites/templates";
import { TemplatePreviewStudio } from "./TemplatePreviewStudio";

export default async function TemplatePreview({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  const template = getSystemTemplate(code);
  if (!template) notFound();

  const demoPreset =
    TEMPLATE_DEMO_PRESETS[code as WebsiteTemplateCode] ||
    TEMPLATE_DEMO_PRESETS["clean-education"];

  const page = {
    title: "الرئيسية",
    site: {
      template: {
        code: template.code,
        version: template.version,
        defaultTheme: template.defaultTheme,
      },
      templateVersion: template.version,
      themeOverrides: {},
    },
    sections: template.sections.map((s, i) => ({
      id: `demo-${i}`,
      type: s.type,
      variant: s.variant,
      config: s.config,
    })),
  };

  return (
    <TemplatePreviewStudio
      template={template}
      demoPreset={demoPreset}
      page={page}
      tenantId={query.tenantId}
    />
  );
}
