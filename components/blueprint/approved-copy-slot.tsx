import type { ReactNode } from "react";
import { APPROVED_COPY_REQUIRED } from "@/content/blueprint/types";
import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import { formatManuscriptBlock } from "@/lib/blueprint/format-manuscript";
import { cn } from "@/lib/utils";

/** Approved statements that must render bold without altering wording. */
const BOLD_FULL_PARAGRAPHS = new Set([
  "The Back Half was created from one simple but life-changing realization: Life is not transformed by time. It is transformed by intention.",
  "You are an Architect.",
  "Magical is Possible.",
]);

/** Inline phrases to bold within otherwise normal paragraphs. */
const BOLD_INLINE_PHRASES = [
  "grateful",
  "Magical is Possible.",
  "magical is possible",
  "you are an Architect",
  "you are an architect",
] as const;

type ApprovedCopySlotProps = {
  label?: string;
  manuscript?: ManuscriptBlock | null;
  className?: string;
  /** Reserved lines for writing exercises when no manuscript. */
  placeholderLines?: number;
  variant?: "prose" | "lines" | "form";
  /** When true (default), restore collapsed manuscript spacing for print. */
  format?: boolean;
  /** Optional saved Architect responses to show instead of blank lines. */
  responseLines?: readonly string[];
};

function renderWithInlineBold(text: string): ReactNode {
  const trimmed = text.trim();
  if (BOLD_FULL_PARAGRAPHS.has(trimmed)) {
    return <strong>{text}</strong>;
  }

  let remaining = text;
  const nodes: ReactNode[] = [];
  let key = 0;

  while (remaining.length) {
    let earliest = -1;
    let matchPhrase = "";
    for (const phrase of BOLD_INLINE_PHRASES) {
      const idx = remaining.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx !== -1 && (earliest === -1 || idx < earliest)) {
        earliest = idx;
        matchPhrase = remaining.slice(idx, idx + phrase.length);
      }
    }
    if (earliest === -1) {
      nodes.push(remaining);
      break;
    }
    if (earliest > 0) {
      nodes.push(remaining.slice(0, earliest));
    }
    nodes.push(<strong key={`b-${key++}`}>{matchPhrase}</strong>);
    remaining = remaining.slice(earliest + matchPhrase.length);
  }

  return nodes;
}

const BACK_HALF_DECLARATION_INTRO =
  "Throughout this Journey, you have awakened. You have looked honestly at your life. You have made a decision. You have established new standards. You have embraced the identity of an Architect. You have committed to living a life that expands beyond yourself.";

const BACK_HALF_DECLARATION_INTRO_SENTENCES = [
  "Throughout this Journey, you have awakened.",
  "You have looked honestly at your life.",
  "You have made a decision.",
  "You have established new standards.",
  "You have embraced the identity of an Architect.",
  "You have committed to living a life that expands beyond yourself.",
] as const;

function ManuscriptParagraph({ text }: { text: string }) {
  const trimmed = text.trim();
  if (trimmed === BACK_HALF_DECLARATION_INTRO) {
    return (
      <p>
        {BACK_HALF_DECLARATION_INTRO_SENTENCES.map((sentence, index) => (
          <span
            key={sentence}
            style={{
              display: "block",
              marginTop: index === 0 ? undefined : "0.85rem",
            }}
          >
            {renderWithInlineBold(sentence)}
          </span>
        ))}
      </p>
    );
  }

  const isBullet = trimmed.startsWith("•");
  const className = isBullet ? "bh-bp-bullet" : undefined;

  if (/^thebackhalf\.org$/i.test(trimmed)) {
    return (
      <p className={className}>
        <a href="https://thebackhalf.org">{text}</a>
      </p>
    );
  }

  return <p className={className}>{renderWithInlineBold(text)}</p>;
}

export function ApprovedCopySlot({
  label,
  manuscript,
  className,
  placeholderLines = 6,
  variant = "prose",
  format = true,
  responseLines,
}: ApprovedCopySlotProps) {
  const prepared = format ? formatManuscriptBlock(manuscript) : manuscript;
  const filled = (responseLines ?? []).map((line) => line.trim()).filter(Boolean);

  if (prepared?.paragraphs?.length) {
    return (
      <div className={cn("bh-bp-prose", className)}>
        {prepared.paragraphs.map((paragraph, index) => (
          <ManuscriptParagraph key={index} text={paragraph} />
        ))}
      </div>
    );
  }

  if (prepared?.lines?.length) {
    return (
      <div className={cn("bh-bp-lines", className)}>
        {prepared.lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    );
  }

  if (filled.length > 0 && (variant === "lines" || variant === "form" || variant === "prose")) {
    return (
      <div className={cn("bh-bp-prose bh-bp-response-fill", className)} aria-label={label}>
        {filled.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("bh-bp-form-slot", className)} aria-label={label}>
        {label ? <p className="bh-bp-form-label">{label}</p> : null}
        <div className="bh-bp-form-lines" aria-hidden="true">
          {Array.from({ length: placeholderLines }).map((_, index) => (
            <span key={index} className="bh-bp-form-line" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "lines") {
    return (
      <div className={cn("bh-bp-lines-slot", className)} aria-label={label}>
        <div className="bh-bp-writing-lines" aria-hidden="true">
          {Array.from({ length: placeholderLines }).map((_, index) => (
            <span key={index} className="bh-bp-writing-line" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bh-bp-prose-slot", className)} aria-label={label}>
      {label ? <p className="bh-bp-slot-label">{label}</p> : null}
      <p className="bh-bp-copy-marker">{APPROVED_COPY_REQUIRED}</p>
    </div>
  );
}
