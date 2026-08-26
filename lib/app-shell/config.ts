/**
 * Authenticated Architect application shell — navigation and route configuration.
 * @see lib/app-shell/integration-points.ts for downstream row boundaries
 */

export const architectAppBasePath = "/architect" as const;

export type ArchitectAppRouteKey =
  | "dashboard"
  | "journey"
  | "lumina"
  | "aiKimberly"
  | "resources"
  | "settings"
  | "billing";

export type ArchitectNavItem = {
  key: ArchitectAppRouteKey | "support";
  href: `/${string}`;
  /** Public support route — not under /architect */
  external?: boolean;
};

/** Primary authenticated navigation destinations. */
export const architectNavItems: readonly ArchitectNavItem[] = [
  { key: "dashboard", href: "/architect/dashboard" },
  { key: "journey", href: "/architect/journey" },
  { key: "lumina", href: "/architect/lumina" },
  { key: "aiKimberly", href: "/architect/ai-kimberly" },
  { key: "resources", href: "/architect/resources" },
  { key: "settings", href: "/architect/settings" },
  { key: "billing", href: "/architect/billing" },
  { key: "support", href: "/support", external: true },
] as const;

export const architectRoutePaths: Record<ArchitectAppRouteKey, string> = {
  dashboard: "/architect/dashboard",
  journey: "/architect/journey",
  lumina: "/architect/lumina",
  aiKimberly: "/architect/ai-kimberly",
  resources: "/architect/resources",
  settings: "/architect/settings",
  billing: "/architect/billing",
};
