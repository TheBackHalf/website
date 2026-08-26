import { normalizeEmail } from "@/lib/auth/normalize-email";

export const APP_ROLES = ["architect", "admin", "support", "system"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Roles that may be held by interactive human accounts. */
export const ASSIGNABLE_HUMAN_ROLES = ["architect", "admin", "support"] as const;

export type AssignableHumanRole = (typeof ASSIGNABLE_HUMAN_ROLES)[number];

export const DEFAULT_APP_ROLE: AppRole = "architect";

export function isAppRole(value: unknown): value is AppRole {
  return (
    typeof value === "string" &&
    (APP_ROLES as readonly string[]).includes(value)
  );
}

export function isAssignableHumanRole(
  value: unknown,
): value is AssignableHumanRole {
  return (
    typeof value === "string" &&
    (ASSIGNABLE_HUMAN_ROLES as readonly string[]).includes(value)
  );
}

export function normalizeAppRole(value: unknown): AppRole {
  return isAppRole(value) ? value : DEFAULT_APP_ROLE;
}

function parseEmailList(raw: string | undefined): Set<string> {
  if (!raw?.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => normalizeEmail(entry.trim()))
      .filter(Boolean),
  );
}

/**
 * Trusted server-side privileged-role configuration.
 * Admin list wins if an email appears in both lists.
 * System is never granted through configuration.
 */
export function getConfiguredRoleForEmail(
  email: string,
): AssignableHumanRole | undefined {
  const normalized = normalizeEmail(email);
  const adminEmails = parseEmailList(process.env.BH_ADMIN_EMAILS);
  const supportEmails = parseEmailList(process.env.BH_SUPPORT_EMAILS);

  if (adminEmails.has(normalized)) {
    return "admin";
  }

  if (supportEmails.has(normalized)) {
    return "support";
  }

  return undefined;
}

export function roleLabelKey(
  role: AppRole,
): "roleArchitect" | "roleAdmin" | "roleSupport" | "roleSystem" {
  switch (role) {
    case "admin":
      return "roleAdmin";
    case "support":
      return "roleSupport";
    case "system":
      return "roleSystem";
    default:
      return "roleArchitect";
  }
}
