-- Managed website templates: presentation-only, additive migration.
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'CATEGORIES';
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'FEATURES';
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'RESULTS';
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'VIDEO';
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'SOCIAL_PROOF';

CREATE TYPE "SiteStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "TenantSettings"
  ADD COLUMN "logo_url" TEXT,
  ADD COLUMN "favicon_url" TEXT,
  ADD COLUMN "hero_image_url" TEXT,
  ADD COLUMN "accent_color" TEXT,
  ADD COLUMN "font_preference" TEXT,
  ADD COLUMN "short_about" TEXT,
  ADD COLUMN "seo_title" TEXT,
  ADD COLUMN "seo_description" TEXT;

CREATE TABLE "WebsiteTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "thumbnail" TEXT,
  "preview_image" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "default_theme" JSONB NOT NULL DEFAULT '{}',
  "default_pages" JSONB NOT NULL DEFAULT '[]',
  "default_sections" JSONB NOT NULL DEFAULT '[]',
  "supported_features" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsiteTemplate_code_key" ON "WebsiteTemplate"("code");
CREATE INDEX "WebsiteTemplate_is_active_category_idx" ON "WebsiteTemplate"("is_active", "category");

ALTER TABLE "Site"
  ADD COLUMN "template_id" TEXT,
  ADD COLUMN "template_version" INTEGER,
  ADD COLUMN "status" "SiteStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "published_at" TIMESTAMP(3),
  ADD COLUMN "theme_overrides" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Site" ADD CONSTRAINT "Site_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "WebsiteTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
