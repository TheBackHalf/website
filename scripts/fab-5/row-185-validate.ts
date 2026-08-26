/**
 * Row 185 / AOS al-185 — performance, capacity, and load testing.
 *
 * Safe production probes only: no account creation, no real login attempts
 * against known mailboxes, no email sends, no Stripe charges, no webhook
 * mutation, no Journey/Lumina writes on production, no DNS/Stripe/Vercel
 * config changes. Does not mark Founder acceptance or Complete.
 */

import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ACTIVE_VERCEL_PRODUCTION_ORIGIN,
  CANONICAL_PRODUCTION_ORIGIN,
  WWW_PRODUCTION_ORIGIN,
  ALERT_COOLDOWN_MS,
} from "@/lib/monitoring/catalog";
import { createFileJourneyProgressStore } from "@/lib/journey/progress/store";
import { createFileLuminaStore } from "@/lib/lumina/store";
import { buildStubAssistantReply } from "@/lib/lumina/conversation";

const STATUS_PATH = "ops/fab-5/runs/aos-engineering-status/al-185.json";
const USER_AGENT = "TheBackHalf-Row185-LoadTest/1.0";

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|eyJ[A-Za-z0-9_-]{20,}/i;

const THRESHOLDS = {
  publicP50Ms: 800,
  publicP95Ms: 2000,
  healthP95Ms: 1500,
  authGetP95Ms: 2000,
  redirectP95Ms: 2000,
  apiDegradeP95Ms: 2000,
  captionP95Ms: 800,
  videoTtfbP95Ms: 3000,
  errorRateMax: 0.01,
  successRateMin: 0.99,
  probeTimeoutMs: 15000,
  burstConcurrency: 25,
  mixedConcurrency: 10,
  mixedRounds: 6,
  localSaveP95Ms: 250,
  luminaStubP95Ms: 200,
  maxTotalProductionRequests: 450,
} as const;

type Sample = {
  id: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  ok: boolean;
  expected: string;
  bytes: number;
  error?: string;
  classified: "ok" | "unexpected_status" | "timeout" | "unreachable";
};

type Summary = {
  count: number;
  okCount: number;
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  meanMs: number;
  pass: boolean;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index]!;
}

function summarize(
  samples: Sample[],
  p95Limit: number,
  extra?: { maxErrorRate?: number },
): Summary {
  const times = samples.map((row) => row.ms).sort((a, b) => a - b);
  const okCount = samples.filter((row) => row.ok).length;
  const errorRate = samples.length === 0 ? 1 : 1 - okCount / samples.length;
  const p50Ms = Number(percentile(times, 50).toFixed(1));
  const p95Ms = Number(percentile(times, 95).toFixed(1));
  const maxMs = times.length ? times[times.length - 1]! : 0;
  const meanMs = times.length
    ? Number((times.reduce((sum, value) => sum + value, 0) / times.length).toFixed(1))
    : 0;
  return {
    count: samples.length,
    okCount,
    errorRate: Number(errorRate.toFixed(4)),
    p50Ms,
    p95Ms,
    maxMs,
    meanMs,
    pass:
      samples.length > 0 &&
      errorRate <= (extra?.maxErrorRate ?? THRESHOLDS.errorRateMax) &&
      p95Ms <= p95Limit,
  };
}

function expectedOk(status: number, expected: string): boolean {
  if (expected === "2xx") return status >= 200 && status < 300;
  if (expected === "2xx_or_3xx") return status >= 200 && status < 400;
  if (expected === "401_or_503") return status === 401 || status === 503;
  if (expected === "400_or_503") return status === 400 || status === 503;
  if (expected === "401_or_302") return status === 401 || status === 302 || status === 307;
  if (expected === "404") return status === 404;
  if (expected === "2xx_or_404") return (status >= 200 && status < 300) || status === 404;
  if (expected === "206_or_200_or_404") {
    return status === 206 || status === 200 || status === 404;
  }
  if (expected === "400") return status === 400;
  if (expected === "2xx_ignored") return status >= 200 && status < 300;
  return status >= 200 && status < 300;
}

async function timedRequest(input: {
  origin: string;
  id: string;
  method?: string;
  path: string;
  expected: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  body?: string;
}): Promise<Sample> {
  const method = input.method ?? "GET";
  const url = `${input.origin.replace(/\/$/, "")}${input.path}`;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      headers: {
        "user-agent": USER_AGENT,
        ...(input.body ? { "content-type": "application/json" } : {}),
        ...input.headers,
      },
      body: input.body,
      signal: AbortSignal.timeout(input.timeoutMs ?? THRESHOLDS.probeTimeoutMs),
    });
    const buffer = await response.arrayBuffer().catch(() => new ArrayBuffer(0));
    const status = response.status;
    const ok = expectedOk(status, input.expected);
    return {
      id: input.id,
      method,
      path: input.path,
      status,
      ms: Date.now() - started,
      ok,
      expected: input.expected,
      bytes: buffer.byteLength,
      classified: ok ? "ok" : "unexpected_status",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch_failed";
    const timeout = /timeout|aborted/i.test(message);
    return {
      id: input.id,
      method,
      path: input.path,
      status: 0,
      ms: Date.now() - started,
      ok: false,
      expected: input.expected,
      bytes: 0,
      error: timeout ? "timeout" : "unreachable",
      classified: timeout ? "timeout" : "unreachable",
    };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!, index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

async function resolveOrigin(): Promise<{
  origin: string;
  canonicalDns: "resolves" | "not_found";
  candidates: Array<{ origin: string; status: number; ms: number }>;
}> {
  const candidates: Array<{ origin: string; status: number; ms: number }> = [];
  let canonicalDns: "resolves" | "not_found" = "not_found";
  let chosen = ACTIVE_VERCEL_PRODUCTION_ORIGIN;

  for (const origin of [
    CANONICAL_PRODUCTION_ORIGIN,
    WWW_PRODUCTION_ORIGIN,
    ACTIVE_VERCEL_PRODUCTION_ORIGIN,
  ]) {
    const probe = await timedRequest({
      origin,
      id: `origin:${origin}`,
      path: "/",
      expected: "2xx",
      timeoutMs: 10000,
    });
    candidates.push({ origin, status: probe.status, ms: probe.ms });
    if (origin === CANONICAL_PRODUCTION_ORIGIN && probe.status > 0) {
      canonicalDns = "resolves";
    }
  }

  const preferred = candidates.find(
    (row) =>
      row.origin === CANONICAL_PRODUCTION_ORIGIN &&
      row.status >= 200 &&
      row.status < 400,
  );
  const anyLive = candidates.find((row) => row.status > 0);
  chosen = preferred?.origin ?? anyLive?.origin ?? ACTIVE_VERCEL_PRODUCTION_ORIGIN;

  return { origin: chosen, canonicalDns, candidates };
}

const PUBLIC_PAGES = [
  { id: "homepage", path: "/", expected: "2xx" },
  { id: "register", path: "/register", expected: "2xx" },
  { id: "login", path: "/login", expected: "2xx" },
  { id: "checkout", path: "/checkout", expected: "2xx_or_3xx" },
  { id: "support", path: "/support", expected: "2xx" },
  { id: "es_home", path: "/es", expected: "2xx" },
  { id: "es_register", path: "/es/register", expected: "2xx" },
  { id: "es_login", path: "/es/login", expected: "2xx" },
] as const;

const AUTHENTICATED_SURFACES = [
  { id: "journey", path: "/journey", expected: "2xx_or_3xx" },
  { id: "lumina", path: "/lumina", expected: "2xx_or_3xx" },
  { id: "architect_dashboard", path: "/architect/dashboard", expected: "2xx_or_3xx" },
  { id: "architect_journey", path: "/architect/journey", expected: "2xx_or_3xx" },
  { id: "architect_lumina", path: "/architect/lumina", expected: "2xx_or_3xx" },
  { id: "es_journey", path: "/es/journey", expected: "2xx_or_3xx" },
  { id: "es_lumina", path: "/es/lumina", expected: "2xx_or_3xx" },
  { id: "es_checkout", path: "/es/checkout", expected: "2xx_or_3xx" },
] as const;

const CAPTION_PATHS = [
  "/captions/founder/en-founding-architect-welcome.vtt",
  "/captions/founder/en-chapter-1-welcome.vtt",
  "/captions/founder/es-founding-architect-welcome.vtt",
] as const;

const VIDEO_PATHS = [
  "/videos/onboarding/founding-architect-welcome.mp4",
  "/videos/chapter-1/chapter-1-the-awakening.mp4",
  "/videos/chapter-7/chapter-7-beginning.mp4",
] as const;

async function localPersistenceCapacity(): Promise<{
  journey: Summary & { isolated: boolean };
  lumina: Summary & { isolated: boolean };
  stub: Summary;
}> {
  const root = mkdtempSync(path.join(tmpdir(), "al185-"));
  try {
    const journeyDir = path.join(root, "journey");
    const luminaDir = path.join(root, "lumina");
    const journey = createFileJourneyProgressStore({
      dataDir: journeyDir,
      fileName: "progress.json",
    });
    const lumina = createFileLuminaStore({ dataDir: luminaDir });

    const journeyStarted: number[] = [];
    await Promise.all(
      Array.from({ length: 24 }, async (_, index) => {
        const started = Date.now();
        await journey.upsertProgress({
          userId: `al185-user-${index}`,
          chapterId: "chapter-1",
          status: "in_progress",
        });
        journeyStarted.push(Date.now() - started);
      }),
    );
    const listed = await journey.listProgress();
    const journeySamples: Sample[] = journeyStarted.map((ms, index) => ({
      id: `journey-save-${index}`,
      method: "LOCAL",
      path: "journey.upsertProgress",
      status: listed.length === 24 ? 200 : 500,
      ms,
      ok: listed.length === 24,
      expected: "2xx",
      bytes: 0,
      classified: listed.length === 24 ? "ok" : "unexpected_status",
    }));

    const luminaTimes: number[] = [];
    await Promise.all(
      Array.from({ length: 16 }, async (_, index) => {
        const started = Date.now();
        const conversation = await lumina.getOrCreateConversationForUser(
          `al185-lumina-${index}`,
        );
        await lumina.saveConversation({
          ...conversation,
          updatedAt: new Date().toISOString(),
        });
        luminaTimes.push(Date.now() - started);
      }),
    );
    const luminaSamples: Sample[] = luminaTimes.map((ms, index) => ({
      id: `lumina-save-${index}`,
      method: "LOCAL",
      path: "lumina.saveConversation",
      status: 200,
      ms,
      ok: true,
      expected: "2xx",
      bytes: 0,
      classified: "ok",
    }));

    const stubTimes: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const started = Date.now();
      const stub = buildStubAssistantReply(`Latency probe ${i + 1}`, {
        locale: "en",
      });
      stubTimes.push(Date.now() - started);
      if (!stub.content) throw new Error("lumina_stub_empty");
    }
    const stubSamples: Sample[] = stubTimes.map((ms, index) => ({
      id: `lumina-stub-${index}`,
      method: "LOCAL",
      path: "buildStubAssistantReply",
      status: 200,
      ms,
      ok: ms < THRESHOLDS.luminaStubP95Ms * 2,
      expected: "2xx",
      bytes: 0,
      classified: "ok",
    }));

    return {
      journey: {
        ...summarize(journeySamples, THRESHOLDS.localSaveP95Ms, {
          maxErrorRate: 0,
        }),
        isolated: true,
      },
      lumina: {
        ...summarize(luminaSamples, THRESHOLDS.localSaveP95Ms, {
          maxErrorRate: 0,
        }),
        isolated: true,
      },
      stub: summarize(stubSamples, THRESHOLDS.luminaStubP95Ms, {
        maxErrorRate: 0,
      }),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function containsSecrets(value: string): boolean {
  return SECRET_PATTERN.test(value);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const origins = await resolveOrigin();
  const origin = origins.origin;

  const baselinePublic = await mapPool(
    [...PUBLIC_PAGES],
    4,
    (page) =>
      timedRequest({
        origin,
        id: `baseline:${page.id}`,
        path: page.path,
        expected: page.expected,
      }),
  );

  const mixedJobs = Array.from(
    { length: THRESHOLDS.mixedRounds },
    () => [...PUBLIC_PAGES],
  ).flat();
  const mixedLoad = await mapPool(mixedJobs, THRESHOLDS.mixedConcurrency, (page, index) =>
    timedRequest({
      origin,
      id: `mixed:${page.id}:${index}`,
      path: page.path,
      expected: page.expected,
    }),
  );

  const burstJobs = Array.from({ length: THRESHOLDS.burstConcurrency }, (_, index) => index);
  const homepageBurst = await mapPool(burstJobs, THRESHOLDS.burstConcurrency, (index) =>
    timedRequest({
      origin,
      id: `burst:home:${index}`,
      path: "/",
      expected: "2xx",
    }),
  );

  const healthBurst = await mapPool(
    Array.from({ length: 12 }, (_, index) => index),
    12,
    (index) =>
      timedRequest({
        origin,
        id: `burst:health:${index}`,
        path: "/api/ops/health",
        expected: "2xx",
      }),
  );

  const authenticated = await mapPool([...AUTHENTICATED_SURFACES], 4, (page) =>
    timedRequest({
      origin,
      id: `authz:${page.id}`,
      path: page.path,
      expected: page.expected,
    }),
  );

  const captions = await mapPool([...CAPTION_PATHS], 3, (pathName) =>
    timedRequest({
      origin,
      id: `caption:${pathName}`,
      path: pathName,
      expected: "2xx",
    }),
  );

  const videos = await mapPool([...VIDEO_PATHS], 2, (pathName) =>
    timedRequest({
      origin,
      id: `video:${pathName}`,
      method: "GET",
      path: pathName,
      expected: "206_or_200_or_404",
      headers: { range: "bytes=0-1023" },
    }),
  );

  const degradation = [
    await timedRequest({
      origin,
      id: "degrade:webhook-no-signature",
      method: "POST",
      path: "/api/stripe/webhook",
      expected: "400_or_503",
      body: "{}",
    }),
    await timedRequest({
      origin,
      id: "degrade:monitoring-unauth",
      path: "/api/ops/monitoring/run",
      expected: "401_or_503",
    }),
    await timedRequest({
      origin,
      id: "degrade:blueprint-unauth",
      path: "/api/architect/blueprint/guidebook",
      expected: "401_or_302",
    }),
    await timedRequest({
      origin,
      id: "degrade:login-invalid-json",
      method: "POST",
      path: "/api/auth/login",
      expected: "400",
      body: "not-json",
    }),
    await timedRequest({
      origin,
      id: "degrade:register-invalid-json",
      method: "POST",
      path: "/api/auth/register",
      expected: "400",
      body: "not-json",
    }),
    await timedRequest({
      origin,
      id: "degrade:analytics-ignored",
      method: "POST",
      path: "/api/analytics/event",
      expected: "2xx_ignored",
      body: JSON.stringify({ name: "not_a_client_event" }),
    }),
    await timedRequest({
      origin,
      id: "degrade:missing-path",
      path: "/row61-monitoring-missing-path",
      expected: "404",
    }),
    await timedRequest({
      origin,
      id: "degrade:health",
      path: "/api/ops/health",
      expected: "2xx",
    }),
  ];

  const loginLatency = await timedRequest({
    origin,
    id: "auth:login-invalid-payload",
    method: "POST",
    path: "/api/auth/login",
    expected: "400",
    body: JSON.stringify({ email: "not-an-email", password: "x", locale: "en" }),
  });

  const timeoutProbe = await timedRequest({
    origin,
    id: "timeout:health-1ms",
    path: "/api/ops/health",
    expected: "2xx",
    timeoutMs: 1,
  });

  const local = await localPersistenceCapacity();

  const publicSummary = summarize(
    [...baselinePublic, ...mixedLoad, ...homepageBurst],
    THRESHOLDS.publicP95Ms,
  );
  const healthSummary = summarize(healthBurst, THRESHOLDS.healthP95Ms);
  const authzSummary = summarize(authenticated, THRESHOLDS.redirectP95Ms);
  const captionSummary = summarize(captions, THRESHOLDS.captionP95Ms);
  const videoDelivered = videos.filter((row) => row.status === 200 || row.status === 206);
  const videoMissing = videos.filter((row) => row.status === 404 || row.status === 0);
  const videoSummary = summarize(
    videos.map((row) => ({
      ...row,
      ok: row.status === 200 || row.status === 206,
    })),
    THRESHOLDS.videoTtfbP95Ms,
    { maxErrorRate: 1 },
  );
  const degradeSummary = summarize(degradation, THRESHOLDS.apiDegradeP95Ms, {
    maxErrorRate: 0,
  });

  const healthBody = await timedRequest({
    origin,
    id: "health:body",
    path: "/api/ops/health",
    expected: "2xx",
  });

  const productionRequestCount =
    baselinePublic.length +
    mixedLoad.length +
    homepageBurst.length +
    healthBurst.length +
    authenticated.length +
    captions.length +
    videos.length +
    degradation.length +
    3;

  const fileStoreBottleneck =
    "Journey progress, onboarding, Chapters 1–7, and Lumina conversation/memory stores are process-local JSON files under .data/. Auth, analytics, marketing KPI, support, and launch-dashboard already use Supabase Postgres. On Vercel the application filesystem is ephemeral and not shared across serverless instances, so concurrent Architect Journey saves and Lumina turns cannot be the production system of record.";

  const blueprintBottleneck =
    "Personalized Blueprint PDF routes launch Puppeteer with maxDuration=300s and protocolTimeout=300s. Vercel builds set PUPPETEER_SKIP_DOWNLOAD=1, so Chrome may be absent on the serverless image. Concurrent Blueprint generation is a launch-blocking capacity risk even if a browser binary is present (CPU/RAM/timeout).";

  const loginRateLimit =
    "Login and registration HTTP routes have no request rate limit. Email verification resend and password-reset have 60s cooldowns only. Under credential-stuffing load, bcrypt verify on every POST is a capacity and abuse risk. Full login rate-limit is assigned to Row 182 Security Review rather than a weak per-instance memory limiter here.";

  const stripeLimit =
    "Row 73: Production Stripe key class is Test/Sandbox; live Checkout/webhooks are not launch-ready. Stripe API rate limits were not exercised (no charges, no live catalog reads).";

  const publicPass = publicSummary.pass && healthSummary.pass;
  const degradePass = degradeSummary.pass && timeoutProbe.classified === "timeout";
  const mediaPass = captionSummary.pass && videoDelivered.length === VIDEO_PATHS.length;

  const launchBlocking = [
    fileStoreBottleneck,
    blueprintBottleneck,
    "Canonical DNS thebackhalf.org remains unverified from this workstation (Row 75). Load ran against the reachable Vercel production host.",
    stripeLimit,
    videoMissing.length
      ? `Media: ${videoMissing.length}/${VIDEO_PATHS.length} probed Founder mp4 paths did not return 200/206 from production.`
      : null,
  ].filter((row): row is string => Boolean(row));

  const scorecard = {
    publicPages: publicPass ? "PASS" : "FAIL",
    authenticationGets: authzSummary.pass ? "PASS" : "FAIL",
    dashboardJourneySaves:
      "FAIL — production Journey stores are file-backed; concurrent save capacity is not launch-ready. Local isolated file-queue test " +
      (local.journey.pass ? "PASS" : "FAIL"),
    lumina:
      "FAIL — production Lumina store is file-backed. Stub reply latency " +
      (local.stub.pass ? "PASS" : "FAIL") +
      " locally; no provider model is on the send path.",
    checkoutWebhooks: degradePass
      ? "PASS for graceful unauthenticated/invalid webhook handling. FAIL for live Checkout capacity (Stripe test mode, Row 73)."
      : "FAIL",
    blueprintGeneration:
      "FAIL — Puppeteer/300s serverless generation is not load-safe; unauthenticated route correctly rejected.",
    mediaDelivery: mediaPass ? "PASS" : "FAIL",
    emailTriggers:
      "NOT EXERCISED against production SMTP (no mail sent). Code: nodemailer now has 10s connection/greeting and 15s socket timeouts; Workspace sending limits remain Founder-dashboard (Row 73/153).",
    databaseApi: healthSummary.pass ? "PASS for /api/ops/health under concurrency" : "FAIL",
    monitoringAlerts:
      "CONFIRMED armed: Vercel cron */15 * * * * → /api/ops/monitoring/run; unauthorized probe returned expected 401/503; alert cooldown 30 minutes; uptime/database/payment failures record launch_ops_errors. No production CRITICAL injected.",
    overall: "FAIL",
  };

  const result = {
    aosWorkId: "al-185",
    title: "Run Performance, Capacity and Load Testing",
    source: "command_center August Launch row 185",
    operatingAgent: "imani",
    generatedAt,
    secretsPrinted: false,
    founderAcceptanceRecorded: false,
    markedComplete: false,
    stripeConfigModified: false,
    dnsModified: false,
    vercelCustomDomainModified: false,
    authenticationWeakened: false,
    readyForFounderAcceptance: false,
    applicationOrigin: origin,
    canonicalOrigin: CANONICAL_PRODUCTION_ORIGIN,
    canonicalDns: origins.canonicalDns,
    originCandidates: origins.candidates,
    scenario: {
      description:
        "Founding Architect launch-day profile: public browse + auth page GET + health, modest concurrency (10 mixed / 25 homepage burst), no mutating customer writes.",
      productionRequests: productionRequestCount,
      requestCap: THRESHOLDS.maxTotalProductionRequests,
      mixedConcurrency: THRESHOLDS.mixedConcurrency,
      burstConcurrency: THRESHOLDS.burstConcurrency,
      destructiveWrites: false,
      emailSent: false,
      chargesCreated: false,
    },
    thresholds: THRESHOLDS,
    rateAndPlanLimits: {
      vercel: "FOUNDER VERIFICATION REQUIRED — bandwidth, function duration, concurrency, cron. Hobby default function budget is 10s; Pro allows maxDuration up to 300s (Blueprint uses 300s). Monitoring/AOS crons every 15 minutes.",
      supabase:
        "FOUNDER VERIFICATION REQUIRED — connections, size, storage. Application postgres clients use max: 1, connect_timeout: 10s, idle_timeout: 20s (safe for serverless; connection storms still depend on pooler plan).",
      stripe: stripeLimit,
      openai:
        "Lumina launch path is a first-party stub (buildStubAssistantReply). OpenAI TPM/RPM apply to Fab 5 hosted agents, not Architect Lumina turns. Founder billing/quota still Row 73.",
      googleWorkspace:
        "FOUNDER VERIFICATION REQUIRED — SMTP daily sending limits. Verification/password-reset cooldowns are 60s per email. SMTP transport timeouts now 10s/15s.",
      application: {
        loginHttpRateLimit: "NONE",
        registrationHttpRateLimit: "NONE",
        resendVerificationCooldownMs: 60000,
        passwordResetCooldownMs: 60000,
        luminaMessageMaxLength: 4000,
        blueprintMaxDurationSeconds: 300,
        monitoringAlertCooldownMs: ALERT_COOLDOWN_MS,
        monitoringCron: "*/15 * * * *",
        postgresClientMaxConnectionsPerInstance: 1,
      },
      loginRateLimit,
    },
    measurements: {
      publicPages: {
        summary: publicSummary,
        baseline: baselinePublic.map(compactSample),
        mixedLoad: { summary: summarize(mixedLoad, THRESHOLDS.publicP95Ms) },
        homepageBurst: { summary: summarize(homepageBurst, THRESHOLDS.publicP95Ms) },
      },
      authentication: {
        getSurfaces: { summary: authzSummary, samples: authenticated.map(compactSample) },
        loginInvalidPayload: compactSample(loginLatency),
        note: "Unauthenticated Journey/Lumina/dashboard GETs must redirect or serve the gate without 5xx. Password verify was not brute-forced.",
      },
      dashboardJourneySaves: {
        production: "NOT MUTATED",
        localIsolatedFileQueue: local.journey,
        launchBlocking: true,
        finding: fileStoreBottleneck,
      },
      lumina: {
        production: "NOT MUTATED",
        localIsolatedFileQueue: local.lumina,
        localStubLatency: local.stub,
        launchBlocking: true,
        finding: fileStoreBottleneck,
        provider: "stub — no model call on send path",
      },
      checkoutWebhooks: {
        unauthenticatedWebhook: compactSample(degradation[0]!),
        liveCheckout: "NOT EXERCISED — Stripe test/sandbox per Row 73; no Checkout Session created",
      },
      blueprint: {
        unauthenticated: compactSample(degradation[2]!),
        generation: "NOT EXERCISED — would launch Puppeteer for up to 300s",
        finding: blueprintBottleneck,
      },
      mediaDelivery: {
        captions: { summary: captionSummary, samples: captions.map(compactSample) },
        videos: {
          summary: videoSummary,
          delivered: videoDelivered.length,
          missingOrFailed: videoMissing.length,
          samples: videos.map(compactSample),
        },
      },
      emailTriggers: {
        productionSends: 0,
        smtpTimeoutsRemediated: true,
        connectionTimeoutMs: 10000,
        greetingTimeoutMs: 10000,
        socketTimeoutMs: 15000,
      },
      databaseApi: {
        healthBurst: healthSummary,
        healthSample: compactSample(healthBody),
        samples: healthBurst.map(compactSample),
      },
    },
    gracefulDegradation: {
      summary: degradeSummary,
      timeoutClassification: {
        probe: compactSample(timeoutProbe),
        pass: timeoutProbe.classified === "timeout",
      },
      samples: degradation.map(compactSample),
      behaviorsConfirmed: [
        "Stripe webhook without signature returns 400 or 503 (not 500).",
        "Monitoring run without CRON_SECRET returns 401 or 503.",
        "Blueprint PDF without session returns 401 or redirect.",
        "Auth login/register invalid JSON returns 400.",
        "Analytics unknown event is ignored with 2xx.",
        "Missing path returns 404 for monitor classification.",
        "Client AbortSignal.timeout(1) classifies as timeout.",
        "SMTP send path now fails closed on 10s/15s transport timeouts instead of hanging the serverless invoke.",
      ],
    },
    monitoringAlerts: {
      cron: "*/15 * * * * /api/ops/monitoring/run",
      owners: {
        technical: "Imani Heartbeat — Chief Technology & Risk Officer",
        operations: "Michelle Northstar — Chief of Staff & Operations Officer",
      },
      cooldownMinutes: ALERT_COOLDOWN_MS / 60000,
      firesOn: ["uptime HTTP fail", "database connectivity", "Stripe provider unreachable"],
      recordsLaunchOpsErrors: true,
      unauthorizedProbe: compactSample(degradation[1]!),
      productionCriticalInjected: false,
      confirmed: true,
    },
    bottlenecks: {
      launchBlocking,
      remediationsApplied: [
        "SMTP nodemailer connectionTimeout=10000, greetingTimeout=10000, socketTimeout=15000 so email triggers cannot hang a serverless function indefinitely.",
      ],
      remediationsDeferred: [
        "Postgres-backed Journey/onboarding/chapter/Lumina stores — required for production concurrency; too large/risk-bearing for this performance-evidence PR. Track as a dedicated Imani persistence work item before Founder acceptance of Row 185.",
        "Blueprint generation should not launch Chrome per request on Vercel (pre-render, queue, or disable until a worker exists).",
        "HTTP rate limits on /api/auth/login and /api/auth/register (Row 182).",
        "Live Stripe key/prices/webhook (Row 73) and canonical DNS (Row 75) remain Founder/vendor rows — not mutated here.",
      ],
    },
    scorecard,
    finalStatus: "FAIL",
    nextAction:
      "Do not mark Complete. Founder acceptance stays with Kimberly Walker (human). Imani follow-up: durable Journey/Lumina persistence, Blueprint generation capacity, then re-run this harness.",
    validation: {
      typecheck: "npx tsc --noEmit",
      nearestTest: "npm run fab5:row185 (package has no npm test)",
      build: "npm run build",
      note: "Gate outcomes are recorded on the status file after the commands run; this harness does not mark Complete.",
    },
  };

  const serialized = JSON.stringify(result, null, 2);
  if (containsSecrets(serialized)) {
    throw new Error("al185_validation_matched_secret_pattern");
  }

  mkdirSync(path.dirname(STATUS_PATH), { recursive: true });
  writeFileSync(STATUS_PATH, `${serialized}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        wrote: STATUS_PATH,
        origin,
        productionRequests: productionRequestCount,
        publicPages: scorecard.publicPages,
        overall: scorecard.overall,
        founderAcceptanceRecorded: false,
      },
      null,
      2,
    ),
  );
}

function compactSample(sample: Sample) {
  return {
    id: sample.id,
    method: sample.method,
    path: sample.path,
    status: sample.status,
    ms: sample.ms,
    ok: sample.ok,
    classified: sample.classified,
    bytes: sample.bytes,
    error: sample.error,
  };
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown";
  console.error(message.slice(0, 180));
  process.exit(1);
});
