/**
 * Split chapter manuscript into opener, teaching body, and exercise pages
 * for Blueprint PDF layout - presentation only, approved wording preserved.
 */

import type { ManuscriptBlock } from "@/content/blueprint/manuscript";
import {
  alivenessProjectQuestions,
  formatManuscriptForDisplay,
  personalizeChapter1Welcome,
} from "@/content/journey/chapter-1-awakening";
import { standardsReflectionQuestions } from "@/content/journey/chapter-4-standards";
import {
  formatManuscriptBlock,
  personalizeArchitectCopy,
  restoreManuscriptSpacing,
} from "@/lib/blueprint/format-manuscript";

export type ChapterPrintExercise = {
  heading: string;
  title: string;
  instructions: readonly string[];
  examples: readonly string[];
  writingLines: number;
};

export type ChapterPrintParts = {
  opener: ManuscriptBlock | null;
  body: ManuscriptBlock | null;
  exercises: readonly ChapterPrintExercise[];
};

type ChapterId =
  | "chapter-1-awakening"
  | "chapter-2-mirror"
  | "chapter-3-decision"
  | "chapter-4-standards"
  | "chapter-5-architect"
  | "chapter-6-expansion"
  | "chapter-7-beginning";

const FOUNDRY_METADATA =
  /\d{1,2}\.\d{1,2}\.\d{4}\s*The Next Foundry Exercise/gi;

/** Survives whitespace-collapsing cleaners so manuscript paragraphs stay separate. */
const PARAGRAPH_SENTINEL = "\uE000";

function cleanExerciseRaw(raw: string): string {
  return restoreManuscriptSpacing(raw)
    .replace(FOUNDRY_METADATA, " ")
    .replace(/The Next Foundry Exercise/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripLeadingChapterTitle(raw: string): string {
  let text = restoreManuscriptSpacing(raw);
  text = text.replace(
    /^(?:Choosing Intention|Creating Your Standards|Becoming the Architect|Expansion|The Beginning|The Mirror|The Awakening|The Decision|The Standards)\s*/i,
    "",
  );
  text = text.replace(
    /^Chapter\s+[IVXLC]+\s*[\u2014\u2013-]\s*(?:Choosing Intention|Creating Your Standards|Becoming the Architect|Expansion|The Beginning|The Mirror|The Awakening|The Decision|The Standards)\s*/i,
    "",
  );
  text = text.replace(
    /^(?:Choosing Intention|Creating Your Standards|Becoming the Architect|Expansion|The Beginning|The Mirror|The Awakening|The Decision|The Standards)\s*/i,
    "",
  );
  return text.trim();
}

function bodyFromParagraph(raw: string | undefined): ManuscriptBlock | null {
  if (!raw) return null;
  return formatManuscriptBlock(
    { paragraphs: [stripLeadingChapterTitle(raw)] },
    { personalize: true },
  );
}

function isWelcomeOpenerSentence(sentence: string): boolean {
  return /^Welcome\b/i.test(sentence.trim());
}

function openerFromParagraph(raw: string | undefined): ManuscriptBlock | null {
  if (!raw) return null;
  const personalized = personalizeArchitectCopy(raw);
  const sentences = formatManuscriptForDisplay(personalized);
  if (sentences.length <= 1) {
    return { paragraphs: [personalized] };
  }

  // Keep Welcome openers on their own line; do not pair-join into the next sentence.
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; ) {
    const sentence = sentences[i]!;
    if (isWelcomeOpenerSentence(sentence)) {
      paragraphs.push(sentence);
      i += 1;
      continue;
    }
    const next = sentences[i + 1];
    if (next && !isWelcomeOpenerSentence(next)) {
      paragraphs.push(`${sentence} ${next}`);
      i += 2;
      continue;
    }
    paragraphs.push(sentence);
    i += 1;
  }
  return { paragraphs };
}

function chapter4ReflectionExercise(): ChapterPrintExercise {
  return {
    heading: "Reflection",
    title: "Architect Reflection Questions",
    instructions: standardsReflectionQuestions.map((question) => question.prompt),
    examples: [],
    writingLines: 16,
  };
}

function withChapter4ParticipantExercises(
  parsed: readonly ChapterPrintExercise[],
): ChapterPrintExercise[] {
  if (
    parsed.some((exercise) =>
      /Architect Reflection Questions/i.test(`${exercise.heading} ${exercise.title}`),
    )
  ) {
    return [...parsed];
  }
  const practice = parsed.length
    ? [...parsed]
    : [
        {
          heading: "Practice",
          title: "The Standards Exercise",
          instructions: [],
          examples: [],
          writingLines: 16,
        },
      ];
  return [chapter4ReflectionExercise(), ...practice];
}

function chapter1Exercises(): ChapterPrintExercise[] {
  return alivenessProjectQuestions.map((question) => ({
    heading: question.heading,
    title: question.title,
    instructions: question.instructions,
    examples: question.examples,
    writingLines: question.targetCount >= 50 ? 18 : 16,
  }));
}

function questionsFromBlock(block: string): string[] {
  return restoreManuscriptSpacing(block)
    .split(
      /(?=(?:What |Where |Which |Who |How |When |Why |Finish |Complete |Write |Choose |Keep |Return |Allow |Begin |Describe |Read |Whenever |Don't |Place |Let |Today|One year |For Yourself|For Someone|For the World|Remember,))/g,
    )
    // Strip paragraph sentinels — private-use \uE000 encodes as \u0000/□ in PDF fonts.
    .map((part) =>
      part.replace(/\uE000/g, "").replace(/\u0000/g, "").trim(),
    )
    .filter((part) => part.length > 8);
}

/** Prefer explicit manuscript paragraph breaks over sentence reflow. */
function linesFromExerciseBody(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.includes(PARAGRAPH_SENTINEL) || normalized.includes("\n")) {
    return normalized
      .split(new RegExp(`[${PARAGRAPH_SENTINEL}\\n]+`))
      .map((line) =>
        restoreManuscriptSpacing(
          line.replace(/\uE000/g, "").replace(/\u0000/g, "").trim(),
        ),
      )
      .filter(Boolean);
  }
  return formatManuscriptForDisplay(normalized);
}

function stripPrintSentinels(value: string): string {
  return value.replace(/\uE000/g, "").replace(/\u0000/g, "").trim();
}

function exerciseFromSection(
  heading: string,
  title: string,
  body: string,
  writingLines: number,
): ChapterPrintExercise {
  const cleanedBody = stripPrintSentinels(body);
  const sentences = formatManuscriptForDisplay(cleanedBody);
  const questionLines = questionsFromBlock(cleanedBody);
  const instructions = (
    questionLines.length >= 3
      ? questionLines
      : sentences.length
        ? sentences
        : [cleanedBody]
  ).map(stripPrintSentinels).filter(Boolean);
  return {
    heading,
    title,
    instructions,
    examples: [],
    writingLines,
  };
}

/**
 * Split approved exercise blob on Step/Question/Person/Reflection markers.
 */
function splitExerciseSections(raw: string): ChapterPrintExercise[] {
  const spaced = cleanExerciseRaw(raw);

  if (
    /Architect Reflection Questions/i.test(spaced) ||
    /Intentional Practice/i.test(spaced)
  ) {
    const exercises: ChapterPrintExercise[] = [];
    const reflectionMatch = spaced.match(
      /Architect Reflection Questions([\s\S]*?)(?=Intentional Practice|$)/i,
    );
    const practiceMatch = spaced.match(
      /Intentional Practice([\s\S]*?)(?=Weekly Commitment|Founder Closing|$)/i,
    );
    if (reflectionMatch?.[1]?.trim()) {
      exercises.push(
        exerciseFromSection(
          "Reflection",
          "Architect Reflection Questions",
          reflectionMatch[1].trim(),
          16,
        ),
      );
    }
    if (practiceMatch?.[1]?.trim()) {
      exercises.push(
        exerciseFromSection(
          "Practice",
          "Intentional Practice",
          practiceMatch[1].trim(),
          16,
        ),
      );
    }
    if (exercises.length) return exercises;
  }

  if (/Person One|Person Two|Person Three|The Three Lives Exercise/i.test(spaced)) {
    // Founder-only exercise — never emit participant writing pages.
    return [];
  }

  const parts = spaced
    .split(
      /(?=(?:Step (?:One|Two|Three|Four|Five|Six|Seven)|Question (?:One|Two|Three|Four|Five|Six|Seven))\b)/i,
    )
    .map((part) => part.trim())
    .filter((part) =>
      /^(?:Step (?:One|Two|Three|Four|Five|Six|Seven)|Question (?:One|Two|Three|Four|Five|Six|Seven))\b/i.test(
        part,
      ),
    );

  if (parts.length === 0) {
    const titled = spaced.match(
      /^(The Standards Exercise|The Decision Ladder)\b([\s\S]*)/i,
    );
    if (titled) {
      return [
        {
          heading: "Practice",
          title: titled[1],
          instructions: linesFromExerciseBody(titled[2] || spaced),
          examples: [],
          writingLines: 16,
        },
      ];
    }
    const lines = linesFromExerciseBody(spaced);
    return [
      {
        heading: "Practice",
        title: "Reflection & practice",
        instructions: lines,
        examples: [],
          writingLines: 16,
      },
    ];
  }

  return parts.map((part, index) => {
    const headingMatch = part.match(
      /^(Step (?:One|Two|Three|Four|Five|Six|Seven)|Question (?:One|Two|Three|Four|Five|Six|Seven))\b/i,
    );
    const heading = headingMatch?.[1] ?? `Practice ${index + 1}`;
    const remainder = part.slice(heading.length).trim();
    const lines = linesFromExerciseBody(remainder);
    const title = lines[0] ?? heading;
    const instructions = lines.length > 1 ? lines.slice(1) : lines;
    return {
      heading,
      title: title.length > 90 ? heading : title,
      instructions: title.length > 90 ? lines : instructions,
      examples: [],
      writingLines: 16,
    };
  });
}

function isExerciseBoundary(paragraph: string): boolean {
  return /^(Architect Reflection Questions|Intentional Practice|Step (?:One|Two|Three|Four|Five|Six|Seven)|The Standards Exercise|The Decision Ladder)\b/i.test(
    paragraph.trim(),
  );
}

function isTeachingBoundary(paragraph: string, index: number): boolean {
  if (index <= 0) return false;
  return /^(Every extraordinary life|Standards determine|Growth doesn't end|Your Journey does not end|By now, you've spent time|Welcome back\.(?!\s*Architect))/i.test(
    paragraph.trim(),
  );
}

export function getChapterPrintParts(
  chapterId: ChapterId,
  manuscript: ManuscriptBlock | null | undefined,
): ChapterPrintParts {
  const paragraphs = (manuscript?.paragraphs ?? [])
    .map((paragraph) => paragraph?.trim())
    .filter((paragraph): paragraph is string => Boolean(paragraph));

  const finish = (parts: ChapterPrintParts): ChapterPrintParts => {
    if (chapterId !== "chapter-4-standards") return parts;
    return {
      ...parts,
      exercises: withChapter4ParticipantExercises(parts.exercises),
    };
  };

  if (chapterId === "chapter-1-awakening") {
    const welcomeRaw = paragraphs[0] ?? "";
    const personalizedWelcome = personalizeChapter1Welcome(welcomeRaw, null);
    return finish({
      opener: openerFromParagraph(personalizedWelcome),
      body: bodyFromParagraph(paragraphs[1]),
      exercises: chapter1Exercises(),
    });
  }

  if (!paragraphs.length) {
    return finish({ opener: null, body: null, exercises: [] });
  }

  // Well-structured manuscripts start with a standalone welcome line.
  if (/^Welcome(?: back)?, Architect\.?$/i.test(paragraphs[0])) {
    const teachingIndex = paragraphs.findIndex((paragraph, index) =>
      isTeachingBoundary(paragraph, index),
    );
    const exerciseIndex = paragraphs.findIndex((paragraph) =>
      isExerciseBoundary(paragraph),
    );

    const openerEnd =
      teachingIndex > 0
        ? teachingIndex
        : exerciseIndex > 0
          ? exerciseIndex
          : Math.min(paragraphs.length, 6);
    const bodyEnd =
      exerciseIndex > openerEnd ? exerciseIndex : paragraphs.length;

    const openerParagraphs = paragraphs.slice(0, openerEnd);
    const bodyParagraphs = paragraphs.slice(openerEnd, bodyEnd);
    const exerciseParagraphs = paragraphs.slice(bodyEnd);

    return finish({
      opener: formatManuscriptBlock(
        { paragraphs: openerParagraphs },
        { personalize: true },
      ),
      body: bodyParagraphs.length
        ? formatManuscriptBlock(
            { paragraphs: bodyParagraphs },
            { personalize: true },
          )
        : null,
      exercises: exerciseParagraphs.length
        ? splitExerciseSections(exerciseParagraphs.join(PARAGRAPH_SENTINEL))
        : [],
    });
  }

  const exerciseSource = paragraphs
    .slice(2)
    .filter((paragraph) => paragraph?.trim())
    .join(PARAGRAPH_SENTINEL);

  return finish({
    opener: openerFromParagraph(paragraphs[0]),
    body: bodyFromParagraph(paragraphs[1]),
    exercises: exerciseSource ? splitExerciseSections(exerciseSource) : [],
  });
}

