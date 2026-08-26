"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { decideSectionAccess } from "@/lib/journey/progress/rules";
import type { ChapterProgressStatus } from "@/lib/journey/chapters/types";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type ChapterSectionNavItem = {
  id: string;
  label: string;
  href: string;
};

type ChapterSectionNavProps = {
  locale: Locale;
  progressLabel: string;
  items: readonly ChapterSectionNavItem[];
  currentSectionId: string;
  completedSectionIds: readonly string[];
  chapterStatus: ChapterProgressStatus;
  doneLabel: string;
  onNavigate?: (
    id: string,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
};

export function ChapterSectionNav({
  locale,
  progressLabel,
  items,
  currentSectionId,
  completedSectionIds,
  chapterStatus,
  doneLabel,
  onNavigate,
}: ChapterSectionNavProps) {
  const copy = getDictionary(locale).appShell.journey;
  const order = items.map((item) => item.id);

  return (
    <nav className="bh-chapter-1-nav" aria-label={progressLabel}>
      <ol className="bh-chapter-1-nav-list">
        {items.map((item) => {
          const done = completedSectionIds.includes(item.id);
          const current = item.id === currentSectionId;
          const locked =
            decideSectionAccess(
              item.id,
              order,
              completedSectionIds,
              chapterStatus,
            ) === "locked";
          const className = current
            ? "bh-chapter-1-nav-link bh-chapter-1-nav-link-current"
            : "bh-chapter-1-nav-link";
          return (
            <li key={item.id}>
              {locked ? (
                <span
                  className={`${className} opacity-50`}
                  aria-disabled="true"
                  title={resolveAppShellLabel(locale, copy.sectionLocked)}
                >
                  <span>{item.label}</span>
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={className}
                  aria-current={current ? "step" : undefined}
                  onClick={
                    onNavigate
                      ? (event) => onNavigate(item.id, event)
                      : undefined
                  }
                >
                  <span>{item.label}</span>
                  {done ? <span className="sr-only">{doneLabel}</span> : null}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
