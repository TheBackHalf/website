/**
 * Automated scan for obvious English leakage on Spanish participant-facing surfaces.
 * Flags suspect English UI phrases for human review — proper names may be intentional.
 *
 * Usage: npx tsx scripts/qa-spanish-mixed-language.mts
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const SCAN_DIRS = [
  "app/es",
  "components",
  "content/i18n/dictionaries/es.ts",
  "content/journey/es",
  "content/legal/titles-es.ts",
];

const SUSPECT_PHRASES = [
  "Traducción aprobada pendiente",
  "Approved Spanish translation pending",
  "translation pending",
  "shown in English",
  "Founder Welcome",
  "Core Teaching",
  "Reflection Questions",
  "Intentional Practice",
  "Weekly Commitment",
  "Chapter Complete",
  "Continue Journey",
  "Save answers",
  "Begin Your Journey",
  "Become an Architect",
  "Sign in",
  "Create account",
  "The Decision",
  "The Awakening",
  "The Mirror",
  "Welcome back, Architect",
  "Beginning today, I choose",
  "This week, I choose intention",
];

const ALLOWED_CONTEXT = [
  "Magical is Possible",
  "The Back Half",
  "Architect",
  "Lumina",
  "Blueprint",
  "Google",
  "Stripe",
  "English",
  "Español",
  "fallback:",
  "pending: true",
];

type Finding = {
  file: string;
  phrase: string;
  line: number;
  text: string;
};

function walk(target: string, files: string[] = []): string[] {
  const abs = path.isAbsolute(target) ? target : path.join(ROOT, target);
  let st;
  try {
    st = statSync(abs);
  } catch {
    return files;
  }
  if (st.isFile()) {
    if (/\.(ts|tsx|js|jsx)$/.test(abs)) files.push(abs);
    return files;
  }
  if (!st.isDirectory()) return files;
  for (const entry of readdirSync(abs)) {
    if (
      entry === "node_modules" ||
      entry === ".next" ||
      entry === ".tmp" ||
      entry.startsWith(".")
    ) {
      continue;
    }
    walk(path.join(abs, entry), files);
  }
  return files;
}

function isAllowedLine(line: string): boolean {
  return ALLOWED_CONTEXT.some((token) => line.includes(token));
}

const findings: Finding[] = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    // Skip English dictionaries and EN-only content modules
    if (rel.includes("/dictionaries/en.ts")) continue;
    if (rel.includes("row84") || rel.includes("row85") || rel.includes("_internal"))
      continue;

    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const phrase of SUSPECT_PHRASES) {
        if (!line.includes(phrase)) continue;
        // Ignore comments that document English source
        if (line.trimStart().startsWith("*") || line.trimStart().startsWith("//")) {
          if (phrase === "Traducción aprobada pendiente") {
            // still flag participant-facing pending copy even in comments near UI
          } else {
            continue;
          }
        }
        if (isAllowedLine(line) && phrase !== "Traducción aprobada pendiente") {
          continue;
        }
        findings.push({
          file: rel,
          phrase,
          line: index + 1,
          text: line.trim().slice(0, 160),
        });
      }
    });
  }
}

const pendingHits = findings.filter((f) =>
  f.phrase.toLowerCase().includes("traducción") ||
  f.phrase.toLowerCase().includes("translation pending") ||
  f.phrase.toLowerCase().includes("shown in english"),
);

console.log("=== Spanish mixed-language QA scan ===");
console.log(`Suspect findings: ${findings.length}`);
console.log(`Participant pending-notice hits: ${pendingHits.length}`);

for (const f of findings.slice(0, 80)) {
  console.log(`- ${f.file}:${f.line} [${f.phrase}] ${f.text}`);
}
if (findings.length > 80) {
  console.log(`…and ${findings.length - 80} more`);
}

if (pendingHits.length > 0) {
  console.error("\nFAIL: participant-facing translation-pending notices still present.");
  process.exit(1);
}

console.log("\nPASS: no translation-pending participant notices detected in scanned paths.");
console.log(
  "Review remaining suspect English phrases manually (brand terms may be intentional).",
);
process.exit(0);
