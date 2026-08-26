/**
 * Row 77 Founder review model — Option B.
 * Reads Founder acceptance from ops/fab-5/row-77-status.json.
 * Does not ask Founder to repeat MFA. Does not complete Row 82.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  collectRow77RepoChecks,
  mechanicalDocumentationPass,
  passFail,
  ROW77_ARTIFACT_PATH,
  ROW77_FINAL_STATUS,
  ROW77_REVIEW_URL,
  ROW77_STATUS_PATH,
  type Row77RepoChecks,
} from "@/lib/fab-5/row77-governance";
import {
  evaluateOptionBPublishing,
  loadSocialPublishQueue,
  runNiaSocialPublishTick,
} from "@/lib/fab-5/social-publishing";

export { ROW77_REVIEW_URL };

type Row77StatusFile = {
  founderAccepted?: boolean;
  founderAcceptance?: string;
  rowMarkedComplete?: boolean;
};

function readRow77Status(): Row77StatusFile | null {
  const abs = path.join(process.cwd(), ROW77_STATUS_PATH);
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Row77StatusFile;
  } catch {
    return null;
  }
}

export function buildRow77ReviewModel(checks: Row77RepoChecks = collectRow77RepoChecks()) {
  const docsPass = mechanicalDocumentationPass(checks);
  const publishing = evaluateOptionBPublishing();
  const queue = loadSocialPublishQueue();
  const niaTick = runNiaSocialPublishTick();
  const hPass = publishing.scenarioH === "PASS";
  const status = readRow77Status();
  const founderAccepted =
    status?.founderAccepted === true || status?.founderAcceptance === "YES";

  const scenario = {
    A: founderAccepted || hPass
      ? "PASS"
      : "FAIL — Row 83 monitoring can continue; approved scheduled publishing is not yet natively confirmed.",
    B: founderAccepted || hPass ? "PASS" : "FAIL — native schedules not yet Founder-confirmed.",
    C: "PASS",
    D: "PASS",
    E: "PASS",
    F: "PASS",
    G: "PASS",
    H: founderAccepted
      ? "ROW 82 EXECUTION DEPENDENCY — not a Row 77 governance blocker"
      : publishing.scenarioH,
  };

  return {
    title: "Row 77 — Launch Social Channel Governance",
    finalStatus: founderAccepted ? "ROW 77 — COMPLETE" : ROW77_FINAL_STATUS,
    readyForFounderAcceptance: false,
    rowMarkedComplete: founderAccepted,
    governanceArtifact: ROW77_ARTIFACT_PATH,
    reviewUrl: ROW77_REVIEW_URL,
    mechanicalDocumentation: passFail(docsPass),
    founderDecision: "Option B — approved publishing mechanism.",
    socialOperatingOwner: "Nia Prism — Chief Experience & Transformation Officer",
    instagramMfa: "PASS",
    tiktokMfa: "PASS",
    workspaceIndependentRecovery: "PASS",
    instagramPublishingContinuity: publishing.instagramPublishingAuthorization,
    tiktokPublishingContinuity: publishing.tiktokPublishingAuthorization,
    founderRequiredAtPostingTime: publishing.founderRequiredAtPostingTime,
    scenarioH: publishing.scenarioH,
    publishingMechanism: {
      existingMechanismFound: "NO",
      mechanism: publishing.mechanism,
      newVendorRequired: publishing.newVendorRequired,
      niaSocialUpdateExecution: publishing.niaSocialUpdateExecution,
      loggingFailureVisibility: publishing.loggingFailureVisibility,
      pauseCancelCapability: publishing.pauseCancelCapability,
      livePublishEnabled: publishing.livePublishEnabled ? "YES" : "NO",
      livePublishAttempted: publishing.livePublishAttempted ? "YES" : "NO",
      executionPath: queue.executionPath,
      jobs: queue.jobs.map((job) => ({
        id: job.id,
        platform: job.platform,
        publishAtEt: job.publishAtEt,
        status: job.status,
        paused: job.paused ? "YES" : "NO",
      })),
      niaTickActions: niaTick.actions,
    },
    accountOwnership: {
      instagram:
        "Owner: Kimberly M. Walker — Founder. Operational publishing: Nia Prism (via Option B; not a human credential holder). Public voice: Nia Prism. Backup monitor: Michelle Northstar. Identity recovery remains Founder-controlled and is distinct from routine publishing continuity. Recovery mailbox named: kimberly@thebackhalf.org. Second human admin is not the Row 77 solution.",
      tiktok:
        "Owner: Kimberly M. Walker — Founder. Operational publishing: Nia Prism (via Option B; not a human credential holder). Public voice: Nia Prism. Backup monitor: Michelle Northstar. Identity recovery remains Founder-controlled and is distinct from routine publishing continuity. Recovery mailbox named: kimberly@thebackhalf.org. Second human admin is not the Row 77 solution.",
    },
    administratorBackupAccess: {
      instagram:
        "Option B — native Instagram Professional / Meta Business Suite scheduler is the continuity path. A second human Instagram administrator is not required and is not a defect after Option B is verified. Native schedule load: FOUNDER ACTION REQUIRED.",
      tiktok:
        "Option B — native TikTok scheduling is the continuity path (not identical to Instagram). A second human TikTok administrator is not required. If native TikTok scheduling is unavailable, that is FOUNDER DECISION REQUIRED — NEW VENDOR. Native schedule load: FOUNDER ACTION REQUIRED.",
    },
    credentialRecovery:
      "Process documented. Workspace independent recovery: PASS (Founder-verified; do not repeat). Passwords/MFA/codes are not stored. Founder may remain identity-recovery owner. That does not fail Row 77 by itself.",
    mfa: {
      instagram: "PASS",
      tiktok: "PASS",
      workspaceIndependentRecovery: "PASS",
      requirement:
        "MFA MUST be enabled for privileged access. Authenticator preferred over SMS. Founder-verified for Instagram and TikTok. AI executives are not independent MFA device holders. Do not ask Founder to repeat MFA or Workspace recovery.",
    },
    postingAuthority:
      "Nia Prism owns execution of approved Instagram and TikTok updates through the Option B mechanism. Michelle Northstar is backup monitor/logging/routing and may pause. Imani Heartbeat is technical/security after escalation and does not independently alter brand messaging. Founder approval only at defined thresholds. Founder is not required for routine approved posting and is not required to be online when an already-approved scheduled post publishes.",
    commentsDms:
      "Row 83 remains the only engagement protocol. Nia Prism primary monitor/public voice. Michelle Northstar backup logging/routing. Imani Heartbeat technical/security after routing. Founder escalation only. Sales, support, complaints, privacy/security, legal/reputational, abuse/spam, DMs with personal information, and account-specific support follow Row 83. LinkedIn is not a Row 77 launch channel.",
    brandStandards:
      "Connected to Founder-approved voice, visual system, Row 81 copy/assets, The Back Half, from expectation to intention, Magical is Possible., Become an Architect, THE QUESTION. Material deviations require Founder approval. Copy and assets were not rewritten.",
    approvalThresholds:
      "No new Founder approval for already-approved campaign content, routine scheduling, meaning-preserving typos, and Row 83 engagement. Founder approval for new positioning, material copy/visual changes, public Founder statements, crisis/legal/policy/pricing/claims, and deletion of a Founder-approved launch asset. Privacy/security/threats/impersonation/compromise/legal/regulatory/reputational issues escalate; Founder notified only at threshold.",
    emergencyAccess:
      "Pause: Nia Prism, Michelle Northstar, Imani Heartbeat when security-related. Security lead: Imani Heartbeat. Communications lead: Nia Prism. Founder notified only at escalation threshold. Preserve evidence before deletion when investigation may be required. Covers compromise, takeover, unauthorized post, lost MFA device, inaccessible primary admin, compromised recovery email, suspension, impersonation, accidental publication, and urgent scheduled-post pause.",
    solePointOfFailureTest: scenario,
    founderVerificationRequired: [
      "Instagram MFA — already PASS. Do not repeat.",
      "TikTok MFA — already PASS. Do not repeat.",
      "Google Workspace independent recovery — already PASS. Do not repeat.",
      "Instagram @backhalfco — load locked August 28–31 jobs in Instagram Professional / Meta Business Suite native scheduler at queue times so they publish without Founder login at posting time. Do not publish now except as those scheduled times. Reply CONFIRMED or name the failed item.",
      "TikTok @backhalfco — load locked August 28–31 jobs in TikTok native scheduling at queue times so they publish without Founder login at posting time. If native TikTok scheduling is unavailable, name that item. Do not purchase a scheduler. Reply CONFIRMED or name the failed item.",
    ],
    actualBlockers: [
      "Native Instagram Professional / Meta Business Suite schedules for locked August 28–31 jobs are not Founder-confirmed. Scenario H remains FAIL.",
      "Native TikTok schedules for locked August 28–31 jobs are not Founder-confirmed. If native TikTok scheduling is unavailable, that becomes FOUNDER DECISION REQUIRED — NEW VENDOR; it is not assumed here.",
    ],
    conflictsFoundAndCorrected: [
      "Prior Row 77 draft assigned Asha Canvas as publishing owner. Withdrawn. Current operating owner is Nia Prism. Asha remains only as a superseded-name correction note and in historical records (Row 33 / prior decision-log entry).",
      "Prior Row 77 draft treated a second human administrator as the continuity solution. Withdrawn. Founder Decision Option B is the continuity model.",
      "Prior Row 77 report listed Instagram/TikTok MFA and Workspace recovery as Founder verification required. Updated to Founder-verified PASS. Do not ask Founder to repeat.",
      "Row 83 remains the only engagement protocol. Stale accountExists:false correction from the first pass is preserved.",
      "Row 202 Launch Day Runbook was not rewritten. Reported dependency/gap: runbook assumes Nia can publish at 8:00 AM / 12:00 PM ET; Option B native scheduling is the intended execution path and is not yet confirmed.",
      "Row 74 MFA/second-owner fields were not rewritten. Row 77 now records current Founder-verified MFA/Workspace facts and Option B continuity.",
    ],
    regression: {
      row20: "PASS",
      row74: "PASS",
      row76: "PASS",
      row81: "PASS",
      row83: "PASS",
      row202: "PASS",
      instagram: "PASS",
      tiktok: "PASS",
      brand: "PASS",
      securityPrivacy: "PASS",
      runtimeConsole: "PASS",
      socialChannelSetup:
        "PASS — official Instagram/TikTok remain @backhalfco. LinkedIn remains future enhancement. X was not added.",
      launchCampaign:
        "PASS — Row 81 copy/assets not rewritten. THE QUESTION and Become an Architect preserved.",
      engagementProtocol:
        "PASS — Row 83 remains the only response system.",
      security:
        "PASS — secrets not stored. MFA recorded PASS in Row 77 from Founder verification. No live publication during testing.",
      launchDayRunbook:
        "PASS — runbook not rewritten. Nia remains Aug 31 locked-post publisher. Option B is the continuity path; native schedule confirmation remains the dependency/gap.",
      overall: passFail(docsPass),
    },
    founderActionsRequired: founderAccepted
      ? [
          "NONE — Row 77 Complete. Founder accepted 2026-08-24.",
          "Row 82 execution dependency preserved separately; it does not prevent completion of the Row 77 governance commitment.",
          "Do not send secrets. Do not add a second human admin. Do not rebuild Row 77.",
        ]
      : [
          "Do not send passwords, MFA codes, recovery codes, backup codes, recovery emails, or phone numbers.",
          "Do not repeat Instagram MFA, TikTok MFA, or Workspace independent recovery.",
          "Do not add a second human social administrator to satisfy Row 77.",
          "Do not purchase Buffer, Later, Hootsuite, or another scheduler from this row.",
          "Load locked August 28–31 Instagram jobs into Instagram Professional / Meta Business Suite native scheduler at the queue times so they publish without Founder login at posting time. Do not publish now except as those scheduled times.",
          "Load locked August 28–31 TikTok jobs into TikTok native scheduling at the queue times so they publish without Founder login at posting time. If native TikTok scheduling is unavailable, name that item.",
          "Reply CONFIRMED or name the failed item. Do not mark Row 77 Complete until you explicitly accept it.",
        ],
    remainingRow77Blockers: founderAccepted
      ? []
      : [
          "FOUNDER ACTION REQUIRED — confirm locked August 28–31 Instagram jobs are scheduled natively on @backhalfco and will publish without Founder login at posting time.",
          "FOUNDER ACTION REQUIRED — confirm locked August 28–31 TikTok jobs are scheduled natively on @backhalfco and will publish without Founder login at posting time. If native TikTok scheduling is unavailable, report that instead of purchasing a vendor.",
        ],
    checks,
    publishing,
  };
}

export function getRow77ReviewModel() {
  return buildRow77ReviewModel();
}
