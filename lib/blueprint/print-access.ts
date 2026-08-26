/**
 * Shared Architect identity resolution for Blueprint print pages.
 * Print secret and BLUEPRINT_QA_OPEN are the same gates used by guidebook/artifacts.
 */

import { headers } from "next/headers";
import {
  AccessDeniedError,
  assertSameArchitectOrAdmin,
  requireAuthenticatedUser,
} from "@/lib/auth/access";

export async function resolveBlueprintPrintArchitectId(
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
