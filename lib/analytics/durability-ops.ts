import {
  payloadContainsProhibitedData,
  sanitizeAnalyticsPayload,
} from "@/lib/analytics/privacy";
import {
  getAnalyticsDurability,
  getAnalyticsStore,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import { trackProductEvent } from "@/lib/analytics/track";
import {
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";

export type AnalyticsDurabilityAction =
  | "write"
  | "retrieve"
  | "suite"
  | "cleanup";

const KEY_PATTERN = /^row150-[a-z0-9-]{4,80}$/i;

function publicDurability(extra: Record<string, unknown> = {}): Record<string, unknown> {
  const durability = getAnalyticsDurability();
  return {
    backend: durability.backend,
    dataDirIsSourceOfTruth: durability.dataDirIsSourceOfTruth,
    productionSourceOfTruth: durability.productionSourceOfTruth,
    ...extra,
  };
}

function suiteKeys(key: string) {
  const userId = `architect-row150-${key}`;
  return {
    page: `p1:${key}:page_viewed`,
    purchase: `purchase_completed:cs_test_row150_${key}_dup`,
    journey: `journey_completed:${userId}`,
    privacy: `p5:privacy:${key}`,
    attribution: `purchase_completed:cs_test_row150_${key}_attr`,
    checkoutStart: `checkout_started:cs_test_row150_${key}_dup`,
    registration: `registration_succeeded:${userId}`,
    onboarding: `onboarding_started:${userId}`,
    lumina: `lumina_opened:${userId}:conv-${key}`,
    download: `p-download:${key}`,
    completion: `completion_experience_viewed:${userId}`,
    membership: `membership_activated:sub_test_row150_${key}`,
  };
}

function allSuiteKeys(key: string): string[] {
  return Object.values(suiteKeys(key));
}

export async function runAnalyticsDurability(input: {
  action: AnalyticsDurabilityAction;
  key: string;
}): Promise<Record<string, unknown>> {
  const key = input.key.trim();
  if (!KEY_PATTERN.test(key)) {
    return { ok: false, error: "invalid_durability_key" };
  }

  const durability = getAnalyticsDurability();
  const keys = suiteKeys(key);

  if (input.action === "cleanup") {
    resetAnalyticsStoreForTests();
    const store = getAnalyticsStore();
    const deleted = await store.deleteTestEventsByKeys(allSuiteKeys(key));
    return publicDurability({
      ok: true,
      action: "cleanup",
      deleted,
    });
  }

  if (input.action === "write") {
    const result = await trackProductEvent({
      name: "page_viewed",
      idempotencyKey: keys.page,
      anonymousId: `anon-${key}`,
      path: "/register",
      locale: "en",
    });
    return publicDurability({
      ok: result.status !== "ignored",
      action: "write",
      status: result.status,
      id: result.record?.id,
      test: result.record?.test === true,
    });
  }

  if (input.action === "retrieve") {
    resetAnalyticsStoreForTests();
    const again = getAnalyticsStore();
    const found = await again.findByIdempotencyKey(keys.page);
    return publicDurability({
      ok: Boolean(found),
      backend: again.backend,
      action: "retrieve",
      found: Boolean(found),
      id: found?.id,
      idMatch: Boolean(found?.id),
      storedValueMatches: found?.name === "page_viewed" && found.test === true,
      test: found?.test === true,
    });
  }

  const attribution = parseAttributionFromSearch(
    new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
  );

  const written = await trackProductEvent({
    name: "page_viewed",
    idempotencyKey: keys.page,
    anonymousId: `anon-${key}`,
    path: "/register",
    locale: "en",
    attribution,
  });
  const store = getAnalyticsStore();
  const stored = await store.findByIdempotencyKey(keys.page);

  resetAnalyticsStoreForTests();
  const fresh = getAnalyticsStore();
  const reread = await fresh.findByIdempotencyKey(keys.page);

  resetAnalyticsStoreForTests();
  const afterRestart = getAnalyticsStore();
  const stillThere = await afterRestart.findByIdempotencyKey(keys.page);

  await trackProductEvent({
    name: "purchase_completed",
    idempotencyKey: keys.purchase,
    userId: `architect-row150-${key}`,
    payload: {
      stripeCheckoutSessionId: `cs_test_row150_${key}_dup`,
      offerId: "blueprint",
    },
    attribution,
  });
  resetAnalyticsStoreForTests();
  const purchaseSecond = await trackProductEvent({
    name: "purchase_completed",
    idempotencyKey: keys.purchase,
    userId: `architect-row150-${key}`,
    payload: {
      stripeCheckoutSessionId: `cs_test_row150_${key}_dup`,
      offerId: "blueprint",
    },
    attribution,
  });
  await trackProductEvent({
    name: "journey_completed",
    idempotencyKey: keys.journey,
    userId: `architect-row150-${key}`,
    payload: { chapterId: "chapter-7", status: "journey_completed" },
  });
  resetAnalyticsStoreForTests();
  const journeySecond = await trackProductEvent({
    name: "journey_completed",
    idempotencyKey: keys.journey,
    userId: `architect-row150-${key}`,
    payload: { chapterId: "chapter-7", status: "journey_completed" },
  });
  const listed = await getAnalyticsStore().listEventsByUserId(
    `architect-row150-${key}`,
  );
  const purchases = listed.filter(
    (event) => event.name === "purchase_completed" && event.idempotencyKey === keys.purchase,
  );
  const journeys = listed.filter(
    (event) => event.name === "journey_completed" && event.idempotencyKey === keys.journey,
  );

  const dirty = {
    password: "hunter2",
    token: "sk_test_not_a_real_secret_value",
    verificationCode: "123456",
    cvv: "123",
    cardNumber: "4242424242424242",
    prompt: "private lumina prompt text",
    content: "private lumina response text",
    answer: "private journey answer",
    email: "architect@example.com",
    locale: "en",
    offerId: "blueprint",
  };
  await trackProductEvent({
    name: "registration_failed",
    idempotencyKey: keys.privacy,
    payload: dirty,
  });
  const storedDirty = await getAnalyticsStore().findByIdempotencyKey(keys.privacy);
  const hits = payloadContainsProhibitedData(storedDirty?.payload);
  const hasBlocked =
    storedDirty?.payload &&
    ("password" in storedDirty.payload ||
      "token" in storedDirty.payload ||
      "verificationCode" in storedDirty.payload ||
      "cvv" in storedDirty.payload ||
      "cardNumber" in storedDirty.payload ||
      "prompt" in storedDirty.payload ||
      "content" in storedDirty.payload ||
      "answer" in storedDirty.payload ||
      "email" in storedDirty.payload);
  const sanitizerDroppedPassword = !("password" in (sanitizeAnalyticsPayload(dirty) ?? {}));

  await trackProductEvent({
    name: "purchase_completed",
    idempotencyKey: keys.attribution,
    anonymousId: "anon-ig",
    userId: `architect-row150-${key}`,
    path: "/checkout",
    locale: "en",
    attribution,
    payload: {
      stripeCheckoutSessionId: `cs_test_row150_${key}_attr`,
      offerId: "blueprint",
      amountCents: 150000,
      currency: "usd",
    },
  });
  const attrStored = await getAnalyticsStore().findByIdempotencyKey(keys.attribution);

  const areaUser = `architect-row150-${key}`;
  await trackProductEvent({
    name: "checkout_started",
    idempotencyKey: keys.checkoutStart,
    userId: areaUser,
    productArea: "checkout",
    payload: {
      offerId: "blueprint",
      stripeCheckoutSessionId: `cs_test_row150_${key}_dup`,
    },
  });
  await trackProductEvent({
    name: "registration_succeeded",
    idempotencyKey: keys.registration,
    userId: areaUser,
    productArea: "registration",
    payload: { method: "email" },
  });
  await trackProductEvent({
    name: "onboarding_started",
    idempotencyKey: keys.onboarding,
    userId: areaUser,
    productArea: "onboarding",
    payload: { step: "welcome", sequence: 1 },
  });
  await trackProductEvent({
    name: "lumina_opened",
    idempotencyKey: keys.lumina,
    userId: areaUser,
    productArea: "lumina",
    payload: { conversationId: `conv-${key}` },
  });
  await trackProductEvent({
    name: "download_completed",
    idempotencyKey: keys.download,
    userId: areaUser,
    productArea: "downloads",
    payload: { assetId: "guidebook", assetType: "pdf" },
  });
  await trackProductEvent({
    name: "completion_experience_viewed",
    idempotencyKey: keys.completion,
    userId: areaUser,
    productArea: "completion",
    payload: { chapterId: "chapter-7" },
  });
  await trackProductEvent({
    name: "membership_activated",
    idempotencyKey: keys.membership,
    userId: areaUser,
    productArea: "membership",
    payload: { offerId: "community" },
  });
  resetAnalyticsStoreForTests();
  const areaStore = getAnalyticsStore();
  const storedCheckoutStart = await areaStore.findByIdempotencyKey(keys.checkoutStart);
  const storedRegistration = await areaStore.findByIdempotencyKey(keys.registration);
  const storedOnboarding = await areaStore.findByIdempotencyKey(keys.onboarding);
  const storedLumina = await areaStore.findByIdempotencyKey(keys.lumina);
  const storedDownload = await areaStore.findByIdempotencyKey(keys.download);
  const storedCompletion = await areaStore.findByIdempotencyKey(keys.completion);
  const storedMembership = await areaStore.findByIdempotencyKey(keys.membership);
  const luminaPayloadClean =
    Boolean(storedLumina) &&
    !("content" in (storedLumina?.payload ?? {})) &&
    !("prompt" in (storedLumina?.payload ?? {})) &&
    !("message" in (storedLumina?.payload ?? {}));
  const areas = {
    website: Boolean(stored) && stored?.name === "page_viewed",
    checkout: Boolean(storedCheckoutStart) && Boolean(attrStored),
    registration: Boolean(storedRegistration),
    onboarding: Boolean(storedOnboarding),
    journey: journeys.length === 1,
    lumina: luminaPayloadClean,
    downloads: Boolean(storedDownload),
    completion: Boolean(storedCompletion),
    membership: Boolean(storedMembership),
  };

  const p1 =
    store.backend === "supabase_postgres" &&
    written.status === "created" &&
    Boolean(stored) &&
    durability.dataDirIsSourceOfTruth === false;
  const p2 =
    fresh.backend === "supabase_postgres" && Boolean(reread) && reread?.id === stored?.id;
  const p3 = afterRestart.backend === "supabase_postgres" && Boolean(stillThere);
  const p4 =
    purchaseSecond.status === "duplicate" &&
    journeySecond.status === "duplicate" &&
    purchases.length === 1 &&
    journeys.length === 1;
  const p5 =
    Boolean(storedDirty) &&
    !hasBlocked &&
    hits.length === 0 &&
    storedDirty?.payload?.offerId === "blueprint" &&
    sanitizerDroppedPassword;
  const p6 =
    attrStored?.payload?.source === "instagram" &&
    attrStored?.payload?.campaign === "the-question" &&
    attrStored?.payload?.assetId === "R78-0828-IG" &&
    attrStored?.payload?.locale === "en" &&
    attrStored?.test === true;

  return publicDurability({
    ok: p1 && p2 && p3 && p4 && p5 && p6,
    action: "suite",
    tests: {
      P1: p1,
      P2: p2,
      P3: p3,
      P4: p4,
      P5: p5,
      P6: p6,
    },
    p1: {
      status: written.status,
      stored: Boolean(stored),
      backend: store.backend,
    },
    p2: {
      found: Boolean(reread),
      idMatch: reread?.id === stored?.id,
      backend: fresh.backend,
    },
    p3: { found: Boolean(stillThere), backend: afterRestart.backend },
    p4: {
      purchaseSecond: purchaseSecond.status,
      journeySecond: journeySecond.status,
      purchaseCount: purchases.length,
      journeyCount: journeys.length,
    },
    p5: {
      storedKeys: Object.keys(storedDirty?.payload ?? {}),
      hits: hits.length,
      blockedPresent: Boolean(hasBlocked),
    },
    p6: {
      source: attrStored?.payload?.source ?? null,
      campaign: attrStored?.payload?.campaign ?? null,
      assetId: attrStored?.payload?.assetId ?? null,
      locale: attrStored?.payload?.locale ?? null,
      test: attrStored?.test === true,
    },
    areas,
  });
}
