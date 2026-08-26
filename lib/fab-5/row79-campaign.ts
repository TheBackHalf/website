/**
 * Row 79 Launch-Day Social Campaign — validation only.
 * Does not rebuild, rewrite, or regenerate approved campaign assets.
 * Does not mark Row 79 Complete.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const ROW79_ARCHIVE = "approved-assets/row-81-social-launch";
export const ROW79_COPY = "approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md";
export const ROW79_APPROVAL = "approved-assets/row-81-social-launch/ROW-81-FOUNDER-APPROVAL.md";
export const ROW79_MANIFEST = "approved-assets/row-81-social-launch/ROW-81-ASSET-MANIFEST.md";
export const ROW79_STATUS_PATH = "ops/fab-5/row-79-status.json";
export const ROW79_VALIDATION_PATH = "ops/fab-5/runs/row-79-social-campaign-validation.json";
export const ROW79_REVIEW_PATH = "/_internal/row79-launch-day-social-campaign-review";
export const ROW79_REVIEW_URL = `http://localhost:3000${ROW79_REVIEW_PATH}`;
export const APPROVED_ENROLLMENT = "https://thebackhalf.org/register";

const LAUNCH_IG = [
  "instagram/R81-0831-IG-S01.png",
  "instagram/R81-0831-IG-S02.png",
  "instagram/R81-0831-IG-S03.png",
  "instagram/R81-0831-IG-S04.png",
  "instagram/R81-0831-IG-S05.png",
  "instagram/R81-0831-IG-S06.png",
  "instagram/R81-0831-IG-S07.png",
  "instagram/R81-0831-IG-S08.png",
];
const LAUNCH_TT = ["tiktok/R81-0831-TT.mp4", "tiktok/R81-0831-TT-cover.png"];
const FAMILY_IG = [
  "instagram/R78-0828-IG-S01.png",
  "instagram/R78-0828-IG-S02.png",
  "instagram/R78-0828-IG-S03.png",
  "instagram/R78-0828-IG-S04.png",
  "instagram/R78-0829-IG-S01.png",
  "instagram/R78-0829-IG-S02.png",
  "instagram/R78-0829-IG-S03.png",
  "instagram/R78-0829-IG-S04.png",
  "instagram/R78-0830-IG-S01.png",
  "instagram/R78-0830-IG-S02.png",
  "instagram/R78-0830-IG-S03.png",
];
const FAMILY_TT = [
  "tiktok/R78-0828-TT.mp4",
  "tiktok/R78-0828-TT-cover.png",
  "tiktok/R78-0829-TT.mp4",
  "tiktok/R78-0829-TT-cover.png",
  "tiktok/R78-0830-TT.mp4",
  "tiktok/R78-0830-TT-cover.png",
];

function abs(relativePath: string): string {
  return path.join(process.cwd(), relativePath);
}

function archiveFile(relativePath: string): string {
  return path.join(process.cwd(), ROW79_ARCHIVE, relativePath);
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
  const brand = data.subarray(4, 8).toString("latin1");
  if (brand !== "ftyp") return false;
  return data.includes(Buffer.from("moov")) && data.includes(Buffer.from("mdat"));
}

function section(copy: string, heading: string, nextHeading: string): string {
  const start = copy.indexOf(heading);
  if (start < 0) return "";
  const rest = copy.slice(start);
  const end = rest.indexOf(nextHeading, heading.length);
  return end < 0 ? rest : rest.slice(0, end);
}

export type Row79Checks = {
  generatedAt: string;
  archiveExists: boolean;
  copyExists: boolean;
  founderApprovalExists: boolean;
  missingFiles: string[];
  launchIgDimsOk: boolean;
  familyIgDimsOk: boolean;
  launchTtCoverOk: boolean;
  videosPlayable: boolean;
  launchAnnouncementIg: boolean;
  launchAnnouncementTt: boolean;
  enrollmentCtaIg: boolean;
  enrollmentCtaTt: boolean;
  enrollmentDestinationIg: boolean;
  enrollmentDestinationTt: boolean;
  becomeAnArchitectPresent: boolean;
  journeyIntro: boolean;
  luminaIntro: boolean;
  foundingArchitectNamedInLaunchIgTt: boolean;
  localhostInCopy: boolean;
  vercelInCopy: boolean;
  august19InCopy: boolean;
  october19InCopy: boolean;
  firstYearInCopy: boolean;
  xInCopy: boolean;
  refundInCopy: boolean;
  campaignRebuilt: false;
};

export function collectRow79Checks(): Row79Checks {
  const copy = existsSync(abs(ROW79_COPY)) ? readFileSync(abs(ROW79_COPY), "utf8") : "";
  const launchIg = section(copy, "## R81-0831-IG", "## R81-0831-LI");
  const launchTt = section(copy, "## R81-0831-TT", "# COPY RECORDS");
  const missing = [...LAUNCH_IG, ...LAUNCH_TT, ...FAMILY_IG, ...FAMILY_TT].filter(
    (rel) => !existsSync(archiveFile(rel)),
  );
  const igOk = (rel: string, w: number, h: number) => {
    const info = pngInfo(archiveFile(rel));
    return info.ok && info.width === w && info.height === h;
  };

  return {
    generatedAt: new Date().toISOString(),
    archiveExists: existsSync(abs(ROW79_ARCHIVE)),
    copyExists: copy.length > 0,
    founderApprovalExists: existsSync(abs(ROW79_APPROVAL)),
    missingFiles: missing,
    launchIgDimsOk: LAUNCH_IG.every((rel) => igOk(rel, 1080, 1350)),
    familyIgDimsOk: FAMILY_IG.every((rel) => igOk(rel, 1080, 1350)),
    launchTtCoverOk: igOk("tiktok/R81-0831-TT-cover.png", 1080, 1920),
    videosPlayable: ["tiktok/R81-0831-TT.mp4", ...FAMILY_TT.filter((rel) => rel.endsWith(".mp4"))].every(
      (rel) => existsSync(archiveFile(rel)) && mp4Playable(archiveFile(rel)),
    ),
    launchAnnouncementIg: launchIg.includes("THE BACK HALF IS HERE."),
    launchAnnouncementTt: launchTt.includes("THE BACK HALF IS HERE."),
    enrollmentCtaIg:
      launchIg.includes("Become an Architect") && launchIg.includes("Exact CTA"),
    enrollmentCtaTt:
      launchTt.includes("Become an Architect") && launchTt.includes("Exact CTA"),
    enrollmentDestinationIg: launchIg.includes(APPROVED_ENROLLMENT),
    enrollmentDestinationTt: launchTt.includes(APPROVED_ENROLLMENT),
    becomeAnArchitectPresent: copy.includes("Become an Architect"),
    journeyIntro: copy.includes("The Back Half Journey") && /seven chapters/i.test(copy),
    luminaIntro: copy.includes("Lumina") && copy.includes("AI Guide"),
    foundingArchitectNamedInLaunchIgTt:
      launchIg.includes("Founding Architect") || launchTt.includes("Founding Architect"),
    localhostInCopy: /localhost|127\.0\.0\.1/i.test(copy),
    vercelInCopy: /vercel\.app/i.test(copy),
    august19InCopy: /August 19/i.test(copy),
    october19InCopy: /October 19/i.test(copy),
    firstYearInCopy: /first year/i.test(copy),
    xInCopy: /twitter\.com|x\.com\//i.test(copy),
    refundInCopy: /refund/i.test(copy),
    campaignRebuilt: false,
  };
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}
