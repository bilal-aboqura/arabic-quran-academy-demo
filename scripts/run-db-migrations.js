/**
 * Legacy Neon SQL migration runner — retired.
 *
 * Schema is managed by Prisma:
 *   npm run db:push
 *   npm run db:seed
 *
 * Historical SQL files under scripts/*.sql are reference only.
 */
console.error(
  [
    "scripts/run-db-migrations.js is retired.",
    "Use Prisma instead:",
    "  1. Set DATABASE_URL in .env (VPS / local PostgreSQL)",
    "  2. npm run db:generate",
    "  3. npm run db:push",
    "  4. npm run db:seed",
  ].join("\n"),
);
process.exit(1);
