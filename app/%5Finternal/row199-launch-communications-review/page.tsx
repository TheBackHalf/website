import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  approvedLaunchEmail,
  proposedPartnerNote,
  row199RemainingBlockers,
} from "@/content/launch/row199-communications";

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

function Card({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-bh-purple/10 bg-white/80 p-5 shadow-sm md:p-8"
    >
      <h2 className="font-serif text-2xl text-bh-ink md:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default async function Row199LaunchCommunicationsReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink md:px-8 md:py-16"
      data-bh-temp-qa="row199-launch-communications-review"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="space-y-4">
          <p className="bh-eyebrow">
            Row 199 · Launch Communications · Final Founder Review
          </p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            Remaining Launch Communications
          </h1>
          <p className="max-w-2xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            The August 31 launch email is Founder-approved and is not sent.
            The only remaining Founder review item is the Partner Note. Founder
            videos, Instagram, TikTok, FAQs, and support scripts are not in this
            review. Row 199 is not Complete.
          </p>
          <p className="font-sans text-sm font-medium text-bh-ink">
            Remaining: {row199RemainingBlockers[0]}
          </p>
        </header>

        <Card id="launch-email" title="1. Final Approved Launch Email">
          <p className="font-sans text-sm font-medium text-emerald-800">
            Founder Approval — Launch Email: {approvedLaunchEmail.founderApproval}
          </p>
          <p className="font-sans text-xs font-light text-bh-muted">
            Not sent. Not scheduled. Not loaded into an email platform.
          </p>
          <dl className="space-y-3 font-sans text-sm font-light">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                Subject
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.subject}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                Preheader
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.preheader}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                From Name
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.fromName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                From Email
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.fromEmail}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                Primary CTA
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.cta}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                Destination
              </dt>
              <dd className="mt-1">{approvedLaunchEmail.destination}</dd>
            </div>
          </dl>
          <article className="max-w-2xl space-y-4 border-t border-bh-purple/10 pt-5 font-sans text-base font-light leading-relaxed">
            {approvedLaunchEmail.bodyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>
              <a
                href={approvedLaunchEmail.destination}
                className="font-medium text-bh-purple underline-offset-4 hover:underline"
              >
                {approvedLaunchEmail.cta}
              </a>
            </p>
            <p>
              {approvedLaunchEmail.signOff.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </article>
        </Card>

        <Card id="partner-note" title="2. Complete Partner Note for Founder Approval">
          <p className="font-sans text-sm font-medium text-amber-900">
            {proposedPartnerNote.status}
          </p>
          <p className="font-sans text-xs font-light text-bh-muted">
            Founder Acceptance: {proposedPartnerNote.founderAcceptance}. Not
            sent. Not a partner campaign. One note only.
          </p>
          <dl className="space-y-3 font-sans text-sm font-light">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                From
              </dt>
              <dd className="mt-1">{proposedPartnerNote.sender}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
                Subject
              </dt>
              <dd className="mt-1">{proposedPartnerNote.subject}</dd>
            </div>
          </dl>
          <pre className="whitespace-pre-wrap border-t border-bh-purple/10 pt-5 font-sans text-base font-light leading-relaxed text-bh-ink">
            {proposedPartnerNote.body}
          </pre>
        </Card>
      </div>
    </main>
  );
}
