import { Agent, Runner, getDefaultModel, setDefaultOpenAIKey, setSensitiveDataLoggingEnabled, webSearchTool } from "@openai/agents";

import { loadFab5OpenAiEnv } from "@/lib/fab-5/env";
import { LIVE_MODEL_FALLBACK, redactSecrets } from "@/lib/fab-5/live-runner";
import { aiControlSkipError, evaluateAiCall } from "@/lib/ai-controls/gate";
import { withAiTimeoutAndRetry } from "@/lib/ai-controls/invoke";
import { logAiControlEvent } from "@/lib/ai-controls/logging";
import { recordAiUsage } from "@/lib/ai-controls/store";
import {
  RESEARCH_BUDGET,
  canonicalUrl,
  classifySourceTier,
  type ResearchSource,
} from "@/lib/fab-5/nia-research";

export type LiveResearchHit = {
  invokedLive: boolean;
  model: string;
  output: string;
  sources: ResearchSource[];
  searchesExecuted: number;
  modelCalls: number;
  timedOut: boolean;
  error: string | null;
  usage: { requests: number; inputTokens: number; outputTokens: number; totalTokens: number };
};

function extractUrls(payload: unknown, acc: Set<string>): void {
  if (!payload) return;
  if (typeof payload === "string") {
    const matches = payload.match(/https?:\/\/[^\s)"'<>]+/g) ?? [];
    for (const match of matches) acc.add(match.replace(/[.,;]+$/, ""));
    return;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) extractUrls(item, acc);
    return;
  }
  if (typeof payload === "object") {
    const rec = payload as Record<string, unknown>;
    const url = rec.url ?? rec.uri ?? rec.href;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) acc.add(url);
    const title = rec.title;
    void title;
    for (const value of Object.values(rec)) extractUrls(value, acc);
  }
}

function extractTitledUrls(payload: unknown): Array<{ url: string; title: string; publisher: string }> {
  const urls = new Set<string>();
  extractUrls(payload, urls);
  const titled: Array<{ url: string; title: string; publisher: string }> = [];
  const walk = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    const rec = value as Record<string, unknown>;
    const url = typeof rec.url === "string" ? rec.url : typeof rec.uri === "string" ? rec.uri : null;
    if (url && /^https?:\/\//i.test(url)) {
      let publisher = "";
      try {
        publisher = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        publisher = "";
      }
      titled.push({
        url,
        title: typeof rec.title === "string" ? rec.title : publisher || url,
        publisher,
      });
    }
    Object.values(rec).forEach(walk);
  };
  walk(payload);
  if (titled.length === 0) {
    for (const url of urls) {
      let publisher = "";
      try {
        publisher = new URL(url).hostname.replace(/^www\./, "");
      } catch {
        publisher = "";
      }
      titled.push({ url, title: publisher || url, publisher });
    }
  }
  const seen = new Set<string>();
  return titled.filter((item) => {
    const key = canonicalUrl(item.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function niaLiveWebResearch(input: {
  researchId: string;
  question: string;
  maxSearches?: number;
  allowedDomains?: string[];
}): Promise<LiveResearchHit> {
  const empty = {
    output: "",
    sources: [] as ResearchSource[],
    searchesExecuted: 0,
    modelCalls: 0,
    timedOut: false,
    usage: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
  const actorId = "fab5:nia-research";
  const gate = evaluateAiCall({ service: "fab5", actorId });
  if (!gate.allow) {
    return {
      invokedLive: false,
      model: "",
      ...empty,
      error: aiControlSkipError(gate.decision),
    };
  }

  const loaded = loadFab5OpenAiEnv();
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!loaded.keyPresent || !key) {
    return {
      invokedLive: false,
      model: "",
      ...empty,
      error: "OPENAI_API_KEY_MISSING",
    };
  }
  setSensitiveDataLoggingEnabled(false);
  setDefaultOpenAIKey(key);
  process.env.OPENAI_AGENTS_DISABLE_TRACING = "1";
  const model = getDefaultModel() || LIVE_MODEL_FALLBACK;
  const maxSearches = Math.min(input.maxSearches ?? RESEARCH_BUDGET.maxSearches, RESEARCH_BUDGET.maxSearches);
  const agent = new Agent({
    name: "Nia Prism Live Research",
    instructions: [
      "You are Nia Prism performing hosted live external research.",
      "You MUST use web_search. Do not answer from model memory as current evidence.",
      "Prefer official/primary sources. Cite URLs. Distinguish fact vs inference vs speculation.",
      "Do not bypass paywalls, authenticate, scrape private data, or impersonate humans.",
      "Do not copy competitor curriculum or protected branding. Analysis only.",
      "Do not issue final legal conclusions.",
      "Return: CURRENT AS OF timestamp, sources with URL/title, facts, inferences, unknowns.",
    ].join("\n"),
    tools: [
      webSearchTool({
        searchContextSize: "low",
        filters: input.allowedDomains?.length ? { allowedDomains: input.allowedDomains } : undefined,
      }),
    ],
  });
  const runner = new Runner({
    model,
    tracingDisabled: true,
    modelSettings: { parallelToolCalls: false },
  });
  const timed = await withAiTimeoutAndRetry({
    timeoutMs: Math.min(gate.policy.timeoutRetry.timeoutMs, RESEARCH_BUDGET.maxExecutionMs),
    maxAttempts: gate.policy.timeoutRetry.maxAttempts,
    retryOn: gate.policy.timeoutRetry.retryOn,
    neverRetry: gate.policy.timeoutRetry.neverRetry,
    run: () =>
      runner.run(
        agent,
        `LIVE RESEARCH (max ${maxSearches} searches). Question: ${input.question}\nCite official URLs. If unknown, say UNKNOWN. Do not invent competitors.`,
        { maxTurns: Math.max(2, maxSearches) },
      ),
  });
  if ("failure" in timed) {
    logAiControlEvent({
      service: "fab5",
      actorId,
      decision: "provider_failure",
      reason: timed.failure.message,
      estimatedUsd: 0,
      requests: timed.attempts,
      tokens: 0,
      failureClass: timed.failure.class,
      founderActionRequired: timed.failure.class === "quota",
    });
    return {
      invokedLive: true,
      model,
      output: "",
      sources: [],
      searchesExecuted: 0,
      modelCalls: timed.attempts,
      timedOut: timed.failure.class === "timeout",
      error: timed.failure.class === "timeout" ? "research_timeout" : redactSecrets(timed.failure.message),
      usage: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    };
  }
  const raced = timed.value;
  const output = redactSecrets(
    typeof raced.finalOutput === "string" ? raced.finalOutput : JSON.stringify(raced.finalOutput ?? ""),
  );
  const titled = extractTitledUrls({ items: raced.newItems, raw: raced.rawResponses, output }).slice(
    0,
    RESEARCH_BUDGET.maxSources,
  );
  const accessedAt = new Date().toISOString();
  const sources: ResearchSource[] = titled.map((item, index) => {
    const classed = classifySourceTier({ url: item.url, publisher: item.publisher });
    return {
      sourceId: `${input.researchId}-s${index + 1}`,
      researchId: input.researchId,
      title: item.title.slice(0, 240),
      publisher: item.publisher,
      url: item.url,
      canonicalUrl: canonicalUrl(item.url),
      publicationDate: null,
      accessedAt,
      sourceType: classed.communitySentiment ? "community" : classed.primarySecondary === "PRIMARY" ? "official" : "secondary",
      primarySecondary: classed.primarySecondary,
      relevantClaim: output.slice(0, 400),
      reliability: classed.reliability,
      tier: classed.tier,
      communitySentiment: classed.communitySentiment,
    };
  });
  const toolBlob = JSON.stringify(raced.newItems ?? []);
  const searchesExecuted = Math.min(
    maxSearches,
    Math.max(1, (toolBlob.match(/web_search/g) ?? []).length || (sources.length > 0 ? 1 : 0)),
  );
  const usage = { requests: raced.rawResponses.length, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
  for (const response of raced.rawResponses) {
    usage.inputTokens += response.usage?.inputTokens ?? 0;
    usage.outputTokens += response.usage?.outputTokens ?? 0;
    usage.totalTokens += response.usage?.totalTokens ?? 0;
  }
  recordAiUsage({
    service: "fab5",
    actorId,
    requests: Math.max(1, usage.requests),
    tokens: usage.totalTokens,
  });
  return {
    invokedLive: true,
    model,
    output,
    sources,
    searchesExecuted,
    modelCalls: usage.requests || 1,
    timedOut: false,
    error: null,
    usage,
  };
}
