import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dateEt, LAUNCH_CHANNELS } from "@/lib/marketing-kpi/attribution";
import type { NullableCount } from "@/lib/marketing-kpi/types";

export type BaselineCell = {
  value: NullableCount;
  status:
    | "captured"
    | "Baseline = 0 — New Channel/Metric"
    | "Baseline unavailable — no reliable historical data";
  source: string;
  baselineDate: string;
  retrievedAt: string;
};

export type KpiBaseline = {
  baselineDate: string;
  retrievedAt: string;
  timezone: "America/New_York";
  channels: Record<
    "instagram" | "linkedin" | "tiktok",
    {
      followers: BaselineCell;
      reach: BaselineCell;
      impressions: BaselineCell;
      engagements: BaselineCell;
    }
  >;
  websiteTraffic: BaselineCell;
  registrationPageTraffic: BaselineCell;
  checkoutStarts: BaselineCell;
  purchases: BaselineCell;
  notes: string[];
};

export const BASELINE_PATH = "ops/fab-5/marketing-kpi/baseline.json";

const unavailable = (
  source: string,
  baselineDate: string,
  retrievedAt: string,
): BaselineCell => ({
  value: null,
  status: "Baseline unavailable — no reliable historical data",
  source,
  baselineDate,
  retrievedAt,
});

const zeroNew = (
  source: string,
  baselineDate: string,
  retrievedAt: string,
): BaselineCell => ({
  value: 0,
  status: "Baseline = 0 — New Channel/Metric",
  source,
  baselineDate,
  retrievedAt,
});

async function countPaidPurchases(): Promise<number> {
  try {
    const raw = await readFile(".data/billing/database.json", "utf8");
    const database = JSON.parse(raw) as {
      purchases?: Array<{ status?: string }>;
    };
    return (database.purchases ?? []).filter((purchase) => purchase.status === "paid").length;
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return 0;
    throw error;
  }
}

async function socialAccountsExist(): Promise<boolean> {
  try {
    const raw = await readFile("ops/fab-5/social-channels.json", "utf8");
    const parsed = JSON.parse(raw) as {
      channels?: Record<string, { accountExists?: boolean }>;
    };
    return Object.values(parsed.channels ?? {}).some((channel) => channel.accountExists);
  } catch {
    return false;
  }
}

export async function captureBaseline(now = new Date()): Promise<KpiBaseline> {
  const retrievedAt = now.toISOString();
  const baselineDate = dateEt(retrievedAt);
  const accountsLive = await socialAccountsExist();
  const paidPurchases = await countPaidPurchases();

  const socialCell = (metric: string): BaselineCell => {
    if (!accountsLive) {
      return metric === "followers"
        ? zeroNew(
            "ops/fab-5/social-channels.json accountExists=false",
            baselineDate,
            retrievedAt,
          )
        : unavailable(
            "Official social accounts are not live; native analytics do not exist",
            baselineDate,
            retrievedAt,
          );
    }
    return unavailable(
      "Accounts exist but no native analytics export is connected",
      baselineDate,
      retrievedAt,
    );
  };

  const baseline: KpiBaseline = {
    baselineDate,
    retrievedAt,
    timezone: "America/New_York",
    channels: {
      instagram: {
        followers: socialCell("followers"),
        reach: socialCell("reach"),
        impressions: socialCell("impressions"),
        engagements: socialCell("engagements"),
      },
      linkedin: {
        followers: socialCell("followers"),
        reach: socialCell("reach"),
        impressions: socialCell("impressions"),
        engagements: socialCell("engagements"),
      },
      tiktok: {
        followers: socialCell("followers"),
        reach: socialCell("reach"),
        impressions: socialCell("impressions"),
        engagements: socialCell("engagements"),
      },
    },
    websiteTraffic: unavailable(
      "No first-party or GA4 historical traffic ledger existed before Row 84",
      baselineDate,
      retrievedAt,
    ),
    registrationPageTraffic: zeroNew(
      "First-party marketing KPI ledger starts with Row 84",
      baselineDate,
      retrievedAt,
    ),
    checkoutStarts: zeroNew(
      "Marketing KPI checkout_start events start with Row 84",
      baselineDate,
      retrievedAt,
    ),
    purchases: {
      value: paidPurchases,
      status: paidPurchases === 0
        ? "Baseline = 0 — New Channel/Metric"
        : "captured",
      source: "local billing ledger paid purchases captured 2026-08-19; PRE-LAUNCH / HISTORICAL — EXCLUDED FROM LAUNCH KPI",
      baselineDate,
      retrievedAt,
    },
    notes: [
      "Captured before August 28, 2026 campaign activity.",
      "The 19 paid purchases in this baseline are PRE-LAUNCH / HISTORICAL — EXCLUDED FROM LAUNCH KPI. They are not August 28–31 campaign purchases, launch-day purchases, launch revenue, or launch conversion.",
      "Launch measurement begins 2026-08-28 12:00 AM ET at 0 launch purchases / $0 launch revenue.",
      "Do not replace with estimates. If a later export of native analytics becomes available for a date before 2026-08-28, append a new baseline version rather than silently overwriting.",
      `Official channels live at capture: ${accountsLive ? "yes" : "no"}.`,
    ],
  };

  await mkdir("ops/fab-5/marketing-kpi", { recursive: true });
  await writeFile(BASELINE_PATH, JSON.stringify(baseline, null, 2) + "\n", "utf8");
  return baseline;
}

export async function loadBaseline(): Promise<KpiBaseline> {
  const raw = await readFile(BASELINE_PATH, "utf8");
  return JSON.parse(raw) as KpiBaseline;
}
