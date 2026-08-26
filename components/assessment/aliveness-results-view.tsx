import Link from "next/link";
import { getAlivenessIndexLocalized } from "@/content/journey/localized";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import { getAlivenessLuminaDiscussionPath } from "@/lib/journey/assessments/paths";
import { computeAlivenessResults } from "@/lib/journey/assessments/aliveness";
import type {
  AlivenessAssessmentState,
  AlivenessResultsSnapshot,
} from "@/lib/journey/onboarding/types";
import type { Locale } from "@/lib/i18n/config";

type AlivenessResultsViewProps = {
  locale: Locale;
  assessment: AlivenessAssessmentState;
  /** Optional next-step orientation (onboarding → Awakening / Journey). */
  nextHref?: string;
  nextLabel?: string;
  /** Optional override for Lumina discussion CTA (Row 84 review route). */
  luminaHref?: string;
};

function fillTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function resolveSnapshot(
  assessment: AlivenessAssessmentState,
): AlivenessResultsSnapshot | null {
  if (assessment.resultsSnapshot) {
    return assessment.resultsSnapshot;
  }
  const computed = computeAlivenessResults(assessment.responses);
  if (!computed.complete) {
    return null;
  }
  return {
    domainScores: computed.domainScores,
    total: computed.total,
    maxTotal: computed.maxTotal,
    highestDomains: computed.highestDomains,
    lowestDomains: computed.lowestDomains,
    completedAt: assessment.completedAt ?? new Date().toISOString(),
  };
}

export function AlivenessResultsView({
  locale,
  assessment,
  nextHref,
  nextLabel,
  luminaHref: luminaHrefOverride,
}: AlivenessResultsViewProps) {
  const copy = getDictionary(locale).appShell.assessment;
  const onboarding = getDictionary(locale).appShell.onboarding;
  const index = getAlivenessIndexLocalized(locale);
  const snapshot = resolveSnapshot(assessment);

  /** Snapshots persist the domain name from the scoring locale — relabel it. */
  function domainLabel(domainId: string, fallback?: string): string {
    return (
      index.domains.find((domain) => domain.id === domainId)?.name ??
      fallback ??
      domainId
    );
  }

  if (!snapshot) {
    return (
      <div className="bh-aliveness-results">
        <p className="bh-onboarding-step-body">
          {resolveAppShellLabel(locale, copy.incompleteBody)}
        </p>
      </div>
    );
  }

  const highestLabels = snapshot.highestDomains.map((id) => domainLabel(id));
  const lowestLabels = snapshot.lowestDomains.map((id) => domainLabel(id));
  const luminaHref =
    luminaHrefOverride ?? getAlivenessLuminaDiscussionPath(locale);

  return (
    <div className="bh-aliveness-results">
      <header className="bh-aliveness-results-hero">
        <p className="bh-aliveness-results-eyebrow">
          {resolveAppShellLabel(locale, copy.resultsEyebrow)}
        </p>
        <h2 className="bh-onboarding-step-title">
          {resolveAppShellLabel(locale, copy.resultsTitle)}
        </h2>
        <p
          className="bh-aliveness-results-total"
          aria-label={fillTemplate(
            resolveAppShellLabel(locale, onboarding.assessmentScoreLabel),
            { score: snapshot.total, max: snapshot.maxTotal },
          )}
        >
          <span className="bh-aliveness-results-total-value">
            {snapshot.total}
          </span>
          <span className="bh-aliveness-results-total-max">
            {" "}
            / {snapshot.maxTotal ?? index.maxTotal}
          </span>
        </p>
        <p className="bh-aliveness-results-total-label">
          {resolveAppShellLabel(locale, copy.overallLabel)}
        </p>
      </header>

      <section
        className="bh-aliveness-results-section"
        aria-labelledby="aliveness-priorities-heading"
      >
        <h3
          id="aliveness-priorities-heading"
          className="bh-onboarding-subheading"
        >
          {resolveAppShellLabel(locale, copy.prioritiesLabel)}
        </h3>
        <ul className="bh-aliveness-priority-list">
          <li>
            <span className="bh-aliveness-priority-kind">
              {resolveAppShellLabel(locale, copy.highestLabel)}
            </span>
            <span className="bh-aliveness-priority-value">
              {highestLabels.join(", ")}
            </span>
          </li>
          <li>
            <span className="bh-aliveness-priority-kind">
              {resolveAppShellLabel(locale, copy.lowestLabel)}
            </span>
            <span className="bh-aliveness-priority-value">
              {lowestLabels.join(", ")}
            </span>
            <span className="bh-aliveness-priority-hint">
              {resolveAppShellLabel(locale, copy.attentionHint)}
            </span>
          </li>
        </ul>
      </section>

      <section
        className="bh-aliveness-results-section"
        aria-labelledby="aliveness-domains-heading"
      >
        <h3 id="aliveness-domains-heading" className="bh-onboarding-subheading">
          {resolveAppShellLabel(locale, copy.domainsLabel)}
        </h3>
        <ul className="bh-aliveness-domain-scores">
          {snapshot.domainScores.map((domain) => {
            const name = domainLabel(domain.domainId, domain.name);
            const isHighest = snapshot.highestDomains.includes(domain.domainId);
            const isLowest = snapshot.lowestDomains.includes(domain.domainId);
            const markers = [
              isHighest
                ? resolveAppShellLabel(locale, copy.highestMarker)
                : null,
              isLowest
                ? resolveAppShellLabel(locale, copy.lowestMarker)
                : null,
            ].filter(Boolean);
            return (
              <li key={domain.domainId} className="bh-aliveness-domain-score">
                <div className="bh-aliveness-domain-score-row">
                  <span className="bh-aliveness-domain-score-name">
                    {name}
                  </span>
                  <span className="bh-aliveness-domain-score-value">
                    {domain.score} / {domain.maxScore}
                  </span>
                </div>
                <div
                  className="bh-aliveness-domain-meter"
                  role="img"
                  aria-label={fillTemplate(
                    resolveAppShellLabel(locale, copy.domainScoreAria),
                    {
                      name,
                      score: domain.score,
                      max: domain.maxScore,
                    },
                  )}
                >
                  <div
                    className="bh-aliveness-domain-meter-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, (domain.score / domain.maxScore) * 100),
                      )}%`,
                    }}
                  />
                </div>
                {markers.length > 0 ? (
                  <p className="bh-aliveness-domain-markers">{markers.join(" · ")}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section
        className="bh-aliveness-results-section bh-onboarding-prose"
        aria-labelledby="aliveness-reflection-heading"
      >
        <h3
          id="aliveness-reflection-heading"
          className="bh-onboarding-subheading"
        >
          {resolveAppShellLabel(locale, onboarding.assessmentReflectionLabel)}
        </h3>
        <ul>
          {index.reflectionPrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
        <h3 className="bh-onboarding-subheading">
          {resolveAppShellLabel(locale, onboarding.assessmentRememberLabel)}
        </h3>
        {index.remember.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <div className="bh-aliveness-results-actions">
        <Link href={luminaHref} className="bh-cta inline-flex">
          {resolveAppShellLabel(locale, copy.discussWithLumina)}
        </Link>
        {nextHref && nextLabel ? (
          <Link href={nextHref} className="bh-cta bh-cta-secondary inline-flex">
            {nextLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
