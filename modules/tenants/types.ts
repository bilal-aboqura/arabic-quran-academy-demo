export type TenantDomainKind = "SUBDOMAIN" | "CUSTOM" | "DEVELOPMENT";

export type TenantRole = "OWNER" | "ADMIN" | "TEACHER" | "ASSISTANT" | "STUDENT";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  hostname: string;
  domainKind: TenantDomainKind;
};

export type TenantActor = TenantContext & {
  userId: string;
  membershipId: string;
  role: TenantRole;
};
