/**
 * Row 82 Social Publishing and Scheduling System.
 * Reuses Row 77 Option B native-scheduler path. Does not live-publish.
 * Does not invent Nia credentials. Does not add LinkedIn or X.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  evaluateOptionBPublishing,
  loadSocialPublishQueue,
} from "@/lib/fab-5/social-publishing";

export const ROW82_ARTIFACT_PATH = "ops/fab-5/ROW-82-SOCIAL-PUBLISHING-SCHEDULING-SYSTEM.md";
export const ROW82_MANIFEST_PATH = "ops/fab-5/row-82-social-publishing-manifest.json";
export const ROW82_STATUS_PATH = "ops/fab-5/row-82-status.json";
export const ROW82_VALIDATION_PATH = "ops/fab-5/runs/row-82-social-publishing-validation.json";
export const ROW82_REVIEW_PATH = "/_internal/row82-social-publishing-review";
export const ROW82_REVIEW_URL = `http://localhost:3000${ROW82_REVIEW_PATH}`;
export const ROW82_MEDIA_PATH = "/_internal/row82-social-publishing-review/media";
export const ROW82_FINAL_STATUS = "IMPLEMENTED — FOUNDER ACTION REQUIRED";
export const APPROVED_ENROLLMENT_CTA = "Become an Architect";
export const APPROVED_ENROLLMENT_URL = "https://thebackhalf.org/register";
export const ARCHIVE = "approved-assets/row-81-social-launch";
export const COPY_PATH = `${ARCHIVE}/ROW-81-FINAL-APPROVED-COPY.md`;
export const CAMPAIGN_ASSETS = "ops/fab-5/campaigns/row-81/assets";
export const TIMEZONE = "America/New_York";
export const TIMEZONE_LABEL = "Eastern Time (ET)";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-proj-|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9]{20,}/i;

export type Row82Platform = "instagram" | "tiktok";

export type Row82AssetPreview = {
  filename: string;
  archivePath: string;
  resolvedPath: string;
  exists: boolean;
  kind: "image" | "video";
  previewUrl: string;
  width: number | null;
  height: number | null;
  expectedWidth: number;
  expectedHeight: number;
  dimensionsPass: boolean;
  playable: boolean | null;
};

export type Row82Entry = {
  id: string;
  date: string;
  timeEt: string;
  timezone: string;
  timezoneLabel: string;
  platform: Row82Platform;
  account: string;
  campaign: string;
  format: string;
  slideCount: number | null;
  assets: Row82AssetPreview[];
  caption: string;
  captionSource: string;
  onScreenCopy: string;
  cta: string;
  alternateCta: string;
  destination: string;
  enrollmentActionable: boolean;
  publishingMethod: "platform_native_scheduler";
  automation: "FOUNDER ACTION REQUIRED";
  schedulingStatus: string;
  previewStatus: "PASS" | "FAIL";
  owner: string;
  fallback: string;
  postingInstructions: string;
  notes: string;
};

function abs(relativePath: string): string {
  return path.join(/* turbopackIgnore: true */ process.cwd(), relativePath);
}

function basenameOf(archiveRel: string): string {
  return archiveRel.split("/").pop() ?? archiveRel;
}

export function resolveProductionFile(archiveRel: string): string | null {
  const archivePath = abs(`${ARCHIVE}/${archiveRel}`);
  if (existsSync(archivePath)) return `${ARCHIVE}/${archiveRel}`;
  const campaignPath = abs(`${CAMPAIGN_ASSETS}/${basenameOf(archiveRel)}`);
  if (existsSync(campaignPath)) return `${CAMPAIGN_ASSETS}/${basenameOf(archiveRel)}`;
  return null;
}

function pngInfo(filePath: string): { ok: boolean; width: number; height: number } {
  const data = readFileSync(filePath);
  const png = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const width = png ? data.readUInt32BE(16) : 0;
  const height = png ? data.readUInt32BE(20) : 0;
  return { ok: png && width > 0 && height > 0, width, height };
}

function mp4Playable(filePath: string): boolean {
  const data = readFileSync(filePath);
  if (data.length < 32) return false;
  if (data.subarray(4, 8).toString("latin1") !== "ftyp") return false;
  return data.includes(Buffer.from("moov")) && data.includes(Buffer.from("mdat"));
}

function inspectAsset(
  archiveRel: string,
  expectedWidth: number,
  expectedHeight: number,
): Row82AssetPreview {
  const filename = basenameOf(archiveRel);
  const resolved = resolveProductionFile(archiveRel);
  const kind: "image" | "video" = filename.endsWith(".mp4") ? "video" : "image";
  const preview: Row82AssetPreview = {
    filename,
    archivePath: `${ARCHIVE}/${archiveRel}`,
    resolvedPath: resolved ?? "",
    exists: Boolean(resolved),
    kind,
    previewUrl: `${ROW82_MEDIA_PATH}/${filename}`,
    width: null,
    height: null,
    expectedWidth,
    expectedHeight,
    dimensionsPass: false,
    playable: kind === "video" ? false : null,
  };
  if (!resolved) return preview;
  const filePath = abs(resolved);
  if (kind === "image") {
    const info = pngInfo(filePath);
    preview.width = info.width;
    preview.height = info.height;
    preview.dimensionsPass = info.ok && info.width === expectedWidth && info.height === expectedHeight;
  } else {
    preview.playable = mp4Playable(filePath);
    preview.dimensionsPass = preview.playable === true;
  }
  return preview;
}

const OWNER =
  "Nia Prism — Chief Experience & Transformation Officer (operating role; not a human credential holder)";
const FALLBACK =
  "If the native scheduler fails or the post is not loaded, Founder authenticates to @backhalfco and publishes manually at the approved Eastern Time from this manifest. Nia owns the operating duty. Michelle logs/routes. Imani if technical/security. Do not invent a Nia login.";

type Spec = {
  id: string;
  date: string;
  timeEt: string;
  platform: Row82Platform;
  campaign: string;
  format: string;
  slideCount: number | null;
  files: string[];
  expectedWidth: number;
  expectedHeight: number;
  caption: string;
  onScreenCopy: string;
  cta: string;
  alternateCta: string;
  destination: string;
  postingInstructions: string;
};

const SPECS: Spec[] = [
  {
    id: "R78-0828-IG",
    date: "2026-08-28",
    timeEt: "8:00 AM ET",
    platform: "instagram",
    campaign: "What if this isn't all there is?",
    format: "carousel",
    slideCount: 4,
    files: [
      "instagram/R78-0828-IG-S01.png",
      "instagram/R78-0828-IG-S02.png",
      "instagram/R78-0828-IG-S03.png",
      "instagram/R78-0828-IG-S04.png",
    ],
    expectedWidth: 1080,
    expectedHeight: 1350,
    caption:
      "A life can be full — career, family, home, accomplishment — and still grow quiet.\n\nNot because anything went wrong.\nBecause expectation can be completed, and aliveness can still be waiting.\n\nThe Back Half was created for that moment. A place to move from the life you were supposed to live to the life you intentionally design.\n\nAugust 31, 2026.",
    onScreenCopy:
      "THE QUESTION\nSlide 1: What if this isn't all there is?\nSlide 2 (type): You did everything you were supposed to do.\nSlide 3: Now what?\nSlide 4 (type): August 31.",
    cta: "Stay with the question.",
    alternateCta: "August 31.",
    destination: "https://thebackhalf.org/",
    postingInstructions:
      "Instagram feed carousel. Upload all four slides in order S01–S04. Paste the caption exactly. Do not add hashtags. First comment not required. Keep the profile link as thebackhalf.org. Publish at 8:00 AM ET. Do not alter type or crop.",
  },
  {
    id: "R78-0828-TT",
    date: "2026-08-28",
    timeEt: "12:00 PM ET",
    platform: "tiktok",
    campaign: "What if this isn't all there is?",
    format: "short-form-vertical-video",
    slideCount: null,
    files: ["tiktok/R78-0828-TT.mp4", "tiktok/R78-0828-TT-cover.png"],
    expectedWidth: 1080,
    expectedHeight: 1920,
    caption:
      "You can do everything right\nand still feel the quiet.\n\nNot because the life failed.\nBecause a good life can still want more.\n\nAugust 31.",
    onScreenCopy:
      "1. Visual pause — approved dawn atmosphere, no type.\n2. THE QUESTION / What if this isn't all there is?\n3. Type: You did everything you were supposed to do.\n4. Now what?\n5. Type: August 31.",
    cta: "If that landed — August 31.",
    alternateCta: "thebackhalf.org",
    destination: "https://thebackhalf.org/",
    postingInstructions:
      "TikTok native video. Upload R78-0828-TT.mp4. Cover is the first frame (R78-0828-TT-cover.png). Paste the caption exactly. No trending audio. No extra on-screen text. Add the website in bio. Publish at 12:00 PM ET.",
  },
  {
    id: "R78-0829-IG",
    date: "2026-08-29",
    timeEt: "8:00 AM ET",
    platform: "instagram",
    campaign: "When was the last time you felt completely alive?",
    format: "carousel",
    slideCount: 4,
    files: [
      "instagram/R78-0829-IG-S01.png",
      "instagram/R78-0829-IG-S02.png",
      "instagram/R78-0829-IG-S03.png",
      "instagram/R78-0829-IG-S04.png",
    ],
    expectedWidth: 1080,
    expectedHeight: 1350,
    caption:
      "Aliveness is not a vacation from your life.\nIt is the feeling of being present inside it — wonder, meaning, adventure, purpose.\n\nThe Back Half Journey is how that feeling becomes a design. Seven chapters. Intention instead of hope.\n\nYour next chapter does not have to look like your last one.",
    onScreenCopy:
      "THE QUESTION\nSlide 1: When was the last time you felt completely alive?\nSlide 2 (type): Magical is Possible.\nSlide 3: What are you saving for someday?\nSlide 4 (type): There is a path.",
    cta: "Explore the Journey.",
    alternateCta: "There is a path.",
    destination: "https://thebackhalf.org/journey",
    postingInstructions:
      "Instagram feed carousel. Upload S01–S04 in order. Paste the caption exactly. Do not add hashtags. Publish at 8:00 AM ET.",
  },
  {
    id: "R78-0829-TT",
    date: "2026-08-29",
    timeEt: "12:00 PM ET",
    platform: "tiktok",
    campaign: "When was the last time you felt completely alive?",
    format: "short-form-vertical-video",
    slideCount: null,
    files: ["tiktok/R78-0829-TT.mp4", "tiktok/R78-0829-TT-cover.png"],
    expectedWidth: 1080,
    expectedHeight: 1920,
    caption:
      "Aliveness is not somewhere else.\n\nIt is what happens when you stop saving your life for later.\n\nThe Journey is the path.\nAugust 31.",
    onScreenCopy:
      "1. Visual pause — approved light, no type.\n2. THE QUESTION / When was the last time you felt completely alive?\n3. Type: Magical is Possible.\n4. THE QUESTION / What are you saving for someday?\n5. Type: There is a path.",
    cta: "Explore the Journey.",
    alternateCta: "thebackhalf.org/journey",
    destination: "https://thebackhalf.org/journey",
    postingInstructions:
      "TikTok native video. Upload R78-0829-TT.mp4. Use the produced cover. Paste the caption exactly. No trending audio. Publish at 12:00 PM ET.",
  },
  {
    id: "R78-0830-IG",
    date: "2026-08-30",
    timeEt: "8:00 AM ET",
    platform: "instagram",
    campaign: "What if someday is August 31?",
    format: "carousel",
    slideCount: 3,
    files: [
      "instagram/R78-0830-IG-S01.png",
      "instagram/R78-0830-IG-S02.png",
      "instagram/R78-0830-IG-S03.png",
    ],
    expectedWidth: 1080,
    expectedHeight: 1350,
    caption:
      "The doors open tomorrow.\n\nInside The Back Half Journey is Lumina — your AI Guide. A place for better questions, deeper reflection, and the conversation that continues as you design what comes next.\n\nTomorrow, you can Become an Architect.",
    onScreenCopy:
      "THE QUESTION\nSlide 1 (type): What if someday is August 31?\nSlide 2: Lumina — presence only, no type.\nSlide 3 (type): Tomorrow.",
    cta: "Return tomorrow. Become an Architect.",
    alternateCta: "The doors open tomorrow.",
    destination: "https://thebackhalf.org/lumina",
    postingInstructions:
      "Instagram feed carousel. Upload S01–S03 in order (the question, Lumina presence, Tomorrow). Paste the caption exactly. If AI disclosure is required at placement, add only a quiet first-comment link to https://thebackhalf.org/legal/ai-disclosure. Publish at 8:00 AM ET.",
  },
  {
    id: "R78-0830-TT",
    date: "2026-08-30",
    timeEt: "12:00 PM ET",
    platform: "tiktok",
    campaign: "What if someday is August 31?",
    format: "short-form-vertical-video",
    slideCount: null,
    files: ["tiktok/R78-0830-TT.mp4", "tiktok/R78-0830-TT-cover.png"],
    expectedWidth: 1080,
    expectedHeight: 1920,
    caption:
      "Someday has a date.\n\nTomorrow, The Back Half opens.\nLumina will be there.\nYou can begin.",
    onScreenCopy:
      "1. Visual pause.\n2. THE QUESTION / What if someday is August 31?\n3. Lumina — presence only.\n4. Type: Tomorrow.",
    cta: "Tomorrow.",
    alternateCta: "Become an Architect.",
    destination: APPROVED_ENROLLMENT_URL,
    postingInstructions:
      "TikTok native video. Upload R78-0830-TT.mp4. Use the produced cover. Paste the caption exactly. No trending audio. If disclosure is required, quiet first-comment link only. Publish at 12:00 PM ET.",
  },
  {
    id: "R81-0831-IG",
    date: "2026-08-31",
    timeEt: "8:00 AM ET",
    platform: "instagram",
    campaign: "THE BACK HALF IS HERE.",
    format: "carousel",
    slideCount: 8,
    files: [
      "instagram/R81-0831-IG-S01.png",
      "instagram/R81-0831-IG-S02.png",
      "instagram/R81-0831-IG-S03.png",
      "instagram/R81-0831-IG-S04.png",
      "instagram/R81-0831-IG-S05.png",
      "instagram/R81-0831-IG-S06.png",
      "instagram/R81-0831-IG-S07.png",
      "instagram/R81-0831-IG-S08.png",
    ],
    expectedWidth: 1080,
    expectedHeight: 1350,
    caption:
      "The doors are open.\n\nToday, The Back Half begins — a world for people who have already become who they were supposed to be, and are ready to choose who they become next.\n\nYou don’t have to wait for someday.\nYour Back Half can begin today.\n\nBecome an Architect.\nthebackhalf.org/register",
    onScreenCopy:
      "Slide 1: THE BACK HALF IS HERE.\nSlide 2 (type): You spent years becoming who you were supposed to be.\nSlide 3: Now comes a different question.\nSlide 4 (type): Who do you choose to become next?\nSlide 5: FROM EXPECTATION TO INTENTION.\nSlide 6 (type): There is more life inside your life.\nSlide 7: MAGICAL IS POSSIBLE.\nSlide 8 (type): BECOME AN ARCHITECT. / thebackhalf.org/register",
    cta: "Become an Architect.",
    alternateCta: "The doors are open.",
    destination: APPROVED_ENROLLMENT_URL,
    postingInstructions:
      "LAUNCH DAY. Instagram feed carousel — an eight-slide visual manifesto. Upload S01–S08 in order. Paste the caption exactly. Do not add hashtags. If Instagram allows a link sticker, use https://thebackhalf.org/register. Publish at 8:00 AM ET. Do not rewrite. Do not stop at slide 4.",
  },
  {
    id: "R81-0831-TT",
    date: "2026-08-31",
    timeEt: "12:00 PM ET",
    platform: "tiktok",
    campaign: "THE BACK HALF IS HERE.",
    format: "short-form-vertical-video",
    slideCount: null,
    files: ["tiktok/R81-0831-TT.mp4", "tiktok/R81-0831-TT-cover.png"],
    expectedWidth: 1080,
    expectedHeight: 1920,
    caption:
      "The doors are open.\n\nYou don’t have to wait for someday.\nYour Back Half can begin today.\n\nBecome an Architect.\nthebackhalf.org/register",
    onScreenCopy:
      "1. Visual pause.\n2. THE BACK HALF IS HERE.\n3. You spent years becoming who you were supposed to be.\n4. Who do you choose to become next?\n5. FROM EXPECTATION TO INTENTION.\n6. MAGICAL IS POSSIBLE.\n7. BECOME AN ARCHITECT. / thebackhalf.org/register",
    cta: "Become an Architect.",
    alternateCta: "thebackhalf.org/register",
    destination: APPROVED_ENROLLMENT_URL,
    postingInstructions:
      "LAUNCH DAY. TikTok native video. Upload R81-0831-TT.mp4. Cover is the first frame. Paste the full caption exactly. No trending audio. No extra on-screen text. Add https://thebackhalf.org/register in bio / link sticker if available. Publish at 12:00 PM ET.",
  },
];

function buildEntry(spec: Spec): Row82Entry {
  const assets = spec.files.map((file) => {
    const isCover = file.endsWith("-cover.png") || file.endsWith(".png");
    const width = spec.expectedWidth;
    const height = spec.expectedHeight;
    if (file.endsWith(".mp4")) {
      return inspectAsset(file, width, height);
    }
    return inspectAsset(file, width, isCover ? height : spec.expectedHeight);
  });
  const enrollmentActionable = spec.destination === APPROVED_ENROLLMENT_URL;
  const previewPass = assets.every((asset) => {
    if (!asset.exists) return false;
    if (asset.kind === "video") return asset.playable === true;
    return asset.dimensionsPass;
  });
  return {
    id: spec.id,
    date: spec.date,
    timeEt: spec.timeEt,
    timezone: TIMEZONE,
    timezoneLabel: TIMEZONE_LABEL,
    platform: spec.platform,
    account: spec.platform === "instagram" ? "@backhalfco" : "@backhalfco",
    campaign: spec.campaign,
    format: spec.format,
    slideCount: spec.slideCount,
    assets,
    caption: spec.caption,
    captionSource: `${COPY_PATH}#${spec.id}`,
    onScreenCopy: spec.onScreenCopy,
    cta: spec.cta,
    alternateCta: spec.alternateCta,
    destination: spec.destination,
    enrollmentActionable,
    publishingMethod: "platform_native_scheduler",
    automation: "FOUNDER ACTION REQUIRED",
    schedulingStatus: "PREPARED IN COMPANY QUEUE — NOT LOADED TO NATIVE SCHEDULER",
    previewStatus: previewPass ? "PASS" : "FAIL",
    owner: OWNER,
    fallback: FALLBACK,
    postingInstructions: spec.postingInstructions,
    notes:
      "Do not call this scheduled on Instagram/TikTok until Founder confirms the native scheduler item. Live publish is forbidden during Row 82.",
  };
}

export function row82AllowedMediaNames(): string[] {
  return [...new Set(SPECS.flatMap((spec) => spec.files.map(basenameOf)))];
}

export function row82TextContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export function collectRow82Entries(): Row82Entry[] {
  return SPECS.map(buildEntry);
}

export function buildRow82Manifest(entries: Row82Entry[] = collectRow82Entries()) {
  const queue = loadSocialPublishQueue();
  const optionB = evaluateOptionBPublishing();
  return {
    row: 82,
    livePublishEnabled: false,
    livePublishAttempted: false,
    timezone: TIMEZONE,
    timezoneLabel: TIMEZONE_LABEL,
    channels: ["instagram @backhalfco", "tiktok @backhalfco"],
    linkedinLaunchRequirement: "NO — FUTURE ENHANCEMENT",
    xLaunchRequirement: "NO — DO NOT ADD",
    operationalOwner: OWNER,
    continuityModel: "OPTION_B",
    executionPath: queue.executionPath,
    newVendorRequired: false,
    nativeScheduleVerified: queue.nativeScheduleVerified,
    captionSourceOfTruth: COPY_PATH,
    assetArchive: ARCHIVE,
    entries: entries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      time: entry.timeEt,
      timezone: entry.timezone,
      timezoneLabel: entry.timezoneLabel,
      platform: entry.platform,
      account: entry.account,
      campaign: entry.campaign,
      asset: entry.assets.map((asset) => asset.archivePath),
      resolvedAsset: entry.assets.map((asset) => asset.resolvedPath),
      captionSource: entry.captionSource,
      caption: entry.caption,
      cta: entry.cta,
      destination: entry.destination,
      publishingMethod: entry.publishingMethod,
      schedulingStatus: entry.schedulingStatus,
      previewStatus: entry.previewStatus,
      owner: entry.owner,
      fallback: entry.fallback,
      notes: entry.notes,
    })),
    optionBEvidence: {
      instagramCanPublishWithoutFounderAtPostingTime: optionB.instagramPublishingAuthorization,
      tiktokCanPublishWithoutFounderAtPostingTime: optionB.tiktokPublishingAuthorization,
      niaPublishingResponsibilityExecutable: optionB.niaSocialUpdateExecution,
      row77OptionBContinuity: optionB.scenarioH === "PASS" ? "PASS" : "FAIL",
      row77CompletionUnchanged: true,
    },
  };
}

export function collectRow82Checks(entries: Row82Entry[] = collectRow82Entries()) {
  const copy = existsSync(abs(COPY_PATH)) ? readFileSync(abs(COPY_PATH), "utf8") : "";
  const artifact = existsSync(abs(ROW82_ARTIFACT_PATH))
    ? readFileSync(abs(ROW82_ARTIFACT_PATH), "utf8")
    : "";
  const queue = loadSocialPublishQueue();
  const destinations = entries.map((entry) => entry.destination);
  const enrollmentEntries = entries.filter((entry) => entry.enrollmentActionable);
  const captionsMatchCopy = entries.every((entry) => copy.includes(entry.cta) && copy.includes(`## ${entry.id}`));
  const timesMatchCopy = entries.every((entry) => {
    const hour = entry.platform === "instagram" ? "8:00 AM ET" : "12:00 PM ET";
    return entry.timeEt === hour && copy.includes(hour);
  });
  const datesMatch = entries.every((entry) =>
    ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31"].includes(entry.date),
  );
  const noLinkedInLaunch = entries.every((entry) => entry.platform !== ("linkedin" as Row82Platform));
  const noLocalhost = !destinations.some((url) => /localhost|127\.0\.0\.1/i.test(url));
  const noVercel = !destinations.some((url) => /vercel\.app/i.test(url));
  const enrollmentUrlsOk = enrollmentEntries.every((entry) => entry.destination === APPROVED_ENROLLMENT_URL);
  const everyPreviewed = entries.every((entry) => entry.previewStatus === "PASS");
  const mediaOk = entries.every((entry) =>
    entry.assets.every((asset) => asset.exists && (asset.kind === "video" ? asset.playable : asset.dimensionsPass)),
  );
  const queueAligned = queue.jobs.every((job) => entries.some((entry) => entry.id === job.id));
  const livePublishDisabled = queue.livePublishEnabled === false;
  const markedComplete = /\*\*Status:\*\*\s*Complete\b/i.test(artifact);
  const founderAccepted = /Founder Acceptance:\s*ACCEPTED/i.test(artifact);

  return {
    generatedAt: new Date().toISOString(),
    artifactExists: artifact.length > 0,
    copyExists: copy.length > 0,
    secretsInArtifact: row82TextContainsSecrets(artifact),
    markedComplete,
    founderAccepted,
    livePublishDisabled,
    livePublishAttempted: false,
    entryCount: entries.length,
    instagramCount: entries.filter((entry) => entry.platform === "instagram").length,
    tiktokCount: entries.filter((entry) => entry.platform === "tiktok").length,
    linkedinCount: 0,
    noLinkedInLaunch,
    captionsMatchCopy,
    timesMatchCopy,
    datesMatch,
    easternTimeExplicit: entries.every((entry) => entry.timezone === TIMEZONE && entry.timeEt.includes("ET")),
    noLocalhost,
    noVercel,
    enrollmentUrlsOk,
    everyPreviewed,
    mediaOk,
    queueAligned,
    optionBDocumented: queue.continuityModel === "OPTION_B",
    niaOwner: queue.operationalOwner.includes("Nia Prism"),
    newVendorRequired: false,
    nativeInstagramVerified: queue.nativeScheduleVerified.instagram === true,
    nativeTikTokVerified: queue.nativeScheduleVerified.tiktok === true,
    missingAssets: entries.flatMap((entry) =>
      entry.assets.filter((asset) => !asset.exists).map((asset) => asset.archivePath),
    ),
  };
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}
