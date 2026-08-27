import type { Metadata } from "next";
import { privacyRequestPageCopy } from "@/lib/privacy/copy";
import { verifyPrivacyRequestIdentity } from "@/lib/privacy/verify";

export const metadata: Metadata = {
  title: "Confirm privacy request — The Back Half",
  robots: { index: false, follow: false },
};

export default async function PrivacyVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string; confirmDeletion?: string }>;
}) {
  const params = await searchParams;
  const copy = privacyRequestPageCopy("en");
  const id = params.id?.trim() ?? "";
  const token = params.token?.trim() ?? "";
  const result =
    id && token
      ? await verifyPrivacyRequestIdentity({
          requestId: id,
          token,
          confirmDeletion: params.confirmDeletion === "1",
        })
      : { status: "invalid" as const };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-bh-ink">
      <h1 className="font-display text-4xl font-medium">{copy.verifyTitle}</h1>
      <p className="mt-6 font-sans text-base font-light">
        {result.status === "verified" ? copy.verifySuccess : copy.verifyFailure}
      </p>
      {result.status === "verified" && result.request ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">
          Request {result.request.id} is {result.request.status}.
        </p>
      ) : null}
      {result.status === "verified" && result.request?.type === "DELETION" ? (
        <p className="mt-4 font-sans text-sm text-bh-muted">{copy.verifyRetention}</p>
      ) : null}
    </main>
  );
}
