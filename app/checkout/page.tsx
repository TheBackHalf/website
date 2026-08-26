import {
  CheckoutPageView,
  createCheckoutMetadata,
} from "@/components/pages/checkout-page-view";

export const metadata = createCheckoutMetadata("en");

export default function CheckoutPage() {
  return <CheckoutPageView locale="en" />;
}
