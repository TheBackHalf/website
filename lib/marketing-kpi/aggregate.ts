import {
  ACTIVE_LAUNCH_CHANNELS,
  CAMPAIGN_START_DATE_ET,
  LAUNCH_CHANNELS,
  LAUNCH_DATE_ET,
  ROW_81_ASSETS,
  channelFromAttribution,
  dateEt,
  isActiveLaunchChannel,
  isLaunchChannel,
  type ActiveLaunchChannel,
  type LaunchChannel,
} from "@/lib/marketing-kpi/attribution";
import { loadBaseline, type KpiBaseline } from "@/lib/marketing-kpi/baseline";
import { ensureKpiPurchaseMigration } from "@/lib/marketing-kpi/migrate";
import {
  CAMPAIGN_END_EXCLUSIVE_UTC,
  CAMPAIGN_START_UTC,
  PERIOD_LABELS,
  campaignStartLabel,
  countsTowardLaunchKpi,
  reportingPeriodAt,
  type ReportingPeriod,
} from "@/lib/marketing-kpi/period";
import {
  getMarketingKpiDurability,
  getMarketingKpiStore,
} from "@/lib/marketing-kpi/store";
import type {
  AssetKpiSlice,
  ChannelKpiSlice,
  DailyKpiSlice,
  DataQualityIssue,
  FunnelRates,
  KpiDurabilityBackend,
  MarketingEventRecord,
  MarketingPurchaseRecord,
  NullableCount,
  SocialDailyRecord,
} from "@/lib/marketing-kpi/types";

function sumNullable(values: NullableCount[]): NullableCount {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

function rate(numerator: number, denominator: NullableCount): number | null {
  if (denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

function funnelRates(input: {
  impressions: NullableCount;
  linkClicks: NullableCount;
  landingPageSessions: number;
  checkoutStarts: number;
  purchases: number;
}): FunnelRates {
  const purchaseConversion = rate(input.purchases, input.landingPageSessions);
  return {
    clickThroughRate:
      input.linkClicks === null ? null : rate(input.linkClicks, input.impressions),
    landingContinuation: rate(input.landingPageSessions, input.linkClicks),
    checkoutStartRate: rate(input.checkoutStarts, input.landingPageSessions),
    purchaseConversion,
    checkoutCompletion: rate(input.purchases, input.checkoutStarts),
    overallLaunchConversion: purchaseConversion,
    overallLaunchConversionDenominator: "landing_page_sessions",
  };
}

function emptyChannel(channel: ChannelKpiSlice["channel"]): ChannelKpiSlice {
  const rates = funnelRates({
    impressions: null,
    linkClicks: null,
    landingPageSessions: 0,
    checkoutStarts: 0,
    purchases: 0,
  });
  return {
    channel,
    reach: null,
    impressions: null,
    engagements: null,
    engagementRate: null,
    followers: null,
    followerGrowth: null,
    linkClicks: null,
    landingPageSessions: 0,
    checkoutStarts: 0,
    purchases: 0,
    conversionRate: null,
    conversionDenominator: "landing_page_sessions",
    rates,
    availabilityNotes: [],
  };
}

function applySocial(
  slice: ChannelKpiSlice,
  social: SocialDailyRecord[] | SocialDailyRecord | undefined,
  baselineFollowers: NullableCount,
): ChannelKpiSlice {
  const rows = Array.isArray(social) ? social : social ? [social] : [];
  if (rows.length === 0) {
    if (slice.channel === "linkedin") {
      slice.availabilityNotes.push(
        "N/A — LinkedIn is a future enhancement and is not required for launch reporting",
      );
    } else if (isActiveLaunchChannel(String(slice.channel))) {
      slice.availabilityNotes.push("N/A — Not Available From Source (not yet entered)");
    }
    return slice;
  }

  slice.reach = sumNullable(rows.map((row) => row.reach));
  slice.impressions = sumNullable(rows.map((row) => row.impressions));
  slice.engagements = sumNullable(rows.map((row) => row.engagements));
  slice.linkClicks = sumNullable(rows.map((row) => row.linkClicks));
  const followerValues = rows
    .map((row) => row.followers)
    .filter((value): value is number => value !== null);
  slice.followers = followerValues.length ? followerValues[followerValues.length - 1]! : null;
  slice.followerGrowth =
    slice.followers === null || baselineFollowers === null
      ? sumNullable(rows.map((row) => row.followerGrowth))
      : slice.followers - baselineFollowers;
  slice.engagementRate = rate(slice.engagements ?? 0, slice.impressions);
  return slice;
}

function applyEvents(
  slice: ChannelKpiSlice,
  events: MarketingEventRecord[],
): ChannelKpiSlice {
  slice.landingPageSessions = events.filter((event) => event.name === "landing_page_session").length;
  slice.checkoutStarts = events.filter((event) => event.name === "checkout_start").length;
  slice.purchases = events.filter((event) => event.name === "purchase").length;
  slice.rates = funnelRates(slice);
  slice.conversionRate = slice.rates.purchaseConversion;
  return slice;
}

function qualityIssues(input: {
  dateEt?: string;
  slice: ChannelKpiSlice;
  events: MarketingEventRecord[];
  socialMissing: boolean;
}): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const numericFields: Array<[string, NullableCount]> = [
    ["reach", input.slice.reach],
    ["impressions", input.slice.impressions],
    ["engagements", input.slice.engagements],
    ["followers", input.slice.followers],
    ["followerGrowth", input.slice.followerGrowth],
    ["linkClicks", input.slice.linkClicks],
  ];
  for (const [name, value] of numericFields) {
    if (typeof value === "number" && value < 0) {
      issues.push({
        code: "negative_count",
        severity: "error",
        message: `${input.slice.channel} ${name} is negative.`,
      });
    }
  }

  const rates: Array<[string, number | null]> = [
    ["engagementRate", input.slice.engagementRate],
    ["clickThroughRate", input.slice.rates.clickThroughRate],
    ["checkoutStartRate", input.slice.rates.checkoutStartRate],
    ["purchaseConversion", input.slice.rates.purchaseConversion],
    ["checkoutCompletion", input.slice.rates.checkoutCompletion],
  ];
  for (const [name, value] of rates) {
    if (value !== null && (value < 0 || value > 5)) {
      issues.push({
        code: "rate_out_of_range",
        severity: "warning",
        message: `${input.slice.channel} ${name} is ${value.toFixed(2)} — outside a plausible 0–500% range.`,
      });
    }
  }

  for (const event of input.events) {
    if (event.name === "purchase" && (event.attribution.source === "unknown" || !event.attribution.source)) {
      issues.push({
        code: "purchase_unattributed",
        severity: "warning",
        message: `Purchase ${event.id} is Direct / Organic / Unknown — not forced to a channel.`,
      });
    }
    if (
      event.attribution.campaign === "unknown" &&
      event.attribution.source !== "direct" &&
      event.attribution.source !== "unknown"
    ) {
      issues.push({
        code: "broken_attribution",
        severity: "warning",
        message: `Event ${event.id} has a source but an unknown campaign.`,
      });
    }
  }

  if (input.socialMissing && input.dateEt && input.dateEt <= dateEt()) {
    const inWindow = input.dateEt >= CAMPAIGN_START_DATE_ET;
    if (inWindow && isActiveLaunchChannel(String(input.slice.channel))) {
      issues.push({
        code: "missing_daily_social",
        severity: "warning",
        message: `${input.slice.channel} native analytics not entered for ${input.dateEt}.`,
      });
    }
  }

  return issues;
}

function dayLabel(day: string): string {
  if (day === "2026-08-28") return "THE QUESTION — Day 1";
  if (day === "2026-08-29") return "THE QUESTION — Day 2";
  if (day === "2026-08-30") return "THE QUESTION — Day 3";
  if (day === LAUNCH_DATE_ET) return "LAUNCH DAY";
  return day;
}

function addDays(yyyyMmDd: string, days: number): string {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().slice(0, 10);
}

export function reportingDates(throughEt = dateEt()): string[] {
  const dates: string[] = [];
  let cursor = CAMPAIGN_START_DATE_ET;
  const end = throughEt < CAMPAIGN_START_DATE_ET ? CAMPAIGN_START_DATE_ET : throughEt;
  const last = end < LAUNCH_DATE_ET ? LAUNCH_DATE_ET : end;
  while (cursor <= last) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    if (dates.length > 45) break;
  }
  return dates;
}

function productionEvents(events: MarketingEventRecord[], includeTest: boolean) {
  return includeTest ? events : events.filter((event) => !event.test && event.classification !== "test");
}

function launchWindowEvents(
  events: MarketingEventRecord[],
  includeTest: boolean,
): MarketingEventRecord[] {
  return productionEvents(events, includeTest).filter((event) =>
    countsTowardLaunchKpi({
      createdAt: event.createdAt,
      test: event.test || event.classification === "test",
      stripeCheckoutSessionId: event.stripeCheckoutSessionId,
      stripePaymentIntentId: event.stripePaymentIntentId,
      includeTest,
    }),
  );
}

function revenueCentsFor(
  events: MarketingEventRecord[],
  purchases: MarketingPurchaseRecord[],
  includeTest: boolean,
  period: ReportingPeriod,
): number {
  const eligiblePurchases = purchases.filter((purchase) => {
    if (purchase.status !== "paid") return false;
    if (purchase.period !== period) return false;
    if (!includeTest && (purchase.test || purchase.classification === "test")) {
      return false;
    }
    return true;
  });
  const fromLedger = eligiblePurchases.reduce(
    (total, purchase) => total + (purchase.amountCents ?? 0),
    0,
  );
  if (fromLedger > 0) return fromLedger;
  return events
    .filter(
      (event) =>
        event.name === "purchase" && reportingPeriodAt(event.createdAt) === period,
    )
    .reduce((total, event) => total + (event.amountCents ?? 0), 0);
}

function eventsForChannel(
  events: MarketingEventRecord[],
  channel: ChannelKpiSlice["channel"],
) {
  if (channel === "all") return events;
  return events.filter((event) => channelFromAttribution(event.attribution) === channel);
}

function buildSlice(
  channel: ChannelKpiSlice["channel"],
  events: MarketingEventRecord[],
  social: SocialDailyRecord[],
  baseline: KpiBaseline,
): ChannelKpiSlice {
  const slice = emptyChannel(channel);
  const channelEvents = eventsForChannel(events, channel);
  applyEvents(slice, channelEvents);
  if (isLaunchChannel(String(channel))) {
    const launchChannel = channel as LaunchChannel;
    applySocial(
      slice,
      social.filter((row) => row.channel === launchChannel),
      baseline.channels[launchChannel]?.followers.value ?? null,
    );
  }
  return slice;
}

export type PeriodKpiSlice = {
  period: ReportingPeriod;
  label: string;
  purchases: number;
  revenueCents: number;
  landingPageSessions: number;
  checkoutStarts: number;
  excludedFromLaunchKpi: boolean;
};

export type LaunchKpiDashboardModel = {
  lastUpdatedAt: string;
  dataFreshness: {
    websiteEvents: string;
    socialManual: string;
    stripePurchases: string;
  };
  reportingBoundary: {
    timezone: "America/New_York";
    campaignStartEt: string;
    campaignStartUtc: string;
    launchDayEt: string;
    campaignEndExclusiveUtc: string;
    launchStartPurchases: 0;
    launchStartRevenueCents: 0;
  };
  durability: {
    backend: KpiDurabilityBackend;
    productionSourceOfTruth: string;
    dataDirIsSourceOfTruth: false;
  };
  activeLaunchChannels: readonly ActiveLaunchChannel[];
  linkedinRequiredForLaunch: false;
  periods: {
    preLaunchHistorical: PeriodKpiSlice;
    launchCampaign: PeriodKpiSlice;
    postLaunch: PeriodKpiSlice;
  };
  baseline: KpiBaseline;
  includeTest: boolean;
  totals: ChannelKpiSlice;
  channels: ChannelKpiSlice[];
  days: DailyKpiSlice[];
  assets: AssetKpiSlice[];
  emailSignups: {
    status: "N/A — No Separate Launch Email Signup Mechanism";
    reason: string;
  };
  issues: DataQualityIssue[];
  funnel: {
    reach: NullableCount;
    engagements: NullableCount;
    linkClicks: NullableCount;
    landingPageSessions: number;
    checkoutStarts: number;
    purchases: number;
    revenueCents: number;
    rates: FunnelRates;
  };
};

export async function buildLaunchKpiDashboard(input?: {
  includeTest?: boolean;
}): Promise<LaunchKpiDashboardModel> {
  const includeTest = input?.includeTest ?? false;
  await ensureKpiPurchaseMigration();
  const [database, baseline] = await Promise.all([
    getMarketingKpiStore().read(),
    loadBaseline(),
  ]);
  const events = launchWindowEvents(database.events, includeTest);
  const allVisibleEvents = productionEvents(database.events, includeTest);
  const social = database.socialDaily.filter((row) => row.dateEt >= CAMPAIGN_START_DATE_ET);
  const dates = reportingDates();

  const totals = buildSlice("all", events, social, baseline);
  const channels: ChannelKpiSlice[] = [
    ...LAUNCH_CHANNELS.map((channel) => buildSlice(channel, events, social, baseline)),
    buildSlice("direct", events, [], baseline),
    buildSlice("unknown", events, [], baseline),
  ];

  const days: DailyKpiSlice[] = dates.map((day, index) => {
    const dayEvents = events.filter((event) => event.dateEt === day);
    const daySocial = social.filter((row) => row.dateEt === day);
    const dayTotals = buildSlice("all", dayEvents, daySocial, baseline);
    const dayChannels = LAUNCH_CHANNELS.map((channel) =>
      buildSlice(channel, dayEvents, daySocial, baseline),
    );
    const issues = dayChannels.flatMap((slice) =>
      qualityIssues({
        dateEt: day,
        slice,
        events: eventsForChannel(dayEvents, slice.channel),
        socialMissing:
          isActiveLaunchChannel(String(slice.channel)) &&
          !daySocial.some((row) => row.channel === slice.channel),
      }),
    );

    const prior = index > 0 ? daysPrototypePrior(dates[index - 1]!, events, social, baseline) : null;

    return {
      dateEt: day,
      label: dayLabel(day),
      channels: dayChannels,
      totals: dayTotals,
      vsPriorDay: {
        landingPageSessions: prior
          ? dayTotals.landingPageSessions - prior.landingPageSessions
          : null,
        purchases: prior ? dayTotals.purchases - prior.purchases : null,
        engagements:
          prior && dayTotals.engagements !== null && prior.engagements !== null
            ? dayTotals.engagements - prior.engagements
            : null,
      },
      vsBaseline: {
        followerGrowth: dayTotals.followerGrowth,
        purchases: dayTotals.purchases,
      },
      issues,
    };
  });

  const assets: AssetKpiSlice[] = ROW_81_ASSETS.map((asset) => {
    const assetEvents = events.filter(
      (event) => event.attribution.content === asset.assetId,
    );
    const socialForDay = social.find(
      (row) => row.dateEt === asset.dateEt && row.channel === asset.channel,
    );
    return {
      assetId: asset.assetId,
      channel: asset.channel,
      dateEt: asset.dateEt,
      label: asset.label,
      landingPageSessions: assetEvents.filter((event) => event.name === "landing_page_session").length,
      checkoutStarts: assetEvents.filter((event) => event.name === "checkout_start").length,
      purchases: assetEvents.filter((event) => event.name === "purchase").length,
      socialLinkClicks: socialForDay?.linkClicks ?? null,
    };
  });

  const issues: DataQualityIssue[] = [
    ...channels.flatMap((slice) =>
      qualityIssues({
        slice,
        events: eventsForChannel(events, slice.channel),
        socialMissing: false,
      }),
    ),
    ...days.flatMap((day) => day.issues),
  ];

  const summedLanding = channels
    .filter((slice) => slice.channel !== "all")
    .reduce((total, slice) => total + slice.landingPageSessions, 0);
  if (summedLanding !== totals.landingPageSessions) {
    issues.push({
      code: "total_mismatch",
      severity: "error",
      message: `Landing-page session total ${totals.landingPageSessions} does not equal channel sum ${summedLanding}.`,
    });
  }

  const lastEvent = events
    .map((event) => event.createdAt)
    .sort()
    .at(-1);
  const lastSocial = social
    .map((row) => row.enteredAt)
    .sort()
    .at(-1);

  const historicalPaid = database.purchases.filter(
    (purchase) =>
      purchase.status === "paid" &&
      (purchase.period === "pre_launch_historical" ||
        purchase.classification === "historical"),
  );
  const historicalPurchases =
    historicalPaid.length > 0
      ? historicalPaid.length
      : (baseline.purchases.value ?? 0);
  const launchRevenueCents = revenueCentsFor(
    events,
    database.purchases,
    includeTest,
    "launch_campaign",
  );
  const historicalRevenueCents = historicalPaid.reduce(
    (total, purchase) => total + (purchase.amountCents ?? 0),
    0,
  );
  const postLaunchEvents = allVisibleEvents.filter(
    (event) => reportingPeriodAt(event.createdAt) === "post_launch",
  );
  const postLaunchPurchases = database.purchases.filter((purchase) => {
    if (purchase.status !== "paid") return false;
    if (purchase.period !== "post_launch") return false;
    if (!includeTest && (purchase.test || purchase.classification === "test")) {
      return false;
    }
    return true;
  });
  const durability = getMarketingKpiDurability();
  const periodSlice = (
    period: ReportingPeriod,
    counts: {
      purchases: number;
      revenueCents: number;
      landingPageSessions: number;
      checkoutStarts: number;
      excludedFromLaunchKpi: boolean;
    },
  ): PeriodKpiSlice => ({
    period,
    label: PERIOD_LABELS[period],
    ...counts,
  });

  return {
    lastUpdatedAt: database.lastUpdatedAt,
    dataFreshness: {
      websiteEvents: lastEvent
        ? `First-party events current through ${lastEvent}`
        : "No first-party website events yet",
      socialManual: lastSocial
        ? `Last native-analytics entry ${lastSocial} — platform insights are typically delayed 24–48 hours and are not real-time`
        : "No native social analytics entered yet — not real-time; requires manual entry after the channel exists",
      stripePurchases:
        "Purchases appear after Stripe webhooks process. Authoritative payment status remains Stripe/billing. Not implied real-time.",
    },
    reportingBoundary: {
      timezone: "America/New_York",
      campaignStartEt: campaignStartLabel(),
      campaignStartUtc: CAMPAIGN_START_UTC.toISOString(),
      launchDayEt: LAUNCH_DATE_ET,
      campaignEndExclusiveUtc: CAMPAIGN_END_EXCLUSIVE_UTC.toISOString(),
      launchStartPurchases: 0,
      launchStartRevenueCents: 0,
    },
    durability: {
      backend: durability.backend,
      productionSourceOfTruth: durability.productionSourceOfTruth,
      dataDirIsSourceOfTruth: false,
    },
    activeLaunchChannels: ACTIVE_LAUNCH_CHANNELS,
    linkedinRequiredForLaunch: false,
    periods: {
      preLaunchHistorical: periodSlice("pre_launch_historical", {
        purchases: historicalPurchases,
        revenueCents: historicalRevenueCents,
        landingPageSessions: allVisibleEvents.filter(
          (event) =>
            event.name === "landing_page_session" &&
            reportingPeriodAt(event.createdAt) === "pre_launch_historical",
        ).length,
        checkoutStarts: allVisibleEvents.filter(
          (event) =>
            event.name === "checkout_start" &&
            reportingPeriodAt(event.createdAt) === "pre_launch_historical",
        ).length,
        excludedFromLaunchKpi: true,
      }),
      launchCampaign: periodSlice("launch_campaign", {
        purchases: totals.purchases,
        revenueCents: launchRevenueCents,
        landingPageSessions: totals.landingPageSessions,
        checkoutStarts: totals.checkoutStarts,
        excludedFromLaunchKpi: false,
      }),
      postLaunch: periodSlice("post_launch", {
        purchases:
          postLaunchPurchases.length ||
          postLaunchEvents.filter((event) => event.name === "purchase").length,
        revenueCents: revenueCentsFor(
          postLaunchEvents,
          database.purchases,
          includeTest,
          "post_launch",
        ),
        landingPageSessions: postLaunchEvents.filter(
          (event) => event.name === "landing_page_session",
        ).length,
        checkoutStarts: postLaunchEvents.filter(
          (event) => event.name === "checkout_start",
        ).length,
        excludedFromLaunchKpi: true,
      }),
    },
    baseline,
    includeTest,
    totals,
    channels,
    days,
    assets,
    emailSignups: {
      status: "N/A — No Separate Launch Email Signup Mechanism",
      reason:
        "The launch experience creates Architect accounts at /register. There is no separate newsletter or Kit capture on the implemented launch path.",
    },
    issues,
    funnel: {
      reach: totals.reach,
      engagements: totals.engagements,
      linkClicks: totals.linkClicks,
      landingPageSessions: totals.landingPageSessions,
      checkoutStarts: totals.checkoutStarts,
      purchases: totals.purchases,
      revenueCents: launchRevenueCents,
      rates: totals.rates,
    },
  };
}

function daysPrototypePrior(
  day: string,
  events: MarketingEventRecord[],
  social: SocialDailyRecord[],
  baseline: KpiBaseline,
) {
  const dayEvents = events.filter((event) => event.dateEt === day);
  const daySocial = social.filter((row) => row.dateEt === day);
  return buildSlice("all", dayEvents, daySocial, baseline);
}

export function formatRate(value: number | null): string {
  if (value === null) return "N/A — insufficient denominator";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCount(value: NullableCount): string {
  if (value === null) return "N/A — Not Available From Source";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
