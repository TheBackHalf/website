import {
  CheckoutPageView,
  createCheckoutMetadata,
} from "@/components/pages/checkout-page-view";

export const metadata = createCheckoutMetadata("es");

export default function EsCheckoutPage() {
  return <CheckoutPageView locale="es" />;
}
