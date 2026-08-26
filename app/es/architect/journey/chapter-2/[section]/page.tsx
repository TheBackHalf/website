import type { Metadata } from "next";
import { Chapter2Page } from "@/components/journey/chapter-2/chapter-2-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter2SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function EsArchitectChapter2SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 2, section);
  return (
    <Chapter2Page locale="es" sectionId={parseChapter2SectionParam(section)} />
  );
}
