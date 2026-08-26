import type { Metadata } from "next";
import { Chapter5Page } from "@/components/journey/chapter-5/chapter-5-page";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { redirectIfLegacyTeachingRoute } from "@/lib/journey/chapters/legacy-teaching-route";
import { parseChapter5SectionParam } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function ArchitectChapter5SectionPageEs({
  params,
}: PageProps) {
  const { section } = await params;
  redirectIfLegacyTeachingRoute("es", 5, section);
  return (
    <Chapter5Page locale="es" sectionId={parseChapter5SectionParam(section)} />
  );
}
