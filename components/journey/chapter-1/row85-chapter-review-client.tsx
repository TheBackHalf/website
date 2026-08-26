"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Chapter1Experience } from "@/components/journey/chapter-1/chapter-1-experience";
import { TextLink } from "@/components/design-system";
import {
  type Chapter1SectionId,
} from "@/content/journey/chapter-1-awakening";
import { luminaAsset } from "@/content/lumina";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import {
  isAlivenessProjectComplete,
  isAwakeningCommitmentComplete,
  isAwakeningReflectionComplete,
  markSectionComplete,
  mergeAlivenessProjectAnswers,
  toChapter1ContextSummary,
} from "@/lib/journey/chapters/chapter-1";
import {
  createEmptyChapter1Record,
  type AlivenessProjectAnswers,
  type Chapter1Record,
} from "@/lib/journey/chapters/types";
import {
  buildStubAssistantReply,
  createMessage,
} from "@/lib/lumina/conversation";
import type { LuminaMessage } from "@/lib/lumina/types";

export const ROW85_REVIEW_BASE = "/_internal/row85-chapter-review";
const STORAGE_KEY = "bh-row85-chapter-review-v1";

export type Row85ReviewView = Chapter1SectionId | "lumina";

function readStored(): Chapter1Record {
  if (typeof window === "undefined") {
    return createEmptyChapter1Record("row85-review");
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyChapter1Record("row85-review");
    const parsed = JSON.parse(raw) as Chapter1Record;
    if (!parsed || typeof parsed !== "object") {
      return createEmptyChapter1Record("row85-review");
    }
    return {
      ...createEmptyChapter1Record("row85-review"),
      ...parsed,
      userId: "row85-review",
      chapterId: "chapter-1-awakening",
      alivenessProject: {
        answers: {
          q1: parsed.alivenessProject?.answers?.q1 ?? [],
          q2: parsed.alivenessProject?.answers?.q2 ?? [],
          q3: parsed.alivenessProject?.answers?.q3 ?? [],
          q4: parsed.alivenessProject?.answers?.q4 ?? [],
          q5: parsed.alivenessProject?.answers?.q5 ?? [],
        },
        updatedAt:
          parsed.alivenessProject?.updatedAt ?? new Date().toISOString(),
        completedAt: parsed.alivenessProject?.completedAt ?? null,
      },
    };
  } catch {
    return createEmptyChapter1Record("row85-review");
  }
}

function writeStored(record: Chapter1Record) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

type Row85ChapterReviewClientProps = {
  view: Row85ReviewView;
};

export function Row85ChapterReviewClient({
  view,
}: Row85ChapterReviewClientProps) {
  const [record, setRecord] = useState<Chapter1Record>(() =>
    createEmptyChapter1Record("row85-review"),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRecord(readStored());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Chapter1Record) => {
    writeStored(next);
    setRecord(next);
  }, []);

  const resetReview = useCallback(() => {
    const empty = createEmptyChapter1Record("row85-review");
    writeStored(empty);
    setRecord(empty);
    window.location.replace(`${ROW85_REVIEW_BASE}?section=welcome`);
  }, []);

  const onLocalProjectSave = useCallback(
    async (answers: AlivenessProjectAnswers) => {
      const now = new Date().toISOString();
      const nextProject = mergeAlivenessProjectAnswers(
        record.alivenessProject,
        answers,
        now,
      );
      let next: Chapter1Record = {
        ...record,
        alivenessProject: nextProject,
        status: record.status === "completed" ? "completed" : "in_progress",
        updatedAt: now,
      };
      if (isAlivenessProjectComplete(nextProject.answers)) {
        next = markSectionComplete(next, "practice", now);
      }
      persist(next);
      return { status: "ok" as const };
    },
    [persist, record],
  );

  const onLocalAdvance = useCallback(
    async (sectionId: Chapter1SectionId) => {
      const now = new Date().toISOString();
      let next = record;

      if (sectionId === "reflection") {
        if (!isAwakeningReflectionComplete(next.reflection.answers)) {
          return { status: "error" as const, code: "incomplete_exercise" };
        }
      }

      if (sectionId === "practice") {
        if (!isAlivenessProjectComplete(next.alivenessProject.answers)) {
          return { status: "error" as const, code: "incomplete_exercise" };
        }
      }

      if (sectionId === "commitment") {
        if (!isAwakeningCommitmentComplete(next.commitment)) {
          return { status: "error" as const, code: "incomplete_exercise" };
        }
      }

      if (sectionId === "complete") {
        const required: Chapter1SectionId[] = [
          "welcome",
          "reflection",
          "practice",
          "commitment",
          "closing",
        ];
        const missing = required.some(
          (id) => !next.completedSectionIds.includes(id),
        );
        if (
          missing ||
          !isAwakeningReflectionComplete(next.reflection.answers) ||
          !isAlivenessProjectComplete(next.alivenessProject.answers) ||
          !isAwakeningCommitmentComplete(next.commitment)
        ) {
          return { status: "error" as const, code: "incomplete_exercise" };
        }
        next = {
          ...markSectionComplete(next, "complete", now),
          status: "completed",
          currentSectionId: "complete",
          completedAt: next.completedAt ?? now,
          updatedAt: now,
        };
        persist(next);
        return { status: "ok" as const, nextSectionId: "complete" as const };
      }

      next = markSectionComplete(next, sectionId, now);
      const order: Chapter1SectionId[] = [
        "welcome",
        "reflection",
        "practice",
        "commitment",
        "closing",
        "complete",
      ];
      const index = order.indexOf(sectionId);
      const nextSectionId = order[Math.min(index + 1, order.length - 1)]!;
      next = {
        ...next,
        currentSectionId: nextSectionId,
        updatedAt: now,
      };

      if (
        nextSectionId === "complete" &&
        next.completedSectionIds.includes("welcome") &&
        next.completedSectionIds.includes("reflection") &&
        next.completedSectionIds.includes("practice") &&
        next.completedSectionIds.includes("commitment") &&
        next.completedSectionIds.includes("closing") &&
        isAwakeningReflectionComplete(next.reflection.answers) &&
        isAlivenessProjectComplete(next.alivenessProject.answers) &&
        isAwakeningCommitmentComplete(next.commitment)
      ) {
        next = {
          ...markSectionComplete(next, "complete", now),
          status: "completed",
          completedAt: next.completedAt ?? now,
        };
      }

      persist(next);
      return { status: "ok" as const, nextSectionId };
    },
    [persist, record],
  );

  if (!hydrated) {
    return (
      <p className="font-sans text-sm font-light text-bh-muted">Loading…</p>
    );
  }

  if (view === "lumina") {
    return (
      <Row85LuminaReview record={record} onReset={resetReview} />
    );
  }

  return (
    <div>
      <Chapter1Experience
        locale="en"
        firstName="Kimberly"
        sectionId={view}
        record={record}
        reviewBasePath={ROW85_REVIEW_BASE}
        onLocalAdvance={onLocalAdvance}
        onLocalProjectSave={onLocalProjectSave}
        luminaHref={`${ROW85_REVIEW_BASE}?section=lumina`}
        dashboardHref={ROW85_REVIEW_BASE}
        journeyHref={ROW85_REVIEW_BASE}
      />
    </div>
  );
}

function Row85LuminaReview({
  record,
  onReset,
}: {
  record: Chapter1Record;
  onReset: () => void;
}) {
  const copy = getDictionary("en").appShell.lumina;
  const summary = useMemo(() => toChapter1ContextSummary(record), [record]);
  const [messages, setMessages] = useState<LuminaMessage[]>([]);
  const [pending, startTransition] = useTransition();
  const startedRef = useRef(false);

  const send = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || pending) return;
      startTransition(() => {
        const conversationId = "row85-review-lumina";
        const userMessage = createMessage({
          conversationId,
          role: "user",
          content: trimmed,
        });
        const stub = buildStubAssistantReply(trimmed, {
          locale: "en",
          chapter1: summary,
        });
        const assistantMessage = createMessage({
          conversationId,
          role: "assistant",
          content: stub.content,
        });
        setMessages((current) => [...current, userMessage, assistantMessage]);
      });
    },
    [pending, summary],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    send(
      "I want to discuss Chapter One — The Awakening and The Aliveness Project.",
    );
  }, [send]);

  return (
    <div className="bh-lumina-chat">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
            Lumina discussion — Chapter One
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            Same awakening opener + chapter context path as production. Chapter
            status: {summary.status} · section {summary.currentSectionId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${ROW85_REVIEW_BASE}?section=complete`}
            className="bh-cta bh-cta-secondary inline-flex text-xs"
          >
            Back to chapter complete
          </Link>
          <button
            type="button"
            className="bh-cta bh-cta-secondary inline-flex text-xs"
            onClick={onReset}
          >
            Reset review chapter
          </button>
        </div>
      </div>

      <p className="bh-lumina-memory-indicator" aria-live="polite">
        {resolveAppShellLabel("en", copy.memoryInactive)}
        {" — "}
        Review route does not change your production memory preference.
      </p>

      <div className="bh-lumina-chat-column">
        <div className="bh-lumina-chat-presence mb-6" aria-hidden="true">
          <Image
            src={luminaAsset.heroImage}
            alt=""
            width={1024}
            height={1536}
            className="bh-lumina-chat-presence-image"
            sizes="(max-width: 640px) min(78vw, 20rem), (max-width: 1024px) 18rem, 20rem"
            priority
          />
        </div>
        <div className="bh-lumina-chat-scroll" tabIndex={0}>
          {messages.length === 0 ? (
            <div className="bh-lumina-chat-empty-copy">
              <h2 className="bh-lumina-chat-empty-title">
                {resolveAppShellLabel("en", copy.emptyTitle)}
              </h2>
              <p className="bh-lumina-chat-empty-body">
                {resolveAppShellLabel("en", copy.emptyBody)}
              </p>
            </div>
          ) : (
            <ul className="bh-lumina-chat-messages list-none space-y-4 p-0">
              {messages.map((message) => (
                <li key={message.id}>
                  <p className="m-0 font-sans text-sm font-medium text-bh-muted">
                    {message.role === "user" ? "You" : "Lumina"}
                  </p>
                  <p className="mt-1 font-sans text-base font-light leading-relaxed text-bh-ink">
                    {message.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form
          className="bh-lumina-chat-composer mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = form.elements.namedItem(
              "message",
            ) as HTMLInputElement | null;
            if (!input) return;
            send(input.value);
            input.value = "";
          }}
        >
          <input
            name="message"
            className="min-h-11 flex-1 rounded-sm border border-bh-purple/20 bg-white/70 px-3 font-sans text-sm text-bh-ink"
            placeholder={resolveAppShellLabel("en", copy.composerPlaceholder)}
            disabled={pending}
            aria-label={resolveAppShellLabel("en", copy.composerPlaceholder)}
          />
          <button
            type="submit"
            className="bh-cta inline-flex"
            disabled={pending}
          >
            {resolveAppShellLabel("en", copy.send)}
          </button>
        </form>
        <p className="mt-4 font-sans text-xs font-light text-bh-muted">
          <TextLink href="/legal/ai-disclosure">AI Disclosure</TextLink>
        </p>
      </div>
    </div>
  );
}
