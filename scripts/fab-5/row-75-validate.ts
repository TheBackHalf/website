/**
 * Narrow Row 75 validation. Time-bounded DNS/RDAP/TLS/HTTP.
 * Does not change DNS, nameservers, registrar, Vercel domains, or SSL.
 * Does not mark Complete. Does not retry failed external checks.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { buildRow75ReviewModel } from "@/lib/fab-5/row75-review";
import {
  collectRow75Evidence,
  row75TextContainsSecrets,
  ROW75_REVIEW_PATH,
  ROW75_VALIDATION_PATH,
} from "@/lib/fab-5/row75-domain";

async function probeLocal(pathName: string): Promise<{ path: string; status: number }> {
  try {
    const response = await fetch(`http://localhost:3000${pathName}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    return { path: pathName, status: response.status };
  } catch {
    return { path: pathName, status: 0 };
  }
}

async function main() {
  const evidence = await collectRow75Evidence();
  const model = buildRow75ReviewModel(evidence);

  const http = {
    review: { path: ROW75_REVIEW_PATH, status: 0 },
    registerPage: await probeLocal("/register"),
    login: await probeLocal("/login"),
    lumina: await probeLocal("/lumina"),
    support: await probeLocal("/support"),
    health: await probeLocal("/api/ops/health"),
    admin: await probeLocal("/ops/admin"),
  };

  const result = {
    generatedAt: new Date().toISOString(),
    secretsPrinted: false,
    markedComplete: false,
    dnsChanged: false,
    nameserversChanged: false,
    vercelDomainsChanged: false,
    sslChanged: false,
    evidence,
    scorecard: {
      priorStalledRunRecovered: model.priorStalledRunRecovered,
      domain: model.domain,
      dns: model.dns,
      ssl: model.ssl,
      continuity: model.continuity,
      regression: model.regression,
      defectsCorrected: model.defectsCorrected,
      founderActionsRequired: model.founderActionsRequired,
      actualLaunchBlockers: model.actualLaunchBlockers,
      remainingRow75Blockers: model.remainingRow75Blockers,
    },
    http,
    readyForFounderAcceptance: model.readyForFounderAcceptance,
    finalStatus: model.finalStatus,
  };

  const serialized = JSON.stringify(result, null, 2);
  if (row75TextContainsSecrets(serialized)) {
    throw new Error("row75_validation_matched_secret_pattern");
  }

  const out = path.join(process.cwd(), ROW75_VALIDATION_PATH);
  writeFileSync(out, `${serialized}\n`, "utf8");

  http.review = await probeLocal(ROW75_REVIEW_PATH);
  writeFileSync(
    out,
    `${JSON.stringify({ ...result, http }, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        pass: model.readyForFounderAcceptance,
        finalStatus: model.finalStatus,
        remainingRow75Blockers: model.remainingRow75Blockers,
        out,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "row75_failed");
  process.exit(1);
});
