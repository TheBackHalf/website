import { readFileSync } from "node:fs";
import {
  auditConsentMoments,
  auditLegalDocuments,
  auditLinkSurfaces,
  aiKimberlyLaunchState,
  getRow32StaticVerdicts,
  row32DefectsCorrected,
  row32FounderJudgmentItems,
  row32RemainingBlockers,
  row32Row60Dependency,
  scanLaunchClaims,
  validationJsonExists,
  validationJsonPath,
  type Row32Verdict,
} from "@/lib/legal/row32-audit";

export type Row32ValidationFile = {
  generatedAt?: string;
  origin?: string;
  readyForFounderAcceptance?: boolean;
  finalStatus?: string;
  verdicts?: Record<string, Row32Verdict>;
  tests?: Array<{ id: string; name: string; result: Row32Verdict; detail: string }>;
  regression?: Record<string, Row32Verdict>;
};

export type Row32ReviewModel = {
  readyForFounderAcceptance: boolean;
  finalStatus: string;
  documents: ReturnType<typeof auditLegalDocuments>;
  linkSurfaces: ReturnType<typeof auditLinkSurfaces>;
  consentMoments: ReturnType<typeof auditConsentMoments>;
  claims: ReturnType<typeof scanLaunchClaims>;
  aiKimberly: string;
  verdicts: Record<string, Row32Verdict>;
  defectsCorrected: string[];
  founderJudgment: string[];
  blockers: string[];
  row60: string;
  tests: NonNullable<Row32ValidationFile["tests"]>;
  regression: Record<string, Row32Verdict>;
  generatedAt: string | null;
  origin: string;
};

function readValidationFile(): Row32ValidationFile | null {
  if (!validationJsonExists()) return null;
  try {
    const raw = readFileSync(validationJsonPath(), "utf8");
    return JSON.parse(raw) as Row32ValidationFile;
  } catch {
    return null;
  }
}

export function getRow32ReviewModel(): Row32ReviewModel {
  const validation = readValidationFile();
  const staticVerdicts = getRow32StaticVerdicts();
  const verdicts = {
    ...staticVerdicts,
    ...(validation?.verdicts ?? {}),
  };
  const ready = validation?.readyForFounderAcceptance === true;
  const blockers = row32RemainingBlockers();

  return {
    readyForFounderAcceptance: ready,
    finalStatus:
      validation?.finalStatus ??
      "ROW 32 IS NOT READY FOR FOUNDER ACCEPTANCE",
    documents: auditLegalDocuments(),
    linkSurfaces: auditLinkSurfaces(),
    consentMoments: auditConsentMoments(),
    claims: scanLaunchClaims(),
    aiKimberly: aiKimberlyLaunchState(),
    verdicts,
    defectsCorrected: row32DefectsCorrected(),
    founderJudgment: row32FounderJudgmentItems(),
    blockers,
    row60: row32Row60Dependency(),
    tests: validation?.tests ?? [],
    regression: validation?.regression ?? {},
    generatedAt: validation?.generatedAt ?? null,
    origin: validation?.origin ?? "http://localhost:3000",
  };
}
