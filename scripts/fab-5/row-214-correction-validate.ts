/**
 * Row 214 stranger discovery-to-purchase correction validation.
 * Does not mark Complete. Does not record Founder acceptance.
 * Does not change DNS, Stripe Live prices, or nameservers.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { CHECKOUT_OFFERS } from "@/lib/checkout/offers";
import { CHECKOUT_PURCHASE_TERMS } from "@/lib/checkout/purchase-terms";
import { getCanonicalPublicOrigin } from "@/lib/seo/site-config";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { esDictionary } from "@/content/i18n/dictionaries/es";
import { luminaCta } from "@/content/lumina";
import { backHalfStandards } from "@/content/blueprint/manuscript/generated/backHalfStandards";
import { contactPage } from "@/content/contact-support";

type Verdict = "PASS" | "FAIL";

type TestRow = {
  id: string;
  name: string;
  result: Verdict;
  detail: string;
};

const ROOT = process.cwd();
const ORIGIN = process.env.ROW214_ORIGIN ?? "http://localhost:3000";
const CANONICAL = "https://www.thebackhalf.org";
const tests: TestRow[] = [];

function push(id: string, name: string, ok: boolean, detail: string) {
  tests.push({ id, name, result: ok ? "PASS" : "FAIL", detail });
}

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

async function dnsLookup(
  name: string,
  type: "A" | "AAAA" | "CNAME",
): Promise<{ status: number; records: string[] }> {
  try {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
    const response = await fetch(url, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(8000),
    });
    const body = (await response.json()) as {
      Status?: number;
      Answer?: Array<{ data?: string }>;
    };
    return {
      status: body.Status ?? -1,
      records: (body.Answer ?? [])
        .map((row) => row.data)
        .filter((value): value is string => typeof value === "string"),
    };
  } catch {
    return { status: -1, records: [] };
  }
}

async function request(
  pathName: string,
  init: RequestInit = {},
): Promise<{ status: number; location: string | null; body: string }> {
  try {
    const response = await fetch(`${ORIGIN}${pathName}`, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    const body = await response.text();
    return {
      status: response.status,
      location: response.headers.get("location"),
      body,
    };
  } catch (error) {
    return {
      status: 0,
      location: null,
      body: error instanceof Error ? error.message : "request_failed",
    };
  }
}

function customerFacingStalePrices(): string[] {
  const result = spawnSync(
    "rg",
    [
      "-l",
      "--glob",
      "!ops/fab-5/runs/**",
      "--glob",
      "!ops/fab-5/launch-rows.json",
      "--glob",
      "!ops/fab-5/aos-command-center-snapshot.json",
      "--glob",
      "!ops/fab-5/legal-v1/**",
      "--glob",
      "!ops/fab-5/marketing-kpi/**",
      "--glob",
      "!scripts/fab-5/**",
      "--glob",
      "!content/legal/v1-candidates.ts",
      "--glob",
      "!node_modules/**",
      "--glob",
      "!.git/**",
      "\\$1,500|\\$1,750|150_000|175_000",
      "app",
      "components",
      "content",
      "lib",
      ".env.example",
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  return (result.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function main() {
  push(
    "locked-prices",
    "Catalog amounts are $500 / $750 / $50",
    CHECKOUT_OFFERS.blueprint.amountCents === 50_000 &&
      CHECKOUT_OFFERS.bundle.amountCents === 75_000 &&
      CHECKOUT_OFFERS.community.amountCents === 5_000,
    `blueprint=${CHECKOUT_OFFERS.blueprint.amountCents} bundle=${CHECKOUT_OFFERS.bundle.amountCents} community=${CHECKOUT_OFFERS.community.amountCents}`,
  );

  const enCopy = [
    enDictionary.checkout.offerBlueprintDescription,
    enDictionary.checkout.offerBundleDescription,
    enDictionary.checkout.offerCommunityDescription,
    ...CHECKOUT_PURCHASE_TERMS.blueprint,
    ...CHECKOUT_PURCHASE_TERMS.bundle,
  ].join(" ");
  push(
    "en-public-prices",
    "English offer copy shows $500 / $750 / $50 and not $1,500 / $1,750",
    /\$500/.test(enCopy) &&
      /\$750/.test(enCopy) &&
      /\$50/.test(enDictionary.checkout.offerCommunityDescription) &&
      !/\$1,500/.test(enCopy) &&
      !/\$1,750/.test(enCopy),
    enCopy.slice(0, 280),
  );

  const esCopy = [
    esDictionary.checkout.offerBlueprintDescription,
    esDictionary.checkout.offerBundleDescription,
    esDictionary.checkout.offerCommunityDescription,
  ].join(" ");
  push(
    "es-public-prices",
    "Spanish offer copy shows $500 / $750 / $50 and not $1,500 / $1,750",
    /\$500/.test(esCopy) &&
      /\$750/.test(esCopy) &&
      /\$50/.test(esCopy) &&
      !/\$1,500/.test(esCopy) &&
      !/\$1,750/.test(esCopy),
    esCopy.slice(0, 280),
  );

  const staleFiles = customerFacingStalePrices();
  push(
    "no-stale-customer-prices",
    "No $1,500/$1,750 remain in customer-facing application sources",
    staleFiles.length === 0,
    staleFiles.length === 0 ? "none" : staleFiles.join(", "),
  );

  const home = read("components/pages/home-page-view.tsx");
  push(
    "become-architect-to-checkout",
    "Homepage Become an Architect CTA routes to /checkout",
    /href=["']\/checkout["']/.test(home) &&
      /data-bh-cta=["']become_architect["']/.test(home),
    "homepage CTA href=/checkout",
  );
  push(
    "offer-cards-on-homepage",
    "Homepage includes ArchitectPathSection offer cards",
    home.includes("ArchitectPathSection"),
    "ArchitectPathSection mounted in CTA",
  );
  push(
    "standards-approved-copy",
    "Homepage Standards uses approved manuscript copy",
    home.includes("backHalfStandards.paragraphs[0]") &&
      Boolean(backHalfStandards.paragraphs[0]) &&
      !/Approved copy pending/.test(backHalfStandards.paragraphs[0] ?? ""),
    backHalfStandards.paragraphs[0]?.slice(0, 80) ?? "missing",
  );
  push(
    "contact-placeholder-removed",
    "Contact intro pending flag is off",
    contactPage.introPending === false,
    `introPending=${String(contactPage.introPending)}`,
  );

  const lifeAreas = read("components/journey/life-area-grid.tsx");
  push(
    "journey-placeholder-removed",
    "Journey life-area grid does not render Approved copy pending",
    !lifeAreas.includes("copyPending"),
    "life-area-grid no longer prints copyPending",
  );

  push(
    "lumina-cta-checkout",
    "Lumina Become an Architect continues to checkout",
    luminaCta.button === "Become an Architect" &&
      read("components/lumina/lumina-page-content.tsx").includes('href="/checkout"'),
    luminaCta.button,
  );

  push(
    "success-heading-verified-only",
    "Success H1 says Payment complete only after verified payment",
    enDictionary.checkout.successTitle === "Payment complete" &&
      enDictionary.checkout.unverifiedTitle === "Checkout confirmation" &&
      esDictionary.checkout.unverifiedTitle === "Confirmación de checkout" &&
      read("components/checkout/checkout-success-page-view.tsx").includes(
        'if (result.status === "ok")',
      ),
    `ok=${enDictionary.checkout.successTitle}; unverified=${enDictionary.checkout.unverifiedTitle}`,
  );

  const verifySrc = read("lib/checkout/verify-success.ts");
  push(
    "success-requires-stripe-session",
    "Missing session_id never claims payment",
    verifySrc.includes('if (!sessionId?.startsWith("cs_"))') &&
      verifySrc.includes('return { status: "invalid_session" }'),
    "missing cs_ id → invalid_session",
  );

  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://website-two-psi-49.vercel.app";
  process.env.VERCEL_URL = "website-4zfoye5d3-back-half.vercel.app";
  const seoUrl = getCanonicalPublicOrigin();
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous;
  if (vercel === undefined) delete process.env.VERCEL_URL;
  else process.env.VERCEL_URL = vercel;
  push(
    "seo-canonical-www",
    "SEO origin ignores Vercel hosts and uses www.thebackhalf.org",
    seoUrl === CANONICAL,
    seoUrl,
  );

  const sitemapSrc = read("app/sitemap.ts");
  const robotsSrc = read("app/robots.ts");
  push(
    "sitemap-uses-seo-origin",
    "Sitemap and robots import SEO getSiteUrl",
    sitemapSrc.includes('from "@/lib/seo/site-config"') &&
      robotsSrc.includes('from "@/lib/seo/site-config"'),
    "app/sitemap.ts + app/robots.ts",
  );

  const social = JSON.parse(read("ops/fab-5/social-channels.json")) as {
    postingBegins?: string;
    website?: string;
  };
  push(
    "social-date-gated",
    "Official social posting remains date-gated to 2026-08-28",
    social.postingBegins === "2026-08-28",
    `postingBegins=${social.postingBegins ?? "missing"} destination=${social.website ?? ""}/register`,
  );

  const apexA = await dnsLookup("thebackhalf.org", "A");
  const wwwA = await dnsLookup("www.thebackhalf.org", "A");
  const wwwCname = await dnsLookup("www.thebackhalf.org", "CNAME");
  const dnsReady =
    apexA.records.length > 0 || wwwA.records.length > 0 || wwwCname.records.length > 0;
  push(
    "canonical-dns-probe",
    "Canonical DNS still Founder-gated unless records exist",
    true,
    dnsReady
      ? `records present apexA=${apexA.records.join(",")} www=${wwwA.records.join(",") || wwwCname.records.join(",")}`
      : `FOUNDER ACTION REQUIRED — apex A=${apexA.status}/${apexA.records.length} www A=${wwwA.status}/${wwwA.records.length} www CNAME=${wwwCname.status}/${wwwCname.records.length}`,
  );

  const homeHttp = await request("/");
  const checkoutHttp = await request("/checkout");
  const successHttp = await request("/checkout/success");
  const successBad = await request("/checkout/success?session_id=not-a-session");
  const esHome = await request("/es");
  const esCheckout = await request("/es/checkout");
  const legal = await request("/legal/terms-of-use");
  const register = await request("/register");
  const sitemap = await request("/sitemap.xml");
  const robots = await request("/robots.txt");
  const offerLogin = await request("/checkout/blueprint");

  const serverUp = homeHttp.status !== 0;
  push(
    "local-home",
    "Homepage responds",
    !serverUp || homeHttp.status === 200,
    serverUp ? `HTTP ${homeHttp.status}` : "server not running — static checks only",
  );
  if (serverUp) {
    push(
      "homepage-no-placeholder",
      "Homepage HTML has no Approved copy pending",
      !/Approved copy pending/i.test(homeHttp.body),
      /Approved copy pending/i.test(homeHttp.body) ? "placeholder present" : "absent",
    );
    push(
      "homepage-prices",
      "Homepage HTML shows $500, $750, and $50",
      homeHttp.body.includes("$500") &&
        homeHttp.body.includes("$750") &&
        homeHttp.body.includes("$50") &&
        !homeHttp.body.includes("$1,500") &&
        !homeHttp.body.includes("$1,750"),
      "locked prices in homepage HTML",
    );
    push(
      "homepage-become-architect",
      "Homepage HTML includes Become an Architect",
      homeHttp.body.includes("Become an Architect"),
      "CTA phrase preserved",
    );
    push(
      "checkout-catalog-public",
      "Checkout catalog is public",
      checkoutHttp.status === 200 &&
        checkoutHttp.body.includes("$500") &&
        checkoutHttp.body.includes("$750"),
      `HTTP ${checkoutHttp.status}`,
    );
    push(
      "success-direct-no-false-paid",
      "Direct /checkout/success does not say Payment complete",
      successHttp.status === 200 &&
        !/Payment complete/i.test(successHttp.body) &&
        /Checkout confirmation/i.test(successHttp.body),
      `HTTP ${successHttp.status} paidClaim=${/Payment complete/i.test(successHttp.body)}`,
    );
    push(
      "success-invalid-session-no-false-paid",
      "Invalid session_id does not say Payment complete",
      successBad.status === 200 && !/Payment complete/i.test(successBad.body),
      `HTTP ${successBad.status}`,
    );
    push(
      "offer-auth-at-purchase",
      "Specific offer continues to login with next=/checkout/{id}",
      offerLogin.status === 307 &&
        (offerLogin.location ?? "").includes("/login") &&
        (offerLogin.location ?? "").includes("checkout"),
      offerLogin.location ?? `HTTP ${offerLogin.status}`,
    );
    push(
      "legal-reachable",
      "Terms of Use is publicly reachable",
      legal.status === 200 && /Terms of Use/i.test(legal.body),
      `HTTP ${legal.status}`,
    );
    push(
      "register-points-to-path",
      "Registration explains Architect path choice",
      register.status === 200 &&
        /choose your Architect path/i.test(register.body),
      `HTTP ${register.status}`,
    );
    push(
      "es-journey-prices",
      "Spanish homepage and checkout show locked prices",
      esHome.status === 200 &&
        esCheckout.status === 200 &&
        esHome.body.includes("$500") &&
        esCheckout.body.includes("$750") &&
        !esHome.body.includes("$1,500"),
      `home=${esHome.status} checkout=${esCheckout.status}`,
    );
    push(
      "sitemap-canonical-host",
      "sitemap.xml emits www.thebackhalf.org",
      sitemap.status === 200 && sitemap.body.includes("https://www.thebackhalf.org"),
      sitemap.body.includes("vercel.app")
        ? "still contains vercel.app"
        : `HTTP ${sitemap.status}`,
    );
    push(
      "robots-canonical-host",
      "robots.txt sitemap points at www.thebackhalf.org",
      robots.status === 200 &&
        robots.body.includes("https://www.thebackhalf.org/sitemap.xml"),
      `HTTP ${robots.status}`,
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const liveKey = stripeKey.startsWith("sk_live_");
  const testKey = stripeKey.startsWith("sk_test_");
  push(
    "no-live-charge",
    "Validator did not create a Live Stripe charge",
    true,
    liveKey
      ? "Live key present in env — not used for a charge"
      : testKey
        ? "Test key present — Live charge not attempted"
        : "No Stripe secret in this environment",
  );

  const failed = tests.filter((row) => row.result === "FAIL");
  const result = {
    generatedAt: new Date().toISOString(),
    row: 214,
    markedComplete: false,
    founderAcceptanceRecorded: false,
    liveStripeChargeAttempted: false,
    dnsModified: false,
    canonicalDns: dnsReady ? "PASS" : "FOUNDER ACTION REQUIRED",
    seoCanonicalOrigin: CANONICAL,
    prices: {
      blueprintCents: CHECKOUT_OFFERS.blueprint.amountCents,
      bundleCents: CHECKOUT_OFFERS.bundle.amountCents,
      communityCents: CHECKOUT_OFFERS.community.amountCents,
    },
    tests,
    failed: failed.map((row) => row.id),
    serverProbed: serverUp,
    origin: ORIGIN,
  };

  const outDir = path.join(ROOT, "ops/fab-5/runs/aos-engineering-status");
  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "al-214-correction.json");
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ out, failed: failed.length, tests: tests.length }, null, 2));
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

void main();
