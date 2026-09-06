import { describe, expect, it } from "vitest";
import {
  canManageCourse,
  canManageStudents,
  canManageTenant,
  canReviewAssignments,
  canViewTenantAnalytics,
  requireTenantPermission,
  TenantAuthorizationError,
} from "@/modules/tenants/authorization";
import type { TenantActor } from "@/modules/tenants/types";

function actor(role: TenantActor["role"]): TenantActor {
  return { tenantId: "tenant-a", tenantSlug: "a", hostname: "a.nexaclass.app", domainKind: "SUBDOMAIN", userId: "u", membershipId: "m", role };
}

describe("tenant membership permissions", () => {
  it("grants tenant administration only to owners and admins", () => {
    expect(canManageTenant(actor("OWNER"))).toBe(true);
    expect(canManageTenant(actor("ADMIN"))).toBe(true);
    expect(canManageTenant(actor("TEACHER"))).toBe(false);
  });

  it("keeps students from staff capabilities", () => {
    const student = actor("STUDENT");
    expect(canManageCourse(student)).toBe(false);
    expect(canManageStudents(student)).toBe(false);
    expect(canReviewAssignments(student)).toBe(false);
    expect(canViewTenantAnalytics(student)).toBe(false);
    expect(() => requireTenantPermission(student, "MANAGE_COURSES")).toThrow(TenantAuthorizationError);
  });

  it("allows a teacher to manage learning work but not tenant administration", () => {
    const teacher = actor("TEACHER");
    expect(canManageCourse(teacher)).toBe(true);
    expect(canReviewAssignments(teacher)).toBe(true);
    expect(canManageTenant(teacher)).toBe(false);
  });
});
