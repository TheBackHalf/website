import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  createEmptyOnboardingRecord,
  emptyAssessmentState,
  isOnboardingStepId,
  ONBOARDING_STEPS,
  type AlivenessAssessmentState,
  type AlivenessRating,
  type AlivenessResultsSnapshot,
  type OnboardingDatabase,
  type OnboardingRecord,
  type OnboardingStepId,
} from "@/lib/journey/onboarding/types";

const DEFAULT_DATA_DIR = ".data/journey";
const DEFAULT_DB_FILE = "onboarding.json";
const DEFAULT_DB_RELATIVE = `${DEFAULT_DATA_DIR}/${DEFAULT_DB_FILE}`;

const emptyDatabase = (): OnboardingDatabase => ({
  records: [],
});

function normalizeAssessment(
  raw: AlivenessAssessmentState | undefined,
  now: string,
): AlivenessAssessmentState {
  if (!raw || typeof raw !== "object") {
    return emptyAssessmentState(now);
  }
  const responses: Record<string, AlivenessRating> = {};
  if (raw.responses && typeof raw.responses === "object") {
    for (const [key, value] of Object.entries(raw.responses)) {
      if (
        value === 1 ||
        value === 2 ||
        value === 3 ||
        value === 4 ||
        value === 5
      ) {
        responses[key] = value;
      }
    }
  }
  let resultsSnapshot: AlivenessResultsSnapshot | undefined;
  const rawSnapshot = (raw as AlivenessAssessmentState).resultsSnapshot;
  if (rawSnapshot && typeof rawSnapshot === "object") {
    const total =
      typeof rawSnapshot.total === "number" ? rawSnapshot.total : null;
    const maxTotal =
      rawSnapshot.maxTotal === 225 ? rawSnapshot.maxTotal : null;
    const completedAt =
      typeof rawSnapshot.completedAt === "string"
        ? rawSnapshot.completedAt
        : null;
    if (total != null && maxTotal != null && completedAt) {
      const domainIds = new Set(
        [
          "purpose",
          "health",
          "relationships",
          "career",
          "time",
          "wonder",
          "environment",
          "growth",
          "stewardship",
        ] as const,
      );
      resultsSnapshot = {
        domainScores: Array.isArray(rawSnapshot.domainScores)
          ? rawSnapshot.domainScores
              .filter((entry) =>
                domainIds.has(entry.domainId as never),
              )
              .map((entry) => ({
                domainId: entry.domainId as AlivenessResultsSnapshot["domainScores"][number]["domainId"],
                name: String(entry.name ?? ""),
                score: typeof entry.score === "number" ? entry.score : 0,
                maxScore: 25 as const,
              }))
          : [],
        total,
        maxTotal,
        highestDomains: Array.isArray(rawSnapshot.highestDomains)
          ? rawSnapshot.highestDomains.filter((id): id is AlivenessResultsSnapshot["highestDomains"][number] =>
              domainIds.has(id as never),
            )
          : [],
        lowestDomains: Array.isArray(rawSnapshot.lowestDomains)
          ? rawSnapshot.lowestDomains.filter((id): id is AlivenessResultsSnapshot["lowestDomains"][number] =>
              domainIds.has(id as never),
            )
          : [],
        completedAt,
      };
    }
  }

  return {
    responses,
    ...(typeof raw.completedAt === "string" && raw.completedAt
      ? { completedAt: raw.completedAt }
      : {}),
    ...(resultsSnapshot ? { resultsSnapshot } : {}),
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
  };
}

function normalizeRecord(raw: OnboardingRecord): OnboardingRecord {
  const now = new Date().toISOString();
  const completedSteps = Array.isArray(raw.completedSteps)
    ? raw.completedSteps.filter(isOnboardingStepId)
    : [];
  // Legacy persisted records may still contain removed step id "purchase".
  const rawStep = String(
    (raw as OnboardingRecord & { currentStep?: string }).currentStep ?? "",
  );
  const currentStep =
    rawStep === "completed"
      ? "completed"
      : rawStep === "purchase"
        ? "welcome"
        : isOnboardingStepId(rawStep)
          ? rawStep
          : "welcome";
  const status = raw.status === "completed" ? "completed" : "in_progress";

  return {
    userId: typeof raw.userId === "string" ? raw.userId : "",
    status,
    currentStep: status === "completed" ? "completed" : currentStep,
    completedSteps,
    // Historical field only — purchase is not an onboarding UI step.
    purchaseConfirmedAt: raw.purchaseConfirmedAt,
    welcomeCompletedAt: raw.welcomeCompletedAt,
    preferencesCompletedAt: raw.preferencesCompletedAt,
    consentCompletedAt: raw.consentCompletedAt,
    luminaCompletedAt: raw.luminaCompletedAt,
    assessmentCompletedAt: raw.assessmentCompletedAt,
    awakeningEnteredAt: raw.awakeningEnteredAt,
    completedAt: raw.completedAt,
    assessment: normalizeAssessment(raw.assessment, now),
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt ? raw.createdAt : now,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : now,
  };
}

function normalizeDatabase(raw: OnboardingDatabase): OnboardingDatabase {
  return {
    records: Array.isArray(raw.records)
      ? raw.records.map((entry) => normalizeRecord(entry as OnboardingRecord))
      : [],
  };
}

export type JourneyOnboardingStore = {
  findOnboardingForUser(userId: string): Promise<OnboardingRecord | undefined>;
  getOrCreateOnboardingForUser(userId: string): Promise<OnboardingRecord>;
  saveOnboarding(record: OnboardingRecord): Promise<OnboardingRecord>;
  listOnboarding(): Promise<OnboardingRecord[]>;
  deleteForUser(userId: string): Promise<number>;
};

export function createFileJourneyOnboardingStore(options?: {
  dataDir?: string;
  fileName?: string;
}): JourneyOnboardingStore {
  const dataDir = options?.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile =
    options?.dataDir || options?.fileName
      ? `${dataDir}/${options?.fileName ?? DEFAULT_DB_FILE}`
      : DEFAULT_DB_RELATIVE;
  let writeQueue: Promise<void> = Promise.resolve();

  function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const run = writeQueue.then(operation, operation);
    writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function readDatabase(): Promise<OnboardingDatabase> {
    try {
      const raw = await readFile(/* turbopackIgnore: true */ dbFile, "utf8");
      return normalizeDatabase(JSON.parse(raw) as OnboardingDatabase);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "ENOENT") {
        return emptyDatabase();
      }
      throw error;
    }
  }

  async function writeDatabase(database: OnboardingDatabase): Promise<void> {
    await mkdir(/* turbopackIgnore: true */ dataDir, { recursive: true });
    const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(/* turbopackIgnore: true */ tempFile, JSON.stringify(database, null, 2), "utf8");
    await rename(/* turbopackIgnore: true */ tempFile, /* turbopackIgnore: true */ dbFile);
  }

  return {
    findOnboardingForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          return undefined;
        }
        const database = await readDatabase();
        return database.records.find((entry) => entry.userId === trimmed);
      });
    },

    getOrCreateOnboardingForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) {
          throw new Error("Invalid user id.");
        }
        const database = await readDatabase();
        const existing = database.records.find(
          (entry) => entry.userId === trimmed,
        );
        if (existing) {
          return existing;
        }
        const created = createEmptyOnboardingRecord(trimmed);
        database.records.push(created);
        await writeDatabase(database);
        try {
          const { emitOnboardingAnalytics } = await import(
            "@/lib/analytics/product-hooks"
          );
          await emitOnboardingAnalytics(undefined, created);
        } catch {
          // Analytics must not block onboarding.
        }
        return created;
      });
    },

    saveOnboarding(record) {
      return enqueueWrite(async () => {
        const normalized = normalizeRecord(record);
        if (!normalized.userId) {
          throw new Error("Invalid onboarding record.");
        }
        const database = await readDatabase();
        const index = database.records.findIndex(
          (entry) => entry.userId === normalized.userId,
        );
        const previous = index >= 0 ? database.records[index] : undefined;
        if (index < 0) {
          database.records.push(normalized);
        } else {
          database.records[index] = normalized;
        }
        await writeDatabase(database);
        try {
          const { emitOnboardingAnalytics } = await import(
            "@/lib/analytics/product-hooks"
          );
          await emitOnboardingAnalytics(previous, normalized);
        } catch {
          // Analytics must not block onboarding.
        }
        return normalized;
      });
    },

    listOnboarding() {
      return enqueueWrite(async () => {
        const database = await readDatabase();
        return database.records;
      });
    },

    deleteForUser(userId) {
      return enqueueWrite(async () => {
        const trimmed = userId.trim();
        if (!trimmed) return 0;
        const database = await readDatabase();
        const remaining = database.records.filter((entry) => entry.userId !== trimmed);
        const removed = database.records.length - remaining.length;
        if (removed > 0) {
          database.records = remaining;
          await writeDatabase(database);
        }
        return removed;
      });
    },
  };
}

let storeInstance: JourneyOnboardingStore | null = null;

export function getJourneyOnboardingStore(): JourneyOnboardingStore {
  if (!storeInstance) {
    storeInstance = createFileJourneyOnboardingStore();
  }
  return storeInstance;
}

export function setJourneyOnboardingStoreForTests(
  store: JourneyOnboardingStore | null,
): void {
  storeInstance = store;
}

export function stepIndex(step: OnboardingStepId): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function nextStepAfter(
  step: OnboardingStepId,
): OnboardingStepId | "completed" {
  const index = stepIndex(step);
  if (index < 0 || index >= ONBOARDING_STEPS.length - 1) {
    return "completed";
  }
  return ONBOARDING_STEPS[index + 1]!;
}
