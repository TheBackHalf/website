import {
  CAMPAIGN_START_DATE_ET,
  LAUNCH_DATE_ET,
  TIMEZONE,
} from "@/lib/marketing-kpi/attribution";

/** First instant after August 31, 2026 ET. */
export const CAMPAIGN_END_EXCLUSIVE_DATE_ET = "2026-09-01";
export { CAMPAIGN_START_DATE_ET, LAUNCH_DATE_ET };

export type ReportingPeriod =
  | "pre_launch_historical"
  | "launch_campaign"
  | "post_launch";

export type RecordClassification =
  | "historical"
  | "baseline"
  | "test"
  | "launch_eligible";

export const PERIOD_LABELS = {
  pre_launch_historical: "PRE-LAUNCH BASELINE / HISTORICAL",
  launch_campaign: "LAUNCH CAMPAIGN — AUGUST 28–31, 2026",
  post_launch: "POST-LAUNCH",
} as const;

export const HISTORICAL_EXCLUSION_LABEL =
  "PRE-LAUNCH / HISTORICAL — EXCLUDED FROM LAUNCH KPI";

function etParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const hourRaw = parts.hour === "24" ? "00" : parts.hour;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(hourRaw),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Convert an America/New_York wall time to a UTC instant. */
export function etWallTimeToUtc(dateEt: string, timeHms = "00:00:00"): Date {
  const [year, month, day] = dateEt.split("-").map(Number);
  const [hour, minute, second] = timeHms.split(":").map(Number);
  let utc = Date.UTC(year!, month! - 1, day!, 12, 0, 0);
  for (let i = 0; i < 8; i += 1) {
    const got = etParts(new Date(utc));
    const gotMs = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
    );
    const wantMs = Date.UTC(year!, month! - 1, day!, hour!, minute!, second!);
    const delta = wantMs - gotMs;
    if (delta === 0) return new Date(utc);
    utc += delta;
  }
  return new Date(utc);
}

export const CAMPAIGN_START_UTC = etWallTimeToUtc(
  CAMPAIGN_START_DATE_ET,
  "00:00:00",
);
export const CAMPAIGN_END_EXCLUSIVE_UTC = etWallTimeToUtc(
  CAMPAIGN_END_EXCLUSIVE_DATE_ET,
  "00:00:00",
);

export function reportingPeriodAt(iso: string): ReportingPeriod {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < CAMPAIGN_START_UTC.getTime()) {
    return "pre_launch_historical";
  }
  if (ms < CAMPAIGN_END_EXCLUSIVE_UTC.getTime()) {
    return "launch_campaign";
  }
  return "post_launch";
}

export function isLikelyTestPayment(input: {
  test?: boolean;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): boolean {
  if (input.test === true) return true;
  const session = input.stripeCheckoutSessionId ?? "";
  const intent = input.stripePaymentIntentId ?? "";
  return session.startsWith("cs_test_") || intent.startsWith("pi_test_");
}

export function classifyRecord(input: {
  createdAt: string;
  test?: boolean;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
}): { period: ReportingPeriod; classification: RecordClassification } {
  const period = reportingPeriodAt(input.createdAt);
  if (isLikelyTestPayment(input)) {
    return { period, classification: "test" };
  }
  if (period === "pre_launch_historical") {
    return { period, classification: "historical" };
  }
  return { period, classification: "launch_eligible" };
}

export function isLaunchCampaignRecord(input: {
  createdAt: string;
  dateEt?: string;
}): boolean {
  return reportingPeriodAt(input.createdAt) === "launch_campaign";
}

export function countsTowardLaunchKpi(input: {
  createdAt: string;
  test?: boolean;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  includeTest?: boolean;
}): boolean {
  const { period, classification } = classifyRecord(input);
  if (period !== "launch_campaign") return false;
  if (classification === "test") return input.includeTest === true;
  return classification === "launch_eligible";
}

export function campaignStartLabel(): string {
  return `${CAMPAIGN_START_DATE_ET} 12:00 AM ET`;
}
