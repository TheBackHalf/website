import {
  RegistrationPageView,
  createRegistrationMetadata,
} from "@/components/pages/registration-page-view";
import { isGoogleAuthConfigured } from "@/lib/auth/config";

export const metadata = createRegistrationMetadata("en");

export default function RegisterPage() {
  return (
    <RegistrationPageView
      locale="en"
      googleAuthEnabled={isGoogleAuthConfigured()}
    />
  );
}
