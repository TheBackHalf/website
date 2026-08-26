import {
  RegistrationConfirmationPageView,
  createRegistrationConfirmationMetadata,
} from "@/components/pages/registration-page-view";

export const metadata = createRegistrationConfirmationMetadata("es");

export default function RegisterConfirmationPageEs() {
  return <RegistrationConfirmationPageView locale="es" />;
}
