/**
 * Local + hosted Michelle stand-up validation. Never prints secrets.
 */
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

import { runMichelleAcceptancePack, runMichelleCycle } from "@/lib/fab-5/michelle-runtime";

function leak(value: string): boolean {
  return /sk_live_|sk_test_|rk_live_|rk_test_|sk-[A-Za-z0-9_-]{8,}|vcp_[A-Za-z0-9]+|whsec_|CRON_SECRET=/.test(value);
}

async function main(): Promise<void> {
  const pack = await runMichelleAcceptancePack();
  const cycle = await runMichelleCycle({
    trigger: "queue",
    task: "Authorized operational readiness review. Do not change the launch date.",
    founderUnavailable: true,
    acceptancePack: false,
  });
  const serialized = JSON.stringify(cycle);
  const evidence = {
    at: new Date().toISOString(),
    localPack: pack,
    localCycleRunId: cycle.runId,
    localHosted: cycle.hosted,
    localOutcome: cycle.outcome,
    localOpenai: cycle.openaiLive,
    localImani: cycle.imaniDelegation,
    persistDurable: (cycle.persist as { durable?: boolean }).durable,
    secretExposure: leak(serialized) ? "YES" : "NO",
  };
  const out = path.join("ops", "fab-5", "runs", "michelle-local-validation.json");
  await writeFile(out, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  const failed = Object.entries(pack).filter(([, value]) => !value.pass);
  console.log(`PACK_FAILS=${failed.length}`);
  for (const [name, value] of Object.entries(pack)) {
    console.log(`${name}=${value.pass ? "PASS" : "FAIL"}`);
  }
  console.log(`CYCLE_RUN_ID=${String(cycle.runId)}`);
  console.log(`CYCLE_OUTCOME=${String(cycle.outcome)}`);
  console.log(`OPENAI=${String(cycle.openaiLive)}`);
  console.log(`IMANI=${JSON.stringify(cycle.imaniDelegation)}`);
  console.log(`PERSIST_DURABLE=${String((cycle.persist as { durable?: boolean }).durable)}`);
  console.log(`SECRET_EXPOSURE=${leak(serialized) ? "YES" : "NO"}`);
  if (failed.length > 0) process.exit(1);
}

void existsSync;
void readFileSync;

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message.replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted]"));
  process.exit(1);
});
