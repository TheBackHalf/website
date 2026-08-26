import {
  RegistrationConfirmationPageView,
  createRegistrationConfirmationMetadata,
} from "@/components/pages/registration-page-view";

export const metadata = createRegistrationConfirmationMetadata("en");

export default function RegisterConfirmationPage() {
  return <RegistrationConfirmationPageView locale="en" />;
}
