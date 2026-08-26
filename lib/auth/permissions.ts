import type { AppRole } from "@/lib/auth/roles";

/**
 * Least-privilege permission catalog for Launch Readiness Row 66.
 * SYSTEM is reserved for trusted server-side callers, not interactive UI.
 */
export const PERMISSIONS = [
  "architect:dashboard:access",
  "architect:profile:read_own",
  "architect:profile:update_own",
  "architect:consent:read_own",
  "architect:lumina_memory:manage_own",
  "admin:ops:access",
  "admin:accounts:list",
  "admin:roles:assign",
  "admin:billing:reconcile",
  "support:ops:access",
  "support:accounts:lookup",
  "system:internal:operate",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  architect: [
    "architect:dashboard:access",
    "architect:profile:read_own",
    "architect:profile:update_own",
    "architect:consent:read_own",
    "architect:lumina_memory:manage_own",
  ],
  support: [
    "support:ops:access",
    "support:accounts:lookup",
  ],
  admin: [
    "architect:dashboard:access",
    "architect:profile:read_own",
    "architect:profile:update_own",
    "architect:consent:read_own",
    "architect:lumina_memory:manage_own",
    "admin:ops:access",
    "admin:accounts:list",
    "admin:roles:assign",
    "admin:billing:reconcile",
    "support:ops:access",
    "support:accounts:lookup",
  ],
  system: ["system:internal:operate", "admin:billing:reconcile"],
};

export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: AppRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
