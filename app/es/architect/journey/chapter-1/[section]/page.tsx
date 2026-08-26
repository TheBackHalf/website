import type { Metadata } from "next";
import { Chapter1Page } from "@/components/journey/chapter-1/chapter-1-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter1SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function EsArchitectChapter1SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 1, section);
  return (
    <Chapter1Page locale="es" sectionId={parseChapter1SectionParam(section)} />
  );
}
