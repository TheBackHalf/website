/**
 * Live Row 209 access + browser checks against a running Next app.
 * Uses existing /ops/admin middleware. Does not weaken auth. Does not mutate Stripe.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { createSessionToken } from "@/lib/auth/session";
import type { UserRecord } from "@/lib/auth/types";
import { launchPdfBrowser } from "@/lib/blueprint/launch-pdf-browser";
import { EXECUTIVE_PANEL_IDS } from "@/lib/executive-dashboard/types";

export type LiveTest = { id: string; name: string; result: "PASS" | "FAIL"; detail: string };

function fakeUser(role: UserRecord["role"]): UserRecord {
  const now = new Date().toISOString();
  return {
    id: `row209-test-${role}`,
    email: `row209-${role}@test.invalid`,
    firstName: "Row209",
    lastName: role,
    authProvider: "email",
    arcCode: `R209${role.slice(0, 3).toUpperCase()}`,
    emailVerified: true,
    locale: "en",
    role,
    ageEligible: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function cookieFor(role: UserRecord["role"]): Promise<string> {
  const token = await createSessionToken(fakeUser(role));
  return `${AUTH_COOKIE_NAME}=${token}`;
}

async function request(
  origin: string,
  pathName: string,
  init: RequestInit = {},
): Promise<{ status: number; location: string | null; body: string }> {
  const response = await fetch(`${origin}${pathName}`, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(120_000),
  });
  const body = await response.text();
  return {
    status: response.status,
    location: response.headers.get("location"),
    body,
  };
}

function redirectedTo(result: { status: number; location: string | null }, fragment: string): boolean {
  if (result.status !== 307 && result.status !== 302 && result.status !== 303) return false;
  return (result.location ?? "").includes(fragment);
}

function hasFalseGreen(html: string): boolean {
  return (
    /data-panel-status="GREEN"[^>]*data-panel-telemetry="unconfirmed"/.test(html) ||
    /data-panel-telemetry="unconfirmed"[^>]*data-panel-status="GREEN"/.test(html)
  );
}

function allPanelsPresent(html: string): boolean {
  return EXECUTIVE_PANEL_IDS.every((id) => html.includes(`data-panel-id="${id}"`));
}

async function waitForOrigin(origin: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(origin, {
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
      });
      if (response.status > 0) return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function startDevServer(port: string): Promise<{ origin: string; stop: () => void }> {
  const origin = `http://127.0.0.1:${port}`;
  if (await waitForOrigin(origin, 2000)) {
    return { origin, stop: () => undefined };
  }
  const child: ChildProcess = spawn(
    "npx",
    ["next", "dev", "--port", port, "--hostname", "127.0.0.1"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: "development",
        PORT: port,
        MARKETING_KPI_DB_FILE: "",
        LAUNCH_DASHBOARD_DB_FILE: "",
        ANALYTICS_DB_FILE: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let ready = false;
  const markReady = () => {
    ready = true;
  };
  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    if (text.includes("Ready") || text.includes("started server")) markReady();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    if (text.includes("Ready") || text.includes("started server")) markReady();
  });
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    if (ready && (await waitForOrigin(origin, 2000))) {
      return {
        origin,
        stop: () => {
          child.kill("SIGTERM");
        },
      };
    }
    if (await waitForOrigin(origin, 1500)) {
      return {
        origin,
        stop: () => {
          child.kill("SIGTERM");
        },
      };
    }
  }
  child.kill("SIGTERM");
  throw new Error(`row209_dev_server_not_ready_${origin}`);
}

export async function runRow209LiveTests(): Promise<LiveTest[]> {
  const tests: LiveTest[] = [];
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

  const port = process.env.ROW209_PORT ?? "3310";
  const provided = process.env.ROW209_ORIGIN;
  const server = provided
    ? { origin: provided.replace(/\/$/, ""), stop: () => undefined }
    : await startDevServer(port);
  const { origin } = server;

  try {
    const none = await request(origin, "/ops/admin/executive-dashboard");
    const esNone = await request(origin, "/es/ops/admin/executive-dashboard");
    const architect = await request(origin, "/ops/admin/executive-dashboard", {
      headers: { cookie: await cookieFor("architect") },
    });
    const support = await request(origin, "/ops/admin/executive-dashboard", {
      headers: { cookie: await cookieFor("support") },
    });
    const adminCookie = await cookieFor("admin");
    const admin = await request(origin, "/ops/admin/executive-dashboard", {
      headers: { cookie: adminCookie },
    });
    const adminEs = await request(origin, "/es/ops/admin/executive-dashboard", {
      headers: { cookie: adminCookie },
    });
    const review = await request(origin, "/_internal/row209-executive-dashboard-review");

    tests.push({
      id: "T22",
      name: "Authenticated admin loads EN/ES executive dashboard; architect/support denied",
      result:
        redirectedTo(none, "/login") &&
        (none.location ?? "").includes("next=/ops/admin/executive-dashboard") &&
        redirectedTo(esNone, "/login") &&
        redirectedTo(architect, "/access-denied") &&
        redirectedTo(support, "/access-denied") &&
        admin.status === 200 &&
        adminEs.status === 200 &&
        admin.body.includes('data-bh-executive-dashboard="row-209"') &&
        adminEs.body.includes('data-bh-executive-dashboard="row-209"') &&
        allPanelsPresent(admin.body) &&
        allPanelsPresent(adminEs.body) &&
        !hasFalseGreen(admin.body) &&
        !hasFalseGreen(adminEs.body) &&
        !admin.body.includes("FounderDecisionActions") &&
        !admin.body.includes("approve-decision")
          ? "PASS"
          : "FAIL",
      detail: `none=${none.status}:${none.location} esNone=${esNone.status} architect=${architect.status}:${architect.location} support=${support.status}:${support.location} admin=${admin.status} adminEs=${adminEs.status} panels=${allPanelsPresent(admin.body)} falseGreen=${hasFalseGreen(admin.body)}`,
    });

    tests.push({
      id: "T23",
      name: "Localhost review route renders the same executive view (not production)",
      result:
        review.status === 200 &&
        review.body.includes('data-bh-executive-dashboard="row-209"') &&
        review.body.includes("TEMPORARY LOCAL QA") &&
        allPanelsPresent(review.body)
          ? "PASS"
          : "FAIL",
      detail: `review=${review.status} localhostOnlyAsserted=true`,
    });

    const token = adminCookie.slice(`${AUTH_COOKIE_NAME}=`.length);
    const browser = await launchPdfBrowser();
    try {
      const page = await browser.newPage();
      await page.setCookie({
        name: AUTH_COOKIE_NAME,
        value: token,
        url: origin,
      });

      await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 1 });
      await page.goto(`${origin}/ops/admin/executive-dashboard`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await page.waitForSelector("[data-bh-executive-dashboard='row-209']", {
        timeout: 90_000,
      });
      const desktop = await page.evaluate(() => {
        const root = document.querySelector("[data-bh-executive-dashboard='row-209']");
        const panels = [...document.querySelectorAll("[data-panel-id]")].map((node) => {
          const el = node as HTMLElement;
          const rect = el.getBoundingClientRect();
          return {
            id: el.getAttribute("data-panel-id"),
            status: el.getAttribute("data-panel-status"),
            telemetry: el.getAttribute("data-panel-telemetry"),
            width: rect.width,
            height: rect.height,
            visible: rect.height > 20 && rect.width > 20,
          };
        });
        return {
          hasRoot: Boolean(root),
          title: document.querySelector("h1")?.textContent?.trim() ?? "",
          panelCount: panels.length,
          panels,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 24,
        };
      });
      const desktopPath = path.join("ops/fab-5/runs", "row-209-browser-desktop.png");
      await page.screenshot({ path: desktopPath, fullPage: true });

      await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForSelector("[data-bh-executive-dashboard='row-209']", {
        timeout: 90_000,
      });
      const mobile = await page.evaluate(() => {
        const panels = [...document.querySelectorAll("[data-panel-id]")].map((node) => {
          const el = node as HTMLElement;
          const rect = el.getBoundingClientRect();
          return {
            id: el.getAttribute("data-panel-id"),
            status: el.getAttribute("data-panel-status"),
            telemetry: el.getAttribute("data-panel-telemetry"),
            top: rect.top + window.scrollY,
            width: rect.width,
            visible: rect.height > 20 && rect.width > 40,
          };
        });
        const stacked =
          panels.length >= 2 &&
          panels.every((panel, index) => index === 0 || panel.top >= (panels[index - 1]?.top ?? 0));
        return {
          hasRoot: Boolean(document.querySelector("[data-bh-executive-dashboard='row-209']")),
          panelCount: panels.length,
          panels,
          stacked,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 24,
          falseGreen: panels.some(
            (panel) => panel.status === "GREEN" && panel.telemetry === "unconfirmed",
          ),
        };
      });
      const mobilePath = path.join("ops/fab-5/runs", "row-209-browser-mobile.png");
      await page.screenshot({ path: mobilePath, fullPage: true });

      const desktopPass =
        desktop.hasRoot &&
        desktop.title.toLowerCase().includes("executive") &&
        desktop.panelCount === 10 &&
        EXECUTIVE_PANEL_IDS.every((id) => desktop.panels.some((panel) => panel.id === id && panel.visible)) &&
        !desktop.panels.some((panel) => panel.status === "GREEN" && panel.telemetry === "unconfirmed") &&
        !desktop.overflow;
      const mobilePass =
        mobile.hasRoot &&
        mobile.panelCount === 10 &&
        mobile.stacked &&
        mobile.panels.every((panel) => panel.visible) &&
        !mobile.falseGreen &&
        !mobile.overflow;

      tests.push({
        id: "T24",
        name: "Real desktop and mobile browser validation of the live executive view",
        result: desktopPass && mobilePass ? "PASS" : "FAIL",
        detail: `desktopPanels=${desktop.panelCount} desktopOverflow=${desktop.overflow} mobilePanels=${mobile.panelCount} stacked=${mobile.stacked} mobileOverflow=${mobile.overflow} falseGreen=${mobile.falseGreen}`,
      });

      await mkdir("/opt/cursor/artifacts", { recursive: true });
      await copyFile(desktopPath, "/opt/cursor/artifacts/row209_executive_dashboard_desktop.png");
      await copyFile(mobilePath, "/opt/cursor/artifacts/row209_executive_dashboard_mobile.png");
    } finally {
      await browser.close();
    }
  } finally {
    server.stop();
  }

  return tests;
}
