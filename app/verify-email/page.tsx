import { redirect } from "next/navigation";
import { VerifyEmailPageView } from "@/components/pages/verify-email-page-view";
import { createVerifyEmailMetadata } from "@/components/pages/registration-page-view";

export const metadata = createVerifyEmailMetadata("en");

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  if (params.token) {
    redirect(
      `/api/auth/verify-email?token=${encodeURIComponent(params.token)}&locale=en`,
    );
  }

  const status = params.status === "expired" ? "expired" : "invalid";
  return <VerifyEmailPageView locale="en" status={status} />;
}
