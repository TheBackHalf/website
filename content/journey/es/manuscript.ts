/**
 * Shared Spanish manuscript presentation helpers.
 * Spanish source text is authored already spaced, so no character-level
 * spacing repair is required — only whitespace collapsing and sentence splits
 * that respect Spanish opening punctuation (¿ ¡) and accented capitals.
 */

export function normalizeSpanishSpacing(raw: string): string {
  return raw.replace(/\s{2,}/g, " ").trim();
}

export function formatSpanishManuscriptForDisplay(raw: string): string[] {
  const text = normalizeSpanishSpacing(raw);
  if (!text) {
    return [];
  }
  return text
    .split(/(?<=[.?!])\s+(?=[«“"‘'¿¡A-ZÁÉÍÓÚÜÑ])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Replace the Spanish name placeholder or collapse to the Architect fallback.
 * Mirrors the English personalize contract: exactly one greeting survives.
 */
export function personalizeSpanishWelcome(
  raw: string,
  firstName: string | null | undefined,
  greeting: "Bienvenido/a" | "Bienvenido/a de nuevo",
): string {
  const name = typeof firstName === "string" ? firstName.trim() : "";
  const placeholder = `${greeting}, {First Name}.`;
  const fallback = `Si tu nombre no está disponible... ${greeting}, Architect.`;

  if (name) {
    return normalizeSpanishSpacing(
      raw.replace(placeholder, `${greeting}, ${name}.`).replace(fallback, ""),
    );
  }

  return normalizeSpanishSpacing(
    raw.replace(placeholder, "").replace(fallback, `${greeting}, Architect.`),
  );
}
