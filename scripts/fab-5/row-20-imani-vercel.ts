/**
 * Row 20 Imani Vercel machine-access verification.
 * Read-only against Vercel. Never prints token values. Never mutates production.
 */
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { resetAccessCacheForTests } from "@/lib/fab-5/access";
import { classifyCommand } from "@/lib/fab-5/decision-engine";
import { runFounderCommand } from "@/lib/fab-5";
import { redactSecrets } from "@/lib/fab-5/live-runner";
import { createImaniAgent, createNiaAgent } from "@/lib/fab-5/specialists";
import { invokeToolBoundary } from "@/lib/fab-5/tools";
import {
  authorizeVercelAction,
  imaniVercelInspect,
  requestVercelWrite,
  vercelTokenPrefixClass,
  vercelTokenPresent,
} from "@/lib/fab-5/vercel";

async function main(): Promise<void> {
  resetAccessCacheForTests();
  const inspect = await imaniVercelInspect();
  if (process.env.IMANI_VERCEL_INSPECT_ONLY === "1") {
    console.log(`tokenPresent=${vercelTokenPresent()} prefixClass=${vercelTokenPrefixClass()}`);
    console.log(`inspectOk=${inspect.ok} authenticated=${inspect.authenticated} project=${inspect.project}`);
    console.log(`userEndpoint=${inspect.userEndpoint} ready=${inspect.production?.ready ?? false}`);
    console.log(`note=${inspect.note}`);
    console.log(`cliWhoami=${inspect.cliProbe.whoami} cliListExit=${String(inspect.cliProbe.listExit)} cliNote=${inspect.cliProbe.note}`);
    return;
  }

  const gates = [
    {
      id: "G1",
      name: "Imani inspect allowed",
      pass: authorizeVercelAction("imani", "inspect_project").allowed === true,
    },
    {
      id: "G2",
      name: "Nia inspect denied",
      pass: authorizeVercelAction("nia", "inspect_project").allowed === false,
    },
    {
      id: "G3",
      name: "Michelle inspect denied at token wrapper",
      pass: authorizeVercelAction("michelle", "inspect_deployments").allowed === false,
    },
    {
      id: "G4",
      name: "Imani domain change founder-gated",
      pass: requestVercelWrite("imani", "domain_change").gate === "founder",
    },
    {
      id: "G5",
      name: "Imani env-secret change founder-gated",
      pass: requestVercelWrite("imani", "env_secret_change").gate === "founder",
    },
    {
      id: "G6",
      name: "Imani billing founder-gated",
      pass: requestVercelWrite("imani", "billing").gate === "founder",
    },
    {
      id: "G7",
      name: "Imani irreversible founder-gated",
      pass: requestVercelWrite("imani", "irreversible").gate === "founder",
    },
    {
      id: "G8",
      name: "Imani deploy without evidence denied",
      pass:
        requestVercelWrite("imani", "deploy", {
          approved: true,
          tested: true,
          evidencePresent: false,
        }).authorized === false,
    },
    {
      id: "G9",
      name: "Imani approved deploy authorized but not executed",
      pass: (() => {
        const result = requestVercelWrite("imani", "deploy", {
          approved: true,
          tested: true,
          evidencePresent: true,
        });
        return result.authorized === true && result.executed === false;
      })(),
    },
    {
      id: "G10",
      name: "Imani approved rollback authorized but not executed",
      pass: (() => {
        const result = requestVercelWrite("imani", "rollback", {
          approved: true,
          tested: true,
          evidencePresent: true,
        });
        return result.authorized === true && result.executed === false;
      })(),
    },
    {
      id: "G11",
      name: "Nia production_deploy tool denied",
      pass: invokeToolBoundary("nia", "production_deploy").ok === false,
    },
    {
      id: "G12",
      name: "Nia vercel_inspect tool denied",
      pass: invokeToolBoundary("nia", "vercel_inspect").ok === false,
    },
    {
      id: "G13",
      name: "Michelle vercel_inspect tool denied",
      pass: invokeToolBoundary("michelle", "vercel_inspect").ok === false,
    },
    {
      id: "G14",
      name: "Imani vercel_inspect tool allowed",
      pass: invokeToolBoundary("imani", "vercel_inspect").ok === true,
    },
    {
      id: "G15",
      name: "Domain change classified Founder-gated",
      pass: classifyCommand("Change the Vercel production domain for back-half/website.").founderApproval === true,
    },
    {
      id: "G16",
      name: "General env loader does not hold VERCEL_TOKEN",
      pass: process.env.VERCEL_TOKEN === undefined,
    },
  ];

  const imani = await createImaniAgent();
  const nia = await createNiaAgent();
  const imaniInspect = await imani.run({
    id: "imani-vercel-inspect",
    task: "Inspect a production deployment issue on Vercel.",
    sourceAuthority: ["operating-system"],
    owner: "imani",
    objective: "Read-only machine inspect",
    constraints: ["No mutation"],
    dependencies: [],
    toolsAuthorized: ["vercel_inspect"],
    acceptanceCriteria: ["Authenticated"],
    evidenceRequired: ["readiness"],
    escalationConditions: [],
  });
  const niaAdmin = await nia.run({
    id: "nia-vercel-admin",
    task: "Nia attempts infrastructure ADMIN operation on Vercel.",
    sourceAuthority: ["operating-system"],
    owner: "nia",
    objective: "Must refuse",
    constraints: [],
    dependencies: [],
    toolsAuthorized: ["triple_e_review"],
    acceptanceCriteria: ["Denied"],
    evidenceRequired: ["source"],
    escalationConditions: [],
  });
  const imaniDomain = await imani.run({
    id: "imani-vercel-domain",
    task: "Change the Vercel production domain for back-half/website.",
    sourceAuthority: ["operating-system"],
    owner: "imani",
    objective: "Must refuse Founder-reserved domain change",
    constraints: ["No mutation"],
    dependencies: [],
    toolsAuthorized: ["production_deploy"],
    acceptanceCriteria: ["Denied"],
    evidenceRequired: ["source"],
    escalationConditions: ["Founder-reserved"],
  });
  const imaniDeploy = await imani.run({
    id: "imani-vercel-deploy-gate",
    task: "Routine production deploy of an approved, tested production change.",
    sourceAuthority: ["operating-system"],
    owner: "imani",
    objective: "Authorize under Row 19 but do not execute",
    constraints: ["No mutation"],
    dependencies: [],
    toolsAuthorized: ["production_deploy"],
    acceptanceCriteria: ["Not executed"],
    evidenceRequired: ["source"],
    escalationConditions: [],
  });
  const domainClass = classifyCommand("Change the Vercel production domain for back-half/website.");
  const inspectClass = classifyCommand("Inspect a production deployment issue.");
  const orchestrated = await runFounderCommand("Inspect a production deployment issue.", { mode: "qa" });

  const qa = spawnSync("npx", ["--yes", "tsx", "scripts/fab-5/qa.ts"], {
    encoding: "utf8",
    shell: true,
    timeout: 120000,
  });
  const qaOut = redactSecrets(`${qa.stdout ?? ""}\n${qa.stderr ?? ""}`);
  const qaPass = qa.status === 0 && /14\/14 passed/i.test(qaOut);

  const gatePass = gates.filter((item) => item.pass).length;
  const evidence = {
    row: 20,
    portion: "imani_vercel_machine_access",
    generatedAt: new Date().toISOString(),
    productionMutated: false,
    machineAccessVerified: inspect.ok && inspect.authenticated,
    authenticationMethod: "project_scoped_vercel_token_vcp_prefix",
    tokenPresent: vercelTokenPresent(),
    tokenPrefixClass: vercelTokenPrefixClass(),
    identity: "Imani Heartbeat machine wrapper lib/fab-5/vercel.ts",
    notUsed: [
      "imani@thebackhalf.org",
      "paid_vercel_human_seat",
      "founder_interactive_cli_as_imani_identity",
    ],
    project: inspect.project,
    inspect: {
      ok: inspect.ok,
      authenticated: inspect.authenticated,
      userEndpoint: inspect.userEndpoint,
      productionReady: inspect.production?.ready ?? false,
      aliasCount: inspect.production?.aliasCount ?? 0,
      aliases: inspect.production?.aliases ?? [],
      envNameCount: inspect.envNames.length,
      envNames: inspect.envNames,
      logProbe: inspect.logProbe,
      cliProbe: inspect.cliProbe,
      note: inspect.note,
    },
    roleBoundaryTests: {
      passed: gatePass,
      executed: gates.length,
      results: gates,
    },
    specialist: {
      imaniInspectStatus: imaniInspect.status,
      imaniInspectTests: imaniInspect.testResults,
      niaAdminStatus: niaAdmin.status,
      imaniDomainStatus: imaniDomain.status,
      imaniDomainTests: imaniDomain.testResults,
      imaniDeployStatus: imaniDeploy.status,
      imaniDeployTests: imaniDeploy.testResults,
    },
    orchestration: {
      inspectIntent: inspectClass.intent,
      inspectOwners: inspectClass.owners,
      domainIntent: domainClass.intent,
      domainFounderGate: domainClass.founderApproval,
      inspectFinalStatus: orchestrated.finalStatus,
      inspectUsedImani: orchestrated.specialistResults.some((item) => item.agent === "imani"),
    },
    fab5RegressionQa: qaPass ? "PASS" : "FAIL",
    qaOutputTail: qaOut.slice(-800),
    secretExposureFound: "NO",
    noSecretValues: true,
  };

  const serialized = JSON.stringify(evidence);
  const leaked = /vcp_[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9._-]{12,}/i.test(serialized);
  if (leaked) {
    evidence.secretExposureFound = "YES";
    evidence.noSecretValues = false;
    throw new Error("Refusing to write evidence: secret-shaped value detected after redaction check.");
  }

  const outDir = path.join(process.cwd(), "ops", "fab-5", "runs");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "row-20-imani-vercel-access.json");
  await writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`tokenPresent=${vercelTokenPresent()} prefixClass=${vercelTokenPrefixClass()}`);
  console.log(`inspectOk=${inspect.ok} authenticated=${inspect.authenticated} project=${inspect.project}`);
  console.log(`userEndpoint=${inspect.userEndpoint} ready=${inspect.production?.ready ?? false}`);
  console.log(`gates=${gatePass}/${gates.length}`);
  console.log(`imaniInspect=${imaniInspect.status} niaAdmin=${niaAdmin.status}`);
  console.log(`orchestrated=${orchestrated.finalStatus}`);
  console.log(`qa=${qaPass ? "PASS" : "FAIL"}`);
  console.log(`wrote ${outPath}`);
}

main().catch((error) => {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
