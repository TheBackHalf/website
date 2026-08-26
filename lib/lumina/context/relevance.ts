import type {
  LuminaMemoryDecision,
  LuminaMemoryMilestone,
  LuminaMemorySummary,
} from "@/lib/lumina/memory/types";
import type { LuminaRelevantInsight } from "@/lib/lumina/context/types";

export const LUMINA_INSIGHT_CAP = 5;

type InsightCandidate = LuminaRelevantInsight & { score: number };

function stageKeywords(stageId: string | null): string[] {
  if (!stageId) {
    return [];
  }
  const base = [stageId];
  // Light keyword expansion from language-neutral stage ids only.
  switch (stageId) {
    case "awakening":
      return [...base, "awaken", "intention"];
    case "mirror":
      return [...base, "reflect", "reflection"];
    case "decision":
      return [...base, "decide", "choice", "commit"];
    case "standards":
      return [...base, "standard", "boundary"];
    case "architect":
      return [...base, "identity", "architect"];
    case "expansion":
      return [...base, "expand", "growth"];
    case "beginning":
      return [...base, "begin", "start"];
    default:
      return base;
  }
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) {
    return false;
  }
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

function sourcePriority(kind: LuminaRelevantInsight["kind"], source: string): number {
  // Prefer journey-sourced decisions/milestones.
  if (kind === "decision" && source === "journey") {
    return 100;
  }
  if (kind === "milestone" && source === "journey") {
    return 95;
  }
  if (kind === "decision") {
    return 80;
  }
  if (kind === "milestone") {
    return 70;
  }
  return 40;
}

/**
 * Filter Row 76 durable insights for Lumina context.
 * Cap ~5; prefer journey-sourced decisions/milestones; match current stage; then recency.
 */
export function filterRelevantInsights(input: {
  memoryEnabled: boolean;
  stageId: string | null;
  decisions: LuminaMemoryDecision[];
  summaries: LuminaMemorySummary[];
  milestones: LuminaMemoryMilestone[];
  max?: number;
}): LuminaRelevantInsight[] {
  if (!input.memoryEnabled) {
    return [];
  }

  const max = input.max ?? LUMINA_INSIGHT_CAP;
  const keywords = stageKeywords(input.stageId);
  const candidates: InsightCandidate[] = [];

  for (const decision of input.decisions) {
    const keywordBonus = textMatchesKeywords(decision.text, keywords) ? 25 : 0;
    candidates.push({
      id: decision.id,
      kind: "decision",
      text: decision.text,
      createdAt: decision.updatedAt || decision.createdAt,
      source: decision.source,
      score: sourcePriority("decision", decision.source) + keywordBonus,
    });
  }

  for (const milestone of input.milestones) {
    const haystack = `${milestone.key} ${milestone.label}`;
    const keywordBonus = textMatchesKeywords(haystack, keywords) ? 25 : 0;
    candidates.push({
      id: milestone.id,
      kind: "milestone",
      text: milestone.label,
      createdAt: milestone.achievedAt,
      source: milestone.source,
      score: sourcePriority("milestone", milestone.source) + keywordBonus,
    });
  }

  for (const summary of input.summaries) {
    const keywordBonus = textMatchesKeywords(summary.text, keywords) ? 25 : 0;
    candidates.push({
      id: summary.id,
      kind: "summary",
      text: summary.text,
      createdAt: summary.updatedAt || summary.createdAt,
      source: summary.source,
      score: sourcePriority("summary", summary.source) + keywordBonus,
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.createdAt.localeCompare(a.createdAt);
  });

  return candidates.slice(0, max).map((candidate) => ({
    id: candidate.id,
    kind: candidate.kind,
    text: candidate.text,
    createdAt: candidate.createdAt,
    source: candidate.source,
  }));
}
