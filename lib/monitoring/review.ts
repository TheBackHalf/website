import { runProductionMonitoring } from "@/lib/monitoring/run";
import { loadMonitoringSnapshot } from "@/lib/monitoring/snapshot";
import type { ProductionMonitoringSnapshot } from "@/lib/monitoring/types";

const STALE_MS = 10 * 60 * 1000;

export type Row61ReviewModel = {
  snapshot: ProductionMonitoringSnapshot;
  rowComplete: false;
  secretsDisplayed: false;
};

export async function getRow61ReviewModel(): Promise<Row61ReviewModel> {
  const existing = await loadMonitoringSnapshot().catch(() => null);
  const stale =
    !existing ||
    Number.isNaN(Date.parse(existing.generatedAt)) ||
    Date.now() - Date.parse(existing.generatedAt) > STALE_MS;
  const snapshot = stale
    ? await runProductionMonitoring({
        includeControlledError:
          existing?.errors.controlledTest !== "verified_and_removed",
      })
    : existing;
  return {
    snapshot,
    rowComplete: false,
    secretsDisplayed: false,
  };
}
