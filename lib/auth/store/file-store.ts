import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConsentRecord } from "@/lib/consent/types";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  DEFAULT_APP_ROLE,
  getConfiguredRoleForEmail,
  isAssignableHumanRole,
  normalizeAppRole,
} from "@/lib/auth/roles";
import type {
  AuthDatabase,
  AuthStore,
  CreateUserInput,
} from "@/lib/auth/store/types";
import type { UserRecord } from "@/lib/auth/types";

function normalizeUserRecord(user: UserRecord): UserRecord {
  return {
    ...user,
    role: normalizeAppRole(user.role),
    ageEligible:
      user.ageEligible === true
        ? true
        : user.ageEligible === false
          ? false
          : undefined,
    ageEligibleConfirmedAt:
      typeof user.ageEligibleConfirmedAt === "string"
        ? user.ageEligibleConfirmedAt
        : undefined,
  };
}

const DEFAULT_DATA_DIR = ".data/auth";

const emptyDatabase = (): AuthDatabase => ({
  users: [],
  consentRecords: [],
  verificationTokens: [],
  passwordResetTokens: [],
  resendTimestamps: {},
});

function normalizeDatabase(raw: AuthDatabase): AuthDatabase {
  return {
    users: Array.isArray(raw.users)
      ? raw.users.map((user) => normalizeUserRecord(user as UserRecord))
      : [],
    consentRecords: Array.isArray(raw.consentRecords) ? raw.consentRecords : [],
    verificationTokens: Array.isArray(raw.verificationTokens)
      ? raw.verificationTokens
      : [],
    passwordResetTokens: Array.isArray(raw.passwordResetTokens)
      ? raw.passwordResetTokens
      : [],
    resendTimestamps:
      raw.resendTimestamps && typeof raw.resendTimestamps === "object"
        ? raw.resendTimestamps
        : {},
  };
}

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readDatabase(dbFile: string): Promise<AuthDatabase> {
  try {
    const raw = await readFile(/* turbopackIgnore: true */ dbFile, "utf8");
    return normalizeDatabase(JSON.parse(raw) as AuthDatabase);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return emptyDatabase();
    }
    throw error;
  }
}

async function writeDatabase(
  dataDir: string,
  dbFile: string,
  database: AuthDatabase,
): Promise<void> {
  await mkdir(/* turbopackIgnore: true */ dataDir, { recursive: true });
  const tempFile = `${dbFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(/* turbopackIgnore: true */ tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(/* turbopackIgnore: true */ tempFile, /* turbopackIgnore: true */ dbFile);
}

function createUserId(): string {
  return crypto.randomUUID();
}

function buildUserRecord(input: CreateUserInput): UserRecord {
  const normalized = normalizeEmail(input.email);
  const timestamp = new Date().toISOString();
  return {
    id: createUserId(),
    email: normalized,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    passwordHash: input.passwordHash,
    authProvider: input.authProvider,
    googleId: input.googleId,
    arcCode: input.arcCode,
    emailVerified: input.emailVerified,
    locale: input.locale,
    role: getConfiguredRoleForEmail(normalized) ?? DEFAULT_APP_ROLE,
    ageEligible: input.ageEligible === true ? true : undefined,
    ageEligibleConfirmedAt: input.ageEligibleConfirmedAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export type CreateFileAuthStoreOptions = {
  /** Isolate eval/test data from production `.data/auth`. */
  dataDir?: string;
};

export function createFileAuthStore(
  options: CreateFileAuthStoreOptions = {},
): AuthStore {
  const dataDir = options.dataDir ?? DEFAULT_DATA_DIR;
  const dbFile = options.dataDir
    ? `${options.dataDir}/database.json`
    : ".data/auth/database.json";

  return {
    findUserByEmail(email) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const normalized = normalizeEmail(email);
        const user = database.users.find((entry) => entry.email === normalized);
        return user ? normalizeUserRecord(user) : undefined;
      });
    },

    findUserById(id) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const user = database.users.find((entry) => entry.id === id);
        return user ? normalizeUserRecord(user) : undefined;
      });
    },

    findUserByGoogleId(googleId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const user = database.users.find((entry) => entry.googleId === googleId);
        return user ? normalizeUserRecord(user) : undefined;
      });
    },

    findUserByArcCode(arcCode) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const user = database.users.find((entry) => entry.arcCode === arcCode);
        return user ? normalizeUserRecord(user) : undefined;
      });
    },

    listUsers() {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.users.map((user) => normalizeUserRecord(user));
      });
    },

    isArcCodeTaken(arcCode) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.users.some((user) => user.arcCode === arcCode);
      });
    },

    createUser(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const normalized = normalizeEmail(input.email);
        const existing = database.users.find((user) => user.email === normalized);

        if (existing) {
          throw new Error("DUPLICATE_EMAIL");
        }

        const user = buildUserRecord(input);
        database.users.push(user);
        await writeDatabase(dataDir, dbFile, database);
        return user;
      });
    },

    persistEmailRegistration(input) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const normalized = normalizeEmail(input.user.email);
        const existing = database.users.find((user) => user.email === normalized);

        if (existing) {
          throw new Error("DUPLICATE_EMAIL");
        }

        const user = buildUserRecord(input.user);
        database.users.push(user);
        database.consentRecords.push(
          ...input.consents.map((record) => ({ ...record, userId: user.id })),
        );
        database.verificationTokens = database.verificationTokens.filter(
          (entry) => entry.userId !== user.id,
        );
        database.verificationTokens.push({
          ...input.verificationToken,
          userId: user.id,
          email: user.email,
        });
        await writeDatabase(dataDir, dbFile, database);
        return user;
      });
    },

    updateUser(id, patch) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const index = database.users.findIndex((user) => user.id === id);

        if (index === -1) {
          return undefined;
        }

        const current = normalizeUserRecord(database.users[index]!);
        // Explicitly strip any accidental role property from unknown patches.
        const { role: _ignoredRole, ...safePatch } = patch as typeof patch & {
          role?: unknown;
        };
        void _ignoredRole;

        const updated: UserRecord = {
          ...current,
          ...safePatch,
          role: current.role,
          updatedAt: new Date().toISOString(),
        };
        database.users[index] = updated;
        await writeDatabase(dataDir, dbFile, database);
        return updated;
      });
    },

    setUserRole(id, role) {
      return enqueueWrite(async () => {
        if (!isAssignableHumanRole(role)) {
          return undefined;
        }

        const database = await readDatabase(dbFile);
        const index = database.users.findIndex((user) => user.id === id);

        if (index === -1) {
          return undefined;
        }

        const current = normalizeUserRecord(database.users[index]!);
        const updated: UserRecord = {
          ...current,
          role,
          updatedAt: new Date().toISOString(),
        };
        database.users[index] = updated;
        await writeDatabase(dataDir, dbFile, database);
        return updated;
      });
    },

    recordConsents(records) {
      return enqueueWrite(async () => {
        if (records.length === 0) {
          return;
        }

        const database = await readDatabase(dbFile);
        database.consentRecords.push(...records);
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    findConsentRecordsByUserId(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.consentRecords
          .filter((record) => record.userId === userId)
          .slice()
          .sort((a, b) => b.consentedAt.localeCompare(a.consentedAt));
      });
    },

    createVerificationToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.verificationTokens = database.verificationTokens.filter(
          (entry) => entry.userId !== token.userId,
        );
        database.verificationTokens.push(token);
        await writeDatabase(dataDir, dbFile, database);
        return token;
      });
    },

    findVerificationToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.verificationTokens.find((entry) => entry.token === token);
      });
    },

    deleteVerificationToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.verificationTokens = database.verificationTokens.filter(
          (entry) => entry.token !== token,
        );
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    deleteVerificationTokensForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.verificationTokens = database.verificationTokens.filter(
          (entry) => entry.userId !== userId,
        );
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    createPasswordResetToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.passwordResetTokens = database.passwordResetTokens.filter(
          (entry) => entry.userId !== token.userId,
        );
        database.passwordResetTokens.push(token);
        await writeDatabase(dataDir, dbFile, database);
        return token;
      });
    },

    findPasswordResetToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.passwordResetTokens.find((entry) => entry.token === token);
      });
    },

    markPasswordResetTokenUsed(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        const index = database.passwordResetTokens.findIndex(
          (entry) => entry.token === token,
        );

        if (index === -1) {
          return;
        }

        database.passwordResetTokens[index] = {
          ...database.passwordResetTokens[index]!,
          usedAt: new Date().toISOString(),
        };
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    deletePasswordResetToken(token) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.passwordResetTokens = database.passwordResetTokens.filter(
          (entry) => entry.token !== token,
        );
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    deletePasswordResetTokensForUser(userId) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.passwordResetTokens = database.passwordResetTokens.filter(
          (entry) => entry.userId !== userId,
        );
        await writeDatabase(dataDir, dbFile, database);
      });
    },

    getLastResendAt(email) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        return database.resendTimestamps[normalizeEmail(email)];
      });
    },

    setLastResendAt(email, timestamp) {
      return enqueueWrite(async () => {
        const database = await readDatabase(dbFile);
        database.resendTimestamps[normalizeEmail(email)] = timestamp;
        await writeDatabase(dataDir, dbFile, database);
      });
    },
  };
}

export async function allocateUniqueArcCode(
  store: AuthStore,
  generateCandidate: () => string,
  maxAttempts = 25,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCandidate();
    const taken = await store.isArcCodeTaken(candidate);

    if (!taken) {
      return candidate;
    }
  }

  throw new Error("ARC_CODE_EXHAUSTED");
}

export type { ConsentRecord };
