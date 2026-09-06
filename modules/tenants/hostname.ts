const hostnamePattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/;

/** Normalizes a Host header without accepting a path, protocol, port, or invalid label. */
export function normalizeHostname(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  // Host headers may include a numeric port in local/staging deployments.
  // Protocols, paths, credentials, IPv6 literals, and non-numeric ports fail.
  const match = /^([^:/\s]+)(?::([0-9]{1,5}))?$/.exec(raw);
  if (!match) return null;
  const rawHostname = match[1];
  const port = match[2] ? Number(match[2]) : null;
  if (port !== null && (port < 1 || port > 65535)) return null;
  const normalized = rawHostname.replace(/\.$/, "");
  if (!normalized) return null;
  return hostnamePattern.test(normalized) ? normalized : null;
}

export function rootDomain(): string {
  return (process.env.NEXACLASS_ROOT_DOMAIN?.trim().toLowerCase() || "nexaclass.app").replace(/\.$/, "");
}

/** Returns a valid wildcard subdomain slug, never an arbitrary nested hostname. */
export function tenantSlugFromWildcardHostname(hostname: string, root = rootDomain()): string | null {
  if (!hostname.endsWith(`.${root}`)) return null;
  const label = hostname.slice(0, -(root.length + 1));
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) return null;
  return label;
}
