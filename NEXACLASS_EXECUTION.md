# NexaClass V1 Execution

## DONE

- Tenant foundation: hostname resolution, `TenantMembership` roles, tenant-aware repositories, tenant wallet ledger, secure quiz grading, and tenant-namespaced storage keys.
- Tenant-safe course/catalog, enrollment, messaging, homework, live-stream, wallet, and core commerce migration work present and operational.
- Protected object download boundaries for tenant homework, messages, lesson PDFs, and store PDFs; anonymous store DTO no longer includes private PDF keys or cost prices.
- Homework and message upload clients submit server-issued object keys; activation-code redemption is transactional; manual wallet credits are OWNER/ADMIN-only, rate-limited, audited, and require a reason.
- Queue 2 course-module foundation: additive `CourseModule` schema with stable IDs, nullable legacy-compatible lesson/quiz module links, tenant-scoped CRUD, complete-set reorder protection, and stable content movement. Targeted tenant-bound repository tests pass (3 tests).
- Queue 1 rehearsal tooling: guarded legacy migration rehearsal runner and disposable-PostgreSQL URL validation test added. It accepts only an explicit `NEXACLASS_REHEARSAL_DATABASE_URL`, never `DATABASE_URL`.
- Queue 1 tenant uniqueness runner: `npm run test:tenant-uniqueness:integration` executed against local disposable PostgreSQL; verified Alpha/Beta duplicate category/course/code fixtures coexist independently without conflict.
- Queue 1 database hardening: `20260903010000_tenant_constraints` removes global Course/Category/ActivationCode uniqueness in favor of tenant-local composite unique keys, including tenant-local conversations. `db:finalize:tenant-constraints` validates backfilled data and promotes them to physical `NOT NULL` constraints. Legacy quiz attempts receive their matching student membership during the idempotent backfill.
- Queue 3 progress foundation: server-authoritative `LessonProgress`/`CourseProgress` persistence, atomic roll-ups, resume position, completion, next lesson, and continue-learning service are complete; `/api/learning/progress` exposes this only to the active tenant student membership.
- Queue 4 assignments: tenant-scoped assignment authoring, publication, student submission/resubmission, server-calculated late state, teacher review, grade bounds, feedback, and assignment-module linkage are complete. `/dashboard/assignments` provides a mobile-first student/staff workflow. Assignment files are uploaded only after active-membership and course-entitlement checks, stored in an assignment-only tenant namespace, and served only through an authorized download route.
- Queue 5 quiz UX: course-editor question management is complete; secure quiz boundary enforces per-quiz publication/availability and per-quiz attempt limits (with legacy course limit fallback), and server time expiry receives zero objective credit. Student attempt history, server-derived pass results, and staff product settings/results are available through the tenant-only quiz product API and dashboard.
- Queue 8 website builder: additive `Site`, `SitePage`, and typed `PageSection` persistence plus tenant secondary/contact branding fields and migration `20260903030000_site_builder_foundation` are in place. Owner/admin dashboard editing supports page creation, section creation/editing, structured JSON settings, variants, reorder, show/hide, publishing/home selection, and deletion. Published sections render only from the resolved tenant at `/` for the home page and `/site/[slug]` for secondary pages.
- Queue 1 profile dashboard migration: `/dashboard/profile` loads strictly from the active `TenantMembership` and its tenant-scoped user relation. It no longer uses `User.role`/session role for authorization or offers legacy global role editing; the production boundary releases only this reviewed page.
- Queue 1 teacher dashboard migration: `/dashboard/teachers`, its feature flag, staff CRUD, and featured-homepage order use `TenantMembership`/`TenantSettings` and the `MANAGE_STAFF` permission. Staff removal revokes only the current tenant membership.
- Queue 9/10 platform foundation & operations: `PlatformAdministrator` is an explicit authority, with configurable `SaaSPlan`, per-tenant `TenantSubscription`, trial/status, feature flags, limits, and tenant capability resolution. `/platform-admin` manages tenant lifecycle states (ACTIVE, SUSPENDED, ARCHIVED) and SaaS subscription plans.
- NexaClass Platform Control Panel (`/platform-admin`): Dedicated SaaS management control panel for NexaClass platform owner. Includes Overview dashboard (MRR, ARR, SaaS revenue, upcoming renewals, overdue subscriptions, scale metrics), Tenants management & creation (`/platform-admin/tenants`), Tenant detail & lifecycle hub (`/platform-admin/tenants/[id]`), SaaS Plans manager (`/platform-admin/plans`), Tenant SaaS Subscriptions (`/platform-admin/subscriptions`), Platform Administrators (`/platform-admin/admins`), Feature Flags catalogue (`/platform-admin/features`), Global Usage statistics (`/platform-admin/usage`), SaaS Invoices ledger (`/platform-admin/billing`), and Platform Audit Logs (`/platform-admin/audit-logs`).
- Tenant & Student UI Discoverability: Updated `DashboardNav.tsx` with dedicated, prominent, intuitive navigation links for all three personas (Students, Teachers, and Academy Owners/Admins). Zero orphaned or hidden URL-only features.
- Queue 11 external payment settlement: isolated signed `LOCAL_TEST` adapter, fail-closed Paymob/Kashier placeholders, and durable `Order`/`OrderItem`/extended `Payment`/`PaymentAttempt` schema are in place. Student-only server-priced order creation requires an idempotency key; the configured provider initiates checkout only, while its signed webhook is the sole paid transition. Callback event claiming, provider/amount/currency checks, paid state, and course/store/subscription entitlements execute atomically in a serializable Prisma transaction.
- Queue 1 multi-tenant & dashboard hardening: migrated `/dashboard/settings/add-balance`, `/dashboard/settings/copyright-overlay`, `/dashboard/settings/homepage` (redirects to authoritative website builder), `/dashboard/add-balance`, `/dashboard/students/[id]` (rich tabbed detail view with course enrollments, quiz attempts, assignments, wallet ledger, and subscription management). All legacy fallback queries in `app/dashboard/page.tsx` eliminated. Unblocked all reviewed dashboard routes in `modules/tenants/production-boundary.ts`.
- Queue 6 student and teacher dashboard experience: complete `StudentDashboardView` (wallet balance, quick add-balance, continue-learning resume cards, enrolled courses grid, pending & submitted assignments with grades and reviewer feedback, latest quiz results with pass/fail badges, store purchase history) and `StaffDashboardView` (metrics, quick operation shortcuts, actionable pending assignments queue, recent enrollments).
- Queue 4 internal notifications foundation: added `NotificationKind` enum, `Notification` model, migration `20260903070000_tenant_notifications`, `modules/notifications/repository.ts` (listing, unread count, single read, mark all read, create, staff broadcast), and API routes (`/api/notifications`, `/api/notifications/[id]/read`, `/api/notifications/read-all`). Comprehensive unit tests passing.
- Queue 5 video-provider abstraction: implemented `modules/video/provider.ts` supporting `HTML5`, `YOUTUBE`, and `BUNNY` Stream CDN with unit tests, integrated into protected lesson player (`app/courses/[slug]/lessons/[lessonSlug]/page.tsx`).
- Production hardening & health checks: cleaned `app/api/health/route.ts` to probe database connectivity using `prisma.$queryRawUnsafe("SELECT 1")` without legacy raw drivers. Configured `NEXTAUTH_SECRET` fail-safe gate prohibiting dev/build fallbacks at production runtime.
- Final Release Gate: executed full PostgreSQL rehearsal on a clean disposable database (`test:migration:rehearsal`), tenant-local uniqueness validation (`test:tenant-uniqueness:integration`), finance concurrency and serializable isolation test (`test:finance:integration`), NEXTAUTH_SECRET production security test suite, and full release verification (`check`, `build`, `validate`).

## IN PROGRESS

- None. NexaClass V1 implementation, hardening, migration rehearsal, and release gate verification are complete.

## TODO

1. Provision production environment variables and deploy NexaClass V1 to production.

## EXTERNAL ONLY

- Production provider credentials/DNS/email/video credentials are reserved for live deployment.

## TEST EVIDENCE

- `npm run test:migration:rehearsal`: PASSED on clean disposable PostgreSQL (`{"status":"passed","database":"local disposable rehearsal","backfillRuns":2,"tenantLocalUniqueness":true}`).
- `npm run test:tenant-uniqueness:integration`: PASSED on clean disposable PostgreSQL (`{"status":"passed","alpha":{"physics":true,"secondary":true,"START100":true},"beta":{"physics":true,"secondary":true,"START100":true}}`).
- `npm run test:finance:integration`: PASSED on clean disposable PostgreSQL (`{"status":"passed","alphaBalanceAfterCourse":"0.00","betaBalanceAfterAlphaCourse":"100.00","courseEnrollments":1,"courseDebitLedgers":1,"storePurchases":1,"subscriptionPurchases":1,"rollbackBalance":"500.00"}`).
- `NEXTAUTH_SECRET` production safety proof: PASSED (`tests/unit/security/nextauth-secret.test.ts` - 6/6 tests passing, rejects fallback at production runtime).
- `npm run test`: PASSED (30 test files, 90 passed tests, 100% pass rate).
- `npm run typecheck`: PASSED (0 errors).
- `npm run lint`: PASSED (0 errors, 78 pre-existing warnings in legacy files).
- `npm exec prisma validate`: PASSED (schema valid).
- `npm exec prisma generate`: PASSED (client generated).
- `npm run build`: PASSED (all 80 static and dynamic routes compiled and optimized successfully).

## LAST VERIFIED COMMIT/STATE

- Completed all Queues (1, 2, 3, 4, 5, 6, 8, 9, 10, 11).
- Completed and verified full disposable PostgreSQL migration rehearsal and adversarial concurrency suite against clean test database.
- Production readiness: fully verified and certified ready for deployment.

---

## MANAGED WEBSITE TEMPLATE SYSTEM

### DONE

- Completed a second professional art-direction pass across all six public templates: stronger template-specific hero composition, navigation treatment, course hierarchy, image framing, data-proof presentation, testimonials, FAQ affordances, CTA hierarchy, footer layout, keyboard focus states, reduced-motion behavior, and mobile stacking. Added branded visual fallbacks for missing hero/course imagery without introducing fake tenant content.
- Added the shared, versioned `WebsiteTemplate` registry and linked each tenant `Site` to a template/version without forking frontend code per tenant.
- Registered six Arabic-first responsive production templates: `personal-teacher`, `modern-academy`, `premium-dark`, `clean-education`, `course-funnel`, and `bold-youth`. Each has a distinct semantic composition, hierarchy, spacing, header/footer treatment, course presentation, and visual identity.
- Extended semantic sections with `CATEGORIES`, `FEATURES`, `RESULTS`, `VIDEO`, and `SOCIAL_PROOF` while retaining the existing `Site / SitePage / PageSection` builder engine.
- Implemented first-time initialization and confirmed template switching. Switching recreates only the home-page presentation, maps content by semantic section type, keeps non-home pages, and does not mutate users, memberships, courses, lessons, quizzes, assignments, enrollments, orders, payments, wallets, or subscriptions.
- Added platform-only template list/apply/publish APIs with tenant/template existence checks, active-template enforcement, tenant-scoped branding uploads, and audit events `SITE_TEMPLATE_APPLIED`, `SITE_TEMPLATE_CHANGED`, and `SITE_INITIALIZED_FROM_TEMPLATE`.
- Added `/platform-admin/templates`, safe demo previews, tenant-aware Apply controls, and a Website panel on `/platform-admin/tenants/[id]`.
- Replaced the Create Academy entry point with the six-step `/platform-admin/tenants/new` workflow: academy information, template, branding, contact, preview, create/publish.
- Replaced the normal tenant website builder with a simple Arabic `My Website` settings surface. Advanced builder UI and mutations require the explicit `advancedWebsiteBuilder` feature.
- Added safe plan defaults: `websiteTemplate = true`, `advancedWebsiteBuilder = false`; retained `customDomain` as a separate capability.
- Added dynamic tenant courses, categories, teacher memberships, metrics, testimonials, contact settings, SEO metadata, RTL/LTR behavior, mobile layouts, and intentional hiding of data-dependent empty sections.
- Preserved hostname separation: root NexaClass domain renders corporate marketing; wildcard subdomains and active custom domains resolve tenant template sites; unknown hosts fail safely.
- Removed the predictable shared password from academy provisioning; new owners receive a random unrecoverable credential and use the existing password-reset flow.

### IN PROGRESS

- None. The managed template UI flow is implemented and build-verified. Production deployment must apply the additive migration before starting the new release.

### TODO

1. Apply `20260903120000_managed_website_templates` through the normal production migration pipeline.
2. Confirm production R2 branding storage variables and DNS wildcard/custom-domain records during deployment.

### TEST EVIDENCE

- `npm run lint`: PASSED with 0 errors (pre-existing warnings remain).
- `npm run typecheck`: PASSED with 0 errors.
- `npm run test`: PASSED (32 test files, 102 tests).
- Managed-template focused suite: PASSED (14 tests covering registry, lookup, distinct compositions, version/RTL metadata, semantic content preservation, platform authorization, tenant validation/isolation, inactive rejection, idempotency, switching, audit payloads, and hostname parsing).
- `npm run test:migration:rehearsal`: PASSED against local disposable PostgreSQL (`{"status":"passed","database":"local disposable rehearsal","backfillRuns":2,"tenantLocalUniqueness":true}`).
- `npm exec prisma validate`: PASSED.
- `npm exec prisma generate`: PASSED after briefly restarting the workspace-local Next process that held the Windows query-engine DLL.
- `npm run build`: PASSED; 99 routes compiled, including the template gallery, preview, academy onboarding, tenant website APIs, and simplified tenant website settings.
