import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter1Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

/** Canonical Chapter I entry redirects to Founder Welcome. */
export default function EsArchitectChapter1Page() {
  redirect(getChapter1Path("es", "welcome"));
}
