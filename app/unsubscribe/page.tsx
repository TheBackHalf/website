import {
  UnsubscribePageView,
  createUnsubscribeMetadata,
} from "@/components/pages/unsubscribe-page-view";
import { processUnsubscribeRequest } from "@/lib/email/unsubscribe";

export const metadata = createUnsubscribeMetadata("en");
export const dynamic = "force-dynamic";

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string; status?: string }>;
};

export default async function UnsubscribePage({
  searchParams,
}: UnsubscribePageProps) {
  const params = await searchParams;
  if (!params.token) {
    const status = params.status === "invalid" ? "invalid" : "missing";
    return <UnsubscribePageView locale="en" status={status} />;
  }

  const result = await processUnsubscribeRequest(params.token, "unsubscribe_page");
  if (result.status === "invalid") {
    return <UnsubscribePageView locale="en" status="invalid" />;
  }
  return (
    <UnsubscribePageView
      locale="en"
      status={result.alreadySuppressed ? "already" : "unsubscribed"}
    />
  );
}
