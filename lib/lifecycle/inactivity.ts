import { getJourneyProgressStore } from "@/lib/journey/progress/store";
import { INACTIVITY_DELAY_MS } from "@/lib/lifecycle/catalog";
import { dispatchLifecycleAutomation } from "@/lib/lifecycle/dispatch";

export type InactivityScanResult = {
  scanned: number;
  eligible: number;
  dispatched: number;
  skippedDuplicate: number;
  skippedNotConfigured: number;
  failed: number;
};

function isCompleted(status: string): boolean {
  return status === "journey_completed";
}

/**
 * Delayed inactivity trigger. Runs from the authenticated cron route.
 * One nudge per inactivity episode (keyed by last progress timestamp).
 */
export async function runInactivityScan(now = new Date()): Promise<InactivityScanResult> {
  const result: InactivityScanResult = {
    scanned: 0,
    eligible: 0,
    dispatched: 0,
    skippedDuplicate: 0,
    skippedNotConfigured: 0,
    failed: 0,
  };

  const records = await getJourneyProgressStore().listProgress();
  result.scanned = records.length;
  const cutoff = now.getTime() - INACTIVITY_DELAY_MS;

  for (const record of records) {
    if (isCompleted(record.status)) continue;
    const updated = Date.parse(record.updatedAt);
    if (!Number.isFinite(updated) || updated > cutoff) continue;
    result.eligible += 1;

    const dispatch = await dispatchLifecycleAutomation({
      automationId: "inactivity.journey_nudge",
      userId: record.userId,
      idempotencyKey: `lifecycle:inactivity.journey_nudge:${record.userId}:${record.updatedAt}`,
      payload: {
        chapterId: record.chapterId,
        status: record.status,
        source: "inactivity_scan",
      },
    });

    if (dispatch.status === "sent") result.dispatched += 1;
    else if (dispatch.status === "skipped_duplicate") result.skippedDuplicate += 1;
    else if (dispatch.status === "skipped_not_configured") result.skippedNotConfigured += 1;
    else if (dispatch.status === "failed") result.failed += 1;
    else if (dispatch.status === "recorded_existing") result.dispatched += 1;
  }

  return result;
}
