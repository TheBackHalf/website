import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const OUT = path.join(process.cwd(), ".tmp-row87-e2e");
const EMAIL = "row87.e2e@example.com";
const PASSWORD = "Row87E2E!pass";

async function fetchWithCookies(
  url: string,
  cookieHeader: string,
): Promise<{ status: number; contentType: string | null; buffer: Buffer }> {
  const res = await fetch(url, {
    headers: { cookie: cookieHeader },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    buffer,
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(120_000);

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click('button[type="submit"]'),
  ]);
  console.log("logged in", page.url());

  const cookies = await page.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const guidebook = await fetchWithCookies(
    `${BASE}/api/architect/blueprint/guidebook`,
    cookieHeader,
  );
  await writeFile(path.join(OUT, "personalized-guidebook.pdf"), guidebook.buffer);
  console.log(
    "guidebook",
    guidebook.status,
    guidebook.contentType,
    guidebook.buffer.slice(0, 5).toString(),
    guidebook.buffer.length,
  );

  const decision = await fetchWithCookies(
    `${BASE}/api/architect/blueprint/decision-statement`,
    cookieHeader,
  );
  await writeFile(
    path.join(OUT, "personalized-decision-statement.pdf"),
    decision.buffer,
  );
  console.log(
    "decision",
    decision.status,
    decision.contentType,
    decision.buffer.slice(0, 5).toString(),
    decision.buffer.length,
  );

  const unauth = await fetch(`${BASE}/api/architect/blueprint/guidebook`);
  console.log("unauth", unauth.status);

  // Prove marker text in personalized PDFs when generation succeeded.
  if (guidebook.status === 200 && guidebook.buffer.slice(0, 4).toString() === "%PDF") {
    const { execFileSync } = await import("node:child_process");
    const script = `
import fitz, sys
doc=fitz.open(sys.argv[1])
text='\\n'.join(p.get_text() for p in doc)
print('pages', doc.page_count)
print('has_browser_marker', 'ROW87-E2E-BROWSER' in text)
print('has_protect', 'protect my peace' in text.lower())
`;
    const out = execFileSync(
      "python",
      ["-c", script, path.join(OUT, "personalized-guidebook.pdf")],
      { encoding: "utf8" },
    );
    console.log(out.trim());
  }

  if (decision.status === 200 && decision.buffer.slice(0, 4).toString() === "%PDF") {
    const { execFileSync } = await import("node:child_process");
    const script = `
import fitz, sys
doc=fitz.open(sys.argv[1])
text='\\n'.join(p.get_text() for p in doc)
print('decision_pages', doc.page_count)
print('decision_has_marker', 'ROW87-E2E-BROWSER' in text or 'protect my peace' in text.lower())
`;
    const out = execFileSync(
      "python",
      ["-c", script, path.join(OUT, "personalized-decision-statement.pdf")],
      { encoding: "utf8" },
    );
    console.log(out.trim());
  }

  await browser.close();
  if (guidebook.status !== 200 || decision.status !== 200) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
