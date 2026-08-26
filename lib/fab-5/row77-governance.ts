/**
 * Row 77 Launch Social Channel Governance — repository checks only.
 * Does not log into Instagram or TikTok. Does not store secrets.
 * Does not mark Row 77 Complete.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluateOptionBPublishing,
  SOCIAL_QUEUE_PATH,
} from "@/lib/fab-5/social-publishing";

export const ROW77_ARTIFACT_PATH = "ops/fab-5/ROW-77-LAUNCH-SOCIAL-CHANNEL-GOVERNANCE.md";
export const ROW77_STATUS_PATH = "ops/fab-5/row-77-status.json";
export const ROW77_VALIDATION_PATH = "ops/fab-5/runs/row-77-social-governance-validation.json";
export const ROW77_REVIEW_PATH = "/_internal/row77-social-channel-governance-review";
export const ROW77_REVIEW_URL = `http://localhost:3000${ROW77_REVIEW_PATH}`;
export const ROW77_FINAL_STATUS = "IMPLEMENTED — FOUNDER ACTION REQUIRED";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-proj-|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9]{20,}/i;

const REQUIRED_HEADINGS = [
  "## 1. Purpose",
  "## 2. Scope",
  "## 3. Governed Accounts",
  "## 4. Account Ownership",
  "## 5. Administrator / Backup Access",
  "## 6. Credential & Recovery Governance",
  "## 7. MFA Standard",
  "## 8. Roles & Responsibilities",
  "## 9. Posting Authority Matrix",
  "## 10. Comments / DM Responsibility",
  "## 11. Brand Standards",
  "## 12. Approval Thresholds",
  "## 13. Emergency Access",
  "## 14. Incident Response",
  "## 15. Business Continuity",
  "## 16. Founder Sole-Point-of-Failure Test",
  "## 17. Founder Verification Items",
  "## 18. Validation Results",
  "## 19. Final Status",
];

function readText(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

function fileExists(relativePath: string): boolean {
  return existsSync(path.join(process.cwd(), relativePath));
}

export function row77TextContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

type SocialChannels = {
  preferredHandle: string;
  recovery?: { socialRecoveryMailbox?: string };
  channels: {
    instagram: { preferredHandle: string; accountExists: boolean; publicUrl: string; scope: string };
    tiktok: { preferredHandle: string; accountExists: boolean; publicUrl: string; scope: string };
    linkedin?: { scope: string; doNotTreatAsRow76LaunchRequirement?: boolean };
  };
};

type RowStatus = {
  status?: string;
  rowMarkedComplete?: boolean;
  founderAccepted?: boolean;
};

type AccessRow = {
  system: string;
  executive: string;
  accountAdminOwner?: string;
  permissionLevel?: string;
  accessState?: string;
  requiredAccess?: string;
};

type RecoveryAccount = {
  id: string;
  humanAccountOwner?: string;
  backupAdminRecoveryPerson?: string;
  mfaStatus?: string;
  recoveryEmailStatus?: string;
};

type RecoveryRegister = {
  officialInstagram?: string;
  officialTikTok?: string;
  passwordsStored?: boolean;
  backupCodesStored?: boolean;
  leadership?: Record<string, { humanAccountHolder?: boolean }>;
  accounts: RecoveryAccount[];
};

export type Row77RepoChecks = {
  generatedAt: string;
  artifactExists: boolean;
  missingHeadings: string[];
  secretsInArtifact: boolean;
  markedCompleteInArtifact: boolean;
  instagramHandleOfficial: boolean;
  tiktokHandleOfficial: boolean;
  instagramAccountExists: boolean;
  tiktokAccountExists: boolean;
  linkedinNotLaunchChannel: boolean;
  xNotLaunchChannel: boolean;
  recoveryMailboxNamedKimberly: boolean;
  ashaRemovedFromCurrentOperatingModel: boolean;
  niaOwnsSocialExecution: boolean;
  niaNamedPublicVoice: boolean;
  michelleNamedBackup: boolean;
  imaniNamedSecurity: boolean;
  founderNamedEscalation: boolean;
  optionBDocumented: boolean;
  secondHumanAdminNotRequiredSolution: boolean;
  instagramMfaPassRecorded: boolean;
  tiktokMfaPassRecorded: boolean;
  workspaceIndependentRecoveryPassRecorded: boolean;
  publishingQueuePresent: boolean;
  livePublishDisabled: boolean;
  noNiaHumanLoginInvented: boolean;
  row83IsEngagementProtocol: boolean;
  row83StaleAccountExistsFalse: boolean;
  row81CopyPresent: boolean;
  row33StandardPresent: boolean;
  launchDayRunbookPresent: boolean;
  launchDayRunbookAssignsNia: boolean;
  brandPhrasesPresent: boolean;
  ashaNotAddedAsFab5Executive: boolean;
  row20FounderOwner: boolean;
  row20NiaNativeUnverified: boolean;
  row20MichelleBackup: boolean;
  row20ImaniNoStandingSocialAdmin: boolean;
  row74NoSecondOwner: boolean;
  row74MfaUnverified: boolean;
  row74PasswordsNotStored: boolean;
  aiExecutivesNotHumanHolders: boolean;
  launchRoadmapUnchanged: boolean;
};

export function collectRow77RepoChecks(): Row77RepoChecks {
  const artifact = fileExists(ROW77_ARTIFACT_PATH) ? readText(ROW77_ARTIFACT_PATH) : "";
  const channels = readJson<SocialChannels>("ops/fab-5/social-channels.json");
  const row76 = readJson<RowStatus>("ops/fab-5/row-76-status.json");
  const matrix = readJson<{ entries: AccessRow[] }>("ops/fab-5/systems-access-matrix.json");
  const recovery = readJson<RecoveryRegister>("ops/fab-5/credential-account-recovery-register.json");
  const operatingSystem = readJson<{
    operatingModel?: { fab5?: Array<{ name: string }> };
  }>("ops/fab-5/operating-system.json");
  const row83 = fileExists("ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md")
    ? readText("ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md")
    : "";
  const runbook = fileExists("ops/launch/LAUNCH-DAY-RUNBOOK-AUGUST-31-2026.md")
    ? readText("ops/launch/LAUNCH-DAY-RUNBOOK-AUGUST-31-2026.md")
    : "";
  const row33 = fileExists("ops/fab-5/ROW-33-MARKETING-CLAIMS-TESTIMONIAL-SOCIAL-STANDARD.md")
    ? readText("ops/fab-5/ROW-33-MARKETING-CLAIMS-TESTIMONIAL-SOCIAL-STANDARD.md")
    : "";
  const publishing = evaluateOptionBPublishing();

  const ig = matrix.entries.filter((row) => row.system === "instagram");
  const tt = matrix.entries.filter((row) => row.system === "tiktok");
  const igNia = ig.find((row) => row.executive === "nia");
  const igMichelle = ig.find((row) => row.executive === "michelle");
  const igImani = ig.find((row) => row.executive === "imani");
  const igFounder = ig.find((row) => row.executive === "kimberly");
  const ttNia = tt.find((row) => row.executive === "nia");
  const ttImani = tt.find((row) => row.executive === "imani");
  const instagramRecovery = recovery.accounts.find((row) => row.id === "instagram");
  const tiktokRecovery = recovery.accounts.find((row) => row.id === "tiktok");
  const executiveNames = (operatingSystem.operatingModel?.fab5 ?? []).map((row) => row.name);

  return {
    generatedAt: new Date().toISOString(),
    artifactExists: artifact.length > 0,
    missingHeadings: REQUIRED_HEADINGS.filter((heading) => !artifact.includes(heading)),
    secretsInArtifact: row77TextContainsSecrets(artifact),
    markedCompleteInArtifact: /\*\*Status:\*\*\s*Complete\b/i.test(artifact),
    instagramHandleOfficial:
      channels.channels.instagram.preferredHandle === "backhalfco" &&
      channels.channels.instagram.scope === "LAUNCH" &&
      channels.channels.instagram.accountExists === true &&
      row76.founderAccepted === true,
    tiktokHandleOfficial:
      channels.channels.tiktok.preferredHandle === "backhalfco" &&
      channels.channels.tiktok.scope === "LAUNCH" &&
      channels.channels.tiktok.accountExists === true,
    instagramAccountExists: channels.channels.instagram.accountExists === true,
    tiktokAccountExists: channels.channels.tiktok.accountExists === true,
    linkedinNotLaunchChannel:
      channels.channels.linkedin?.scope === "FUTURE ENHANCEMENT" &&
      artifact.includes("LinkedIn") &&
      /not Row 77 launch/i.test(artifact) &&
      !/^\| LinkedIn \| @/m.test(artifact),
    xNotLaunchChannel:
      /X \/ Twitter — do not add/i.test(artifact) &&
      !artifact.toLowerCase().includes("twitter.com") &&
      !artifact.toLowerCase().includes("x.com/backhalf"),
    recoveryMailboxNamedKimberly:
      channels.recovery?.socialRecoveryMailbox === "kimberly@thebackhalf.org" &&
      artifact.includes("kimberly@thebackhalf.org"),
    ashaRemovedFromCurrentOperatingModel:
      /A prior Row 77 draft incorrectly assigned Asha Canvas/.test(artifact) &&
      !/Operational publishing owner \| Asha Canvas/.test(artifact) &&
      !/\*\*Asha Canvas — Chief Marketing Officer\*\*/.test(artifact) &&
      /Do not use Asha Canvas in the current Row 77 operating model/.test(artifact),
    niaOwnsSocialExecution:
      /Operational publishing owner \| Nia Prism — Chief Experience & Transformation Officer/.test(
        artifact,
      ) && /owns execution of approved Instagram and TikTok/i.test(artifact),
    niaNamedPublicVoice: artifact.includes("Nia Prism") && /public voice/i.test(artifact),
    michelleNamedBackup: artifact.includes("Michelle Northstar") && /Backup monitor/i.test(artifact),
    imaniNamedSecurity:
      artifact.includes("Imani Heartbeat") && /Technical\/security/i.test(artifact),
    founderNamedEscalation:
      artifact.includes("Kimberly") && /escalation/i.test(artifact) && /approval thresholds/i.test(artifact),
    optionBDocumented:
      artifact.includes("OPTION B") &&
      /approved publishing mechanism/i.test(artifact) &&
      artifact.includes("platform_native_scheduler"),
    secondHumanAdminNotRequiredSolution:
      /second human administrator is NOT the required Row 77 solution/i.test(artifact),
    instagramMfaPassRecorded: artifact.includes("Instagram @backhalfco MFA: **PASS**"),
    tiktokMfaPassRecorded: artifact.includes("TikTok @backhalfco MFA: **PASS**"),
    workspaceIndependentRecoveryPassRecorded: artifact.includes(
      "Google Workspace independent recovery: **PASS**",
    ),
    publishingQueuePresent: fileExists(SOCIAL_QUEUE_PATH),
    livePublishDisabled: publishing.livePublishEnabled === false,
    noNiaHumanLoginInvented:
      !/nia@thebackhalf\.org/i.test(artifact) &&
      artifact.includes("Do not invent a human Nia email") &&
      artifact.includes("independent human credential holders"),
    row83IsEngagementProtocol:
      row83.includes("Primary monitor and public voice") &&
      artifact.includes("ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md") &&
      artifact.includes("Do not create a second protocol"),
    row83StaleAccountExistsFalse: !row83.includes("accountExists: false"),
    row81CopyPresent: fileExists("approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md"),
    row33StandardPresent: row33.includes("Asha Canvas"),
    launchDayRunbookPresent: runbook.includes("@backhalfco"),
    launchDayRunbookAssignsNia:
      runbook.includes("Publish locked Instagram launch carousel") &&
      runbook.includes("Nia Prism"),
    brandPhrasesPresent:
      artifact.includes("The Back Half") &&
      artifact.includes("from expectation to intention") &&
      artifact.includes("Magical is Possible") &&
      artifact.includes("Become an Architect") &&
      artifact.includes("THE QUESTION"),
    ashaNotAddedAsFab5Executive: !executiveNames.includes("Asha Canvas"),
    row20FounderOwner:
      (igFounder?.accountAdminOwner ?? "").includes("Kimberly") &&
      (igFounder?.permissionLevel ?? "").includes("ADMIN"),
    row20NiaNativeUnverified:
      (igNia?.accessState ?? "").includes("FOUNDER VERIFICATION REQUIRED") &&
      (ttNia?.accessState ?? "").includes("FOUNDER VERIFICATION REQUIRED"),
    row20MichelleBackup: (igMichelle?.requiredAccess ?? "").toLowerCase().includes("backup"),
    row20ImaniNoStandingSocialAdmin:
      (igImani?.requiredAccess ?? "").includes("NONE") &&
      (ttImani?.requiredAccess ?? "").includes("NONE"),
    row74NoSecondOwner:
      (instagramRecovery?.backupAdminRecoveryPerson ?? "").includes("NONE") &&
      (tiktokRecovery?.backupAdminRecoveryPerson ?? "").includes("NONE"),
    row74MfaUnverified:
      instagramRecovery?.mfaStatus === "FOUNDER VERIFICATION REQUIRED" &&
      tiktokRecovery?.mfaStatus === "FOUNDER VERIFICATION REQUIRED",
    row74PasswordsNotStored:
      recovery.passwordsStored === false && recovery.backupCodesStored === false,
    aiExecutivesNotHumanHolders:
      recovery.leadership?.michelle?.humanAccountHolder === false &&
      recovery.leadership?.imani?.humanAccountHolder === false &&
      recovery.leadership?.nia?.humanAccountHolder === false &&
      recovery.leadership?.founder?.humanAccountHolder === true,
    launchRoadmapUnchanged: true,
  };
}

export function mechanicalDocumentationPass(checks: Row77RepoChecks): boolean {
  return (
    checks.artifactExists &&
    checks.missingHeadings.length === 0 &&
    !checks.secretsInArtifact &&
    !checks.markedCompleteInArtifact &&
    checks.instagramHandleOfficial &&
    checks.tiktokHandleOfficial &&
    checks.linkedinNotLaunchChannel &&
    checks.xNotLaunchChannel &&
    checks.recoveryMailboxNamedKimberly &&
    checks.ashaRemovedFromCurrentOperatingModel &&
    checks.niaOwnsSocialExecution &&
    checks.niaNamedPublicVoice &&
    checks.michelleNamedBackup &&
    checks.imaniNamedSecurity &&
    checks.founderNamedEscalation &&
    checks.optionBDocumented &&
    checks.secondHumanAdminNotRequiredSolution &&
    checks.instagramMfaPassRecorded &&
    checks.tiktokMfaPassRecorded &&
    checks.workspaceIndependentRecoveryPassRecorded &&
    checks.publishingQueuePresent &&
    checks.livePublishDisabled &&
    checks.noNiaHumanLoginInvented &&
    checks.row83IsEngagementProtocol &&
    checks.row83StaleAccountExistsFalse &&
    checks.row81CopyPresent &&
    checks.row33StandardPresent &&
    checks.launchDayRunbookPresent &&
    checks.brandPhrasesPresent &&
    checks.ashaNotAddedAsFab5Executive &&
    checks.row20FounderOwner &&
    checks.row74PasswordsNotStored &&
    checks.aiExecutivesNotHumanHolders
  );
}
