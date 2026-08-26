import type { Metadata } from "next";
import { SupportOpsView } from "@/components/access/support-ops-view";

export const metadata: Metadata = {
  title: "Support operations — The Back Half",
  robots: { index: false, follow: false },
};

export default function SupportOpsPage() {
  return <SupportOpsView locale="en" />;
}
