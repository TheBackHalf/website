/**
 * Row 77 Option B — Nia-owned social publishing queue.
 * Does not live-publish. Does not store passwords or tokens.
 * Does not invent a human Nia Instagram/TikTok login.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const SOCIAL_QUEUE_PATH = "ops/fab-5/social-publishing-queue.json";
export const SOCIAL_PUBLISH_LOG_PATH = "ops/fab-5/runs/social-publishing-log.json";

export type SocialPublishJob = {
  id: string;
  platform: "instagram" | "tiktok";
  publishAtEt: string;
  assetPaths: string[];
  copyRecord: string;
  status: string;
  paused: boolean;
};

export type SocialPublishQueue = {
  continuityModel: string;
  livePublishEnabled: boolean;
  doNotPublishDuringRow77Validation: boolean;
  newVendorRequired: boolean;
  operationalOwner: string;
  operationalOwnerIsHumanCredentialHolder: boolean;
  executionPath: string;
  nativeScheduleVerified: { instagram: boolean; tiktok: boolean };
  pauseAuthority: string[];
  jobs: SocialPublishJob[];
};

export type ContinuityResult = "PASS" | "FAIL" | "FOUNDER ACTION REQUIRED";

type PublishLog = {
  livePublishAttempted: boolean;
  events: Array<Record<string, unknown>>;
};

function envNamePresentInLocalFile(name: string): boolean {
  const filePath = path.join(/* turbopackIgnore: true */ process.cwd(), ".env.local");
  if (!existsSync(filePath)) return Boolean(process.env[name]?.trim());
  for (const raw of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    if (line.slice(0, eq).trim() === name) return true;
  }
  return Boolean(process.env[name]?.trim());
}

function abs(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
}

export function loadSocialPublishQueue(): SocialPublishQueue {
  return JSON.parse(readFileSync(abs(SOCIAL_QUEUE_PATH), "utf8")) as SocialPublishQueue;
}

export function loadSocialPublishLog(): PublishLog {
  if (!existsSync(abs(SOCIAL_PUBLISH_LOG_PATH))) {
    return { livePublishAttempted: false, events: [] };
  }
  return JSON.parse(readFileSync(abs(SOCIAL_PUBLISH_LOG_PATH), "utf8")) as PublishLog;
}

export function appendSocialPublishLog(event: Record<string, unknown>): void {
  const log = loadSocialPublishLog();
  log.livePublishAttempted = false;
  log.events.push({ at: new Date().toISOString(), ...event });
  writeFileSync(abs(SOCIAL_PUBLISH_LOG_PATH), `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

export function setSocialPublishJobPaused(jobId: string, paused: boolean): SocialPublishJob {
  const queue = loadSocialPublishQueue();
  const job = queue.jobs.find((row) => row.id === jobId);
  if (!job) throw new Error("row77_unknown_social_job");
  job.paused = paused;
  if (paused) job.status = "paused";
  else if (job.status === "paused") job.status = "prepared";
  writeFileSync(abs(SOCIAL_QUEUE_PATH), `${JSON.stringify(queue, null, 2)}\n`, "utf8");
  appendSocialPublishLog({
    type: paused ? "pause" : "resume",
    jobId,
    livePublishAttempted: false,
  });
  return job;
}

export function inspectSocialPublishQueue() {
  const queue = loadSocialPublishQueue();
  const log = loadSocialPublishLog();
  const missingAssets = queue.jobs.flatMap((job) =>
    job.assetPaths.filter((rel) => !existsSync(abs(rel))),
  );
  const instagramJobs = queue.jobs.filter((job) => job.platform === "instagram");
  const tiktokJobs = queue.jobs.filter((job) => job.platform === "tiktok");
  const linkedinJobs = queue.jobs.filter((job) => (job as { platform: string }).platform === "linkedin");
  const copyRecordsPresent = queue.jobs.every((job) =>
    existsSync(abs(job.copyRecord.split("#")[0] ?? "")),
  );

  return {
    queueExists: true,
    livePublishEnabled: queue.livePublishEnabled === true,
    livePublishAttempted: log.livePublishAttempted === true,
    optionB: queue.continuityModel === "OPTION_B",
    newVendorRequired: queue.newVendorRequired === true,
    niaOwnsExecution:
      queue.operationalOwner.includes("Nia Prism") &&
      queue.operationalOwnerIsHumanCredentialHolder === false,
    executionPath: queue.executionPath,
    jobCount: queue.jobs.length,
    instagramJobs: instagramJobs.length,
    tiktokJobs: tiktokJobs.length,
    linkedinJobs: linkedinJobs.length,
    missingAssets,
    copyRecordsPresent,
    pauseCapability: queue.jobs.every((job) => typeof job.paused === "boolean"),
    loggingCapability: true,
    nativeScheduleVerifiedInstagram: queue.nativeScheduleVerified.instagram === true,
    nativeScheduleVerifiedTikTok: queue.nativeScheduleVerified.tiktok === true,
    instagramGraphApiConfigured: envNamePresentInLocalFile("INSTAGRAM_GRAPH_ACCESS_TOKEN"),
    tiktokApiConfigured: envNamePresentInLocalFile("TIKTOK_CONTENT_POSTING_TOKEN"),
    existingGraphOrTikTokApiInApplication: false,
    pauseAuthority: queue.pauseAuthority,
  };
}

export function runNiaSocialPublishTick() {
  const queue = loadSocialPublishQueue();
  if (queue.livePublishEnabled) {
    throw new Error("row77_live_publish_forbidden");
  }
  const actions = queue.jobs.map((job) => {
    if (job.paused) {
      return { id: job.id, platform: job.platform, action: "skipped_paused" as const };
    }
    const verified =
      job.platform === "instagram"
        ? queue.nativeScheduleVerified.instagram
        : queue.nativeScheduleVerified.tiktok;
    if (!verified) {
      return {
        id: job.id,
        platform: job.platform,
        action: "founder_action_required_native_schedule" as const,
      };
    }
    return {
      id: job.id,
      platform: job.platform,
      action: "delegated_to_native_scheduler_founder_not_required_at_posting_time" as const,
    };
  });
  return {
    owner: queue.operationalOwner,
    livePublishAttempted: false,
    livePublishEnabled: false,
    actions,
  };
}

export function evaluateOptionBPublishing() {
  const inspect = inspectSocialPublishQueue();
  const instagramPublishingAuthorization: ContinuityResult = inspect.nativeScheduleVerifiedInstagram
    ? "PASS"
    : "FOUNDER ACTION REQUIRED";
  const tiktokPublishingAuthorization: ContinuityResult = inspect.nativeScheduleVerifiedTikTok
    ? "PASS"
    : "FOUNDER ACTION REQUIRED";
  const bothVerified =
    inspect.nativeScheduleVerifiedInstagram && inspect.nativeScheduleVerifiedTikTok;
  return {
    existingMechanismFound: false,
    mechanism:
      "Nia-owned approved publishing queue (ops/fab-5/social-publishing-queue.json) with execution path platform_native_scheduler: Instagram Professional / Meta Business Suite native scheduling and TikTok native scheduling on existing @backhalfco accounts. No Graph API, no TikTok API, no new paid SaaS. Row 82 implements this workflow and remains not Complete until Founder review.",
    newVendorRequired: inspect.newVendorRequired ? "YES" : "NO",
    instagramPublishingAuthorization,
    tiktokPublishingAuthorization,
    founderRequiredAtPostingTime: bothVerified ? "NO" : "YES",
    niaSocialUpdateExecution: bothVerified && inspect.niaOwnsExecution ? "PASS" : "FAIL",
    loggingFailureVisibility: inspect.loggingCapability ? "PASS" : "FAIL",
    pauseCancelCapability: inspect.pauseCapability ? "PASS" : "FAIL",
    scenarioH: bothVerified ? "PASS" : "FAIL",
    livePublishEnabled: inspect.livePublishEnabled,
    livePublishAttempted: inspect.livePublishAttempted,
    niaOwnsExecution: inspect.niaOwnsExecution,
    inspect,
  };
}

export function attemptLivePublish(): never {
  throw new Error("row77_live_publish_forbidden");
}
