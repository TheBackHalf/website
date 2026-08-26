import { getSiteUrl } from "@/lib/auth/config";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import type { Locale } from "@/lib/i18n/config";
import type { LifecycleAutomationId } from "@/lib/lifecycle/types";

export type LifecycleMessage = {
  subject: string;
  text: string;
};

const CHAPTER_LABELS: Record<string, { en: string; es: string; next?: string }> = {
  "chapter-1": { en: "Chapter I — The Awakening", es: "Capítulo I — The Awakening", next: "chapter-2" },
  "chapter-1-awakening": {
    en: "Chapter I — The Awakening",
    es: "Capítulo I — The Awakening",
    next: "chapter-2",
  },
  "chapter-2": { en: "Chapter II — The Mirror", es: "Capítulo II — The Mirror", next: "chapter-3" },
  "chapter-2-mirror": { en: "Chapter II — The Mirror", es: "Capítulo II — The Mirror", next: "chapter-3" },
  "chapter-3": { en: "Chapter III — The Decision", es: "Capítulo III — The Decision", next: "chapter-4" },
  "chapter-3-decision": {
    en: "Chapter III — The Decision",
    es: "Capítulo III — The Decision",
    next: "chapter-4",
  },
  "chapter-4": { en: "Chapter IV — The Standards", es: "Capítulo IV — The Standards", next: "chapter-5" },
  "chapter-4-standards": {
    en: "Chapter IV — The Standards",
    es: "Capítulo IV — The Standards",
    next: "chapter-5",
  },
  "chapter-5": {
    en: "Chapter V — Becoming the Architect",
    es: "Capítulo V — Becoming the Architect",
    next: "chapter-6",
  },
  "chapter-5-architect": {
    en: "Chapter V — Becoming the Architect",
    es: "Capítulo V — Becoming the Architect",
    next: "chapter-6",
  },
  "chapter-6": { en: "Chapter VI — Expansion", es: "Capítulo VI — Expansion", next: "chapter-7" },
  "chapter-6-expansion": { en: "Chapter VI — Expansion", es: "Capítulo VI — Expansion", next: "chapter-7" },
  "chapter-7": { en: "Chapter VII — The Beginning", es: "Capítulo VII — The Beginning" },
  "chapter-7-beginning": { en: "Chapter VII — The Beginning", es: "Capítulo VII — The Beginning" },
};

function chapterLabel(chapterId: string | undefined, locale: Locale): string {
  if (!chapterId) {
    return locale === "es" ? "tu Journey" : "your Journey";
  }
  const entry = CHAPTER_LABELS[chapterId];
  if (!entry) {
    return locale === "es" ? "tu capítulo actual" : "your current chapter";
  }
  return locale === "es" ? entry.es : entry.en;
}

function chapterPath(chapterId: string, locale: Locale): string {
  const match = chapterId.match(/chapter-(\d)/);
  const n = match?.[1] ?? "1";
  const base = locale === "es" ? `/es/architect/journey/chapter-${n}` : `/architect/journey/chapter-${n}`;
  return `${base}/welcome`;
}

function continueUrl(chapterId: string | undefined, locale: Locale, next = false): string {
  const origin = getSiteUrl();
  if (!chapterId) {
    return `${origin}${getLocalizedArchitectPath("journey", locale)}`;
  }
  if (next) {
    const entry = CHAPTER_LABELS[chapterId];
    if (!entry?.next) {
      return `${origin}${getLocalizedArchitectPath("dashboard", locale)}`;
    }
    return `${origin}${chapterPath(entry.next, locale)}`;
  }
  return `${origin}${chapterPath(chapterId, locale)}`;
}

function billingUrl(locale: Locale): string {
  return `${getSiteUrl()}${getLocalizedArchitectPath("billing", locale)}`;
}

function dashboardUrl(locale: Locale): string {
  return `${getSiteUrl()}${getLocalizedArchitectPath("dashboard", locale)}`;
}

function supportUrl(locale: Locale): string {
  return `${getSiteUrl()}${locale === "es" ? "/es/support" : "/support"}`;
}

function greeting(firstName: string, locale: Locale): string {
  const name = firstName.trim() || (locale === "es" ? "Architect" : "Architect");
  return locale === "es" ? `Hola ${name},` : `Hello ${name},`;
}

export function buildLifecycleMessage(input: {
  automationId: LifecycleAutomationId;
  locale: Locale;
  firstName: string;
  payload?: Record<string, unknown>;
}): LifecycleMessage | null {
  const locale = input.locale === "es" ? "es" : "en";
  const chapterId =
    typeof input.payload?.chapterId === "string" ? input.payload.chapterId : undefined;
  const ticketId =
    typeof input.payload?.ticketId === "string" ? input.payload.ticketId : undefined;
  const name = greeting(input.firstName, locale);

  switch (input.automationId) {
    case "progress.onboarding_completed": {
      const url = `${getSiteUrl()}${getLocalizedArchitectPath("journey", locale)}`;
      if (locale === "es") {
        return {
          subject: "Onboarding completo — The Back Half",
          text: [
            name,
            "",
            "Completaste el onboarding de The Back Half.",
            "Puedes continuar tu Journey aquí:",
            url,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: "Onboarding complete — The Back Half",
        text: [
          name,
          "",
          "You completed The Back Half onboarding.",
          "Continue your Journey here:",
          url,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "progress.chapter_completed": {
      const label = chapterLabel(chapterId, locale);
      const url = continueUrl(chapterId, locale, true);
      if (locale === "es") {
        return {
          subject: `${label} completo — The Back Half`,
          text: [
            name,
            "",
            `Registramos la finalización de ${label}.`,
            "Continúa cuando estés listo:",
            url,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: `${label} complete — The Back Half`,
        text: [
          name,
          "",
          `We recorded completion of ${label}.`,
          "Continue when you are ready:",
          url,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "inactivity.journey_nudge": {
      const label = chapterLabel(chapterId, locale);
      const url = continueUrl(chapterId, locale, false);
      if (locale === "es") {
        return {
          subject: "Tu Journey te espera — The Back Half",
          text: [
            name,
            "",
            `Han pasado unos días desde tu última actividad en ${label}.`,
            "Puedes retomar exactamente donde lo dejaste:",
            url,
            "",
            `¿Necesitas ayuda? ${supportUrl(locale)}`,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: "Your Journey is waiting — The Back Half",
        text: [
          name,
          "",
          `It has been a few days since your last activity in ${label}.`,
          "You can pick up exactly where you left off:",
          url,
          "",
          `Need help? ${supportUrl(locale)}`,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "completion.journey_completed": {
      const url = dashboardUrl(locale);
      if (locale === "es") {
        return {
          subject: "Journey completo — The Back Half",
          text: [
            name,
            "",
            "Completaste The Back Half Journey.",
            "Tu cuenta conserva el acceso de por vida al Blueprint. Abre tu dashboard para certificados y recursos:",
            url,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: "Journey complete — The Back Half",
        text: [
          name,
          "",
          "You completed The Back Half Journey.",
          "Lifetime Blueprint access remains on your account. Open your dashboard for certificates and resources:",
          url,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "membership.renewed": {
      const url = billingUrl(locale);
      if (locale === "es") {
        return {
          subject: "Membresía Community renovada — The Back Half",
          text: [
            name,
            "",
            "Se confirmó la renovación de tu membresía Community.",
            "Puedes revisar o actualizar la facturación aquí:",
            url,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: "Community membership renewed — The Back Half",
        text: [
          name,
          "",
          "Your Community membership renewal was confirmed.",
          "Review or update billing here:",
          url,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "billing.past_due": {
      const url = billingUrl(locale);
      if (locale === "es") {
        return {
          subject: "Actualiza tu método de pago — The Back Half",
          text: [
            name,
            "",
            "No pudimos completar el pago periódico de tu membresía Community.",
            "El acceso de Community permanece en past due hasta que se actualice el pago. El acceso de por vida al Blueprint no se revoca por este aviso.",
            "Actualiza tu método de pago:",
            url,
            "",
            "The Back Half",
          ].join("\n"),
        };
      }
      return {
        subject: "Update your payment method — The Back Half",
        text: [
          name,
          "",
          "We could not complete the recurring payment for your Community membership.",
          "Community access stays past due until payment is updated. Lifetime Blueprint access is not revoked by this notice.",
          "Update your payment method:",
          url,
          "",
          "The Back Half",
        ].join("\n"),
      };
    }
    case "support.acknowledged":
    case "account.verification":
    case "account.password_reset":
    case "account.verified":
    case "payment.confirmed":
    case "payment.failed":
    case "payment.refunded":
    case "membership.activated":
    case "membership.canceled":
      // Existing senders own the participant-facing copy.
      return ticketId
        ? {
            subject: `We received your request [${ticketId}]`,
            text: "Existing support acknowledgment sender.",
          }
        : null;
  }
}

export function lifecycleMessageContainsPiiLeak(text: string): boolean {
  return /password|sk_live|sk_test|whsec_|AUTH_SECRET|SMTP_PASSWORD/i.test(text);
}
