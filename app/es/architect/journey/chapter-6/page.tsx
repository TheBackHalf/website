import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter6Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

/** Canonical Chapter VI entry redirects to Founder Welcome. */
export default function EsArchitectChapter6Page() {
  redirect(getChapter6Path("es", "welcome"));
}
