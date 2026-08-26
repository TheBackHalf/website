import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  FOUNDER_AGE_DECISION,
  LAUNCH_ELIGIBILITY_DECISION,
  MINIMUM_PARTICIPANT_AGE,
} from "@/lib/eligibility/policy";
import { getAgeEligibilityLegalCopy } from "@/content/legal/age-eligibility";

export type Row60TestRow = {
  id: string;
  name: string;
  result: "PASS" | "FAIL";
  detail: string;
};

export type Row60ValidationReport = {
  generatedAt: string;
  origin: string;
  minimumParticipantAge: number;
  launchEligibilityDecision: string;
  founderAgeDecision: string;
  tests: Row60TestRow[];
  summary: { pass: number; fail: number; total: number };
  categories: Record<string, "PASS" | "FAIL">;
  failures: string[];
  overall: "PASS" | "FAIL";
};

export async function getRow60ReviewModel(): Promise<{
  report: Row60ValidationReport | null;
  policy: {
    minimumParticipantAge: number;
    launchEligibilityDecision: string;
    founderAgeDecision: string;
  };
  legal: Array<{ slug: string; heading: string; paragraphs: readonly string[] }>;
}> {
  let report: Row60ValidationReport | null = null;
  try {
    const raw = await readFile(
      path.join(process.cwd(), "ops/fab-5/runs/row-60-age-eligibility-validation.json"),
      "utf8",
    );
    report = JSON.parse(raw) as Row60ValidationReport;
  } catch {
    report = null;
  }

  const slugs = [
    "privacy-policy",
    "terms-of-use",
    "participant-agreement",
    "membership-agreement",
    "ai-disclosure",
  ] as const;

  return {
    report,
    policy: {
      minimumParticipantAge: MINIMUM_PARTICIPANT_AGE,
      launchEligibilityDecision: LAUNCH_ELIGIBILITY_DECISION,
      founderAgeDecision: FOUNDER_AGE_DECISION,
    },
    legal: slugs.map((slug) => {
      const copy = getAgeEligibilityLegalCopy(slug, "en");
      return {
        slug,
        heading: copy?.heading ?? slug,
        paragraphs: copy?.paragraphs ?? [],
      };
    }),
  };
}
