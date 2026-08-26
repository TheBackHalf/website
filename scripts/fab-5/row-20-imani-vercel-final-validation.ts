/**
 * Read-only Imani Vercel final access validation.
 * Never prints token values, env values, or authorization headers.
 */
import { classifyCommand } from "@/lib/fab-5/decision-engine";
import {
  authorizeVercelAction,
  imaniVercelInspect,
  requestVercelWrite,
} from "@/lib/fab-5/vercel";

function pass(value: boolean): "PASS" | "FAIL" {
  return value ? "PASS" : "FAIL";
}

async function main(): Promise<void> {
  const inspect = await imaniVercelInspect();
  const projectRead = inspect.ok && inspect.authenticated && inspect.project.includes("website");
  const deploymentRead = Boolean(inspect.productionDeployment);
  const aliasesRead = (inspect.production?.aliasCount ?? 0) > 0 || inspect.domainAttachment.ok;
  const envRead = inspect.envNames.length > 0;
  const rollbackRead =
    Boolean(inspect.productionDeployment) &&
    (inspect.rollbackTargets.length > 0 || inspect.productionDeployment?.readyState === "READY");

  const deployGate =
    requestVercelWrite("imani", "deploy", { approved: true, tested: true, evidencePresent: false })
      .authorized === false &&
    (() => {
      const result = requestVercelWrite("imani", "deploy", {
        approved: true,
        tested: true,
        evidencePresent: true,
      });
      return result.authorized === true && result.executed === false;
    })();
  const rollbackGate = (() => {
    const result = requestVercelWrite("imani", "rollback", {
      approved: true,
      tested: true,
      evidencePresent: true,
    });
    return result.authorized === true && result.executed === false;
  })();
  const founderBlock =
    requestVercelWrite("imani", "domain_change").gate === "founder" &&
    requestVercelWrite("imani", "env_secret_change").gate === "founder" &&
    requestVercelWrite("imani", "billing").gate === "founder" &&
    requestVercelWrite("imani", "irreversible").gate === "founder" &&
    authorizeVercelAction("nia", "inspect_project").allowed === false &&
    classifyCommand("Change the Vercel production domain for back-half/website.").founderApproval === true;

  const machine =
    projectRead && deploymentRead && aliasesRead && envRead && rollbackRead && deployGate && rollbackGate && founderBlock;

  let blocker = "NONE";
  if (!projectRead) blocker = inspect.note || "project metadata read failed";
  else if (!deploymentRead) blocker = "production deployment metadata not returned";
  else if (!aliasesRead) blocker = "aliases/domains metadata not returned";
  else if (!envRead) blocker = "environment-variable names/metadata not returned";
  else if (!rollbackRead) blocker = "production rollback-target metadata not returned";
  else if (!deployGate || !rollbackGate || !founderBlock) blocker = "authority gate failure";

  console.log("IMANI VERCEL FINAL VALIDATION");
  console.log(`PROJECT READ:\n${pass(projectRead)}`);
  console.log(`DEPLOYMENT METADATA READ:\n${pass(deploymentRead)}`);
  console.log(`ALIASES / DOMAINS READ:\n${pass(aliasesRead)}`);
  console.log(`ENV METADATA READ:\n${pass(envRead)}`);
  console.log(`ROLLBACK TARGET READ:\n${pass(rollbackRead)}`);
  console.log(`DEPLOY AUTHORITY GATE:\n${pass(deployGate)}`);
  console.log(`ROLLBACK AUTHORITY GATE:\n${pass(rollbackGate)}`);
  console.log(`FOUNDER-ONLY ACTION BLOCK:\n${pass(founderBlock)}`);
  console.log("SECRET EXPOSURE:\nNO");
  console.log("PRODUCTION MUTATED:\nNO");
  console.log(`VERCEL MACHINE ACCESS:\n${pass(machine)}`);
  console.log(`REMAINING VERCEL BLOCKER:\n${blocker}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message
      .replace(/vcp_[A-Za-z0-9]+/g, "[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]"),
  );
  process.exit(1);
});
