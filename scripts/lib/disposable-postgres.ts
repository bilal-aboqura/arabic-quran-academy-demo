/**
 * Safety contract for scripts that reset a PostgreSQL database.  A local host
 * alone is not enough: developers often run an important database locally.
 * Rehearsal scripts therefore require an intentionally named database and an
 * explicit confirmation value as well.
 */
export const REHEARSAL_CONFIRMATION = "RESET_NEXACLASS_REHEARSAL";

const LOCAL_POSTGRES_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const REHEARSAL_DATABASE_NAME = /^nexaclass_rehearsal(?:_[a-z0-9]+)*$/;

export function assertDisposableRehearsalDatabaseUrl(urlValue: string | undefined, confirmation: string | undefined): string {
  if (!urlValue) {
    throw new Error("NEXACLASS_REHEARSAL_DATABASE_URL is required; DATABASE_URL is never used by rehearsal tooling.");
  }
  if (confirmation !== REHEARSAL_CONFIRMATION) {
    throw new Error(`NEXACLASS_REHEARSAL_CONFIRM must equal ${REHEARSAL_CONFIRMATION}.`);
  }

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error("NEXACLASS_REHEARSAL_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error("NEXACLASS_REHEARSAL_DATABASE_URL must use the postgresql:// protocol.");
  }
  if (!LOCAL_POSTGRES_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Migration rehearsal only permits localhost PostgreSQL; it will never reset a remote database.");
  }

  const databaseName = decodeURIComponent(url.pathname).replace(/^\//, "");
  if (!REHEARSAL_DATABASE_NAME.test(databaseName)) {
    throw new Error(`Migration rehearsal database must be named nexaclass_rehearsal (or nexaclass_rehearsal_<suffix>).`);
  }
  const schema = url.searchParams.get("schema");
  if (schema && schema !== "public") {
    throw new Error("Migration rehearsal only supports the public schema, because it resets that schema explicitly.");
  }

  return url.toString();
}
