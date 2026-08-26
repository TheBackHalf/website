import { readFile } from "node:fs/promises";

import { CHAPTER_1_ID } from "@/content/journey/chapter-1-awakening";
import { isLegalDocumentImplementationEligible, legalDocuments } from "@/content/legal/documents";
import { luminaPage } from "@/content/lumina";
import { loadOperatingSystem } from "@/lib/fab-5/os";
import type { OperatingAgentId, SourceRecord } from "@/lib/fab-5/types";

export type SourceQuery = {
  agent: OperatingAgentId;
  topics: string[];
  includeHistorical?: boolean;
};

const AGENT_SOURCE_ALLOWLIST: Record<OperatingAgentId, string[]> = {
  michelle: [
    "locked-founder-decisions",
    "august-launch-tab",
    "operating-system",
    "decision-log",
    "approved-product-curriculum",
    "approved-brand",
    "approved-legal-risk",
    "production-implementation",
    "test-evidence",
  ],
  imani: [
    "operating-system",
    "approved-legal-risk",
    "production-implementation",
    "test-evidence",
    "locked-founder-decisions",
    "august-launch-tab",
  ],
  nia: [
    "operating-system",
    "approved-product-curriculum",
    "approved-brand",
    "approved-legal-risk",
    "production-implementation",
  ],
};

export async function retrieveSources(query: SourceQuery): Promise<SourceRecord[]> {
  const os = await loadOperatingSystem();
  const allow = new Set(AGENT_SOURCE_ALLOWLIST[query.agent]);
  const wanted = new Set(query.topics.length > 0 ? query.topics : [...allow]);
  const records: SourceRecord[] = [];

  const push = (record: SourceRecord) => {
    if (!allow.has(record.id) && record.id !== "historical-deprecated") return;
    if (record.authority === "historical" && !query.includeHistorical) return;
    if (wanted.has(record.id) || query.topics.length === 0) {
      records.push(record);
    }
  };

  if (allow.has("operating-system")) {
    const michelle = os.michelle as { handoffRules?: string };
    push({
      id: "operating-system",
      rank: 1,
      label: "Row 15 Fab 5 operating system",
      authority: "current",
      excerpt: [
        os.operatingModel.commandModel,
        "Operating agents: Michelle Northstar (orchestrator), Imani Heartbeat (CTRO), Nia Prism (CXTO). Lumina is participant-facing AI Guide, not an operating agent. Kimberly Walker (AI) is Founder/CFO, not an operating agent.",
        "Routing: technology/security/risk → Imani; experience/curriculum/brand → Nia; operations/source-of-truth → Michelle; tech+experience → Imani and Nia in parallel under Michelle; legal judgment → Imani identifies risk then Michelle escalates to human legal review; founder-reserved → Michelle escalates to Founder.",
        michelle.handoffRules ?? "",
        "Row 19 Executive Authority and Escalation Matrix is encoded in this operating system (authorityLevels, spendingAuthority, productionChangeAuthority, incidentSeverity, legalHoldProtocol, executiveAuthority, blockAuthority.clearance) and queried via query_authority. One operational authority source. Do not create a second engine.",
        "Row 20 access registry is ops/fab-5/access-registry.json, queried via query_access. AUTHORITY + NO VERIFIED ACCESS ≠ EXECUTABLE. I HAVE AUTHORITY is not I HAVE SYSTEM ACCESS.",
        "Founder is interrupted only for reserved decisions, material blockers, material risk, acceptance, or launch threat. Do not ask the Founder to prompt Imani or Nia for ordinary execution.",
        `Decision-rights matrix encoded (${os.decisionRights.length} rows). Pricing requires Founder approval. Legal conclusions require a human legal expert.`,
        "Authority codes: A independent execute; B execute within approved plan; C consult another agent; D escalate to Michelle; E escalate to Founder; F external human expert.",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (allow.has("locked-founder-decisions")) {
    push({
      id: "locked-founder-decisions",
      rank: 1,
      label: "Locked Founder decisions",
      authority: "current",
      excerpt: os.founderReservedDecisions.slice(0, 6).join("; "),
    });
  }

  if (allow.has("august-launch-tab")) {
    const raw = await readFile("ops/fab-5/launch-rows.json", "utf8");
    const parsed = JSON.parse(raw) as {
      remainingLaunchCritical?: Array<{ id: string; primaryOwner: string; primaryWorkstream: string; spreadsheetRow?: number; deliverable?: string }>;
      criticalPath?: Array<number | string>;
      workstreams?: Array<{ id: string; primaryExecutiveName: string }>;
      statusCounts?: { total?: number; remaining?: number; complete?: number };
    };
    const remaining = (parsed.remainingLaunchCritical ?? [])
      .slice(0, 12)
      .map((item) => `Row ${item.spreadsheetRow ?? item.id}:${item.primaryWorkstream}:${item.primaryOwner}`)
      .join("; ");
    const owners = (parsed.workstreams ?? [])
      .map((item) => `${item.id}=${item.primaryExecutiveName}`)
      .join("; ");
    push({
      id: "august-launch-tab",
      rank: 2,
      label: "August Launch tab (full ingested plan)",
      authority: "current",
      excerpt: `Authoritative August Launch tab ingested. Totals: ${parsed.statusCounts?.total ?? "?"} deliverables, ${parsed.statusCounts?.complete ?? "?"} complete, ${parsed.statusCounts?.remaining ?? "?"} remaining. Workstreams: ${owners}. Next remaining sample: ${remaining}. Critical path: ${(parsed.criticalPath ?? []).slice(0, 12).join(" → ")}. Do not invent rows. Unowned remaining must be 0.`,
    });
  }

  if (allow.has("decision-log")) {
    const raw = await readFile("ops/fab-5/decision-log.json", "utf8");
    push({
      id: "decision-log",
      rank: 1,
      label: "Fab 5 decision log",
      authority: "current",
      excerpt: raw.slice(0, 400),
    });
  }

  if (allow.has("approved-product-curriculum")) {
    push({
      id: "approved-product-curriculum",
      rank: 3,
      label: "Approved Journey content",
      authority: "current",
      excerpt: `Chapter I id ${CHAPTER_1_ID}; six-stage structure is locked. Do not invent curriculum.`,
    });
  }

  if (allow.has("approved-brand")) {
    push({
      id: "approved-brand",
      rank: 4,
      label: "Approved brand content",
      authority: "current",
      excerpt: "The Back Half Architect experience. Lumina is the participant-facing AI Guide, not an operating executive.",
    });
  }

  if (allow.has("approved-legal-risk")) {
    const titles = Object.values(legalDocuments)
      .map(
        (doc) =>
          `${doc.title} [reviewStatus=${doc.reviewStatus}; contentPending=${String(doc.contentPending)}; implementationEligible=${String(
            isLegalDocumentImplementationEligible(doc),
          )}]`,
      )
      .join("; ");
    push({
      id: "approved-legal-risk",
      rank: 5,
      label: "Approved legal/risk materials",
      authority: "current",
      excerpt: titles,
    });
  }

  if (allow.has("test-evidence")) {
    let liveSummary =
      "Live smoke artifact not yet present at ops/fab-5/runs/row-16-live-smoke.json.";
    try {
      const raw = await readFile(
        "ops/fab-5/runs/row-16-live-smoke.json",
        "utf8",
      );
      const parsed = JSON.parse(raw) as {
        liveOpenAiApi?: string;
        requiredPass?: boolean;
        modelUsed?: string;
      };
      liveSummary = `Row 16 live smoke artifact present: model=${parsed.modelUsed ?? "unspecified"}; liveOpenAiApi=${parsed.liveOpenAiApi ?? "unknown"}; requiredPass=${String(parsed.requiredPass)}.`;
    } catch {
      // Artifact may not exist yet.
    }
    push({
      id: "test-evidence",
      rank: 7,
      label: "Current test evidence",
      authority: "current",
      excerpt: `Fab 5 local QA lives at scripts/fab-5/qa.ts. ${liveSummary} Encoded tests do not by themselves make a surface PRODUCTION-READY. ROW READY FOR FOUNDER ACCEPTANCE is a reporting class, not an automatic MATERIAL BLOCKER.`,
    });
  }

  if (allow.has("production-implementation")) {
    push({
      id: "production-implementation",
      rank: 6,
      label: "Current production implementation",
      authority: "current",
      excerpt: `Website implementation: app/. Journey implementation: content/journey (Chapter I ${CHAPTER_1_ID}). Blueprint integration: app/blueprint and app/api/architect/blueprint. Lumina implementation: content/lumina.ts (${luminaPage.title}). Legal implementation requirements: content/legal/documents.ts. Launch source of truth: ops/fab-5/launch-rows.json via query_launch_view. Stripe/auth/SMTP exist. Cursor is the engineering execution layer.`,
    });
  }

  if (query.includeHistorical) {
    push({
      id: "historical-deprecated",
      rank: 8,
      label: "Historical or deprecated material",
      authority: "historical",
      excerpt: "Never overrides ranks 1–7. Retired executive identities are not current operating agents.",
    });
  }

  return records.sort((a, b) => a.rank - b.rank);
}

export function detectSourceConflict(sources: SourceRecord[]): {
  conflict: boolean;
  description?: string;
} {
  const current = sources.filter((item) => item.authority === "current");
  const byId = new Map<string, SourceRecord[]>();
  for (const source of current) {
    const list = byId.get(source.id) ?? [];
    list.push(source);
    byId.set(source.id, list);
  }
  for (const [id, list] of byId) {
    const excerpts = new Set(list.map((item) => item.excerpt));
    if (excerpts.size > 1) {
      return {
        conflict: true,
        description: `Authoritative source ${id} has conflicting excerpts. Do not guess.`,
      };
    }
  }
  const locked = current.find((item) => item.id === "locked-founder-decisions");
  const historical = sources.find((item) => item.authority === "historical");
  if (locked && historical && historical.excerpt.includes("OVERRIDE_CURRENT")) {
    return {
      conflict: true,
      description: "Historical material attempts to override a locked Founder decision.",
    };
  }
  return { conflict: false };
}
