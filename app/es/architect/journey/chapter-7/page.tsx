import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter7Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

export default function EsArchitectChapter7Page() {
  redirect(getChapter7Path("es", "welcome"));
}
