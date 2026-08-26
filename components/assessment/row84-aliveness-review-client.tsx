"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlivenessAssessmentForm } from "@/components/assessment/aliveness-assessment-form";
import { AlivenessResultsView } from "@/components/assessment/aliveness-results-view";
import { StatusNotice, TextLink } from "@/components/design-system";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { luminaAsset } from "@/content/lumina";
import { isAlivenessAssessmentComplete } from "@/content/journey/aliveness-index";
import {
  buildResultsSnapshot,
  toAlivenessContextSummary,
} from "@/lib/journey/assessments/aliveness";
import {
  buildStubAssistantReply,
  createMessage,
} from "@/lib/lumina/conversation";
import type {
  AlivenessAssessmentState,
  AlivenessRating,
} from "@/lib/journey/onboarding/types";
import { emptyAssessmentState } from "@/lib/journey/onboarding/types";
import type { LuminaMessage } from "@/lib/lumina/types";

export const ROW84_REVIEW_BASE = "/_internal/row84-aliveness-review";
const STORAGE_KEY = "bh-row84-aliveness-review-v1";

export type Row84ReviewView = "questions" | "results" | "lumina";

type StoredAssessment = AlivenessAssessmentState;

function asRatingResponses(
  responses: Record<string, number>,
): Record<string, AlivenessRating> {
  return responses as Record<string, AlivenessRating>;
}

function readStored(): StoredAssessment {
  if (typeof window === "undefined") {
    return emptyAssessmentState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAssessmentState();
    const parsed = JSON.parse(raw) as StoredAssessment;
    if (!parsed || typeof parsed !== "object") {
      return emptyAssessmentState();
    }
    return {
      responses:
        parsed.responses && typeof parsed.responses === "object"
          ? parsed.responses
          : {},
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      ...(typeof parsed.completedAt === "string"
        ? { completedAt: parsed.completedAt }
        : {}),
      ...(parsed.resultsSnapshot
        ? { resultsSnapshot: parsed.resultsSnapshot }
        : {}),
    };
  } catch {
    return emptyAssessmentState();
  }
}

function writeStored(assessment: StoredAssessment) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assessment));
}

type Row84AlivenessReviewClientProps = {
  view: Row84ReviewView;
};

export function Row84AlivenessReviewClient({
  view,
}: Row84AlivenessReviewClientProps) {
  const [assessment, setAssessment] = useState<StoredAssessment>(() =>
    emptyAssessmentState(),
  );
  const [hydrated, setHydrated] = useState(false);
  const copy = getDictionary("en").appShell.assessment;
  const onboarding = getDictionary("en").appShell.onboarding;

  useEffect(() => {
    setAssessment(readStored());
    setHydrated(true);
  }, []);

  const complete = Boolean(
    assessment.resultsSnapshot ||
      (hydrated && isAlivenessAssessmentComplete(assessment.responses)),
  );

  useEffect(() => {
    if (!hydrated) return;
    if (view === "results" && !complete) {
      window.location.replace(`${ROW84_REVIEW_BASE}?view=questions`);
    }
    if (view === "questions" && assessment.resultsSnapshot) {
      window.location.replace(`${ROW84_REVIEW_BASE}?view=results`);
    }
  }, [hydrated, view, complete, assessment.resultsSnapshot]);

  const persistSave = useCallback(async (responses: Record<string, number>) => {
    const next: StoredAssessment = {
      responses: asRatingResponses(responses),
      updatedAt: new Date().toISOString(),
    };
    writeStored(next);
    setAssessment(next);
    return { status: "ok" as const };
  }, []);

  const persistComplete = useCallback(
    async (responses: Record<string, number>) => {
      if (!isAlivenessAssessmentComplete(responses)) {
        return { status: "error" as const, code: "incomplete_assessment" };
      }
      const completedAt = new Date().toISOString();
      const ratingResponses = asRatingResponses(responses);
      const resultsSnapshot = buildResultsSnapshot(ratingResponses, completedAt);
      if (!resultsSnapshot) {
        return { status: "error" as const, code: "incomplete_assessment" };
      }
      const next: StoredAssessment = {
        responses: ratingResponses,
        updatedAt: completedAt,
        completedAt,
        resultsSnapshot,
      };
      writeStored(next);
      setAssessment(next);
      return { status: "ok" as const };
    },
    [],
  );

  const resetReview = useCallback(() => {
    const empty = emptyAssessmentState();
    writeStored(empty);
    setAssessment(empty);
    window.location.replace(`${ROW84_REVIEW_BASE}?view=questions`);
  }, []);

  if (!hydrated) {
    return (
      <p className="font-sans text-sm font-light text-bh-muted">Loading…</p>
    );
  }

  if (view === "lumina") {
    return (
      <Row84LuminaReview
        assessment={assessment}
        onReset={resetReview}
      />
    );
  }

  if (view === "results") {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-sm font-light text-bh-muted">
            {resolveAppShellLabel("en", copy.resultsDescription)}
          </p>
          <button
            type="button"
            className="bh-cta bh-cta-secondary inline-flex text-xs"
            onClick={resetReview}
          >
            Reset review assessment
          </button>
        </div>
        <AlivenessResultsView
          locale="en"
          assessment={assessment}
          luminaHref={`${ROW84_REVIEW_BASE}?view=lumina`}
          nextHref={`${ROW84_REVIEW_BASE}?view=questions`}
          nextLabel="Back to assessment"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="bh-onboarding-step-title">
          {resolveAppShellLabel("en", onboarding.assessmentTitle)}
        </h2>
        <button
          type="button"
          className="bh-cta bh-cta-secondary inline-flex text-xs"
          onClick={resetReview}
        >
          Reset review assessment
        </button>
      </div>
      <p className="mb-8 font-sans text-base font-light text-bh-muted">
        {resolveAppShellLabel("en", copy.questionsDescription)}
      </p>
      <AlivenessAssessmentForm
        locale="en"
        assessment={assessment}
        mode="local"
        showSaveButton
        showCompleteButton
        onLocalSave={persistSave}
        onLocalComplete={persistComplete}
        onComplete={() => {
          window.location.assign(`${ROW84_REVIEW_BASE}?view=results`);
        }}
      />
    </div>
  );
}

function Row84LuminaReview({
  assessment,
  onReset,
}: {
  assessment: StoredAssessment;
  onReset: () => void;
}) {
  const copy = getDictionary("en").appShell.lumina;
  const summary = useMemo(
    () => toAlivenessContextSummary(assessment),
    [assessment],
  );
  const [messages, setMessages] = useState<LuminaMessage[]>([]);
  const [pending, startTransition] = useTransition();
  const startedRef = useRef(false);

  const send = useCallback(
    (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || pending) return;
      startTransition(() => {
        const conversationId = "row84-review-lumina";
        const userMessage = createMessage({
          conversationId,
          role: "user",
          content: trimmed,
        });
        const stub = buildStubAssistantReply(trimmed, {
          locale: "en",
          alivenessAssessment: summary,
        });
        const assistantMessage = createMessage({
          conversationId,
          role: "assistant",
          content: stub.content,
        });
        setMessages((current) => [
          ...current,
          userMessage,
          assistantMessage,
        ]);
      });
    },
    [pending, summary],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    send("I want to discuss my Aliveness Index and my scores.");
  }, [send]);

  return (
    <div className="bh-lumina-chat">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-xs font-medium uppercase tracking-[0.14em] text-bh-muted">
            Lumina discussion — Aliveness Index
          </p>
          <p className="mt-1 font-sans text-sm font-light text-bh-muted">
            Uses the same stub reply + assessment context path as production.
            Context status: {summary.status}
            {summary.total != null
              ? ` · ${summary.total}/${summary.maxTotal ?? 225}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`${ROW84_REVIEW_BASE}?view=results`}
            className="bh-cta bh-cta-secondary inline-flex text-xs"
          >
            Back to results
          </Link>
          <button
            type="button"
            className="bh-cta bh-cta-secondary inline-flex text-xs"
            onClick={onReset}
          >
            Reset review assessment
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
            <div className="bh-lumina-chat-empty">
              <div className="bh-lumina-chat-empty-copy">
                <h2 className="bh-lumina-chat-empty-title">
                  {resolveAppShellLabel("en", copy.emptyTitle)}
                </h2>
                <p className="bh-lumina-chat-empty-body">
                  {resolveAppShellLabel("en", copy.emptyBody)}
                </p>
              </div>
            </div>
          ) : (
            <ul className="bh-lumina-chat-messages list-none space-y-4 p-0">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "bh-lumina-chat-message bh-lumina-chat-message-user"
                      : "bh-lumina-chat-message bh-lumina-chat-message-assistant"
                  }
                >
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

      {summary.status !== "complete" ? (
        <div className="mt-6">
          <StatusNotice variant="pending">
            <p>
              Complete the assessment and open results first so Lumina receives
              your scores. Current context: {summary.status}.
            </p>
          </StatusNotice>
        </div>
      ) : null}
    </div>
  );
}
