import { createMichelleAgent } from "@/lib/fab-5/michelle";
import { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";
import type { OrchestrationResult } from "@/lib/fab-5/types";

export { classifyCommand, parseRowNumber } from "@/lib/fab-5/decision-engine";
export { TOOL_CATALOG, toolsFor } from "@/lib/fab-5/tools";
export { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";
export { createMichelleAgent, orchestrate } from "@/lib/fab-5/michelle";
export { retrieveSources, detectSourceConflict } from "@/lib/fab-5/source";
export { queryAuthority } from "@/lib/fab-5/authority";
export { queryAccess, inspectRepoState, legalIndexForAgents } from "@/lib/fab-5/access";
export {
  authorizeVercelAction,
  imaniVercelInspect,
  requestVercelWrite,
} from "@/lib/fab-5/vercel";
export { runImaniHeartbeat } from "@/lib/fab-5/heartbeat";
export { runMichelleCycle } from "@/lib/fab-5/michelle-runtime";
export { runNiaCycle } from "@/lib/fab-5/nia-runtime";
export { queryLaunchView, remainingDeliverables, unownedRemaining } from "@/lib/fab-5/workstreams";

export async function completeAugustLaunchRow(
  number: number,
  options: { readOnly?: boolean; persistDir?: string; persistTrace?: boolean } = {},
): Promise<OrchestrationResult> {
  const michelle = await createMichelleAgent();
  return michelle.orchestrate(`Complete August Launch Row ${number}.`, {
    mode: options.readOnly === false ? "normal" : "read_only",
    persistDir: options.persistDir,
    persistTrace: options.persistTrace,
  });
}

export async function runFounderCommand(
  command: string,
  options: Parameters<typeof import("@/lib/fab-5/michelle").orchestrate>[1] = {},
): Promise<OrchestrationResult> {
  const michelle = await createMichelleAgent();
  return michelle.orchestrate(command, options);
}

export async function getOperatingAgents() {
  const [michelle, imani, nia] = await Promise.all([
    createMichelleAgent(),
    createImaniAgent(),
    createNiaAgent(),
  ]);
  return { michelle, imani, nia };
}
