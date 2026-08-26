/**
 * Writes Row 138 Founder accessibility assets:
 * - plain-text transcripts from approved scripts
 * - poster stills from each launch-critical Founder video
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildFounderTranscriptText,
  listFounderLaunchA11yAssets,
} from "@/content/journey/founder-accessibility";

const root = path.resolve(process.cwd());

function publicToAbs(publicPath: string): string {
  const decoded = decodeURIComponent(publicPath.replace(/^\//, ""));
  return path.join(root, "public", decoded);
}

function extractPoster(videoAbsPath: string, posterAbsPath: string) {
  mkdirSync(path.dirname(posterAbsPath), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      "1.8",
      "-i",
      videoAbsPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=1280:-2",
      "-q:v",
      "5",
      posterAbsPath,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

const transcriptDir = path.join(root, "public", "transcripts", "founder");
const posterDir = path.join(root, "public", "posters", "founder");
mkdirSync(transcriptDir, { recursive: true });
mkdirSync(posterDir, { recursive: true });

for (const asset of listFounderLaunchA11yAssets()) {
  const textAbs = publicToAbs(asset.transcriptTextPublicPath);
  writeFileSync(textAbs, buildFounderTranscriptText(asset.script), "utf8");

  const videoAbs = publicToAbs(asset.videoPublicPath);
  const posterAbs = publicToAbs(asset.posterPublicPath);
  extractPoster(videoAbs, posterAbs);
  console.log(
    `${asset.locale} ${asset.id} transcript=${asset.transcriptTextPublicPath} poster=${asset.posterPublicPath}`,
  );
}
