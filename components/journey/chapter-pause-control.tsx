"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { pauseJourneyChapterAction } from "@/lib/journey/progress/actions";
import { flushJourneyDrafts } from "@/lib/journey/progress/use-draft-autosave";
import type { JourneyChapterId } from "@/lib/journey/progress/rules";
import type { Locale } from "@/lib/i18n/config";

type ChapterPauseControlProps = {
  locale: Locale;
  chapterId: JourneyChapterId;
  sectionId: string;
};

export function ChapterPauseControl({
  locale,
  chapterId,
  sectionId,
}: ChapterPauseControlProps) {
  const router = useRouter();
  const copy = getDictionary(locale).appShell.journey;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  function pause() {
    setError(false);
    startTransition(async () => {
      await flushJourneyDrafts();
      const result = await pauseJourneyChapterAction({ chapterId, sectionId });
      if (result.status !== "ok") {
        setError(true);
        return;
      }
      router.push(getLocalizedArchitectPath("journey", locale));
      router.refresh();
    });
  }

  return (
    <div className="bh-onboarding-actions mt-4">
      <button
        type="button"
        className="bh-cta bh-cta-secondary"
        disabled={pending}
        onClick={pause}
      >
        {pending
          ? resolveAppShellLabel(locale, copy.pausing)
          : resolveAppShellLabel(locale, copy.pauseAndSave)}
      </button>
      {error ? (
        <p className="mt-2 font-sans text-sm text-bh-muted">
          {resolveAppShellLabel(locale, copy.draftSaveError)}
        </p>
      ) : null}
    </div>
  );
}
