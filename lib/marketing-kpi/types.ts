import type {
  LaunchChannel,
  MarketingAttribution,
} from "@/lib/marketing-kpi/attribution";
import type {
  RecordClassification,
  ReportingPeriod,
} from "@/lib/marketing-kpi/period";

export const MARKETING_EVENT_NAMES = [
  "landing_page_session",
  "checkout_start",
  "purchase",
] as const;

export type MarketingEventName = (typeof MARKETING_EVENT_NAMES)[number];

export type MarketingEventRecord = {
  id: string;
  name: MarketingEventName;
  createdAt: string;
  dateEt: string;
  attribution: MarketingAttribution;
  path?: string;
  idempotencyKey: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeEventId?: string;
  amountCents?: number;
  currency?: string;
  test?: boolean;
  period: ReportingPeriod;
  classification: RecordClassification;
};

export type MarketingPurchaseRecord = {
  id: string;
  billingPurchaseId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  stripeEventId?: string;
  amountCents?: number;
  currency?: string;
  paidAt: string;
  dateEt: string;
  attribution: MarketingAttribution;
  test: boolean;
  livemode?: boolean;
  period: ReportingPeriod;
  classification: RecordClassification;
  status: "paid" | "failed" | "refunded" | "reversed";
};

/** null = N/A — Not Available From Source. 0 = measured zero. */
export type SocialDailyRecord = {
  id: string;
  dateEt: string;
  channel: LaunchChannel;
  reach: number | null;
  impressions: number | null;
  engagements: number | null;
  followers: number | null;
  followerGrowth: number | null;
  linkClicks: number | null;
  enteredBy: string;
  enteredAt: string;
  sourceSystem: "native-instagram" | "native-linkedin" | "native-tiktok";
  verifiedBy?: string;
  notes?: string;
};

export type MarketingKpiDatabase = {
  events: MarketingEventRecord[];
  socialDaily: SocialDailyRecord[];
  purchases: MarketingPurchaseRecord[];
  lastUpdatedAt: string;
};

export type KpiDurabilityBackend =
  | "supabase_postgres"
  | "file_test_override"
  | "unconfigured_production";

export type DataQualityIssue = {
  code:
    | "missing_daily_social"
    | "duplicate_entry"
    | "invalid_date"
    | "negative_count"
    | "rate_out_of_range"
    | "purchase_unattributed"
    | "total_mismatch"
    | "broken_attribution";
  severity: "warning" | "error";
  message: string;
};

export type NullableCount = number | null;

export type FunnelRates = {
  clickThroughRate: number | null;
  landingContinuation: number | null;
  checkoutStartRate: number | null;
  purchaseConversion: number | null;
  checkoutCompletion: number | null;
  overallLaunchConversion: number | null;
  overallLaunchConversionDenominator: "landing_page_sessions";
};

export type ChannelKpiSlice = {
  channel: LaunchChannel | "direct" | "unknown" | "all";
  reach: NullableCount;
  impressions: NullableCount;
  engagements: NullableCount;
  engagementRate: number | null;
  followers: NullableCount;
  followerGrowth: NullableCount;
  linkClicks: NullableCount;
  landingPageSessions: number;
  checkoutStarts: number;
  purchases: number;
  conversionRate: number | null;
  conversionDenominator: "landing_page_sessions";
  rates: FunnelRates;
  availabilityNotes: string[];
};

export type DailyKpiSlice = {
  dateEt: string;
  label: string;
  channels: ChannelKpiSlice[];
  totals: ChannelKpiSlice;
  vsPriorDay: {
    landingPageSessions: number | null;
    purchases: number | null;
    engagements: NullableCount;
  };
  vsBaseline: {
    followerGrowth: NullableCount;
    purchases: number | null;
  };
  issues: DataQualityIssue[];
};

export type AssetKpiSlice = {
  assetId: string;
  channel: LaunchChannel | "unknown";
  dateEt: string;
  label: string;
  landingPageSessions: number;
  checkoutStarts: number;
  purchases: number;
  socialLinkClicks: NullableCount;
};
