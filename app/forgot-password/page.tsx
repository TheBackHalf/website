import {
  ForgotPasswordPageView,
  createForgotPasswordMetadata,
} from "@/components/pages/forgot-password-page-view";

export const metadata = createForgotPasswordMetadata("en");

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageView locale="en" />;
}
