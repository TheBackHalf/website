import type { Metadata } from "next";
import { ResourcesShell } from "@/components/app-shell/resources-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata("es", "resources");

export default function EsArchitectResourcesPage() {
  return <ResourcesShell locale="es" />;
}
