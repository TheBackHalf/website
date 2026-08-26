import { getDictionary, resolveAppShellLabel } from "@/content/i18n/get-dictionary";

export default function ArchitectDashboardLoading() {
  const dashboard = getDictionary("en").appShell.dashboard;

  return (
    <div
      className="bh-app-dashboard-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {resolveAppShellLabel("en", dashboard.loading)}
    </div>
  );
}
