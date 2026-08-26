import type { Metadata } from "next";
import { AdminOpsView } from "@/components/access/admin-ops-view";

export const metadata: Metadata = {
  title: "Operaciones Founder / admin — The Back Half",
  robots: { index: false, follow: false },
};

export default function AdminOpsPageEs() {
  return <AdminOpsView locale="es" />;
}
