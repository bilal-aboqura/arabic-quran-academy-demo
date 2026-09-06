import { randomUUID } from "node:crypto";

/**
 * These are application-controlled folders, rather than user-controlled path
 * prefixes. A route must resolve a TenantActor before it can call this module.
 */
export const tenantStorageKinds = ["branding", "courses", "homework", "assignments", "attachments", "messages"] as const;
export type TenantStorageKind = (typeof tenantStorageKinds)[number];

type BuildTenantObjectKeyInput = {
  /** Trusted server-side tenant context; never take this directly from a request body. */
  tenantId: string;
  kind: TenantStorageKind;
  fileName?: string | null;
  /** Required by message uploads so later message creation can verify ownership. */
  actorUserId?: string | null;
};

function validOpaqueId(value: string): boolean {
  // CUIDs, UUIDs, or prefixed opaque IDs (e.g. c-default-academy, cuid, uuid).
  // Keeping this narrow prevents separators or traversal characters from becoming object-key segments.
  return /^[a-z0-9][a-z0-9_-]{2,63}$/i.test(value) && !value.includes("..");
}

function extensionFromFileName(fileName: string | null | undefined): string | null {
  const extension = fileName?.trim().toLowerCase().split(".").pop();
  return extension && /^[a-z0-9]{1,10}$/.test(extension) ? extension : null;
}

function assertTrustedId(value: string, name: string): void {
  if (!validOpaqueId(value)) {
    throw new Error(`Invalid ${name} for tenant storage key`);
  }
}

/**
 * Creates a new tenant namespace key. It deliberately accepts no caller-made
 * path/key parameter, so `../`, another tenant prefix, and folder selection
 * cannot reach R2.
 */
export function buildTenantObjectKey({ tenantId, kind, fileName, actorUserId }: BuildTenantObjectKeyInput): string {
  assertTrustedId(tenantId, "tenant id");
  if (!tenantStorageKinds.includes(kind)) {
    throw new Error("Unsupported tenant storage kind");
  }

  const suffix = extensionFromFileName(fileName);
  const generatedFileName = `${randomUUID()}${suffix ? `.${suffix}` : ""}`;
  const actorSegment = kind === "messages" ? (() => {
    if (!actorUserId) throw new Error("Message storage requires an actor user id");
    assertTrustedId(actorUserId, "actor user id");
    return `${actorUserId}/`;
  })() : "";

  return `tenants/${tenantId}/${kind}/${actorSegment}${generatedFileName}`;
}

/** Checks an existing server-issued key before attaching it to a record. */
export function isTenantObjectKeyForActor({
  tenantId,
  kind,
  key,
  actorUserId,
}: {
  tenantId: string;
  kind: TenantStorageKind;
  key: string;
  actorUserId?: string | null;
}): boolean {
  if (!validOpaqueId(tenantId) || !tenantStorageKinds.includes(kind)) return false;
  const actorSegment = kind === "messages" ? (actorUserId && validOpaqueId(actorUserId) ? `${actorUserId}/` : null) : "";
  if (actorSegment === null) return false;
  const prefix = `tenants/${tenantId}/${kind}/${actorSegment}`;
  return key.startsWith(prefix) && !key.slice(prefix.length).includes("/") && key.length > prefix.length;
}
