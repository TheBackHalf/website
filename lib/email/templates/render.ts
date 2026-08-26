import { EMAIL_BRAND, emailLogoUrl } from "@/lib/email/templates/brand";
import type { Locale } from "@/lib/i18n/config";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function wrapPlainText(input: {
  locale: Locale;
  greeting: string;
  paragraphs: readonly string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const lines = [
    ...(input.greeting.trim() ? [input.greeting, ""] : []),
    ...input.paragraphs,
  ];
  if (input.ctaLabel && input.ctaUrl) {
    lines.push("", `${input.ctaLabel}: ${input.ctaUrl}`);
  }
  if (input.footerNote) {
    lines.push("", input.footerNote);
  }
  lines.push("", EMAIL_BRAND.productName);
  return lines.join("\n");
}

export function wrapBrandedHtml(input: {
  locale: Locale;
  subject: string;
  preheader: string;
  heading: string;
  greeting: string;
  paragraphs: readonly string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}): string {
  const lang = input.locale === "es" ? "es" : "en";
  const dir = "ltr";
  const logo = emailLogoUrl();
  const paragraphs = input.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.ink};">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:28px 0 8px 0;">
          <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:${EMAIL_BRAND.purple};color:${EMAIL_BRAND.white};text-decoration:none;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;border:2px solid ${EMAIL_BRAND.purple};">${escapeHtml(input.ctaLabel)}</a>
        </p>
        <p style="margin:0 0 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${EMAIL_BRAND.muted};">
          <a href="${escapeHtml(input.ctaUrl)}" style="color:${EMAIL_BRAND.purple};text-decoration:underline;">${escapeHtml(input.ctaUrl)}</a>
        </p>`
      : "";
  const footer = input.footerNote
    ? `<p style="margin:24px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.muted};">${escapeHtml(input.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.cream};color:${EMAIL_BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${EMAIL_BRAND.cream};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:${EMAIL_BRAND.white};">
          <tr>
            <td style="background:${EMAIL_BRAND.night};padding:28px 32px;text-align:center;">
              <img src="${escapeHtml(logo)}" width="72" height="72" alt="${escapeHtml(EMAIL_BRAND.logoAlt)}" style="display:block;margin:0 auto 12px auto;border:0;outline:none;text-decoration:none;max-width:72px;height:auto;" />
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:${EMAIL_BRAND.champagne};">${escapeHtml(EMAIL_BRAND.productName)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;">
              <h1 style="margin:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;font-weight:normal;color:${EMAIL_BRAND.night};">${escapeHtml(input.heading)}</h1>
              ${input.greeting.trim()
                ? `<p style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:${EMAIL_BRAND.ink};">${escapeHtml(input.greeting)}</p>`
                : ""}
              ${paragraphs}
              ${cta}
              ${footer}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 28px 32px;border-top:1px solid ${EMAIL_BRAND.champagne};">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${EMAIL_BRAND.muted};">${escapeHtml(EMAIL_BRAND.productName)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
