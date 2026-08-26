/**
 * Write standalone Markdown copies of the Version 1 legal candidates.
 * Review-only. Does not publish.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  candidateFullText,
  legalV1LaunchCandidates,
} from "../content/legal/v1-candidates";

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), "ops/fab-5/legal-v1");
  await mkdir(outDir, { recursive: true });
  for (const candidate of legalV1LaunchCandidates) {
    const slug = candidate.id.toUpperCase().replaceAll("-", "-");
    const filename = `${slug}-V1-CANDIDATE.md`;
    const changes = candidate.changesFromBase
      .map((change) => `- ${change.category}: ${change.detail}`)
      .join("\n");
    const body = [
      `# ${candidate.title}`,
      "",
      `**Version:** ${candidate.version}`,
      `**Effective Date:** ${candidate.effectiveDate}`,
      `**Status:** ${candidate.status}`,
      `**Mailbox/contact:** ${candidate.mailboxes.join(", ") || "None in this instrument"}`,
      "",
      "## Changes from approved base",
      "",
      changes,
      "",
      "## Document",
      "",
      candidateFullText(candidate),
      "",
    ].join("\n");
    await writeFile(path.join(outDir, filename), body, "utf8");
    console.log(filename);
  }
}

void main();
