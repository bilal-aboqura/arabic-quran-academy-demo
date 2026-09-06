# NexaClass migration deployment procedure

The legacy application was historically created with `prisma db push`, so a
non-empty database has no Prisma migration history. Do not point the migration
commands at an unverified production connection string.

## Safe validation first

1. Create a dedicated Neon branch, staging database, or isolated local
   PostgreSQL database. Never reuse the configured application database until
   it has been positively identified as disposable.
2. Restore a sanitized backup, or seed representative legacy records.
3. Compare the legacy schema with
   `prisma/migrations/20260901190000_legacy_baseline/migration.sql`.
   Resolve drift before recording a migration baseline.
4. Run `npx prisma migrate resolve --applied 20260901190000_legacy_baseline`
   **only on the verified staging copy of an existing legacy database**.
5. Run `npx prisma migrate deploy` against that staging copy. The final tenant
   migration adds NOT VALID checks: those reject new orphaned rows immediately
   but deliberately allow the historical rows to remain until the backfill.
6. Run the guarded legacy backfill with `RUN_LEGACY_TENANT_BACKFILL=true` and
   the required `NEXACLASS_LEGACY_TENANT_OWNER_EMAIL` value. Run it a second
   time to prove that it is safe to repeat.
7. Run `TENANT_CONSTRAINTS_DATABASE_URL=<staging URL> npm run db:finalize:tenant-constraints`.
   This refuses normal production URLs, verifies tenant/membership parent
   consistency, validates all tenant checks, and changes the guarded columns
   to physical `NOT NULL` constraints.
   For the reviewed production execution, use the same command with the
   production URL only after staging has passed and set
   `TENANT_CONSTRAINTS_ALLOW_PRODUCTION_FINALIZE=true`; this acknowledgement
   prevents a remote database from being finalized by accident.
8. Verify tenant row counts, memberships, owner role, tenant settings, and
   tenant-owned-data columns before scheduling production deployment. The
   wallet migration creates `TenantStudentAccount` and one immutable
   `LEGACY_OPENING_BALANCE` ledger entry only for each legacy student
   membership; verify that no balance was copied into another tenant.

## Automated local legacy rehearsal

The repository includes a destructive proof of the legacy-to-current path. It
does **not** use `DATABASE_URL`, accepts only `localhost` / `127.0.0.1` / `::1`,
and only resets a database named `nexaclass_rehearsal` (or
`nexaclass_rehearsal_<suffix>`). It creates representative legacy users,
password hashes, roles, balances, courses, lessons, quizzes, enrollments,
payments, homework, messages, store records, subscriptions, and settings.
It then deploys migrations, executes the guarded backfill twice, finalizes the
post-backfill tenant constraints, and proves
that Alpha/Beta tenant-local `physics`, `secondary`, and `START100` values can
coexist.

Create the empty local database once, then run:

```powershell
$env:NEXACLASS_REHEARSAL_DATABASE_URL = "postgresql://USER:PASSWORD@127.0.0.1:5432/nexaclass_rehearsal?schema=public"
$env:NEXACLASS_REHEARSAL_CONFIRM = "RESET_NEXACLASS_REHEARSAL"
npm run test:migration:rehearsal
```

The confirmation and strict database name are deliberately required because
the rehearsal drops and recreates `public`. A duplicate-slug/code failure is a
release failure: add the final tenant uniqueness migration, then rerun this
rehearsal from a clean disposable database.

For a focused PostgreSQL composite-uniqueness check after migrations have
already been deployed to that same disposable database, run:

```powershell
npm run test:tenant-uniqueness:integration
```

## Fresh databases

For a new empty database, run only:

```text
npx prisma migrate deploy
```

This applies the legacy baseline followed by the NexaClass tenant foundation
and tenant-owned data bridge in timestamp order.

## Existing production database deployment

Production must follow the staging procedure exactly: verified backup, schema
comparison, baseline record, deploy, guarded backfill, and post-deploy checks.
Use `prisma migrate deploy`, never `prisma db push`, after this migration
history is introduced.

The final tenant migration replaces global Course/Category/ActivationCode
uniqueness with `(tenant_id, slug/code)` uniqueness, so Alpha and Beta can each
have `physics`, `secondary`, and `START100`. It also makes tenant scoping a
write-time database boundary during the bridge window; the explicit finalizer
performs the post-backfill physical `NOT NULL` tightening.
