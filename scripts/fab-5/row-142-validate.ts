/**
 * Row 142 validation wrapper — bilingual AI Kimberly / Founder Conversation.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function runEval(): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn("npx", ["--yes", "tsx", "scripts/ai-kimberly-eval/run.ts"], {
      cwd: process.cwd(),
      env: process.env,
    });
    let output = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("close", (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

async function main(): Promise<number> {
  const result = await runEval();
  const passed = result.code === 0;
  const statusDir = path.join(process.cwd(), "ops/fab-5/runs/aos-engineering-status");
  await mkdir(statusDir, { recursive: true });
  await writeFile(
    path.join(statusDir, "al-142.json"),
    `${JSON.stringify(
      {
        aosWorkId: "al-142",
        row: 142,
        deliverable: "Implement and QA Bilingual AI Kimberly Experience",
        operatingAgent: "imani",
        technicalStatus: passed ? "implemented" : "failed",
        founderAcceptance: "open",
        founderAcceptanceAuthority: "Kimberly Walker (human)",
        merged: false,
        notes:
          "Architect-gated Founder Conversation is bilingual. Public homepage Founder section remains the human Founder surface. Founder acceptance is not marked complete.",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return result.code;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
