/**
 * Chapter downloadable resources available in the project.
 * Only wire approved assets that exist — do not invent worksheet PDFs.
 */

import { getBlueprintDownloadAssets } from "@/lib/blueprint/downloads";

export type Chapter1DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter I. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter I work. */
export function getChapter1DownloadAssets(): Chapter1DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter1DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation: "Includes Chapter I — The Awakening in the Blueprint guidebook.",
    });
  }

  const alivenessIndex = byId.get("aliveness-index");
  if (alivenessIndex) {
    selected.push({
      id: alivenessIndex.id,
      label: alivenessIndex.label,
      href: alivenessIndex.href,
      relation:
        "Aliveness Index resource completed alongside Chapter I / Awakening.",
    });
  }

  return selected;
}

export type Chapter2DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter II. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter II work. */
export function getChapter2DownloadAssets(): Chapter2DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter2DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation: "Includes Chapter II — The Mirror in the Blueprint guidebook.",
    });
  }

  return selected;
}

export type Chapter3DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter III. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter III work. */
export function getChapter3DownloadAssets(): Chapter3DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter3DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation:
        "Includes Chapter III — The Decision in the Blueprint guidebook.",
    });
  }

  const decisionStatement = byId.get("decision-statement");
  if (decisionStatement) {
    selected.push({
      id: decisionStatement.id,
      label: decisionStatement.label,
      href: decisionStatement.href,
      relation:
        "Decision Statement resource completed alongside Chapter III practice.",
    });
  }

  return selected;
}

export type Chapter4DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter IV. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter IV work. */
export function getChapter4DownloadAssets(): Chapter4DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter4DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation:
        "Includes Chapter IV — The Standards in the Blueprint guidebook.",
    });
  }

  const backHalfStandards = byId.get("back-half-standards");
  if (backHalfStandards) {
    selected.push({
      id: backHalfStandards.id,
      label: backHalfStandards.label,
      href: backHalfStandards.href,
      relation:
        "Back Half Standards resource completed alongside Chapter IV practice.",
    });
  }

  return selected;
}

export type Chapter5DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter V. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter V work. */
export function getChapter5DownloadAssets(): Chapter5DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter5DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation:
        "Includes Chapter V — Becoming the Architect in the Blueprint guidebook.",
    });
  }

  const architectIdentity = byId.get("architect-identity");
  if (architectIdentity) {
    selected.push({
      id: architectIdentity.id,
      label: architectIdentity.label,
      href: architectIdentity.href,
      relation:
        "Architect Identity Statement resource completed alongside Chapter V practice.",
    });
  }

  return selected;
}

export type Chapter6DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter VI. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter VI work. */
export function getChapter6DownloadAssets(): Chapter6DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter6DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation:
        "Includes Chapter VI — Expansion in the Blueprint guidebook.",
    });
  }

  const expansionPlan = byId.get("expansion-plan");
  if (expansionPlan) {
    selected.push({
      id: expansionPlan.id,
      label: expansionPlan.label,
      href: expansionPlan.href,
      relation:
        "Expansion Plan resource completed alongside Chapter VI practice.",
    });
  }

  return selected;
}

export type Chapter7DownloadAsset = {
  id: string;
  label: string;
  href: string;
  /** Why this maps to Chapter VII / Journey completion. */
  relation: string;
};

/** Approved Blueprint downloads that support Chapter VII and Journey completion. */
export function getChapter7DownloadAssets(
  journeyComplete = false,
): Chapter7DownloadAsset[] {
  const all = getBlueprintDownloadAssets();
  const byId = new Map(all.map((asset) => [asset.id, asset]));

  const selected: Chapter7DownloadAsset[] = [];

  const guidebook = byId.get("guidebook");
  if (guidebook) {
    selected.push({
      id: guidebook.id,
      label: guidebook.label,
      href: guidebook.href,
      relation:
        "Includes Chapter VII — The Beginning in the Blueprint guidebook.",
    });
  }

  const declaration = byId.get("declaration");
  if (declaration) {
    selected.push({
      id: declaration.id,
      label: declaration.label,
      href: declaration.href,
      relation:
        "Back Half Declaration resource completed alongside Chapter VII practice.",
    });
  }

  const portfolio = byId.get("portfolio");
  if (portfolio) {
    selected.push({
      id: portfolio.id,
      label: portfolio.label,
      href: portfolio.href,
      relation:
        "Assembled Architect Portfolio of completed artifacts, Architect's Commitment, Aliveness Index priorities, Decision Statement, and Expansion Plan.",
    });
  }

  if (journeyComplete) {
    const certificate = byId.get("certificate");
    if (certificate) {
      selected.push({
        id: certificate.id,
        label: certificate.label,
        href: certificate.href,
        relation:
          "Architect Completion Certificate available after Journey completion.",
      });
    }
  }

  return selected;
}
