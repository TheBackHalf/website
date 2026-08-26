import { AdminReconcileForm } from "@/components/access/admin-reconcile-form";
import { getDictionary } from "@/content/i18n/get-dictionary";
import { listArchitectAccountsForAdmin } from "@/lib/auth/operations/admin";
import type { Locale } from "@/lib/i18n/config";

type AdminOpsViewProps = {
  locale: Locale;
};

export async function AdminOpsView({ locale }: AdminOpsViewProps) {
  const copy = getDictionary(locale).access;
  const result = await listArchitectAccountsForAdmin();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 text-bh-ink">
      <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
        {copy.adminTitle}
      </h1>
      <p className="mt-3 max-w-2xl font-sans text-base font-light text-bh-muted">
        {copy.adminDescription}
      </p>
      <p className="mt-4 font-sans text-sm">
        <a href={locale === "es" ? "/es/ops/admin/launch-dashboard" : "/ops/admin/launch-dashboard"}>
          Daily Launch Dashboard
        </a>
        {" · "}
        <a href={locale === "es" ? "/es/ops/admin/launch-kpi" : "/ops/admin/launch-kpi"}>
          Launch Marketing KPI Dashboard
        </a>
        {" · "}
        <a href={locale === "es" ? "/es/ops/admin/agent-operations" : "/ops/admin/agent-operations"}>
          Agent Operations
        </a>
        {" · "}
        <a href="/ops/admin/support">Support tickets</a>
      </p>

      <section className="bh-app-settings-section mt-8" aria-labelledby="admin-accounts">
        <h2 id="admin-accounts" className="bh-app-settings-section-title">
          {copy.accountsHeading}
        </h2>
        {result.status !== "ok" ? (
          <p className="bh-app-settings-empty">{copy.noAccounts}</p>
        ) : result.accounts.length === 0 ? (
          <p className="bh-app-settings-empty">{copy.noAccounts}</p>
        ) : (
          <ul className="mt-4 space-y-3 font-sans text-sm">
            {result.accounts.map((account) => (
              <li
                key={account.id}
                className="rounded-sm border border-bh-purple/10 px-4 py-3"
              >
                <p className="font-medium text-bh-ink">{account.email}</p>
                <p className="mt-1 text-bh-muted">
                  {account.firstName} {account.lastName} · {account.role} ·{" "}
                  {account.arcCode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="bh-app-settings-section mt-10"
        aria-labelledby="admin-reconcile"
      >
        <h2 id="admin-reconcile" className="bh-app-settings-section-title">
          {copy.reconcileHeading}
        </h2>
        <p className="mt-2 max-w-2xl font-sans text-sm font-light text-bh-muted">
          {copy.reconcileDescription}
        </p>
        <div className="mt-4">
          <AdminReconcileForm locale={locale} />
        </div>
      </section>
    </main>
  );
}
