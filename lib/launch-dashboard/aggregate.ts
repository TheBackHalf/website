import { dateEt } from "@/lib/marketing-kpi/attribution";
import { mergeAvailability } from "@/lib/launch-dashboard/availability";
import { applyHealth } from "@/lib/launch-dashboard/health";
import { buildDailyFounderBrief } from "@/lib/launch-dashboard/brief";
import {
  ACTIVATION_DEFINITION,
  SUPPORT_SLA_HOURS,
  type ErrorRow,
  type FreshnessCell,
  type LabeledRate,
  type LaunchDashboardModel,
  type LaunchDashboardSources,
  type MetricTriple,
  type SupportCategory,
} from "@/lib/launch-dashboard/types";
import {
  HISTORICAL_EXCLUSION_LABEL,
  PERIOD_LABELS,
  countsTowardLaunchKpi,
  isLikelyTestPayment,
  reportingPeriodAt,
} from "@/lib/marketing-kpi/period";
import type { OpsErrorSeverity } from "@/lib/launch-ops-errors/types";

function addDays(yyyyMmDd: string, days: number): string {
  const [year, month, day] = yyyyMmDd.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().slice(0, 10);
}

export function launchLabel(day: string): { label: string; dayNumber: string } {
  if (day < "2026-08-28") {
    return { label: "Pre-campaign", dayNumber: "n/a" };
  }
  if (day === "2026-08-28") {
    return { label: "Pre-launch Day 1", dayNumber: "Launch −3" };
  }
  if (day === "2026-08-29") {
    return { label: "Pre-launch Day 2", dayNumber: "Launch −2" };
  }
  if (day === "2026-08-30") {
    return { label: "Pre-launch Day 3", dayNumber: "Launch −1" };
  }
  if (day === "2026-08-31") {
    return { label: "LAUNCH DAY", dayNumber: "Launch Day" };
  }
  const [y, m, d] = day.split("-").map(Number);
  const [ly, lm, ld] = [2026, 8, 31];
  const delta = Math.round(
    (Date.UTC(y!, m! - 1, d!) - Date.UTC(ly, lm - 1, ld)) / 86400000,
  );
  return { label: `Launch +${delta}`, dayNumber: `Launch +${delta}` };
}

function onDay(
  iso: string | undefined,
  day: string,
): boolean {
  if (!iso) return false;
  return dateEt(iso) === day;
}

function identity(event: {
  id: string;
  userId?: string;
  payload?: Record<string, string | number | boolean | null | undefined>;
}): string {
  if (event.userId) return `u:${event.userId}`;
  const anonymous = event.payload?.anonymousId;
  if (typeof anonymous === "string" && anonymous) return `a:${anonymous}`;
  return `e:${event.id}`;
}

function uniqueNamed(
  events: LaunchDashboardSources["analyticsEvents"],
  name: string,
  day?: string,
): number {
  const subset = events.filter(
    (event) => event.name === name && (!day || onDay(event.createdAt, day)),
  );
  return new Set(subset.map(identity)).size;
}

function uniqueCta(
  events: LaunchDashboardSources["analyticsEvents"],
  cta: string,
  day?: string,
): number {
  const subset = events.filter(
    (event) =>
      event.name === "cta_clicked" &&
      event.payload?.cta === cta &&
      (!day || onDay(event.createdAt, day)),
  );
  return new Set(subset.map(identity)).size;
}

function namedCount(
  events: LaunchDashboardSources["analyticsEvents"],
  name: string,
  day?: string,
): number {
  return events.filter(
    (event) => event.name === name && (!day || onDay(event.createdAt, day)),
  ).length;
}

function rate(
  numerator: number,
  denominator: number,
  label: string,
  numeratorName: string,
  denominatorName: string,
): LabeledRate {
  return {
    value: denominator === 0 ? null : numerator / denominator,
    label,
    numerator: numeratorName,
    denominator: denominatorName,
  };
}

function triple(
  today: number,
  cumulative: number,
  baseline: number | null | string,
  prior: number | null,
): MetricTriple {
  return {
    today,
    cumulative,
    baseline,
    versusPriorDay: prior === null ? null : today - prior,
  };
}

function errorSeverity(today: number): ErrorRow["severity"] {
  if (today >= 5) return "RED";
  if (today >= 1) return "YELLOW";
  return "GREEN";
}

function opsToRisk(severity: OpsErrorSeverity): ErrorRow["severity"] {
  if (severity === "CRITICAL") return "RED";
  if (severity === "HIGH") return "YELLOW";
  return "GREEN";
}

function freshnessCell(input: {
  key: string;
  source: string;
  lastUpdated: string;
  cadence: string;
  mode: FreshnessCell["mode"];
  knownDelay: string;
  generatedAt: string;
}): FreshnessCell {
  const ageMs = Date.parse(input.generatedAt) - Date.parse(input.lastUpdated);
  let state: FreshnessCell["state"] = "CURRENT";
  if (!input.lastUpdated) {
    state = "N/A";
  } else if (!Number.isFinite(ageMs)) {
    state = "N/A";
  } else if (ageMs > 36 * 60 * 60 * 1000) {
    state = "STALE";
  } else if (ageMs > 6 * 60 * 60 * 1000) {
    state = "DELAYED";
  }
  return { ...input, state };
}

function trend(today: number, prior: number): ErrorRow["trend"] {
  if (today > prior) return "up";
  if (today < prior) return "down";
  return "flat";
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export function normalizeSupportCategory(value: string): SupportCategory {
  if (
    (
      [
        "registration",
        "login",
        "payment",
        "onboarding",
        "journey",
        "lumina",
        "downloads",
        "general",
        "other",
      ] as const
    ).includes(value as SupportCategory)
  ) {
    return value as SupportCategory;
  }
  if (value === "account" || value === "login/account") return "login";
  return "other";
}

export function buildLaunchDashboardFromSources(
  sources: LaunchDashboardSources,
  options: { dateEt: string; includeTest?: boolean },
): LaunchDashboardModel {
  const day = options.dateEt;
  const priorDay = addDays(day, -1);
  const includeTest = Boolean(options.includeTest);
  const events = sources.analyticsEvents.filter((event) => {
    if (includeTest) return true;
    if (event.test) return false;
    return !isLikelyTestPayment({
      stripeCheckoutSessionId:
        typeof event.payload?.stripeCheckoutSessionId === "string"
          ? event.payload.stripeCheckoutSessionId
          : undefined,
      stripePaymentIntentId:
        typeof event.payload?.stripePaymentIntentId === "string"
          ? event.payload.stripePaymentIntentId
          : undefined,
    });
  });
  const purchases = sources.purchases.filter((row) => {
    if (includeTest) return true;
    return !isLikelyTestPayment({
      stripeCheckoutSessionId: row.stripeCheckoutSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
    });
  });
  const support = sources.store.support.filter(
    (row) => includeTest || !row.test,
  );
  const risks = sources.store.risks.filter((row) => includeTest || !row.test);
  const availability = mergeAvailability(sources.store.availability);
  const opsErrors = (sources.opsErrors ?? []).filter(
    (row) => includeTest || !row.test,
  );
  const errorLedgerAvailable = sources.errorLedgerAvailable !== false;

  const pageToday = events.filter(
    (event) => event.name === "page_viewed" && onDay(event.createdAt, day),
  );
  const pageAll = events.filter((event) => event.name === "page_viewed");
  const pagePrior = events.filter(
    (event) => event.name === "page_viewed" && onDay(event.createdAt, priorDay),
  );

  const sessionsToday = new Set(
    pageToday.map((event) => `${identity(event)}:${day}`),
  ).size;
  const sessionsAll = new Set(
    pageAll.map((event) => `${identity(event)}:${dateEt(event.createdAt)}`),
  ).size;
  const sessionsPrior = new Set(
    pagePrior.map((event) => `${identity(event)}:${priorDay}`),
  ).size;
  const visitorsToday = new Set(pageToday.map(identity)).size;
  const visitorsAll = new Set(pageAll.map(identity)).size;
  const visitorsPrior = new Set(pagePrior.map(identity)).size;

  const sourceCounts = (subset: typeof pageToday) => {
    const map = new Map<string, number>();
    for (const event of subset) {
      const source =
        typeof event.payload?.source === "string" && event.payload.source
          ? event.payload.source
          : "direct";
      map.set(source, (map.get(source) ?? 0) + 1);
    }
    return map;
  };
  const todaySources = sourceCounts(pageToday);
  const allSources = sourceCounts(pageAll);
  const bySource = [...new Set([...todaySources.keys(), ...allSources.keys()])]
    .map((source) => ({
      source,
      today: todaySources.get(source) ?? 0,
      cumulative: allSources.get(source) ?? 0,
    }))
    .sort((a, b) => b.today - a.today || b.cumulative - a.cumulative);
  const topSource = bySource[0]?.source ?? "none";

  const isCampaignPage = (
    event: LaunchDashboardSources["analyticsEvents"][number],
  ) =>
    event.payload?.campaign === "the-question" ||
    event.payload?.source === "instagram" ||
    event.payload?.source === "linkedin" ||
    event.payload?.source === "tiktok";
  const isDirectPage = (
    event: LaunchDashboardSources["analyticsEvents"][number],
  ) =>
    !event.payload?.source ||
    event.payload.source === "direct" ||
    event.payload.source === "none";
  const campaignToday = pageToday.filter(isCampaignPage).length;
  const campaignAll = pageAll.filter(isCampaignPage).length;
  const campaignPrior = pagePrior.filter(isCampaignPage).length;
  const directToday = pageToday.filter(isDirectPage).length;
  const directAll = pageAll.filter(isDirectPage).length;
  const directPrior = pagePrior.filter(isDirectPage).length;

  const marketingDay = sources.marketingModel.days.find(
    (entry) => entry.dateEt === day,
  );
  const registrationPageToday =
    marketingDay?.totals.landingPageSessions ??
    uniqueNamed(events, "registration_viewed", day);
  const registrationPageAll = sources.marketingModel.totals.landingPageSessions;
  const registrationPagePrior =
    sources.marketingModel.days.find((entry) => entry.dateEt === priorDay)
      ?.totals.landingPageSessions ?? null;
  const baselineReg =
    sources.marketingModel.baseline.registrationPageTraffic.value ??
    sources.marketingModel.baseline.registrationPageTraffic.status;
  const baselineWeb =
    sources.marketingModel.baseline.websiteTraffic.value ??
    sources.marketingModel.baseline.websiteTraffic.status;

  const registrationStarted = uniqueNamed(events, "registration_started", day);
  const registrationCompleted = uniqueNamed(
    events,
    "registration_succeeded",
    day,
  );
  const checkoutStarted = uniqueNamed(events, "checkout_started", day);
  const row150Purchases = uniqueNamed(events, "purchase_completed", day);
  const row84LaunchPaid = sources.marketing.purchases.filter(
    (purchase) =>
      purchase.status === "paid" &&
      purchase.period === "launch_campaign" &&
      (includeTest || (!purchase.test && purchase.classification !== "test")),
  );
  const row84HistoricalPaid = sources.marketing.purchases.filter(
    (purchase) =>
      purchase.status === "paid" &&
      (purchase.period === "pre_launch_historical" ||
        purchase.classification === "historical"),
  );
  const row84Launch = {
    purchases: row84LaunchPaid.length,
    revenueCents: row84LaunchPaid.reduce(
      (total, purchase) => total + (purchase.amountCents ?? 0),
      0,
    ),
  };
  const row84Historical = {
    purchases: Math.max(
      row84HistoricalPaid.length,
      sources.marketingModel.periods.preLaunchHistorical.purchases,
    ),
    revenueCents: Math.max(
      row84HistoricalPaid.reduce(
        (total, purchase) => total + (purchase.amountCents ?? 0),
        0,
      ),
      sources.marketingModel.periods.preLaunchHistorical.revenueCents,
    ),
  };
  const row84Purchases = row84LaunchPaid.filter(
    (purchase) => purchase.dateEt === day,
  ).length;

  const paidAll = purchases.filter((row) => row.status === "paid");
  const historicalPaid = paidAll.filter(
    (row) => reportingPeriodAt(row.createdAt) === "pre_launch_historical",
  );
  const paid = paidAll.filter((row) =>
    countsTowardLaunchKpi({
      createdAt: row.createdAt,
      stripeCheckoutSessionId: row.stripeCheckoutSessionId,
      stripePaymentIntentId: row.stripePaymentIntentId,
      includeTest,
    }),
  );
  const paidToday = paid.filter((row) => onDay(row.createdAt, day));
  const failed = purchases.filter(
    (row) =>
      row.status === "failed" &&
      reportingPeriodAt(row.createdAt) !== "pre_launch_historical",
  );
  const refunded = purchases.filter(
    (row) =>
      row.status === "refunded" &&
      reportingPeriodAt(row.createdAt) !== "pre_launch_historical",
  );
  const uniquePaidUsers = new Set(paid.map((row) => row.userId));
  const billingPurchasesToday = new Set(
    paidToday.map((row) => row.stripeCheckoutSessionId ?? row.id),
  ).size;

  const sumCents = (
    rows: typeof purchases,
    dayFilter?: string,
  ) =>
    rows
      .filter((row) => !dayFilter || onDay(row.createdAt, dayFilter))
      .reduce((total, row) => total + (row.amountCents ?? 0), 0);

  const grossTodayBilling = sumCents(paid, day);
  const grossAllBilling = sumCents(paid);
  const refundsToday = sumCents(refunded, day);
  const refundsAll = sumCents(refunded);
  const billingPurchasesCumulative = new Set(
    paid.map((row) => row.stripeCheckoutSessionId ?? row.id),
  ).size;
  const row84TodayPaid = sources.marketing.purchases.filter(
    (purchase) =>
      purchase.status === "paid" &&
      purchase.dateEt === day &&
      purchase.period === "launch_campaign" &&
      (includeTest || (!purchase.test && purchase.classification !== "test")),
  );
  let displayedPurchasesToday = billingPurchasesToday;
  let displayedPurchasesCumulative = billingPurchasesCumulative;
  let grossToday = grossTodayBilling;
  let grossAll = grossAllBilling;
  let revenueSource =
    "Authoritative launch revenue from billing Stripe webhooks, reconciled to durable Row 84. Historical purchases are excluded. Not browser analytics.";
  if (billingPurchasesCumulative === 0 && row84Launch.purchases > 0) {
    displayedPurchasesCumulative = row84Launch.purchases;
    displayedPurchasesToday = row84TodayPaid.length;
    grossAll = row84Launch.revenueCents;
    grossToday = row84TodayPaid.reduce(
      (total, purchase) => total + (purchase.amountCents ?? 0),
      0,
    );
    revenueSource =
      "Durable Row 84 Stripe-mirrored launch purchases (billing process store empty). Historical excluded. Not browser analytics.";
  }

  const purchasedIds = uniquePaidUsers;
  const eventPurchaserIds = new Set(
    events
      .filter(
        (event) =>
          event.name === "purchase_completed" &&
          event.userId &&
          countsTowardLaunchKpi({
            createdAt: event.createdAt,
            stripeCheckoutSessionId:
              typeof event.payload?.stripeCheckoutSessionId === "string"
                ? event.payload.stripeCheckoutSessionId
                : undefined,
            includeTest,
          }),
      )
      .map((event) => event.userId as string),
  );
  if (purchasedIds.size === 0) {
    for (const id of eventPurchaserIds) purchasedIds.add(id);
  }
  const verifiedIds = new Set(
    sources.accounts.filter((account) => account.emailVerified).map((row) => row.id),
  );
  const onboardingStartedIds = new Set([
    ...sources.onboarding.map((row) => row.userId),
    ...events
      .filter((event) => event.name === "onboarding_started" && event.userId)
      .map((event) => event.userId as string),
  ]);
  const onboardingCompletedIds = new Set([
    ...sources.onboarding
      .filter((row) => row.status === "completed")
      .map((row) => row.userId),
    ...events
      .filter((event) => event.name === "onboarding_completed" && event.userId)
      .map((event) => event.userId as string),
  ]);
  const journeyEnteredIds = new Set([
    ...sources.journeyProgress.map((row) => row.userId),
    ...events
      .filter((event) => event.name === "journey_entered" && event.userId)
      .map((event) => event.userId as string),
  ]);

  const activatedIds = [...purchasedIds].filter((id) =>
    onboardingStartedIds.has(id),
  );
  const purchasedNotActivated = [...purchasedIds].filter(
    (id) => !onboardingStartedIds.has(id),
  ).length;
  const stalledOnboarding = [...purchasedIds].filter(
    (id) => onboardingStartedIds.has(id) && !onboardingCompletedIds.has(id),
  ).length;
  const stalledJourney = [...purchasedIds].filter(
    (id) => onboardingCompletedIds.has(id) && !journeyEnteredIds.has(id),
  ).length;

  const accountActive = [...purchasedIds].filter((id) => verifiedIds.has(id))
    .length;

  const priorError = (name: string) => namedCount(events, name, priorDay);
  const errorDefs: Array<{
    name: string;
    category: string;
    productArea: string;
    source: string;
  }> = [
    {
      name: "registration_failed",
      category: "registration_failed",
      productArea: "registration",
      source: "Row 150",
    },
    {
      name: "auth_failed",
      category: "auth_failed",
      productArea: "auth",
      source: "Row 150",
    },
    {
      name: "checkout_failed",
      category: "checkout_failed",
      productArea: "checkout",
      source: "Row 150",
    },
    {
      name: "membership_payment_failed",
      category: "membership_payment_failed",
      productArea: "membership",
      source: "Row 150",
    },
    {
      name: "journey_save_failed",
      category: "journey_save_failed",
      productArea: "journey",
      source: "Row 150",
    },
    {
      name: "lumina_error",
      category: "lumina_error",
      productArea: "lumina",
      source: "Row 150",
    },
    {
      name: "download_failed",
      category: "download_failed",
      productArea: "downloads",
      source: "Row 150",
    },
  ];
  const errors: ErrorRow[] = errorDefs.map((def) => {
    const today = namedCount(events, def.name, day);
    return {
      category: def.category,
      productArea: def.productArea,
      today,
      open: null,
      severity: errorSeverity(today),
      trend: trend(today, priorError(def.name)),
      source: def.source,
      kind: "product_event",
    };
  });
  const billingFailedToday = failed.filter((row) => onDay(row.createdAt, day))
    .length;
  errors.push({
    category: "payment_failed",
    productArea: "payment",
    today: billingFailedToday,
    open: failed.length,
    severity: errorSeverity(billingFailedToday),
    trend: trend(
      billingFailedToday,
      failed.filter((row) => onDay(row.createdAt, priorDay)).length,
    ),
    source: "Billing store (Stripe webhook)",
    kind: "billing",
  });
  const stripeFailedToday = sources.stripeEvents.filter(
    (row) => row.status === "failed" && onDay(row.processedAt, day),
  ).length;
  errors.push({
    category: "stripe_processing_failed",
    productArea: "payment",
    today: stripeFailedToday,
    open: sources.stripeEvents.filter((row) => row.status === "failed").length,
    severity: errorSeverity(stripeFailedToday),
    trend: "n/a",
    source: "Billing Stripe event log",
    kind: "billing",
  });
  const opsToday = opsErrors.filter((row) => onDay(row.lastSeen, day));
  const opsOpen = opsErrors.filter((row) => row.status === "open");
  const worstOps = opsOpen.reduce<OpsErrorSeverity | undefined>((worst, row) => {
    const order: OpsErrorSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!worst) return row.severity;
    return order.indexOf(row.severity) > order.indexOf(worst) ? row.severity : worst;
  }, undefined);
  errors.push({
    category: "application_server_errors",
    productArea: "website",
    today: errorLedgerAvailable ? opsToday.length : null,
    open: errorLedgerAvailable ? opsOpen.length : null,
    severity: errorLedgerAvailable
      ? worstOps
        ? opsToRisk(worstOps)
        : "GREEN"
      : "YELLOW",
    opsSeverity: errorLedgerAvailable ? worstOps : undefined,
    trend: errorLedgerAvailable
      ? trend(
          opsToday.length,
          opsErrors.filter((row) => onDay(row.lastSeen, priorDay)).length,
        )
      : "n/a",
    source: errorLedgerAvailable
      ? "Durable launch_ops_errors ledger (Next.js onRequestError + controlled recordLaunchOpsError)"
      : "ERROR: error ledger unavailable",
    kind: "application_server",
  });
  if (errorLedgerAvailable) {
    const byArea = new Map<string, typeof opsOpen>();
    for (const row of opsOpen) {
      const list = byArea.get(row.productArea) ?? [];
      list.push(row);
      byArea.set(row.productArea, list);
    }
    for (const [area, list] of byArea) {
      if (area === "website") continue;
      const worst = list.reduce(
        (current, row) =>
          ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(row.severity) >
          ["LOW", "MEDIUM", "HIGH", "CRITICAL"].indexOf(current)
            ? row.severity
            : current,
        "LOW" as OpsErrorSeverity,
      );
      errors.push({
        category: `application_server_${area}`,
        productArea: area,
        today: list.filter((row) => onDay(row.lastSeen, day)).length,
        open: list.length,
        severity: opsToRisk(worst),
        opsSeverity: worst,
        trend: "n/a",
        source: "Durable launch_ops_errors ledger",
        kind: "application_server",
      });
    }
  }
  errors.push({
    category: "onboarding_errors",
    productArea: "onboarding",
    today: null,
    open: null,
    severity: "GREEN",
    trend: "n/a",
    source: "N/A — no dedicated onboarding error event at launch",
  });

  const supportToday = support.filter((row) => row.dateEt === day);
  const supportOpen = support.filter((row) => row.status === "open");
  const resolvedToday = support.filter(
    (row) => row.status === "resolved" && row.resolvedAt && onDay(row.resolvedAt, day),
  );
  const approachingSla = supportOpen.filter((row) => {
    if (row.slaState === "approaching" || row.slaState === "overdue" || row.slaState === "urgent") {
      return true;
    }
    const ageHours =
      (Date.now() - Date.parse(row.createdAt)) / (1000 * 60 * 60);
    return Number.isFinite(ageHours) && ageHours >= SUPPORT_SLA_HOURS;
  }).length;
  const overdue = supportOpen.filter((row) => row.slaState === "overdue").length;
  const fingerprints = new Map<string, number>();
  for (const row of support) {
    if (!row.fingerprint) continue;
    fingerprints.set(row.fingerprint, (fingerprints.get(row.fingerprint) ?? 0) + 1);
  }
  const responseSamples = support
    .filter((row) => typeof row.responseMinutes === "number")
    .map((row) => row.responseMinutes as number);
  const categories = [
    "registration",
    "login",
    "payment",
    "onboarding",
    "journey",
    "lumina",
    "downloads",
    "general",
    "other",
  ] as const;
  const byCategory = categories.map((category) => ({
    category,
    open: supportOpen.filter((row) => row.category === category).length,
    today: supportToday.filter((row) => row.category === category).length,
  }));

  const funnel = {
    registrationPage: uniqueNamed(events, "registration_viewed", day),
    registrationStarted,
    registrationCompleted,
    checkoutStarted,
    purchases: displayedPurchasesToday,
    becomeArchitectCta: uniqueCta(events, "become_architect", day),
    journeyExploreCta: uniqueCta(events, "journey_explore", day),
    registrationConversion: rate(
      registrationCompleted,
      registrationStarted,
      "Registration completion rate",
      "registration_succeeded (unique)",
      "registration_started (unique)",
    ),
    landingToPurchase: rate(
      displayedPurchasesToday,
      registrationPageToday,
      "Landing-page-to-purchase conversion",
      "paid launch purchases",
      "Row 84 landing-page sessions",
    ),
    checkoutCompletion: rate(
      displayedPurchasesToday,
      checkoutStarted ||
        (marketingDay?.totals.checkoutStarts ?? 0),
      "Checkout completion rate",
      "paid launch purchases",
      "checkout_started (unique) or Row 84 checkout starts",
    ),
    dropOff: [
      {
        from: "Registration page viewed",
        to: "Registration started",
        lost: Math.max(uniqueNamed(events, "registration_viewed", day) - registrationStarted, 0),
      },
      {
        from: "Registration started",
        to: "Registration completed",
        lost: Math.max(registrationStarted - registrationCompleted, 0),
      },
      {
        from: "Registration completed",
        to: "Checkout started",
        lost: Math.max(registrationCompleted - checkoutStarted, 0),
      },
      {
        from: "Checkout started",
        to: "Purchase completed",
        lost: Math.max(checkoutStarted - displayedPurchasesToday, 0),
      },
    ],
    row84Purchases,
    row150Purchases,
    billingPurchases: billingPurchasesToday,
  };

  const qualityIssues: string[] = [];
  if (
    funnel.registrationConversion.value !== null &&
    funnel.registrationConversion.value > 1
  ) {
    qualityIssues.push("ERROR: registration completion rate exceeds 100%.");
  }
  if (
    funnel.landingToPurchase.value !== null &&
    funnel.landingToPurchase.value > 1
  ) {
    qualityIssues.push("ERROR: landing-to-purchase rate exceeds 100%.");
  }
  if (
    funnel.checkoutCompletion.value !== null &&
    funnel.checkoutCompletion.value > 1
  ) {
    qualityIssues.push("ERROR: checkout completion rate exceeds 100%.");
  }
  if (
    billingPurchasesToday !== row150Purchases &&
    (billingPurchasesToday > 0 || row150Purchases > 0)
  ) {
    qualityIssues.push(
      `WARN: billing paid count (${billingPurchasesToday}) ≠ Row 150 purchase_completed (${row150Purchases}). Displayed revenue does not silently pick the larger number.`,
    );
  }
  if (
    billingPurchasesToday !== row84Purchases &&
    (billingPurchasesToday > 0 || row84Purchases > 0)
  ) {
    qualityIssues.push(
      `ERROR: billing paid count (${billingPurchasesToday}) ≠ Row 84 launch purchase (${row84Purchases}).`,
    );
  }
  if (
    billingPurchasesCumulative > 0 &&
    billingPurchasesCumulative !== row84Launch.purchases
  ) {
    qualityIssues.push(
      `ERROR: billing launch purchases (${billingPurchasesCumulative}) ≠ Row 84 launch campaign purchases (${row84Launch.purchases}).`,
    );
  }
  if (billingPurchasesCumulative === 0 && row84Launch.purchases > 0) {
    qualityIssues.push(
      "WARN: billing process store has no launch purchases; displaying durable Row 84 Stripe-mirrored launch purchases.",
    );
  }
  if (paidToday.some((row) => typeof row.amountCents !== "number")) {
    qualityIssues.push("WARN: one or more paid purchases missing amountCents.");
  }
  if (risks.some((risk) => risk.status !== "resolved" && !risk.owner.trim())) {
    qualityIssues.push("ERROR: open launch risk is missing an owner.");
  }
  if (sessionsToday < 0 || displayedPurchasesToday < 0) {
    qualityIssues.push("ERROR: negative counts are invalid.");
  }
  if (!errorLedgerAvailable) {
    qualityIssues.push("ERROR: error ledger unavailable — application/server errors cannot confirm GREEN.");
  }

  const { label, dayNumber } = launchLabel(day);
  const generatedAt = new Date().toISOString();
  const freshnessCells: FreshnessCell[] = [
    freshnessCell({
      key: "analytics",
      source: "Row 150 analytics_events (durable Postgres in production)",
      lastUpdated: generatedAt,
      cadence: "On dashboard read",
      mode: "automated",
      knownDelay: "Event ingest delay of seconds, not implied real-time.",
      generatedAt,
    }),
    freshnessCell({
      key: "marketing",
      source: "Row 84 marketing_kpi_* (durable Postgres in production)",
      lastUpdated: sources.marketing.lastUpdatedAt,
      cadence: "On dashboard read / Stripe mirror",
      mode: "automated",
      knownDelay: "Native social metrics remain manual (Row 84).",
      generatedAt,
    }),
    freshnessCell({
      key: "billing",
      source: "Stripe webhooks + Row 84 purchase mirror",
      lastUpdated: generatedAt,
      cadence: "On webhook / on read",
      mode: "automated",
      knownDelay: "Webhook processing delay.",
      generatedAt,
    }),
    freshnessCell({
      key: "errors",
      source: "launch_ops_errors ledger",
      lastUpdated: opsErrors[0]?.lastSeen || generatedAt,
      cadence: "On request error / controlled record",
      mode: "automated",
      knownDelay: "Not a full APM. Launch-critical failures only.",
      generatedAt,
    }),
    freshnessCell({
      key: "support",
      source: "Row 153 support_tickets (durable Postgres in production)",
      lastUpdated: sources.store.lastUpdatedAt,
      cadence: "On ticket create / on read",
      mode: "automated",
      knownDelay: "Email delivery is independent of ticket persistence.",
      generatedAt,
    }),
    freshnessCell({
      key: "risks",
      source: "launch_dashboard_risks register",
      lastUpdated: sources.store.lastUpdatedAt,
      cadence: "On save / on read",
      mode: "manual",
      knownDelay: "Manual identification.",
      generatedAt,
    }),
    freshnessCell({
      key: "availability",
      source: "Automated config probes + manual outage flags",
      lastUpdated: generatedAt,
      cadence: "On read (automated) / on save (manual)",
      mode: "automated",
      knownDelay: "Not synthetic uptime monitoring.",
      generatedAt,
    }),
  ];
  if (freshnessCells.some((cell) => cell.state === "STALE")) {
    qualityIssues.push("WARN: one or more launch data sources are STALE.");
  }

  const draft = {
    generatedAt,
    dateEt: day,
    launchLabel: label,
    launchDayNumber: dayNumber,
    dataFreshness: {
      lastRefresh: generatedAt,
      analytics: "CURRENT — Row 150 durable analytics ledger, on read.",
      marketing: "CURRENT — Row 84 durable marketing KPI ledger, on read. Native social is MANUAL.",
      billing: "CURRENT — Stripe webhooks reconciled to Row 84 launch purchases.",
      support:
        "CURRENT — Row 153 support_tickets. Ticket tracking is operational; email delivery is a separate Row 153 capability.",
      risks: "CURRENT — durable risk register, MANUAL identification.",
      availability:
        "AUTOMATED config probes plus MANUAL outage flags. Not synthetic uptime monitoring.",
      errors:
        errorLedgerAvailable
          ? "CURRENT — durable launch_ops_errors. Not PENDING SOURCE."
          : "STALE — error ledger unavailable.",
      cells: freshnessCells,
    },
    traffic: {
      websiteSessions: triple(sessionsToday, sessionsAll, baselineWeb, sessionsPrior),
      uniqueVisitors: triple(visitorsToday, visitorsAll, "n/a — no visitor baseline", visitorsPrior),
      registrationPageSessions: triple(
        registrationPageToday,
        registrationPageAll,
        baselineReg,
        registrationPagePrior,
      ),
      campaignSessions: triple(campaignToday, campaignAll, "n/a", campaignPrior),
      directSessions: triple(directToday, directAll, "n/a", directPrior),
      bySource,
      topSource,
    },
    conversion: funnel,
    revenue: {
      grossTodayCents: grossToday,
      grossCumulativeCents: grossAll,
      purchasesToday: displayedPurchasesToday,
      purchasesCumulative: displayedPurchasesCumulative,
      averageTransactionCents:
        displayedPurchasesToday > 0
          ? Math.round(grossToday / displayedPurchasesToday)
          : null,
      failedPaymentsToday: billingFailedToday,
      failedPaymentsCumulative: failed.length,
      refundsTodayCents: refundsToday,
      refundsCumulativeCents: refundsAll,
      netTodayCents: grossToday - refundsToday,
      netCumulativeCents: grossAll - refundsAll,
      source: revenueSource,
      refundsNote:
        refundsAll === 0
          ? "No launch-window refunds recorded."
          : "Refunds are launch-window purchases with status refunded. Historical refunds are excluded.",
      historicalPurchases: Math.max(
        historicalPaid.length,
        row84Historical.purchases,
      ),
      historicalRevenueCents: Math.max(
        historicalPaid.reduce((total, row) => total + (row.amountCents ?? 0), 0),
        row84Historical.revenueCents,
      ),
      historicalLabel: HISTORICAL_EXCLUSION_LABEL,
      launchPeriodLabel: PERIOD_LABELS.launch_campaign,
    },
    activation: {
      definition: ACTIVATION_DEFINITION,
      purchased: purchasedIds.size,
      accountActive,
      onboardingStarted: [...purchasedIds].filter((id) =>
        onboardingStartedIds.has(id),
      ).length,
      onboardingCompleted: [...purchasedIds].filter((id) =>
        onboardingCompletedIds.has(id),
      ).length,
      journeyEntered: [...purchasedIds].filter((id) =>
        journeyEnteredIds.has(id),
      ).length,
      activated: activatedIds.length,
      activationRate: rate(
        activatedIds.length,
        purchasedIds.size,
        "Activation rate",
        "purchasers who started onboarding",
        "purchasers (paid billing)",
      ),
      purchasedNotActivated,
      stalledOnboarding,
      stalledJourney,
      luminaOpenedToday: uniqueNamed(events, "lumina_opened", day),
      downloadsCompletedToday: uniqueNamed(events, "download_completed", day),
      journeyCompleted: uniqueNamed(events, "journey_completed"),
      certificateDownloaded: uniqueNamed(events, "certificate_downloaded"),
      membershipActivated: uniqueNamed(events, "membership_activated"),
    },
    errors,
    support: {
      newToday: supportToday.length,
      open: supportOpen.length,
      resolvedToday: resolvedToday.length,
      unresolved: supportOpen.length,
      medianResponseMinutes: median(responseSamples),
      approachingSla,
      overdue,
      p1Open: supportOpen.filter((row) => row.priority === "P1").length,
      p2Open: supportOpen.filter((row) => row.priority === "P2").length,
      repeatIssues: [...fingerprints.values()].filter((count) => count >= 2).length,
      urgentEscalations: supportOpen.filter((row) => row.escalated && row.priority === "P1").length,
      byCategory,
      socialRoutedToday: supportToday.filter((row) => row.source === "social_row83")
        .length,
      socialRoutedOpen: supportOpen.filter((row) => row.source === "social_row83")
        .length,
      publicFormDelivery:
        "Public /support form creates tracked Row 153 tickets. Email acknowledgment is sent only when SMTP is configured; ticket persistence does not imply email delivery. Row 83 social handoffs count once as tickets with source social_row83.",
      slaStandard: `Published Architect expectation: response within 3 days (goal ${SUPPORT_SLA_HOURS} hours or less). P1 urgent items use a 4-hour internal due time. Overdue tickets are flagged automatically.`,
    },
    risks,
    availability,
    qualityIssues,
    viewingFrozenSnapshot: false,
  };

  const withHealth = applyHealth(draft);
  return {
    ...withHealth,
    briefMarkdown: buildDailyFounderBrief(withHealth),
  };
}
