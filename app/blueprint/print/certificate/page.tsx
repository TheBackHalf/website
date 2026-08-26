import { headers } from "next/headers";
import { CertificateLayout } from "@/components/blueprint/print/certificate-layout";
import { PrintDocumentShell } from "@/components/blueprint/print/print-document-shell";
import { getBlueprintManuscript } from "@/content/blueprint/manuscript";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getAuthStore } from "@/lib/auth/store";
import { getChapter7Store } from "@/lib/journey/chapters/chapter-7-store";

type CertificatePrintPageProps = {
  searchParams: Promise<{ architectId?: string }>;
};

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

function formatArchitectName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function formatCompletionDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function CertificatePrintPage({
  searchParams,
}: CertificatePrintPageProps) {
  const query = await searchParams;
  const manuscript = getBlueprintManuscript();
  const architectId = await resolveArchitectId(query.architectId);

  let architectName = "";
  let completionDate = "";

  if (architectId) {
    const [user, chapter7] = await Promise.all([
      getAuthStore().findUserById(architectId),
      getChapter7Store().findChapter7ForUser(architectId),
    ]);
    if (chapter7?.status === "completed") {
      architectName = formatArchitectName(user?.firstName, user?.lastName);
      completionDate = formatCompletionDate(chapter7.completedAt);
    }
  }

  return (
    <PrintDocumentShell
      title="The Back Half — Architect Completion Certificate"
    >
      <CertificateLayout
        manuscript={manuscript?.certificate ?? null}
        architectName={architectName || null}
        completionDate={completionDate || null}
      />
    </PrintDocumentShell>
  );
}
