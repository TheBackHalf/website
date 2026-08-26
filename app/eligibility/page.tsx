import { EligibilityPageView, createEligibilityMetadata } from "@/components/eligibility/eligibility-page-view";

export const metadata = createEligibilityMetadata("en");

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function EligibilityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/register";
  return <EligibilityPageView locale="en" next={next} />;
}
