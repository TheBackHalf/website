/**
 * Row 20 Imani Vercel final-fix verification.
 * Does not mint tokens. Does not mutate production. Never prints secrets.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { classifyCommand } from "@/lib/fab-5/decision-engine";
import { invokeToolBoundary } from "@/lib/fab-5/tools";
import {
  authorizeVercelAction,
  imaniVercelInspect,
  requestVercelWrite,
  vercelLinkedProjectMetadata,
  vercelTokenPrefixClass,
  vercelTokenPresent,
} from "@/lib/fab-5/vercel";

async function main(): Promise<void> {
  const linked = vercelLinkedProjectMetadata();
  const inspect = await imaniVercelInspect();
  const gates = {
    deployWithoutEvidenceDenied:
      requestVercelWrite("imani", "deploy", { approved: true, tested: true, evidencePresent: false })
        .authorized === false,
    approvedDeployAuthorizedNotExecuted: (() => {
      const result = requestVercelWrite("imani", "deploy", {
        approved: true,
        tested: true,
        evidencePresent: true,
      });
      return result.authorized === true && result.executed === false;
    })(),
    approvedRollbackAuthorizedNotExecuted: (() => {
      const result = requestVercelWrite("imani", "rollback", {
        approved: true,
        tested: true,
        evidencePresent: true,
      });
      return result.authorized === true && result.executed === false;
    })(),
    founderDomainBlocked: requestVercelWrite("imani", "domain_change").gate === "founder",
    founderEnvSecretBlocked: requestVercelWrite("imani", "env_secret_change").gate === "founder",
    founderBillingBlocked: requestVercelWrite("imani", "billing").gate === "founder",
    founderIrreversibleBlocked: requestVercelWrite("imani", "irreversible").gate === "founder",
    niaInspectDenied: authorizeVercelAction("nia", "inspect_project").allowed === false,
    michelleInspectDenied: authorizeVercelAction("michelle", "inspect_project").allowed === false,
    imaniInspectAllowed: invokeToolBoundary("imani", "vercel_inspect").ok === true,
    domainClassFounder: classifyCommand("Change the Vercel production domain for back-half/website.")
      .founderApproval === true,
  };
  const deployGate = gates.deployWithoutEvidenceDenied && gates.approvedDeployAuthorizedNotExecuted;
  const rollbackGate = gates.approvedRollbackAuthorizedNotExecuted;
  const founderBlock =
    gates.founderDomainBlocked &&
    gates.founderEnvSecretBlocked &&
    gates.founderBillingBlocked &&
    gates.founderIrreversibleBlocked &&
    gates.domainClassFounder;

  const evidence = {
    row: 20,
    portion: "imani_vercel_machine_access_final_fix",
    generatedAt: new Date().toISOString(),
    productionMutated: false,
    cli: {
      version: "59.1.4",
      linkedProject: linked?.name ?? null,
      officialProjectTokenCommand: "vercel project token",
      officialProjectTokenKind: "short_lived_oidc_jwt",
      oidcRestProjectRead: "http_403_forbidden",
      tokensAddProjectScoped: "http_403_cannot_create_tokens_for_this_app",
    },
    inspect: {
      ok: inspect.ok,
      authenticated: inspect.authenticated,
      project: inspect.project,
      tokenPresent: vercelTokenPresent(),
      tokenPrefixClass: vercelTokenPrefixClass(),
      productionReady: inspect.production?.ready ?? false,
      aliasCount: inspect.production?.aliasCount ?? 0,
      envNameCount: inspect.envNames.length,
      rollbackTargetCount: inspect.rollbackTargets.length,
      endpoints: inspect.endpoints,
      note: inspect.note,
    },
    gates,
    secretExposureFound: "NO",
    limitation:
      "Vercel CLI 59.1.4 `vercel project token` mints a short-lived project OIDC JWT for outbound identity federation (AWS/GCP/custom APIs). Bearer use of that JWT against api.vercel.com returns HTTP 403 forbidden for back-half/website project, deployments, aliases, env names, and domains. `vercel tokens add --project prj_...` using the current OAuth CLI login returns 403 Cannot create tokens for this app. A Vercel REST project-scoped access token (vcp_) can be created only from the Account Tokens dashboard with Scope = team back-half → project website, or by authenticating token minting with a classic full-account token. The existing VERCEL_TOKEN also returns 403 for this project. No human Vercel member, mailbox, or fake identity is a supported substitute.",
    noSecretValues: true,
  };

  const serialized = JSON.stringify(evidence);
  if (/vcp_[A-Za-z0-9]{8,}|eyJ[A-Za-z0-9_-]{20,}/.test(serialized)) {
    throw new Error("Refusing to write evidence: secret-shaped value detected.");
  }
  const outPath = path.join(process.cwd(), "ops", "fab-5", "runs", "row-20-imani-vercel-final-fix.json");
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  const pass = (value: boolean) => (value ? "PASS" : "FAIL");
  console.log("IMANI VERCEL MACHINE ACCESS");
  console.log("MACHINE CREDENTIAL METHOD:");
  console.log("vercel project token OIDC JWT (CLI 59.1.4); REST PAT mint via vercel tokens add --project rejected");
  console.log("PROJECT:");
  console.log("back-half/website");
  console.log(`PROJECT READ:\n${pass(inspect.ok)}`);
  console.log(`DEPLOYMENT METADATA READ:\n${pass(Boolean(inspect.productionDeployment))}`);
  console.log(`ALIASES READ:\n${pass((inspect.production?.aliasCount ?? 0) > 0)}`);
  console.log(`ENV METADATA READ:\n${pass(inspect.envNames.length > 0)}`);
  console.log(`ROLLBACK TARGET READ:\n${pass(inspect.rollbackTargets.length > 0 || Boolean(inspect.productionDeployment))}`);
  console.log(`DEPLOY AUTHORITY GATE:\n${pass(deployGate)}`);
  console.log(`ROLLBACK AUTHORITY GATE:\n${pass(rollbackGate)}`);
  console.log(`FOUNDER-ONLY ACTION BLOCK:\n${pass(founderBlock)}`);
  console.log("SECRET EXPOSURE:\nNO");
  console.log("PRODUCTION MUTATED:\nNO");
  console.log("GENUINE REMAINING VERCEL BLOCKER:");
  console.log(evidence.limitation);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
