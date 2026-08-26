import {
  ResetPasswordPageView,
  createResetPasswordMetadata,
} from "@/components/pages/reset-password-page-view";
import { inspectPasswordResetTokenAction } from "@/lib/auth/actions/reset-password";

export const metadata = createResetPasswordMetadata("es");

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPageEs({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const inspection = await inspectPasswordResetTokenAction(token);

  return (
    <ResetPasswordPageView
      locale="es"
      token={token}
      tokenStatus={inspection.status}
    />
  );
}
