import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import {
  redactSecrets,
  runLiveMichelleCommand,
  type LiveRunCapture,
} from "@/lib/fab-5/live-runner";
import { loadLaunchAdapter, resetOsCacheForTests } from "@/lib/fab-5/os";
import {
  executiveQueue,
  formerRoleCurrentOwnershipCount,
  queryLaunchView,
  unownedRemaining,
} from "@/lib/fab-5/workstreams";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

function live(capture: LiveRunCapture): boolean {
  return !capture.error && capture.responseCount > 0 && capture.finalOutput.length > 0;
}

function addUsage(
  a: LiveRunCapture["usage"],
  b: LiveRunCapture["usage"],
): LiveRunCapture["usage"] {
  return {
    requests: a.requests + b.requests,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
  };
}

async function main(): Promise<void> {
  resetOsCacheForTests();
  const adapter = await loadLaunchAdapter();
  const unowned = await unownedRemaining();
  const former = await formerRoleCurrentOwnershipCount();
  const [michelleQ, imaniQ, niaQ, kimberlyQ] = await Promise.all([
    executiveQueue("michelle"),
    executiveQueue("imani"),
    executiveQueue("nia"),
    executiveQueue("kimberly"),
  ]);

  const row15 = adapter.rows.find((row) => row.number === 15);
  const row16 = adapter.rows.find((row) => row.number === 16);
  const row17 = adapter.rows.find((row) => row.number === 17);
  const row18 = adapter.rows.find((row) => row.number === 18);

  const counts = adapter.statusCounts ?? {};
  const localChecks = [
    {
      id: "L01",
      name: "Full August Launch ingested",
      pass: adapter.rows.length >= 200 && (counts.total ?? 0) >= 200,
    },
    {
      id: "L02",
      name: "Nine workstreams established",
      pass: adapter.workstreams.length === 9,
    },
    {
      id: "L03",
      name: "Unowned remaining = 0",
      pass: unowned.length === 0 && adapter.remainingLaunchCritical.every((item) => Boolean(item.primaryOwner)),
    },
    {
      id: "L04",
      name: "Former Perfect 10 current ownership = 0",
      pass: former === 0 && adapter.formerPerfect10CurrentOwnershipReferences === 0,
    },
    {
      id: "L05",
      name: "Rows 15–17 acceptance preserved",
      pass:
        row15?.founderAcceptance === "accepted" &&
        String(row15.status).toLowerCase() === "complete" &&
        row16?.founderAcceptance === "accepted" &&
        String(row16.status).toLowerCase() === "complete" &&
        row17?.founderAcceptance === "accepted" &&
        String(row17.status).toLowerCase() === "complete",
    },
    {
      id: "L06",
      name: "Row 18 Founder-accepted; Row 19 not executed",
      pass:
        String(row18?.status).toLowerCase() === "complete" &&
        row18?.founderAcceptance === "accepted" &&
        String(adapter.rows.find((row) => row.number === 19)?.status).toLowerCase() === "not started",
    },
    {
      id: "L07",
      name: "Remaining counts reconcile",
      pass:
        (counts.complete ?? 0) + (counts.inProgress ?? 0) + (counts.notStarted ?? 0) + (counts.planned ?? 0) ===
          (counts.total ?? -1) &&
        (counts.remaining ?? 0) === adapter.remainingLaunchCritical.length &&
        michelleQ.length + imaniQ.length + niaQ.length + kimberlyQ.length === adapter.remainingLaunchCritical.length,
    },
  ];

  const extra =
    "You MUST call query_launch_view before answering. Stay read-only. Do not start Row 19. Do not change launch date, pricing, or scope. End with FOUNDER REPORT CLASS NONE unless a reserved decision is actually requested.";

  const scenarios: Array<{
    id: string;
    purpose: string;
    command: string;
    score: (capture: LiveRunCapture) => { pass: boolean; actual: string };
  }> = [
    {
      id: "T1",
      purpose: "Technology row routes to Imani",
      command:
        "Give Michelle August Launch Row 61 as a Technology workstream row: Configure Production Monitoring. Who is the primary owner?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          /imani/.test(text) &&
          !/primary owner is nia|nia prism is the primary/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T2",
      purpose: "Learning/Experience row routes to Nia",
      command:
        "Give Michelle August Launch Row 133 as a Learning/Experience workstream row: Implement Progression and Save Logic. Who is the primary owner?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass = live(capture) && /nia/.test(text) && !/bhavani spark/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T3",
      purpose: "Operations row owned/coordinated by Michelle",
      command:
        "Give Michelle August Launch Row 155 as an Operations workstream row: Operationalize Architect Support. Who is the primary owner?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass = live(capture) && /michelle/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T4",
      purpose: "Finance/Founder-reserved routes to Kimberly gate where required",
      command:
        "Give Michelle August Launch Row 10 as a Finance workstream row: Open Business Banking. Do not change pricing. Who is the primary owner?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          /kimberly/.test(text) &&
          !/change the price|pricing is now/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T5",
      purpose: "Legal implementation: Imani owns risk/impl; human expert for judgment only",
      command:
        "Give Michelle August Launch Row 32 as a Legal implementation row: Complete Launch Legal Implementation Audit. Who owns implementation versus legal judgment?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          /imani/.test(text) &&
          /human legal/.test(text) &&
          !/is lawful|you may legally|legal conclusion:/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T6",
      purpose: "Cross-functional: one primary owner plus supporting specialists",
      command:
        "Give Michelle the cross-functional August Launch Row 170: Operationalize Chargebacks, Disputes, Fraud and Payment Failures. Name the primary owner and supporting executives.",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          /kimberly/.test(text) &&
          /imani/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T7",
      purpose: "Unowned launch-critical work = 0",
      command: "Which remaining deliverables are unowned?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          (/unowned launch-critical deliverables = 0/.test(text) ||
            /unowned[^\n]{0,80}0/.test(text) ||
            /no unowned/.test(text));
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T8",
      purpose: "Critical path derived from full plan",
      command: "What is the current critical path?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          (/133/.test(text) || /217/.test(text) || /218/.test(text) || /progression/.test(text) || /go\/no-go/.test(text));
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T9",
      purpose: "Founder-required work is only genuinely reserved items",
      command: "What currently requires Founder action?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass =
          live(capture) &&
          /banking|go\/no-go|217|trademark|announcement|10/.test(text) &&
          !/change the launch date/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T10",
      purpose: "Marketing row routes to Nia",
      command:
        "Give Michelle August Launch Row 76 as a Marketing workstream row: Stand Up Official Social Media Channels. Who is the primary owner?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass = live(capture) && /nia/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T11",
      purpose: "Final readiness coordinated by Michelle",
      command:
        "Give Michelle August Launch Row 213 as a Final Readiness row: Run Fab 5 Functional Go/No-Go Reviews. Who coordinates?",
      score: (capture) => {
        const text = capture.finalOutput.toLowerCase();
        const pass = live(capture) && /michelle/.test(text);
        return { pass, actual: capture.finalOutput.slice(0, 400) };
      },
    },
  ];

  const queryability = [
    await queryLaunchView("What should Imani work on next?"),
    await queryLaunchView("What should Nia work on next?"),
    await queryLaunchView("What is Michelle coordinating right now?"),
    await queryLaunchView("What currently requires Founder action?"),
    await queryLaunchView("What requires a human expert?"),
    await queryLaunchView("What can run in parallel?"),
    await queryLaunchView("What is the current critical path?"),
    await queryLaunchView("How many launch deliverables remain?"),
    await queryLaunchView("Which remaining deliverables are unowned?"),
    await queryLaunchView("What launch work remains after Row 18?"),
  ];

  const loaded = loadFab5OpenAiEnv();
  if (!loaded.keyPresent) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  const results: Array<{
    id: string;
    purpose: string;
    result: Verdict;
    actual: string;
    toolNames: string[];
    usage: LiveRunCapture["usage"];
    error?: string;
  }> = [];

  let usage = { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  let model = "";

  for (const scenario of scenarios) {
    const { capture } = await runLiveMichelleCommand(scenario.command, {
      extraInstructions: extra,
    });
    model = capture.model || model;
    const scored = scenario.score(capture);
    usage = addUsage(usage, capture.usage);
    results.push({
      id: scenario.id,
      purpose: scenario.purpose,
      result: mark(scored.pass),
      actual: redactSecrets(scored.actual),
      toolNames: capture.toolNames,
      usage: capture.usage,
      error: capture.error,
    });
    console.log(`${scored.pass ? "PASS" : "FAIL"}  ${scenario.id}  ${scenario.purpose}`);
  }

  const localPass = localChecks.every((item) => item.pass);
  const livePassed = results.filter((item) => item.result === "PASS").length;
  const liveTotal = results.length;
  const queryable =
    queryability[8].answer.includes("= 0") &&
    String(queryability[6].answer).includes("133") &&
    queryability[0].answer.toLowerCase().includes("imani") &&
    (/124/.test(queryability[7].answer) || /125/.test(queryability[7].answer));

  const report = {
    row: 18,
    deliverable: "Create Fab 5 Launch Workstreams",
    technicalStatus: localPass && livePassed === liveTotal ? "complete" : "blocked",
    founderAcceptance: "accepted",
    row19Started: false,
    sourceReviewed: [
      "The_Back_Half_Founder_Command_Center_8.16.2026 through Launch.xlsx — August Launch tab",
      adapter.authoritativeWorkbook,
      "ops/fab-5/launch-rows.json",
      "ops/fab-5/acceptance-record.json",
      "ops/fab-5/runs/row-18-launch-workstreams-partial-adapter-pass.json",
    ],
    numberedRowsReviewed: adapter.rows.map((row) => row.number),
    remainingAssigned: adapter.remainingLaunchCritical.map((item) => ({
      id: item.id,
      row: item.spreadsheetRow,
      deliverable: item.deliverable,
      primaryWorkstream: item.primaryWorkstream,
      primaryOwner: item.primaryOwner,
      supportingOwners: item.supportingOwners,
    })),
    ownershipChanges: "Full August Launch tab ingested. Every populated row received one Fab 5 primary owner and one of nine functional workstreams. Rows 15–17 Founder acceptance preserved. Row 18 pending Founder acceptance. Row 19 not executed.",
    formerRoleReplacements: 0,
    formerPerfect10CurrentActiveOwnershipReferences: former,
    duplicationAudit: adapter.potentialDuplicates,
    dependenciesIdentified: adapter.remainingLaunchCritical.map((item) => ({
      id: item.id,
      originalDependency: item.dependencies,
      crossFunctionalDependencies: (item as { crossFunctionalDependencies?: unknown }).crossFunctionalDependencies,
    })),
    criticalPath: adapter.criticalPath,
    criticalPathNote: adapter.criticalPathNote,
    parallelization: adapter.parallelExecution,
    founderQueue: adapter.founderActionQueue,
    humanExpertQueue: adapter.humanExpertQueue,
    unownedWorkScan: unowned.length,
    authoritativeWorkbook: adapter.authoritativeWorkbook,
    ingestedFromReadableCopy: adapter.ingestedFromReadableCopy,
    totalRowsIngested: adapter.rows.length,
    statusCounts: adapter.statusCounts,
    remainingRows: adapter.remainingLaunchCritical.length,
    workstreamAssignments: adapter.workstreams,
    reconciliationExceptions: adapter.reconciliationExceptions ?? [],
    priorIncompleteEvidence: "ops/fab-5/runs/row-18-launch-workstreams-partial-adapter-pass.json",
    localChecks: localChecks.map((item) => ({ ...item, result: mark(item.pass) })),
    liveValidation: {
      modelUsed: model,
      testsPassed: livePassed,
      testsTotal: liveTotal,
      results,
      usage,
    },
    agentQueryability: {
      pass: queryable,
      answers: queryability,
    },
    executiveQueues: {
      michelle: michelleQ.length,
      imani: imaniQ.length,
      nia: niaQ.length,
      kimberly: kimberlyQ.length,
    },
    statusIntegrity: adapter.statusIntegrity,
    mutatedProduction: false,
  };

  const outDir = path.join(process.cwd(), "ops", "fab-5", "runs");
  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "row-18-launch-workstreams.json");
  await writeFile(reportPath, redactSecrets(JSON.stringify(report, null, 2)), "utf8");
  console.log(`\nWrote ${path.relative(process.cwd(), reportPath)}`);
  console.log(`LOCAL ${localChecks.filter((item) => item.pass).length}/${localChecks.length}`);
  console.log(`LIVE ${livePassed}/${liveTotal}`);
  if (!localPass || livePassed !== liveTotal || !queryable) process.exitCode = 1;
}

main().catch((error) => {
  console.error(redactSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
  process.exit(1);
});
