import type { Metadata } from "next";
import { SupportKnowledgeBaseView } from "@/components/support/support-knowledge-base-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch support knowledge base — The Back Half",
  robots: { index: false, follow: false },
};

export default function SupportKnowledgeBasePage() {
  return <SupportKnowledgeBaseView />;
}
