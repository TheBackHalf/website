import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";
import { getChapter2Path } from "@/lib/journey/chapters/paths";

export const metadata: Metadata = createArchitectPageMetadata("es", "journey");

/** Canonical Chapter II entry redirects to Founder Welcome. */
export default function EsArchitectChapter2Page() {
  redirect(getChapter2Path("es", "welcome"));
}
