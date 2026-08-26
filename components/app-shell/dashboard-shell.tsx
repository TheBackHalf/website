import Link from "next/link";
import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { ArchitectDashboardModel } from "@/lib/dashboard/architect-dashboard";
import type { Locale } from "@/lib/i18n/config";

type DashboardShellProps = {
  locale: Locale;
  model: ArchitectDashboardModel | null;
  loadError?: boolean;
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

function progressCopy(
  locale: Locale,
  model: ArchitectDashboardModel,
): string {
  const dashboard = getDictionary(locale).appShell.dashboard;
  switch (model.progress.kind) {
    case "no_access":
      return resolveAppShellLabel(locale, dashboard.noAccess);
    case "no_progress":
      return resolveAppShellLabel(locale, dashboard.noProgress);
    case "not_started":
      return resolveAppShellLabel(locale, dashboard.notStarted);
    case "journey_completed":
      return resolveAppShellLabel(locale, dashboard.stateJourneyCompleted);
    case "stage_completed":
      return resolveAppShellLabel(locale, dashboard.stateStageCompleted);
    case "in_progress":
    default: {
      if (
        model.progress.stageOrder != null &&
        model.currentJourney.stageLabel
      ) {
        return fillTemplate(
          resolveAppShellLabel(locale, dashboard.stagePosition),
          {
            current: model.progress.stageOrder,
            total: model.progress.totalStages,
          },
        );
      }
      return resolveAppShellLabel(locale, dashboard.stateInProgress);
    }
  }
}

/**
 * Architect Dashboard — Row 82 live data surface.
 * @see lib/app-shell/integration-points.ts → dashboard
 */
export function DashboardShell({
  locale,
  model,
  loadError = false,
}: DashboardShellProps) {
  const appShell = getDictionary(locale).appShell;
  const dashboard = appShell.dashboard;

  if (loadError || !model) {
    return (
      <AppShellPage locale={locale}>
        <AppShellPageHeader
          title={resolveAppShellLabel(locale, dashboard.title)}
          description={resolveAppShellLabel(locale, dashboard.description)}
        />
        <div
          className="bh-app-dashboard-error"
          role="alert"
          aria-live="assertive"
        >
          {resolveAppShellLabel(locale, dashboard.loadError)}
        </div>
      </AppShellPage>
    );
  }

  const welcome = fillTemplate(
    resolveAppShellLabel(locale, dashboard.welcome),
    { name: model.welcome.displayName },
  );
  const continueLabel = resolveAppShellLabel(
    locale,
    dashboard[model.continue.labelKey],
  );
  const chapterBody = model.currentJourney.stageLabel
    ? model.currentJourney.stageLabel
    : resolveAppShellLabel(locale, dashboard.noCurrentChapter);
  const stateLabel = resolveAppShellLabel(
    locale,
    dashboard[model.stateLabelKey],
  );

  return (
    <AppShellPage locale={locale}>
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, dashboard.title)}
        description={resolveAppShellLabel(locale, dashboard.description)}
      />

      <div className="bh-app-dashboard-grid">
        <section
          className="bh-app-dashboard-card bh-app-dashboard-welcome"
          aria-labelledby="architect-dashboard-welcome"
        >
          <h2
            id="architect-dashboard-welcome"
            className="bh-app-dashboard-welcome-text"
          >
            {welcome}
          </h2>
        </section>

        <section
          className="bh-app-dashboard-card"
          aria-labelledby="architect-dashboard-chapter"
        >
          <h2
            id="architect-dashboard-chapter"
            className="bh-app-dashboard-card-title"
          >
            {resolveAppShellLabel(locale, dashboard.currentChapter)}
          </h2>
          <p className="bh-app-dashboard-card-body">{chapterBody}</p>
          <p className="bh-app-dashboard-meta">{stateLabel}</p>
        </section>

        <section
          className="bh-app-dashboard-card"
          aria-labelledby="architect-dashboard-progress"
        >
          <h2
            id="architect-dashboard-progress"
            className="bh-app-dashboard-card-title"
          >
            {resolveAppShellLabel(locale, dashboard.progress)}
          </h2>
          <p className="bh-app-dashboard-card-body" role="status">
            {progressCopy(locale, model)}
          </p>
        </section>

        <section className="bh-app-dashboard-actions">
          <Link
            href={model.continue.href}
            className="bh-cta inline-flex min-h-11 items-center justify-center"
          >
            {continueLabel}
          </Link>
          {model.assessment ? (
            <Link
              href={model.assessment.href}
              className="bh-cta bh-cta-secondary inline-flex min-h-11 items-center justify-center"
            >
              {resolveAppShellLabel(
                locale,
                model.assessment.complete
                  ? getDictionary(locale).appShell.assessment
                      .dashboardLinkComplete
                  : getDictionary(locale).appShell.assessment
                      .dashboardLinkIncomplete,
              )}
            </Link>
          ) : null}
        </section>

        <section
          className="bh-app-dashboard-card bh-app-dashboard-resources"
          aria-labelledby="architect-dashboard-resources"
        >
          <h2
            id="architect-dashboard-resources"
            className="bh-app-dashboard-card-title"
          >
            {resolveAppShellLabel(locale, dashboard.resourcesPreview)}
          </h2>
          {model.resourcesPreview.length === 0 ? (
            <p className="bh-app-dashboard-empty" role="status">
              {resolveAppShellLabel(locale, dashboard.viewAllResources)}
            </p>
          ) : (
            <ul className="bh-app-dashboard-resource-list">
              {model.resourcesPreview.map((asset) => (
                <li key={asset.id}>
                  <Link href={asset.href} className="bh-text-link">
                    {asset.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="bh-app-dashboard-resources-more">
            <Link href={model.links.resources} className="bh-text-link">
              {resolveAppShellLabel(locale, dashboard.viewAllResources)}
            </Link>
          </p>
        </section>

        <aside
          className="bh-app-dashboard-quicklinks"
          aria-label={resolveAppShellLabel(locale, dashboard.quickLinksLabel)}
        >
          <ul className="bh-app-quicklinks-list">
            <li>
              <Link href={model.links.settings} className="bh-text-link">
                {resolveAppShellLabel(locale, appShell.settings.title)}
              </Link>
            </li>
            <li>
              <Link href={model.links.support} className="bh-text-link">
                {resolveAppShellLabel(locale, appShell.nav.support)}
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </AppShellPage>
  );
}
