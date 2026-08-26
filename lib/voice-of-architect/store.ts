import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

import {
  ROW_158_LOG_PATH,
  ROW_158_PROTOCOL_PATH,
  VOA_LAUNCH_DAY,
  VOA_TIMEZONE,
} from "@/lib/voice-of-architect/catalog";
import type {
  VoiceOfArchitectDatabase,
  VoiceOfArchitectRecord,
  VoiceOfArchitectThemeRollup,
} from "@/lib/voice-of-architect/types";
import { VOA_CATEGORIES } from "@/lib/voice-of-architect/catalog";

const DEFAULT_LOG_FILE = ROW_158_LOG_PATH;

export const VOA_REQUIRED_FIELDS = [
  "id",
  "createdAt",
  "category",
  "source",
  "summary",
  "route",
  "owner",
  "coordinator",
  "status",
  "criticalDefect",
  "immediate",
  "fingerprint",
] as const;

export function emptyVoiceOfArchitectDatabase(): VoiceOfArchitectDatabase {
  return {
    store: ROW_158_LOG_PATH,
    protocol: ROW_158_PROTOCOL_PATH,
    rule: "Capture feedback, confusion, compliments, support themes, friction, testimonial/permission requests, and product opportunities beginning launch day. Route critical issues into Imani defect triage. Do not paste passwords, full card data, Journey answers, Lumina transcripts, or another Architect's private record. Do not publish compliments as testimonials.",
    launchDay: VOA_LAUNCH_DAY,
    timezone: VOA_TIMEZONE,
    requiredFields: [...VOA_REQUIRED_FIELDS],
    lastUpdatedAt: new Date().toISOString(),
    entries: [],
  };
}

function logPath(): string {
  return process.env.VOA_LOG_FILE?.replace(/\\/g, "/") || DEFAULT_LOG_FILE;
}

function logDir(filePath: string): string {
  const index = filePath.lastIndexOf("/");
  return index === -1 ? "." : filePath.slice(0, index);
}

function normalize(raw: VoiceOfArchitectDatabase): VoiceOfArchitectDatabase {
  const empty = emptyVoiceOfArchitectDatabase();
  return {
    ...empty,
    ...raw,
    requiredFields: Array.isArray(raw.requiredFields)
      ? raw.requiredFields
      : empty.requiredFields,
    entries: Array.isArray(raw.entries) ? raw.entries : [],
    lastUpdatedAt: raw.lastUpdatedAt ?? empty.lastUpdatedAt,
  };
}

export async function readVoiceOfArchitectLog(): Promise<VoiceOfArchitectDatabase> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ logPath(), "utf8");
    return normalize(JSON.parse(raw) as VoiceOfArchitectDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return emptyVoiceOfArchitectDatabase();
    throw error;
  }
}

async function writeVoiceOfArchitectLog(
  database: VoiceOfArchitectDatabase,
): Promise<void> {
  const filePath = logPath();
  const payload = `${JSON.stringify(database, null, 2)}\n`;
  await mkdir(/* turbopackIgnore: true */ logDir(filePath), { recursive: true });
  const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(/* turbopackIgnore: true */ tempFile, payload, "utf8");
  await rename(/* turbopackIgnore: true */ tempFile, filePath);
}

export async function upsertVoiceOfArchitectRecord(
  record: VoiceOfArchitectRecord,
): Promise<VoiceOfArchitectRecord> {
  const database = await readVoiceOfArchitectLog();
  const existingIndex = database.entries.findIndex(
    (entry) => entry.id === record.id || entry.fingerprint === record.fingerprint,
  );
  if (existingIndex >= 0) {
    const existing = database.entries[existingIndex];
    if (existing) return existing;
  }
  database.entries.push(record);
  database.lastUpdatedAt = record.updatedAt;
  await writeVoiceOfArchitectLog(database);
  return record;
}

export function rollupVoiceOfArchitectThemes(
  entries: VoiceOfArchitectRecord[],
): VoiceOfArchitectThemeRollup[] {
  return VOA_CATEGORIES.map((category) => {
    const rows = entries.filter((entry) => entry.category === category);
    return {
      category,
      count: rows.length,
      criticalCount: rows.filter((entry) => entry.criticalDefect).length,
      immediateCount: rows.filter((entry) => entry.immediate).length,
    };
  });
}
