import { getAnalyticsStore } from "@/lib/analytics/store";
import { getBillingStore } from "@/lib/billing/store";
import { getAuthStore } from "@/lib/auth/store";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import { getJourneyProgressStore } from "@/lib/journey/progress/store";
import { buildLaunchKpiDashboard } from "@/lib/marketing-kpi/aggregate";
import { getMarketingKpiStore } from "@/lib/marketing-kpi/store";
import { dateEt } from "@/lib/marketing-kpi/attribution";
import { isLikelyTestPayment } from "@/lib/marketing-kpi/period";
import {
  getLaunchDashboardDurability,
  getLaunchDashboardStore,
} from "@/lib/launch-dashboard/store";
import { buildLaunchDashboardFromSources } from "@/lib/launch-dashboard/aggregate";
import type { LaunchDashboardModel, LaunchDashboardSources } from "@/lib/launch-dashboard/types";
import { getSupportDurability, getSupportStore } from "@/lib/support/store";
import { toSupportOpsRecord } from "@/lib/support/create-ticket";
import type { AnalyticsEventRecord } from "@/lib/analytics/types";

function isTestEvent(event: AnalyticsEventRecord): boolean {
  if (event.test === true) return true;
  return isLikelyTestPayment({
    stripeCheckoutSessionId:
      typeof event.payload?.stripeCheckoutSessionId === "string"
        ? event.payload.stripeCheckoutSessionId
        : undefined,
    stripePaymentIntentId:
      typeof event.payload?.stripePaymentIntentId === "string"
        ? event.payload.stripePaymentIntentId
        : undefined,
  });
}

export async function gatherLaunchDashboardSources(options?: {
  includeTest?: boolean;
}): Promise<LaunchDashboardSources> {
  const includeTest = Boolean(options?.includeTest);
  const [
    analyticsEvents,
    marketing,
    marketingModel,
    purchases,
    stripeEvents,
    users,
    onboarding,
    journeyProgress,
    store,
  ] = await Promise.all([
    getAnalyticsStore().listEvents(),
    getMarketingKpiStore().read(),
    buildLaunchKpiDashboard({ includeTest }),
    getBillingStore().listPurchases(),
    getBillingStore().listStripeEvents(),
    getAuthStore().listUsers(),
    getJourneyOnboardingStore().listOnboarding(),
    getJourneyProgressStore().listProgress(),
    getLaunchDashboardStore().read(),
  ]);
  const tickets = await getSupportStore().list({ includeTest });
  const projected = tickets.map(toSupportOpsRecord);
  const mergedSupport = [
    ...store.support.filter((row) => !row.id.startsWith("BH-S-")),
    ...projected,
  ];
  const socialToday = projected.filter(
    (row) => row.source === "social_row83" && row.dateEt === dateEt(),
  ).length;
  const socialOpen = projected.filter(
    (row) => row.source === "social_row83" && row.status === "open",
  ).length;
  const dashboardDurability = getLaunchDashboardDurability();
  const supportDurability = getSupportDurability();

  return {
    analyticsEvents: includeTest
      ? analyticsEvents
      : analyticsEvents.filter((event) => !isTestEvent(event)),
    marketing,
    marketingModel,
    purchases: includeTest
      ? purchases
      : purchases.filter(
          (row) =>
            !isLikelyTestPayment({
              stripeCheckoutSessionId: row.stripeCheckoutSessionId,
              stripePaymentIntentId: row.stripePaymentIntentId,
            }),
        ),
    stripeEvents,
    accounts: users.map((user) => ({
      id: user.id,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })),
    onboarding,
    journeyProgress,
    socialRoutedSupportCountToday: socialToday,
    socialRoutedSupportCountOpen: socialOpen,
    opsErrors: includeTest
      ? store.opsErrors
      : store.opsErrors.filter((row) => !row.test),
    errorLedgerAvailable: dashboardDurability.backend !== "unconfigured_production",
    store: {
      ...store,
      support: mergedSupport,
      lastUpdatedAt:
        supportDurability.backend === dashboardDurability.backend
          ? store.lastUpdatedAt
          : store.lastUpdatedAt,
    },
  };
}

export async function buildLaunchDashboard(options?: {
  dateEt?: string;
  includeTest?: boolean;
  preferSnapshot?: boolean;
}): Promise<LaunchDashboardModel> {
  const day = options?.dateEt ?? dateEt();
  const includeTest = Boolean(options?.includeTest);
  const store = getLaunchDashboardStore();

  if (options?.preferSnapshot && day < dateEt()) {
    const existing = await store.getSnapshot(day);
    if (existing?.frozen) {
      return { ...existing.model, viewingFrozenSnapshot: true };
    }
  }

  const sources = await gatherLaunchDashboardSources({ includeTest });
  const socialToday = sources.store.support.filter(
    (row) => row.source === "social_row83" && row.dateEt === day,
  );
  sources.socialRoutedSupportCountToday = socialToday.length;
  sources.socialRoutedSupportCountOpen = sources.store.support.filter(
    (row) => row.source === "social_row83" && row.status === "open",
  ).length;

  const model = buildLaunchDashboardFromSources(sources, {
    dateEt: day,
    includeTest,
  });

  const today = dateEt();
  if (day < today) {
    const existing = await store.getSnapshot(day);
    if (!existing?.frozen) {
      await store.saveSnapshot({
        dateEt: day,
        frozen: true,
        capturedAt: new Date().toISOString(),
        model,
      });
    }
  } else {
    await store.saveSnapshot({
      dateEt: day,
      frozen: false,
      capturedAt: new Date().toISOString(),
      model,
    });
  }

  return model;
}
