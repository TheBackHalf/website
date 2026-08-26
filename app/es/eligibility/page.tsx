import { EligibilityPageView, createEligibilityMetadata } from "@/components/eligibility/eligibility-page-view";

export const metadata = createEligibilityMetadata("es");

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function EligibilityPageEs({ searchParams }: PageProps) {
  const params = await searchParams;
  const next =
    typeof params.next === "string" &&
    params.next.startsWith("/es") &&
    !params.next.startsWith("//")
      ? params.next
      : "/es/register";
  return <EligibilityPageView locale="es" next={next} />;
}
