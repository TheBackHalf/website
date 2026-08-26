import type { Metadata } from "next";
import { AdminOpsView } from "@/components/access/admin-ops-view";

export const metadata: Metadata = {
  title: "Founder / admin operations — The Back Half",
  robots: { index: false, follow: false },
};

export default function AdminOpsPage() {
  return <AdminOpsView locale="en" />;
}
