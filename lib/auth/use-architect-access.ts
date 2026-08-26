"use client";

import type { AppRole } from "@/lib/auth/roles";
import type { Permission } from "@/lib/auth/permissions";
import { roleHasPermission } from "@/lib/auth/permissions";

/**
 * Client-side capability helper for UI affordances only.
 * Server-side requirePermission/requireRole remain authoritative.
 */
export function useArchitectAccess(role: AppRole) {
  return {
    role,
    can: (permission: Permission) => roleHasPermission(role, permission),
    isArchitect: role === "architect",
    isAdmin: role === "admin",
    isSupport: role === "support",
  };
}
