/**
 * Writes Row 50 Founder caption VTT files from approved scripts.
 * Timing uses actual media duration (or the spoken playback endpoint).
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildFounderCaptionVtt,
  founderCaptionJobs,
} from "../content/journey/founder-captions";

const root = path.resolve(process.cwd());
const ffmpeg =
  process.env.FFMPEG_PATH ||
  path.join(
    process.env.APPDATA || "",
    "Python/Python314/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
  );

function probeDurationSeconds(videoAbsPath: string): number {
  let output = "";
  try {
    output = execFileSync(ffmpeg, ["-i", videoAbsPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String((error as { stderr: unknown }).stderr)
        : "";
    output = stderr || String(error);
  }
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not read duration for ${videoAbsPath}`);
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

function publicToAbs(publicPath: string): string {
  const decoded = decodeURIComponent(publicPath.replace(/^\//, ""));
  return path.join(root, "public", decoded);
}

const outDir = path.join(root, "public", "captions", "founder");
mkdirSync(outDir, { recursive: true });

for (const job of founderCaptionJobs) {
  const videoAbs = publicToAbs(job.videoPublicPath);
  const fileDuration = probeDurationSeconds(videoAbs);
  const duration =
    typeof job.captionEndSeconds === "number" &&
    Number.isFinite(job.captionEndSeconds)
      ? Math.min(job.captionEndSeconds, fileDuration)
      : fileDuration;
  const vtt = buildFounderCaptionVtt(job.script, duration);
  const dest = path.join(outDir, job.fileName);
  writeFileSync(dest, vtt, "utf8");
  console.log(
    `${job.locale} ${job.id} duration=${duration.toFixed(2)}s cues=${(vtt.match(/^WEBVTT/m) ? vtt.split("\n\n").length - 1 : 0)} -> ${job.publicPath}`,
  );
}
