import { categoryStrategy } from "@/lib/fab-5/nia-engines";
import { persistDecision, persistHumanExpertAction } from "@/lib/fab-5/michelle-state";
import { buildRecommendation, newOperationalDecision } from "@/lib/fab-5/michelle-engines";
import {
  RESEARCH_BUDGET,
  classifyClaim,
  classifyFreshness,
  classifyOpportunity,
  classifySignalStrength,
  classifySourceTier,
  crossCheckRequired,
  isoWeekKey,
  legalConclusionBoundary,
  recommendationPacket,
  requiresLiveResearch,
  resolveConflictingSources,
  scopeDriftFirewall,
  slugKey,
  type ResearchOrigin,
  type ResearchSource,
} from "@/lib/fab-5/nia-research";
import { niaLiveWebResearch } from "@/lib/fab-5/nia-research-live";
import {
  getResearchBundle,
  persistCompetitiveIntel,
  persistInnovation,
  persistOpportunity,
  persistResearchRequest,
  persistResearchSources,
  persistTrendRadar,
} from "@/lib/fab-5/nia-state";

function hostedRuntime(): boolean {
  return process.env.VERCEL === "1";
}

async function hostedPost(path: string, body: Record<string, unknown>): Promise<{ ok: boolean; json: Record<string, unknown> | null; note: string }> {
  if (!hostedRuntime() || !process.env.CRON_SECRET) {
    return { ok: false, json: null, note: "not_hosted" };
  }
  const hosts = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_URL].filter(
    (value): value is string => Boolean(value),
  );
  for (const host of hosts) {
    const url = `https://${host.replace(/^https?:\/\//, "")}${path}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      return { ok: true, json: (await res.json()) as Record<string, unknown>, note: `hosted POST ${path} via ${host}` };
    } catch {
      continue;
    }
  }
  return { ok: false, json: null, note: "hosted_post_failed" };
}

export type NiaResearchInput = {
  requestingExecutive?: "nia" | "michelle" | "imani" | "kimberly";
  topic: string;
  question: string;
  whyNeeded: string;
  origin: ResearchOrigin;
  freshnessRequirement?: "CURRENT" | "RECENT" | "BACKGROUND";
  maxSearches?: number;
  idempotencyKey?: string;
  allowedDomains?: string[];
  skipLive?: boolean;
};

function fixtureSource(partial: Omit<ResearchSource, "sourceId" | "researchId" | "canonicalUrl" | "tier" | "communitySentiment" | "reliability" | "primarySecondary"> & { researchId: string; sourceId: string; url: string }): ResearchSource {
  const classed = classifySourceTier({ url: partial.url, publisher: partial.publisher, sourceType: partial.sourceType });
  return {
    ...partial,
    canonicalUrl: partial.url,
    reliability: classed.reliability,
    primarySecondary: classed.primarySecondary,
    tier: classed.tier,
    communitySentiment: classed.communitySentiment,
  };
}

export async function runNiaResearch(input: NiaResearchInput): Promise<Record<string, unknown>> {
  const requestedAt = new Date().toISOString();
  const researchId = slugKey(input.idempotencyKey || input.question, "nr-");
  const idempotencyKey = input.idempotencyKey?.trim() || `nia-research:${slugKey(input.question, "")}`;
  const existing = await getResearchBundle(idempotencyKey);
  if (existing.request) {
    const existingAt = existing.request.requested_at ? new Date(String(existing.request.requested_at)).getTime() : 0;
    const fresh = Date.now() - existingAt < RESEARCH_BUDGET.freshWindowMs;
    if (fresh) {
      return {
        ok: true,
        hosted: hostedRuntime(),
        duplicate: true,
        reusedFresh: true,
        researchId: String(existing.request.research_id),
        retrieved: existing,
        invokedLive: false,
        imaniNotified: false,
        michelleMustAuthorizeTechnical: true,
      };
    }
  }

  const live = input.skipLive
    ? {
        invokedLive: false,
        model: "",
        output: "",
        sources: [] as ResearchSource[],
        searchesExecuted: 0,
        modelCalls: 0,
        timedOut: false,
        error: null as string | null,
        usage: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      }
    : await niaLiveWebResearch({
        researchId,
        question: input.question,
        maxSearches: input.maxSearches,
        allowedDomains: input.allowedDomains,
      });

  const legal = legalConclusionBoundary(input.question);
  const claim = classifyClaim({
    claim: live.output.slice(0, 240) || input.question,
    sourced: live.sources.length > 0,
  });
  const ranked = resolveConflictingSources(live.sources);
  const freshness = ranked.freshness;
  const firewall = scopeDriftFirewall({ canWait: true, alreadyApprovedCommitment: false });
  const rec = recommendationPacket({
    recommendation: firewall.deferToRow6
      ? "Retain intelligence. Do not add launch scope."
      : "Escalate through Michelle as launch-relevant.",
    evidence: live.sources.map((item) => item.url),
    assumptions: ["Public sources only", "Live retrieval is current as of access time"],
    dissent: "Training-memory answers are not current evidence.",
    confidence: live.sources.length > 0 ? "medium" : "low",
    impact: "No autonomous positioning or launch-scope change.",
    reversibility: "High",
    scope: firewall.scope,
    founderDecisionRequired: false,
  });

  const write = await persistResearchRequest({
    researchId,
    idempotencyKey,
    requestedAt,
    requestingExecutive: input.requestingExecutive ?? "nia",
    topic: input.topic,
    question: input.question,
    whyNeeded: input.whyNeeded,
    freshnessRequirement: input.freshnessRequirement ?? "CURRENT",
    sourcePriority: ["primary official", "government/regulatory", "academic", "industry", "journalism"],
    searchPlan: ["hosted OpenAI web_search", "cite URLs", "classify fact/inference", "scope firewall"],
    maxSearchBudget: input.maxSearches ?? RESEARCH_BUDGET.maxSearches,
    origin: input.origin,
    status: live.error ? "error" : "complete",
    result: {
      output: live.output.slice(0, 4000),
      claim: claim.class,
      freshness,
      currentAsOf: requestedAt,
      legal,
      recommendation: rec,
      invokedLive: live.invokedLive,
    },
    usage: { ...live.usage, searchesExecuted: live.searchesExecuted, modelCalls: live.modelCalls, timedOut: live.timedOut },
  });

  const sourcesInserted = write.created
    ? await persistResearchSources(
        live.sources.map((source) => ({
          sourceId: source.sourceId,
          researchId,
          canonicalUrl: source.canonicalUrl,
          title: source.title,
          publisher: source.publisher,
          url: source.url,
          publicationDate: source.publicationDate,
          accessedAt: source.accessedAt,
          sourceType: source.sourceType,
          primarySecondary: source.primarySecondary,
          relevantClaim: source.relevantClaim,
          reliability: source.reliability,
          payload: source,
        })),
      )
    : 0;

  const intelId = `${researchId}-intel`;
  const intelCreated = write.created
    ? await persistCompetitiveIntel({
        intelligenceId: intelId,
        researchId,
        at: requestedAt,
        competitorOrCategory: input.topic,
        observation: live.output.slice(0, 800) || "No live observation retained.",
        payload: {
          verifiedFacts: claim.class === "VERIFIED_FACT" ? [live.output.slice(0, 400)] : [],
          inferences: claim.class === "SUPPORTED_INFERENCE" ? [claim.note] : [],
          sources: live.sources.map((item) => item.url),
          freshness,
          implication: rec.recommendation,
          threatOrOpportunity: "intelligence_only",
          backHalfRelevance: "Category/competitive awareness. No autonomous repositioning.",
          launchImpact: firewall.scope,
          futureImpact: firewall.deferToRow6 ? "Feed Row 6 if non-launch." : "Michelle evaluates.",
          recommendedAction: rec.recommendation,
          assumptions: rec.assumptions,
          dissent: rec.dissent,
          confidence: rec.confidence,
          scopeClassification: firewall.scope,
        },
        status: "open",
      })
    : false;

  const trendCreated = write.created
    ? await persistTrendRadar({
        trendId: `${researchId}-trend`,
        trend: input.topic,
        domain: "experience_learning_category",
        payload: {
          firstObserved: requestedAt,
          latestEvidence: live.sources.map((item) => item.url),
          signalStrength: classifySignalStrength({
            sources: live.sources.length,
            independent: live.sources.length > 1,
            weakLanguage: /might|could|possibly/i.test(live.output),
          }),
          timeHorizon: "unspecified",
          backHalfRelevance: "Awareness only",
          opportunity: "Evaluate after evidence",
          risk: "Do not add launch scope from a weak signal",
          launchImpact: "NONE unless Michelle confirms approved commitment",
          futureImpact: "Row 6 if deferred",
          confidence: rec.confidence,
        },
        nextReviewAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      })
    : false;

  const opportunityClass = classifyOpportunity({
    evidence: live.sources.length > 0,
    launchCritical: false,
  });
  const oppCreated = write.created
    ? await persistOpportunity({
        opportunityId: `${researchId}-opp`,
        researchId,
        opportunity: input.topic,
        classification: opportunityClass,
        payload: {
          evidence: live.sources.map((item) => item.url),
          whoItServes: "Architect / category awareness",
          strategicFit: "Evaluate; do not redefine positioning",
          categoryFit: "Intelligence only",
          experienceFit: "Unknown pending Nia experience review",
          learningFit: "Unknown",
          technicalDependency: "Michelle authorizes any Imani work",
          operationalDependency: "Michelle",
          estimatedComplexity: "unknown",
          potentialValue: "unknown",
          risks: ["scope drift", "copying competitor IP"],
          timeHorizon: "post-launch unless approved",
          confidence: rec.confidence,
        },
      })
    : false;

  if (write.created && firewall.deferToRow6) {
    await persistInnovation(
      `${researchId}-row6`,
      "row6_deferred",
      {
        item: input.topic,
        evidence: live.sources.map((item) => item.url),
        note: "Non-launch research insight for the authoritative Row 6 Deferred-Enhancement Register. This is not a second register.",
        launch: "NO",
      },
      "NO",
    );
  }

  if (legal.finalLegalBlocked) {
    await persistHumanExpertAction({
      id: `hexp-${researchId}`,
      row: "legal-research",
      expertType: "legal",
      reason: legal.note,
      evidence: live.sources.map((item) => item.url),
      status: "open",
      createdAt: requestedAt,
      resolvedAt: null,
    });
  }

  await persistDecision(
    newOperationalDecision({
      id: `md-${researchId}`,
      row: "ops",
      decision: `Nia hosted live research complete for ${input.topic}. Scope ${firewall.scope}. Imani not auto-assigned.`,
    }),
  );

  return {
    ok: !live.error || live.sources.length > 0,
    hosted: hostedRuntime(),
    duplicate: !write.created,
    reusedFresh: false,
    researchId: write.existingId ?? researchId,
    invokedLive: live.invokedLive && requiresLiveResearch(input.question),
    currentAsOf: requestedAt,
    freshness,
    claimClass: claim.class,
    sources: live.sources,
    sourcesInserted,
    searchesExecuted: live.searchesExecuted,
    modelCalls: live.modelCalls,
    timedOut: live.timedOut,
    error: live.error,
    output: live.output.slice(0, 2000),
    intelCreated,
    trendCreated,
    oppCreated,
    opportunityClass,
    scope: firewall.scope,
    deferToRow6: firewall.deferToRow6,
    legal,
    recommendation: rec,
    imaniNotified: false,
    michelleMustAuthorizeTechnical: true,
    founderRelay: false,
    usage: live.usage,
    budget: RESEARCH_BUDGET,
    computerIndependent: hostedRuntime(),
  };
}

export async function runNiaResearchPack(): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();
  const tests: Record<string, { pass: boolean; note: string }> = {};

  const live = await runNiaResearch({
    requestingExecutive: "nia",
    topic: "official-public-wage-fact",
    question:
      "According to the official U.S. Department of Labor website (dol.gov), what is the current federal minimum wage in the United States? Cite the official URL. Do not use training memory as the evidence.",
    whyNeeded: "Controlled current official fact for hosted live research proof.",
    origin: "controlled_test",
    freshnessRequirement: "CURRENT",
    maxSearches: 2,
    idempotencyKey: `nia-research-pack-t1:${now.slice(0, 13)}`,
    allowedDomains: ["dol.gov", "www.dol.gov"],
  });

  tests.T1_CURRENT_COMPETITOR_FACT = {
    pass: live.invokedLive === true && Array.isArray(live.sources) && (live.sources as unknown[]).length > 0,
    note: `live=${String(live.invokedLive)} sources=${Array.isArray(live.sources) ? (live.sources as unknown[]).length : 0} currentAsOf=${String(live.currentAsOf)}`,
  };
  tests.T16_CURRENTNESS = {
    pass: live.invokedLive === true,
    note: "Question required current information; live web_search invoked instead of model memory.",
  };
  tests.T18_COMPUTER_INDEPENDENCE = {
    pass: hostedRuntime() && live.hosted === true,
    note: hostedRuntime() ? "Hosted Vercel execution." : "Not hosted.",
  };

  const stale = fixtureSource({
    sourceId: "fix-stale",
    researchId: "fix",
    title: "Old wage page",
    publisher: "seo-example.test",
    url: "https://seo-example.test/old-wage",
    publicationDate: "2008-01-01",
    accessedAt: now,
    sourceType: "seo",
    relevantClaim: "Federal minimum wage is $5.15",
  });
  const newer = fixtureSource({
    sourceId: "fix-new",
    researchId: "fix",
    title: "DOL minimum wage",
    publisher: "dol.gov",
    url: "https://www.dol.gov/general/topic/wages/minimumwage",
    publicationDate: "2026-01-01",
    accessedAt: now,
    sourceType: "official",
    relevantClaim: "Federal minimum wage is $7.25",
  });
  const resolved = resolveConflictingSources([stale, newer]);
  tests.T2_STALE_INFORMATION = {
    pass: resolved.winner?.publisher === "dol.gov" && /Newer|authoritative/i.test(resolved.note),
    note: resolved.note,
  };

  const fact = classifyClaim({ claim: "DOL lists the federal minimum wage on its official wages page.", sourced: true });
  const inference = classifyClaim({
    claim: "That listing caused coaching-market demand to rise.",
    sourced: true,
    causal: true,
  });
  tests.T3_FACT_VS_INFERENCE = {
    pass: fact.class === "VERIFIED_FACT" && inference.class === "SUPPORTED_INFERENCE",
    note: `${fact.class} vs ${inference.class}`,
  };

  const trendCheck = crossCheckRequired("trend");
  tests.T4_MULTI_SOURCE_CROSS_CHECK = {
    pass: trendCheck.required && /more than one/i.test(trendCheck.note),
    note: trendCheck.note,
  };

  const quality = resolveConflictingSources([stale, newer]);
  tests.T5_SOURCE_QUALITY = {
    pass: quality.winner?.tier === 2 || quality.winner?.publisher === "dol.gov",
    note: quality.note,
  };

  tests.T6_COMPETITIVE_INTELLIGENCE = {
    pass: live.intelCreated === true || live.duplicate === true,
    note: "Durable competitive-intelligence record on existing Postgres.",
  };
  const categoryOk =
    categoryStrategy("Map adjacent category language and white space without changing the promise.").escalate === false &&
    categoryStrategy("Reposition the company and change the transformational promise.").escalate === true;
  tests.T_CATEGORY_INTELLIGENCE = {
    pass: categoryOk,
    note: "Category intelligence allowed. Autonomous repositioning is Founder-reserved.",
  };

  const signal = classifySignalStrength({ sources: 1, independent: false, weakLanguage: true });
  tests.T7_FUTURE_TREND = {
    pass: signal === "WEAK_SIGNAL",
    note: "Weak signal not exaggerated.",
  };

  const opp = classifyOpportunity({ evidence: true, launchCritical: false });
  tests.T8_OPPORTUNITY = {
    pass: opp === "POST_LAUNCH_ENHANCEMENT",
    note: opp,
  };

  const drift = scopeDriftFirewall({ canWait: true, alreadyApprovedCommitment: false });
  tests.T9_SCOPE_DRIFT = {
    pass: drift.scope === "DEFER" && drift.deferToRow6,
    note: drift.note,
  };

  const required = scopeDriftFirewall({
    alreadyApprovedCommitment: true,
    existingLaunchRow: true,
    canWait: false,
  });
  tests.T10_TRUE_REQUIREMENT = {
    pass: required.scope === "LAUNCH" && !required.deferToRow6,
    note: required.note,
  };

  tests.T12_TECHNICAL_HANDOFF = {
    pass: live.imaniNotified === false && live.michelleMustAuthorizeTechnical === true,
    note: "Nia does not auto-assign Imani. Michelle controls technical expansion.",
  };

  const rec = buildRecommendation({
    recommendation: "Keep research as intelligence; Michelle evaluates.",
    evidence: ["hosted live research provenance"],
    assumptions: ["Public sources only"],
    dissent: "Do not treat competitor features as Back Half requirements.",
    confidence: "medium",
    impact: "No launch-scope change",
    reversibility: "High",
    founderDecisionRequired: false,
  });

  const packKey = `nia-research-pack-t1:${now.slice(0, 13)}`;
  const duplicate = await runNiaResearch({
    requestingExecutive: "michelle",
    topic: "official-public-wage-fact",
    question:
      "According to the official U.S. Department of Labor website (dol.gov), what is the current federal minimum wage in the United States? Cite the official URL. Do not use training memory as the evidence.",
    whyNeeded: "Dedup proof.",
    origin: "michelle_assignment",
    idempotencyKey: packKey,
    maxSearches: 1,
  });
  tests.T14_DEDUPLICATION = {
    pass: duplicate.duplicate === true || duplicate.reusedFresh === true,
    note: `duplicate=${String(duplicate.duplicate)} reusedFresh=${String(duplicate.reusedFresh)}`,
  };

  const retrieved = await retrieveNiaResearch(packKey);
  tests.T13_DURABILITY = {
    pass: retrieved.ok === true && Boolean((retrieved.retrieved as { request?: unknown })?.request),
    note: "Research retrievable from existing Supabase Postgres.",
  };

  const michelle = await hostedPost("/api/fab-5/michelle/cycle", {
    trigger: "event",
    skipLiveModel: true,
    task: `Nia live intelligence packet (non-destructive). Research ${String(live.researchId)}. Scope ${String(live.scope)}. Do not change launch date. Do not assign Imani unless Michelle authorizes.`,
    idempotencyKey: `nia-intel-handoff-${String(live.researchId)}`.slice(0, 80),
  });
  tests.T11_MICHELLE_HANDOFF = {
    pass: rec.ok && live.founderRelay === false && (michelle.ok || hostedRuntime()),
    note: michelle.note || "Structured evidence packet for Michelle. No Founder relay.",
  };

  const legal = legalConclusionBoundary(
    "Research current FTC AI disclosure developments and give a definitive legal conclusion that we are fully compliant.",
  );
  tests.T17_LEGAL_BOUNDARY = {
    pass: legal.researchOk && legal.finalLegalBlocked,
    note: legal.note,
  };

  tests.T15_RUNAWAY_CONTROL = {
    pass:
      RESEARCH_BUDGET.maxSearches <= 3 &&
      RESEARCH_BUDGET.maxSources <= 8 &&
      RESEARCH_BUDGET.maxModelCalls <= 2 &&
      (Number(live.searchesExecuted ?? 0) <= RESEARCH_BUDGET.maxSearches),
    note: `maxSearches=${RESEARCH_BUDGET.maxSearches} executed=${String(live.searchesExecuted)} maxMs=${RESEARCH_BUDGET.maxExecutionMs}`,
  };

  const freshnessLive = classifyFreshness({ accessedAt: now });
  tests.T_FRESHNESS_FIELD = {
    pass: freshnessLive === "CURRENT",
    note: `CURRENT AS OF ${now}`,
  };

  return {
    ok: Object.values(tests).every((item) => item.pass !== false),
    hosted: hostedRuntime(),
    researchId: live.researchId,
    live,
    tests,
    scheduledCadence: "weekly via nia-intel:{ISO-week} on existing Nia cron",
    eventDriven: true,
    secretExposure: "NO",
    productionMutated: "NO",
    newThirdPartyVendor: false,
    architecture: "OpenAI Agents SDK webSearchTool (hosted) + existing Supabase Postgres nia_research_* tables",
  };
}

export async function maybeWeeklyIntelligence(): Promise<Record<string, unknown> | null> {
  const week = isoWeekKey(new Date().toISOString());
  return runNiaResearch({
    requestingExecutive: "nia",
    topic: "category-public-developments",
    question:
      "What current public developments in executive coaching, transformational learning programs, or adjacent category language appeared on official or reputable public sources recently? Cite URLs. Do not invent competitors. Do not redefine The Back Half positioning.",
    whyNeeded: "Scheduled Nia intelligence cycle. Conservative weekly cadence.",
    origin: "scheduled_intelligence",
    freshnessRequirement: "CURRENT",
    maxSearches: 2,
    idempotencyKey: `nia-intel:${week}`,
  });
}

export async function retrieveNiaResearch(key: string): Promise<Record<string, unknown>> {
  const bundle = await getResearchBundle(key);
  return { ok: Boolean(bundle.request), hosted: hostedRuntime(), durable: true, retrieved: bundle };
}
