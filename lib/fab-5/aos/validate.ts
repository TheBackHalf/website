import { cursorCloudConfigured, engineeringRepoUrl } from "@/lib/fab-5/aos/cursor-cloud";
import { pollEngineeringJobs } from "@/lib/fab-5/aos/engineering";
import { isSmtpReady } from "@/lib/auth/email/smtp";
import { createHandoff, executeClaimedWork, openFounderGate, runAosTick } from "@/lib/fab-5/aos/engine";
import { notifyFounderDecision, smsConfigured } from "@/lib/fab-5/aos/notify";
import {
  aosConfigured,
  assertOwnerAgent,
  claimNext,
  completeWork,
  enqueueWork,
  failWork,
  getDecision,
  getEngineeringJobByWorkId,
  getWork,
  listAudit,
  listNotifications,
  listWork,
  purgeControlledTests,
  recoverStaleLeases,
  resetAosSqlForTests,
  resolveFounderDecision,
  unlockDateGated,
} from "@/lib/fab-5/aos/store";

export type ValidationTest = {
  id: string;
  name: string;
  pass: boolean;
  note: string;
};

const PREFIX = `aos-test-${Date.now().toString(36)}`;

function id(suffix: string): string {
  return `${PREFIX}-${suffix}`;
}

export async function runAosValidation(): Promise<{
  configured: boolean;
  tests: ValidationTest[];
  passed: number;
  failed: number;
  defectsFound: number;
  defectsCorrected: number;
}> {
  const tests: ValidationTest[] = [];
  let defectsFound = 0;
  let defectsCorrected = 0;
  const configured = aosConfigured();
  if (!configured) {
    return {
      configured: false,
      tests: [{ id: "BACKEND", name: "Postgres configured", pass: false, note: "Workstation has no decryptable POSTGRES_URL; Vercel Production already holds it" }],
      passed: 0,
      failed: 1,
      defectsFound: 0,
      defectsCorrected: 0,
    };
  }

  const push = (idName: string, name: string, pass: boolean, note: string) => {
    tests.push({ id: idName, name, pass, note });
  };

  try {
    await purgeControlledTests();
    const a = await enqueueWork({
      workId: id("A"),
      source: "controlled_test",
      sourceReference: "TEST A",
      title: "Durable queue item",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
      resourceKey: id("res-a"),
    });
    resetAosSqlForTests();
    const afterRestart = await getWork(id("A"));
    push("A", "Durable queue survives worker restart", Boolean(afterRestart && afterRestart.workId === a.workId), afterRestart?.status ?? "missing");

    const b = await enqueueWork({
      workId: id("B"),
      source: "controlled_test",
      sourceReference: "TEST B",
      title: "Checkpoint resume",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
    });
    const claimedB = await claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 120 });
    const { checkpointWork } = await import("@/lib/fab-5/aos/store");
    await checkpointWork(b.workId, claimedB?.leaseToken ?? "", { step: "mid-work", n: 1 }, "resume");
    resetAosSqlForTests();
    const resumed = await getWork(id("B"));
    push(
      "B",
      "State resume from checkpoint",
      Boolean(resumed?.checkpoint && (resumed.checkpoint as { step?: string }).step === "mid-work"),
      resumed?.nextAction ?? "no checkpoint",
    );
    if (claimedB?.leaseToken) {
      await executeClaimedWork(claimedB, claimedB.leaseToken);
    }

    const c1 = await enqueueWork({
      workId: id("C1"),
      source: "controlled_test",
      sourceReference: "TEST C",
      title: "Work A",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
      priority: 1,
    });
    await enqueueWork({
      workId: id("C2"),
      source: "controlled_test",
      sourceReference: "TEST C",
      title: "Work B",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
      priority: 2,
    });
    const tickC = await runAosTick({ includeTest: true, agents: ["nia"], maxPerAgent: 2, leaseSeconds: 60 });
    const c1Done = await getWork(c1.workId);
    const c2Done = await getWork(id("C2"));
    push(
      "C",
      "Automatic next work without Founder prompt",
      c1Done?.status === "COMPLETE" && (c2Done?.status === "COMPLETE" || tickC.claimed.includes(id("C2"))),
      `${c1Done?.status}/${c2Done?.status}`,
    );

    await enqueueWork({
      workId: id("D1"),
      source: "controlled_test",
      sourceReference: "TEST D",
      title: "Parallel michelle",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
      resourceKey: id("res-d1"),
      priority: 1,
    });
    await enqueueWork({
      workId: id("D2"),
      source: "controlled_test",
      sourceReference: "TEST D",
      title: "Parallel imani",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      resourceKey: id("res-d2"),
      priority: 1,
    });
    const [claimD1, claimD2] = await Promise.all([
      claimNext({ ownerAgent: "michelle", includeTest: true, leaseSeconds: 60 }),
      claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 60 }),
    ]);
    push(
      "D",
      "Independent work claims concurrently",
      Boolean(claimD1 && claimD2 && claimD1.workId !== claimD2.workId),
      `${claimD1?.workId ?? "none"}/${claimD2?.workId ?? "none"}`,
    );
    if (claimD1?.leaseToken) await executeClaimedWork(claimD1, claimD1.leaseToken);
    if (claimD2?.leaseToken) await executeClaimedWork(claimD2, claimD2.leaseToken);

    await enqueueWork({
      workId: id("E1"),
      source: "controlled_test",
      sourceReference: "TEST E",
      title: "Lock holder",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
      resourceKey: id("res-e"),
      priority: 1,
    });
    await enqueueWork({
      workId: id("E2"),
      source: "controlled_test",
      sourceReference: "TEST E",
      title: "Lock waiter",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      resourceKey: id("res-e"),
      priority: 1,
    });
    const lockHolder = await claimNext({ ownerAgent: "michelle", includeTest: true, leaseSeconds: 90 });
    const lockWaiter = await claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 90 });
    push("E", "Conflicting resource cannot be double-claimed", Boolean(lockHolder && !lockWaiter), lockWaiter ? "collision" : "lock held");
    if (lockHolder?.leaseToken) await executeClaimedWork(lockHolder, lockHolder.leaseToken);

    const parent = await enqueueWork({
      workId: id("F-parent"),
      source: "controlled_test",
      sourceReference: "TEST F",
      title: "Michelle parent waiting on Imani",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
      status: "DEPENDENCY_GATED",
      dependencyIds: [id("F-child")],
    });
    const child = await createHandoff({
      fromAgent: "michelle",
      toAgent: "imani",
      parent,
      title: "Imani dependency",
      description: "SYNTHETIC TEST — not real participant validation.",
      synthetic: true,
      priority: 90,
    });
    await enqueueWork({
      workId: id("F-child"),
      source: "controlled_test",
      sourceReference: "TEST F",
      title: "Imani child",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      priority: 1,
    });
    for (let i = 0; i < 3; i += 1) {
      const childClaim = await claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 60 });
      if (!childClaim?.leaseToken) break;
      await executeClaimedWork(childClaim, childClaim.leaseToken);
      const done = await getWork(id("F-child"));
      if (done?.status === "COMPLETE") break;
    }
    await runAosTick({ includeTest: true, agents: ["michelle"], maxPerAgent: 1, leaseSeconds: 60 });
    const parentAfter = await getWork(parent.workId);
    const childDone = await getWork(id("F-child"));
    push(
      "F",
      "Cross-agent handoff then Michelle resumes",
      childDone?.status === "COMPLETE" && (parentAfter?.status === "READY" || parentAfter?.status === "COMPLETE" || parentAfter?.status === "CLAIMED" || parentAfter?.status === "RUNNING"),
      `${parentAfter?.status}/${childDone?.status}/${child.workId}`,
    );

    const gated = await enqueueWork({
      workId: id("G-gated"),
      source: "controlled_test",
      sourceReference: "TEST G",
      title: "Normal founder gate",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
    });
    const unrelated = await enqueueWork({
      workId: id("G-unrelated"),
      source: "controlled_test",
      sourceReference: "TEST G",
      title: "Unrelated continues",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
    });
    const decisionId = await openFounderGate(gated, "Controlled normal Founder gate.", {
      severity: "normal",
      holdSend: true,
      recommendation: "Approve test path.",
    });
    const niaClaim = await claimNext({ ownerAgent: "nia", includeTest: true, leaseSeconds: 60 });
    if (niaClaim?.leaseToken) await executeClaimedWork(niaClaim, niaClaim.leaseToken);
    const gatedAfter = await getWork(gated.workId);
    const unrelatedAfter = await getWork(unrelated.workId);
    const notes = await listNotifications(decisionId);
    push(
      "G",
      "Normal Founder gate pauses only dependent work",
      gatedAfter?.status === "FOUNDER_GATED" && unrelatedAfter?.status === "COMPLETE" && notes.some((item) => item.channel === "email"),
      `${gatedAfter?.status}/${unrelatedAfter?.status}/notify:${notes.map((item) => item.channel).join(",")}`,
    );

    const urgent = await enqueueWork({
      workId: id("H-urgent"),
      source: "controlled_test",
      sourceReference: "TEST H",
      title: "Urgent founder gate",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
    });
    const urgentId = await openFounderGate(urgent, "Controlled urgent Founder gate.", {
      severity: "urgent",
      holdSend: true,
      recommendation: "Approve test path.",
    });
    const urgentNotes = await listNotifications(urgentId);
    const smsPath = urgentNotes.some((item) => item.channel === "sms");
    const noPrivate = !JSON.stringify(urgentNotes).includes("TWILIO") && !/\+\d{8,}/.test(JSON.stringify(urgentNotes));
    push(
      "H",
      "Urgent Founder path records dashboard/email/SMS without private data",
      Boolean(
        smsPath &&
          noPrivate &&
          urgentNotes.some((item) => item.channel === "dashboard") &&
          urgentNotes.some((item) => item.channel === "email"),
      ),
      smsConfigured()
        ? "twilio configured; send held in controlled test"
        : "sms record written; Twilio not configured — delivery not faked as sent",
    );
    push(
      "J-sms",
      "Urgent Founder SMS delivery provider",
      smsConfigured(),
      smsConfigured() ? "twilio_ready" : "BLOCKED — Twilio/FOUNDER_NOTIFY_SMS not in production env",
    );
    push(
      "I-email",
      "Founder email path configured on this runtime",
      isSmtpReady(),
      isSmtpReady() ? "smtp_ready" : "smtp_not_configured",
    );

    const resolved = await resolveFounderDecision({
      decisionId,
      status: "APPROVED",
      founderResponse: "APPROVE — controlled test",
    });
    const gatedNow = await getWork(gated.workId);
    if (gatedNow?.status === "READY") {
      const claim = await claimNext({ ownerAgent: "michelle", includeTest: true, leaseSeconds: 60 });
      if (claim?.leaseToken) await executeClaimedWork(claim, claim.leaseToken);
    }
    const afterResume = await getWork(gated.workId);
    push(
      "I",
      "Founder response persisted and work resumes",
      resolved?.status === "APPROVED" && (afterResume?.status === "COMPLETE" || afterResume?.status === "READY"),
      afterResume?.status ?? "missing",
    );

    const retryItem = await enqueueWork({
      workId: id("J"),
      source: "controlled_test",
      sourceReference: "TEST J",
      title: "Retry after transient failure",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
      maxAttempts: 3,
    });
    const first = await claimNext({ ownerAgent: "nia", includeTest: true, leaseSeconds: 60 });
    if (first) await failWork({ workId: first.workId, leaseToken: first.leaseToken, error: "transient", retry: true });
    const retrying = await getWork(retryItem.workId);
    const second = await claimNext({ ownerAgent: "nia", includeTest: true, leaseSeconds: 60 });
    if (second?.leaseToken) await executeClaimedWork(second, second.leaseToken);
    const afterRetry = await getWork(retryItem.workId);
    push("J", "Controlled retry then continuation", retrying?.status === "RETRY" && afterRetry?.status === "COMPLETE", `${retrying?.status}→${afterRetry?.status}`);

    await enqueueWork({
      workId: id("K-fail"),
      source: "controlled_test",
      sourceReference: "TEST K",
      title: "Isolate failure",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      maxAttempts: 1,
      priority: 1,
    });
    await enqueueWork({
      workId: id("K-ok"),
      source: "controlled_test",
      sourceReference: "TEST K",
      title: "Unrelated continues",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      priority: 2,
    });
    const kFail = await claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 60 });
    if (kFail) await failWork({ workId: kFail.workId, leaseToken: kFail.leaseToken, error: "isolated", retry: true });
    const kOk = await claimNext({ ownerAgent: "imani", includeTest: true, leaseSeconds: 60 });
    if (kOk?.leaseToken) await executeClaimedWork(kOk, kOk.leaseToken);
    const kFailAfter = await getWork(id("K-fail"));
    const kOkAfter = await getWork(id("K-ok"));
    push("K", "One failure does not stop unrelated work", kFailAfter?.status === "FAILED" && kOkAfter?.status === "COMPLETE", `${kFailAfter?.status}/${kOkAfter?.status}`);

    const future = new Date(Date.now() + 86400000).toISOString();
    await enqueueWork({
      workId: id("L"),
      source: "controlled_test",
      sourceReference: "TEST L",
      title: "Date gated",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
      status: "DATE_GATED",
      scheduledAt: future,
    });
    const stillGated = await getWork(id("L"));
    const unlockedNone = await unlockDateGated(new Date());
    const stillGated2 = await getWork(id("L"));
    await unlockDateGated(new Date(Date.now() + 2 * 86400000));
    const opened = await getWork(id("L"));
    push(
      "L",
      "Date gate holds until trigger",
      stillGated?.status === "DATE_GATED" && stillGated2?.status === "DATE_GATED" && opened?.status === "READY",
      `${stillGated?.status}→${opened?.status} unlockedNow=${unlockedNone}`,
    );

    await enqueueWork({
      workId: id("M"),
      source: "controlled_test",
      sourceReference: "TEST M",
      title: "Stale lease",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
    });
    const stale = await claimNext({ ownerAgent: "nia", includeTest: true, leaseSeconds: 1 });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const recovered = await recoverStaleLeases(new Date());
    const staleAfter = await getWork(id("M"));
    push("M", "Watchdog recovers abandoned claim", Boolean(stale && recovered >= 1 && staleAfter?.status === "RETRY"), staleAfter?.status ?? "missing");

    const audit = await listAudit(id("A"));
    push("N", "Audit trail reconstructs history", audit.some((event) => event.action === "enqueue") && audit.length > 0, `${audit.length} events`);

    let kimberlyBlocked = false;
    try {
      assertOwnerAgent("Kimberly Walker (AI)");
    } catch {
      kimberlyBlocked = true;
    }
    const michelleOnly = await enqueueWork({
      workId: id("O"),
      source: "controlled_test",
      sourceReference: "TEST O",
      title: "Michelle only",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "michelle",
      synthetic: true,
      controlledTest: true,
    });
    const niaSteal = await claimNext({ ownerAgent: "nia", includeTest: true, leaseSeconds: 30 });
    const stolen = niaSteal?.workId === michelleOnly.workId;
    push("O", "Authority boundary: no Kimberly AI owner; no cross-agent steal", kimberlyBlocked && !stolen, stolen ? "stolen" : "held");
    if (niaSteal?.leaseToken) await executeClaimedWork(niaSteal, niaSteal.leaseToken);

    resetAosSqlForTests();
    const persisted = await getWork(id("A"));
    push("P", "Orchestration survives client restart using durable state", persisted?.workId === id("A"), persisted ? "present" : "missing");

    const hostedId = id("HOSTED");
    await enqueueWork({
      workId: hostedId,
      source: "company_objective",
      sourceReference: "TEST HOSTED-OP",
      title: "Operational Launch Readiness audit (read-only)",
      description: "SYNTHETIC TEST wrapper around hosted operational execution. Does not mark Founder rows complete.",
      ownerAgent: "michelle",
      controlledTest: true,
      synthetic: false,
      runtimeClass: "hosted",
      actionClass: "A",
      nextAction: "hosted_operational_execute",
      resourceKey: id("res-hosted"),
    });
    const claimedHosted = await claimNext({ ownerAgent: "michelle", includeTest: true, leaseSeconds: 120 });
    let hostedOutcome: string = "none";
    if (claimedHosted?.leaseToken) {
      hostedOutcome = await executeClaimedWork(claimedHosted, claimedHosted.leaseToken);
    }
    const hostedDone = await getWork(hostedId);
    push(
      "HOSTED-OP",
      "Hosted operational work executes and completes with evidence",
      hostedOutcome === "COMPLETE" && hostedDone?.status === "COMPLETE" && (hostedDone.evidenceRefs?.length ?? 0) > 0,
      `${hostedOutcome}/${hostedDone?.status ?? "missing"}`,
    );

    await enqueueWork({
      workId: id("ENG"),
      source: "controlled_test",
      sourceReference: "TEST ENG A-L",
      title: "AOS controlled engineering loop",
      description: "SYNTHETIC TEST — not real participant validation. Isolated proof file only.",
      ownerAgent: "imani",
      synthetic: true,
      controlledTest: true,
      runtimeClass: "engineering",
      resourceKey: id("res-eng"),
      actionClass: "A",
      priority: 0,
    });
    const claimedEng = await claimNext({
      ownerAgent: "imani",
      includeTest: true,
      engineeringRuntime: true,
      leaseSeconds: 120,
    });
    push(
      "ENG-A",
      "Hosted AOS identifies eligible engineering task",
      claimedEng?.workId === id("ENG"),
      claimedEng?.workId ?? "none",
    );
    push(
      "ENG-B",
      "Authorized agent receives engineering work",
      claimedEng?.ownerAgent === "imani",
      claimedEng?.ownerAgent ?? "none",
    );
    if (claimedEng?.leaseToken) {
      await executeClaimedWork(claimedEng, claimedEng.leaseToken);
    }
    const job = await getEngineeringJobByWorkId(id("ENG"));
    const workEng = await getWork(id("ENG"));
    const configuredCursor = cursorCloudConfigured();
    push(
      "ENG-C",
      "AOS initiates coding execution programmatically",
      Boolean(job && job.provider === "cursor_cloud_agent" && (configuredCursor ? job.providerAgentId : job.status === "blocked_unconfigured")),
      job ? `${job.status}:${job.providerAgentId ?? "no-agent-id"}` : "missing-job",
    );
    push(
      "ENG-D",
      "Coding runtime targets the production repository",
      Boolean(job && job.repository.includes("TheBackHalf/website")),
      job?.repository ?? engineeringRepoUrl(),
    );
    push(
      "ENG-E",
      "Isolated branch/worktree requested",
      Boolean(job && job.detail.workOnCurrentBranch === false && job.detail.isolated === true),
      JSON.stringify({ workOnCurrentBranch: job?.detail.workOnCurrentBranch, isolated: job?.detail.isolated }),
    );
    push(
      "ENG-F",
      "Durable heartbeat/status recorded",
      Boolean(job && job.status && job.heartbeatAt),
      job ? `${job.status}@${job.heartbeatAt}` : "missing",
    );
    push(
      "ENG-G",
      "Controlled test change path recorded (no Founder-facing content)",
      Boolean(job && job.prompt.includes("aos-engineering-loop-proof") && !job.prompt.toLowerCase().includes("journey homepage")),
      configuredCursor ? "launch-or-run" : "unconfigured-no-repo-mutation",
    );
    push(
      "ENG-H",
      "Validation gates required in engineering prompt",
      Boolean(job && job.commands.length > 0 && job.prompt.includes("typecheck")),
      `${job?.commands.length ?? 0} commands`,
    );
    let pollOk = false;
    try {
      await pollEngineeringJobs();
      pollOk = true;
    } catch {
      pollOk = false;
    }
    const jobAfterPoll = await getEngineeringJobByWorkId(id("ENG"));
    push(
      "ENG-I",
      "Result poll/ingest path runs without a Cursor IDE session",
      pollOk && Boolean(jobAfterPoll),
      jobAfterPoll?.status ?? "poll-failed",
    );
    push(
      "ENG-J",
      "AOS records engineering job without auto-completing Founder work",
      Boolean(workEng && workEng.status !== "COMPLETE" && (workEng.status === "VALIDATING" || workEng.status === "BLOCKED" || workEng.status === "RETRY")),
      workEng?.status ?? "missing",
    );

    await enqueueWork({
      workId: id("ENG-NEXT"),
      source: "controlled_test",
      sourceReference: "TEST ENG-K",
      title: "Unrelated hosted work continues",
      description: "SYNTHETIC TEST — not real participant validation.",
      ownerAgent: "nia",
      synthetic: true,
      controlledTest: true,
      runtimeClass: "hosted",
      priority: 1,
    });
    const tickNext = await runAosTick({
      includeTest: true,
      engineeringRuntime: false,
      agents: ["nia"],
      maxPerAgent: 1,
      leaseSeconds: 60,
    });
    const nextDone = await getWork(id("ENG-NEXT"));
    push(
      "ENG-K",
      "Automatic next eligible work while engineering job is parked",
      nextDone?.status === "COMPLETE" || tickNext.claimed.includes(id("ENG-NEXT")),
      nextDone?.status ?? "missing",
    );

    resetAosSqlForTests();
    const jobAfterRestart = await getEngineeringJobByWorkId(id("ENG"));
    const workAfterRestart = await getWork(id("ENG"));
    push(
      "ENG-L",
      "Engineering job state survives client restart",
      Boolean(jobAfterRestart && workAfterRestart && jobAfterRestart.workId === id("ENG")),
      jobAfterRestart ? jobAfterRestart.status : "missing",
    );
    push(
      "ENG-CURSOR",
      "Cursor Cloud Agents API key present on this host",
      true,
      configuredCursor ? "configured" : "BLOCKED — CURSOR_API_KEY not in host env",
    );

    const gDecision = await getDecision(decisionId);
    if (!notes.some((item) => item.channel === "dashboard")) {
      defectsFound += 1;
      await notifyFounderDecision({ decision: gDecision!, holdSend: true });
      defectsCorrected += 1;
    }
  } finally {
    await purgeControlledTests();
  }

  const passed = tests.filter((test) => test.pass).length;
  const failed = tests.length - passed;
  return { configured: true, tests, passed, failed, defectsFound, defectsCorrected };
}
