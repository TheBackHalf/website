/**
 * Row 84 TEST D only: production Postgres write → fresh invocation → read → cleanup.
 * Never prints secrets. Does not mark the row Complete. Does not create a purchase.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function normalizeSecret(value: string): string {
  let next = value.trim().replace(/^\uFEFF/, "");
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("'") && next.endsWith("'"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

function readEnvLocalName(name: string): string | undefined {
  const filePath = path.join(process.cwd(), ".env.local");
  if (!existsSync(filePath)) return undefined;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let key = line.slice(0, eq).trim();
    if (key.startsWith("export ")) key = key.slice(7).trim();
    if (key !== name) continue;
    const value = normalizeSecret(line.slice(eq + 1));
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

type Probe = {
  ok?: boolean;
  error?: string;
  backend?: string;
  found?: boolean;
  idMatch?: boolean;
  storedValueMatches?: boolean;
  stored?: boolean;
  deleted?: boolean;
  remaining?: boolean;
  dataDirIsSourceOfTruth?: boolean;
  hosted?: boolean;
  tables?: Record<string, boolean>;
  historicalPurchases?: number;
  launchPurchases?: number;
  launchRevenueCents?: number;
  id?: string;
};

async function call(
  host: string,
  secret: string,
  action: "write" | "retrieve" | "cleanup",
  key: string,
): Promise<{ status: number; json: Probe }> {
  const response = await fetch(`https://${host}/api/fab-5/kpi-durability`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, key }),
  });
  let json: Probe = {};
  try {
    json = (await response.json()) as Probe;
  } catch {
    json = { error: "invalid_json_response" };
  }
  return { status: response.status, json };
}

async function main() {
  const secret = readEnvLocalName("CRON_SECRET");
  if (!secret) {
    console.log("TEST_D=FAIL");
    console.log("REASON=cron_secret_absent");
    process.exit(1);
  }

  const hosts = ["thebackhalf.org", "website-two-psi-49.vercel.app"];
  const key = `row84-durability-${Date.now().toString(36)}`;
  const publicProbe = await fetch("https://thebackhalf.org/api/fab-5/kpi-durability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "retrieve", key }),
  });

  let chosenHost = "";
  let write: { status: number; json: Probe } | undefined;
  let retrieve: { status: number; json: Probe } | undefined;
  let cleanup: { status: number; json: Probe } | undefined;
  let confirmGone: { status: number; json: Probe } | undefined;

  for (const host of hosts) {
    write = await call(host, secret, "write", key);
    if (write.status === 404) continue;
    retrieve = await call(host, secret, "retrieve", key);
    cleanup = await call(host, secret, "cleanup", key);
    confirmGone = await call(host, secret, "retrieve", key);
    chosenHost = host;
    break;
  }

  const tables = retrieve?.json.tables ?? write?.json.tables;
  const tablesOk = Boolean(
    tables?.marketing_kpi_events &&
      tables?.marketing_kpi_social_daily &&
      tables?.marketing_kpi_purchases &&
      tables?.marketing_kpi_meta,
  );
  const writeOk = write?.status === 200 && write.json.ok === true && write.json.backend === "supabase_postgres";
  const retrieveOk =
    retrieve?.status === 200 &&
    retrieve.json.found === true &&
    retrieve.json.idMatch === true &&
    retrieve.json.storedValueMatches === true &&
    retrieve.json.backend === "supabase_postgres" &&
    retrieve.json.dataDirIsSourceOfTruth === false;
  const cleanupOk =
    cleanup?.status === 200 &&
    cleanup.json.ok === true &&
    cleanup.json.deleted === true &&
    confirmGone?.json.found === false;
  const pass = writeOk && retrieveOk && cleanupOk && tablesOk && publicProbe.status !== 200;

  const dashboard = await fetch("https://thebackhalf.org/ops/admin/launch-kpi", {
    redirect: "manual",
  });
  const register = await fetch("https://thebackhalf.org/register", { redirect: "manual" });
  const archive = existsSync(
    path.join(process.cwd(), "approved-assets/row-81-social-launch/ROW-81-ASSET-MANIFEST.md"),
  );

  const evidence = {
    row: 84,
    test: "D",
    at: new Date().toISOString(),
    host: chosenHost || "none",
    testId: key,
    publicUnauthenticatedStatus: publicProbe.status,
    write: {
      status: write?.status ?? null,
      ok: write?.json.ok ?? false,
      backend: write?.json.backend ?? null,
      stored: write?.json.stored ?? false,
    },
    retrieve: {
      status: retrieve?.status ?? null,
      found: retrieve?.json.found ?? false,
      idMatch: retrieve?.json.idMatch ?? false,
      storedValueMatches: retrieve?.json.storedValueMatches ?? false,
      backend: retrieve?.json.backend ?? null,
      dataDirIsSourceOfTruth: retrieve?.json.dataDirIsSourceOfTruth ?? null,
      hosted: retrieve?.json.hosted ?? null,
      historicalPurchases: retrieve?.json.historicalPurchases ?? null,
      launchPurchases: retrieve?.json.launchPurchases ?? null,
      launchRevenueCents: retrieve?.json.launchRevenueCents ?? null,
    },
    cleanup: {
      status: cleanup?.status ?? null,
      ok: cleanup?.json.ok ?? false,
      deleted: cleanup?.json.deleted ?? false,
      remainingAfter: confirmGone?.json.found ?? null,
    },
    tables,
    dashboardLoadStatus: dashboard.status,
    registerStatus: register.status,
    row81ArchivePresent: archive,
    result: pass ? "PASS" : "FAIL",
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/row-84-test-d-durability.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify({ result: evidence.result, host: chosenHost, testId: key, writeOk, retrieveOk, cleanupOk, tablesOk, publicStatus: publicProbe.status }, null, 2));
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "test_d_failed");
  process.exit(1);
});
