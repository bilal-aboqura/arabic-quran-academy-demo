-- Controlled tenant website builder: typed sections, no arbitrary HTML.
DO $$ BEGIN
  CREATE TYPE "PageSectionType" AS ENUM ('HERO', 'COURSES', 'ABOUT', 'STATS', 'TEACHERS', 'TESTIMONIALS', 'FAQ', 'CONTACT', 'CTA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "secondary_color" TEXT;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "contact_details" JSONB;

CREATE TABLE "Site" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Site_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Site_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Site_tenant_id_key" ON "Site"("tenant_id");

CREATE TABLE "SitePage" (
  "id" TEXT NOT NULL,
  "site_id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "is_home" BOOLEAN NOT NULL DEFAULT false,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SitePage_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SitePage_site_id_slug_key" ON "SitePage"("site_id", "slug");
CREATE INDEX "SitePage_site_id_is_published_idx" ON "SitePage"("site_id", "is_published");

CREATE TABLE "PageSection" (
  "id" TEXT NOT NULL,
  "page_id" TEXT NOT NULL,
  "type" "PageSectionType" NOT NULL,
  "variant" TEXT NOT NULL DEFAULT 'default',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "config" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PageSection_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "SitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PageSection_page_id_sort_order_idx" ON "PageSection"("page_id", "sort_order");
