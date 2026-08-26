import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getRow33ReviewModel } from "@/lib/marketing-claims/row33-review";
import type { Row33Status } from "@/lib/marketing-claims/campaign-audit";

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

function tone(value: string) {
  if (value === "PASS" || value === "CORRECTED") return "text-emerald-800";
  if (value === "FAIL") return "text-red-800";
  return "text-amber-900";
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-bh-purple/10 py-2">
      <span className="font-sans text-sm font-light text-bh-muted">{label}</span>
      <span className={`text-right font-sans text-sm font-medium ${tone(value)}`}>
        {value}
      </span>
    </li>
  );
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

function mediaUrl(file: string) {
  const name = file.split(/[/\\]/).pop();
  return `/_internal/row33-marketing-claims-review/media/${name}`;
}

export default async function Row33MarketingClaimsReviewPage() {
  const headerStore = await headers();
  assertLocalhostOnly(
    headerStore.get("host") ?? headerStore.get("x-forwarded-host"),
  );
  const model = getRow33ReviewModel();

  return (
    <main
      className="min-h-screen bg-bh-cream px-4 py-10 text-bh-ink md:px-8 md:py-16"
      data-bh-temp-qa="row33-marketing-claims-review"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="space-y-4">
          <p className="bh-eyebrow">Row 33 · Founder Review</p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {model.title}
          </h1>
          <p className="max-w-3xl font-sans text-base font-light leading-relaxed text-bh-muted md:text-lg">
            Version {model.version}. Effective date: {model.effectiveDate}.
            Campaign audited {model.campaignAuditDate}. Status:{" "}
            {model.status.replaceAll("_", " ")}. Founder Acceptance:{" "}
            {model.founderAcceptance}. Launch Roadmap and Founder Notes were
            not changed.
          </p>
          <p className={`font-sans text-sm font-medium ${tone(model.readyForFounderAcceptance ? "PASS" : "FAIL")}`}>
            {model.finalStatus}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 font-sans text-xs tracking-wide uppercase text-bh-muted">
          {[
            ["standard", "Standard"],
            ["testimonials", "Testimonials"],
            ["ai-founder", "AI Founder"],
            ["social", "Social"],
            ["campaign", "Campaign"],
            ["website", "Website"],
            ["product", "Product"],
            ["defects", "Defects"],
            ["judgment", "Judgment"],
            ["blockers", "Blockers"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-full border border-bh-purple/15 px-3 py-1 hover:border-bh-purple/40"
            >
              {label}
            </a>
          ))}
        </nav>

        <Card id="standard" title="A. Standard summary">
          <p className="font-sans text-sm font-light text-bh-muted">
            Positioning: {model.brand.positioning}. Audience: {model.brand.audience}{" "}
            Launch date: {model.brand.launchDate}. Architect Community:{" "}
            {model.brand.communityComingCopy}. Active launch channels:{" "}
            {model.brand.channels.join(", ")}. LinkedIn is a future
            enhancement. Not X.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="font-sans text-sm font-medium">Permitted</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 font-sans text-sm font-light">
                {model.permitted.brandPhilosophy.map((item) => (
                  <li key={item}>{item}</li>
                ))}
                <li>Experience language such as {model.permitted.experience.join("; ")}.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-sm font-medium">Conditional</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 font-sans text-sm font-light">
                {model.conditional.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-sm font-medium">Prohibited</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 font-sans text-sm font-light">
                {model.prohibited.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-sans text-sm font-medium">Health / wellness</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 font-sans text-sm font-light">
                {model.health.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-sans text-sm font-medium">Financial / career</h3>
              <ul className="mt-2 list-disc space-y-2 pl-4 font-sans text-sm font-light">
                {model.finance.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        <Card id="testimonials" title="B. Testimonial standard">
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.testimonials.authenticity.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>{model.testimonials.exceptionalResults}</li>
            <li>{model.testimonials.aiSynthetic}</li>
            <li>{model.testimonials.launchRule}</li>
          </ul>
          <p className="font-sans text-sm font-medium">Permission record (internal only)</p>
          <p className="font-sans text-sm font-light text-bh-muted">
            {model.testimonials.permissionFields.join(" · ")}
          </p>
          <p className="font-sans text-sm font-medium">Endorsements / material connections</p>
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.endorsements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="ai-founder" title="C. AI Founder standard">
          <p className="font-sans text-sm font-light">
            Approved identification when the surface is the AI Founder:{" "}
            <strong>{model.aiFounder.identity}</strong>. Human Founder biography
            remains {model.aiFounder.humanFounder}.
          </p>
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.aiFounder.requirement.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="font-sans text-sm font-light">
            <strong>Compliant:</strong> {model.aiFounder.compliantExample}
          </p>
          <p className="font-sans text-sm font-light">
            <strong>Noncompliant:</strong> {model.aiFounder.noncompliantExample}
          </p>
          <p className="font-sans text-sm font-medium">Other synthetic media</p>
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.synthetic.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="social" title="D. Social media standard">
          <p className="font-sans text-sm font-light text-bh-muted">
            Instagram and TikTok are the active August 28–31 launch channels.
            LinkedIn assets are preserved as a future enhancement. Replies follow
            the same rules and Row 83.
          </p>
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.social.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="campaign" title="E. August 28–31 campaign audit">
          <p className="font-sans text-sm font-light text-bh-muted">
            Twelve execution records. LinkedIn is archived and not required for
            launch. Approved Instagram and TikTok copy was not rewritten. MAGICAL
            IS POSSIBLE remains.
          </p>
          <div className="space-y-8">
            {model.campaign.map((row) => (
              <article
                key={row.assetId}
                className="border-t border-bh-purple/10 pt-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl">
                    {row.assetId} · {row.platform} · {row.date}
                    {row.launchRequired === false
                      ? " · archived / not required for launch"
                      : ""}
                  </h3>
                  <span className={`font-sans text-sm font-medium ${tone(row.status)}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mt-2 font-sans text-sm font-medium">{row.message}</p>
                <dl className="mt-3 grid gap-2 font-sans text-sm font-light md:grid-cols-2">
                  <div>
                    <dt className="text-bh-muted">Claim type</dt>
                    <dd>{row.claimType}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Permissible</dt>
                    <dd>{row.permissible ? "Yes" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Substantiation</dt>
                    <dd>{row.substantiationRequired}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Testimonial / endorsement</dt>
                    <dd>{row.testimonialEndorsement}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">AI disclosure required</dt>
                    <dd>{row.aiDisclosureRequired}</dd>
                  </div>
                  <div>
                    <dt className="text-bh-muted">Disclosure present</dt>
                    <dd>{row.disclosurePresent}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-bh-muted">Product-reality match</dt>
                    <dd>{row.productRealityMatch}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-bh-muted">Correction required</dt>
                    <dd>{row.correctionRequired}</dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-bh-muted">On-screen / caption</dt>
                    <dd className="whitespace-pre-wrap">{row.onScreenCopy}</dd>
                    <dd className="mt-2 whitespace-pre-wrap text-bh-muted">
                      {row.caption}
                    </dd>
                    <dd className="mt-2">
                      CTA: {row.cta} → {row.destination}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {row.previewFiles.map((file) => {
                    const name = file.split(/[/\\]/).pop() ?? file;
                    const isVideo = name.endsWith(".mp4");
                    return (
                      <figure key={file} className="overflow-hidden rounded-lg bg-bh-ink/5">
                        {isVideo ? (
                          <video
                            controls
                            className="h-40 w-full object-cover"
                            src={mediaUrl(file)}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={name}
                            className="h-40 w-full object-cover"
                            src={mediaUrl(file)}
                          />
                        )}
                        <figcaption className="truncate px-2 py-1 font-sans text-[10px] text-bh-muted">
                          {name}
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card id="website" title="F. Website claim audit">
          <ul className="space-y-4">
            {model.website.map((row) => (
              <li key={row.surface} className="border-b border-bh-purple/10 pb-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="font-sans text-sm">{row.surface}</strong>
                  <span className={`font-sans text-sm font-medium ${tone(row.status as Row33Status)}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 font-sans text-sm font-light">{row.claim}</p>
                <p className="mt-1 font-sans text-sm font-light text-bh-muted">
                  {row.note}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="product" title="G. Product-reality audit">
          <ul className="space-y-3">
            {model.productReality.map((row) => (
              <li key={row.area} className="flex flex-col gap-1 border-b border-bh-purple/10 pb-3 md:flex-row md:justify-between">
                <div>
                  <strong className="font-sans text-sm">{row.area}</strong>
                  <p className="font-sans text-sm font-light text-bh-muted">{row.note}</p>
                </div>
                <span className={`font-sans text-sm font-medium ${tone(row.status)}`}>
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card id="defects" title="H. Defects found and corrected">
          <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
            {model.defectsCorrected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card id="judgment" title="I. Founder decisions applied">
          {model.founderJudgment.length === 0 ? (
            <p className="font-sans text-sm font-light">
              The five open judgment items are closed by Founder decision.
              LinkedIn is a future enhancement. Global Life Design Company is the
              going-forward descriptor. Enrollment is August 31–December 31, 2026.
              Architect Community — Coming October 25, 2026. Community is not live
              on August 31. Dead navigation links remain removed. Founder
              Acceptance: YES. Row 33 is Complete.
            </p>
          ) : (
            <ol className="list-decimal space-y-3 pl-5 font-sans text-sm font-light">
              {model.founderJudgment.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
        </Card>

        <Card id="blockers" title="J. Remaining blockers">
          {model.blockers.length === 0 ? (
            <p className="font-sans text-sm font-light">
              None. Founder Acceptance recorded. Row 33 is Complete.
            </p>
          ) : (
            <ul className="list-disc space-y-2 pl-4 font-sans text-sm font-light">
              {model.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="scorecard" title="Row 33 scorecard">
          <ul>
            {Object.entries(model.verdicts).map(([label, value]) => (
              <Status key={label} label={label} value={value} />
            ))}
          </ul>
        </Card>
      </div>
    </main>
  );
}
