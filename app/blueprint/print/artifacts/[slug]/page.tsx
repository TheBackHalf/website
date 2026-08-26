import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { StandaloneArtifactDocument } from "@/components/blueprint/print/standalone-artifact-document";
import { standaloneArtifactIds } from "@/content/blueprint/document-structure";
import type { StandaloneArtifactId } from "@/content/blueprint/types";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { loadArchitectGuidebookResponses } from "@/lib/blueprint/load-architect-guidebook-responses";
import type { BlueprintExerciseResponses } from "@/lib/blueprint/personalize-guidebook";

type ArtifactPrintPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ architectId?: string }>;
};

function isStandaloneArtifactId(slug: string): slug is StandaloneArtifactId {
  return (standaloneArtifactIds as readonly string[]).includes(slug);
}

async function resolveArchitectId(
  requestedId: string | undefined,
): Promise<string | null> {
  const trimmed = requestedId?.trim() || "";
  const headerList = await headers();
  const printSecret = process.env.BLUEPRINT_PRINT_SECRET?.trim();
  const providedSecret = headerList.get("x-blueprint-print-secret")?.trim();
  const secretOk = Boolean(
    printSecret && providedSecret && printSecret === providedSecret,
  );

  if (trimmed) {
    if (secretOk) return trimmed;
    // Explicit local/QA opt-in only — never set in real production deployments.
    if (process.env.BLUEPRINT_QA_OPEN === "1") {
      return trimmed;
    }
    try {
      const actor = await requireAuthenticatedUser();
      assertSameArchitectOrAdmin(actor, trimmed);
    } catch (error) {
      if (error instanceof AccessDeniedError) return null;
      throw error;
    }
    return trimmed;
  }

  try {
    const actor = await requireAuthenticatedUser();
    return actor.user.id;
  } catch (error) {
    if (error instanceof AccessDeniedError) return null;
    throw error;
  }
}

async function loadResponses(
  architectId: string | null,
): Promise<BlueprintExerciseResponses | null> {
  if (!architectId) return null;
  try {
    return await loadArchitectGuidebookResponses(architectId);
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return standaloneArtifactIds.map((slug) => ({ slug }));
}

export default async function ArtifactPrintPage({
  params,
  searchParams,
}: ArtifactPrintPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  if (!isStandaloneArtifactId(slug)) {
    notFound();
  }

  const personalizesFromJourney =
    slug === "decision-statement" ||
    slug === "back-half-standards" ||
    slug === "architect-identity-statement" ||
    slug === "expansion-plan" ||
    slug === "back-half-declaration";
  const architectId = personalizesFromJourney
    ? await resolveArchitectId(query.architectId)
    : null;
  const responses = personalizesFromJourney
    ? await loadResponses(architectId)
    : null;

  return (
    <StandaloneArtifactDocument artifactId={slug} responses={responses} />
  );
}
