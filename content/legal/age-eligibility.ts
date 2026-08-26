import type { Locale } from "@/lib/i18n/config";
import { MINIMUM_PARTICIPANT_AGE } from "@/lib/eligibility/policy";

export type AgeEligibilityLegalSlug =
  | "privacy-policy"
  | "terms-of-use"
  | "participant-agreement"
  | "membership-agreement"
  | "ai-disclosure";

type AgeEligibilityLegalCopy = {
  heading: string;
  paragraphs: readonly string[];
};

const EN: Record<AgeEligibilityLegalSlug, AgeEligibilityLegalCopy> = {
  "privacy-policy": {
    heading: "Launch eligibility and personal information",
    paragraphs: [
      `Participants must be at least ${MINIMUM_PARTICIPANT_AGE} years of age to register for an account, purchase The Back Half Blueprint or membership, complete onboarding, participate in the Journey, use Lumina, use AI Kimberly, or submit personal information through participant experiences intended for registered Architects.`,
      "The Back Half does not knowingly collect personal information through those participant experiences from anyone under 18. We do not collect date of birth to enforce this rule. Eligibility is confirmed by an 18+ attestation. If we learn that we have collected participant personal information from someone under 18, we will delete it.",
      "Public pages may use limited anonymous operational analytics before eligibility is confirmed. Those events do not include name, email, date of birth, or other participant account information.",
    ],
  },
  "terms-of-use": {
    heading: "Participant eligibility",
    paragraphs: [
      `By creating an account, purchasing, or using protected participant experiences, you confirm that you are at least ${MINIMUM_PARTICIPANT_AGE} years of age.`,
      "People under 18 are not eligible at launch to register, purchase, maintain a participant account, complete onboarding, participate in the Journey, use Lumina or AI Kimberly, purchase or activate membership, or submit personal information through Architect participant experiences.",
      "This eligibility rule governs platform participation. It does not change The Back Half's broader message, which can resonate with people of many ages.",
    ],
  },
  "participant-agreement": {
    heading: "Eligibility to participate",
    paragraphs: [
      `You must be at least ${MINIMUM_PARTICIPANT_AGE} years old to become an Architect and to participate in The Back Half platform at launch.`,
      "If you are under 18, you may not register, purchase, complete onboarding, participate in the Journey, or use Lumina or AI Kimberly.",
    ],
  },
  "membership-agreement": {
    heading: "Membership eligibility",
    paragraphs: [
      `Membership, including Community membership, is available only to participants who are at least ${MINIMUM_PARTICIPANT_AGE} years of age.`,
      "People under 18 may not purchase, activate, or maintain membership at launch.",
    ],
  },
  "ai-disclosure": {
    heading: "AI experience eligibility",
    paragraphs: [
      `Lumina and any participant-facing AI Kimberly experience are available only to eligible Architects who are at least ${MINIMUM_PARTICIPANT_AGE} years of age.`,
      "An ineligible person may not use those AI experiences, including by navigating directly to an AI URL.",
    ],
  },
};

const ES: Record<AgeEligibilityLegalSlug, AgeEligibilityLegalCopy> = {
  "privacy-policy": {
    heading: "Elegibilidad de lanzamiento e información personal",
    paragraphs: [
      `Las personas participantes deben tener al menos ${MINIMUM_PARTICIPANT_AGE} años para registrarse, comprar The Back Half Blueprint o una membresía, completar la incorporación, participar en el Journey, usar Lumina, usar AI Kimberly o enviar información personal a través de experiencias de participante destinadas a Architects registrados.`,
      "The Back Half no recopila a sabiendas información personal a través de esas experiencias de participante de nadie menor de 18 años. No recopilamos fecha de nacimiento para aplicar esta regla. La elegibilidad se confirma con una declaración de 18 años o más. Si sabemos que hemos recopilado información personal de participante de alguien menor de 18 años, la eliminaremos.",
      "Las páginas públicas pueden usar analítica operativa anónima limitada antes de confirmar la elegibilidad. Esos eventos no incluyen nombre, correo, fecha de nacimiento ni otra información de cuenta de participante.",
    ],
  },
  "terms-of-use": {
    heading: "Elegibilidad de participación",
    paragraphs: [
      `Al crear una cuenta, comprar o usar experiencias protegidas de participante, confirmas que tienes al menos ${MINIMUM_PARTICIPANT_AGE} años.`,
      "Las personas menores de 18 años no son elegibles en el lanzamiento para registrarse, comprar, mantener una cuenta de participante, completar la incorporación, participar en el Journey, usar Lumina o AI Kimberly, comprar o activar una membresía, ni enviar información personal a través de experiencias de Architect.",
      "Esta regla rige la participación en la plataforma. No cambia el mensaje más amplio de The Back Half, que puede resonar con personas de muchas edades.",
    ],
  },
  "participant-agreement": {
    heading: "Elegibilidad para participar",
    paragraphs: [
      `Debes tener al menos ${MINIMUM_PARTICIPANT_AGE} años para convertirte en Architect y participar en la plataforma The Back Half en el lanzamiento.`,
      "Si tienes menos de 18 años, no puedes registrarte, comprar, completar la incorporación, participar en el Journey ni usar Lumina o AI Kimberly.",
    ],
  },
  "membership-agreement": {
    heading: "Elegibilidad de membresía",
    paragraphs: [
      `La membresía, incluida la membresía Community, está disponible solo para participantes de al menos ${MINIMUM_PARTICIPANT_AGE} años.`,
      "Las personas menores de 18 años no pueden comprar, activar ni mantener una membresía en el lanzamiento.",
    ],
  },
  "ai-disclosure": {
    heading: "Elegibilidad de experiencias de IA",
    paragraphs: [
      `Lumina y cualquier experiencia de participante de AI Kimberly están disponibles solo para Architects elegibles de al menos ${MINIMUM_PARTICIPANT_AGE} años.`,
      "Una persona no elegible no puede usar esas experiencias de IA, incluso si navega directamente a una URL de IA.",
    ],
  },
};

export function isAgeEligibilityLegalSlug(
  slug: string,
): slug is AgeEligibilityLegalSlug {
  return slug in EN;
}

export function getAgeEligibilityLegalCopy(
  slug: string,
  locale: Locale,
): AgeEligibilityLegalCopy | null {
  if (!isAgeEligibilityLegalSlug(slug)) {
    return null;
  }
  return locale === "es" ? ES[slug] : EN[slug];
}
