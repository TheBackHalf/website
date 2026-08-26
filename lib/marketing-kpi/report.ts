import {
  formatCount,
  formatRate,
  type LaunchKpiDashboardModel,
} from "@/lib/marketing-kpi/aggregate";
import { HISTORICAL_EXCLUSION_LABEL } from "@/lib/marketing-kpi/period";

export type DailyLaunchReport = {
  dateEt: string;
  label: string;
  executiveSummary: string;
  topLine: Record<string, string>;
  channelPerformance: Array<Record<string, string>>;
  conversionFunnel: Record<string, string>;
  purchases: string;
  bestPerformingContent: string;
  notableChangeFromBaseline: string;
  issues: string[];
  actionOrEscalation: string;
  markdown: string;
};

export function buildDailyLaunchReport(
  model: LaunchKpiDashboardModel,
  dateEt: string,
): DailyLaunchReport {
  const day = model.days.find((entry) => entry.dateEt === dateEt);
  if (!day) {
    const markdown = `# Daily launch report — ${dateEt}\n\nNo reporting row exists for this date.\n`;
    return {
      dateEt,
      label: dateEt,
      executiveSummary: "No reporting row for this date.",
      topLine: {},
      channelPerformance: [],
      conversionFunnel: {},
      purchases: "N/A",
      bestPerformingContent: "N/A",
      notableChangeFromBaseline: "N/A",
      issues: ["Invalid or out-of-window date"],
      actionOrEscalation: "None — date not in launch reporting window.",
      markdown,
    };
  }

  const t = day.totals;
  const issues = day.issues.map((issue) => `${issue.severity.toUpperCase()}: ${issue.message}`);
  const historicalPurchases = model.periods.preLaunchHistorical.purchases;
  const bestAsset = [...model.assets]
    .filter((asset) => asset.dateEt === dateEt)
    .sort(
      (a, b) =>
        b.landingPageSessions + b.purchases * 100 - (a.landingPageSessions + a.purchases * 100),
    )[0];

  const executiveSummary = [
    `${day.label}.`,
    `Landing-page sessions ${t.landingPageSessions}.`,
    `Checkout starts ${t.checkoutStarts}.`,
    `Purchases ${t.purchases}.`,
    `Purchase conversion (purchases ÷ landing-page sessions): ${formatRate(t.rates.purchaseConversion)}.`,
  ].join(" ");

  const topLine = {
    reach: formatCount(t.reach),
    impressions: formatCount(t.impressions),
    engagements: formatCount(t.engagements),
    engagementRate: formatRate(t.engagementRate),
    followerGrowth: formatCount(t.followerGrowth),
    linkClicks: formatCount(t.linkClicks),
    landingPageSessions: String(t.landingPageSessions),
    emailSignups: model.emailSignups.status,
    checkoutStarts: String(t.checkoutStarts),
    purchases: String(t.purchases),
    purchaseConversion: `${formatRate(t.rates.purchaseConversion)} (denominator: landing-page sessions)`,
  };

  const channelPerformance = day.channels.map((channel) => ({
    channel: String(channel.channel),
    reach: formatCount(channel.reach),
    impressions: formatCount(channel.impressions),
    engagements: formatCount(channel.engagements),
    linkClicks: formatCount(channel.linkClicks),
    landingPageSessions: String(channel.landingPageSessions),
    checkoutStarts: String(channel.checkoutStarts),
    purchases: String(channel.purchases),
    purchaseConversion: formatRate(channel.rates.purchaseConversion),
  }));

  const conversionFunnel = {
    "REACH →": formatCount(t.reach),
    "ENGAGEMENT →": formatCount(t.engagements),
    "LINK CLICK →": formatCount(t.linkClicks),
    "LANDING-PAGE SESSION →": String(t.landingPageSessions),
    "CHECKOUT START →": String(t.checkoutStarts),
    PURCHASE: String(t.purchases),
    clickThroughRate: `${formatRate(t.rates.clickThroughRate)} (link clicks ÷ impressions)`,
    landingContinuation: `${formatRate(t.rates.landingContinuation)} (landing-page sessions ÷ link clicks)`,
    checkoutStartRate: `${formatRate(t.rates.checkoutStartRate)} (checkout starts ÷ landing-page sessions)`,
    purchaseConversion: `${formatRate(t.rates.purchaseConversion)} (purchases ÷ landing-page sessions)`,
    checkoutCompletion: `${formatRate(t.rates.checkoutCompletion)} (purchases ÷ checkout starts)`,
  };

  const notableChangeFromBaseline = [
    `Purchases vs baseline: ${day.vsBaseline.purchases ?? "N/A"}.`,
    `Follower growth vs baseline: ${formatCount(day.vsBaseline.followerGrowth)}.`,
    day.vsPriorDay.landingPageSessions === null
      ? "No prior day in window."
      : `Landing-page sessions vs prior day: ${day.vsPriorDay.landingPageSessions}.`,
  ].join(" ");

  const actionOrEscalation = issues.some((line) => line.startsWith("ERROR"))
    ? "Escalate to Michelle — data-quality error on this report."
    : issues.length
      ? "Nia enters missing native analytics; Michelle verifies."
      : "None.";

  const bestPerformingContent = bestAsset
    ? `${bestAsset.assetId} (${bestAsset.channel === "linkedin" ? "LinkedIn" : bestAsset.channel === "instagram" ? "Instagram" : bestAsset.channel === "tiktok" ? "TikTok" : bestAsset.channel}) — ${bestAsset.landingPageSessions} attributed registration sessions, ${bestAsset.purchases} purchases. Native link clicks for that day/channel: ${formatCount(bestAsset.socialLinkClicks)}. Asset-level social engagement is N/A unless native analytics are entered at post level (not currently available).`
    : "No attributed asset activity.";

  const markdown = [
    `# Daily launch report — ${day.dateEt}`,
    "",
    `**${day.label}**`,
    "",
    "## Executive summary",
    executiveSummary,
    "",
    "## Top-line KPIs",
    ...Object.entries(topLine).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Channel performance",
    ...channelPerformance.map(
      (row) =>
        `- ${row.channel}: reach ${row.reach}; impressions ${row.impressions}; engagements ${row.engagements}; link clicks ${row.linkClicks}; landing sessions ${row.landingPageSessions}; checkout starts ${row.checkoutStarts}; purchases ${row.purchases}; purchase conversion ${row.purchaseConversion}`,
    ),
    "",
    "## Conversion funnel",
    ...Object.entries(conversionFunnel).map(([key, value]) => `- ${key} ${value}`),
    "",
    "## Purchases",
    `${t.purchases} launch-campaign purchases on ${day.dateEt} (purchase conversion ${formatRate(t.rates.purchaseConversion)}; denominator = landing-page sessions).`,
    `${HISTORICAL_EXCLUSION_LABEL}: ${historicalPurchases} historical paid purchases are excluded from daily launch purchases, daily launch revenue, and campaign conversion.`,
    "",
    "## Best-performing content",
    bestPerformingContent,
    "",
    "## Notable change from baseline",
    notableChangeFromBaseline,
    "",
    "## Issues / data gaps",
    ...(issues.length ? issues.map((issue) => `- ${issue}`) : ["- None"]),
    "",
    "## Action or escalation required",
    actionOrEscalation,
    "",
    `_Generated from the Launch Marketing KPI Dashboard. Last updated ${model.lastUpdatedAt}._`,
    "",
  ].join("\n");

  return {
    dateEt: day.dateEt,
    label: day.label,
    executiveSummary,
    topLine,
    channelPerformance,
    conversionFunnel,
    purchases: String(t.purchases),
    bestPerformingContent,
    notableChangeFromBaseline,
    issues: issues.length ? issues : ["None"],
    actionOrEscalation,
    markdown,
  };
}
