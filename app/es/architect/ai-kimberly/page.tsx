import type { Metadata } from "next";
import { AiKimberlyEntryShell } from "@/components/app-shell/ai-kimberly-entry-shell";
import { createArchitectPageMetadata } from "@/lib/app-shell/metadata";

export const metadata: Metadata = createArchitectPageMetadata(
  "es",
  "aiKimberly",
);

export default function EsArchitectAiKimberlyPage() {
  return <AiKimberlyEntryShell locale="es" />;
}
