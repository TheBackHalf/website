export const RESEARCH_BUDGET = {
  maxSearches: 3,
  maxSources: 8,
  maxModelCalls: 2,
  maxExecutionMs: 40000,
  maxRetries: 2,
  freshWindowMs: 14 * 24 * 60 * 60 * 1000,
} as const;

export type ResearchOrigin =
  | "michelle_assignment"
  | "scheduled_intelligence"
  | "category_review"
  | "competitor_signal"
  | "experience_investigation"
  | "learning_investigation"
  | "innovation_investigation"
  | "evidence_gap"
  | "founder_strategic_request"
  | "approved_event"
  | "controlled_test";

export type ClaimClass = "VERIFIED_FACT" | "SUPPORTED_INFERENCE" | "EMERGING_SIGNAL" | "SPECULATION" | "UNKNOWN";
export type Freshness = "CURRENT" | "RECENT" | "BACKGROUND" | "STALE" | "UNKNOWN";
export type SourceTier = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type OpportunityClass =
  | "LAUNCH_REQUIREMENT"
  | "POST_LAUNCH_ENHANCEMENT"
  | "EXPERIMENT"
  | "LONG_TERM_OPPORTUNITY"
  | "LEGACY_OPPORTUNITY"
  | "REJECT_NO_ACTION";
export type SignalStrength = "WEAK_SIGNAL" | "DEVELOPING_SIGNAL" | "ESTABLISHED_TREND";
export type ScopeClass = "LAUNCH" | "FUTURE" | "DEFER";

export type ResearchSource = {
  sourceId: string;
  researchId: string;
  title: string;
  publisher: string;
  url: string;
  canonicalUrl: string;
  publicationDate: string | null;
  accessedAt: string;
  sourceType: string;
  primarySecondary: "PRIMARY" | "SECONDARY";
  relevantClaim: string;
  reliability: string;
  tier: SourceTier;
  communitySentiment: boolean;
};

export type ResearchRequest = {
  researchId: string;
  idempotencyKey: string;
  requestedAt: string;
  requestingExecutive: "nia" | "michelle" | "imani" | "kimberly";
  topic: string;
  question: string;
  whyNeeded: string;
  freshnessRequirement: Freshness;
  sourcePriority: string[];
  searchPlan: string[];
  maxSearchBudget: number;
  origin: ResearchOrigin;
  status: string;
};

export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"].forEach((key) =>
      url.searchParams.delete(key),
    );
    let href = url.toString();
    if (href.endsWith("/")) href = href.slice(0, -1);
    return href;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function classifySourceTier(input: {
  url: string;
  publisher?: string;
  sourceType?: string;
  community?: boolean;
}): { tier: SourceTier; reliability: string; primarySecondary: "PRIMARY" | "SECONDARY"; communitySentiment: boolean } {
  const host = (() => {
    try {
      return new URL(input.url).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  const text = `${host} ${input.publisher ?? ""} ${input.sourceType ?? ""}`.toLowerCase();
  if (input.community || /reddit|forum|quora|facebook|tiktok|twitter|x\.com|youtube\.com\/watch/i.test(text)) {
    return {
      tier: 7,
      reliability: "Community/user discussion — sentiment only, not authoritative evidence.",
      primarySecondary: "SECONDARY",
      communitySentiment: true,
    };
  }
  if (/spam|affiliate|coupon|seo farm|ai-generated|unattributed/i.test(text)) {
    return {
      tier: 7,
      reliability: "Low-quality / unattributed. Do not treat as equivalent to official evidence.",
      primarySecondary: "SECONDARY",
      communitySentiment: false,
    };
  }
  if (/\.gov$|\.gov\/|dol\.gov|ftc\.gov|sec\.gov|europa\.eu|whitehouse\.gov/.test(host) || /government|regulator/.test(text)) {
    return { tier: 2, reliability: "Government/regulatory official source.", primarySecondary: "PRIMARY", communitySentiment: false };
  }
  if (/openai\.com|thebackhalf\.org|\.edu$|arxiv\.org|nih\.gov/.test(host) || /official|primary/.test(text)) {
    const academic = /\.edu$|arxiv|university|academic/.test(text);
    return {
      tier: academic ? 3 : 1,
      reliability: academic ? "Academic/research institution." : "Primary official source.",
      primarySecondary: "PRIMARY",
      communitySentiment: false,
    };
  }
  if (/reuters|apnews|bbc\.|nytimes|wsj|ft\.com|bloomberg|npr\.org/.test(host)) {
    return { tier: 5, reliability: "Reputable journalism.", primarySecondary: "SECONDARY", communitySentiment: false };
  }
  if (/gartner|forrester|harvard|mit|stanford|industry/.test(text)) {
    return { tier: 4, reliability: "Recognized industry/research source.", primarySecondary: "SECONDARY", communitySentiment: false };
  }
  return { tier: 6, reliability: "Secondary analysis — verify against primary when material.", primarySecondary: "SECONDARY", communitySentiment: false };
}

export function classifyFreshness(input: {
  publicationDate?: string | null;
  accessedAt: string;
  staleAgainstNewer?: boolean;
}): Freshness {
  if (input.staleAgainstNewer) return "STALE";
  const pub = input.publicationDate ? Date.parse(input.publicationDate) : NaN;
  const access = Date.parse(input.accessedAt);
  const now = Date.now();
  const stamp = Number.isFinite(pub) ? pub : Number.isFinite(access) ? access : NaN;
  if (!Number.isFinite(stamp)) return "UNKNOWN";
  const ageDays = (now - stamp) / 86400000;
  if (ageDays <= 90) return "CURRENT";
  if (ageDays <= 548) return "RECENT";
  return "BACKGROUND";
}

export function preferAuthoritative(sources: ResearchSource[]): ResearchSource[] {
  return [...sources].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    const order: Freshness[] = ["CURRENT", "RECENT", "BACKGROUND", "UNKNOWN", "STALE"];
    const af = classifyFreshness({ publicationDate: a.publicationDate, accessedAt: a.accessedAt });
    const bf = classifyFreshness({ publicationDate: b.publicationDate, accessedAt: b.accessedAt });
    return order.indexOf(af) - order.indexOf(bf);
  });
}

export function resolveConflictingSources(sources: ResearchSource[]): {
  winner: ResearchSource | null;
  freshness: Freshness;
  note: string;
} {
  if (sources.length === 0) return { winner: null, freshness: "UNKNOWN", note: "No sources." };
  const ranked = preferAuthoritative(sources);
  const winner = ranked[0];
  const loser = ranked.find((item) => item.sourceId !== winner.sourceId);
  const winnerFresh = classifyFreshness({ publicationDate: winner.publicationDate, accessedAt: winner.accessedAt });
  if (loser && loser.tier > winner.tier) {
    return {
      winner,
      freshness: winnerFresh,
      note: "Authoritative/higher-tier source wins over low-quality or secondary copy.",
    };
  }
  if (loser) {
    const loserFresh = classifyFreshness({
      publicationDate: loser.publicationDate,
      accessedAt: loser.accessedAt,
      staleAgainstNewer: Date.parse(loser.publicationDate ?? "") < Date.parse(winner.publicationDate ?? winner.accessedAt),
    });
    if (loserFresh === "STALE" || (winner.publicationDate && loser.publicationDate && winner.publicationDate > loser.publicationDate)) {
      return { winner, freshness: "CURRENT", note: "Newer/current authoritative evidence wins over stale source." };
    }
  }
  return { winner, freshness: winnerFresh, note: "Highest-quality current source retained." };
}

export function classifyClaim(input: {
  claim: string;
  sourced: boolean;
  causal?: boolean;
  future?: boolean;
  adoptionUnproven?: boolean;
}): { class: ClaimClass; note: string } {
  if (!input.sourced) return { class: "UNKNOWN", note: "No live source. Do not treat model memory as current evidence." };
  if (input.future || /might|could|someday|possibly/i.test(input.claim)) {
    return { class: "SPECULATION", note: "A future trend is not automatically fact." };
  }
  if (input.causal) {
    return { class: "SUPPORTED_INFERENCE", note: "Market observation does not automatically prove causality." };
  }
  if (input.adoptionUnproven) {
    return { class: "SUPPORTED_INFERENCE", note: "A competitor announcement does not automatically prove customer adoption." };
  }
  if (/signal|emerging|early/i.test(input.claim)) return { class: "EMERGING_SIGNAL", note: "Emerging signal — do not exaggerate." };
  return { class: "VERIFIED_FACT", note: "Sourced current observation." };
}

export function scopeDriftFirewall(input: {
  alreadyApprovedCommitment?: boolean;
  necessaryForApprovedPromise?: boolean;
  necessaryForSafetyLegal?: boolean;
  launchFailsWithout?: boolean;
  existingLaunchRow?: boolean;
  canWait?: boolean;
}): { scope: ScopeClass; note: string; deferToRow6: boolean } {
  const required =
    input.alreadyApprovedCommitment === true ||
    input.necessaryForApprovedPromise === true ||
    input.necessaryForSafetyLegal === true ||
    input.launchFailsWithout === true ||
    input.existingLaunchRow === true;
  if (required && input.canWait !== true) {
    return { scope: "LAUNCH", note: "Material to an approved requirement. Escalate through Michelle.", deferToRow6: false };
  }
  return {
    scope: "DEFER",
    note: "DEFER / FUTURE. Research insight is not a launch requirement. Competitor feature ≠ Back Half requirement.",
    deferToRow6: true,
  };
}

export function classifyOpportunity(input: {
  evidence: boolean;
  launchCritical?: boolean;
  experiment?: boolean;
  legacy?: boolean;
  reject?: boolean;
}): OpportunityClass {
  if (input.reject || !input.evidence) return "REJECT_NO_ACTION";
  if (input.launchCritical) return "LAUNCH_REQUIREMENT";
  if (input.legacy) return "LEGACY_OPPORTUNITY";
  if (input.experiment) return "EXPERIMENT";
  return "POST_LAUNCH_ENHANCEMENT";
}

export function classifySignalStrength(input: { sources: number; independent: boolean; weakLanguage: boolean }): SignalStrength {
  if (input.weakLanguage || input.sources < 2) return "WEAK_SIGNAL";
  if (input.independent && input.sources >= 3) return "ESTABLISHED_TREND";
  return "DEVELOPING_SIGNAL";
}

export function legalConclusionBoundary(question: string): { researchOk: boolean; finalLegalBlocked: boolean; note: string } {
  const asksConclusion = /definitive legal|is this legal|are we compliant|conclude the law|legal conclusion/i.test(question);
  return {
    researchOk: true,
    finalLegalBlocked: asksConclusion,
    note: asksConclusion
      ? "Research may identify regulatory developments. Final legal conclusion requires HUMAN LEGAL REVIEW."
      : "No final legal conclusion requested.",
  };
}

export function requiresLiveResearch(question: string): boolean {
  return /competitor|pricing|positioning|new entrant|market|category development|current|today|this (year|month|week)|trend|announcement|partnership|regulatory|emerging|platform change/i.test(
    question,
  );
}

export function crossCheckRequired(kind: "price" | "trend" | "regulatory" | "sentiment" | "other"): {
  required: boolean;
  note: string;
} {
  if (kind === "price") return { required: true, note: "Prefer competitor official current pricing source." };
  if (kind === "trend") return { required: true, note: "Seek more than one credible source when material. Do not fabricate consensus." };
  if (kind === "regulatory") return { required: true, note: "Prefer official regulator/government source." };
  if (kind === "sentiment") return { required: true, note: "Multiple independent observations; label as sentiment." };
  return { required: false, note: "Single high-quality source may suffice." };
}

export function recommendationPacket(input: {
  recommendation: string;
  evidence: string[];
  assumptions: string[];
  dissent: string;
  confidence: "low" | "medium" | "high";
  impact: string;
  reversibility: string;
  scope: ScopeClass;
  founderDecisionRequired: boolean;
}): typeof input & { ok: boolean } {
  const ok =
    Boolean(input.recommendation) &&
    input.evidence.length > 0 &&
    input.assumptions.length > 0 &&
    Boolean(input.dissent) &&
    Boolean(input.confidence);
  return { ...input, ok };
}

export function isoWeekKey(iso: string): string {
  const d = new Date(iso);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function slugKey(value: string, prefix: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);
  return `${prefix}${slug || "item"}`;
}
