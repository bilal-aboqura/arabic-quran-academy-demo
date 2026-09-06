/** Platform administration is deliberately independent of tenant membership. */
export class PlatformAuthorizationError extends Error {
  constructor() {
    super("PLATFORM_ADMIN_REQUIRED");
  }
}

export type PlatformActor = {
  userId: string;
  administratorId: string;
};

export function requirePlatformAdministrator(actor: PlatformActor | null | undefined): asserts actor is PlatformActor {
  if (!actor) throw new PlatformAuthorizationError();
}
