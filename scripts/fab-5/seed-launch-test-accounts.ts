/**
 * Local/non-production seed for Launch Readiness row 176 test accounts.
 * Blocked on Vercel hosted environments. Does not print the password.
 *
 * Usage:
 *   LAUNCH_QA_PASSWORD='…' npx tsx scripts/fab-5/seed-launch-test-accounts.ts
 * If Postgres is configured, also set ALLOW_LAUNCH_TEST_SEED=1 for a non-production database.
 */
import {
  resolveLaunchTestPassword,
  seedLaunchTestAccounts,
} from "@/lib/qa/launch-test-accounts";

async function main() {
  const password = resolveLaunchTestPassword();
  const result = await seedLaunchTestAccounts({ password });
  console.log(
    JSON.stringify(
      {
        seededAt: result.seededAt,
        productionWrite: result.productionWrite,
        accountCount: result.accounts.length,
        emails: result.accounts.map((account) => account.email),
        roles: result.accounts.map((account) => ({
          email: account.email,
          role: account.role,
        })),
        supportTickets: result.supportTickets,
        passwordPrinted: false,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
