import { isHostedProduction, launchDashboardPostgresConfigured } from "@/lib/launch-dashboard/db";
import { emptyAvailability } from "@/lib/launch-dashboard/health";
import type { AvailabilityRecord, AvailabilityStatus } from "@/lib/launch-dashboard/types";

const RANK: Record<AvailabilityStatus, number> = {
  unavailable: 3,
  degraded: 2,
  available: 1,
  unreported: 0,
};

function configStatus(ok: boolean): AvailabilityStatus {
  if (ok) return "available";
  if (isHostedProduction()) return "degraded";
  return "unreported";
}

export function automatedAvailabilitySignals(): AvailabilityRecord[] {
  const now = new Date().toISOString();
  const postgres = launchDashboardPostgresConfigured();
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const auth = Boolean(process.env.AUTH_SECRET);

  return [
    {
      area: "website",
      status: "available",
      note: "AUTOMATED process probe: this application is serving the dashboard. Not synthetic uptime monitoring.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "registration",
      status: configStatus(auth),
      note: auth
        ? "AUTOMATED config probe: AUTH_SECRET present. Not a live registration ping."
        : "AUTOMATED config probe: AUTH_SECRET missing in this process.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "architect_access",
      status: configStatus(auth),
      note: auth
        ? "AUTOMATED config probe: AUTH_SECRET present. Not a live login ping."
        : "AUTOMATED config probe: AUTH_SECRET missing in this process.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "checkout",
      status: configStatus(stripe),
      note: stripe
        ? "AUTOMATED config probe: STRIPE_SECRET_KEY present. Not a live checkout ping."
        : "AUTOMATED config probe: STRIPE_SECRET_KEY missing in this process.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "payment",
      status: configStatus(stripe),
      note: stripe
        ? "AUTOMATED config probe: STRIPE_SECRET_KEY present. Not a live payment ping."
        : "AUTOMATED config probe: STRIPE_SECRET_KEY missing in this process.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "journey",
      status: configStatus(postgres || !isHostedProduction()),
      note: postgres
        ? "AUTOMATED config probe: durable Postgres configured for journey-adjacent stores. Not a live journey ping."
        : "AUTOMATED config probe: Postgres not configured in this process.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
    {
      area: "lumina",
      status: "unreported",
      note: "MANUAL / N/A: no safe automated Lumina health probe. Report outages with the availability flag.",
      updatedAt: now,
      updatedBy: "system",
      source: "automated",
    },
  ];
}

export function mergeAvailability(
  stored: AvailabilityRecord[],
): AvailabilityRecord[] {
  const automated = automatedAvailabilitySignals();
  const map = new Map(emptyAvailability().map((row) => [row.area, row]));
  for (const row of automated) {
    map.set(row.area, row);
  }
  for (const row of stored) {
    const current = map.get(row.area);
    if (!current) {
      map.set(row.area, { ...row, source: row.source ?? "manual" });
      continue;
    }
    const storedRank = RANK[row.status];
    const autoRank = RANK[current.status];
    if (row.status === "unreported") continue;
    if (storedRank >= autoRank) {
      map.set(row.area, {
        ...row,
        source: "manual",
        note: row.note
          ? `${row.note} (MANUAL flag; overrides automated config probe when more severe.)`
          : "MANUAL availability flag.",
      });
    }
  }
  return [...map.values()];
}
