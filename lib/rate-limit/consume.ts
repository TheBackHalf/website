import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import {
  DurablePersistenceError,
  durablePostgresConfigured,
  isHostedProduction,
  requireDurableSql,
} from "@/lib/durable/db";
import { ensureDurableSchema } from "@/lib/durable/schema";

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  locked: boolean;
  backend: "supabase_postgres" | "file_local_development" | "unconfigured_production";
};

export type ConsumeRateLimitInput = {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
  /** Failed-attempt lockout. When hit_count reaches lockAfter, locked_until is set. */
  lockAfter?: number;
  lockMs?: number;
  /** When true, increment even if already over limit (for failed-login accounting). */
  countFailures?: boolean;
  /** Read current window/lock without incrementing. */
  peekOnly?: boolean;
};

type RateRow = {
  bucket: string;
  rate_key: string;
  window_started_at: Date | string;
  hit_count: number;
  locked_until: Date | string | null;
};

type FileRateRecord = {
  windowStartedAt: string;
  hitCount: number;
  lockedUntil?: string;
};

type FileRateDatabase = {
  records: Record<string, FileRateRecord>;
};

const FILE_DIR = ".data/rate-limits";
const FILE_PATH = ".data/rate-limits/database.json";

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function fileKey(bucket: string, key: string): string {
  return `${bucket}::${key}`;
}

let fileQueue: Promise<void> = Promise.resolve();

function enqueueFile<T>(operation: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(operation, operation);
  fileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readFileDatabase(): Promise<FileRateDatabase> {
  try {
    const raw = await readFile(FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FileRateDatabase;
    return { records: parsed.records && typeof parsed.records === "object" ? parsed.records : {} };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") return { records: {} };
    throw error;
  }
}

async function writeFileDatabase(database: FileRateDatabase): Promise<void> {
  await mkdir(FILE_DIR, { recursive: true });
  const tempFile = `${FILE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, JSON.stringify(database, null, 2), "utf8");
  await rename(tempFile, FILE_PATH);
}

function decideFromState(input: {
  now: number;
  windowStartedAt: number;
  hitCount: number;
  lockedUntil: number | null;
  limit: number;
  windowMs: number;
}): Omit<RateLimitDecision, "backend"> {
  const { now, windowStartedAt, hitCount, lockedUntil, limit, windowMs } = input;
  if (lockedUntil && lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: lockedUntil - now,
      locked: true,
    };
  }
  const windowValid = now - windowStartedAt < windowMs;
  const count = windowValid ? hitCount : 0;
  if (count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: windowValid ? windowStartedAt + windowMs - now : windowMs,
      locked: false,
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, limit - count - 1),
    retryAfterMs: 0,
    locked: false,
  };
}

async function consumePostgres(input: ConsumeRateLimitInput): Promise<RateLimitDecision> {
  const sql = requireDurableSql();
  await ensureDurableSchema(sql);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const rows = await sql<RateRow[]>`
    SELECT bucket, rate_key, window_started_at, hit_count, locked_until
    FROM bh_rate_limits
    WHERE bucket = ${input.bucket} AND rate_key = ${input.key}
    LIMIT 1
  `;
  const existing = rows[0];
  const lockedUntil = existing?.locked_until
    ? new Date(iso(existing.locked_until)).getTime()
    : null;
  const windowStartedAt = existing
    ? new Date(iso(existing.window_started_at)).getTime()
    : now;
  const windowValid = existing ? now - windowStartedAt < input.windowMs : false;
  const hitCount = windowValid ? existing!.hit_count : 0;

  const preview = decideFromState({
    now,
    windowStartedAt: windowValid ? windowStartedAt : now,
    hitCount,
    lockedUntil,
    limit: input.limit,
    windowMs: input.windowMs,
  });
  if (!preview.allowed && !input.countFailures) {
    return { ...preview, backend: "supabase_postgres" };
  }
  if (input.peekOnly) {
    return { ...preview, backend: "supabase_postgres" };
  }

  const nextCount = hitCount + 1;
  const nextWindow = windowValid ? iso(existing!.window_started_at) : nowIso;
  let nextLock: string | null =
    lockedUntil && lockedUntil > now ? iso(existing!.locked_until!) : null;
  if (input.lockAfter && input.lockMs && nextCount >= input.lockAfter) {
    nextLock = new Date(now + input.lockMs).toISOString();
  }

  await sql`
    INSERT INTO bh_rate_limits (bucket, rate_key, window_started_at, hit_count, locked_until)
    VALUES (${input.bucket}, ${input.key}, ${nextWindow}, ${nextCount}, ${nextLock})
    ON CONFLICT (bucket, rate_key)
    DO UPDATE SET
      window_started_at = EXCLUDED.window_started_at,
      hit_count = EXCLUDED.hit_count,
      locked_until = EXCLUDED.locked_until
  `;

  const locked = Boolean(nextLock && new Date(nextLock).getTime() > now);
  if (locked) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: new Date(nextLock!).getTime() - now,
      locked: true,
      backend: "supabase_postgres",
    };
  }
  if (nextCount > input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: new Date(nextWindow).getTime() + input.windowMs - now,
      locked: false,
      backend: "supabase_postgres",
    };
  }
  return {
    allowed: true,
    remaining: Math.max(0, input.limit - nextCount),
    retryAfterMs: 0,
    locked: false,
    backend: "supabase_postgres",
  };
}

async function consumeFile(input: ConsumeRateLimitInput): Promise<RateLimitDecision> {
  return enqueueFile(async () => {
    const database = await readFileDatabase();
    const now = Date.now();
    const key = fileKey(input.bucket, input.key);
    const existing = database.records[key];
    const lockedUntil = existing?.lockedUntil
      ? new Date(existing.lockedUntil).getTime()
      : null;
    const windowStartedAt = existing ? new Date(existing.windowStartedAt).getTime() : now;
    const windowValid = existing ? now - windowStartedAt < input.windowMs : false;
    const hitCount = windowValid ? existing!.hitCount : 0;
    const preview = decideFromState({
      now,
      windowStartedAt: windowValid ? windowStartedAt : now,
      hitCount,
      lockedUntil,
      limit: input.limit,
      windowMs: input.windowMs,
    });
    if (!preview.allowed && !input.countFailures) {
      return { ...preview, backend: "file_local_development" };
    }
    if (input.peekOnly) {
      return { ...preview, backend: "file_local_development" };
    }
    const nextCount = hitCount + 1;
    const nextWindow = windowValid ? existing!.windowStartedAt : new Date(now).toISOString();
    let nextLock = lockedUntil && lockedUntil > now ? existing!.lockedUntil : undefined;
    if (input.lockAfter && input.lockMs && nextCount >= input.lockAfter) {
      nextLock = new Date(now + input.lockMs).toISOString();
    }
    database.records[key] = {
      windowStartedAt: nextWindow,
      hitCount: nextCount,
      lockedUntil: nextLock,
    };
    await writeFileDatabase(database);
    const locked = Boolean(nextLock && new Date(nextLock).getTime() > now);
    if (locked) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: new Date(nextLock!).getTime() - now,
        locked: true,
        backend: "file_local_development",
      };
    }
    if (nextCount > input.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: new Date(nextWindow).getTime() + input.windowMs - now,
        locked: false,
        backend: "file_local_development",
      };
    }
    return {
      allowed: true,
      remaining: Math.max(0, input.limit - nextCount),
      retryAfterMs: 0,
      locked: false,
      backend: "file_local_development",
    };
  });
}

export async function clearRateLimit(bucket: string, key: string): Promise<void> {
  if (durablePostgresConfigured()) {
    const sql = requireDurableSql();
    await ensureDurableSchema(sql);
    await sql`
      DELETE FROM bh_rate_limits WHERE bucket = ${bucket} AND rate_key = ${key}
    `;
    return;
  }
  if (isHostedProduction()) return;
  await enqueueFile(async () => {
    const database = await readFileDatabase();
    delete database.records[fileKey(bucket, key)];
    await writeFileDatabase(database);
  });
}

export async function peekRateLimit(input: {
  bucket: string;
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitDecision> {
  return consumeRateLimit({
    ...input,
    peekOnly: true,
  });
}

export async function consumeRateLimit(
  input: ConsumeRateLimitInput,
): Promise<RateLimitDecision> {
  if (durablePostgresConfigured()) {
    return consumePostgres(input);
  }
  if (isHostedProduction()) {
    throw new DurablePersistenceError("rate_limit_postgres_unconfigured");
  }
  return consumeFile(input);
}
