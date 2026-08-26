import { redactPersistError } from "@/lib/fab-5/michelle-db";
import { getAnalyticsStore } from "@/lib/analytics/store";
import { sanitizeAnalyticsPayload } from "@/lib/analytics/privacy";
import type {
  AnalyticsEventName,
  AnalyticsEventRecord,
} from "@/lib/analytics/types";

export async function emitAnalyticsEvent(input: {
  name: AnalyticsEventName;
  userId?: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}): Promise<{
  status: "created" | "duplicate" | "failed";
  record?: AnalyticsEventRecord;
}> {
  try {
    return await getAnalyticsStore().appendEvent({
      name: input.name,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      payload: sanitizeAnalyticsPayload(input.payload),
    });
  } catch (error) {
    console.error("[analytics] persist_failed", redactPersistError(error));
    return { status: "failed" };
  }
}
