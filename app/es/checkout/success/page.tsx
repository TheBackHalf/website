import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutSuccessPageView } from "@/components/checkout/checkout-success-page-view";
import { getDictionary, translate } from "@/content/i18n/get-dictionary";
import { getLoginPath } from "@/lib/auth/routing";
import {
  checkoutSuccessLoginNext,
  checkoutSuccessRequiresLogin,
  verifyCheckoutSuccess,
} from "@/lib/checkout/verify-success";
import { createLocalizedPageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  searchParams: Promise<{ session_id?: string; offer?: string }>;
};

export const metadata: Metadata = createLocalizedPageMetadata({
  title: translate("es", getDictionary("es").metadata.checkoutSuccess.title),
  description: translate(
    "es",
    getDictionary("es").metadata.checkoutSuccess.description,
  ),
  path: "/checkout/success",
  locale: "es",
});

export default async function EsCheckoutSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const result = await verifyCheckoutSuccess(params.session_id);

  if (checkoutSuccessRequiresLogin(result)) {
    redirect(
      `${getLoginPath("es")}?next=${encodeURIComponent(
        checkoutSuccessLoginNext("es", params.session_id),
      )}`,
    );
  }

  return <CheckoutSuccessPageView locale="es" result={result} />;
}
