import { getLuminaStore } from "@/lib/lumina/store";
import { emptyLuminaMemoryRecord } from "@/lib/lumina/memory/normalize";
import type {
  LuminaMemoryDecision,
  LuminaMemoryMilestone,
  LuminaMemoryProgress,
  LuminaMemoryRecord,
  LuminaMemorySummary,
  LuminaMemoryWriteInput,
} from "@/lib/lumina/memory/types";
import {
  normalizeMemoryKey,
  normalizeMemoryText,
  payloadContainsSecretLikeKeys,
} from "@/lib/lumina/memory/validation";

export type LuminaMemoryStore = {
  getOrCreateMemoryForUser(userId: string): Promise<LuminaMemoryRecord>;
  findMemoryForUser(userId: string): Promise<LuminaMemoryRecord | undefined>;
  setMemoryEnabled(
    userId: string,
    enabled: boolean,
  ): Promise<LuminaMemoryRecord>;
  writeMemoryWhenEnabled(
    userId: string,
    input: LuminaMemoryWriteInput,
  ): Promise<
    | { status: "ok"; record: LuminaMemoryRecord }
    | { status: "disabled" }
    | { status: "validation_error"; message: string }
  >;
  clearLuminaMemoryForUser(userId: string): Promise<LuminaMemoryRecord>;
  upsertConversationSummary(input: {
    userId: string;
    text: string;
    sourceConversationId?: string;
    source?: LuminaMemorySummary["source"];
    id?: string;
  }): Promise<
    | { status: "ok"; record: LuminaMemoryRecord }
    | { status: "disabled" }
    | { status: "validation_error"; message: string }
  >;
};

function upsertById<T extends { id: string }>(
  items: T[],
  next: T,
): T[] {
  const index = items.findIndex((entry) => entry.id === next.id);
  if (index < 0) {
    return [...items, next];
  }
  const copy = [...items];
  copy[index] = next;
  return copy;
}

function upsertMilestone(
  items: LuminaMemoryMilestone[],
  next: LuminaMemoryMilestone,
): LuminaMemoryMilestone[] {
  const withoutKey = items.filter(
    (entry) => entry.key !== next.key && entry.id !== next.id,
  );
  return [...withoutKey, next];
}

function applyWrite(
  record: LuminaMemoryRecord,
  input: LuminaMemoryWriteInput,
  now: string,
):
  | { status: "ok"; record: LuminaMemoryRecord }
  | { status: "validation_error"; message: string } {
  if (payloadContainsSecretLikeKeys(input)) {
    return {
      status: "validation_error",
      message: "Unsupported fields rejected.",
    };
  }

  let summaries = record.summaries;
  let decisions = record.decisions;
  let milestones = record.milestones;
  let progress = record.progress;
  let wrote = false;

  if (input.summary) {
    const text = normalizeMemoryText(input.summary.text);
    if (!text) {
      return { status: "validation_error", message: "Invalid summary." };
    }
    const source = input.summary.source ?? "explicit";
    if (source !== "system" && source !== "explicit" && source !== "fixture") {
      return { status: "validation_error", message: "Invalid summary source." };
    }
    const id = input.summary.id?.trim() || crypto.randomUUID();
    const existing = summaries.find((entry) => entry.id === id);
    const next: LuminaMemorySummary = {
      id,
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      source,
      ...(input.summary.sourceConversationId
        ? { sourceConversationId: input.summary.sourceConversationId }
        : existing?.sourceConversationId
          ? { sourceConversationId: existing.sourceConversationId }
          : {}),
    };
    summaries = upsertById(summaries, next);
    wrote = true;
  }

  if (input.decision) {
    const text = normalizeMemoryText(input.decision.text);
    if (!text) {
      return { status: "validation_error", message: "Invalid decision." };
    }
    if (input.decision.confirmed !== true) {
      return {
        status: "validation_error",
        message: "Decisions require confirmed: true.",
      };
    }
    const source = input.decision.source ?? "explicit";
    if (source !== "explicit" && source !== "journey") {
      return { status: "validation_error", message: "Invalid decision source." };
    }
    const id = input.decision.id?.trim() || crypto.randomUUID();
    const existing = decisions.find((entry) => entry.id === id);
    const next: LuminaMemoryDecision = {
      id,
      text,
      confirmed: true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      source,
    };
    decisions = upsertById(decisions, next);
    wrote = true;
  }

  if (input.milestone) {
    const key = normalizeMemoryKey(input.milestone.key);
    const label = normalizeMemoryText(input.milestone.label);
    if (!key || !label) {
      return { status: "validation_error", message: "Invalid milestone." };
    }
    const source = input.milestone.source ?? "explicit";
    if (source !== "journey" && source !== "explicit") {
      return {
        status: "validation_error",
        message: "Invalid milestone source.",
      };
    }
    const id = input.milestone.id?.trim() || crypto.randomUUID();
    const existing =
      milestones.find((entry) => entry.id === id) ??
      milestones.find((entry) => entry.key === key);
    const next: LuminaMemoryMilestone = {
      id: existing?.id ?? id,
      key,
      label,
      achievedAt: input.milestone.achievedAt ?? existing?.achievedAt ?? now,
      source,
    };
    milestones = upsertMilestone(milestones, next);
    wrote = true;
  }

  if (input.progress) {
    const chapterId =
      input.progress.chapterId === null
        ? null
        : normalizeMemoryKey(input.progress.chapterId);
    if (input.progress.chapterId !== null && chapterId === null) {
      return { status: "validation_error", message: "Invalid progress." };
    }
    const status =
      input.progress.status === null
        ? null
        : normalizeMemoryKey(input.progress.status);
    if (input.progress.status !== null && status === null) {
      return { status: "validation_error", message: "Invalid progress." };
    }
    const next: LuminaMemoryProgress = {
      chapterId,
      status,
      updatedAt:
        input.progress.updatedAt === undefined
          ? now
          : input.progress.updatedAt,
    };
    progress = next;
    wrote = true;
  }

  if (!wrote) {
    return {
      status: "validation_error",
      message: "No supported memory fields provided.",
    };
  }

  return {
    status: "ok",
    record: {
      ...record,
      summaries,
      decisions,
      milestones,
      progress,
      updatedAt: now,
    },
  };
}

export function createLuminaMemoryStore(): LuminaMemoryStore {
  return {
    getOrCreateMemoryForUser(userId) {
      return getLuminaStore().getOrCreateMemoryForUser(userId);
    },

    findMemoryForUser(userId) {
      return getLuminaStore().findMemoryForUser(userId);
    },

    async setMemoryEnabled(userId, enabled) {
      const store = getLuminaStore();
      const current =
        (await store.findMemoryForUser(userId)) ??
        emptyLuminaMemoryRecord(userId);
      const now = new Date().toISOString();
      const next: LuminaMemoryRecord = {
        userId: current.userId,
        enabled,
        summaries: current.summaries,
        decisions: current.decisions,
        milestones: current.milestones,
        progress: current.progress,
        updatedAt: now,
        ...(enabled
          ? { enabledAt: now }
          : {
              ...(current.enabledAt ? { enabledAt: current.enabledAt } : {}),
              disabledAt: now,
            }),
      };
      return store.saveMemory(next);
    },

    async writeMemoryWhenEnabled(userId, input) {
      const store = getLuminaStore();
      const current = await store.getOrCreateMemoryForUser(userId);
      if (!current.enabled) {
        return { status: "disabled" };
      }
      const applied = applyWrite(current, input, new Date().toISOString());
      if (applied.status !== "ok") {
        return applied;
      }
      const saved = await store.saveMemory(applied.record);
      return { status: "ok", record: saved };
    },

    clearLuminaMemoryForUser(userId) {
      return getLuminaStore().clearMemoryPayloadForUser(userId);
    },

    async upsertConversationSummary(input) {
      return getLuminaMemoryStore().writeMemoryWhenEnabled(input.userId, {
        summary: {
          id: input.id,
          text: input.text,
          sourceConversationId: input.sourceConversationId,
          source: input.source ?? "system",
        },
      });
    },
  };
}

let memoryStore: LuminaMemoryStore | undefined;

export function getLuminaMemoryStore(): LuminaMemoryStore {
  if (!memoryStore) {
    memoryStore = createLuminaMemoryStore();
  }
  return memoryStore;
}

export function setLuminaMemoryStoreForTests(
  store: LuminaMemoryStore | undefined,
) {
  memoryStore = store;
}

export async function clearLuminaMemoryForUser(
  userId: string,
): Promise<LuminaMemoryRecord> {
  return getLuminaMemoryStore().clearLuminaMemoryForUser(userId);
}

export async function upsertConversationSummary(input: {
  userId: string;
  text: string;
  sourceConversationId?: string;
  source?: LuminaMemorySummary["source"];
  id?: string;
}) {
  return getLuminaMemoryStore().upsertConversationSummary(input);
}
