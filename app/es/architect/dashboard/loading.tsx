import { getDictionary, resolveAppShellLabel } from "@/content/i18n/get-dictionary";

export default function EsArchitectDashboardLoading() {
  const dashboard = getDictionary("es").appShell.dashboard;

  return (
    <div
      className="bh-app-dashboard-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {resolveAppShellLabel("es", dashboard.loading)}
    </div>
  );
}