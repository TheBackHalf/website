import type { Metadata } from "next";
import { LuminaEntryShell } from "@/components/app-shell/lumina-entry-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("en", "lumina");

type PageProps = {
  searchParams: Promise<{ topic?: string }>;
};

export default async function ArchitectLuminaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <LuminaEntryShell locale="en" topic={params.topic ?? null} />;
}
