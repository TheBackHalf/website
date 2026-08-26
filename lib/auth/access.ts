import type { Permission } from "@/lib/auth/permissions";
import { roleHasPermission } from "@/lib/auth/permissions";
import {
  DEFAULT_APP_ROLE,
  normalizeAppRole,
  type AppRole,
  type AssignableHumanRole,
  isAssignableHumanRole,
} from "@/lib/auth/roles";
import { getServerSession } from "@/lib/auth/session/server";
import { getAuthStore } from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";

export type AuthenticatedActor = {
  sessionSub: string;
  user: UserRecord;
  role: AppRole;
};

export class AccessDeniedError extends Error {
  readonly code: "unauthenticated" | "forbidden";

  constructor(code: "unauthenticated" | "forbidden", message: string) {
    super(message);
    this.name = "AccessDeniedError";
    this.code = code;
  }
}

/** Internal marker — never export to client bundles via public API routes as a grant. */
export const SYSTEM_CALL_MARKER = Symbol.for("thebackhalf.system.call");

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return roleHasPermission(role, permission);
}

export function getUserRole(user: UserRecord): AppRole {
  return normalizeAppRole(user.role);
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedActor> {
  const session = await getServerSession();
  if (!session) {
    throw new AccessDeniedError("unauthenticated", "Sign-in required.");
  }

  const user = await getAuthStore().findUserById(session.sub);
  if (!user) {
    throw new AccessDeniedError("unauthenticated", "Sign-in required.");
  }

  return {
    sessionSub: session.sub,
    user,
    role: getUserRole(user),
  };
}

export async function requirePermission(
  permission: Permission,
): Promise<AuthenticatedActor> {
  const actor = await requireAuthenticatedUser();

  if (!hasPermission(actor.role, permission)) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }

  return actor;
}

export async function requireRole(
  ...roles: AppRole[]
): Promise<AuthenticatedActor> {
  const actor = await requireAuthenticatedUser();

  if (!roles.includes(actor.role)) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }

  return actor;
}

/**
 * Architects may only act on their own user id.
 * Admin may act across accounts for authorized admin operations.
 * Support may read limited support views for other accounts but not mutate Architect profile data.
 */
export function assertSameArchitectOrAdmin(
  actor: AuthenticatedActor,
  targetUserId: string,
): void {
  if (actor.role === "admin") {
    return;
  }

  if (actor.sessionSub !== targetUserId) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }
}

export function assertCanAssignRole(
  actor: AuthenticatedActor,
  nextRole: unknown,
): asserts nextRole is AssignableHumanRole {
  if (!hasPermission(actor.role, "admin:roles:assign")) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }

  if (!isAssignableHumanRole(nextRole)) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }

  // Support cannot elevate through this path (support lacks admin:roles:assign).
  if (actor.role !== "admin") {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }
}

export function requireSystemCaller(marker: symbol): void {
  if (marker !== SYSTEM_CALL_MARKER) {
    throw new AccessDeniedError("forbidden", "Access denied.");
  }
}

export function resolveDefaultRegistrationRole(): AppRole {
  return DEFAULT_APP_ROLE;
}
