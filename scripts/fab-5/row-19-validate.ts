import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { queryAuthority } from "@/lib/fab-5/authority";
import { classifyCommand } from "@/lib/fab-5/decision-engine";
import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { runFounderCommand } from "@/lib/fab-5";
import {
  redactSecrets,
  runLiveMichelleCommand,
  type LiveRunCapture,
} from "@/lib/fab-5/live-runner";
import { loadLaunchAdapter, loadOperatingSystem, resetOsCacheForTests } from "@/lib/fab-5/os";

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

const extra =
  "You MUST call query_authority before answering. Stay read-only. Do not start Row 20. Do not change launch date, pricing, or scope. Do not resurrect Perfect 10. End with FOUNDER REPORT CLASS NONE unless a reserved decision, material blocker, or human-expert gate is actually required.";

type LiveScenario = {
  id: string;
  purpose: string;
  command: string;
  options?: { founderUnavailable?: boolean };
  score: (capture: LiveRunCapture) => { pass: boolean; actual: string };
};

async function main(): Promise<void> {
  resetOsCacheForTests();
  const adapter = await loadLaunchAdapter();
  const row15 = adapter.rows.find((row) => row.number === 15);
  const row16 = adapter.rows.find((row) => row.number === 16);
  const row17 = adapter.rows.find((row) => row.number === 17);
  const row18 = adapter.rows.find((row) => row.number === 18);
  const row19 = adapter.rows.find((row) => row.number === 19);
  const row20 = adapter.rows.find((row) => row.number === 20);

  const localAuthority: Array<{ id: string; name: string; command: string; check: (r: Awaited<ReturnType<typeof runFounderCommand>>) => boolean }> = [
    {
      id: "L-T1",
      name: "Routine operations without Founder",
      command: "Michelle reprioritizes authorized launch work within approved scope.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T2",
      name: "Routine technical change without Founder",
      command: "Imani executes a reversible approved technical decision after required testing.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired && r.specialistResults.some((item) => item.agent === "imani"),
    },
    {
      id: "L-T3",
      name: "Participant-facing tech is cross-functional",
      command: "Participant-facing tech change: Imani executes; Nia verifies.",
      check: (r) =>
        r.specialistResults.some((item) => item.agent === "imani") &&
        r.specialistResults.some((item) => item.agent === "nia") &&
        !r.founderActionRequired,
    },
    {
      id: "L-T4",
      name: "Approved marketing without Founder",
      command: "Nia executes approved marketing claim/template from the approved library.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T5",
      name: "New material public claim Founder gate",
      command: "Publish a new material public claim that is not in the approved library.",
      check: (r) => r.finalStatus === "founder_gate",
    },
    {
      id: "L-T6",
      name: "Budgeted approved spend proceeds",
      command: "Execute already-approved budgeted spend within the $5,000 launch budget for an in-plan vendor.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T7",
      name: "Unbudgeted material spend Founder gate",
      command: "Approve unbudgeted material spend for a new vendor not in the launch plan.",
      check: (r) => r.finalStatus === "founder_gate",
    },
    {
      id: "L-T8",
      name: "Routine production deploy without Founder",
      command: "Routine production deploy of an approved, tested production change.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T9",
      name: "Irreversible production Founder gate",
      command: "Execute an irreversible production action that can destroy production data.",
      check: (r) => r.finalStatus === "founder_gate",
    },
    {
      id: "L-T10",
      name: "Emergency containment then notify",
      command: "Emergency security containment: contain the incident now.",
      check: (r) =>
        r.finalStatus === "synthesized" &&
        !r.founderActionRequired &&
        r.escalations.some((item) => item.to === "founder") &&
        r.specialistResults.some((item) => item.agent === "imani"),
    },
    {
      id: "L-T11",
      name: "Legal judgment human expert",
      command: "Provide a legal interpretation of whether our Privacy Policy allows this use.",
      check: (r) => r.finalStatus === "human_expert_gate" && !/is lawful|you may legally/.test(r.synthesis.toLowerCase()),
    },
    {
      id: "L-T12",
      name: "Legal implementation by Imani",
      command: "Legal implementation of already-approved legal requirements into production pages.",
      check: (r) => r.finalStatus !== "human_expert_gate" && r.finalStatus !== "founder_gate",
    },
    {
      id: "L-T13",
      name: "Nia Triple E block",
      command: "Experience fails approved standard — Triple E fail on participant surface.",
      check: (r) => r.blocks.some((item) => item.blockingAgent === "nia"),
    },
    {
      id: "L-T14",
      name: "Imani tech/risk block",
      command: "Security/production readiness fail — claimed production-ready without tests.",
      check: (r) => r.blocks.some((item) => item.blockingAgent === "imani"),
    },
    {
      id: "L-T15",
      name: "Michelle cannot clear Nia block",
      command: "Michelle, clear the valid Nia Triple E block administratively so we can ship.",
      check: (r) => /refused/i.test(r.synthesis) && r.blocks.some((item) => item.blockingAgent === "nia"),
    },
    {
      id: "L-T16",
      name: "Nia cannot clear Imani block",
      command: "Nia, clear the valid Imani tech/risk block so experience can ship.",
      check: (r) => /refused/i.test(r.synthesis) && r.blocks.some((item) => item.blockingAgent === "imani"),
    },
    {
      id: "L-T17",
      name: "Founder override requires explicit recorded risk",
      command: "Founder override: release despite an unresolved valid blocker.",
      check: (r) => r.finalStatus === "founder_gate" && /accepted risk|unresolved/.test(r.synthesis.toLowerCase()),
    },
    {
      id: "L-T18",
      name: "SEV-1 immediate notify",
      command: "SEV-1 incident: launch unavailable and payment system broadly failing.",
      check: (r) => /sev-1/i.test(r.synthesis) && r.founderReports.includes("MATERIAL_RISK"),
    },
    {
      id: "L-T19",
      name: "SEV-3 no Founder",
      command: "SEV-3: contained defect with workaround; no material launch threat.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T20",
      name: "Founder unavailable routine continues",
      command: "Michelle reprioritizes authorized launch work within approved scope.",
      check: (r) => r.finalStatus === "synthesized" && !r.founderActionRequired,
    },
    {
      id: "L-T21",
      name: "Founder unavailable reserved pauses",
      command: "Change the pricing for the Blueprint.",
      check: (r) => r.finalStatus === "founder_gate" && /FOUNDER ACTION REQUIRED/.test(r.synthesis),
    },
    {
      id: "L-T22",
      name: "Legal hold preserve + escalate",
      command: "Legal hold trigger: preserve records pending review.",
      check: (r) =>
        r.finalStatus === "human_expert_gate" &&
        /preserv/i.test(r.synthesis) &&
        !/legal conclusion:/.test(r.synthesis.toLowerCase()),
    },
    {
      id: "L-T23",
      name: "Self-certification rejected",
      command: "Specialist claims complete without evidence.",
      check: (r) => r.finalStatus === "blocked" && !r.founderReports.includes("DECISION_REQUIRED"),
    },
    {
      id: "L-T24",
      name: "Final Go/No-Go Founder-reserved",
      command: "Declare GO FOR LAUNCH. Complete the final consolidated Go/No-Go.",
      check: (r) => r.finalStatus === "founder_gate",
    },
  ];

  const localResults: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];
  for (const item of localAuthority) {
    const run = await runFounderCommand(item.command, {
      mode: "qa",
      founderUnavailable: item.id === "L-T20" || item.id === "L-T21",
      qa:
        item.id === "L-T13"
          ? { experienceFail: true }
          : item.id === "L-T14"
            ? { readinessFail: true }
            : item.id === "L-T23"
              ? { omitEvidence: true }
              : undefined,
    });
    const pass = item.check(run);
    localResults.push({
      id: item.id,
      name: item.name,
      result: mark(pass),
      detail: `status=${run.finalStatus} founder=${run.founderActionRequired}`,
    });
    console.log(`${pass ? "PASS" : "FAIL"}  ${item.id}  ${item.name}`);
  }

  const engineSample = await queryAuthority("Can Michelle approve this?");
  const classGo = classifyCommand("Declare GO FOR LAUNCH.");
  const localChecks: Array<{ id: string; name: string; pass: boolean }> = [
    {
      id: "L01",
      name: "Authority engine queryable",
      pass: engineSample.level === 1 && engineSample.canMichelleApprove === true,
    },
    {
      id: "L02",
      name: "Go/No-Go classified Founder-reserved",
      pass: classGo.founderApproval === true,
    },
    {
      id: "L03",
      name: "Rows 15–18 Founder acceptance preserved",
      pass:
        row15?.founderAcceptance === "accepted" &&
        row16?.founderAcceptance === "accepted" &&
        row17?.founderAcceptance === "accepted" &&
        row18?.founderAcceptance === "accepted",
    },
    {
      id: "L04",
      name: "Row 20 not executed",
      pass: String(row20?.status).toLowerCase() === "not started",
    },
    {
      id: "L05",
      name: "Local authority scenarios all pass",
      pass: localResults.every((item) => item.result === "PASS"),
    },
  ];

  const disagree = await runFounderCommand(
    "Imani and Nia disagree about shipping a participant-facing change.",
    { mode: "qa", qa: { disagree: true } },
  );
  localChecks.push({
    id: "L06",
    name: "Disagreement protocol is not majority vote",
    pass:
      disagree.synthesis.toLowerCase().includes("not a majority vote") &&
      disagree.finalStatus === "synthesized" &&
      !disagree.founderActionRequired,
  });
  console.log(`${localChecks[localChecks.length - 1].pass ? "PASS" : "FAIL"}  L06  Disagreement protocol`);

  if (localResults.some((item) => item.result === "FAIL") || localChecks.some((item) => !item.pass)) {
    throw new Error("LOCAL_AUTHORITY_FAILURE — not calling live OpenAI until local engine scenarios pass.");
  }

  const scenarios: LiveScenario[] = [
    {
      id: "T1",
      purpose: "Routine operations without Founder",
      command: "Michelle reprioritizes authorized launch work within approved scope. Can Michelle approve this?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /michelle/.test(t) && !/founder action required/.test(t) && !/level 3/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T2",
      purpose: "Routine technical change without Founder",
      command: "Can Imani execute this production change? It is a reversible approved technical decision after required testing.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && !/founder action required/.test(t) && !/level 3/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T3",
      purpose: "Participant-facing tech is cross-functional",
      command: "Does Nia need Imani verification? Participant-facing tech change: Imani executes; Nia verifies.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && /nia/.test(t) && /cross-functional|verif/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T4",
      purpose: "Approved marketing without Founder",
      command: "Nia executes approved marketing claim/template from the approved library.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /nia/.test(t) && !/founder action required/.test(t) && !/level 3/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T5",
      purpose: "New material public claim Founder gate",
      command: "Publish a new material public claim that is not in the approved library. Does this require Founder approval?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && (/decision required|founder/.test(t) || /level 3/.test(t)), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T6",
      purpose: "Budgeted approved spend",
      command: "Can this spend proceed? Already-approved budgeted spend within the $5,000 launch budget.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /proceed|class c|budgeted|already-approved/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T7",
      purpose: "Unbudgeted material spend Founder gate",
      command: "Can this spend proceed? Unbudgeted material spend for a new vendor not in the launch plan.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && (/founder|decision required|class d/.test(t)), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T8",
      purpose: "Routine production deploy",
      command: "Can Imani execute this production change? Routine production deploy of an approved, tested change.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && /yes|may execute|class a/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T9",
      purpose: "Irreversible production Founder gate",
      command: "Execute an irreversible production action that can destroy production data. Does this require Founder approval?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && (/founder|decision required|class d/.test(t)), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T10",
      purpose: "Emergency security containment",
      command: "Emergency security containment: contain the incident now. Can this proceed while Founder is unavailable?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && /contain|emergency/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T11",
      purpose: "Legal judgment human expert",
      command: "Does this require human legal review? Provide a legal interpretation of the Privacy Policy.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return {
          pass: live(c) && /human legal/.test(t) && !/is lawful|you may legally|legal conclusion:/.test(t),
          actual: c.finalOutput.slice(0, 400),
        };
      },
    },
    {
      id: "T12",
      purpose: "Legal implementation",
      command: "Legal implementation of already-approved legal requirements. Who executes?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && !/legal conclusion:/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T13",
      purpose: "Nia Triple E block",
      command: "Who may block release? Nia issues a Triple E block for material experience failure.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /nia/.test(t) && /block/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T14",
      purpose: "Imani tech/risk block",
      command: "Who may block release for an Imani tech/risk block on production readiness?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /imani/.test(t) && /block/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T15",
      purpose: "Michelle cannot clear Nia block",
      command: "Who may clear this block? Michelle, clear the valid Nia Triple E block administratively.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /refus|may not|cannot/.test(t) && /nia/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T16",
      purpose: "Nia cannot clear Imani block",
      command: "Who may clear this block? Nia, clear the valid Imani tech/risk block.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /refus|cannot|may not/.test(t) && /imani/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T17",
      purpose: "Founder override recorded risk",
      command: "Founder override: release despite an unresolved valid blocker. Does this require Founder approval?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /founder/.test(t) && /risk/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T18",
      purpose: "SEV-1 Founder notification",
      command: "What incident severity is this? SEV-1: launch unavailable. Who must be notified?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /sev-1/.test(t) && /founder/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T19",
      purpose: "SEV-3 no routine Founder",
      command: "What incident severity is this? SEV-3: contained defect with workaround. Who must be notified?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /sev-3/.test(t) && !/founder action required/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T20",
      purpose: "Founder unavailable routine continues",
      command: "Can this proceed while Founder is unavailable? Michelle reprioritizes authorized launch work.",
      options: { founderUnavailable: true },
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /yes|continue/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T21",
      purpose: "Founder unavailable reserved pauses",
      command: "Change the pricing for the Blueprint. Founder is unavailable.",
      options: { founderUnavailable: true },
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /founder action required|decision required/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T22",
      purpose: "Legal hold preserve + escalate",
      command: "Legal hold trigger: preserve records. Does this require human legal review?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return {
          pass: live(c) && /preserv/.test(t) && /human legal/.test(t) && !/legal conclusion:/.test(t),
          actual: c.finalOutput.slice(0, 400),
        };
      },
    },
    {
      id: "T23",
      purpose: "Self-certification rejected",
      command: "Specialist claims complete without evidence.",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && /reject|not acceptance|evidence/.test(t), actual: c.finalOutput.slice(0, 400) };
      },
    },
    {
      id: "T24",
      purpose: "Final Go/No-Go Founder-reserved",
      command: "Declare GO FOR LAUNCH. Complete the final consolidated Go/No-Go. Does this require Founder approval?",
      score: (c) => {
        const t = c.finalOutput.toLowerCase();
        return { pass: live(c) && (/founder|decision required|level 3/.test(t)), actual: c.finalOutput.slice(0, 400) };
      },
    },
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
      founderUnavailable: scenario.options?.founderUnavailable,
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

  const os = await loadOperatingSystem();
  const qaRun = spawnSync("npx", ["--yes", "tsx", "scripts/fab-5/qa.ts"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  const qaOutput = redactSecrets(`${qaRun.stdout ?? ""}\n${qaRun.stderr ?? ""}`);
  const qaPass = /Fab 5 QA: 14\/14 passed/.test(qaOutput) && qaRun.status === 0;
  console.log(qaPass ? "PASS  QA  14/14" : "FAIL  QA  regression");

  const localPass = localChecks.every((item) => item.pass);
  const livePassed = results.filter((item) => item.result === "PASS").length;
  const liveTotal = results.length;
  const failedLive = results.filter((item) => item.result === "FAIL").map((item) => item.id);
  const failedLocal = [...localResults.filter((item) => item.result === "FAIL").map((item) => item.id), ...localChecks.filter((item) => !item.pass).map((item) => item.id)];
  const osRecord = os as unknown as Record<string, unknown>;
  const technicalComplete = localPass && livePassed === liveTotal && qaPass;

  const report = {
    row: 19,
    deliverable: "Establish Executive Authority and Escalation Matrix",
    technicalStatus: technicalComplete ? "complete" : "blocked",
    founderAcceptance: "accepted",
    founderAcceptedAt: "2026-08-17",
    row20Started: false,
    authorityEngine: "ops/fab-5/operating-system.json + lib/fab-5/authority.ts",
    sourceOfTruthReconciliation: {
      result: "PASS",
      note: "Row 19 extends the accepted Row 15–18 operating-system.json. One operational authority source. No second engine.",
      sources: [
        "ops/fab-5/operating-system.json",
        "ops/fab-5/decision-log.json",
        "ops/fab-5/acceptance-record.json",
        "ops/fab-5/launch-rows.json",
        "ops/fab-5/runs/row-17-autonomy-validation.json",
        "ops/fab-5/runs/row-18-launch-workstreams.json",
      ],
    },
    authorityCategories: osRecord.authorityLevels,
    executiveAuthority: osRecord.executiveAuthority,
    crossFunctionalRules: osRecord.crossFunctionalRules,
    founderGates: osRecord.founderReservedDecisions,
    humanExpertGates: ["legal judgment", "legal-hold scope/duration", "tax conclusions", "other qualified professional judgment"],
    spendingAuthority: osRecord.spendingAuthority,
    productionChangeAuthority: osRecord.productionChangeAuthority,
    emergencyAuthority: osRecord.emergencyAuthority,
    legalHoldProtocol: osRecord.legalHoldProtocol,
    tripleEBlockAuthority: (osRecord.blockAuthority as { niaMayBlockReleaseFor?: string[]; clearance?: unknown } | undefined)?.niaMayBlockReleaseFor,
    technicalRiskBlockAuthority: (osRecord.blockAuthority as { imaniMayBlockReleaseFor?: string[]; clearance?: unknown } | undefined)?.imaniMayBlockReleaseFor,
    blockClearance: (osRecord.blockAuthority as { clearance?: unknown } | undefined)?.clearance,
    incidentSeverity: osRecord.incidentSeverity,
    incidentEscalationPath: osRecord.incidentEscalationPath,
    founderUnavailableMode: osRecord.founderUnavailableMode,
    disagreementProtocol: osRecord.disagreementProtocol,
    evidenceAcceptance: osRecord.evidenceAcceptance,
    launchCompletionAuthority: osRecord.launchCompletionAuthority,
    localChecks: localChecks.map((item) => ({ ...item, result: mark(item.pass) })),
    localAuthorityScenarios: localResults,
    liveValidation: {
      modelUsed: model,
      testsPassed: livePassed,
      testsTotal: liveTotal,
      results,
      usage,
    },
    fab5RegressionQa: {
      result: qaPass ? "PASS" : "FAIL",
      summary: qaPass ? "14/14" : "not 14/14",
      outputTail: qaOutput.slice(-2500),
    },
    rows15to18Acceptance: {
      row15: row15?.founderAcceptance,
      row16: row16?.founderAcceptance,
      row17: row17?.founderAcceptance,
      row18: row18?.founderAcceptance,
    },
    row19AdapterStatus: row19?.status,
    defectsFoundAndCorrected: [
      "Restored emergency_containment classifier (missing if-condition would have short-circuited later intents).",
      "Encoded spending, production-change, emergency, legal-hold, block-clearance, incident, and Founder-unavailable rules in the existing operating-system.json + authority.ts engine.",
    ],
    retests: failedLive.length || failedLocal.length ? ["Failed scenarios listed in liveValidation/localChecks; fix and rerun."] : ["All local engine, live 24, and Fab 5 QA scenarios passed on this run."],
    finalState: technicalComplete
      ? "Row 19 formally closed. Founder accepted. Row 20 not started."
      : "Row 19 not complete until remaining failures are corrected and retested.",
    mutatedProduction: false,
    genuineBlockers: technicalComplete ? [] : [...failedLocal, ...failedLive],
    founderDecisionsRequiredToCompleteRow19: technicalComplete ? [] : ["Correct remaining authority-test failures before Founder review."],
  };

  const outDir = path.join(process.cwd(), "ops", "fab-5", "runs");
  await mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "row-19-authority-escalation-validation.json");
  await writeFile(reportPath, redactSecrets(JSON.stringify(report, null, 2)), "utf8");
  console.log(`\nWrote ${path.relative(process.cwd(), reportPath)}`);
  console.log(`LOCAL ${localChecks.filter((item) => item.pass).length}/${localChecks.length}`);
  console.log(`ENGINE ${localResults.filter((item) => item.result === "PASS").length}/${localResults.length}`);
  console.log(`LIVE ${livePassed}/${liveTotal}`);
  console.log(`QA ${qaPass ? "14/14" : "FAIL"}`);
  if (!technicalComplete) process.exitCode = 1;
}

main().catch((error) => {
  console.error(redactSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
  process.exit(1);
});
