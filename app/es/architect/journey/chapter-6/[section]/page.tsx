import type { Metadata } from "next";
import { Chapter6Page } from "@/components/journey/chapter-6/chapter-6-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter6SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function EsArchitectChapter6SectionPage({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 6, section);
  return (
    <Chapter6Page locale="es" sectionId={parseChapter6SectionParam(section)} />
  );
}
