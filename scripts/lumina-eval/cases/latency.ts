import { sendLuminaMessageForUser } from "@/lib/lumina/actions/send-message";
import { assert } from "../assert";
import type { EvalUsers } from "../harness";
import { withFreshConversation } from "../harness";

export type LatencySummary = {
  runs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  samplesMs: number[];
};

const STUB_MAX_MS = 5000;
const DEFAULT_RUNS = 20;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

export async function runLatencyCases(
  users: EvalUsers,
): Promise<LatencySummary> {
  const { userA } = users;
  const conversation = await withFreshConversation(userA.id);
  const samplesMs: number[] = [];

  for (let i = 0; i < DEFAULT_RUNS; i += 1) {
    const started = performance.now();
    const result = await sendLuminaMessageForUser(userA.id, {
      conversationId: conversation.id,
      content: `Latency probe ${i + 1}`,
      routeLocale: "en",
    });
    const elapsed = performance.now() - started;
    samplesMs.push(elapsed);
    assert(result.status === "ok", `Latency run ${i + 1} must succeed`);
  }

  const sorted = [...samplesMs].sort((a, b) => a - b);
  const summary: LatencySummary = {
    runs: samplesMs.length,
    p50Ms: Number(percentile(sorted, 50).toFixed(2)),
    p95Ms: Number(percentile(sorted, 95).toFixed(2)),
    maxMs: Number(Math.max(...samplesMs).toFixed(2)),
    samplesMs,
  };

  assert(
    summary.maxMs < STUB_MAX_MS,
    `Stub latency max must be < ${STUB_MAX_MS}ms`,
    `maxMs=${summary.maxMs}`,
  );

  return summary;
}
