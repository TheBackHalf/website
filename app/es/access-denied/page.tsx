import type { Metadata } from "next";
import { AccessDeniedView } from "@/components/access/access-denied-view";

export const metadata: Metadata = {
  title: "Acceso denegado — The Back Half",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPageEs() {
  return <AccessDeniedView locale="es" />;
}
