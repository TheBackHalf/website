import {
  ForgotPasswordPageView,
  createForgotPasswordMetadata,
} from "@/components/pages/forgot-password-page-view";

export const metadata = createForgotPasswordMetadata("es");

export default function ForgotPasswordPageEs() {
  return <ForgotPasswordPageView locale="es" />;
}
