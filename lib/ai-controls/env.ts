import { existsSync, readFileSync } from "node:fs";

import type { AiServiceId } from "@/lib/ai-controls/types";

const ALLOWED_NAMES = new Set([
  "AI_EMERGENCY_DISABLE",
  "AI_DISABLE_LUMINA",
  "AI_DISABLE_FAB5",
  "AI_DISABLE_AI_KIMBERLY",
  "AI_LUMINA_DAILY_REQUEST_LIMIT",
  "AI_FAB5_DAILY_REQUEST_LIMIT",
  "AI_FAB5_DAILY_USD_SOFT",
  "AI_FAB5_DAILY_USD_HARD",
  "AI_FAB5_MONTHLY_USD_HARD",
  "AI_ESTIMATE_USD_PER_1K_TOKENS",
  "AI_ESTIMATE_USD_PER_REQUEST",
  "OPENAI_DEFAULT_MODEL",
]);

let loaded = false;

function parseEnvLocal(): void {
  if (loaded) return;
  loaded = true;
  if (!existsSync(".env.local")) return;
  for (const rawLine of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const name = line.slice(0, eq).trim();
    if (!ALLOWED_NAMES.has(name) || process.env[name]) continue;
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

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "all";
}

function listIncludes(value: string | undefined, token: string): boolean {
  if (!value) return false;
  if (truthy(value) && !value.includes(",")) return true;
  return value
    .split(/[,\s]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .includes(token);
}

let testDisable: Partial<Record<AiServiceId | "all", boolean>> | null = null;

export function setAiEmergencyDisableForTests(
  next: Partial<Record<AiServiceId | "all", boolean>> | null,
): void {
  testDisable = next;
}

export function resetAiControlEnvCacheForTests(): void {
  loaded = false;
}

export function isAiServiceDisabled(service: AiServiceId): boolean {
  parseEnvLocal();
  if (testDisable?.all === true || testDisable?.[service] === true) return true;
  if (truthy(process.env.AI_EMERGENCY_DISABLE) || listIncludes(process.env.AI_EMERGENCY_DISABLE, service)) {
    return true;
  }
  if (service === "lumina") return truthy(process.env.AI_DISABLE_LUMINA);
  if (service === "fab5") return truthy(process.env.AI_DISABLE_FAB5);
  return truthy(process.env.AI_DISABLE_AI_KIMBERLY);
}

export function optionalPositiveNumber(name: string): number | undefined {
  parseEnvLocal();
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}
