import type {
  LuminaMemoryDecision,
  LuminaMemoryMilestone,
  LuminaMemoryProgress,
  LuminaMemoryRecord,
  LuminaMemorySummary,
} from "@/lib/lumina/memory/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeSummary(raw: unknown): LuminaMemorySummary | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = asString(raw.id);
  const text = asString(raw.text);
  const createdAt = asString(raw.createdAt);
  const updatedAt = asString(raw.updatedAt);
  const source = raw.source;
  if (
    !id ||
    !text ||
    !createdAt ||
    !updatedAt ||
    (source !== "system" && source !== "explicit" && source !== "fixture")
  ) {
    return null;
  }
  const sourceConversationId = asString(raw.sourceConversationId);
  return {
    id,
    text,
    createdAt,
    updatedAt,
    source,
    ...(sourceConversationId ? { sourceConversationId } : {}),
  };
}

function normalizeDecision(raw: unknown): LuminaMemoryDecision | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = asString(raw.id);
  const text = asString(raw.text);
  const createdAt = asString(raw.createdAt);
  const updatedAt = asString(raw.updatedAt);
  const source = raw.source;
  if (
    !id ||
    !text ||
    !createdAt ||
    !updatedAt ||
    raw.confirmed !== true ||
    (source !== "explicit" && source !== "journey")
  ) {
    return null;
  }
  return {
    id,
    text,
    confirmed: true,
    createdAt,
    updatedAt,
    source,
  };
}

function normalizeMilestone(raw: unknown): LuminaMemoryMilestone | null {
  if (!isObject(raw)) {
    return null;
  }
  const id = asString(raw.id);
  const key = asString(raw.key);
  const label = asString(raw.label);
  const achievedAt = asString(raw.achievedAt);
  const source = raw.source;
  if (
    !id ||
    !key ||
    !label ||
    !achievedAt ||
    (source !== "journey" && source !== "explicit")
  ) {
    return null;
  }
  return { id, key, label, achievedAt, source };
}

function normalizeProgress(raw: unknown): LuminaMemoryProgress | null {
  if (raw === null) {
    return null;
  }
  if (!isObject(raw)) {
    return null;
  }
  const chapterId =
    raw.chapterId === null
      ? null
      : typeof raw.chapterId === "string"
        ? raw.chapterId
        : null;
  const status =
    raw.status === null
      ? null
      : typeof raw.status === "string"
        ? raw.status
        : null;
  const updatedAt =
    raw.updatedAt === null
      ? null
      : typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : null;
  return { chapterId, status, updatedAt };
}

function upsertById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function upsertMilestones(items: LuminaMemoryMilestone[]): LuminaMemoryMilestone[] {
  const byId = new Map<string, LuminaMemoryMilestone>();
  const byKey = new Map<string, LuminaMemoryMilestone>();
  for (const item of items) {
    const existingByKey = byKey.get(item.key);
    if (existingByKey && existingByKey.id !== item.id) {
      byId.delete(existingByKey.id);
    }
    byId.set(item.id, item);
    byKey.set(item.key, item);
  }
  return [...byId.values()];
}

export function emptyLuminaMemoryRecord(
  userId: string,
  now = new Date().toISOString(),
): LuminaMemoryRecord {
  return {
    userId,
    enabled: false,
    summaries: [],
    decisions: [],
    milestones: [],
    progress: null,
    updatedAt: now,
  };
}

export function normalizeLuminaMemoryRecord(
  raw: unknown,
  fallbackUserId?: string,
): LuminaMemoryRecord | null {
  if (!isObject(raw)) {
    return null;
  }
  const userId = asString(raw.userId) ?? fallbackUserId;
  if (!userId) {
    return null;
  }
  const updatedAt = asString(raw.updatedAt) ?? new Date().toISOString();
  const summaries = Array.isArray(raw.summaries)
    ? upsertById(
        raw.summaries
          .map((entry) => normalizeSummary(entry))
          .filter((entry): entry is LuminaMemorySummary => Boolean(entry)),
      )
    : [];
  const decisions = Array.isArray(raw.decisions)
    ? upsertById(
        raw.decisions
          .map((entry) => normalizeDecision(entry))
          .filter((entry): entry is LuminaMemoryDecision => Boolean(entry)),
      )
    : [];
  const milestones = Array.isArray(raw.milestones)
    ? upsertMilestones(
        raw.milestones
          .map((entry) => normalizeMilestone(entry))
          .filter((entry): entry is LuminaMemoryMilestone => Boolean(entry)),
      )
    : [];

  const enabledAt = asString(raw.enabledAt);
  const disabledAt = asString(raw.disabledAt);

  return {
    userId,
    enabled: raw.enabled === true,
    ...(enabledAt ? { enabledAt } : {}),
    ...(disabledAt ? { disabledAt } : {}),
    summaries,
    decisions,
    milestones,
    progress: normalizeProgress(raw.progress),
    updatedAt,
  };
}

export function clearLuminaMemoryPayload(
  record: LuminaMemoryRecord,
  now = new Date().toISOString(),
): LuminaMemoryRecord {
  return {
    ...record,
    summaries: [],
    decisions: [],
    milestones: [],
    progress: null,
    updatedAt: now,
  };
}
