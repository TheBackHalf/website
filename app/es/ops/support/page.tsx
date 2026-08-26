import type { Metadata } from "next";
import { SupportOpsView } from "@/components/access/support-ops-view";

export const metadata: Metadata = {
  title: "Operaciones de soporte — The Back Half",
  robots: { index: false, follow: false },
};

export default function SupportOpsPageEs() {
  return <SupportOpsView locale="es" />;
}
