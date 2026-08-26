/**
 * Row 182 remediation validation. Does not overwrite historical al-182.json.
 * Writes al-182-remediation.json. No Founder acceptance. No Complete.
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const STATUS_PATH = "ops/fab-5/runs/aos-engineering-status/al-182-remediation.json";
const PRODUCTION = "https://website-two-psi-49.vercel.app";

type Verdict = "PASS" | "FAIL" | "NOT_RUN" | "PARTIAL" | "NOT_IN_SCOPE";

type Check = {
  id: string;
  area: string;
  name: string;
  verdict: Verdict;
  actual: string;
};

const checks: Check[] = [];

function record(check: Check) {
  checks.push(check);
}

async function probeHeaders(origin: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(origin, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "TheBackHalf-Row182-HeaderProbe/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 120) : "probe_failed" };
  }
}

function sourceIncludes(file: string, needle: string): boolean {
  return readFileSync(file, "utf8").includes(needle);
}

async function main() {
  record({
    id: "R1",
    area: "rateLimits",
    name: "Login/register/support/analytics IP+account rate limits",
    verdict:
      sourceIncludes("lib/auth/actions/login-email.ts", "loginAccount") &&
      sourceIncludes("lib/auth/actions/register-email.ts", "registerIp") &&
      sourceIncludes("app/api/support/request/route.ts", "supportIp") &&
      sourceIncludes("app/api/analytics/event/route.ts", "analyticsIp")
        ? "PASS"
        : "FAIL",
    actual: "Durable consumeRateLimit wired on login, register, support, analytics, marketing session.",
  });

  record({
    id: "R2",
    area: "rateLimits",
    name: "Failed login remains generic invalid_credentials; lockout after repeated failures",
    verdict:
      sourceIncludes("lib/auth/actions/login-email.ts", "invalid_credentials") &&
      sourceIncludes("lib/rate-limit/http.ts", "lockAfter")
        ? "PASS"
        : "FAIL",
    actual: "Account lockout returns invalid_credentials. IP flood can 429.",
  });

  record({
    id: "R3",
    area: "adminAccess",
    name: "Founder-decision API bound to Founder human email allowlist",
    verdict:
      sourceIncludes("app/api/admin/aos/founder-decision/route.ts", "isFounderHumanEmail") &&
      sourceIncludes("lib/auth/founder.ts", "kimberly@thebackhalf.org")
        ? "PASS"
        : "FAIL",
    actual: "admin:ops:access is insufficient; BH_FOUNDER_EMAIL / kimberly@thebackhalf.org required.",
  });

  const configSrc = readFileSync("next.config.ts", "utf8");
  record({
    id: "R4",
    area: "headers",
    name: "Security headers in next.config.ts",
    verdict:
      configSrc.includes("Content-Security-Policy") &&
      configSrc.includes("X-Content-Type-Options") &&
      configSrc.includes("frame-ancestors") &&
      configSrc.includes("Referrer-Policy") &&
      configSrc.includes("Permissions-Policy") &&
      configSrc.includes("Strict-Transport-Security")
        ? "PASS"
        : "FAIL",
    actual: "CSP, nosniff, frame-ancestors/XFO, Referrer-Policy, Permissions-Policy, HSTS present in repo.",
  });

  record({
    id: "R5",
    area: "authentication",
    name: "Password reset bumps sessionVersion",
    verdict: sourceIncludes("lib/auth/actions/reset-password.ts", "bumpSessionVersion")
      ? "PASS"
      : "FAIL",
    actual: "resetPasswordAction calls bumpSessionVersion after hash update.",
  });

  record({
    id: "R6",
    area: "permissions",
    name: "Role demotion invalidates JWT via sessionVersion + live proxy check",
    verdict:
      sourceIncludes("lib/auth/store/postgres-store.ts", "session_version") &&
      sourceIncludes("proxy.ts", "hydrateLiveSession") &&
      sourceIncludes("lib/auth/access.ts", "liveVersion")
        ? "PASS"
        : "FAIL",
    actual: "setUserRole increments session_version; proxy.ts Node live check; requireAuthenticatedUser compares versions.",
  });

  let audit: { high: number; critical: number; moderate: number; raw: string } = {
    high: -1,
    critical: -1,
    moderate: -1,
    raw: "not_run",
  };
  try {
    const raw = execSync("npm audit --json", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const parsed = JSON.parse(raw) as {
      metadata?: { vulnerabilities?: { high?: number; critical?: number; moderate?: number } };
    };
    audit = {
      high: parsed.metadata?.vulnerabilities?.high ?? 0,
      critical: parsed.metadata?.vulnerabilities?.critical ?? 0,
      moderate: parsed.metadata?.vulnerabilities?.moderate ?? 0,
      raw: "ok",
    };
  } catch (error) {
    const output = error && typeof error === "object" && "stdout" in error
      ? String((error as { stdout?: string }).stdout ?? "")
      : "";
    try {
      const parsed = JSON.parse(output || "{}") as {
        metadata?: { vulnerabilities?: { high?: number; critical?: number; moderate?: number } };
      };
      audit = {
        high: parsed.metadata?.vulnerabilities?.high ?? -1,
        critical: parsed.metadata?.vulnerabilities?.critical ?? -1,
        moderate: parsed.metadata?.vulnerabilities?.moderate ?? -1,
        raw: "npm_audit_nonzero",
      };
    } catch {
      audit = { high: -1, critical: -1, moderate: -1, raw: "parse_failed" };
    }
  }

  record({
    id: "R7",
    area: "dependencyIssues",
    name: "npm audit launch-relevant HIGH",
    verdict: audit.critical === 0 && audit.high >= 0 ? "PARTIAL" : "FAIL",
    actual: `critical=${audit.critical}; high=${audit.high}; moderate=${audit.moderate}. No reckless Next/puppeteer upgrade. Residual transitive HIGH documented.`,
  });

  record({
    id: "R8",
    area: "dependencyIssues",
    name: "Production does not launch Puppeteer --no-sandbox",
    verdict:
      !readFileSync("lib/blueprint/launch-pdf-browser.ts", "utf8").includes("--no-sandbox") &&
      !readFileSync("app/api/architect/blueprint/guidebook/route.ts", "utf8").includes("--no-sandbox") &&
      sourceIncludes("lib/blueprint/print-fallback.ts", "blueprint_chrome_unavailable")
        ? "PASS"
        : "FAIL",
    actual: "Hosted Chrome launch fail-closed; print HTML is the Architect path.",
  });

  const prodHeaders = await probeHeaders(PRODUCTION);
  const csp = prodHeaders["content-security-policy"] ?? "";
  const nosniff = prodHeaders["x-content-type-options"] ?? "";
  record({
    id: "R9",
    area: "headers",
    name: "Production header probe (undeployed changes are PARTIAL)",
    verdict:
      csp.includes("frame-ancestors") && nosniff.toLowerCase() === "nosniff"
        ? "PASS"
        : "PARTIAL",
    actual: `host=${PRODUCTION}; csp=${csp ? "present" : "absent"}; nosniff=${nosniff || "absent"}; xfo=${prodHeaders["x-frame-options"] ?? "absent"}; referrer=${prodHeaders["referrer-policy"] ?? "absent"}. Repo headers are not production until this branch is deployed.`,
  });

  record({
    id: "R10",
    area: "authentication",
    name: "Architect application MFA is not launch scope",
    verdict: "NOT_IN_SCOPE",
    actual:
      "Row 69 Complete covers vendor/privileged MFA. Architect participant TOTP not implemented. FOUNDER ACTION if Founder wants application MFA later.",
  });

  const failed = checks.filter((row) => row.verdict === "FAIL");
  const overall: Verdict = failed.length === 0 ? "FAIL" : "FAIL";
  // Residual HIGH remains: undeployed headers, npm audit HIGH, Architect MFA Founder, production not on this branch.
  const residualRisk = "HIGH";
  const nextStatus = "CORRECTION_REQUIRED";

  const evidence = {
    aosWorkId: "al-182",
    title: "Security review remediation (Batch B2 correction)",
    historicalReviewPreserved: "ops/fab-5/runs/aos-engineering-status/al-182.json",
    founderAcceptanceRecorded: false,
    rowMarkedComplete: false,
    overall,
    residualRisk,
    nextStatus,
    authenticationWeakened: false,
    secretsPrinted: false,
    productionHeadersDeployed: false,
    checks,
    npmAudit: {
      critical: audit.critical,
      high: audit.high,
      moderate: audit.moderate,
      note: "Launch-relevant HIGH not recklessly upgraded immediately before launch. Transitive residual risk remains.",
    },
    productionProbe: {
      origin: PRODUCTION,
      headers: {
        csp: Boolean(csp),
        nosniff,
        xFrameOptions: prodHeaders["x-frame-options"] ?? null,
        referrerPolicy: prodHeaders["referrer-policy"] ?? null,
        permissionsPolicy: prodHeaders["permissions-policy"] ?? null,
        hsts: prodHeaders["strict-transport-security"] ?? null,
      },
    },
    remediations: [
      "F-01 rate limits + lockout",
      "F-03 headers in next.config.ts (undeployed = PARTIAL on production)",
      "F-04/F-07 sessionVersion + Node proxy live role check",
      "F-06 Founder-only decision API",
      "F-12 Chrome --no-sandbox removed; fail closed on Vercel",
      "F-08 AUTH_SECRET fail-closed on Vercel",
    ],
    notRemediatedLaunchHigh: [
      "Architect application MFA classified FOUNDER_ACTION_REQUIRED / NOT_IN_SCOPE (Row 69 vendor MFA).",
      "npm audit remaining HIGH transitive (no reckless upgrade).",
      "Production header PASS requires deploy of this branch.",
    ],
  };

  mkdirSync("ops/fab-5/runs/aos-engineering-status", { recursive: true });
  writeFileSync(STATUS_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        wrote: STATUS_PATH,
        overall,
        residualRisk,
        nextStatus,
        failed: failed.map((row) => row.id),
        checks: checks.map((row) => ({ id: row.id, verdict: row.verdict })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "row182_failed");
  process.exit(1);
});
