import { NotEligibleView } from "@/components/eligibility/not-eligible-view";
import { createNotEligibleMetadata } from "@/components/eligibility/eligibility-page-view";

export const metadata = createNotEligibleMetadata("en");

export default function NotEligiblePage() {
  return <NotEligibleView locale="en" />;
}
