import { redirect } from "next/navigation";
import {
  LoginPageView,
  createLoginMetadata,
} from "@/components/pages/login-page-view";
import { isGoogleAuthConfigured } from "@/lib/auth/config";
import { getPostLoginRedirect, getSafeRedirectPath } from "@/lib/auth/routing";
import { getServerSession } from "@/lib/auth/session/server";

export const metadata = createLoginMetadata("en");

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getServerSession();
  const params = await searchParams;

  if (session) {
    redirect(
      getSafeRedirectPath(params.next, "en", getPostLoginRedirect("en")),
    );
  }

  return (
    <LoginPageView locale="en" googleAuthEnabled={isGoogleAuthConfigured()} />
  );
}
