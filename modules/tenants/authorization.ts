import type { TenantActor, TenantRole } from "@/modules/tenants/types";

export class TenantAuthorizationError extends Error {
  constructor(public readonly code: "TENANT_NOT_FOUND" | "MEMBERSHIP_REQUIRED" | "TENANT_FORBIDDEN") {
    super(code);
  }
}

export function requireTenantRole(role: TenantRole, allowed: readonly TenantRole[]): void {
  if (!allowed.includes(role)) {
    throw new TenantAuthorizationError("TENANT_FORBIDDEN");
  }
}

/**
 * Permissions belong to a membership, never to a browser-provided tenant ID
 * or the legacy global User.role. Keep this map as the sole policy source for
 * newly migrated tenant routes.
 */
export const TENANT_PERMISSION_ROLES = {
  MANAGE_TENANT: ["OWNER", "ADMIN"],
  MANAGE_SETTINGS: ["OWNER", "ADMIN"],
  MANAGE_WEBSITE: ["OWNER", "ADMIN", "TEACHER"],
  MANAGE_WALLET: ["OWNER", "ADMIN"],
  MANAGE_STAFF: ["OWNER", "ADMIN"],
  MANAGE_STUDENTS: ["OWNER", "ADMIN", "ASSISTANT"],
  MANAGE_COURSES: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  MANAGE_CATEGORIES: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  MANAGE_ACTIVATION_CODES: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  MANAGE_LIVE_STREAMS: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  REVIEW_ASSIGNMENTS: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  VIEW_TENANT_ANALYTICS: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER"],
  VIEW_COURSE_CONTENT: ["OWNER", "ADMIN", "ASSISTANT", "TEACHER", "STUDENT"],
} as const satisfies Record<string, readonly TenantRole[]>;

export type TenantPermission = keyof typeof TENANT_PERMISSION_ROLES;

export function canTenant(actor: Pick<TenantActor, "role">, permission: TenantPermission): boolean {
  return (TENANT_PERMISSION_ROLES[permission] as readonly TenantRole[]).includes(actor.role);
}

export function requireTenantPermission(actor: TenantActor, permission: TenantPermission): void {
  requireTenantRole(actor.role, TENANT_PERMISSION_ROLES[permission]);
}

export function canManageTenant(actor: TenantActor): boolean {
  return canTenant(actor, "MANAGE_TENANT");
}

export function canManageStudents(actor: TenantActor): boolean {
  return canTenant(actor, "MANAGE_STUDENTS");
}

/** Financial adjustments are intentionally stricter than student management. */
export function canManageWallet(actor: TenantActor): boolean {
  return canTenant(actor, "MANAGE_WALLET");
}

export function canManageCourse(actor: TenantActor): boolean {
  return canTenant(actor, "MANAGE_COURSES");
}

export function canReviewAssignments(actor: TenantActor): boolean {
  return canTenant(actor, "REVIEW_ASSIGNMENTS");
}

export function canViewTenantAnalytics(actor: TenantActor): boolean {
  return canTenant(actor, "VIEW_TENANT_ANALYTICS");
}

/** Resource repositories call this before returning or mutating owned data. */
export function assertResourceTenant(resourceTenantId: string, actorTenantId: string): void {
  if (resourceTenantId !== actorTenantId) {
    throw new TenantAuthorizationError("TENANT_FORBIDDEN");
  }
}
