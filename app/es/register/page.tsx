import {
  RegistrationPageView,
  createRegistrationMetadata,
} from "@/components/pages/registration-page-view";
import { isGoogleAuthConfigured } from "@/lib/auth/config";

export const metadata = createRegistrationMetadata("es");

export default function RegisterPageEs() {
  return (
    <RegistrationPageView
      locale="es"
      googleAuthEnabled={isGoogleAuthConfigured()}
    />
  );
}
