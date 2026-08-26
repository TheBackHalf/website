/**
 * Reports Vercel-related env NAME presence and token prefix class only.
 * Never prints secret values.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const NAMES = [
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "VERCEL_ORG_ID",
  "VERCEL_TEAM_ID",
  "VERCEL_ACCESS_TOKEN",
];

function classifyPrefix(value: string): string {
  if (value.startsWith("vcp_")) return "vercel_project_token_prefix";
  if (value.startsWith("vercel_")) return "vercel_access_token_prefix";
  if (/^[A-Za-z0-9]{20,}$/.test(value)) return "opaque_alnum";
  return "other_nonempty";
}

function readNamed(filePath: string, name: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    if (line.slice(0, eq).trim() !== name) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

const envPath = path.join(process.cwd(), ".env.local");
const report = NAMES.map((name) => {
  const fromFile = readNamed(envPath, name);
  const fromProc = process.env[name];
  const value = fromFile || fromProc;
  return {
    name,
    inEnvLocal: Boolean(fromFile),
    inProcessEnv: Boolean(fromProc),
    present: Boolean(value),
    prefixClass: value ? classifyPrefix(value) : "absent",
  };
});

console.log(
  JSON.stringify(
    {
      envLocalExists: existsSync(envPath),
      names: report,
    },
    null,
    2,
  ),
);
