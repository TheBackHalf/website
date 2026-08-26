export const CANONICAL_PRODUCTION_ORIGIN = "https://thebackhalf.org";
export const WWW_PRODUCTION_ORIGIN = "https://www.thebackhalf.org";
/** Established public Vercel production host used by hosted Fab 5 validation. */
export const ACTIVE_VERCEL_PRODUCTION_ORIGIN =
  "https://website-two-psi-49.vercel.app";

export const MONITORING_OWNERS = {
  technical: "Imani Heartbeat — Chief Technology & Risk Officer",
  operations: "Michelle Northstar — Chief of Staff & Operations Officer",
} as const;

export const UPTIME_PATHS = [
  { id: "homepage", path: "/", area: "website" as const, acceptRedirect: false },
  {
    id: "registration",
    path: "/register",
    area: "registration" as const,
    acceptRedirect: false,
  },
  {
    id: "login",
    path: "/login",
    area: "architect_access" as const,
    acceptRedirect: true,
  },
  {
    id: "checkout",
    path: "/checkout",
    area: "checkout" as const,
    acceptRedirect: true,
  },
  {
    id: "health",
    path: "/api/ops/health",
    area: "website" as const,
    acceptRedirect: false,
  },
] as const;

export const REGRESSION_PATHS = [
  "/es",
  "/es/register",
  "/es/login",
  "/es/checkout",
  "/journey",
  "/lumina",
  "/support",
] as const;

export const MISSING_PATH = "/row61-monitoring-missing-path";
export const SNAPSHOT_META_KEY = "row61_monitoring";
export const DB_PING_META_KEY = "row61_db_ping";
export const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

export function productionCandidateOrigins(): string[] {
  const extras = [
    process.env.ROW61_PRODUCTION_ORIGIN,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
      : undefined,
  ]
    .map((value) => value?.trim().replace(/\/$/, ""))
    .filter((value): value is string => typeof value === "string" && value.length > 0 && !value.includes("localhost"));

  return [
    ...new Set([
      CANONICAL_PRODUCTION_ORIGIN,
      WWW_PRODUCTION_ORIGIN,
      ...extras,
      ACTIVE_VERCEL_PRODUCTION_ORIGIN,
    ]),
  ];
}
