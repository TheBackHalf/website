import type { Metadata } from "next";
import { AccessDeniedView } from "@/components/access/access-denied-view";

export const metadata: Metadata = {
  title: "Access denied — The Back Half",
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return <AccessDeniedView locale="en" />;
}
