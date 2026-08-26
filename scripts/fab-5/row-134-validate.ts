/**
 * Mechanical Row 134 validation — Architect Portfolio assembly/download.
 * Does not mark the Command Center row Complete.
 * Does not fabricate Founder acceptance.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";
import {
  assembleArchitectPortfolio,
  ARCHITECT_PORTFOLIO_ASSET_ID,
  ARCHITECT_PORTFOLIO_HREF,
  ARCHITECT_PORTFOLIO_LABEL,
  portfolioHasRequiredRoles,
  PORTFOLIO_CONTENT_SLOTS,
} from "@/lib/blueprint/portfolio";
import { exerciseResponseKey } from "@/lib/blueprint/personalize-guidebook";
import type { AlivenessResultsSnapshot } from "@/lib/journey/onboarding/types";
import { BLUEPRINT_EXPORT_FILES, BLUEPRINT_PRINT_ROUTES } from "@/content/blueprint/constants";

type Verdict = "PASS" | "FAIL";

function mark(pass: boolean): Verdict {
  return pass ? "PASS" : "FAIL";
}

async function readSource(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

function alivenessFixture(): AlivenessResultsSnapshot {
  return {
    domainScores: [
      { domainId: "purpose", name: "Purpose", score: 22, maxScore: 25 },
      { domainId: "health", name: "Health", score: 10, maxScore: 25 },
    ],
    total: 32,
    maxTotal: 225,
    highestDomains: ["purpose"],
    lowestDomains: ["health"],
    completedAt: "2026-08-26T00:00:00.000Z",
  };
}

async function main() {
  const failures: string[] = [];
  const tests: Array<{
    id: string;
    name: string;
    result: Verdict;
    detail: string;
  }> = [];

  function push(id: string, name: string, pass: boolean, detail: string) {
    tests.push({ id, name, result: mark(pass), detail });
    if (!pass) failures.push(`${id}: ${name} — ${detail}`);
  }

  push(
    "roles",
    "Portfolio slots include manifesto, Blueprint priorities, decisions, plan, and artifacts",
    portfolioHasRequiredRoles(),
    PORTFOLIO_CONTENT_SLOTS.map((slot) => `${slot.id}:${slot.role}`).join(", "),
  );

  const empty = assembleArchitectPortfolio();
  push(
    "empty-manifesto",
    "Architect's Commitment (manifesto) is always included",
    empty.sections.find((section) => section.role === "manifesto")?.status ===
      "included",
    `completedCount=${empty.completedCount}`,
  );
  push(
    "empty-not-final",
    "Empty portfolio is not marked final",
    empty.isFinal === false && empty.completedCount === 1,
    `isFinal=${empty.isFinal} completed=${empty.completedCount}/${empty.totalCount}`,
  );
  push(
    "empty-awaiting",
    "Priorities, decisions, plan, and remaining artifacts await work when empty",
    empty.sections
      .filter((section) => section.role !== "manifesto")
      .every((section) => section.status === "awaiting_work"),
    empty.sections
      .map((section) => `${section.id}:${section.status}`)
      .join(", "),
  );

  const populated = assembleArchitectPortfolio({
    firstName: "Jordan",
    aliveness: alivenessFixture(),
    responses: {
      firstName: "Jordan",
      byExerciseKey: {
        [exerciseResponseKey("chapter-3-decision", 1)]: [
          "Beginning today, I choose intention.",
        ],
        [exerciseResponseKey("chapter-4-standards", 0)]: [
          "Time: Protect mornings.",
        ],
        [exerciseResponseKey("chapter-5-architect", 1)]: [
          "I am an Architect who lives with intention.",
        ],
        [exerciseResponseKey("chapter-6-expansion", 1)]: [
          "For yourself: Keep learning.",
          "For someone else: Listen fully.",
          "For the world around you: Contribute locally.",
        ],
        [exerciseResponseKey("chapter-7-beginning", 1)]: [
          "Beginning today I live as an Architect.",
          "Jordan",
          "2026-08-26",
        ],
      },
    },
  });

  push(
    "populated-final",
    "Completed artifacts, priorities, decisions, and plan assemble into a final portfolio",
    populated.isFinal &&
      populated.completedCount === populated.totalCount &&
      populated.architectName === "Jordan" &&
      populated.sections.every((section) => section.status === "included"),
    `completed=${populated.completedCount}/${populated.totalCount} name=${populated.architectName}`,
  );
  push(
    "priorities-fill",
    "Blueprint priorities include highest and lowest domain names from Aliveness results",
    populated.sections
      .find((section) => section.id === "blueprint-priorities")
      ?.fillLines.some((line) => line.includes("Purpose")) === true &&
      populated.sections
        .find((section) => section.id === "blueprint-priorities")
        ?.fillLines.some((line) => line.includes("Health")) === true,
    populated.sections.find((section) => section.id === "blueprint-priorities")
      ?.fillLines.join(" | ") ?? "none",
  );
  push(
    "decisions-fill",
    "Decision Statement fill is assembled from Chapter III practice",
    populated.sections.find((section) => section.role === "decisions")
      ?.fillLines.length === 1,
    populated.sections
      .find((section) => section.role === "decisions")
      ?.fillLines.join(" | ") ?? "none",
  );
  push(
    "plan-fill",
    "Expansion Plan fill is assembled from Chapter VI practice",
    (populated.sections.find((section) => section.role === "plan")?.fillLines
      .length ?? 0) >= 3,
    populated.sections
      .find((section) => section.role === "plan")
      ?.fillLines.join(" | ") ?? "none",
  );

  const assets = getBlueprintDownloadAssets();
  const portfolioAsset = assets.find(
    (asset) => asset.id === ARCHITECT_PORTFOLIO_ASSET_ID,
  );
  push(
    "download-asset",
    "Architect Portfolio is the first Architect Resources download",
    assets[0]?.id === ARCHITECT_PORTFOLIO_ASSET_ID &&
      portfolioAsset?.href === ARCHITECT_PORTFOLIO_HREF &&
      portfolioAsset?.label === ARCHITECT_PORTFOLIO_LABEL &&
      portfolioAsset?.filename === BLUEPRINT_EXPORT_FILES.portfolio,
    JSON.stringify(portfolioAsset ?? null),
  );

  const routeSrc = await readSource(
    "app/api/architect/blueprint/portfolio/route.ts",
  );
  const rendererSrc = await readSource(
    "lib/blueprint/render-authenticated-pdf.ts",
  );
  push(
    "auth-required",
    "Portfolio download requires authenticated Architect session",
    rendererSrc.includes("requireAuthenticatedUser") &&
      routeSrc.includes("renderAuthenticatedBlueprintPdf") &&
      routeSrc.includes("ARCHITECT_PORTFOLIO_ASSET_ID"),
    "route uses renderAuthenticatedBlueprintPdf + requireAuthenticatedUser",
  );

  const printPageSrc = await readSource(
    "app/blueprint/print/portfolio/page.tsx",
  );
  push(
    "print-access",
    "Print page uses the same Architect/print-secret access gate as other Blueprint PDFs",
    printPageSrc.includes("resolveBlueprintPrintArchitectId"),
    "resolveBlueprintPrintArchitectId present",
  );

  const documentSrc = await readSource(
    "components/blueprint/print/portfolio-document.tsx",
  );
  push(
    "no-marketing-manifesto",
    "Portfolio document does not import homepage marketing manifesto copy",
    !documentSrc.includes("home-page-view") &&
      !documentSrc.includes("bh-manifesto-line") &&
      documentSrc.includes("getArchitectsCommitmentChunks") &&
      documentSrc.includes("PortfolioPriorities") &&
      documentSrc.includes("decision-statement") &&
      documentSrc.includes("expansion-plan"),
    "Uses Architect's Commitment + approved artifacts only",
  );

  push(
    "print-route",
    "Print and filename constants are registered",
    BLUEPRINT_PRINT_ROUTES.portfolio === "/blueprint/print/portfolio" &&
      BLUEPRINT_EXPORT_FILES.portfolio === "back-half-architect-portfolio.pdf",
    `${BLUEPRINT_PRINT_ROUTES.portfolio} / ${BLUEPRINT_EXPORT_FILES.portfolio}`,
  );

  const resourcesSrc = await readSource(
    "components/app-shell/resources-shell.tsx",
  );
  push(
    "resources-ui",
    "Architect Resources features the assembled portfolio download",
    resourcesSrc.includes("portfolioHeading") &&
      resourcesSrc.includes("portfolioDownload") &&
      resourcesSrc.includes('asset.id === "portfolio"'),
    "resources-shell features portfolio section",
  );

  const chapter7Src = await readSource("lib/journey/chapters/downloads.ts");
  push(
    "chapter-7",
    "Chapter VII resources include the assembled Architect Portfolio",
    chapter7Src.includes('byId.get("portfolio")'),
    "getChapter7DownloadAssets includes portfolio",
  );

  push(
    "no-founder-complete",
    "Validation does not mark Founder acceptance or Command Center Complete",
    true,
    "acceptanceState remains open; Founder acceptance stays with Kimberly Walker (human)",
  );

  const result = {
    generatedAt: new Date().toISOString(),
    workId: "al-134",
    row: 134,
    deliverable: "Build Back Half Portfolio",
    owner: "imani",
    founderAcceptance: null,
    markedComplete: false,
    mechanicalPass: failures.length === 0,
    tests,
    failures,
    notes: [
      "Portfolio assembles Architect's Commitment, Aliveness Index highest/lowest, Decision Statement, Expansion Plan, and remaining completed artifacts.",
      "Download is authenticated. Command Center row remains open for Founder acceptance.",
    ],
  };

  const outDir = path.join(
    process.cwd(),
    "ops/fab-5/runs/aos-engineering-status",
  );
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "al-134.json");
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  const runPath = path.join(
    process.cwd(),
    "ops/fab-5/runs/row-134-architect-portfolio-validation.json",
  );
  await writeFile(runPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  if (failures.length) {
    console.error("ROW 134 VALIDATION FAILED");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("ROW 134 VALIDATION PASSED");
  console.log(`wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
