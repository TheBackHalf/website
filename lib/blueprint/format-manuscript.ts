/**
 * Presentation-only manuscript formatting for Blueprint print/PDF.
 * Restores collapsed spacing without rewriting approved wording.
 */

import type { ManuscriptBlock } from "@/content/blueprint/manuscript";

/** Restore missing spaces in collapsed manuscript text without changing words. */
export function restoreManuscriptSpacing(raw: string): string {
  return raw
    .replace(/The Awakening([A-Z])/g, "The Awakening. $1")
    .replace(/PossibilityCopyright/g, "Possibility. Copyright")
    .replace(/belief:Magical/g, "belief: Magical")
    // Copyright-only founder credit collapse repair (do not rewrite prose mentions).
    .replace(
      /Magical is Possible\.Kimberly M\. Walker(?:, Founder)?Published/g,
      "Magical is Possible.\nKimberly\u00A0M.\u00A0Walker,\u00A0Founder\nPublished",
    )
    .replace(
      /Magical is Possible\.\s*Kimberly M\. Walker(?:, Founder)?\s*Published/g,
      "Magical is Possible.\nKimberly\u00A0M.\u00A0Walker,\u00A0Founder\nPublished",
    )
    .replace(/WalkerPublished/g, "Walker\nPublished")
    .replace(/FounderPublished/g, "Founder\nPublished")
    .replace(/byKLW/g, "by KLW")
    .replace(/LLCFirst/g, "LLC\nFirst")
    .replace(/Edition2026/g, "Edition 2026")
    .replace(/2026thebackhalf\.org/gi, "2026\nthebackhalf.org")
    .replace(/orgNext:/g, "org")
    .replace(/\.\.\.([A-Za-z“"‘'])/g, "... $1")
    .replace(/…([A-Za-z“"‘'])/g, "… $1")
    .replace(/([.?!])([A-Za-z“"‘'])/g, "$1 $2")
    .replace(/(\w)\. ([a-z]{2,})/g, (match, before, after) => {
      // Keep domains intact (thebackhalf.org), restore accidental splits.
      if (["org", "com", "net", "io", "ai"].includes(after)) {
        return `${before}.${after}`;
      }
      return match;
    })
    .replace(/:([A-Za-z“"‘'])/g, ": $1")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d{4})/g, "$1 $2")
    .replace(/(\d{4})([a-zA-Z])/g, "$1 $2")
    .replace(/\d{1,2}\.\d{1,2}\.\d{4}\s*The Next Foundry Exercise/gi, " ")
    .replace(/The Next Foundry Exercise/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Split run-on manuscript into display sentences without altering words.
 */
export function formatManuscriptForDisplay(raw: string): string[] {
  const spaced = restoreManuscriptSpacing(raw.trim());
  if (!spaced) {
    return [];
  }
  return spaced
    .split(/(?<=[.?!])\s+(?=[A-Z“"‘'])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Architect PDF personalization — no account name available. */
export function personalizeArchitectCopy(raw: string): string {
  return restoreManuscriptSpacing(
    raw
      .replace(/Welcome,\s*\{First Name\}\.?/gi, "")
      .replace(/Welcome back,\s*\{First Name\}\.?/gi, "")
      .replace(
        /If your name isn't available\.\.\.?Welcome,/gi,
        "Welcome,",
      )
      .replace(
        /If your name isn't available\.\.\.?Welcome back,/gi,
        "Welcome back,",
      )
      .replace(
        /If your name isn't available…Welcome,/gi,
        "Welcome,",
      )
      .replace(
        /If your name isn't available…Welcome back,/gi,
        "Welcome back,",
      )
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

function shouldJoinNameFragment(previous: string, next: string): boolean {
  const prev = previous.trim();
  const nxt = next.trim();
  // Only repair broken personal-name fragments (e.g. "Kimberly M." + "Walker…").
  // Do not join section labels like "Remember" / "Examples".
  const sectionLabels = new Set([
    "Remember",
    "Examples",
    "Reflection",
    "Published",
    "Orientation",
    "Commitment",
    "Closing",
    "Founder",
  ]);
  if (sectionLabels.has(prev)) return false;

  if (/^[A-Z][a-z]+(?:\s+[A-Z]\.)?$/.test(prev) && /^[A-Z][a-z]+/.test(nxt)) {
    // Prefer joining only when previous looks like an initialed name fragment.
    if (!/\b[A-Z]\.$/.test(prev) && prev.split(/\s+/).length === 1) {
      return false;
    }
    return true;
  }
  if (
    /[a-z]\.?$/.test(prev) &&
    /^[a-z]/.test(nxt) &&
    prev.split(/\s+/).length <= 3
  ) {
    return true;
  }
  return false;
}

/**
 * Format a manuscript block for print: restore spacing, personalize, join
 * broken extraction fragments (e.g. "Kimberly M." + "Walker is…").
 */
export function formatManuscriptBlock(
  block: ManuscriptBlock | null | undefined,
  options?: { personalize?: boolean; preserveParagraphs?: boolean },
): ManuscriptBlock | null {
  if (!block) return null;

  const personalize = options?.personalize ?? true;
  const preserveParagraphs = options?.preserveParagraphs ?? false;
  const sourceParagraphs = block.paragraphs?.length
    ? [...block.paragraphs]
    : block.lines?.length
      ? [...block.lines]
      : [];

  if (!sourceParagraphs.length) return block;

  if (preserveParagraphs) {
    return {
      paragraphs: sourceParagraphs
        .map((paragraph) =>
          personalize
            ? personalizeArchitectCopy(paragraph)
            : restoreManuscriptSpacing(paragraph),
        )
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    };
  }

  const joined: string[] = [];
  for (const paragraph of sourceParagraphs) {
    const withBreaks = (
      personalize
        ? personalizeArchitectCopy(paragraph)
        : restoreManuscriptSpacing(paragraph)
    ).replace(/\n+/g, "\n");

    for (const chunk of withBreaks.split("\n")) {
      const prepared = chunk.trim();
      if (!prepared) continue;

      const previous = joined[joined.length - 1];
      if (previous && shouldJoinNameFragment(previous, prepared)) {
        const left = /[A-Z]\.$/.test(previous.trim())
          ? previous.trim()
          : previous.replace(/\.$/, "");
        joined[joined.length - 1] = `${left} ${prepared}`;
        continue;
      }

      // Already well-broken short lines (commitment, signature, bullets) stay as-is.
      if (
        prepared.startsWith("•") ||
        (prepared.length < 120 &&
          !/[a-z][A-Z]/.test(paragraph) &&
          (prepared.endsWith(".") ||
            prepared.endsWith(":") ||
            prepared.includes("_____") ||
            /^[A-Z\s'’]+$/.test(prepared)))
      ) {
        joined.push(prepared);
        continue;
      }

      const sentences = formatManuscriptForDisplay(prepared);
      if (sentences.length <= 1) {
        joined.push(prepared);
        continue;
      }

      // Group sentences into readable paragraphs (2 sentences), but keep
      // Welcome openers on their own line (Founder formatting requirement).
      for (let i = 0; i < sentences.length; ) {
        const sentence = sentences[i]!;
        if (/^Welcome\b/i.test(sentence.trim())) {
          joined.push(sentence);
          i += 1;
          continue;
        }
        const next = sentences[i + 1];
        if (next && !/^Welcome\b/i.test(next.trim())) {
          joined.push(`${sentence} ${next}`);
          i += 2;
          continue;
        }
        joined.push(sentence);
        i += 1;
      }
    }
  }

  return { paragraphs: joined };
}
