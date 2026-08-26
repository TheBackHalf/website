import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { completeAugustLaunchRow, runFounderCommand } from "@/lib/fab-5";
import { createImaniAgent } from "@/lib/fab-5/specialists";
import { createFab5OpenAIAgents, openaiLiveModelConfigured } from "@/lib/fab-5/openai-agents";
import { detectSourceConflict } from "@/lib/fab-5/source";
import { TOOL_CATALOG, toolsFor } from "@/lib/fab-5/tools";
import type { SourceRecord } from "@/lib/fab-5/types";

type TestResult = { id: string; name: string; pass: boolean; detail: string };

const results: TestResult[] = [];

function record(id: string, name: string, pass: boolean, detail: string): void {
  results.push({ id, name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${id}  ${name}  ${detail}`);
}

async function withTraceDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = path.join(os.tmpdir(), `fab5-qa-${process.pid}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await withTraceDir(async (persistDir) => {
    const mixed = await runFounderCommand(
      "Review technical risk and Triple E experience for the Journey implementation.",
      { mode: "qa", persistDir, persistTrace: true },
    );
    record(
      "TEST 1",
      "MICHELLE ROUTING",
      mixed.assignments.some((item) => item.owner === "imani") &&
        mixed.assignments.some((item) => item.owner === "nia") &&
        mixed.specialistResults.length >= 2,
      `assignments=${mixed.assignments.map((item) => item.owner).join(",")}`,
    );

    const parallel = await runFounderCommand(
      "Run an independent technical/risk review and an independent Triple E review.",
      { mode: "qa", persistDir, persistTrace: true },
    );
    const imani = parallel.specialistResults.find((item) => item.agent === "imani");
    const nia = parallel.specialistResults.find((item) => item.agent === "nia");
    const overlap =
      Boolean(imani && nia) &&
      imani!.startedAt <= nia!.endedAt &&
      nia!.startedAt <= imani!.endedAt;
    record(
      "TEST 2",
      "PARALLEL EXECUTION",
      parallel.parallel === true && overlap,
      `parallel=${parallel.parallel} imani=${imani?.startedAt} nia=${nia?.startedAt}`,
    );

    const isolation = await runFounderCommand(
      "Ask Nia to own a security decision about production host firewall rules.",
      { mode: "qa", persistDir, persistTrace: true },
    );
    const imaniAgent = await createImaniAgent();
    const imaniCurriculum = await imaniAgent.run({
      id: "qa-imani-curriculum",
      task: "Rewrite approved curriculum for Chapter I",
      sourceAuthority: ["approved-product-curriculum"],
      owner: "imani",
      objective: "QA role isolation",
      constraints: [],
      dependencies: [],
      toolsAuthorized: ["classify_readiness"],
      acceptanceCriteria: ["Must refuse"],
      evidenceRequired: ["source"],
      escalationConditions: ["curriculum"],
    });
    const niaRefusal = isolation.specialistResults.find(
      (item) => item.agent === "nia" && item.status === "escalated",
    );
    const imaniHandled = isolation.specialistResults.some((item) => item.agent === "imani");
    record(
      "TEST 3",
      "ROLE BOUNDARY",
      Boolean(niaRefusal) &&
        imaniHandled &&
        imaniCurriculum.status === "escalated" &&
        imaniCurriculum.workPerformed.some((item) => /refused/i.test(item)),
      `nia_security=${niaRefusal?.status} imani_curriculum=${imaniCurriculum.status}`,
    );

    const pricing = await runFounderCommand("Change the pricing for the Blueprint.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
    });
    record(
      "TEST 4",
      "FOUNDER GATE",
      pricing.finalStatus === "founder_gate" &&
        Boolean(pricing.founderGate?.decisionRequired.toLowerCase().includes("pricing")) &&
        pricing.specialistResults.length === 0,
      `status=${pricing.finalStatus} reports=${pricing.founderReports.join(",")}`,
    );

    const legal = await runFounderCommand(
      "Provide a legal interpretation of whether our Privacy Policy allows this use.",
      { mode: "qa", persistDir, persistTrace: true },
    );
    record(
      "TEST 5",
      "HUMAN LEGAL GATE",
      legal.finalStatus === "human_expert_gate" &&
        legal.escalations.some((item) => item.to === "human_legal_expert") &&
        !/is lawful|is legal|you may legally/.test(legal.synthesis.toLowerCase()),
      `status=${legal.finalStatus}`,
    );

    const evidence = await runFounderCommand("Specialist claims complete without evidence.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      qa: { omitEvidence: true },
    });
    record(
      "TEST 6",
      "EVIDENCE FAILURE",
      evidence.finalStatus === "blocked" &&
        evidence.blocks.some((item) => item.blockingAgent === "michelle") &&
        !evidence.founderReports.includes("DECISION_REQUIRED"),
      `blocks=${evidence.blocks.map((item) => item.issue).join(" | ")}`,
    );

    const niaBlock = await runFounderCommand(
      "Experience fails approved standard — Triple E fail on participant surface.",
      { mode: "qa", persistDir, persistTrace: true, qa: { experienceFail: true } },
    );
    record(
      "TEST 7",
      "NIA BLOCK",
      niaBlock.blocks.some(
        (item) =>
          item.blockingAgent === "nia" &&
          item.issue &&
          item.evidence &&
          item.severity &&
          item.owner &&
          item.requiredCorrection &&
          item.retestRequirement,
      ),
      `status=${niaBlock.finalStatus}`,
    );

    const imaniBlock = await runFounderCommand(
      "Security/production readiness fail — claimed production-ready without tests.",
      { mode: "qa", persistDir, persistTrace: true, qa: { readinessFail: true } },
    );
    record(
      "TEST 8",
      "IMANI BLOCK",
      imaniBlock.blocks.some((item) => item.blockingAgent === "imani" && /production readiness/i.test(item.issue)),
      `status=${imaniBlock.finalStatus}`,
    );

    const disagree = await runFounderCommand("Imani and Nia disagree about shipping a participant-facing change.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      qa: { disagree: true },
    });
    record(
      "TEST 9",
      "DISAGREEMENT",
      disagree.synthesis.toLowerCase().includes("not a majority vote") &&
        disagree.finalStatus === "synthesized" &&
        !disagree.founderActionRequired,
      `synthesis_ok=${disagree.synthesis.includes("source of truth")}`,
    );

    const unavailable = await runFounderCommand("Change the pricing for Community membership.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      founderUnavailable: true,
    });
    const routine = await runFounderCommand("Routine implementation: copy correction to match approved copy.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      founderUnavailable: true,
    });
    record(
      "TEST 10",
      "FOUNDER UNAVAILABLE",
      unavailable.finalStatus === "founder_gate" &&
        /FOUNDER ACTION REQUIRED/.test(unavailable.synthesis) &&
        routine.finalStatus !== "founder_gate" &&
        routine.specialistResults.length > 0,
      `queued=${unavailable.finalStatus} routine=${routine.finalStatus}`,
    );

    const extra: SourceRecord[] = [
      {
        id: "locked-founder-decisions",
        rank: 1,
        label: "QA conflict current",
        authority: "current",
        excerpt: "Pricing is $1,500 one-time.",
      },
      {
        id: "locked-founder-decisions",
        rank: 1,
        label: "QA conflict competing",
        authority: "current",
        excerpt: "Pricing is $9.",
      },
    ];
    const conflictCheck = detectSourceConflict(extra);
    const conflictRun = await runFounderCommand("Resolve source conflict between two locked pricing excerpts.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      extraSources: extra,
    });
    record(
      "TEST 11",
      "SOURCE CONFLICT",
      conflictCheck.conflict === true &&
        conflictRun.finalStatus === "blocked" &&
        /no guess/i.test(conflictRun.synthesis) &&
        conflictRun.blocks.some((item) => item.blockingAgent === "michelle"),
      `conflict=${conflictCheck.conflict} status=${conflictRun.finalStatus}`,
    );

    const failure = await runFounderCommand("Technical risk review of Journey implementation.", {
      mode: "qa",
      persistDir,
      persistTrace: true,
      qa: { forceFailure: true },
    });
    record(
      "TEST 12",
      "FAILURE",
      failure.specialistResults.some((item) => item.agent === "imani") &&
        (failure.finalStatus === "blocked" ||
          failure.specialistResults.some((item) => item.status === "complete" || item.status === "failed")),
      `status=${failure.finalStatus} imani=${failure.specialistResults.find((item) => item.agent === "imani")?.status}`,
    );

    const sdk = await createFab5OpenAIAgents();
    const leastPrivilege =
      toolsFor("nia").every((tool) => tool.name !== "production_deploy" || tool.permission === "NONE") &&
      toolsFor("imani").every((tool) => tool.name !== "get_launch_row") &&
      TOOL_CATALOG.some((tool) => tool.name === "email_send" && tool.live === "interface_only");
    record(
      "SDK",
      "OPENAI AGENTS WIRING",
      sdk.michelle.name === "Michelle Northstar" &&
        sdk.imani.name === "Imani Heartbeat" &&
        sdk.nia.name === "Nia Prism" &&
        leastPrivilege &&
        openaiLiveModelConfigured() === Boolean(process.env.OPENAI_API_KEY),
      `live_model=${openaiLiveModelConfigured()} tools_isolated=${leastPrivilege}`,
    );

    const dryDir = path.join(process.cwd(), "ops", "fab-5", "runs");
    await mkdir(dryDir, { recursive: true });
    const dryRun = await completeAugustLaunchRow(15, { readOnly: true, persistDir: dryDir });
    const dryPath = path.join(dryDir, "row-16-dry-run.json");
    await mkdir(path.dirname(dryPath), { recursive: true });
    await writeFile(
      dryPath,
      JSON.stringify(
        {
          founderCommand: "Complete August Launch Row 15.",
          mode: "read_only",
          michelleIntake: dryRun.plan,
          michellePlan: dryRun.plan,
          assignments: dryRun.assignments.map((item) => ({
            owner: item.owner,
            task: item.task,
            evidenceRequired: item.evidenceRequired,
          })),
          imaniResult: dryRun.specialistResults.find((item) => item.agent === "imani"),
          niaResult: dryRun.specialistResults.find((item) => item.agent === "nia"),
          evidence: dryRun.evidence,
          verification: {
            executorIsNotFinalVerifier: true,
            launchStatusMutated: false,
            row17Started: false,
          },
          michelleSynthesis: dryRun.synthesis,
          founderActionRequired: dryRun.founderActionRequired,
          founderReports: dryRun.founderReports,
          finalStatus: dryRun.finalStatus,
          parallel: dryRun.parallel,
          tracePath: dryRun.tracePath,
        },
        null,
        2,
      ),
      "utf8",
    );
    record(
      "DRY RUN",
      "ROW 15 READ-ONLY",
      dryRun.rowNumber === 15 &&
        dryRun.mode === "read_only" &&
        dryRun.specialistResults.some((item) => item.agent === "imani") &&
        dryRun.specialistResults.some((item) => item.agent === "nia") &&
        dryRun.parallel === true &&
        !/row 17/i.test(dryRun.synthesis),
      `status=${dryRun.finalStatus} reports=${dryRun.founderReports.join(",")}`,
    );
  });

  const failed = results.filter((item) => !item.pass);
  console.log("");
  console.log(`Fab 5 QA: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
