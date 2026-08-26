import { redactPersistError } from "@/lib/fab-5/michelle-db";
import { getAnalyticsStore } from "@/lib/analytics/store";
import { sanitizeAnalyticsPayload } from "@/lib/analytics/privacy";
import {
  EVENT_VERSION,
  isAnalyticsEventName,
  productAreaFromPath,
  type AnalyticsEventName,
  type ProductArea,
} from "@/lib/analytics/taxonomy";
import type { AnalyticsEventRecord } from "@/lib/analytics/types";
import type { MarketingAttribution } from "@/lib/marketing-kpi/attribution";

export type TrackProductEventInput = {
  name: AnalyticsEventName;
  idempotencyKey: string;
  userId?: string;
  anonymousId?: string;
  path?: string;
  locale?: "en" | "es";
  productArea?: ProductArea;
  attribution?: MarketingAttribution;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

function attributionPayload(attribution?: MarketingAttribution) {
  if (!attribution) return {};
  return {
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    assetId: attribution.content || undefined,
    postDate: attribution.postDate || undefined,
  };
}

export async function trackProductEvent(
  input: TrackProductEventInput,
): Promise<{ status: "created" | "duplicate" | "ignored"; record?: AnalyticsEventRecord }> {
  if (!isAnalyticsEventName(input.name)) {
    return { status: "ignored" };
  }

  try {
    const payload = sanitizeAnalyticsPayload({
      eventVersion: EVENT_VERSION,
      locale: input.locale,
      productArea: input.productArea ?? (input.path ? productAreaFromPath(input.path) : undefined),
      path: input.path,
      page: input.path,
      anonymousId: input.anonymousId,
      identity: input.userId ? "authenticated" : "anonymous",
      ...attributionPayload(input.attribution),
      ...input.payload,
    });

    const result = await getAnalyticsStore().appendEvent({
      name: input.name,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      payload,
      createdAt: input.createdAt,
    });
    return result;
  } catch (error) {
    console.error("[analytics] persist_failed", redactPersistError(error));
    return { status: "ignored" };
  }
}
