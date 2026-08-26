/**
 * Deploy current working tree to Vercel Production for Row 84 TEST D.
 * Never prints tokens. Does not change Vercel env values.
 */
import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

function redact(value: string): string {
  return value
    .replace(/vcp_[A-Za-z0-9]+/g, "[redacted-vercel]")
    .replace(/vercel_[A-Za-z0-9]+/g, "[redacted-vercel]")
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
}

async function main(): Promise<void> {
  const spawnEnv = { ...process.env };
  delete spawnEnv.VERCEL_TOKEN;
  spawnEnv.VERCEL_ORG_ID = "team_78QcHJQpS3JFQLL0nRZTUY8e";
  spawnEnv.VERCEL_PROJECT_ID = "prj_FCi9UmpaTJVGQwlHeREMqDEfJsOy";
  const result = spawnSync(
    "npx --yes vercel deploy --prod --yes --scope back-half",
    {
      cwd: process.cwd(),
      env: spawnEnv,
      encoding: "utf8",
      timeout: 15 * 60 * 1000,
      shell: true,
    },
  );
  const stdout = redact(result.stdout || "");
  const stderr = redact(result.stderr || "");
  const combined = `${stdout}\n${stderr}`;
  const urlMatch = combined.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/i);
  const ok = result.status === 0;
  await writeFile(
    path.join(process.cwd(), "ops", "fab-5", "runs", "row-84-test-d-deploy.json"),
    `${JSON.stringify(
      {
        at: new Date().toISOString(),
        command: "vercel deploy --prod --yes --scope back-half",
        exit: result.status,
        ok,
        deploymentUrlPresent: Boolean(urlMatch),
        notes: combined
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) =>
            /production|inspect|https:\/\/|error|ready|build|deployed/i.test(line),
          )
          .slice(-40),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`DEPLOY=${ok ? "PASS" : "FAIL"}`);
  if (!ok) process.exit(1);
}

main().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
