/**
 * Row 84 — campaign attribution for The Back Half Social Launch.
 * Does not change archived Row 81 creative. Tracked query params sit on
 * the existing public destination: /register.
 */

export const CAMPAIGN_NAME = "The Back Half Social Launch";
export const CAMPAIGN_DEVICE = "THE QUESTION";
export const CAMPAIGN_UTM = "the-question";
export const CAMPAIGN_MEDIUM = "social";
export const PUBLIC_DESTINATION_PATH = "/register";
export const PUBLIC_DESTINATION_HOST = "https://thebackhalf.org/register";

export const CAMPAIGN_START_DATE_ET = "2026-08-28";
export const LAUNCH_DATE_ET = "2026-08-31";
export const TIMEZONE = "America/New_York";

export const LAUNCH_CHANNELS = ["instagram", "linkedin", "tiktok"] as const;
export type LaunchChannel = (typeof LAUNCH_CHANNELS)[number];

/** Instagram and TikTok are the required August 31 launch reporting channels. */
export const ACTIVE_LAUNCH_CHANNELS = ["instagram", "tiktok"] as const;
export type ActiveLaunchChannel = (typeof ACTIVE_LAUNCH_CHANNELS)[number];

/**
 * LinkedIn remains in LAUNCH_CHANNELS so historical rows, attribution, and
 * optional later entry still work. It is not required for launch KPI reporting.
 */

export const ATTRIBUTION_SOURCES = [
  "instagram",
  "linkedin",
  "tiktok",
  "direct",
  "unknown",
] as const;
export type AttributionSource = (typeof ATTRIBUTION_SOURCES)[number];

export type MarketingAttribution = {
  source: AttributionSource;
  medium: "social" | "none" | "unknown";
  campaign: typeof CAMPAIGN_UTM | "none" | "unknown";
  content: string;
  postDate: string;
};

export const ROW_81_ASSETS = [
  { assetId: "R78-0828-IG", channel: "instagram", dateEt: "2026-08-28", label: "THE QUESTION — Day 1" },
  { assetId: "R78-0828-LI", channel: "linkedin", dateEt: "2026-08-28", label: "THE QUESTION — Day 1" },
  { assetId: "R78-0828-TT", channel: "tiktok", dateEt: "2026-08-28", label: "THE QUESTION — Day 1" },
  { assetId: "R78-0829-IG", channel: "instagram", dateEt: "2026-08-29", label: "THE QUESTION — Day 2" },
  { assetId: "R78-0829-LI", channel: "linkedin", dateEt: "2026-08-29", label: "THE QUESTION — Day 2" },
  { assetId: "R78-0829-TT", channel: "tiktok", dateEt: "2026-08-29", label: "THE QUESTION — Day 2" },
  { assetId: "R78-0830-IG", channel: "instagram", dateEt: "2026-08-30", label: "THE QUESTION — Day 3" },
  { assetId: "R78-0830-LI", channel: "linkedin", dateEt: "2026-08-30", label: "THE QUESTION — Day 3" },
  { assetId: "R78-0830-TT", channel: "tiktok", dateEt: "2026-08-30", label: "THE QUESTION — Day 3" },
  { assetId: "R81-0831-IG", channel: "instagram", dateEt: "2026-08-31", label: "LAUNCH DAY" },
  { assetId: "R81-0831-LI", channel: "linkedin", dateEt: "2026-08-31", label: "LAUNCH DAY" },
  { assetId: "R81-0831-TT", channel: "tiktok", dateEt: "2026-08-31", label: "LAUNCH DAY" },
] as const;

export type Row81AssetId = (typeof ROW_81_ASSETS)[number]["assetId"];

const ASSET_IDS = new Set(ROW_81_ASSETS.map((asset) => asset.assetId));

export function isLaunchChannel(value: string): value is LaunchChannel {
  return (LAUNCH_CHANNELS as readonly string[]).includes(value);
}

export function isActiveLaunchChannel(
  value: string,
): value is ActiveLaunchChannel {
  return (ACTIVE_LAUNCH_CHANNELS as readonly string[]).includes(value);
}

export function isRow81AssetId(value: string): value is Row81AssetId {
  return ASSET_IDS.has(value as Row81AssetId);
}

export function dateEt(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function unknownAttribution(): MarketingAttribution {
  return {
    source: "unknown",
    medium: "unknown",
    campaign: "unknown",
    content: "",
    postDate: "",
  };
}

export function directAttribution(): MarketingAttribution {
  return {
    source: "direct",
    medium: "none",
    campaign: "none",
    content: "",
    postDate: "",
  };
}

function normalizeSource(value: string | null | undefined): AttributionSource {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "ig") return "instagram";
  if (raw === "li") return "linkedin";
  if (raw === "tt") return "tiktok";
  if ((ATTRIBUTION_SOURCES as readonly string[]).includes(raw)) {
    return raw as AttributionSource;
  }
  if (!raw) return "direct";
  return "unknown";
}

export function parseAttributionFromSearch(
  search: URLSearchParams | Record<string, string | null | undefined>,
): MarketingAttribution {
  const get = (key: string) => {
    if (search instanceof URLSearchParams) {
      return search.get(key);
    }
    return search[key];
  };

  const source = normalizeSource(get("utm_source"));
  const mediumRaw = (get("utm_medium") ?? "").trim().toLowerCase();
  const campaignRaw = (get("utm_campaign") ?? "").trim().toLowerCase();
  const content = (get("utm_content") ?? "").trim();
  const postDate = (get("utm_id") ?? "").trim();

  const hasUtm = Boolean(
    get("utm_source") || get("utm_medium") || get("utm_campaign") || get("utm_content"),
  );

  if (!hasUtm) {
    return directAttribution();
  }

  return {
    source,
    medium: mediumRaw === "social" ? "social" : mediumRaw ? "unknown" : "none",
    campaign: campaignRaw === CAMPAIGN_UTM ? CAMPAIGN_UTM : campaignRaw ? "unknown" : "none",
    content: isRow81AssetId(content) ? content : content,
    postDate: /^\d{4}-\d{2}-\d{2}$/.test(postDate) ? postDate : "",
  };
}

export function parseAttributionFromUnknown(
  value: unknown,
): MarketingAttribution {
  if (!value || typeof value !== "object") {
    return unknownAttribution();
  }
  const record = value as Record<string, unknown>;
  return parseAttributionFromSearch({
    utm_source: typeof record.source === "string" ? record.source : "",
    utm_medium: typeof record.medium === "string" ? record.medium : "",
    utm_campaign: typeof record.campaign === "string" ? record.campaign : "",
    utm_content: typeof record.content === "string" ? record.content : "",
    utm_id: typeof record.postDate === "string" ? record.postDate : "",
  });
}

export function parseAttributionFromStripeMetadata(
  metadata: Record<string, string> | null | undefined,
): MarketingAttribution {
  if (!metadata) return unknownAttribution();
  const has = metadata.bh_utm_source || metadata.bh_utm_campaign || metadata.bh_utm_content;
  if (!has) return unknownAttribution();
  return parseAttributionFromSearch({
    utm_source: metadata.bh_utm_source,
    utm_medium: metadata.bh_utm_medium,
    utm_campaign: metadata.bh_utm_campaign,
    utm_content: metadata.bh_utm_content,
    utm_id: metadata.bh_utm_id,
  });
}

export function attributionToStripeMetadata(
  attribution: MarketingAttribution,
): Record<string, string> {
  return {
    bh_utm_source: attribution.source,
    bh_utm_medium: attribution.medium,
    bh_utm_campaign: attribution.campaign,
    bh_utm_content: attribution.content,
    bh_utm_id: attribution.postDate,
  };
}

export function trackedRegisterUrl(assetId: Row81AssetId): string {
  const asset = ROW_81_ASSETS.find((entry) => entry.assetId === assetId);
  if (!asset) {
    return PUBLIC_DESTINATION_HOST;
  }
  const params = new URLSearchParams({
    utm_source: asset.channel,
    utm_medium: CAMPAIGN_MEDIUM,
    utm_campaign: CAMPAIGN_UTM,
    utm_content: asset.assetId,
    utm_id: asset.dateEt,
  });
  return `${PUBLIC_DESTINATION_HOST}?${params.toString()}`;
}

export function isRegistrationLandingPath(path: string): boolean {
  const clean = path.split("?")[0]?.replace(/\/$/, "") || "/";
  return clean === "/register" || clean === "/es/register";
}

export function channelFromAttribution(
  attribution: MarketingAttribution,
): LaunchChannel | "direct" | "unknown" {
  if (isLaunchChannel(attribution.source)) return attribution.source;
  if (attribution.source === "direct") return "direct";
  return "unknown";
}

export function STORAGE_KEY(): string {
  return "bh-mkt-attr";
}
