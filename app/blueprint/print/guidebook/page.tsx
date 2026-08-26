import { headers } from "next/headers";
import { GuidebookDocument } from "@/components/blueprint/print/guidebook-document";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { loadArchitectGuidebookResponses } from "@/lib/blueprint/load-architect-guidebook-responses";
import type { BlueprintExerciseResponses } from "@/lib/blueprint/personalize-guidebook";

type GuidebookPrintPageProps = {
  searchParams: Promise<{ variant?: string; architectId?: string }>;
};

function parseVariant(value: string | undefined): BlueprintPrintVariant {
  return value === "digital" ? "digital" : "print";
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
      return trimmed;
    } catch (error) {
      if (error instanceof AccessDeniedError) return null;
      throw error;
    }
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

export default async function GuidebookPrintPage({
  searchParams,
}: GuidebookPrintPageProps) {
  const params = await searchParams;
  const variant = parseVariant(params.variant);
  const architectId = await resolveArchitectId(params.architectId);
  const responses = await loadResponses(architectId);

  return <GuidebookDocument variant={variant} responses={responses} />;
}
