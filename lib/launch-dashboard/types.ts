import type { AnalyticsEventRecord } from "@/lib/analytics/types";
import type { PurchaseRecord, StripeEventLogRecord } from "@/lib/billing/types";
import type { OnboardingRecord } from "@/lib/journey/onboarding/types";
import type { JourneyProgressRecord } from "@/lib/journey/progress/types";
import type { LaunchOpsErrorRecord, OpsErrorSeverity } from "@/lib/launch-ops-errors/types";
import type { MarketingKpiDatabase } from "@/lib/marketing-kpi/types";
import type { LaunchKpiDashboardModel } from "@/lib/marketing-kpi/aggregate";

export const LAUNCH_HEALTH = ["GREEN", "YELLOW", "RED"] as const;
export type LaunchHealth = (typeof LAUNCH_HEALTH)[number];

export const RISK_SEVERITY = ["GREEN", "YELLOW", "RED"] as const;
export type RiskSeverity = (typeof RISK_SEVERITY)[number];

export const RISK_STATUS = ["open", "mitigating", "resolved"] as const;
export type RiskStatus = (typeof RISK_STATUS)[number];

export const RISK_CATEGORIES = [
  "website",
  "registration",
  "checkout",
  "payment",
  "architect_access",
  "journey",
  "lumina",
  "email",
  "support",
  "marketing",
  "analytics",
  "security",
  "privacy",
  "legal",
  "revenue",
  "third_party",
] as const;
export type RiskCategory = (typeof RISK_CATEGORIES)[number];

export const SUPPORT_CATEGORIES = [
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
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_STATUS = ["open", "resolved"] as const;
export type SupportStatus = (typeof SUPPORT_STATUS)[number];

export const AVAILABILITY_AREAS = [
  "website",
  "registration",
  "checkout",
  "payment",
  "architect_access",
  "journey",
  "lumina",
] as const;
export type AvailabilityArea = (typeof AVAILABILITY_AREAS)[number];

export const AVAILABILITY_STATUSES = [
  "available",
  "degraded",
  "unavailable",
  "unreported",
] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type LaunchRiskRecord = {
  id: string;
  dateIdentifiedEt: string;
  description: string;
  category: RiskCategory;
  severity: RiskSeverity;
  owner: string;
  status: RiskStatus;
  mitigation: string;
  founderEscalationRequired: boolean;
  resolutionDateEt?: string;
  test?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupportOpsRecord = {
  id: string;
  dateEt: string;
  category: SupportCategory;
  status: SupportStatus;
  source: "public_form" | "ops_manual" | "social_row83";
  delivery: "recorded" | "pending_backend" | "n/a";
  /** Minutes from create to resolve; omitted while open. */
  responseMinutes?: number;
  createdAt: string;
  resolvedAt?: string;
  test?: boolean;
  priority?: "P1" | "P2" | "P3" | "P4";
  slaState?: "within" | "approaching" | "overdue" | "urgent";
  fingerprint?: string;
  escalated?: boolean;
};

export type AvailabilityRecord = {
  area: AvailabilityArea;
  status: AvailabilityStatus;
  note?: string;
  updatedAt: string;
  updatedBy: string;
  source?: "automated" | "manual";
};

export const FRESHNESS_STATES = [
  "CURRENT",
  "DELAYED",
  "STALE",
  "N/A",
] as const;
export type FreshnessState = (typeof FRESHNESS_STATES)[number];

export type FreshnessCell = {
  key: string;
  source: string;
  lastUpdated: string;
  cadence: string;
  mode: "automated" | "manual";
  knownDelay: string;
  state: FreshnessState;
};

export type DailyLaunchSnapshot = {
  dateEt: string;
  frozen: boolean;
  capturedAt: string;
  model: LaunchDashboardModel;
};

export type LaunchDashboardDatabase = {
  risks: LaunchRiskRecord[];
  support: SupportOpsRecord[];
  availability: AvailabilityRecord[];
  snapshots: DailyLaunchSnapshot[];
  opsErrors: LaunchOpsErrorRecord[];
  lastUpdatedAt: string;
};

export type AccountSlice = {
  id: string;
  emailVerified: boolean;
  createdAt: string;
};

export type LaunchDashboardSources = {
  analyticsEvents: AnalyticsEventRecord[];
  marketing: MarketingKpiDatabase;
  marketingModel: LaunchKpiDashboardModel;
  purchases: PurchaseRecord[];
  stripeEvents: StripeEventLogRecord[];
  accounts: AccountSlice[];
  onboarding: OnboardingRecord[];
  journeyProgress: JourneyProgressRecord[];
  socialRoutedSupportCountToday: number;
  socialRoutedSupportCountOpen: number;
  opsErrors?: LaunchOpsErrorRecord[];
  errorLedgerAvailable?: boolean;
  store: LaunchDashboardDatabase;
};

export type MetricTriple = {
  today: number | null;
  cumulative: number | null;
  baseline: number | null | string;
  versusPriorDay: number | null;
  unavailableReason?: string;
};

export type LabeledRate = {
  value: number | null;
  label: string;
  numerator: string;
  denominator: string;
};

export type ErrorRow = {
  category: string;
  productArea: string;
  today: number | null;
  open: number | null;
  severity: RiskSeverity;
  opsSeverity?: OpsErrorSeverity;
  trend: "up" | "down" | "flat" | "n/a";
  source: string;
  kind?: "product_event" | "billing" | "application_server";
};

export type LaunchDashboardModel = {
  generatedAt: string;
  dateEt: string;
  launchLabel: string;
  launchDayNumber: string;
  health: LaunchHealth;
  founderAttentionRequired: boolean;
  criticalIssuesOpen: number;
  healthReasons: string[];
  founderReasons: string[];
  dataFreshness: {
    lastRefresh: string;
    analytics: string;
    marketing: string;
    billing: string;
    support: string;
    risks: string;
    availability: string;
    errors: string;
    cells: FreshnessCell[];
  };
  traffic: {
    websiteSessions: MetricTriple;
    uniqueVisitors: MetricTriple;
    registrationPageSessions: MetricTriple;
    campaignSessions: MetricTriple;
    directSessions: MetricTriple;
    bySource: Array<{ source: string; today: number; cumulative: number }>;
    topSource: string;
  };
  conversion: {
    registrationPage: number;
    registrationStarted: number;
    registrationCompleted: number;
    checkoutStarted: number;
    purchases: number;
    becomeArchitectCta: number;
    journeyExploreCta: number;
    registrationConversion: LabeledRate;
    landingToPurchase: LabeledRate;
    checkoutCompletion: LabeledRate;
    dropOff: Array<{ from: string; to: string; lost: number }>;
    row84Purchases: number;
    row150Purchases: number;
    billingPurchases: number;
  };
  revenue: {
    grossTodayCents: number;
    grossCumulativeCents: number;
    purchasesToday: number;
    purchasesCumulative: number;
    averageTransactionCents: number | null;
    failedPaymentsToday: number;
    failedPaymentsCumulative: number;
    refundsTodayCents: number;
    refundsCumulativeCents: number;
    netTodayCents: number;
    netCumulativeCents: number;
    source: string;
    refundsNote: string;
    historicalPurchases: number;
    historicalRevenueCents: number;
    historicalLabel: string;
    launchPeriodLabel: string;
  };
  activation: {
    definition: string;
    purchased: number;
    accountActive: number;
    onboardingStarted: number;
    onboardingCompleted: number;
    journeyEntered: number;
    activated: number;
    activationRate: LabeledRate;
    purchasedNotActivated: number;
    stalledOnboarding: number;
    stalledJourney: number;
    luminaOpenedToday: number;
    downloadsCompletedToday: number;
    journeyCompleted: number;
    certificateDownloaded: number;
    membershipActivated: number;
  };
  errors: ErrorRow[];
  support: {
    newToday: number;
    open: number;
    resolvedToday: number;
    unresolved: number;
    medianResponseMinutes: number | null;
    approachingSla: number;
    overdue: number;
    p1Open: number;
    p2Open: number;
    repeatIssues: number;
    urgentEscalations: number;
    byCategory: Array<{ category: string; open: number; today: number }>;
    socialRoutedToday: number;
    socialRoutedOpen: number;
    publicFormDelivery: string;
    slaStandard: string;
  };
  risks: LaunchRiskRecord[];
  availability: AvailabilityRecord[];
  qualityIssues: string[];
  briefMarkdown: string;
  viewingFrozenSnapshot: boolean;
};

export const ACTIVATION_DEFINITION =
  "An Activated Architect is a purchaser (paid billing purchase) who has started Architect onboarding. Payment alone is not activation.";

export const SUPPORT_SLA_HOURS = 72;
