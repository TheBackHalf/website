import { verifyUnsubscribeToken } from "@/lib/email/tokens";
import type { Locale } from "@/lib/i18n/config";
import { PageHero, SkipLink, StatusNotice } from "@/components/design-system";
import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { SectionHeading, SectionShell } from "@/components/home/section-shell";

type Copy = {
  title: string;
  confirm: string;
  button: string;
  success: string;
  already: string;
  invalid: string;
  note: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    title: "Email preferences",
    confirm:
      "Stop non-essential email from The Back Half for this address. Account, security, and billing notices can still be sent.",
    button: "Stop non-essential email",
    success: "Non-essential email has been stopped for this address.",
    already: "This address is already unsubscribed from non-essential email.",
    invalid: "This unsubscribe link is invalid or expired.",
    note: "Hard bounces and spam complaints continue to suppress all mail.",
  },
  es: {
    title: "Preferencias de correo",
    confirm:
      "Detén el correo no esencial de The Back Half para esta dirección. Aún se pueden enviar avisos de cuenta, seguridad y facturación.",
    button: "Detener correo no esencial",
    success: "Se detuvo el correo no esencial para esta dirección.",
    already: "Esta dirección ya está dada de baja del correo no esencial.",
    invalid: "Este enlace de baja no es válido o expiró.",
    note: "Los rebotes permanentes y las quejas de spam siguen suprimiendo todo el correo.",
  },
};

export async function UnsubscribePageView({
  locale,
  token,
  status,
}: {
  locale: Locale;
  token?: string;
  status?: string;
}) {
  const copy = COPY[locale];
  const verified = verifyUnsubscribeToken(token);
  let outcome: "form" | "success" | "invalid" = "form";
  if (!verified) {
    outcome = "invalid";
  } else if (status === "unsubscribed" || status === "done") {
    outcome = "success";
  }

  return (
    <>
      <SkipLink href="#unsubscribe-main">
        {locale === "es" ? "Saltar al contenido" : "Skip to main content"}
      </SkipLink>
      <main
        id="unsubscribe-main"
        className="min-h-screen bg-bh-cream text-bh-ink"
      >
        <PageHero locale={locale}>
          <p className="bh-eyebrow">The Back Half</p>
          <SectionHeading
            as="h1"
            className="mt-6 text-4xl md:text-6xl lg:text-7xl"
          >
            {copy.title}
          </SectionHeading>
        </PageHero>
        <SectionShell
          id="unsubscribe-status"
          variant="light"
          density="compact"
          containerClassName="max-w-3xl"
        >
          <div className="mx-auto max-w-2xl text-left">
            {outcome === "invalid" ? (
              <StatusNotice variant="error">
                <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
                  {copy.invalid}
                </p>
              </StatusNotice>
            ) : null}
            {outcome === "success" ? (
              <StatusNotice variant="success">
                <p className="font-sans text-sm font-light leading-relaxed text-bh-muted">
                  {copy.success}
                </p>
              </StatusNotice>
            ) : null}
            {outcome === "form" && token ? (
              <>
                <p className="font-sans text-base font-light leading-relaxed text-bh-muted">
                  {copy.confirm}
                </p>
                <form
                  className="mt-8"
                  method="post"
                  action={`/api/email/unsubscribe?token=${encodeURIComponent(token)}&locale=${locale}`}
                >
                  <input type="hidden" name="token" value={token} />
                  <button type="submit" className="bh-cta">
                    {copy.button}
                  </button>
                </form>
                <p className="mt-6 font-sans text-sm font-light text-bh-muted">
                  {copy.note}
                </p>
              </>
            ) : null}
          </div>
        </SectionShell>
        <LocalizedSiteFooter locale={locale} />
      </main>
    </>
  );
}
