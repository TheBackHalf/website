/**
 * Height-aware print pagination for approved Blueprint prose.
 * Presentation only — does not rewrite, omit, or invent copy.
 */

export const PROSE_BUDGET = {
  /** First page with atmosphere band + section heading. */
  letterOpener: 6.55,
  /** First page with heading, no atmosphere. */
  sectionOpener: 6.85,
  continuation: 7.35,
  continuationWithClose: 6.85,
  artifactFirst: 6.65,
  artifactContinuation: 7.25,
} as const;

const CHARS_PER_LINE = 76;
const LINE_IN = 0.245;
const GAP_IN = 0.115;

export function estimateParagraphInches(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const lines = Math.max(1, Math.ceil(trimmed.length / CHARS_PER_LINE));
  return lines * LINE_IN + GAP_IN;
}

function shouldKeepWithNext(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("•")) return true;
  if (/_{6,}/.test(trimmed)) return false;
  if (/[.!?]"?$/.test(trimmed) && trimmed.length > 42) return false;
  if (trimmed.length <= 42 && !/[.!?]"?$/.test(trimmed)) return true;
  return /^(What Is|Examples|My Back Half|Living My|My Commitment|Remember|Reflection|Standard (One|Two|Three|Four|Five)|Each chapter includes:)$/i.test(
    trimmed,
  );
}

function nextUnit(
  paragraphs: readonly string[],
  start: number,
): { texts: string[]; nextIndex: number } {
  const texts = [paragraphs[start]!];
  let index = start;
  while (index < paragraphs.length - 1 && shouldKeepWithNext(paragraphs[index]!)) {
    index += 1;
    texts.push(paragraphs[index]!);
  }
  return { texts, nextIndex: index + 1 };
}

export type PaginateProseOptions = {
  firstPageBudgetIn: number;
  continuationBudgetIn?: number;
};

/**
 * Pack approved paragraphs onto print pages by estimated height.
 * Never drops copy. Prefer filling the current page over leaving a sparse opener.
 */
export function paginateParagraphs(
  paragraphs: readonly string[],
  options: PaginateProseOptions,
): string[][] {
  const source = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
  if (!source.length) return [];

  const continuationBudget =
    options.continuationBudgetIn ?? PROSE_BUDGET.continuation;
  const pages: string[][] = [];
  let current: string[] = [];
  let used = 0;
  let budget = options.firstPageBudgetIn;
  let index = 0;

  while (index < source.length) {
    const unit = nextUnit(source, index);
    const unitHeight = unit.texts.reduce(
      (sum, text) => sum + estimateParagraphInches(text),
      0,
    );

    const unitFits = current.length === 0 || used + unitHeight <= budget;
    if (unitFits) {
      current.push(...unit.texts);
      used += unitHeight;
      index = unit.nextIndex;
      continue;
    }

    if (unit.texts.length > 1 && current.length > 0) {
      let splitAt = 0;
      let splitHeight = 0;
      while (splitAt < unit.texts.length) {
        const nextHeight = estimateParagraphInches(unit.texts[splitAt]!);
        if (splitAt > 0 && used + splitHeight + nextHeight > budget) break;
        splitHeight += nextHeight;
        splitAt += 1;
      }
      if (splitAt > 0 && splitAt < unit.texts.length) {
        current.push(...unit.texts.slice(0, splitAt));
        pages.push(current);
        current = [...unit.texts.slice(splitAt)];
        used = current.reduce(
          (sum, text) => sum + estimateParagraphInches(text),
          0,
        );
        budget = continuationBudget;
        index = unit.nextIndex;
        continue;
      }
    }

    pages.push(current);
    current = [...unit.texts];
    used = unitHeight;
    budget = continuationBudget;
    index = unit.nextIndex;
  }

  if (current.length) pages.push(current);

  while (pages.length >= 2) {
    const last = pages[pages.length - 1]!;
    const lastHeight = last.reduce(
      (sum, text) => sum + estimateParagraphInches(text),
      0,
    );
    const previous = pages[pages.length - 2]!;
    const previousHeight = previous.reduce(
      (sum, text) => sum + estimateParagraphInches(text),
      0,
    );
    const mergingOntoOpener = pages.length === 2;
    const mergeBudget = mergingOntoOpener
      ? options.firstPageBudgetIn
      : continuationBudget;
    const lastIsOrphan = last.length <= 3 && lastHeight <= 1.35;
    if (lastIsOrphan) {
      pages[pages.length - 2] = [...previous, ...last];
      pages.pop();
      continue;
    }
    if (last.length > 4 && lastHeight > 2.1 && !mergingOntoOpener) break;
    if (previousHeight + lastHeight <= mergeBudget + 0.18) {
      pages[pages.length - 2] = [...previous, ...last];
      pages.pop();
      continue;
    }
    break;
  }

  return pages;
}
