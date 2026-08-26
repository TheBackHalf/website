/**
 * Row 150 final production persistence test. Never prints secrets.
 */
import { ingestClientAnalyticsEvent } from "@/lib/analytics/client-ingest";
import { analyticsPostgresConfigured } from "@/lib/analytics/db";
import { payloadContainsProhibitedData } from "@/lib/analytics/privacy";
import {
  getAnalyticsDurability,
  getAnalyticsStore,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import type { ProductArea, ProductEventName } from "@/lib/analytics/taxonomy";
import { trackProductEvent } from "@/lib/analytics/track";
import { resetMichelleSqlForTests } from "@/lib/fab-5/michelle-db";
import { loadPostgresEnvFromLocalFile } from "@/lib/marketing-kpi/db";

type AreaResult = {
  area: string;
  event: string;
  apiAccepted: boolean;
  written: boolean;
  readBack: boolean;
  metadataOk: boolean;
  privacyOk: boolean;
  backend: string;
  result: "PASS" | "FAIL";
  detail: string;
};

function hostHint(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.replace(/^postgres(?:ql)?:/i, "https:"));
    return url.hostname.slice(0, 80);
  } catch {
    const match = value.match(/@([^/:\s]+)/);
    return match?.[1]?.slice(0, 80) ?? "unparsed_host";
  }
}

async function postLocalEvent(body: Record<string, unknown>): Promise<{
  httpStatus: number;
  status: string | null;
}> {
  const response = await fetch("http://127.0.0.1:3000/api/analytics/event", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let status: string | null = null;
  try {
    const json = (await response.json()) as { status?: string };
    status = typeof json.status === "string" ? json.status : null;
  } catch {
    status = null;
  }
  return { httpStatus: response.status, status };
}

async function main() {
  loadPostgresEnvFromLocalFile();
  resetMichelleSqlForTests();
  resetAnalyticsStoreForTests();
  delete process.env.ANALYTICS_DB_FILE;

  const durability = getAnalyticsDurability();
  const stamp = `row150final${Date.now()}`;
  const userId = `architect-row150-${stamp}`;
  const cleanupKeys: string[] = [];
  const areas: AreaResult[] = [];

  async function verify(input: {
    area: string;
    event: ProductEventName;
    key: string;
    expect?: Record<string, unknown>;
  }): Promise<void> {
    resetAnalyticsStoreForTests();
    const store = getAnalyticsStore();
    const found = await store.findByIdempotencyKey(input.key);
    const hits = payloadContainsProhibitedData(found?.payload);
    const metadataOk = Boolean(
      found?.name === input.event &&
        found.test === true &&
        (!input.expect ||
          Object.entries(input.expect).every(
            ([key, value]) => found.payload?.[key] === value,
          )),
    );
    const written = Boolean(found);
    const readBack = written && store.backend === "supabase_postgres";
    const privacyOk = hits.length === 0;
    const pass =
      store.backend === "supabase_postgres" &&
      written &&
      readBack &&
      metadataOk &&
      privacyOk;
    areas.push({
      area: input.area,
      event: input.event,
      apiAccepted: true,
      written,
      readBack,
      metadataOk,
      privacyOk,
      backend: store.backend,
      result: pass ? "PASS" : "FAIL",
      detail: `backend=${store.backend}; stored=${written}; name=${found?.name ?? "none"}; test=${found?.test === true}; hits=${hits.join(",") || "none"}`,
    });
  }

  const websiteKey = `p-area:${stamp}:page_viewed`;
  cleanupKeys.push(websiteKey);
  const websiteApi = await postLocalEvent({
    name: "page_viewed",
    path: "/",
    locale: "en",
    anonymousId: `anon-${stamp}`,
    idempotencyKey: websiteKey,
  });
  await verify({
    area: "website",
    event: "page_viewed",
    key: websiteKey,
    expect: { locale: "en", path: "/", productArea: "website" },
  });
  if (areas[0]) {
    areas[0].apiAccepted =
      websiteApi.httpStatus === 200 &&
      (websiteApi.status === "created" || websiteApi.status === "duplicate");
    if (!areas[0].apiAccepted) areas[0].result = "FAIL";
    areas[0].detail += `; http=${websiteApi.httpStatus}; apiStatus=${websiteApi.status}`;
  }

  const serverEvents: Array<{
    area: ProductArea;
    name: ProductEventName;
    key: string;
    payload?: Record<string, unknown>;
    expect?: Record<string, unknown>;
  }> = [
    {
      area: "checkout",
      name: "checkout_started",
      key: `p-area:${stamp}:checkout_started`,
      payload: {
        offerId: "blueprint",
        stripeCheckoutSessionId: `cs_test_row150_${stamp}`,
      },
      expect: { offerId: "blueprint", productArea: "checkout" },
    },
    {
      area: "registration",
      name: "registration_succeeded",
      key: `p-area:${stamp}:registration_succeeded`,
      payload: { method: "email" },
      expect: { method: "email", productArea: "registration" },
    },
    {
      area: "onboarding",
      name: "onboarding_started",
      key: `p-area:${stamp}:onboarding_started`,
      payload: { step: "welcome", sequence: 1 },
      expect: { step: "welcome", productArea: "onboarding" },
    },
    {
      area: "journey",
      name: "journey_progress_saved",
      key: `p-area:${stamp}:journey_progress_saved`,
      payload: { chapterId: "chapter-1", status: "in_progress" },
      expect: { chapterId: "chapter-1", productArea: "journey" },
    },
    {
      area: "lumina",
      name: "lumina_opened",
      key: `p-area:${stamp}:lumina_opened`,
      payload: { conversationId: `conv-${stamp}` },
      expect: { conversationId: `conv-${stamp}`, productArea: "lumina" },
    },
    {
      area: "downloads",
      name: "download_completed",
      key: `p-area:${stamp}:download_completed`,
      payload: { assetId: "guidebook", assetType: "pdf" },
      expect: { assetId: "guidebook", productArea: "downloads" },
    },
    {
      area: "completion",
      name: "completion_experience_viewed",
      key: `p-area:${stamp}:completion_experience_viewed`,
      payload: { chapterId: "chapter-7" },
      expect: { chapterId: "chapter-7", productArea: "completion" },
    },
    {
      area: "membership",
      name: "membership_activated",
      key: `p-area:${stamp}:membership_activated`,
      payload: { offerId: "community" },
      expect: { offerId: "community", productArea: "membership" },
    },
  ];

  for (const spec of serverEvents) {
    cleanupKeys.push(spec.key);
    const tracked = await trackProductEvent({
      name: spec.name,
      idempotencyKey: spec.key,
      userId,
      productArea: spec.area,
      locale: "en",
      payload: spec.payload,
    });
    await verify({
      area: spec.area,
      event: spec.name,
      key: spec.key,
      expect: spec.expect,
    });
    const last = areas[areas.length - 1];
    if (last) {
      last.apiAccepted = tracked.status === "created" || tracked.status === "duplicate";
      if (!last.apiAccepted) last.result = "FAIL";
      last.detail += `; track=${tracked.status}`;
    }
  }

  const dirtyKey = `p-area:${stamp}:privacy`;
  cleanupKeys.push(dirtyKey);
  await trackProductEvent({
    name: "registration_failed",
    idempotencyKey: dirtyKey,
    productArea: "registration",
    payload: {
      password: "hunter2",
      token: "sk_test_not_a_real_secret_value",
      prompt: "private lumina prompt",
      content: "private lumina response",
      offerId: "blueprint",
      locale: "en",
    },
  });
  resetAnalyticsStoreForTests();
  const dirty = await getAnalyticsStore().findByIdempotencyKey(dirtyKey);
  const dirtyHits = payloadContainsProhibitedData(dirty?.payload);
  const privacyPass =
    Boolean(dirty) &&
    dirtyHits.length === 0 &&
    !dirty?.payload?.password &&
    !dirty?.payload?.token &&
    !dirty?.payload?.prompt &&
    !dirty?.payload?.content &&
    dirty?.payload?.offerId === "blueprint";

  const unknown = await ingestClientAnalyticsEvent({
    name: "not_a_real_event",
    path: "/",
    anonymousId: `anon-${stamp}`,
    idempotencyKey: `p-area:${stamp}:evil`,
  });
  resetAnalyticsStoreForTests();
  const evil = await getAnalyticsStore().findByIdempotencyKey(`p-area:${stamp}:evil`);
  const allowPass = unknown.status === "ignored" && !evil;

  resetAnalyticsStoreForTests();
  const deleted = await getAnalyticsStore().deleteTestEventsByKeys(cleanupKeys);

  const writeRead =
    durability.backend === "supabase_postgres" &&
    analyticsPostgresConfigured() &&
    areas.every((area) => area.result === "PASS");

  console.log(
    JSON.stringify(
      {
        configured: analyticsPostgresConfigured(),
        backend: durability.backend,
        productionSourceOfTruth: durability.productionSourceOfTruth,
        dataDirIsSourceOfTruth: durability.dataDirIsSourceOfTruth,
        hostHint:
          hostHint(process.env.POSTGRES_URL_NON_POOLING) ||
          hostHint(process.env.POSTGRES_URL),
        table: "analytics_events",
        websiteApi: websiteApi,
        areas,
        privacyPass,
        allowPass,
        deleted,
        writeRead,
      },
      null,
      2,
    ),
  );
  if (!writeRead || !privacyPass || !allowPass) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    message
      .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
      .replace(/eyJ[A-Za-z0-9_-]{20,}/g, "[redacted]"),
  );
  process.exit(1);
});
