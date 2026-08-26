import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OperatingAgentId, OrchestrationResult, RunTrace, TraceEvent } from "@/lib/fab-5/types";

const SECRET_PATTERN =
  /(sk_live_|sk_test_|sk-[A-Za-z0-9_-]{8,}|whsec_|password|api[_-]?key|bearer\s+[a-z0-9._-]+|AUTH_SECRET)/i;

export function createTrace(input: {
  runId: string;
  initiatingRequest: string;
  rowNumber?: number;
}): RunTrace {
  return {
    runId: input.runId,
    startedAt: new Date().toISOString(),
    initiatingRequest: sanitize(input.initiatingRequest),
    rowNumber: input.rowNumber,
    manager: "michelle",
    events: [],
  };
}

export function appendTrace(
  trace: RunTrace,
  type: string,
  detail: Record<string, unknown>,
  agent?: OperatingAgentId,
): void {
  const event: TraceEvent = {
    at: new Date().toISOString(),
    type,
    detail: sanitizeDetail(detail),
  };
  if (agent) event.agent = agent;
  trace.events.push(event);
}

export async function persistTrace(
  trace: RunTrace,
  result: OrchestrationResult,
  destDir?: string,
): Promise<string> {
  trace.endedAt = new Date().toISOString();
  trace.result = result;
  const dir = destDir ?? ".data/fab-5/traces";
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${trace.runId}.json`);
  await writeFile(filePath, JSON.stringify(trace, null, 2), "utf8");
  return filePath;
}

function sanitize(value: string): string {
  return value.replace(SECRET_PATTERN, "[redacted]");
}

function sanitizeDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (typeof value === "string") {
      out[key] = sanitize(value);
    } else if (value && typeof value === "object") {
      out[key] = JSON.parse(sanitize(JSON.stringify(value)));
    } else {
      out[key] = value;
    }
  }
  return out;
}
