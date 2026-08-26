import { existsSync, readFileSync } from "node:fs";

const ALLOWED_NAMES = new Set(["OPENAI_API_KEY", "OPENAI_DEFAULT_MODEL"]);

function parseEnvLocal(filePath: string): void {
  if (!existsSync(filePath)) return;
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const name = line.slice(0, eq).trim();
    if (!ALLOWED_NAMES.has(name)) continue;
    if (process.env[name]) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value.length > 0) {
      process.env[name] = value;
    }
  }
}

/** Loads allowed OpenAI env vars from .env.local. Never logs values. */
export function loadFab5OpenAiEnv(): { keyPresent: boolean } {
  parseEnvLocal(".env.local");
  return { keyPresent: Boolean(process.env.OPENAI_API_KEY) };
}
