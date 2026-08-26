# ROW-62-BACKUP-DISASTER-RECOVERY

**Status:** COMPLETE. Founder Acceptance: YES. Founder Decision: APPROVED. Percent Complete: 100%.  
**Technical disaster-recovery owner:** Imani Heartbeat — Chief Technology & Risk Officer  
**Operational coordination:** Michelle Northstar — Chief of Staff & Operations Officer  
**Requirement:** Verify automated backups and complete a successful restore test.

### Founder Acceptance record

- Founder Acceptance: YES
- Founder Decision: APPROVED
- Percent Complete: 100%
- Status: Complete
- Remaining blockers: NONE
- Final status: COMPLETE
- Founder accepted: 2026-08-21

This procedure is executable. It does not invent SLA numbers. Observed restore-test results are not contractual RPO/RTO guarantees.

---

## Inventory (production)

| System | Store | Production location | Backup mechanism | In automated DB backups |
| --- | --- | --- | --- | --- |
| Application database | Supabase Postgres `public.*` | Vercel-integrated Supabase (us-east-1) | WAL archiving (`archive_mode=on`) + logical export | Yes |
| Analytics | `analytics_events` | Same Postgres | Same | Yes |
| Marketing KPI / purchases mirror | `marketing_kpi_*` | Same Postgres | Same | Yes |
| Launch dashboard / ops errors | `launch_dashboard_*`, `launch_ops_errors` | Same Postgres | Same | Yes |
| Support tickets | `support_tickets` | Same Postgres | Same | Yes |
| Fab 5 operational state | `michelle_*`, `nia_*` | Same Postgres | Same | Yes |
| Supabase Auth | `auth.users` | Same project | Platform DB backup | Yes (currently 0 rows) |
| Supabase Storage objects | `storage.objects` | Same project | Storage is **not** recovered by SQL-only restore | Empty (0 objects) |
| Application accounts | File store `.data/auth` | Process-local on Vercel | **Not in Postgres** | No |
| Onboarding / Journey / Lumina | File stores `.data/journey`, `.data/lumina` | Process-local on Vercel | **Not in Postgres** | No |
| Billing ledger | File store `.data/billing` | Process-local on Vercel | Stripe is system of record; KPI mirror is in Postgres | Partial |
| Static site / Blueprint PDFs | Git / Vercel deploy | Repository | Redeploy | N/A |
| Payments | Stripe | Stripe | Stripe platform | Stripe, not this database |

Do not claim a Postgres restore recovers Storage objects or `.data/` file stores.

---

## How to determine a restore is required

Imani Heartbeat declares a restore when production Postgres is unavailable, corrupted, or irreversibly wrong, and Launch Health / Row 61 monitoring cannot recover by restart alone. Michelle Northstar coordinates communications. Founder is notified when Launch Health is RED, a critical surface is unavailable, or data loss is possible.

## Where backups are

1. Supabase platform WAL / scheduled backups for the production project (Dashboard → Database → Backups), when the plan provides them.
2. Logical public-schema export used for the Row 62 isolated restore test (`npm run fab5:row62`). Temporary dump files live only in gitignored `.tmp-row62-recovery/` and must be deleted after validation.

## How to select a recovery point

Prefer the most recent consistent backup **before** the incident. Do not restore a backup that is newer than known-good if it contains the corruption. Record the chosen timestamp in the incident log. Do not fabricate PITR granularity that the plan does not provide.

## How restoration is initiated (production incident)

1. Imani Heartbeat only. Michelle coordinates. Founder approval if the action is destructive or irreversible.
2. **Never restore over production as the first action.** Restore into a new isolated Supabase branch/project or a local Postgres, validate, then plan cutover.
3. Use the Supabase Dashboard restore / PITR **or** a logical restore of `public` schema after isolated validation.
4. Application env (`POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`) is changed only after validation, as a Founder-gated production change.

## Prevent accidental overwrite

- Refuse any restore whose destination host contains `supabase.co` unless Founder has approved production cutover in writing.
- Take a fresh logical export of current production (if it is still readable) **before** any overwrite.
- Do not run `RESET`, `DROP DATABASE`, or schema wipes against production.

## Validate restored database integrity

Confirm isolated restore:

- Database opens
- Critical tables exist, including `analytics_events`
- Row counts are plausible versus the pre-incident fingerprint
- `SELECT name, COUNT(*) FROM analytics_events GROUP BY name` returns taxonomy names only
- No dump contents are pasted into chat, Git, or the Founder review page

## Validate application connectivity

After pointing a **non-production** app instance at the restored database:

- `/` `/register` `/login` `/checkout` `/journey` `/lumina` `/support`
- English and Spanish equivalents
- Row 84 / 150 / 151 / 153 admin routes still require auth

Payments: Stripe dashboard + checkout start. Do not place a real charge to test recovery. Registration/login: public pages load; do not dump `auth.users`. Support: ticket table counts, not message bodies.

## Declare recovered

Imani confirms database open, critical tables present, persistence write/read of a **test** analytics event (or equivalent) succeeds, production website healthy. Michelle confirms ops coordination complete. Founder is notified when Launch Health was RED or data loss was possible.

## Recovery priorities

1. Website/application process (Vercel redeploy if needed)
2. Database
3. Authentication / registration / login
4. Checkout / payment (Stripe + `marketing_kpi_purchases`)
5. Support tickets
6. Onboarding / Journey / Lumina (file-store gap until those stores are in Postgres)
7. Analytics / operational reporting

## Observed test results (not guarantees)

These are observations from the accepted isolated restore test. They are **not** contractual or approved RPO/RTO guarantees.

| Item | Recorded value |
| --- | --- |
| Restore method | Logical export of production `public` schema restored into isolated in-memory PGlite |
| Recovery source | Production Supabase Postgres public schema |
| Recovery destination | Isolated in-memory PGlite — NON-PRODUCTION |
| Recovery point | 2026-08-21T18:05:41.197Z |
| Observed restore duration | 8470 ms |
| Observed validation duration | 14 ms |
| Production used as restore destination | NO |

Evidence: `ops/fab-5/runs/row-62-backup-restore-validation.json`. Mechanical verification used `npm run fab5:row62`.

## Backup failure visibility

Row 61 is not redesigned. Restore-test health is stored in `launch_dashboard_meta` key `row62_backup` (`lastVerifiedAt`, `archiveMode`, `restoreOk`). Missing/failed verification is visible there and on this Row 62 review.

## Management API note

Supabase Management API backup listing returned HTTP 401 because `SUPABASE_ACCESS_TOKEN` was unavailable. Backup capability/health was verified through the available database-level evidence (WAL `archive_mode=on` and the isolated logical restore). Obtaining a management token is **not** a Row 62 closure requirement and was not added during closure.

## Documented recovery-scope risks (not Row 62 blockers)

The accepted restore test passed. These remain architectural/recovery-scope notes. They were not converted into Row 62 blockers and were not falsely recorded as resolved.

- Application accounts, onboarding, Journey, Lumina, and identified process-local billing file stores are not recovered through the tested Postgres database restore.
- Supabase `auth.users` contained 0 rows at the time of testing.
- Stripe remains the payment system of record.
- `marketing_kpi_purchases` is stored in Postgres and was within database recovery coverage.
- Supabase Storage contained 0 objects at the time of testing.
- A SQL database restore would not restore Supabase Storage objects if Storage is used later.

Do not claim those non-Postgres systems are backed up by Postgres.

## Security

- No dumps in Git, `/public`, or review routes
- Delete `.tmp-row62-recovery/public-schema.dump.json` after validation
- Do not print connection strings, emails, Journey answers, Lumina text, or payment credentials

Launch Roadmap and Founder Notes were not changed by this closure.
