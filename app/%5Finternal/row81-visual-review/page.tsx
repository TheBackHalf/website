import { headers } from "next/headers";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function assertLocalhostOnly(hostHeader: string | null) {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0] ?? "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  ) {
    return;
  }
  notFound();
}

export default async function Row81VisualReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  return (
    <main
      className="h-screen bg-bh-cream"
      data-bh-temp-qa="row81-visual-review"
    >
      <iframe
        title="Row 81 Founder Visual Review Pack"
        src="/_internal/row81-visual-review/pack"
        className="h-full w-full border-0"
      />
    </main>
  );
}
