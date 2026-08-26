/**
 * Runtime E2E for Row 87 persistence + personalized Blueprint/Decision Statement.
 * Uses production login + Puppeteer against localhost.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { loadArchitectGuidebookResponses } from "../lib/blueprint/load-architect-guidebook-responses";
import { getDecisionStatementFillLines } from "../lib/blueprint/decision-statement-fill";

const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const EMAIL = "row87.e2e@example.com";
const PASSWORD = "Row87E2E!pass";
const OUT_DIR = path.join(process.cwd(), ".tmp-row87-e2e");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(60_000);
  const results: Array<[string, boolean, string]> = [];

  try {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector('input[name="email"], input[type="email"]');
    const emailSel =
      (await page.$('input[name="email"]')) ? 'input[name="email"]' : 'input[type="email"]';
    const passSel =
      (await page.$('input[name="password"]'))
        ? 'input[name="password"]'
        : 'input[type="password"]';
    await page.click(emailSel, { clickCount: 3 });
    await page.type(emailSel, EMAIL, { delay: 10 });
    await page.click(passSel, { clickCount: 3 });
    await page.type(passSel, PASSWORD, { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('button[type="submit"]'),
    ]).catch(async () => {
      await page.keyboard.press("Enter");
      await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => undefined);
    });

    const afterLogin = page.url();
    results.push([
      "login redirects away from /login",
      !afterLogin.includes("/login"),
      afterLogin,
    ]);

    await page.goto(`${BASE}/architect/journey/chapter-3/practice`, {
      waitUntil: "networkidle0",
    });
    const practiceUrl = page.url();
    results.push([
      "chapter-3 practice reachable",
      practiceUrl.includes("/architect/journey/chapter-3"),
      practiceUrl,
    ]);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const markerMatch = bodyText.match(/ROW87-E2E-\d+/);
    results.push([
      "saved practice marker visible after login",
      Boolean(markerMatch),
      markerMatch?.[0] ?? "missing",
    ]);

    // Edit + save practice statement
    const newMarker = `ROW87-E2E-SAVE-${Date.now()}`;
    const newStatement = `protect my peace and choose intention (${newMarker})`;
    const textarea = await page.$("textarea");
    if (textarea) {
      await textarea.click({ clickCount: 3 });
      await page.keyboard.down("Control");
      await page.keyboard.press("A");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      await textarea.type(newStatement, { delay: 5 });
      const saveBtn = await page.$('button[type="submit"]');
      if (saveBtn) {
        await saveBtn.click();
        await new Promise((r) => setTimeout(r, 1500));
      }
      results.push(["practice save submitted", true, newMarker]);
    } else {
      results.push(["practice textarea found", false, "no textarea"]);
    }

    // Refresh persistence
    await page.reload({ waitUntil: "networkidle0" });
    const afterRefresh = await page.evaluate(() => document.body.innerText);
    results.push([
      "SAVE→REFRESH keeps answer",
      afterRefresh.includes(newMarker),
      afterRefresh.includes(newMarker) ? newMarker : "marker missing after refresh",
    ]);

    // Logout
    await page.goto(`${BASE}/api/auth/logout`, { waitUntil: "networkidle0" }).catch(() => undefined);
    // try common logout paths
    const logoutCandidates = [
      `${BASE}/architect/logout`,
      `${BASE}/logout`,
      `${BASE}/api/auth/signout`,
    ];
    for (const url of logoutCandidates) {
      const res = await page.goto(url, { waitUntil: "networkidle0" }).catch(() => null);
      if (res && res.status() < 500) break;
    }

    // Find logout via UI if still authed
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    // Clear cookies for hard logout
    const client = await page.createCDPSession();
    await client.send("Network.clearBrowserCookies");

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await page.waitForSelector(emailSel);
    await page.click(emailSel, { clickCount: 3 });
    await page.type(emailSel, EMAIL, { delay: 10 });
    await page.click(passSel, { clickCount: 3 });
    await page.type(passSel, PASSWORD, { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('button[type="submit"]'),
    ]).catch(async () => {
      await page.keyboard.press("Enter");
      await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => undefined);
    });

    await page.goto(`${BASE}/architect/journey/chapter-3/practice`, {
      waitUntil: "networkidle0",
    });
    const afterRelogin = await page.evaluate(() => document.body.innerText);
    results.push([
      "LOGOUT→LOGIN→RELOAD keeps answer",
      afterRelogin.includes(newMarker),
      afterRelogin.includes(newMarker) ? newMarker : "marker missing after re-login",
    ]);

    // Personalized guidebook PDF
    const guidebookRes = await page.goto(`${BASE}/api/architect/blueprint/guidebook`, {
      waitUntil: "networkidle0",
      timeout: 300_000,
    });
    const guidebookBuf = guidebookRes ? await guidebookRes.buffer() : Buffer.alloc(0);
    const guidebookOk =
      Boolean(guidebookRes) &&
      guidebookRes!.ok() &&
      guidebookBuf.slice(0, 4).toString() === "%PDF";
    const guidebookPath = path.join(OUT_DIR, "personalized-guidebook.pdf");
    if (guidebookOk) await writeFile(guidebookPath, guidebookBuf);
    results.push([
      "personalized guidebook download PDF",
      guidebookOk,
      guidebookOk
        ? `${guidebookPath} (${guidebookBuf.length} bytes)`
        : `status=${guidebookRes?.status()} type=${guidebookRes?.headers()["content-type"]}`,
    ]);

    // Decision statement PDF
    const dsRes = await page.goto(
      `${BASE}/api/architect/blueprint/decision-statement`,
      { waitUntil: "networkidle0", timeout: 300_000 },
    );
    const dsBuf = dsRes ? await dsRes.buffer() : Buffer.alloc(0);
    const dsOk =
      Boolean(dsRes) && dsRes!.ok() && dsBuf.slice(0, 4).toString() === "%PDF";
    const dsPath = path.join(OUT_DIR, "personalized-decision-statement.pdf");
    if (dsOk) await writeFile(dsPath, dsBuf);
    results.push([
      "personalized decision statement PDF",
      dsOk,
      dsOk
        ? `${dsPath} (${dsBuf.length} bytes)`
        : `status=${dsRes?.status()} type=${dsRes?.headers()["content-type"]}`,
    ]);

    // Loader isolation check for this user
    const authDb = await import("node:fs/promises").then((fs) =>
      fs.readFile(path.join(process.cwd(), ".data/auth/database.json"), "utf8"),
    );
    const users = JSON.parse(authDb).users as Array<{ id: string; email: string }>;
    const user = users.find((u) => u.email === EMAIL);
    if (user) {
      const responses = await loadArchitectGuidebookResponses(user.id);
      const fill = getDecisionStatementFillLines(responses);
      const joined = JSON.stringify(responses);
      results.push([
        "loader contains latest marker",
        joined.includes(newMarker) || fill.some((l) => l.includes(newMarker)),
        fill.join(" | ").slice(0, 200),
      ]);
    }

    // Unauthenticated privacy check
    await client.send("Network.clearBrowserCookies");
    const unauth = await page.goto(`${BASE}/api/architect/blueprint/guidebook`, {
      waitUntil: "networkidle0",
    });
    results.push([
      "unauthenticated guidebook blocked",
      Boolean(unauth) && unauth!.status() === 401,
      `status=${unauth?.status()}`,
    ]);

    // Chapter III founder media
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
    await page.type(emailSel, EMAIL, { delay: 5 });
    await page.type(passSel, PASSWORD, { delay: 5 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.click('button[type="submit"]'),
    ]).catch(() => undefined);
    await page.goto(`${BASE}/architect/journey/chapter-3`, {
      waitUntil: "networkidle0",
    });
    const media = await page.evaluate(() => {
      const video = document.querySelector("video");
      return video
        ? {
            src: video.currentSrc || video.getAttribute("src"),
            readyState: video.readyState,
          }
        : null;
    });
    results.push([
      "founder video element present",
      Boolean(media?.src?.includes("chapter-3")),
      JSON.stringify(media),
    ]);

    // Lumina topic
    await page.goto(`${BASE}/architect/lumina?topic=decision`, {
      waitUntil: "networkidle0",
    });
    results.push([
      "lumina decision topic route loads",
      page.url().includes("topic=decision") || page.url().includes("/lumina"),
      page.url(),
    ]);

    // Responsive smoke
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE}/architect/journey/chapter-3/reflection`, {
      waitUntil: "networkidle0",
    });
    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    results.push(["mobile no horizontal overflow", !mobileOverflow, `overflow=${mobileOverflow}`]);

    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${BASE}/architect/journey/chapter-3/reflection`, {
      waitUntil: "networkidle0",
    });
    const tabletOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    results.push(["tablet no horizontal overflow", !tabletOverflow, `overflow=${tabletOverflow}`]);
  } finally {
    await browser.close();
  }

  let failed = 0;
  for (const [label, ok, detail] of results) {
    console.log(`${ok ? "PASS" : "FAIL"} - ${label} :: ${detail}`);
    if (!ok) failed += 1;
  }
  await writeFile(
    path.join(OUT_DIR, "results.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
