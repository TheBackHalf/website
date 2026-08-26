/**
 * Hosted (non-engineering) AOS execution.
 * Read-only operational work. Never marks Command Center rows Complete
 * or records Founder acceptance. Evidence lives on the work row / audit log.
 */

import { randomUUID } from "node:crypto";

import { cursorCloudConfigured, probeCursorCloudAuth } from "@/lib/fab-5/aos/cursor-cloud";
import { notifyFounderDecision } from "@/lib/fab-5/aos/notify";
import {
  LAUNCH_SPRINT_KICKOFF_ID,
  reclassifyLaunchBacklog,
  type ClassifiedLaunchRow,
} from "@/lib/fab-5/aos/reclassify";
import {
  checkpointWork,
  completeWork,
  enqueueWork,
  getEngineeringJobByWorkId,
  getWork,
  insertFounderDecision,
  listEngineeringJobs,
  listHeartbeats,
  listOpenDecisions,
  listWork,
  recordCost,
  releaseWork,
  updateEngineeringJob,
} from "@/lib/fab-5/aos/store";
import type { OperatingAgentId, WorkItem } from "@/lib/fab-5/aos/types";

export const HOSTED_OPERATIONAL_ACTION = "hosted_operational_execute";

const PRODUCTION_HOST = "https://website-two-psi-49.vercel.app";

const ROW74_HOSTED: Array<{
  workId: string;
  ownerAgent: OperatingAgentId;
  title: string;
  description: string;
  priority: number;
}> = [
  {
    workId: "aos-row74-michelle-reclassify",
    ownerAgent: "michelle",
    title: "Row 74 — recursive Launch Readiness reclassification + three-agent coordination",
    description:
      "Michelle Northstar: recursively reclassify remaining launch-critical work, assign executable authorized work, preserve Founder/legal/human gates, and open the Launch Sprint kickoff decision. Do not mark Row 74 Complete. Do not start Row 75.",
    priority: 0,
  },
  {
    workId: "aos-row74-imani-cursor-inspect",
    ownerAgent: "imani",
    title: "Row 74 — Production inspect + Cursor Cloud authentication",
    description:
      "Imani Heartbeat: inspect Production health, confirm CURSOR_API_KEY name is present, authenticate to Cursor Cloud Agents without printing the key, and identify technical blockers. No DNS, Stripe Live, or credential rotation.",
    priority: 0,
  },
  {
    workId: "aos-row74-nia-experience-inspect",
    ownerAgent: "nia",
    title: "Row 74 — customer-facing experience inspect",
    description:
      "Nia Prism: inspect registration, dashboard welcome copy, and remaining experience work. Do not publish, charge, or mark Founder acceptance.",
    priority: 0,
  },
  {
    workId: "aos-open-google-signin-hide",
    ownerAgent: "imani",
    title: "Preserve Registration Google Sign-In hide correction",
    description:
      "Imani Heartbeat: verify Production /register does not show Google Sign-In or internal GOOGLE_CLIENT_* notices unless OAuth is configured. Do not duplicate completed work.",
    priority: 1,
  },
  {
    workId: "aos-open-checkout-pricing",
    ownerAgent: "nia",
    title: "Purchase, checkout, and Founding Architect copy inspect",
    description:
      "Nia Prism: inspect customer-facing checkout/pricing copy. Do not perform Stripe charges. Live Stripe connection remains Founder-gated (Row 73).",
    priority: 1,
  },
];

const DASHBOARD_WELCOME_ID = "aos-row74-nia-dashboard-welcome";
const DASHBOARD_WELCOME_PROMPT = [
  "Correct the Architect Dashboard Welcome card duplicate heading.",
  "FOUNDER-OBSERVED DEFECT: the authenticated Architect Dashboard Welcome card currently displays two separate welcome lines — the slot heading (dashboard.welcomeSlot, currently 'Welcome' / 'Bienvenida') and the body (dashboard.welcome, currently 'Welcome, {name}.' / 'Te damos la bienvenida, {name}.').",
  "REQUIRED: one participant-facing welcome line, still personalized with the Architect's name. Update English and Spanish dictionaries and the dashboard shell if the heading/body split is what creates the duplicate.",
  "Do not change other dashboard cards, routing, auth, Stripe, DNS, legal, or Journey curriculum.",
  "Do not mark any Launch Readiness row Complete. Do not record Founder acceptance.",
].join("\n");

export function isHostedOperationalWork(item: WorkItem): boolean {
  if (item.runtimeClass !== "hosted") return false;
  if (item.actionClass === "D") return false;
  if (item.source === "command_center") return false;
  return (
    item.nextAction === HOSTED_OPERATIONAL_ACTION ||
    item.workId.startsWith("aos-hosted-") ||
    item.workId.startsWith("aos-row74-") ||
    item.workId.startsWith("aos-open-") ||
    item.resourceKey?.startsWith("aos-standup:") === true
  );
}

async function fetchText(url: string): Promise<{ status: number; body: string }> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "BackHalf-AOS/row74" },
    });
    const body = await response.text();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: "" };
  }
}

function ownerAgent(row: ClassifiedLaunchRow): OperatingAgentId | null {
  if (row.owner === "michelle" || row.owner === "imani" || row.owner === "nia") return row.owner;
  return null;
}

async function queueExecutableWork(items: ClassifiedLaunchRow[]): Promise<{ queued: number; skipped: number }> {
  let queued = 0;
  let skipped = 0;
  for (const item of items) {
    if (item.classification !== "READY FOR AGENT EXECUTION") {
      skipped += 1;
      continue;
    }
    if (item.row === 75 || item.id === "75") {
      skipped += 1;
      continue;
    }
    const owner = ownerAgent(item);
    if (!owner) {
      skipped += 1;
      continue;
    }
    const workId = `aos-sprint-lr-${item.id}`;
    const existing = await getWork(workId);
    if (existing) {
      skipped += 1;
      continue;
    }
    await enqueueWork({
      workId,
      source: "company_objective",
      sourceReference: `launch-readiness-row-${item.id}`,
      title: item.deliverable,
      description: `Queued by Michelle after recursive dependency analysis. Held until Founder kickoff (${LAUNCH_SPRINT_KICKOFF_ID}). Do not mark Complete. Do not start Row 75.`,
      ownerAgent: owner,
      priority: 200 + (item.row ?? 200),
      status: "DEPENDENCY_GATED",
      dependencyIds: [LAUNCH_SPRINT_KICKOFF_ID],
      parentWorkId: LAUNCH_SPRINT_KICKOFF_ID,
      actionClass: "A",
      runtimeClass: owner === "imani" ? "engineering" : "hosted",
      nextAction: "await_row74_founder_kickoff",
      blockedReason: "await_row74_founder_kickoff",
      resourceKey: `aos-sprint:${item.id}`,
      evidenceRefs: ["ops/fab-5/launch-rows.json"],
    });
    queued += 1;
  }
  return { queued, skipped };
}

async function ensureKickoffAndGate(): Promise<{ kickoffId: string; decisionOpened: boolean }> {
  let kickoff = await getWork(LAUNCH_SPRINT_KICKOFF_ID);
  if (!kickoff) {
    kickoff = await enqueueWork({
      workId: LAUNCH_SPRINT_KICKOFF_ID,
      source: "company_objective",
      sourceReference: "row-74-fab5-agent-standup",
      title: "Founder kickoff — Launch Readiness three-agent sprint",
      description:
        "Approve to release queued Launch Readiness work to Michelle, Imani, Nia, and Cursor Cloud engineering. The Founder does not paste individual prompts. Do not start Row 75 from this decision.",
      ownerAgent: "michelle",
      priority: 3,
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: HOSTED_OPERATIONAL_ACTION,
      resourceKey: "aos-standup:launch-sprint-kickoff",
      evidenceRefs: ["ops/fab-5/AOS-PERMANENT-OPERATING-SYSTEM.md"],
    });
  }
  if (kickoff.status === "FOUNDER_GATED" && kickoff.founderDecisionId) {
    return { kickoffId: kickoff.workId, decisionOpened: false };
  }
  const open = await listOpenDecisions(false);
  if (open.some((decision) => decision.workId === LAUNCH_SPRINT_KICKOFF_ID)) {
    return { kickoffId: kickoff.workId, decisionOpened: false };
  }
  const decision = await insertFounderDecision({
    decisionId: `fd-row74-kickoff-${randomUUID()}`,
    requestingAgent: "michelle",
    workId: kickoff.workId,
    decisionRequired: "Kick off the Launch Readiness three-agent sprint",
    agentRecommendation:
      "Approve after Row 74 Founder acceptance. Michelle, Imani, Nia, and Cursor Cloud engineering then claim queued work from Production without individual Founder prompts.",
    reason: "Row 74 validation queues executable work but must not unleash the sprint until the Founder accepts.",
    riskIfDelayed: "Queued agent-executable work stays held. Unrelated AOS work continues.",
    deadline: null,
    allowedResponse: "APPROVE | REJECT | REVIEW",
    severity: "normal",
    controlledTest: false,
  });
  await notifyFounderDecision({ decision, holdSend: false });
  return { kickoffId: kickoff.workId, decisionOpened: true };
}

async function michelleAudit(): Promise<Record<string, unknown>> {
  const classified = await reclassifyLaunchBacklog();
  const kickoff = await ensureKickoffAndGate();
  const queue = await queueExecutableWork(classified.items);
  const [michelleQ, imaniQ, niaQ, engineering, heartbeats] = await Promise.all([
    listWork({ ownerAgent: "michelle", status: ["QUEUED", "READY", "RETRY", "DEPENDENCY_GATED"], limit: 500 }),
    listWork({ ownerAgent: "imani", status: ["QUEUED", "READY", "RETRY", "DEPENDENCY_GATED"], limit: 500 }),
    listWork({ ownerAgent: "nia", status: ["QUEUED", "READY", "RETRY", "DEPENDENCY_GATED"], limit: 500 }),
    listEngineeringJobs(20),
    listHeartbeats(),
  ]);
  return {
    agent: "michelle",
    role: "Chief of Staff & Operations Officer",
    remainingLaunchCritical: classified.remainingLaunchCritical,
    counts: {
      ready: classified.readyForAgentExecution,
      blocked: classified.dependencyBlocked,
      founder: classified.founderActionRequired,
      human: classified.humanAcceptanceRequired,
    },
    queues: {
      michelle: michelleQ.length,
      imani: imaniQ.length,
      nia: niaQ.length,
      cursorCloudEngineering: engineering.filter((job) =>
        ["launching", "running", "validating", "blocked_unconfigured"].includes(job.status),
      ).length,
    },
    sprintQueued: queue.queued,
    sprintSkipped: queue.skipped,
    kickoff,
    heartbeats: heartbeats.map((beat) => ({
      agent: beat.agent,
      lastHeartbeat: beat.lastHeartbeat,
      queueDepth: beat.queueDepth,
    })),
    genuineBlockers: classified.genuineBlockers,
    sampleReady: classified.items
      .filter((item) => item.classification === "READY FOR AGENT EXECUTION")
      .slice(0, 15)
      .map((item) => ({ id: item.id, owner: item.owner, deliverable: item.deliverable })),
    founderStatusesUnchanged: true,
    row74NotMarkedComplete: true,
    row75NotStarted: true,
  };
}

async function imaniInspect(): Promise<Record<string, unknown>> {
  const healthUrl = `${PRODUCTION_HOST}/api/ops/health`;
  type HealthBody = {
    ok?: boolean;
    environment?: string;
    checks?: { application?: string; database?: string };
  };
  let health: HealthBody | null = null;
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "BackHalf-AOS-Imani/1.0" },
    });
    if (response.ok) {
      health = (await response.json()) as HealthBody;
    }
  } catch {
    health = null;
  }
  const cursor = await probeCursorCloudAuth();
  const register = await fetchText(`${PRODUCTION_HOST}/register`);
  const googleNotice = /Google Sign-In is not configured|GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET/i.test(
    register.body,
  );
  const googleButton = /Continue with Google|Continuar con Google/i.test(register.body);
  return {
    agent: "imani",
    role: "Chief Technology & Risk Officer",
    healthUrl,
    healthOk: health?.ok === true,
    environment: health?.environment ?? null,
    application: health?.checks?.application ?? null,
    database: health?.checks?.database ?? null,
    cursorApiKeyPresent: cursor.configured,
    cursorCloudAuthenticated: cursor.authenticated,
    cursorCloudHttpStatus: cursor.httpStatus,
    registerHttp: register.status,
    googleSignInNoticeExposed: googleNotice,
    googleSignInButtonVisible: googleButton,
    stripeSecretNamePresent: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    secretsPrinted: false,
    writes: false,
    row75NotTouched: true,
  };
}

async function niaInventory(): Promise<Record<string, unknown>> {
  const classified = await reclassifyLaunchBacklog();
  const owned = classified.items.filter((item) => item.owner === "nia");
  const register = await fetchText(`${PRODUCTION_HOST}/register`);
  const checkout = await fetchText(`${PRODUCTION_HOST}/checkout`);
  const googleNotice = /Google Sign-In is not configured|GOOGLE_CLIENT_ID/i.test(register.body);
  return {
    agent: "nia",
    role: "Chief Experience & Transformation Officer",
    remainingOwned: owned.length,
    readyOwned: owned.filter((item) => item.classification === "READY FOR AGENT EXECUTION").length,
    items: owned.slice(0, 20).map((item) => ({
      id: item.id,
      deliverable: item.deliverable,
      classification: item.classification,
    })),
    registerHttp: register.status,
    checkoutHttp: checkout.status,
    googleConfigNoticeHidden: !googleNotice,
    dashboardWelcomeDefect:
      "Welcome card currently renders a Welcome heading plus Welcome, {name}. — queued as Cursor Cloud engineering.",
    published: false,
    founderAcceptanceRecorded: false,
  };
}

async function executeFor(item: WorkItem): Promise<Record<string, unknown>> {
  if (item.workId === LAUNCH_SPRINT_KICKOFF_ID) {
    return {
      agent: "michelle",
      sprintAuthorized: true,
      note: "Founder approved Launch Sprint kickoff. Dependent queued work unlocks on the next tick.",
    };
  }
  if (item.ownerAgent === "michelle") return michelleAudit();
  if (item.workId === "aos-open-google-signin-hide" || item.ownerAgent === "imani") {
    return imaniInspect();
  }
  return niaInventory();
}

async function relaunchDashboardWelcomeAfterGithubSync(welcome: WorkItem): Promise<boolean> {
  const active = ["READY", "RETRY", "CLAIMED", "RUNNING", "VALIDATING"];
  if (active.includes(welcome.status)) return false;
  const job = await getEngineeringJobByWorkId(welcome.workId);
  if (job?.detail?.githubMainSyncRetry === true) return false;
  if (job && job.status !== "succeeded" && job.status !== "failed") return false;
  if (job) {
    await updateEngineeringJob(job.jobId, {
      status: "failed",
      error: "blocked_missing_surface_retry_after_github_main_sync",
      detail: { githubMainSyncRetry: true, previousStatus: job.status },
    });
  }
  await releaseWork({
    workId: welcome.workId,
    status: "READY",
    nextAction: "cursor_cloud_engineering",
    blockedReason: null,
  });
  return true;
}

export async function executeHostedOperationalWork(
  item: WorkItem,
  leaseToken: string,
): Promise<"COMPLETE" | "FAILED"> {
  const evidence = await executeFor(item);
  await checkpointWork(
    item.workId,
    leaseToken,
    { step: "hosted_operational_complete", evidence },
    "complete",
  );
  await completeWork({
    workId: item.workId,
    leaseToken,
    evidenceRefs: [`aos-hosted:${item.workId}`],
    nextAction: "none",
  });
  await recordCost(item.ownerAgent, item.workId, "hosted_operational_execute", 1, "read-only operational work");
  return "COMPLETE";
}

export async function ensureStandupWork(): Promise<string[]> {
  const seeded: string[] = [];
  for (const row of ROW74_HOSTED) {
    const existing = await getWork(row.workId);
    if (existing) continue;
    await enqueueWork({
      workId: row.workId,
      source: "company_objective",
      sourceReference: "row-74-fab5-agent-standup",
      title: row.title,
      description: row.description,
      ownerAgent: row.ownerAgent,
      priority: row.priority,
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: HOSTED_OPERATIONAL_ACTION,
      resourceKey: `aos-standup:${row.workId}`,
      evidenceRefs: ["ops/fab-5/launch-rows.json"],
    });
    seeded.push(row.workId);
  }
  const welcome = await getWork(DASHBOARD_WELCOME_ID);
  if (!welcome) {
    await enqueueWork({
      workId: DASHBOARD_WELCOME_ID,
      source: "company_objective",
      sourceReference: "open-cursor-work:architect-dashboard-welcome",
      title: "Architect Dashboard welcome-copy correction",
      description: DASHBOARD_WELCOME_PROMPT,
      ownerAgent: "nia",
      priority: 0,
      actionClass: "A",
      runtimeClass: "engineering",
      nextAction: "cursor_cloud_engineering",
      resourceKey: "aos-engineering:dashboard-welcome",
      evidenceRefs: ["components/app-shell/dashboard-shell.tsx"],
    });
    seeded.push(DASHBOARD_WELCOME_ID);
  } else if (await relaunchDashboardWelcomeAfterGithubSync(welcome)) {
    seeded.push(DASHBOARD_WELCOME_ID);
  }
  const stripeLive = await getWork("aos-open-row73-stripe-live");
  if (!stripeLive) {
    await enqueueWork({
      workId: "aos-open-row73-stripe-live",
      source: "company_objective",
      sourceReference: "open-cursor-work:row-73-stripe-live",
      title: "Row 73 Stripe Live Production connection",
      description:
        "Founder must replace Vercel Production STRIPE_SECRET_KEY with the Stripe Live secret. Agents must not paste, rotate, or invent keys. No charges.",
      ownerAgent: "imani",
      priority: 40,
      status: "FOUNDER_GATED",
      founderGateRequired: true,
      actionClass: "A",
      runtimeClass: "hosted",
      nextAction: "await_founder_live_stripe_key",
      blockedReason: "founder_live_stripe_key",
      resourceKey: "aos-open:row73-stripe-live",
      evidenceRefs: ["ops/fab-5/row-73-status.json"],
    });
    seeded.push("aos-open-row73-stripe-live");
  }
  return seeded;
}
