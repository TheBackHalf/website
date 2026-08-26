import type { Metadata } from "next";
import { LuminaEntryShell } from "@/components/app-shell/lumina-entry-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("es", "lumina");

type PageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function EsArchitectLuminaPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return <LuminaEntryShell locale="es" topic={params.topic ?? null} />;
}
