/**
 * Row 75 domain / DNS / SSL / renewal continuity checks.
 * Time-bounded. Does not change DNS, nameservers, registrar, Vercel domains, or SSL.
 * Does not mark Row 75 Complete. Review pages must read persisted evidence — do not
 * re-run this collector on every page load.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import tls from "node:tls";

import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";

export const ROW75_REVIEW_PATH = "/_internal/row75-domain-dns-ssl-review";
export const ROW75_REVIEW_URL = `http://localhost:3000${ROW75_REVIEW_PATH}`;
export const ROW75_STATUS_PATH = "ops/fab-5/row-75-status.json";
export const ROW75_VALIDATION_PATH = "ops/fab-5/runs/row-75-domain-dns-ssl-validation.json";
export const CANONICAL_HOST = "thebackhalf.org";
export const WWW_HOST = "www.thebackhalf.org";
export const PRODUCTION_VERCEL_HOST = "website-two-psi-49.vercel.app";
export const CHECK_TIMEOUT_MS = 8000;

const SECRET_PATTERN =
  /sk_live_|sk_test_|rk_live_|rk_test_|whsec_|postgres(?:ql)?:\/\/[^@\s]+@|CRON_SECRET=|AUTH_SECRET=|sk-proj-|sk-[A-Za-z0-9]{16,}|AIza[A-Za-z0-9]{20,}/i;

export function row75TextContainsSecrets(text: string): boolean {
  return SECRET_PATTERN.test(text);
}

export type DohResult = {
  name: string;
  type: string;
  httpStatus: number;
  dnsStatus: number;
  records: string[];
  unverified: boolean;
};

export type HttpProbe = {
  url: string;
  status: number;
  location: string | null;
  unverified: boolean;
};

export type TlsInspect = {
  host: string;
  ok: boolean;
  validTo: string | null;
  subjectCn: string | null;
  altNames: string[];
  unverified: boolean;
  note: string;
};

export type RdapSummary = {
  retrieved: boolean;
  unverified: boolean;
  ldhName: string | null;
  registrar: string | null;
  expiration: string | null;
  registration: string | null;
  status: string[];
  nameservers: string[];
  transferLockHint: string;
  autoRenew: string;
  note: string;
};

export type Row75Evidence = {
  generatedAt: string;
  checkTimeoutMs: number;
  priorRun: {
    recovered: "PASS" | "PARTIAL" | "FAIL";
    lastCompletedPriorCheck: string;
    row75ArtifactsExisted: boolean;
  };
  dns: {
    apex: {
      soa: DohResult;
      ns: DohResult;
      a: DohResult;
      aaaa: DohResult;
      cname: DohResult;
    };
    www: {
      a: DohResult;
      aaaa: DohResult;
      cname: DohResult;
    };
  };
  rdap: RdapSummary;
  http: {
    canonical: HttpProbe;
    www: HttpProbe;
    vercelProduction: HttpProbe;
  };
  tls: {
    canonical: TlsInspect;
    www: TlsInspect;
    vercelProduction: TlsInspect;
  };
  local: {
    githubOriginIndependent: boolean;
    supportTicketPathIsSupportScoped: boolean;
    launchDashboardsRemainAdmin: boolean;
    supportDeniedAdmin: boolean;
    row61Complete: boolean;
    row62Complete: boolean;
    row153Complete: boolean;
  };
};

function stripDot(value: string): string {
  return value.replace(/\.$/, "");
}

async function dohLookup(name: string, type: string): Promise<DohResult> {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
      {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      return {
        name,
        type,
        httpStatus: response.status,
        dnsStatus: -1,
        records: [],
        unverified: true,
      };
    }
    const body = (await response.json()) as {
      Status?: number;
      Answer?: Array<{ data?: string }>;
      Authority?: Array<{ type?: number; data?: string }>;
    };
    const fromAnswer = (body.Answer ?? [])
      .map((row) => (typeof row.data === "string" ? stripDot(row.data) : ""))
      .filter(Boolean);
    const fromAuthority =
      type === "NS" || type === "SOA"
        ? (body.Authority ?? [])
            .map((row) => (typeof row.data === "string" ? stripDot(row.data) : ""))
            .filter(Boolean)
        : [];
    const records = [...new Set([...fromAnswer, ...fromAuthority])];
    return {
      name,
      type,
      httpStatus: response.status,
      dnsStatus: typeof body.Status === "number" ? body.Status : -1,
      records,
      unverified: false,
    };
  } catch {
    return {
      name,
      type,
      httpStatus: 0,
      dnsStatus: -1,
      records: [],
      unverified: true,
    };
  }
}

async function probeHttp(url: string): Promise<HttpProbe> {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: { "user-agent": "BackHalf-Row75-Domain/1.0" },
    });
    return {
      url,
      status: response.status,
      location: response.headers.get("location"),
      unverified: false,
    };
  } catch {
    return { url, status: 0, location: null, unverified: true };
  }
}

function inspectTls(host: string): Promise<TlsInspect> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host,
        port: 443,
        servername: host,
        timeout: CHECK_TIMEOUT_MS,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        const alt =
          typeof cert.subjectaltname === "string"
            ? cert.subjectaltname
                .split(",")
                .map((part) => part.replace(/^DNS:/, "").trim())
                .filter(Boolean)
            : [];
        resolve({
          host,
          ok: true,
          validTo: typeof cert.valid_to === "string" ? cert.valid_to : null,
          subjectCn: typeof cert.subject?.CN === "string" ? cert.subject.CN : null,
          altNames: alt,
          unverified: false,
          note: "TLS handshake completed.",
        });
      },
    );
    const fail = (note: string) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({
        host,
        ok: false,
        validTo: null,
        subjectCn: null,
        altNames: [],
        unverified: true,
        note,
      });
    };
    socket.on("error", () => fail("TLS failed or host did not resolve."));
    socket.on("timeout", () => fail("TLS timed out."));
  });
}

function vcardFn(entity: unknown): string | null {
  if (!entity || typeof entity !== "object") return null;
  const vcard = (entity as { vcardArray?: unknown[] }).vcardArray;
  if (!Array.isArray(vcard) || !Array.isArray(vcard[1])) return null;
  for (const row of vcard[1]) {
    if (Array.isArray(row) && row[0] === "fn" && typeof row[3] === "string") return row[3];
  }
  return null;
}

async function rdapLookup(): Promise<RdapSummary> {
  try {
    const response = await fetch(`https://rdap.org/domain/${CANONICAL_HOST}`, {
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: { accept: "application/rdap+json, application/json" },
    });
    if (!response.ok) {
      return {
        retrieved: false,
        unverified: true,
        ldhName: null,
        registrar: null,
        expiration: null,
        registration: null,
        status: [],
        nameservers: [],
        transferLockHint: "UNVERIFIED",
        autoRenew: "FOUNDER VERIFICATION REQUIRED",
        note: `RDAP HTTP ${response.status}. Registrar/expiry remain Founder verification.`,
      };
    }
    const body = (await response.json()) as {
      ldhName?: string;
      status?: string[];
      events?: Array<{ eventAction?: string; eventDate?: string }>;
      entities?: Array<{ roles?: string[]; vcardArray?: unknown[] }>;
      nameservers?: Array<{ ldhName?: string }>;
    };
    const registrarEntity = (body.entities ?? []).find((entity) =>
      (entity.roles ?? []).includes("registrar"),
    );
    const status = Array.isArray(body.status) ? body.status : [];
    const locked = status.some((item) => /transfer prohibited/i.test(item));
    return {
      retrieved: true,
      unverified: false,
      ldhName: body.ldhName ?? CANONICAL_HOST,
      registrar: vcardFn(registrarEntity),
      expiration: body.events?.find((event) => event.eventAction === "expiration")?.eventDate ?? null,
      registration: body.events?.find((event) => event.eventAction === "registration")?.eventDate ?? null,
      status,
      nameservers: (body.nameservers ?? [])
        .map((row) => (row.ldhName ? stripDot(row.ldhName) : ""))
        .filter(Boolean),
      transferLockHint: locked ? "YES — RDAP status includes transfer prohibited" : status.length ? "NO — not listed as transfer prohibited" : "UNVERIFIED",
      autoRenew: "FOUNDER VERIFICATION REQUIRED",
      note: "RDAP does not publish auto-renew or billing method. Those remain Founder dashboard checks. No secrets stored.",
    };
  } catch {
    return {
      retrieved: false,
      unverified: true,
      ldhName: null,
      registrar: null,
      expiration: null,
      registration: null,
      status: [],
      nameservers: [],
      transferLockHint: "UNVERIFIED",
      autoRenew: "FOUNDER VERIFICATION REQUIRED",
      note: "RDAP timed out or failed. Registrar/expiry/lock remain Founder verification. Not retried.",
    };
  }
}

function rowStatusComplete(rel: string): boolean {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), rel);
  if (!existsSync(abs)) return false;
  try {
    const json = JSON.parse(readFileSync(abs, "utf8")) as {
      status?: string;
      founderAccepted?: boolean;
      rowMarkedComplete?: boolean;
      percentCompleteRecorded?: number;
    };
    return (
      json.status === "Complete" ||
      json.founderAccepted === true ||
      json.rowMarkedComplete === true ||
      json.percentCompleteRecorded === 100
    );
  } catch {
    return false;
  }
}

function githubOriginIndependent(): boolean {
  const gitConfig = path.join(/* turbopackIgnore: true */ process.cwd(), ".git", "config");
  if (!existsSync(gitConfig)) return false;
  return /github\.com[:/]TheBackHalf\/website/i.test(readFileSync(gitConfig, "utf8"));
}

export async function collectRow75Evidence(): Promise<Row75Evidence> {
  const [
    soa,
    ns,
    a,
    aaaa,
    cname,
    wwwA,
    wwwAaaa,
    wwwCname,
    rdap,
    canonicalHttp,
    wwwHttp,
    vercelHttp,
    canonicalTls,
    wwwTls,
    vercelTls,
  ] = await Promise.all([
    dohLookup(CANONICAL_HOST, "SOA"),
    dohLookup(CANONICAL_HOST, "NS"),
    dohLookup(CANONICAL_HOST, "A"),
    dohLookup(CANONICAL_HOST, "AAAA"),
    dohLookup(CANONICAL_HOST, "CNAME"),
    dohLookup(WWW_HOST, "A"),
    dohLookup(WWW_HOST, "AAAA"),
    dohLookup(WWW_HOST, "CNAME"),
    rdapLookup(),
    probeHttp(`https://${CANONICAL_HOST}/`),
    probeHttp(`https://${WWW_HOST}/`),
    probeHttp(`https://${PRODUCTION_VERCEL_HOST}/`),
    inspectTls(CANONICAL_HOST),
    inspectTls(WWW_HOST),
    inspectTls(PRODUCTION_VERCEL_HOST),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    checkTimeoutMs: CHECK_TIMEOUT_MS,
    priorRun: {
      recovered: "PARTIAL",
      lastCompletedPriorCheck:
        "No Row 75 files existed in this worktree. Last completed related check: Row 73 DNS-over-HTTPS (SOA present, NS hint anirban.ns.cloudflare.com, A/AAAA count 0) plus Row 74 registrar unidentified. Current-state DNS/RDAP/SSL re-tested here with 8s timeouts.",
      row75ArtifactsExisted: false,
    },
    dns: {
      apex: { soa, ns, a, aaaa, cname },
      www: { a: wwwA, aaaa: wwwAaaa, cname: wwwCname },
    },
    rdap,
    http: {
      canonical: canonicalHttp,
      www: wwwHttp,
      vercelProduction: vercelHttp,
    },
    tls: {
      canonical: canonicalTls,
      www: wwwTls,
      vercelProduction: vercelTls,
    },
    local: {
      githubOriginIndependent: githubOriginIndependent(),
      supportTicketPathIsSupportScoped:
        isSupportTicketAdminPath("/ops/admin/support") && !isAdminOpsPath("/ops/admin/support"),
      launchDashboardsRemainAdmin:
        isAdminOpsPath("/ops/admin/launch-kpi") && isAdminOpsPath("/ops/admin/launch-dashboard"),
      supportDeniedAdmin: !roleHasPermission("support", "admin:ops:access"),
      row61Complete: rowStatusComplete("ops/fab-5/row-61-status.json"),
      row62Complete: rowStatusComplete("ops/fab-5/row-62-status.json"),
      row153Complete: rowStatusComplete("ops/fab-5/row-153-status.json"),
    },
  };
}

export function loadRow75Validation(): Row75Evidence | null {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), ROW75_VALIDATION_PATH);
  if (!existsSync(abs)) return null;
  try {
    const json = JSON.parse(readFileSync(abs, "utf8")) as { evidence?: Row75Evidence } & Partial<Row75Evidence>;
    if (json.evidence?.dns) return json.evidence;
    if (json.dns) return json as Row75Evidence;
    return null;
  } catch {
    return null;
  }
}

export function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}
