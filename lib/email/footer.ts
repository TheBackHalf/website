import {
  MARKETING_SENDER,
  requirePhysicalAddress,
} from "@/lib/email/identity";
import type { MarketingFooterInput } from "@/lib/email/types";
import type { Locale } from "@/lib/i18n/config";

export const MARKETING_FOOTER_MARKER = "--- The Back Half marketing footer ---";

export function buildMarketingFooter(input: MarketingFooterInput): string {
  if (input.locale === "es") {
    return [
      MARKETING_FOOTER_MARKER,
      `${MARKETING_SENDER.brandName} es operado por ${MARKETING_SENDER.legalName}.`,
      input.physicalAddress,
      "Este mensaje es un correo comercial. No es un mensaje transaccional de cuenta o pago.",
      `Lo recibiste porque ${input.consentSourceLabel}.`,
      `Darse de baja: ${input.unsubscribeUrl}`,
      `Preguntas de privacidad: ${MARKETING_SENDER.replyTo}`,
    ].join("\n");
  }

  return [
    MARKETING_FOOTER_MARKER,
    `${MARKETING_SENDER.brandName} is operated by ${MARKETING_SENDER.legalName}.`,
    input.physicalAddress,
    "This message is a commercial email. It is not a transactional account or payment message.",
    `You received it because ${input.consentSourceLabel}.`,
    `Unsubscribe: ${input.unsubscribeUrl}`,
    `Privacy questions: ${MARKETING_SENDER.replyTo}`,
  ].join("\n");
}

export function consentSourceLabel(
  locale: Locale,
  sourceDetail?: string,
): string {
  if (locale === "es") {
    return sourceDetail?.trim()
      ? `quedó un registro de consentimiento de correo de marketing (${sourceDetail.trim()})`
      : "quedó un registro de consentimiento de correo de marketing";
  }
  return sourceDetail?.trim()
    ? `a marketing-email consent record is on file (${sourceDetail.trim()})`
    : "a marketing-email consent record is on file";
}

export function appendMarketingFooter(
  body: string,
  footer: string,
): string {
  if (body.includes(MARKETING_FOOTER_MARKER)) {
    return body;
  }
  return `${body.trimEnd()}\n\n${footer}\n`;
}

export function marketingFooterConfigured():
  | { ok: true; address: string }
  | { ok: false; error: string } {
  return requirePhysicalAddress();
}
