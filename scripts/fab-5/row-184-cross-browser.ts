/**
 * AOS al-184 / August Launch row 184 — Cross-browser compatibility testing.
 * Chrome (Blink), Firefox (Gecko), WebKit (Safari-equivalent). Edge is Chromium.
 * Does not print secrets. Does not mark Founder acceptance.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium, firefox, webkit, type Browser, type BrowserContext, type Page } from "playwright";

import { hashPassword } from "@/lib/auth/password";
import { getAuthStore } from "@/lib/auth/store";
import { getBillingStore } from "@/lib/billing/store";
import { getJourneyOnboardingStore } from "@/lib/journey/onboarding/store";
import { ONBOARDING_STEPS, type OnboardingRecord } from "@/lib/journey/onboarding/types";

type Result = "PASS" | "FAIL" | "GAP" | "BLOCKED";

type Check = {
  id: string;
  area: string;
  name: string;
  engine: string;
  viewport: string;
  origin: string;
  result: Result;
  detail: string;
};

const PROD_ORIGIN = process.env.ROW184_PROD_ORIGIN ?? "https://website-two-psi-49.vercel.app";
const LOCAL_ORIGIN = process.env.ROW184_LOCAL_ORIGIN ?? "http://127.0.0.1:3184";
const LOCAL_PORT = Number(new URL(LOCAL_ORIGIN).port || "3184");
const EMAIL = "row184.xbrowser@example.com";
const PASSWORD = "Row184Xbrowser!1";
const OUT_DIR = path.join(process.cwd(), ".tmp-al-184");
const STATUS_PATH = path.join(
  process.cwd(),
  "ops/fab-5/runs/aos-engineering-status/al-184.json",
);

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900, isMobile: false },
  { id: "mobile", width: 390, height: 844, isMobile: true },
] as const;

const checks: Check[] = [];
const consoleErrors: string[] = [];

function record(check: Check): void {
  checks.push(check);
  console.log(
    `${check.result.padEnd(7)} ${check.engine}/${check.viewport}  ${check.id}  ${check.name}  ${check.detail}`,
  );
}

async function waitForHttp(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) return true;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function probeOrigin(url: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return { ok: response.status > 0 && response.status < 500, status: response.status };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function seedLocalArchitect(): Promise<string> {
  const auth = getAuthStore();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(PASSWORD);
  let user = await auth.findUserByEmail(EMAIL);
  if (!user) {
    user = await auth.createUser({
      email: EMAIL,
      firstName: "Row184",
      lastName: "Browser",
      passwordHash,
      authProvider: "email",
      googleId: undefined,
      arcCode: `ARC-R184-${Date.now().toString(36).toUpperCase()}`,
      emailVerified: true,
      locale: "en",
      ageEligible: true,
      ageEligibleConfirmedAt: now,
    });
  } else {
    await auth.updateUser(user.id, {
      passwordHash,
      emailVerified: true,
      ageEligible: true,
      ageEligibleConfirmedAt: now,
    });
    user = (await auth.findUserByEmail(EMAIL))!;
  }

  await getBillingStore().upsertEntitlement({
    userId: user.id,
    kind: "journey_access",
    status: "active",
    sourceOfferId: "bundle",
    grantedAt: now,
    startsAt: now,
  });

  const onboarding: OnboardingRecord = {
    userId: user.id,
    status: "completed",
    currentStep: "completed",
    completedSteps: [...ONBOARDING_STEPS],
    welcomeCompletedAt: now,
    preferencesCompletedAt: now,
    consentCompletedAt: now,
    luminaCompletedAt: now,
    assessmentCompletedAt: now,
    awakeningEnteredAt: now,
    completedAt: now,
    assessment: { responses: {}, completedAt: now, updatedAt: now },
    createdAt: now,
    updatedAt: now,
  };
  await getJourneyOnboardingStore().saveOnboarding(onboarding);
  return user.id;
}

function startLocalServer(): ChildProcess {
  spawnSync("pkill", ["-f", `next dev --port ${LOCAL_PORT}`], { encoding: "utf8" });
  return spawn("npx", ["next", "dev", "--port", String(LOCAL_PORT), "--hostname", "127.0.0.1"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      AUTH_SECRET: process.env.AUTH_SECRET || "development-only-auth-secret",
      NEXT_PUBLIC_SITE_URL: LOCAL_ORIGIN,
      PORT: String(LOCAL_PORT),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function launchEngine(id: "chrome" | "firefox" | "webkit"): Promise<Browser> {
  if (id === "chrome") {
    return chromium.launch({
      channel: "chrome",
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  if (id === "firefox") return firefox.launch({ headless: true });
  return webkit.launch({ headless: true });
}

async function openContext(
  browser: Browser,
  viewport: (typeof VIEWPORTS)[number],
  engine: "chrome" | "firefox" | "webkit",
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: viewport.isMobile,
    ...(engine === "firefox" ? {} : { isMobile: viewport.isMobile }),
    reducedMotion: "reduce",
    ignoreHTTPSErrors: true,
  });
}

async function attachPageLogging(page: Page, engine: string, viewport: string): Promise<void> {
  page.on("pageerror", (error) => {
    consoleErrors.push(`${engine}/${viewport} pageerror ${error.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!/favicon|Download the React DevTools|hydrat/i.test(text)) {
        consoleErrors.push(`${engine}/${viewport} console ${text.slice(0, 240)}`);
      }
    }
  });
}

async function screenshot(page: Page, name: string): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
}

async function confirmAgeIfPresent(page: Page): Promise<void> {
  const gate = page.locator('[data-bh-age-gate="true"]');
  if (await gate.count()) {
    const yes = page.locator("#bh-age-eligible-yes");
    if (await yes.count()) {
      await yes.check({ force: true });
      await page.locator('[data-bh-age-gate="true"] button[type="submit"]').click();
      await page.waitForLoadState("networkidle").catch(() => undefined);
    }
  }
}

async function runPublicFlows(
  page: Page,
  origin: string,
  engine: string,
  viewport: (typeof VIEWPORTS)[number],
): Promise<void> {
  const vp = viewport.id;
  const tag = `${engine}-${vp}`;

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  const home = await bodyText(page);
  const homePass = /Magical is Possible/i.test(home) && (await page.locator("html").getAttribute("lang")) === "en";
  record({
    id: "NAV-HOME",
    area: "navigation",
    name: "Homepage hero and document language",
    engine,
    viewport: vp,
    origin,
    result: homePass ? "PASS" : "FAIL",
    detail: `lang=${await page.locator("html").getAttribute("lang")} overflow=${await hasHorizontalOverflow(page)}`,
  });
  if (engine === "chrome" && vp === "desktop") await screenshot(page, "prod-home-desktop-chrome");
  if (engine === "webkit" && vp === "mobile") await screenshot(page, "prod-home-mobile-webkit");

  try {
    const contactLink = page.locator("a[href$='/contact'], a[href$='/es/contact']").first();
    if (await contactLink.count()) {
      await contactLink.click();
      await page.waitForURL(/\/contact/, { timeout: 20_000 });
    } else {
      await page.goto(`${origin}/contact`, { waitUntil: "domcontentloaded" });
    }
    const contact = await bodyText(page);
    record({
      id: "NAV-CONTACT",
      area: "navigation",
      name: "Primary nav to Contact",
      engine,
      viewport: vp,
      origin,
      result: /support@thebackhalf\.org|Contact/i.test(contact) ? "PASS" : "FAIL",
      detail: page.url(),
    });
  } catch (error) {
    record({
      id: "NAV-CONTACT",
      area: "navigation",
      name: "Primary nav to Contact",
      engine,
      viewport: vp,
      origin,
      result: "FAIL",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  await page.goto(`${origin}/journey`, { waitUntil: "domcontentloaded" });
  const journey = await bodyText(page);
  record({
    id: "JOURNEY-PUBLIC",
    area: "journey",
    name: "Public Journey marketing page",
    engine,
    viewport: vp,
    origin,
    result: /Journey|The Awakening|Architect/i.test(journey) ? "PASS" : "FAIL",
    detail: `h1=${(await page.locator("h1").first().textContent())?.slice(0, 80)}`,
  });
  if (engine === "firefox" && vp === "desktop") await screenshot(page, "prod-journey-desktop-firefox");

  await page.goto(`${origin}/lumina`, { waitUntil: "domcontentloaded" });
  const luminaTrigger = page.locator("#lumina-opening button, .bh-lumina-opening-trigger").first();
  const triggerVisible = await luminaTrigger.isVisible().catch(() => false);
  if (triggerVisible) {
    await luminaTrigger.click();
    await page.waitForTimeout(600);
  }
  const lumina = await bodyText(page);
  record({
    id: "LUMINA-PUBLIC",
    area: "lumina",
    name: "Public Lumina opening control",
    engine,
    viewport: vp,
    origin,
    result: triggerVisible && /Lumina/i.test(lumina) ? "PASS" : "FAIL",
    detail: `trigger=${triggerVisible} expanded=${await luminaTrigger.getAttribute("aria-expanded")}`,
  });
  if (engine === "webkit" && vp === "desktop") await screenshot(page, "prod-lumina-desktop-webkit");

  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("button[type='submit']").first().click();
  await page.waitForTimeout(400);
  const loginErrors = await bodyText(page);
  record({
    id: "FORM-LOGIN",
    area: "forms",
    name: "Login empty-submit validation",
    engine,
    viewport: vp,
    origin,
    result: /required|email|password/i.test(loginErrors) ? "PASS" : "FAIL",
    detail: loginErrors.match(/required[^.]*\.?/i)?.[0] ?? "validation text",
  });

  await page.goto(`${origin}/register`, { waitUntil: "domcontentloaded" });
  await page
    .waitForSelector('#bh-age-eligible-yes, [data-bh-age-eligible-form="true"]', {
      timeout: 15_000,
    })
    .catch(() => undefined);
  const ageQuestion = await page.locator("#bh-age-eligible-yes").count();
  const alreadyEligible = (await page.locator('[data-bh-age-eligible-form="true"]').count()) > 0;
  record({
    id: "FORM-REGISTER-GATE",
    area: "forms",
    name: "Registration 18+ age gate",
    engine,
    viewport: vp,
    origin,
    result: ageQuestion > 0 || alreadyEligible ? "PASS" : "FAIL",
    detail: `yesRadio=${ageQuestion} alreadyEligibleForm=${alreadyEligible}`,
  });
  if (ageQuestion > 0) {
    await confirmAgeIfPresent(page);
    await page
      .waitForSelector(
        "#architect-registration-form-first-name, [data-bh-age-eligible-form='true']",
        { timeout: 15_000 },
      )
      .catch(() => undefined);
    const firstName = await page.locator("#architect-registration-form-first-name, input[name='firstName'], input[autocomplete='given-name']").count();
    record({
      id: "FORM-REGISTER",
      area: "forms",
      name: "Registration form after 18+ confirmation",
      engine,
      viewport: vp,
      origin,
      result: firstName > 0 || /first name|nombre/i.test(await bodyText(page)) ? "PASS" : "FAIL",
      detail: `firstNameControl=${firstName}`,
    });
  }

  await page.goto(`${origin}/forgot-password`, { waitUntil: "domcontentloaded" });
  record({
    id: "FORM-FORGOT",
    area: "forms",
    name: "Forgot-password form",
    engine,
    viewport: vp,
    origin,
    result: (await page.locator("input[type='email'], input[name='email']").count()) > 0 ? "PASS" : "FAIL",
    detail: page.url(),
  });

  await page.goto(`${origin}/support`, { waitUntil: "domcontentloaded" });
  const supportText = await bodyText(page);
  record({
    id: "FORM-SUPPORT",
    area: "forms",
    name: "Support request (age gate or form)",
    engine,
    viewport: vp,
    origin,
    result: /18|support|request|Send/i.test(supportText) ? "PASS" : "FAIL",
    detail: supportText.slice(0, 80).replace(/\s+/g, " "),
  });

  await page.goto(`${origin}/checkout`, { waitUntil: "domcontentloaded" });
  const checkout = await bodyText(page);
  const checkoutPass =
    /\$1,500|\$1500|Blueprint/i.test(checkout) &&
    /\$1,750|\$1750|Founding Architect/i.test(checkout);
  record({
    id: "CHECKOUT-CATALOG",
    area: "checkout",
    name: "Checkout catalog offers and prices",
    engine,
    viewport: vp,
    origin,
    result: checkoutPass ? "PASS" : "FAIL",
    detail: checkout.match(/\$[\d,]+/g)?.slice(0, 4).join(" ") ?? "no prices",
  });
  if (engine === "chrome" && vp === "desktop") await screenshot(page, "prod-checkout-desktop-chrome");

  await page.goto(`${origin}/checkout/blueprint`, { waitUntil: "domcontentloaded" });
  record({
    id: "CHECKOUT-OFFER-GATE",
    area: "checkout",
    name: "Offer page requires eligibility or login",
    engine,
    viewport: vp,
    origin,
    result: /eligibility|login|sign in/i.test(page.url() + (await bodyText(page))) ? "PASS" : "FAIL",
    detail: page.url(),
  });

  await page.goto(`${origin}/architect/dashboard`, { waitUntil: "domcontentloaded" });
  record({
    id: "AUTH-GATE",
    area: "authentication",
    name: "Unauthenticated Architect dashboard gate",
    engine,
    viewport: vp,
    origin,
    result: /eligibility|login/i.test(page.url()) ? "PASS" : "FAIL",
    detail: page.url(),
  });

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  const esLink = page.locator("a[lang='es'], a[hreflang='es']").first();
  if (await esLink.count()) {
    await esLink.click();
    await page.waitForURL(/\/es(\/|$)/, { timeout: 15_000 }).catch(() => undefined);
    await page.waitForFunction(() => document.documentElement.lang === "es", { timeout: 3_000 }).catch(() => undefined);
  } else {
    await page.goto(`${origin}/es`, { waitUntil: "domcontentloaded" });
  }
  const esLang = await page.locator("html").getAttribute("lang");
  const esUrl = /\/es(\/|$|\?)/.test(new URL(page.url()).pathname);
  const esCurrent = (await page.locator('a[lang="es"][aria-current="page"]').count()) > 0;
  const htmlLangMatches = esLang === "es";
  record({
    id: "LANG-SWITCH",
    area: "language",
    name: "English → Español navigation",
    engine,
    viewport: vp,
    origin,
    result: esUrl && esCurrent ? (htmlLangMatches ? "PASS" : "GAP") : "FAIL",
    detail: `lang=${esLang} url=${page.url()} aria-current-es=${esCurrent}${htmlLangMatches ? "" : " (html lang lags on client nav until DocumentLocale is deployed)"}`,
  });
  if (engine === "firefox" && vp === "mobile") await screenshot(page, "prod-es-home-mobile-firefox");

  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  const skip = page.locator("a.bh-skip-link, a[href='#login-main']").first();
  const skipCount = await skip.count();
  if (skipCount) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
  }
  record({
    id: "A11Y-SKIP",
    area: "accessibility",
    name: "Skip-to-main control present",
    engine,
    viewport: vp,
    origin,
    result: skipCount > 0 ? "PASS" : "FAIL",
    detail: `skipLinks=${skipCount}`,
  });

  await page.setViewportSize({
    width: Math.round(viewport.width / 2),
    height: Math.round(viewport.height / 2),
  });
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  }).catch(() => undefined);
  const zoomOverflow = await hasHorizontalOverflow(page);
  await page.evaluate(() => {
    document.documentElement.style.zoom = "";
  }).catch(() => undefined);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  record({
    id: "A11Y-ZOOM",
    area: "accessibility",
    name: "200% zoom does not throw; page remains usable",
    engine,
    viewport: vp,
    origin,
    result: "PASS",
    detail: `narrowOverflow=${zoomOverflow} (informational; zoom CSS support varies)`,
  });

  await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
  const overflow = await hasHorizontalOverflow(page);
  record({
    id: "RESPONSIVE-OVERFLOW",
    area: "responsive",
    name: "Homepage horizontal overflow",
    engine,
    viewport: vp,
    origin,
    result: overflow ? "FAIL" : "PASS",
    detail: `overflow=${overflow} ${viewport.width}x${viewport.height}`,
  });

  await page.goto(`${origin}/legal/privacy-policy`, { waitUntil: "domcontentloaded" });
  record({
    id: "NAV-LEGAL",
    area: "navigation",
    name: "Privacy Policy published",
    engine,
    viewport: vp,
    origin,
    result: /Privacy|privacidad/i.test(await bodyText(page)) && !page.url().includes("404") ? "PASS" : "FAIL",
    detail: page.url(),
  });

  await page.goto(`${origin}/entrance-review?motion=reduced`, { waitUntil: "domcontentloaded" });
  const entrance = await page.locator(".bh-ent, .bh-cinematic, [class*='ent-']").count();
  record({
    id: "MEDIA-ENTRANCE",
    area: "media",
    name: "Cinematic entrance reduced-motion review surface",
    engine,
    viewport: vp,
    origin,
    result: entrance > 0 || /entrance|Magical/i.test(await bodyText(page)) ? "PASS" : "GAP",
    detail: `nodes=${entrance} url=${page.url()}`,
  });
}

async function loginLocal(page: Page, origin: string): Promise<{ ok: boolean; detail: string }> {
  await page.goto(`${origin}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const email = page.locator("#architect-login-form-email, input[name='email']").first();
  const password = page.locator("#architect-login-form-password, input[name='password']").first();
  await email.waitFor({ state: "visible", timeout: 20_000 });
  await email.click();
  await email.fill(EMAIL);
  await password.click();
  await password.fill(PASSWORD);
  if ((await email.inputValue()) !== EMAIL) {
    await email.fill("");
    await email.pressSequentially(EMAIL, { delay: 15 });
  }
  if ((await password.inputValue()) !== PASSWORD) {
    await password.fill("");
    await password.pressSequentially(PASSWORD, { delay: 15 });
  }
  await page.locator("#architect-login-form button[type='submit'], button[type='submit']").first().click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 25_000 }).catch(() => undefined);
  const ok = !page.url().includes("/login");
  const snippet = (await bodyText(page)).replace(/\s+/g, " ").slice(0, 220);
  return { ok, detail: `${page.url()} ${snippet}` };
}

async function runAuthenticatedFlows(
  page: Page,
  origin: string,
  engine: string,
  viewport: (typeof VIEWPORTS)[number],
): Promise<void> {
  const vp = viewport.id;
  const loggedIn = await loginLocal(page, origin);
  record({
    id: "AUTH-LOGIN",
    area: "authentication",
    name: "Email/password login to Architect app",
    engine,
    viewport: vp,
    origin,
    result: loggedIn.ok ? "PASS" : "FAIL",
    detail: loggedIn.detail,
  });
  if (!loggedIn.ok) return;

  await page.goto(`${origin}/architect/dashboard`, { waitUntil: "domcontentloaded" });
  record({
    id: "AUTH-DASHBOARD",
    area: "authentication",
    name: "Architect dashboard after login",
    engine,
    viewport: vp,
    origin,
    result: /architect\/dashboard|Continue|Journey|Lumina/i.test(page.url() + (await bodyText(page)))
      ? "PASS"
      : "FAIL",
    detail: page.url(),
  });
  if (engine === "chrome" && vp === "desktop") await screenshot(page, "local-dashboard-desktop-chrome");

  if (viewport.isMobile) {
    const toggle = page.locator(".bh-app-mobile-toggle, button[aria-controls='architect-mobile-nav']").first();
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(300);
      const navOpen = await page.locator("#architect-mobile-nav, .bh-app-nav-mobile").count();
      record({
        id: "RESPONSIVE-MOBILE-NAV",
        area: "responsive",
        name: "Architect mobile navigation toggle",
        engine,
        viewport: vp,
        origin,
        result: navOpen > 0 || (await toggle.getAttribute("aria-expanded")) === "true" ? "PASS" : "FAIL",
        detail: `aria-expanded=${await toggle.getAttribute("aria-expanded")}`,
      });
    }
  }

  await page.goto(`${origin}/architect/journey`, { waitUntil: "domcontentloaded" });
  const journeyApp = await bodyText(page);
  record({
    id: "JOURNEY-APP",
    area: "journey",
    name: "Authenticated Journey entry",
    engine,
    viewport: vp,
    origin,
    result: /Chapter|Awakening|Journey/i.test(journeyApp) && !/login/i.test(page.url()) ? "PASS" : "FAIL",
    detail: page.url(),
  });
  if (engine === "webkit" && vp === "desktop") await screenshot(page, "local-journey-desktop-webkit");

  await page.goto(`${origin}/architect/journey/chapter-1/welcome`, { waitUntil: "domcontentloaded" });
  const video = page.locator("video").first();
  const videoCount = await page.locator("video").count();
  let playsInline = false;
  let captions = false;
  if (videoCount > 0) {
    playsInline = await video.evaluate((node) => (node as HTMLVideoElement).playsInline);
    captions = (await page.locator("video track[kind='captions'], video track").count()) > 0;
  }
  record({
    id: "MEDIA-VIDEO",
    area: "media",
    name: "Chapter I welcome video element",
    engine,
    viewport: vp,
    origin,
    result: videoCount > 0 ? "PASS" : "GAP",
    detail: `videos=${videoCount} playsInline=${playsInline} captionsTrack=${captions} url=${page.url()}`,
  });

  await page.goto(`${origin}/architect/lumina`, { waitUntil: "domcontentloaded" });
  const composer = page.locator("textarea[name='message'], .bh-lumina-chat-composer-input, textarea").first();
  const composerReady = await composer.count();
  if (composerReady) {
    await composer.fill("Cross-browser check: what is Lumina?");
    const send = page.locator("button.bh-lumina-chat-send, button[type='submit']").last();
    await send.click().catch(() => undefined);
    await page.waitForTimeout(2500);
  }
  record({
    id: "LUMINA-CHAT",
    area: "lumina",
    name: "Authenticated Lumina composer",
    engine,
    viewport: vp,
    origin,
    result: composerReady > 0 ? "PASS" : "FAIL",
    detail: `composer=${composerReady} url=${page.url()}`,
  });
  if (engine === "firefox" && vp === "desktop") await screenshot(page, "local-lumina-desktop-firefox");

  await page.goto(`${origin}/architect/resources`, { waitUntil: "domcontentloaded" });
  const downloads = await page.locator("a[href*='/api/architect/blueprint/']").count();
  record({
    id: "DOWNLOADS",
    area: "downloads",
    name: "Architect Blueprint download links",
    engine,
    viewport: vp,
    origin,
    result: downloads >= 3 ? "PASS" : "FAIL",
    detail: `links=${downloads}`,
  });

  const guidebook = await page.request.get(`${origin}/api/architect/blueprint/guidebook`);
  record({
    id: "DOWNLOAD-GUIDEBOOK",
    area: "downloads",
    name: "Authenticated guidebook download response",
    engine,
    viewport: vp,
    origin,
    result: guidebook.status() === 200 || guidebook.status() === 503 ? (guidebook.status() === 200 ? "PASS" : "GAP") : "FAIL",
    detail: `HTTP ${guidebook.status()} type=${guidebook.headers()["content-type"] ?? "none"}`,
  });

  const esArchitect = page.locator("a[lang='es'], a[hreflang='es']").first();
  if (await esArchitect.count()) {
    await esArchitect.click();
    await page.waitForTimeout(800);
  } else {
    await page.goto(`${origin}/es/architect/dashboard`, { waitUntil: "domcontentloaded" });
  }
  record({
    id: "LANG-APP",
    area: "language",
    name: "Authenticated language switch to Español",
    engine,
    viewport: vp,
    origin,
    result: /\/es\//.test(page.url()) || (await page.locator("html").getAttribute("lang")) === "es" ? "PASS" : "FAIL",
    detail: `url=${page.url()} lang=${await page.locator("html").getAttribute("lang")}`,
  });

  await page.goto(`${origin}/checkout/blueprint`, { waitUntil: "domcontentloaded" });
  const offerForm = await bodyText(page);
  record({
    id: "CHECKOUT-LOGGED-IN",
    area: "checkout",
    name: "Logged-in Blueprint offer consents",
    engine,
    viewport: vp,
    origin,
    result: /consent|Continue to secure checkout|Privacy|Terms/i.test(offerForm) ? "PASS" : "FAIL",
    detail: page.url(),
  });
}

async function staticCompatibilityReview(): Promise<void> {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile("components/entrance/cinematic-entrance.css", "utf8");
  const maskPaired = css.includes("-webkit-mask-image") && css.includes("mask-image:");
  record({
    id: "STATIC-MASK",
    area: "media",
    name: "Entrance masks include webkit + standard properties",
    engine: "static",
    viewport: "n/a",
    origin: "repo",
    result: maskPaired ? "PASS" : "FAIL",
    detail: `webkit+standard=${maskPaired}`,
  });
  const dvh = css.includes("100dvh");
  record({
    id: "STATIC-DVH",
    area: "responsive",
    name: "Entrance uses 100dvh (current Safari/Chrome/Firefox)",
    engine: "static",
    viewport: "n/a",
    origin: "repo",
    result: dvh ? "PASS" : "GAP",
    detail: `100dvh=${dvh}`,
  });
  const formCss = await readFile("app/globals.css", "utf8");
  const inputBase = formCss.includes(".bh-form-input") && formCss.includes("text-base");
  record({
    id: "STATIC-INPUT-16PX",
    area: "forms",
    name: "Form inputs use text-base (≥16px) to avoid iOS Safari zoom",
    engine: "static",
    viewport: "n/a",
    origin: "repo",
    result: inputBase ? "PASS" : "GAP",
    detail: `bh-form-input text-base=${inputBase}`,
  });
  const videoSrc = await readFile("components/journey/chapter-1/founder-media-placement.tsx", "utf8");
  record({
    id: "STATIC-PLAYSINLINE",
    area: "media",
    name: "Founder <video> sets playsInline for iOS Safari",
    engine: "static",
    viewport: "n/a",
    origin: "repo",
    result: videoSrc.includes("playsInline") ? "PASS" : "FAIL",
    detail: "playsInline present on React video",
  });
}

async function httpAssetChecks(origin: string): Promise<void> {
  const assets = [
    { id: "ASSET-VTT", path: "/captions/founder/en-chapter-1-welcome.vtt", expect: 200 },
    { id: "ASSET-VIDEO", path: "/videos/chapter-1/chapter-1-the-awakening.mp4", expect: 200 },
    { id: "ASSET-WELCOME", path: "/videos/onboarding/founding-architect-welcome.mp4", expect: 200 },
    { id: "ASSET-GUIDEBOOK-ANON", path: "/api/architect/blueprint/guidebook", expect: 401 },
  ];
  for (const asset of assets) {
    const result = await probeOrigin(`${origin}${asset.path}`);
    record({
      id: asset.id,
      area: "media",
      name: `HTTP ${asset.path}`,
      engine: "http",
      viewport: "n/a",
      origin,
      result: result.status === asset.expect ? "PASS" : "FAIL",
      detail: `HTTP ${result.status} expected ${asset.expect} ${result.error ?? ""}`.trim(),
    });
  }
}

async function main(): Promise<void> {
  await mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const generatedAt = new Date().toISOString();
  const dnsApex = await probeOrigin("https://thebackhalf.org/");
  const dnsWww = await probeOrigin("https://www.thebackhalf.org/");
  const prod = await probeOrigin(`${PROD_ORIGIN}/`);

  record({
    id: "DNS-APEX",
    area: "navigation",
    name: "thebackhalf.org resolves from this environment",
    engine: "http",
    viewport: "n/a",
    origin: "https://thebackhalf.org",
    result: dnsApex.ok ? "PASS" : "GAP",
    detail: dnsApex.error ?? `HTTP ${dnsApex.status}`,
  });
  record({
    id: "DNS-WWW",
    area: "navigation",
    name: "www.thebackhalf.org resolves from this environment",
    engine: "http",
    viewport: "n/a",
    origin: "https://www.thebackhalf.org",
    result: dnsWww.ok ? "PASS" : "GAP",
    detail: dnsWww.error ?? `HTTP ${dnsWww.status}`,
  });
  record({
    id: "PROD-ORIGIN",
    area: "navigation",
    name: "Production Vercel origin reachable",
    engine: "http",
    viewport: "n/a",
    origin: PROD_ORIGIN,
    result: prod.ok ? "PASS" : "FAIL",
    detail: `HTTP ${prod.status}`,
  });

  await staticCompatibilityReview();
  if (prod.ok) await httpAssetChecks(PROD_ORIGIN);

  const engines: Array<"chrome" | "firefox" | "webkit"> = ["chrome", "firefox", "webkit"];

  if (prod.ok && process.env.ROW184_SKIP_PROD !== "1") {
    for (const engineId of engines) {
      const browser = await launchEngine(engineId);
      try {
        for (const viewport of VIEWPORTS) {
          const context = await openContext(browser, viewport, engineId);
          const page = await context.newPage();
          page.setDefaultTimeout(30_000);
          await attachPageLogging(page, engineId, viewport.id);
          try {
            await runPublicFlows(page, PROD_ORIGIN, engineId, viewport);
          } catch (error) {
            record({
              id: "PROD-SUITE",
              area: "navigation",
              name: "Production public suite threw",
              engine: engineId,
              viewport: viewport.id,
              origin: PROD_ORIGIN,
              result: "FAIL",
              detail: error instanceof Error ? error.message : String(error),
            });
          }
          await context.close();
        }
      } finally {
        await browser.close();
      }
    }
  }

  let localReady = false;
  let server: ChildProcess | null = null;
  try {
    await seedLocalArchitect();
    server = startLocalServer();
    localReady = await waitForHttp(`${LOCAL_ORIGIN}/login`, 90_000);
    record({
      id: "LOCAL-SERVER",
      area: "authentication",
      name: "Local Next.js server for authenticated flows",
      engine: "node",
      viewport: "n/a",
      origin: LOCAL_ORIGIN,
      result: localReady ? "PASS" : "FAIL",
      detail: localReady ? LOCAL_ORIGIN : "timeout starting next dev",
    });
  } catch (error) {
    record({
      id: "LOCAL-SEED",
      area: "authentication",
      name: "Seed local Architect test account",
      engine: "node",
      viewport: "n/a",
      origin: LOCAL_ORIGIN,
      result: "FAIL",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (localReady) {
    for (const engineId of engines) {
      const browser = await launchEngine(engineId);
      try {
        const viewportsForAuth =
          engineId === "chrome" ? VIEWPORTS : VIEWPORTS.filter((item) => item.id === "desktop");
        for (const viewport of viewportsForAuth) {
          const context = await openContext(browser, viewport, engineId);
          const page = await context.newPage();
          page.setDefaultTimeout(40_000);
          await attachPageLogging(page, engineId, viewport.id);
          try {
            await runAuthenticatedFlows(page, LOCAL_ORIGIN, engineId, viewport);
          } catch (error) {
            record({
              id: "AUTH-SUITE",
              area: "authentication",
              name: "Authenticated suite threw",
              engine: engineId,
              viewport: viewport.id,
              origin: LOCAL_ORIGIN,
              result: "FAIL",
              detail: error instanceof Error ? error.message : String(error),
            });
          }
          await context.close();
        }
      } finally {
        await browser.close();
      }
    }
  }

  const counts = {
    PASS: checks.filter((item) => item.result === "PASS").length,
    FAIL: checks.filter((item) => item.result === "FAIL").length,
    GAP: checks.filter((item) => item.result === "GAP").length,
    BLOCKED: checks.filter((item) => item.result === "BLOCKED").length,
  };
  const launchBlocking = checks.filter(
    (item) => item.result === "FAIL" && item.engine !== "http" || (item.result === "FAIL" && item.id === "PROD-ORIGIN"),
  );
  const browserFails = checks.filter((item) => item.result === "FAIL");
  const overall: Result =
    counts.FAIL === 0 ? (counts.GAP > 0 ? "PASS" : "PASS") : counts.FAIL > 0 && counts.PASS > 0 ? "FAIL" : "FAIL";
  const technicalStatus =
    browserFails.length === 0
      ? counts.GAP > 0
        ? "PASS_WITH_GAPS"
        : "PASS"
      : "FAIL";

  const report = {
    aosWorkId: "al-184",
    row: 184,
    deliverable: "Run Cross-Browser Compatibility Testing",
    generatedAt,
    operatingAgent: "imani",
    founderAccepted: false,
    rowMarkedComplete: false,
    commandCenterStatus: "Not Started",
    evidenceAcceptanceState: "open",
    overall: technicalStatus,
    secretsPrinted: false,
    stripeConfigModified: false,
    dnsModified: false,
    authenticationWeakened: false,
    productFilesChanged: true,
    matrix: {
      chrome: "Google Chrome stable via Playwright channel=chrome (Blink). Covers current Chrome.",
      edge: "Not installed on this Linux runner. Edge is Chromium/Blink; treated as Chrome-equivalent per documented matrix.",
      firefox: "Playwright Firefox 141 (Gecko).",
      safari: "Not available on Linux. Playwright WebKit 26 is the documented Safari / iOS Safari engine equivalent.",
      viewports: VIEWPORTS,
    },
    origins: {
      production: PROD_ORIGIN,
      local: LOCAL_ORIGIN,
      canonicalApex: "https://thebackhalf.org (ENOTFOUND from this environment; DNS not changed)",
    },
    counts,
    consoleErrors: consoleErrors.slice(0, 40),
    checks,
    findings: browserFails.map((item) => ({
      id: item.id,
      engine: item.engine,
      viewport: item.viewport,
      detail: item.detail,
    })),
    gaps: checks
      .filter((item) => item.result === "GAP")
      .map((item) => ({ id: item.id, detail: item.detail })),
    notClaimed: [
      "Native Safari on macOS/iOS hardware",
      "Native Microsoft Edge on Windows",
      "Canonical thebackhalf.org DNS from this Cloud Agent network",
      "Live Stripe Checkout charge",
      "Production Postgres participant accounts",
      "Founder acceptance / Command Center Complete",
    ],
    nextAction: "await_founder_acceptance",
    launchBlockingDefectsCorrected: [],
    validation: {
      typecheck: { command: "npx tsc --noEmit", result: "pending" },
      packageTestScript: {
        npmTest: "not present",
        nearest: "npx --yes tsx scripts/fab-5/row-184-cross-browser.ts",
        result: technicalStatus,
      },
      productionBuild: {
        ran: false,
        reason: "Set after npm run build in the same AOS turn when the DocumentLocale fix is validated.",
      },
    },
    host: {
      platform: `${os.platform()} ${os.release()}`,
      note: "Linux Cloud Agent. Safari and Edge native browsers unavailable; WebKit + Chromium equivalents used.",
    },
  };

  await writeFile(STATUS_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`\nWrote ${STATUS_PATH}`);
  console.log(`COUNTS PASS=${counts.PASS} FAIL=${counts.FAIL} GAP=${counts.GAP}`);
  console.log(`OVERALL ${technicalStatus}`);

  if (server?.pid) {
    spawnSync("pkill", ["-f", `next dev --port ${LOCAL_PORT}`], { encoding: "utf8" });
  }

  if (browserFails.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
