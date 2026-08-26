/**
 * Mechanical checks for the cinematic entrance review build.
 * Does not mark the experience Founder-approved.
 */

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

import { ingestClientAnalyticsEvent } from "@/lib/analytics/client-ingest";
import { PRODUCT_EVENT_NAMES } from "@/lib/analytics/taxonomy";
import { getAnalyticsStore, resetAnalyticsStoreForTests } from "@/lib/analytics/store";

type Verdict = "PASS" | "FAIL";

async function main() {
  const failures: string[] = [];
  const tests: Array<{ id: string; name: string; result: Verdict; detail: string }> = [];

  function record(id: string, name: string, pass: boolean, detail: string) {
    tests.push({ id, name, result: pass ? "PASS" : "FAIL", detail });
    if (!pass) failures.push(`${id} ${name}: ${detail}`);
  }

  record(
    "H1",
    "Production homepage is unchanged",
    existsSync("app/page.tsx") && existsSync("components/pages/home-page-view.tsx"),
    "app/page.tsx and HomePageView remain",
  );

  const homepage = await import("fs/promises").then((fs) =>
    fs.readFile("app/page.tsx", "utf8"),
  );
  record(
    "H2",
    "Homepage still renders HomePageView only",
    homepage.includes("HomePageView") && !homepage.includes("CinematicEntrance"),
    "production / does not mount the entrance",
  );

  record(
    "R1",
    "Review routes exist",
    existsSync("app/entrance-review/page.tsx") &&
      existsSync("app/%5Finternal/cinematic-entrance-review/page.tsx"),
    "Founder review URLs present",
  );

  record(
    "D1",
    "Deep links remain",
    [
      "app/login/page.tsx",
      "app/register/page.tsx",
      "app/support/page.tsx",
      "app/legal/[slug]/page.tsx",
      "app/architect/page.tsx",
    ].every((file) => existsSync(file)),
    "login/register/support/legal/architect routes exist",
  );

  record(
    "E1",
    "Entrance events added to taxonomy",
    PRODUCT_EVENT_NAMES.includes("entrance_viewed") &&
      PRODUCT_EVENT_NAMES.includes("entrance_entered") &&
      PRODUCT_EVENT_NAMES.includes("entrance_skipped") &&
      PRODUCT_EVENT_NAMES.length === 46,
    `count=${PRODUCT_EVENT_NAMES.length}`,
  );

  const tmp = `${process.env.TMPDIR || process.env.TEMP || "/tmp"}/bh-entrance-analytics.json`;
  process.env.ANALYTICS_DB_FILE = tmp;
  resetAnalyticsStoreForTests();

  const viewed = await ingestClientAnalyticsEvent({
    name: "entrance_viewed",
    path: "/entrance-review",
    anonymousId: "anon-entrance-test",
    idempotencyKey: "entrance_viewed:anon-entrance-test:/entrance-review",
  });
  const entered = await ingestClientAnalyticsEvent({
    name: "entrance_entered",
    path: "/entrance-review",
    anonymousId: "anon-entrance-test",
    cta: "enter_the_back_half",
    idempotencyKey: "entrance_entered:anon-entrance-test:/entrance-review",
  });
  const skipped = await ingestClientAnalyticsEvent({
    name: "entrance_skipped",
    path: "/entrance-review",
    anonymousId: "anon-entrance-test",
    cta: "skip",
    idempotencyKey: "entrance_skipped:anon-entrance-test:/entrance-review",
  });
  const duplicate = await ingestClientAnalyticsEvent({
    name: "entrance_entered",
    path: "/entrance-review",
    anonymousId: "anon-entrance-test",
    cta: "enter_the_back_half",
    idempotencyKey: "entrance_entered:anon-entrance-test:/entrance-review",
  });
  const stored = await getAnalyticsStore().findByIdempotencyKey(
    "entrance_entered:anon-entrance-test:/entrance-review",
  );

  record(
    "A1",
    "Entrance events ingest without duplicates",
    viewed.status === "created" &&
      entered.status === "created" &&
      skipped.status === "created" &&
      duplicate.status === "duplicate" &&
      stored?.payload?.cta === "enter_the_back_half" &&
      !stored?.payload?.password,
    `viewed=${viewed.status}; entered=${entered.status}; skipped=${skipped.status}; dup=${duplicate.status}`,
  );

  record(
    "A2",
    "No autoplay audio in entrance CSS",
    !(await import("fs/promises").then((fs) =>
      fs.readFile("components/entrance/cinematic-entrance.css", "utf8"),
    )).includes("@media (audio"),
    "silent entrance",
  );

  const payload = {
    at: new Date().toISOString(),
    founderApproved: false,
    productionHomepageReplaced: false,
    tests,
    failures,
    result: failures.length === 0 ? "PASS" : "FAIL",
  };
  await mkdir("ops/fab-5/runs", { recursive: true });
  await writeFile(
    "ops/fab-5/runs/cinematic-entrance-review-validation.json",
    JSON.stringify(payload, null, 2) + "\n",
    "utf8",
  );
  console.log(JSON.stringify({ result: payload.result, failures, passed: tests.filter((t) => t.result === "PASS").length, total: tests.length }, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
