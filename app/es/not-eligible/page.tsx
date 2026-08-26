import { NotEligibleView } from "@/components/eligibility/not-eligible-view";
import { createNotEligibleMetadata } from "@/components/eligibility/eligibility-page-view";

export const metadata = createNotEligibleMetadata("es");

export default function NotEligiblePageEs() {
  return <NotEligibleView locale="es" />;
}
