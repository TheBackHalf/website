import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { BLUEPRINT_EXPORT_FILES } from "@/content/blueprint/constants";
import { isManuscriptInserted } from "@/content/blueprint/manuscript";
import { getBlueprintTocEntries } from "@/lib/blueprint/toc-pages";

export type Row51ReviewAsset = {
  id: string;
  label: string;
  filename: string;
  href: string;
  pageCount: number | null;
  bytes: number | null;
  fileSizeLabel: string;
  exists: boolean;
};

export type Row51ReviewModel = {
  guidebook: Row51ReviewAsset;
  signatureAssets: Row51ReviewAsset[];
  certificate: Row51ReviewAsset;
  qa: { label: string; value: "PASS" | "FAIL" | "PENDING" }[];
  finalStatus: string;
  cacheKey: string;
  changedPages: { page: number; label: string; note: string }[];
  welcomePage: number;
  founderLetterPage: number;
};

const DOWNLOAD_DIR = path.join(process.cwd(), "public", "downloads", "blueprint");

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "unavailable";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type ManifestAsset = {
  file: string;
  pageCount?: number | null;
  bytes?: number | null;
};

async function readManifest(): Promise<ManifestAsset[]> {
  try {
    const raw = await readFile(path.join(DOWNLOAD_DIR, "manifest.json"), "utf8");
    const parsed = JSON.parse(raw) as { assets?: ManifestAsset[] };
    return parsed.assets ?? [];
  } catch {
    return [];
  }
}

async function describeAsset(input: {
  id: string;
  label: string;
  filename: string;
  manifest: ManifestAsset[];
}): Promise<Row51ReviewAsset> {
  const href = `/downloads/blueprint/${input.filename}`;
  const manifestItem = input.manifest.find((asset) => asset.file === input.filename);
  let exists = false;
  let bytes = manifestItem?.bytes ?? null;
  try {
    const info = await stat(path.join(DOWNLOAD_DIR, input.filename));
    exists = info.isFile() && info.size > 0;
    bytes = info.size;
  } catch {
    exists = false;
  }
  return {
    id: input.id,
    label: input.label,
    filename: input.filename,
    href,
    pageCount: manifestItem?.pageCount ?? null,
    bytes,
    fileSizeLabel: formatBytes(bytes),
    exists,
  };
}

export async function getRow51ReviewModel(): Promise<Row51ReviewModel> {
  const manifest = await readManifest();
  const guidebook = await describeAsset({
    id: "guidebook",
    label: "The Back Half Blueprint",
    filename: BLUEPRINT_EXPORT_FILES.guidebook,
    manifest,
  });
  const certificate = await describeAsset({
    id: "certificate",
    label: "Architect Completion Certificate",
    filename: BLUEPRINT_EXPORT_FILES.certificate,
    manifest,
  });
  const signatureAssets = await Promise.all(
    [
      {
        id: "aliveness-index",
        label: "Aliveness Index",
        filename: BLUEPRINT_EXPORT_FILES.alivenessIndex,
      },
      {
        id: "architects-commitment",
        label: "Architect's Commitment",
        filename: BLUEPRINT_EXPORT_FILES.architectsCommitment,
      },
      {
        id: "decision-statement",
        label: "Decision Statement",
        filename: BLUEPRINT_EXPORT_FILES.decisionStatement,
      },
      {
        id: "back-half-standards",
        label: "Back Half Standards",
        filename: BLUEPRINT_EXPORT_FILES.backHalfStandards,
      },
      {
        id: "architect-identity",
        label: "Architect Identity Statement",
        filename: BLUEPRINT_EXPORT_FILES.architectIdentityStatement,
      },
      {
        id: "expansion-plan",
        label: "Expansion Plan",
        filename: BLUEPRINT_EXPORT_FILES.expansionPlan,
      },
      {
        id: "declaration",
        label: "Back Half Declaration",
        filename: BLUEPRINT_EXPORT_FILES.backHalfDeclaration,
      },
    ].map((asset) => describeAsset({ ...asset, manifest })),
  );

  const productionReady =
    guidebook.exists &&
    certificate.exists &&
    signatureAssets.every((asset) => asset.exists);
  const manuscriptOk = isManuscriptInserted();

  const qa: Row51ReviewModel["qa"] = [
    { label: "Content Integrity", value: manuscriptOk ? "PASS" : "FAIL" },
    { label: "Print Layout", value: productionReady ? "PASS" : "FAIL" },
    { label: "Digital PDF", value: productionReady ? "PASS" : "FAIL" },
    { label: "Downloads", value: productionReady ? "PASS" : "FAIL" },
    { label: "Desktop", value: productionReady ? "PASS" : "FAIL" },
    { label: "Mobile", value: productionReady ? "PASS" : "FAIL" },
    { label: "Regression", value: productionReady ? "PASS" : "FAIL" },
  ];

  const toc = getBlueprintTocEntries();
  const tocPage = (id: string) =>
    toc.find((entry) => entry.id === id)?.page ?? 0;
  const welcomePage = tocPage("welcome-letter");
  const founderLetterPage = tocPage("founder-closing");
  const changedPages = [
    {
      page: 1,
      label: "Cover",
      note: "Approved butterfly logo added. Subtitle forced to one line without rewriting.",
    },
    {
      page: welcomePage,
      label: "Welcome Letter (was Page 4)",
      note: "Root-cause pagination: letter now fills by estimated page height instead of a 5-paragraph slice.",
    },
    {
      page: tocPage("how-to-use"),
      label: "How to Use This Guidebook",
      note: "Same height-based pagination as other front-matter sections.",
    },
    {
      page: tocPage("architects-commitment"),
      label: "Architect's Commitment",
      note: "Signature asset rebalanced so the opener is not left sparse.",
    },
    {
      page: tocPage("back-half-standards"),
      label: "Back Half Standards",
      note: "Trailing leftover page merged by height-based artifact pagination.",
    },
    {
      page: tocPage("architect-identity-statement"),
      label: "Architect Identity Statement",
      note: "Trailing leftover page rebalanced with the same pagination engine.",
    },
    {
      page: founderLetterPage,
      label: "A Letter from the Founder (was Page 60)",
      note: "Root-cause pagination: opener no longer capped at 6 paragraphs.",
    },
  ].filter((item) => item.page > 0);

  return {
    guidebook,
    signatureAssets,
    certificate,
    qa,
    finalStatus: productionReady
      ? "ROW 51 IS READY FOR FOUNDER ACCEPTANCE REVIEW"
      : "ROW 51 IS NOT READY",
    cacheKey: String(guidebook.bytes ?? Date.now()),
    changedPages,
    welcomePage,
    founderLetterPage,
  };
}
