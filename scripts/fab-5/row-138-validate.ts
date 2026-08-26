/**
 * Row 138 / al-138 — Founder media accessibility validation.
 * Does not mark Command Center complete or record Founder acceptance.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { listFounderLaunchA11yAssets } from "@/content/journey/founder-accessibility";
import { normalizeFounderSpokenScript } from "@/content/journey/founder-captions";
import { listMissingChapter1Media } from "@/content/journey/chapter-1-media";
import { listMissingChapter2Media } from "@/content/journey/chapter-2-media";
import { listMissingChapter3Media } from "@/content/journey/chapter-3-media";
import { listMissingChapter4Media } from "@/content/journey/chapter-4-media";
import { listMissingChapter5Media } from "@/content/journey/chapter-5-media";
import { listMissingChapter6Media } from "@/content/journey/chapter-6-media";
import { listMissingChapter7Media } from "@/content/journey/chapter-7-media";
import { listMissingOnboardingWelcomeMedia } from "@/content/journey/onboarding-welcome-media";
import { listFounderVideoProductionReviewItems } from "@/content/journey/founder-video-inventory";

const root = path.resolve(process.cwd());

type Check = { id: string; ok: boolean; detail: string };

function publicToAbs(publicPath: string): string {
  const decoded = decodeURIComponent(publicPath.replace(/^\//, ""));
  return path.join(root, "public", decoded);
}

function fileText(absPath: string): string {
  return readFileSync(absPath, "utf8");
}

function normalize(value: string): string {
  return normalizeFounderSpokenScript(value).toLowerCase();
}

function distinctiveTokens(script: string): string[] {
  return normalize(script)
    .split(/[^a-záéíóúñü]+/i)
    .filter((token) => token.length >= 6)
    .slice(0, 12);
}

const checks: Check[] = [];

function record(id: string, ok: boolean, detail: string) {
  checks.push({ id, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${id}: ${detail}`);
}

const assets = listFounderLaunchA11yAssets();
record(
  "catalog-count",
  assets.length === 18,
  `${assets.length} launch-critical Founder videos (9 English + 9 Spanish)`,
);

for (const asset of assets) {
  const videoAbs = publicToAbs(asset.videoPublicPath);
  const captionAbs = publicToAbs(asset.captionsPublicPath);
  const transcriptAbs = publicToAbs(asset.transcriptTextPublicPath);
  const posterAbs = publicToAbs(asset.posterPublicPath);

  record(
    `${asset.locale}-${asset.id}-video`,
    existsSync(videoAbs) && statSync(videoAbs).size > 10_000,
    asset.videoPublicPath,
  );

  const captionOk =
    existsSync(captionAbs) && fileText(captionAbs).startsWith("WEBVTT");
  record(
    `${asset.locale}-${asset.id}-captions`,
    captionOk,
    asset.captionsPublicPath,
  );

  const transcriptOk = existsSync(transcriptAbs) && statSync(transcriptAbs).size > 80;
  record(
    `${asset.locale}-${asset.id}-transcript-text`,
    transcriptOk,
    asset.transcriptTextPublicPath,
  );

  const posterOk = existsSync(posterAbs) && statSync(posterAbs).size > 2_000;
  record(
    `${asset.locale}-${asset.id}-poster`,
    posterOk,
    asset.posterPublicPath,
  );

  if (captionOk && transcriptOk) {
    const captionText = fileText(captionAbs);
    const transcriptText = fileText(transcriptAbs);
    const tokens = distinctiveTokens(asset.script);
    const captionHasScript =
      tokens.length === 0 ||
      tokens.filter((token) => normalize(captionText).includes(token)).length >=
        Math.ceil(tokens.length * 0.8);
    const transcriptHasScript =
      tokens.length === 0 ||
      tokens.filter((token) => normalize(transcriptText).includes(token)).length >=
        Math.ceil(tokens.length * 0.8);
    record(
      `${asset.locale}-${asset.id}-script-alignment`,
      captionHasScript && transcriptHasScript,
      captionHasScript && transcriptHasScript
        ? "caption and transcript match approved script tokens"
        : `caption=${captionHasScript} transcript=${transcriptHasScript}`,
    );
  }
}

const missingLaunchA11y = [
  ...listMissingOnboardingWelcomeMedia(),
  ...listMissingChapter1Media(),
  ...listMissingChapter2Media(),
  ...listMissingChapter3Media(),
  ...listMissingChapter4Media(),
  ...listMissingChapter5Media(),
  ...listMissingChapter6Media(),
  ...listMissingChapter7Media(),
].filter((item) => item.field !== "src");

record(
  "wired-captions-transcripts-posters",
  missingLaunchA11y.length === 0,
  missingLaunchA11y.length === 0
    ? "every launch video has captions, transcript, and poster wired"
    : JSON.stringify(missingLaunchA11y),
);

const closingSrcMissing = [
  ...listMissingChapter3Media(),
  ...listMissingChapter4Media(),
  ...listMissingChapter5Media(),
  ...listMissingChapter6Media(),
  ...listMissingChapter7Media(),
].filter(
  (item) =>
    item.field === "src" &&
    /closing/.test(item.id),
);

record(
  "closing-videos-not-treated-complete",
  closingSrcMissing.length >= 8,
  `${closingSrcMissing.length} missing closing sources remain out of launch-critical a11y scope`,
);

const inventory = listFounderVideoProductionReviewItems();
const inventoryItems = [...inventory.english, ...inventory.spanish];
const incomplete = inventoryItems.filter((item) => !item.accessibilityComplete);
record(
  "inventory-accessibility-complete",
  incomplete.length === 0,
  incomplete.length === 0
    ? "all 18 launch videos report accessibilityComplete"
    : incomplete.map((item) => `${item.locale}/${item.id}`).join(", "),
);

const playerSource = fileText(
  path.join(root, "components/journey/chapter-1/founder-media-placement.tsx"),
);
record(
  "player-controls-labeling",
  playerSource.includes("controls") &&
    playerSource.includes("aria-label") &&
    playerSource.includes("aria-describedby") &&
    playerSource.includes("tabIndex={0}") &&
    playerSource.includes('track.default = true') &&
    playerSource.includes('textTrack.mode = isApproved ? "showing"') &&
    playerSource.includes("applyPoster") &&
    playerSource.includes("founderVideoUnsupported"),
  "player has controls, labels, captions-on, poster, transcript, fallback",
);

const css = fileText(path.join(root, "app/globals.css"));
record(
  "player-focus-contrast",
  css.includes(".bh-founder-media-video:focus-visible") &&
    css.includes(".bh-founder-media-transcript a:focus-visible") &&
    css.includes("background-color: color-mix(in oklab, var(--bh-night) 92%, black)"),
  "focus rings and caption cue contrast are present",
);

const failed = checks.filter((check) => !check.ok);
console.log("");
console.log(
  failed.length
    ? `Row 138 validation FAILED (${failed.length} checks)`
    : `Row 138 validation PASSED (${checks.length} checks)`,
);

if (failed.length) {
  process.exitCode = 1;
}
