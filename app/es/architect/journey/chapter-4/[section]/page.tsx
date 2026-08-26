import type { Metadata } from "next";
import { Chapter4Page } from "@/components/journey/chapter-4/chapter-4-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter4SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter4SectionPageEs({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 4, section);
  return (
    <Chapter4Page locale="es" sectionId={parseChapter4SectionParam(section)} />
  );
}
