/**
 * Mechanical Row 150 validation. Does not mark the row Complete.
 * Does not create a live Stripe charge.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ingestClientAnalyticsEvent } from "@/lib/analytics/client-ingest";
import { trackArchitectDownload } from "@/lib/analytics/downloads";
import {
  payloadContainsProhibitedData,
  sanitizeAnalyticsPayload,
} from "@/lib/analytics/privacy";
import { emitJourneyProgressAnalytics, emitOnboardingAnalytics } from "@/lib/analytics/product-hooks";
import {
  getAnalyticsStore,
  resetAnalyticsStoreForTests,
} from "@/lib/analytics/store";
import { PRODUCT_EVENT_NAMES, REQUIRED_ROW_150_PRODUCT_EVENT_NAMES } from "@/lib/analytics/taxonomy";
import { trackProductEvent } from "@/lib/analytics/track";
import { createEmptyOnboardingRecord } from "@/lib/journey/onboarding/types";
import {
  parseAttributionFromSearch,
  trackedRegisterUrl,
} from "@/lib/marketing-kpi/attribution";
import {
  recordCheckoutStart,
  recordLandingPageSession,
  recordPurchase,
} from "@/lib/marketing-kpi/collect";
import {
  getMarketingKpiStore,
  resetMarketingKpiStoreForTests,
} from "@/lib/marketing-kpi/store";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

function named(
  events: Array<{ name: string; payload?: Record<string, unknown> }>,
  name: string,
) {
  return events.filter((event) => event.name === name);
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{
    id: string;
    name: string;
    result: Verdict;
    expectedEvent: string;
    actualEvent: string;
    requiredProperties: string;
    actualProperties: string;
    destinationConfirmed: string;
    detail: string;
  }> = [];

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "row150-"));
  const analyticsDb = path.join(tmpDir, "analytics.json");
  const marketingDb = path.join(tmpDir, "marketing.json");
  process.env.ANALYTICS_DB_FILE = analyticsDb;
  process.env.MARKETING_KPI_DB_FILE = marketingDb;
  resetAnalyticsStoreForTests();
  resetMarketingKpiStoreForTests();

  const attribution = parseAttributionFromSearch(
    new URL(trackedRegisterUrl("R78-0828-IG")).searchParams,
  );
  const userId = "architect-row150-test";
  const sessionId = "cs_test_row150_purchase";

  function push(input: {
    id: string;
    name: string;
    pass: boolean;
    expectedEvent: string;
    actualEvent: string;
    requiredProperties: string;
    actualProperties: string;
    destinationConfirmed: string;
    detail: string;
  }) {
    tests.push({
      id: input.id,
      name: input.name,
      result: mark(input.pass),
      expectedEvent: input.expectedEvent,
      actualEvent: input.actualEvent,
      requiredProperties: input.requiredProperties,
      actualProperties: input.actualProperties,
      destinationConfirmed: input.destinationConfirmed,
      detail: input.detail,
    });
  }

  // T1 — Website
  await ingestClientAnalyticsEvent({
    name: "page_viewed",
    path: "/",
    locale: "en",
    anonymousId: "anon-t1",
    attribution,
    userAgent: "Mozilla/5.0",
  });
  await ingestClientAnalyticsEvent({
    name: "cta_clicked",
    path: "/",
    locale: "en",
    anonymousId: "anon-t1",
    cta: "become_architect",
    destination: "/register",
    attribution,
  });
  let events = await getAnalyticsStore().listEvents();
  const t1Pages = named(events, "page_viewed");
  const t1Ctas = named(events, "cta_clicked");
  push({
    id: "T1",
    name: "Website page and CTA events",
    pass:
      t1Pages.length === 1 &&
      t1Ctas.length === 1 &&
      t1Ctas[0]?.payload?.cta === "become_architect" &&
      t1Pages[0]?.payload?.locale === "en",
    expectedEvent: "page_viewed, cta_clicked",
    actualEvent: `${t1Pages.map((e) => e.name).join(",")} | ${t1Ctas.map((e) => e.name).join(",")}`,
    requiredProperties: "page, locale, cta, destination, identity=anonymous",
    actualProperties: JSON.stringify({
      page: t1Pages[0]?.payload?.path,
      locale: t1Pages[0]?.payload?.locale,
      cta: t1Ctas[0]?.payload?.cta,
      destination: t1Ctas[0]?.payload?.destination,
      identity: t1Pages[0]?.payload?.identity,
    }),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Public homepage + Become an Architect CTA",
  });

  // T2 — Campaign attribution persists landing → registration → checkout → purchase
  await recordLandingPageSession({
    attribution,
    path: "/register",
    visitorKey: "row150-ig",
    test: true,
  });
  await trackProductEvent({
    name: "registration_succeeded",
    userId,
    anonymousId: "anon-t1",
    productArea: "registration",
    locale: "en",
    attribution,
    idempotencyKey: `registration_succeeded:${userId}`,
    payload: { method: "email" },
  });
  await recordCheckoutStart({
    attribution,
    stripeCheckoutSessionId: sessionId,
    test: true,
  });
  await trackProductEvent({
    name: "checkout_started",
    userId,
    productArea: "checkout",
    locale: "en",
    attribution,
    idempotencyKey: `checkout_started:${sessionId}`,
    payload: {
      offerId: "blueprint",
      stripeCheckoutSessionId: sessionId,
      amountCents: 150000,
      currency: "usd",
    },
  });
  await recordPurchase({
    attribution,
    stripeCheckoutSessionId: sessionId,
    test: true,
  });
  await trackProductEvent({
    name: "purchase_completed",
    userId,
    productArea: "checkout",
    attribution,
    idempotencyKey: `purchase_completed:${sessionId}`,
    payload: { offerId: "blueprint", stripeCheckoutSessionId: sessionId },
  });
  events = await getAnalyticsStore().listEvents();
  const marketing = await getMarketingKpiStore().read();
  const purchaseEvents = named(events, "purchase_completed");
  const t2Pass =
    purchaseEvents[0]?.payload?.source === "instagram" &&
    purchaseEvents[0]?.payload?.campaign === "the-question" &&
    purchaseEvents[0]?.payload?.assetId === "R78-0828-IG" &&
    named(events, "registration_succeeded")[0]?.payload?.source === "instagram" &&
    marketing.events.some((event) => event.name === "landing_page_session") &&
    marketing.events.some((event) => event.name === "checkout_start") &&
    marketing.events.some((event) => event.name === "purchase");
  push({
    id: "T2",
    name: "Campaign attribution persists through conversion and Row 84",
    pass: t2Pass,
    expectedEvent: "registration_succeeded + checkout_started + purchase_completed + Row 84 landing/checkout/purchase",
    actualEvent: [
      ...named(events, "registration_succeeded").map((e) => e.name),
      ...named(events, "purchase_completed").map((e) => e.name),
      ...marketing.events.map((e) => e.name),
    ].join(", "),
    requiredProperties: "source=instagram, campaign=the-question, assetId=R78-0828-IG",
    actualProperties: JSON.stringify(purchaseEvents[0]?.payload),
    destinationConfirmed: "analytics ledger + marketing-kpi ledger",
    detail: "First-touch UTM retained; Row 84 names preserved",
  });

  // T3 — Registration success funnel
  await ingestClientAnalyticsEvent({
    name: "registration_viewed",
    path: "/register",
    locale: "en",
    anonymousId: "anon-t3",
    attribution,
  });
  await ingestClientAnalyticsEvent({
    name: "registration_started",
    path: "/register",
    locale: "en",
    anonymousId: "anon-t3",
    cta: "email",
    attribution,
  });
  await ingestClientAnalyticsEvent({
    name: "registration_method_selected",
    path: "/register",
    locale: "en",
    anonymousId: "anon-t3",
    cta: "email",
    attribution,
  });
  await trackProductEvent({
    name: "registration_submitted",
    productArea: "registration",
    locale: "en",
    attribution,
    idempotencyKey: "registration_submitted:email:t3",
    payload: { method: "email" },
  });
  await trackProductEvent({
    name: "email_verification_required",
    userId,
    productArea: "registration",
    locale: "en",
    idempotencyKey: `email_verification_required:${userId}`,
    payload: { method: "email" },
  });
  await trackProductEvent({
    name: "email_verified",
    userId,
    productArea: "registration",
    locale: "en",
    idempotencyKey: `email_verified:${userId}`,
    payload: { method: "email" },
  });
  events = await getAnalyticsStore().listEvents();
  const t3Names = [
    "registration_viewed",
    "registration_started",
    "registration_method_selected",
    "registration_submitted",
    "registration_succeeded",
    "email_verification_required",
    "email_verified",
  ];
  push({
    id: "T3",
    name: "Registration funnel",
    pass: t3Names.every((name) => named(events, name).length >= 1),
    expectedEvent: t3Names.join(", "),
    actualEvent: t3Names.map((name) => `${name}:${named(events, name).length}`).join(", "),
    requiredProperties: "method=email, no password",
    actualProperties: JSON.stringify(named(events, "registration_submitted")[0]?.payload),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Approved test account path (in-process, no live mailbox)",
  });

  // T4 — Registration failure
  await trackProductEvent({
    name: "registration_failed",
    productArea: "registration",
    locale: "en",
    attribution,
    idempotencyKey: "registration_failed:validation:t4",
    payload: { method: "email", errorCategory: "validation" },
  });
  events = await getAnalyticsStore().listEvents();
  const t4 = named(events, "registration_failed")[0];
  push({
    id: "T4",
    name: "Registration failure",
    pass: t4?.payload?.errorCategory === "validation" && t4.payload.method === "email",
    expectedEvent: "registration_failed",
    actualEvent: t4?.name ?? "missing",
    requiredProperties: "errorCategory=validation, method=email",
    actualProperties: JSON.stringify(t4?.payload),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Controlled validation failure — no credentials stored",
  });

  // T5 — Checkout start
  await ingestClientAnalyticsEvent({
    name: "checkout_viewed",
    path: "/checkout/blueprint",
    locale: "en",
    anonymousId: "anon-t5",
    attribution,
  });
  events = await getAnalyticsStore().listEvents();
  const t5View = named(events, "checkout_viewed")[0];
  const t5Start = named(events, "checkout_started")[0];
  push({
    id: "T5",
    name: "Checkout start",
    pass:
      t5View?.payload?.productArea === "checkout" &&
      t5Start?.payload?.stripeCheckoutSessionId === sessionId,
    expectedEvent: "checkout_viewed, checkout_started",
    actualEvent: `${t5View?.name ?? "missing"}, ${t5Start?.name ?? "missing"}`,
    requiredProperties: "offerId, stripeCheckoutSessionId, amountCents, currency",
    actualProperties: JSON.stringify(t5Start?.payload),
    destinationConfirmed: "analytics ledger + Row 84 checkout_start",
    detail: "No live Stripe session created in this test",
  });

  // T6 — Purchase once only (sandbox / no live charge)
  const purchaseRetry = await trackProductEvent({
    name: "purchase_completed",
    userId,
    productArea: "checkout",
    attribution,
    idempotencyKey: `purchase_completed:${sessionId}`,
    payload: { offerId: "blueprint", stripeCheckoutSessionId: sessionId },
  });
  const marketingRetry = await recordPurchase({
    attribution,
    stripeCheckoutSessionId: sessionId,
    test: true,
  });
  events = await getAnalyticsStore().listEvents();
  const mktAfter = await getMarketingKpiStore().read();
  push({
    id: "T6",
    name: "Purchase recorded once (no live charge)",
    pass:
      named(events, "purchase_completed").length === 1 &&
      purchaseRetry.status === "duplicate" &&
      marketingRetry.status === "duplicate" &&
      mktAfter.events.filter((event) => event.name === "purchase").length === 1,
    expectedEvent: "purchase_completed x1, Row 84 purchase x1",
    actualEvent: `purchase_completed x${named(events, "purchase_completed").length}, purchase x${mktAfter.events.filter((e) => e.name === "purchase").length}`,
    requiredProperties: "idempotent on Stripe session id",
    actualProperties: JSON.stringify({
      analyticsRetry: purchaseRetry.status,
      marketingRetry: marketingRetry.status,
    }),
    destinationConfirmed: "analytics ledger + marketing-kpi ledger",
    detail: "Webhook/retry simulation — never billed",
  });

  // T7 — Onboarding
  const onboardingUser = "architect-onboarding-t7";
  const empty = createEmptyOnboardingRecord(onboardingUser);
  await emitOnboardingAnalytics(undefined, empty);
  const afterWelcome = {
    ...empty,
    completedSteps: ["welcome"] as const,
    currentStep: "preferences" as const,
    welcomeCompletedAt: new Date().toISOString(),
  };
  await emitOnboardingAnalytics(empty, afterWelcome);
  const completed = {
    ...afterWelcome,
    completedSteps: [
      "welcome",
      "preferences",
      "consent",
      "lumina",
      "assessment",
      "awakening",
    ] as const,
    currentStep: "completed" as const,
    status: "completed" as const,
    completedAt: new Date().toISOString(),
  };
  await emitOnboardingAnalytics(afterWelcome, completed);
  events = await getAnalyticsStore().listEvents();
  const t7Started = named(events, "onboarding_started").filter((e) => e.payload && "step" in e.payload);
  const userOnboarding = (await getAnalyticsStore().listEventsByUserId(onboardingUser)).map((e) => e.name);
  push({
    id: "T7",
    name: "Onboarding progression",
    pass:
      userOnboarding.includes("onboarding_started") &&
      userOnboarding.includes("onboarding_step_viewed") &&
      userOnboarding.includes("onboarding_step_completed") &&
      userOnboarding.includes("onboarding_completed"),
    expectedEvent: "onboarding_started, onboarding_step_viewed, onboarding_step_completed, onboarding_completed",
    actualEvent: userOnboarding.join(", "),
    requiredProperties: "step, sequence — no assessment free-text",
    actualProperties: JSON.stringify(
      (await getAnalyticsStore().listEventsByUserId(onboardingUser)).map((e) => e.payload),
    ),
    destinationConfirmed: "first-party analytics ledger",
    detail: `started count context ${t7Started.length}`,
  });

  // T8 — Journey enter / save / resume / complete
  const journeyUser = "architect-journey-t8";
  await emitJourneyProgressAnalytics(undefined, {
    userId: journeyUser,
    chapterId: "chapter-1",
    status: "in_progress",
    updatedAt: "2026-08-19T08:00:00.000Z",
  });
  await emitJourneyProgressAnalytics(
    {
      userId: journeyUser,
      chapterId: "chapter-1",
      status: "in_progress",
      updatedAt: "2026-08-18T20:00:00.000Z",
    },
    {
      userId: journeyUser,
      chapterId: "chapter-1",
      status: "in_progress",
      updatedAt: "2026-08-19T08:00:00.000Z",
    },
  );
  await emitJourneyProgressAnalytics(
    {
      userId: journeyUser,
      chapterId: "chapter-1",
      status: "in_progress",
      updatedAt: "2026-08-19T08:00:00.000Z",
    },
    {
      userId: journeyUser,
      chapterId: "chapter-1",
      status: "chapter_completed",
      updatedAt: "2026-08-19T08:05:00.000Z",
    },
  );
  await emitJourneyProgressAnalytics(
    {
      userId: journeyUser,
      chapterId: "chapter-6",
      status: "chapter_completed",
      updatedAt: "2026-08-19T09:00:00.000Z",
    },
    {
      userId: journeyUser,
      chapterId: "chapter-7",
      status: "journey_completed",
      updatedAt: "2026-08-19T10:00:00.000Z",
    },
  );
  const journeyEvents = await getAnalyticsStore().listEventsByUserId(journeyUser);
  const journeyNames = journeyEvents.map((e) => e.name);
  const privateLeak = journeyEvents.some((event) =>
    JSON.stringify(event.payload ?? {}).includes("I wrote this reflection"),
  );
  push({
    id: "T8",
    name: "Journey enter, save, resume, complete",
    pass:
      journeyNames.includes("journey_entered") &&
      journeyNames.includes("journey_chapter_started") &&
      journeyNames.includes("journey_progress_saved") &&
      journeyNames.includes("journey_resumed") &&
      journeyNames.includes("journey_chapter_completed") &&
      journeyNames.includes("journey_completed") &&
      !privateLeak,
    expectedEvent: "journey_entered, journey_chapter_started, journey_progress_saved, journey_resumed, journey_chapter_completed, journey_completed",
    actualEvent: journeyNames.join(", "),
    requiredProperties: "chapterId, status — no written answers",
    actualProperties: JSON.stringify(journeyEvents.map((e) => ({ name: e.name, payload: e.payload }))),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Product uses chapters, not separate activity IDs",
  });

  // T9 — Lumina usage without conversation content
  await trackProductEvent({
    name: "lumina_opened",
    userId: "architect-lumina-t9",
    productArea: "lumina",
    locale: "en",
    idempotencyKey: "lumina_opened:t9",
    payload: {
      conversationId: "conv-t9",
      prompt: "Tell Lumina my secret",
      content: "private architect prompt",
      message: "should never land",
    },
  });
  await trackProductEvent({
    name: "lumina_message_sent",
    userId: "architect-lumina-t9",
    productArea: "lumina",
    locale: "en",
    idempotencyKey: "lumina_message_sent:t9",
    payload: { conversationId: "conv-t9", chapterId: "chapter-2" },
  });
  await trackProductEvent({
    name: "lumina_response_received",
    userId: "architect-lumina-t9",
    productArea: "lumina",
    locale: "en",
    idempotencyKey: "lumina_response_received:t9",
    payload: {
      conversationId: "conv-t9",
      responseStatus: "ok",
      latencyMs: 42,
    },
  });
  await trackProductEvent({
    name: "lumina_error",
    userId: "architect-lumina-t9",
    productArea: "lumina",
    idempotencyKey: "lumina_error:t9",
    payload: { errorCategory: "send_failed", responseStatus: "error" },
  });
  const luminaEvents = await getAnalyticsStore().listEventsByUserId("architect-lumina-t9");
  const luminaSerialized = JSON.stringify(luminaEvents);
  push({
    id: "T9",
    name: "Lumina usage without conversation content",
    pass:
      named(luminaEvents, "lumina_opened").length === 1 &&
      named(luminaEvents, "lumina_message_sent").length === 1 &&
      named(luminaEvents, "lumina_response_received").length === 1 &&
      named(luminaEvents, "lumina_error").length === 1 &&
      !luminaSerialized.includes("secret") &&
      !luminaSerialized.includes("private architect") &&
      !luminaSerialized.includes("should never land") &&
      luminaEvents.every((event) => payloadContainsProhibitedData(event.payload).length === 0),
    expectedEvent: "lumina_opened, lumina_message_sent, lumina_response_received, lumina_error",
    actualEvent: luminaEvents.map((e) => e.name).join(", "),
    requiredProperties: "conversationId, responseStatus, errorCategory — never prompt/response text",
    actualProperties: luminaSerialized,
    destinationConfirmed: "first-party analytics ledger",
    detail: "Sanitizer stripped prompt/content/message keys",
  });

  // T10 — Download
  await trackArchitectDownload({
    userId: "architect-download-t10",
    assetId: "guidebook",
    assetType: "pdf",
    phase: "started",
  });
  await trackArchitectDownload({
    userId: "architect-download-t10",
    assetId: "guidebook",
    assetType: "pdf",
    phase: "completed",
  });
  await trackArchitectDownload({
    userId: "architect-download-t10",
    assetId: "guidebook",
    assetType: "pdf",
    phase: "completed",
  });
  const downloadEvents = await getAnalyticsStore().listEventsByUserId("architect-download-t10");
  push({
    id: "T10",
    name: "Architect download",
    pass:
      named(downloadEvents, "download_started").length === 1 &&
      named(downloadEvents, "download_completed").length === 1 &&
      downloadEvents[0]?.payload?.assetId === "guidebook",
    expectedEvent: "download_started, download_completed (once each)",
    actualEvent: downloadEvents.map((e) => e.name).join(", "),
    requiredProperties: "assetId, assetType",
    actualProperties: JSON.stringify(downloadEvents.map((e) => e.payload)),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Second completed call is idempotent for the same ET day",
  });

  // T11 — Completion
  const completionEvents = journeyEvents.filter((event) =>
    [
      "journey_completed",
      "completion_experience_viewed",
    ].includes(event.name),
  );
  await trackArchitectDownload({
    userId: journeyUser,
    assetId: "certificate",
    assetType: "pdf",
    phase: "completed",
  });
  const afterCert = await getAnalyticsStore().listEventsByUserId(journeyUser);
  push({
    id: "T11",
    name: "Completion and certificate",
    pass:
      named(afterCert, "journey_completed").length === 1 &&
      named(afterCert, "completion_experience_viewed").length === 1 &&
      named(afterCert, "certificate_generated").length === 1 &&
      named(afterCert, "certificate_downloaded").length === 1,
    expectedEvent: "journey_completed, completion_experience_viewed, certificate_generated, certificate_downloaded",
    actualEvent: afterCert
      .filter((e) =>
        [
          "journey_completed",
          "completion_experience_viewed",
          "certificate_generated",
          "certificate_downloaded",
        ].includes(e.name),
      )
      .map((e) => e.name)
      .join(", "),
    requiredProperties: "chapterId / assetId=certificate",
    actualProperties: JSON.stringify(completionEvents.map((e) => e.payload)),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Chapter 7 complete hosts the Row 135 Threshold Ceremony; locked Row 150 taxonomy still uses completion_experience_viewed",
  });

  // T12 — Membership states that exist
  const member = "architect-member-t12";
  await trackProductEvent({
    name: "membership_started",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_started:sub_t12",
    payload: { offerId: "community" },
  });
  await trackProductEvent({
    name: "membership_activated",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_activated:sub_t12",
    payload: { offerId: "community" },
  });
  await trackProductEvent({
    name: "membership_renewed",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_renewed:in_t12",
    payload: { offerId: "community", stripeInvoiceId: "in_t12" },
  });
  await trackProductEvent({
    name: "membership_payment_failed",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_payment_failed:in_fail",
    payload: { offerId: "community", errorCategory: "payment_failed" },
  });
  await trackProductEvent({
    name: "membership_cancelled",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_cancelled:sub_t12",
    payload: { offerId: "community" },
  });
  const membershipEvents = await getAnalyticsStore().listEventsByUserId(member);
  push({
    id: "T12",
    name: "Membership lifecycle (implemented states)",
    pass:
      named(membershipEvents, "membership_started").length === 1 &&
      named(membershipEvents, "membership_activated").length === 1 &&
      named(membershipEvents, "membership_renewed").length === 1 &&
      named(membershipEvents, "membership_payment_failed").length === 1 &&
      named(membershipEvents, "membership_cancelled").length === 1,
    expectedEvent: "membership_started, activated, renewed, payment_failed, cancelled",
    actualEvent: membershipEvents.map((e) => e.name).join(", "),
    requiredProperties: "offerId=community",
    actualProperties: JSON.stringify(membershipEvents.map((e) => e.payload)),
    destinationConfirmed: "first-party analytics ledger",
    detail: "membership_expired is deferred — no expiry webhook path at launch",
  });

  // T13 — Duplicate protection
  const dupReg = await trackProductEvent({
    name: "registration_succeeded",
    userId,
    productArea: "registration",
    idempotencyKey: `registration_succeeded:${userId}`,
    payload: { method: "email" },
  });
  const dupJourney = await trackProductEvent({
    name: "journey_completed",
    userId: journeyUser,
    productArea: "completion",
    idempotencyKey: `journey_completed:${journeyUser}`,
    payload: { chapterId: "chapter-7", status: "journey_completed" },
  });
  const dupMember = await trackProductEvent({
    name: "membership_started",
    userId: member,
    productArea: "membership",
    idempotencyKey: "membership_started:sub_t12",
    payload: { offerId: "community" },
  });
  events = await getAnalyticsStore().listEvents();
  push({
    id: "T13",
    name: "Duplicate protection for critical conversions",
    pass:
      dupReg.status === "duplicate" &&
      dupJourney.status === "duplicate" &&
      dupMember.status === "duplicate" &&
      named(events, "registration_succeeded").filter((e) => e.userId === userId).length === 1 &&
      named(events, "purchase_completed").length === 1,
    expectedEvent: "duplicate status for registration_succeeded, purchase_completed, journey_completed, membership_started",
    actualEvent: `${dupReg.status}, ${purchaseRetry.status}, ${dupJourney.status}, ${dupMember.status}`,
    requiredProperties: "idempotencyKey stable per conversion id",
    actualProperties: JSON.stringify({
      registration: dupReg.status,
      purchase: purchaseRetry.status,
      journey: dupJourney.status,
      membership: dupMember.status,
    }),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Refresh / webhook retry / double-submit simulation",
  });

  // T14 — Privacy payload inspection
  const sanitized = sanitizeAnalyticsPayload({
    password: "hunter2",
    token: "secret-token",
    cvv: "123",
    cardnumber: "4242424242424242",
    prompt: "Architect told Lumina a secret",
    answer: "Chapter III private writing",
    content: "journal body",
    offerId: "blueprint",
    locale: "en",
  });
  const allEvents = await getAnalyticsStore().listEvents();
  const privacyHits = allEvents.flatMap((event) =>
    payloadContainsProhibitedData(event.payload).map((hit) => `${event.name}:${hit}`),
  );
  const serializedAll = JSON.stringify(allEvents);
  push({
    id: "T14",
    name: "Privacy blocklist — actual payloads inspected",
    pass:
      sanitized?.password === undefined &&
      sanitized?.prompt === undefined &&
      sanitized?.answer === undefined &&
      sanitized?.cvv === undefined &&
      sanitized?.offerId === "blueprint" &&
      privacyHits.length === 0 &&
      !serializedAll.includes("hunter2") &&
      !serializedAll.includes("4242424242424242") &&
      !serializedAll.includes("Architect told Lumina"),
    expectedEvent: "sanitized payloads only",
    actualEvent: `inspected ${allEvents.length} stored events`,
    requiredProperties: "allowlisted keys only; no credentials, card data, Journey/Lumina text",
    actualProperties: JSON.stringify({ sanitized, privacyHits }),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Mechanical inspection of every stored payload in this run",
  });

  // T15 — English / Spanish same taxonomy
  await ingestClientAnalyticsEvent({
    name: "page_viewed",
    path: "/es",
    locale: "es",
    anonymousId: "anon-t15",
    attribution,
  });
  await ingestClientAnalyticsEvent({
    name: "registration_viewed",
    path: "/es/register",
    locale: "es",
    anonymousId: "anon-t15",
    attribution,
  });
  events = await getAnalyticsStore().listEvents();
  const esPage = named(events, "page_viewed").find((e) => e.payload?.locale === "es");
  const esReg = named(events, "registration_viewed").find((e) => e.payload?.locale === "es");
  const enPage = named(events, "page_viewed").find((e) => e.payload?.locale === "en");
  push({
    id: "T15",
    name: "English/Spanish same taxonomy + locale property",
    pass:
      Boolean(esPage && esReg && enPage) &&
      esPage?.name === enPage?.name &&
      esReg?.name === "registration_viewed",
    expectedEvent: "page_viewed + registration_viewed (same names, locale=en|es)",
    actualEvent: `${enPage?.name}:${enPage?.payload?.locale}, ${esPage?.name}:${esPage?.payload?.locale}, ${esReg?.name}:${esReg?.payload?.locale}`,
    requiredProperties: "locale property; no separate Spanish event names",
    actualProperties: JSON.stringify({
      en: enPage?.payload?.locale,
      esPage: esPage?.payload?.locale,
      esReg: esReg?.payload?.locale,
    }),
    destinationConfirmed: "first-party analytics ledger",
    detail: "Spanish /register path uses the same event names",
  });

  // Regression
  const ignoredUnknown = await ingestClientAnalyticsEvent({
    name: "not_a_real_event",
    path: "/",
    anonymousId: "anon-reg",
  });
  const ignoredNoAnon = await ingestClientAnalyticsEvent({
    name: "page_viewed",
    path: "/",
  });
  const registerBeacon =
    existsSync("components/marketing-kpi/marketing-session-beacon.tsx") &&
    existsSync("app/register/page.tsx");
  const row84Dashboard = existsSync("ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md");
  const noGa4 = !PRODUCT_EVENT_NAMES.includes("page_view" as never);
  const requiredCountOk = REQUIRED_ROW_150_PRODUCT_EVENT_NAMES.length === 43;
  push({
    id: "R1",
    name: "Regression — client ingest rejects unknown events; Row 84 retained",
    pass:
      ignoredUnknown.status === "ignored" &&
      ignoredNoAnon.status === "ignored" &&
      registerBeacon &&
      row84Dashboard &&
      noGa4 &&
      requiredCountOk &&
      marketing.events.some((event) => event.name === "landing_page_session"),
    expectedEvent: "unknown client events ignored; Row 84 landing_page_session remains",
    actualEvent: `${ignoredUnknown.status}, ${ignoredNoAnon.status}`,
    requiredProperties: "CLIENT_EVENT_NAMES allowlist",
    actualProperties: JSON.stringify({ ignoredUnknown, ignoredNoAnon }),
    destinationConfirmed: "analytics ingest + marketing-kpi store",
    detail: "No GA4/Clarity introduced; /register destination unchanged",
  });

  for (const test of tests) {
    if (test.result === "FAIL") {
      failures.push(`${test.id} ${test.name}: ${test.detail}`);
    }
  }

  const payload = {
    row: 150,
    runId: "r150-2026-08-19-event-tracking-validation",
    at: new Date().toISOString(),
    founderAcceptance: null,
    founderAccepted: false,
    rowMarkedComplete: false,
    sourceOfTruth: "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md",
    destination: "isolated ANALYTICS_DB_FILE test ledger (production store is Supabase Postgres analytics_events)",
    row84Integration: "marketing-kpi ledger unchanged; dual-write on checkout/purchase",
    tests,
    failures,
    result: failures.length === 0 ? "PASS" : "FAIL",
    readyForFounderAcceptanceReview: failures.length === 0,
  };

  await mkdir("ops/fab-5/runs", { recursive: true });
  const evidencePath =
    process.env.ROW150_VALIDATION_OUT ??
    "ops/fab-5/runs/row-150-event-tracking-validation.json";
  await writeFile(
    evidencePath,
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );

  await rm(tmpDir, { recursive: true, force: true });
  console.log(
    JSON.stringify(
      {
        result: payload.result,
        failures,
        passed: tests.filter((t) => t.result === "PASS").length,
        total: tests.length,
      },
      null,
      2,
    ),
  );
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
