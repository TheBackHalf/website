# ROW-150-EVENT-TRACKING-SPECIFICATION

**Status:** COMPLETE. Founder Acceptance: APPROVED. Production persistence: VERIFIED. Analytics backend: supabase_postgres. Production table: analytics_events. Required instrumentation coverage: 9/9 PASS. Row 84 regression: PASS. Row 151 regression: PASS. Secrets/privacy check: PASS. Remaining blockers: NONE.  
**Primary owner:** Imani Heartbeat  
**Supporting:** Michelle Northstar  
**Launch date:** August 31, 2026  
**Workstream:** Email, Analytics, Support & Architect Experience  
**Requirement:** Instrument website, checkout, registration, onboarding, Journey, Lumina, downloads, completion, and membership.

### Founder Acceptance record

- Founder Acceptance: APPROVED
- Production persistence: VERIFIED
- Analytics backend: supabase_postgres
- Production table: analytics_events
- Required instrumentation coverage: 9/9 PASS
- Row 84 regression: PASS
- Row 151 regression: PASS
- Secrets/privacy check: PASS
- Remaining blockers: NONE
- Final status: COMPLETE

This document is the source of truth for production event tracking. It is not a strategy memo. The implementation lives in `lib/analytics/` and is wired into the live Architect experience.

**Event count:** **43** required Row 150 production product events remain implemented. `PRODUCT_EVENT_NAMES` also includes **3** cinematic-entrance extras (`entrance_viewed`, `entrance_entered`, `entrance_skipped`) for the Founder review route, for a total of **46** product names. Row 71 dotted billing names are preserved separately. No alternate taxonomy was created.

---

## Analytics architecture

Row 150 reuses the existing first-party analytics ledger. No GA4, Clarity, Segment, Mixpanel, or other vendor was added.

| Store | Production mechanism | Names | Purpose |
| --- | --- | --- | --- |
| Product + billing ledger | **Supabase Postgres** table `analytics_events` via existing `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` | Row 150 `snake_case` product events + preserved Row 71 dotted billing names | Architect funnel + billing ops |
| Row 84 marketing KPI ledger | Same Postgres (`marketing_kpi_*` tables). Isolated tests may set `MARKETING_KPI_DB_FILE` | `landing_page_session`, `checkout_start`, `purchase` | Launch Marketing KPI Dashboard |

`.data/analytics/database.json` (`ANALYTICS_DB_FILE`) is **local development / isolated mechanical tests only**. It is **not** the production system of record and is **not** used on Vercel production.

Checkout start and purchase **dual-write**: product events `checkout_started` / `purchase_completed` **and** the existing Row 84 collectors. Row 150 strengthens Row 84; it does not replace it.

Client-visible events POST to `/api/analytics/event` (allowlisted names only). Server product flows call `trackProductEvent`. Billing webhooks continue to use `emitAnalyticsEvent` for Row 71 names.

### Production vs local

| Environment | Store | Missing database |
| --- | --- | --- |
| Vercel production (`VERCEL_ENV=production`) | Supabase Postgres | Persistence fails visibly. Product flow continues. The API does **not** report durable success. No silent `.data/` fallback. |
| Local development | Postgres if configured; otherwise `.data/analytics/database.json` | Local file fallback is allowed for developer fixtures. |
| Mechanical tests | `ANALYTICS_DB_FILE` temp file | Isolated from production. |

### Idempotency architecture

`analytics_events.idempotency_key` is **UNIQUE**. `appendEvent` uses `ON CONFLICT DO NOTHING` in Postgres (and an equivalent lookup in the file test store). Critical keys such as `purchase_completed:{stripeCheckoutSessionId}` and `journey_completed:{userId}` therefore survive webhook retries, page refresh, and new serverless invocations.

### Retention

Analytics rows are not rotated automatically. Test/sandbox Stripe identifiers (`cs_test_`, `pi_test_`) are stored with `test=true` and must not be treated as production launch conversions.

### Migration

Legitimate non-test rows in a local `.data/analytics/database.json` may be upserted into Postgres when that backend is configured. Events with test Stripe ids or test user ids are **not** copied into production reporting.

### Privacy at the durable layer

Sanitization runs **before** `appendEvent`. The stored Postgres `payload` JSONB is the already-filtered object. Moving from filesystem to Postgres does not add keys, does not store Lumina/Journey free text, and does not store passwords, tokens, or payment credentials.

### Environment configuration

Production uses the existing application database URLs already required for Fab 5 / Row 84. Values stay in Vercel environment configuration — never in this document or in git.

| Variable | Role |
| --- | --- |
| `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` | Production durable store (required on Vercel) |
| `ANALYTICS_DB_FILE` | Optional isolated test / local fixture file. Never production. |
| `VERCEL_ENV` | When `production` or `preview`, filesystem fallback is disabled |

If Postgres is unavailable in production, `trackProductEvent` returns `ignored` and `emitAnalyticsEvent` returns `failed`. Product and billing flows continue. The API does not report that the event was durably stored. Failures are logged as `[analytics] persist_failed` with connection secrets redacted.

Authorized Fab 5 production probe: `POST /api/fab-5/analytics-durability` (same Michelle / `CRON_SECRET` authorization as Row 84 KPI durability). Actions: `write`, `retrieve`, `suite` (P1–P6 on the hosted runtime), `cleanup`. It writes/retrieves marked TEST rows (`test=true`) and reports the store backend. Unauthenticated callers do not receive durable success. It is not a public analytics or database-administration endpoint.

Google Sign-In preserves first-touch campaign attribution and the anonymous analytics id by copying `bh-mkt-attr` / `bh-analytics-aid` into the short-lived httpOnly registration consent cookie before the OAuth redirect. `registration_succeeded` for Google therefore carries the same safe UTM properties as email registration. Google OAuth cancel / invalid / failed / conflict / consent-required paths emit `registration_failed` (register intent) or `auth_failed` (login intent). Email password mismatch emits `auth_failed`. Passwords, tokens, and verification codes are never event properties.

---

## Event naming convention

- **Product events:** stable `snake_case` (`registration_succeeded`, `journey_chapter_completed`).
- **Billing events (Row 71, preserved):** dotted (`checkout.payment_succeeded`).
- **Marketing KPI events (Row 84, preserved):** `landing_page_session`, `checkout_start`, `purchase`.
- One name per user action. Locale is a **property**, never a second taxonomy.
- Product uses **chapters**, not separate Journey “activity” IDs. Progression is `journey_chapter_*` plus `journey_progress_saved`.

---

## Identity handling

| State | Identity field | Notes |
| --- | --- | --- |
| Anonymous visitor | `anonymousId` (session UUID `bh-analytics-aid`) | `identity=anonymous`. No email. |
| Authenticated Architect | `userId` (internal UUID) | `identity=authenticated`. |
| Conversion stitch | `anonymousId` copied onto `registration_succeeded` when the client supplies it | Attribution (`source`, `medium`, `campaign`, `assetId`) is preserved from `sessionStorage` `bh-mkt-attr` through registration and Stripe `bh_utm_*` metadata. |

Authentication tokens, session cookies, and passwords are never event properties or idempotency keys.

---

## Attribution handling

Campaign convention is unchanged from Row 84:

```
https://thebackhalf.org/register
  ?utm_source=instagram|linkedin|tiktok
  &utm_medium=social
  &utm_campaign=the-question
  &utm_content=<Row 81 asset ID>
  &utm_id=YYYY-MM-DD
```

`ProductAnalyticsBeacon` stores first-touch UTMs in `bh-mkt-attr` and does not overwrite a campaign session with a later direct page view. Registration and checkout read that store. Purchase attribution is copied from Stripe `bh_utm_*`. Asset IDs are stored as `assetId` (never as conversation `content`).

---

## Consent / privacy behavior

Account-creation and billing consents are unchanged. Event tracking is first-party operational telemetry:

- Client ingest accepts only `CLIENT_EVENT_NAMES`.
- `sanitizeAnalyticsPayload` allowlists keys and drops blocklisted keys and sensitive values.
- Lumina prompt/response text, Journey answers, assessment free-text, passwords, tokens, and payment credentials cannot enter the ledger.

---

## Privacy blocklist

Never capture:

- passwords, password hashes
- authentication tokens, session cookies, secrets
- verification codes
- full card numbers, CVV/CVC, PAN
- private Journey answers / journal / reflection text
- assessment free-text responses
- Lumina prompt text or response text
- private support messages
- unnecessary PII (email is not an event property)

Implementation: `lib/analytics/privacy.ts`. Mechanical inspection is Test 14.

---

## Common event properties

Allowed across events (minimum useful set):

`eventVersion`, `locale`, `productArea`, `path`/`page`, `identity`, `anonymousId`, `source`, `medium`, `campaign`, `assetId`, `cta`, `destination`, `method`, `step`, `sequence`, `chapterId`, `sectionId`, `status`, `errorCategory`, `errorCode`, `offerId`, `amountCents`, `currency`, `stripeCheckoutSessionId`, `conversationId`, `responseStatus`, `latencyMs`, `deviceCategory`, `referrerHost`, `assetType`.

---

## Duplicate protection

Idempotency keys (representative):

| Event | Key |
| --- | --- |
| `registration_succeeded` | `registration_succeeded:{userId}` |
| `checkout_started` / `checkout_completed` / `purchase_completed` | `{event}:{stripeCheckoutSessionId}` |
| `journey_completed` | `journey_completed:{userId}` |
| `membership_started` | `membership_started:{stripeSubscriptionId}` |
| Client `page_viewed` | `{name}:{anonymousId}:{path}:{dateEt}` |
| Client `cta_clicked` | 2-second window + 800ms client debounce |
| `entrance_viewed` / `entered` / `skipped` | `{event}:{anonymousId}:{path}` once per session path |

Row 84 purchase keys remain `purchase:{stripeCheckoutSessionId}`.

---

## Event catalog

**Analytics destination for all rows below:** durable first-party product ledger (`analytics_events` in Supabase Postgres in production), unless noted. Row 84 dual-write is called out.

| Event Name | Business Purpose | Trigger | Location | Required Properties | Optional Properties | Privacy | Expected Frequency | Related Funnel | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `page_viewed` | Measure public and product page reach | Path change | `ProductAnalyticsBeacon` → `/api/analytics/event` | path, locale, identity | source, campaign, assetId, deviceCategory, referrerHost | operational | once per visitor/path/day | website | implemented |
| `cta_clicked` | Measure primary conversion CTAs | Click on `[data-bh-cta]` | Beacon + `CtaButton` | cta, path | destination, locale, attribution | operational | per distinct click (debounced) | website | implemented |
| `entrance_viewed` | Cinematic threshold was shown | Entrance mounts | `CinematicEntranceExperience` | path, locale | | operational | once per visitor/path | website | implemented — Founder review route only until accepted |
| `entrance_entered` | Visitor chose ENTER THE BACK HALF | Enter control | entrance experience | cta | locale | operational | once per visitor/path | website | implemented — Founder review route only until accepted |
| `entrance_skipped` | Visitor skipped the entrance | Skip control | entrance experience | cta | locale | operational | once per visitor/path | website | implemented — Founder review route only until accepted |
| `registration_viewed` | Registration landing | `/register` or `/es/register` | Beacon | path, locale | attribution | operational | once per visitor/path/day | registration | implemented |
| `registration_started` | Architect began signup | Email submit or Google start | `lib/auth/registration.ts` | method | attribution, locale | operational | once per visitor/path/day | registration | implemented |
| `registration_method_selected` | Email vs Google | Same as started | client ingest | method | locale | operational | once per method/day | registration | implemented |
| `registration_submitted` | Form posted to server | After validation, before create | `register-email.ts`, Google register | method | attribution | operational | per attempt | registration | implemented |
| `registration_succeeded` | Account created | User persist success | email + Google register | method, userId | anonymousId, attribution | operational | once per user | registration | implemented |
| `registration_failed` | Signup did not complete | validation / duplicate / consent / error | `register-email.ts` | errorCategory, method | locale | operational | per failure | registration | implemented |
| `email_verification_required` | Verify-email gate | Email account created | `register-email.ts` | method | locale | operational | once per user | registration | implemented |
| `email_verified` | Email confirmed | Token verify or Google verified | `verify-email.ts`, Google register | method | locale | operational | once per user | registration | implemented |
| `auth_failed` | Login failure (no credential leak) | Invalid email/password | `login-email.ts` | errorCategory | locale | operational | per failure | auth | implemented |
| `checkout_viewed` | Offer page seen | `/checkout` paths | Beacon | path, locale | attribution | operational | once per visitor/path/day | checkout | implemented |
| `checkout_started` | Stripe session created | `createCheckoutSession` success | `lib/checkout/create-session.ts` + Row 84 `checkout_start` | offerId, stripeCheckoutSessionId | amountCents, currency, attribution | operational | once per Stripe session | checkout | implemented |
| `checkout_completed` | Paid checkout confirmed | Webhook payment succeeded | `lib/billing/sync-effects.ts` | stripeCheckoutSessionId | offerId, attribution | operational | once per Stripe session | checkout | implemented |
| `checkout_failed` | Checkout or payment failed | Stripe create error or payment_failed | create-session + sync-effects | errorCategory | offerId | operational | per failure | checkout | implemented |
| `purchase_completed` | Purchase conversion | Same webhook as checkout_completed | sync-effects + Row 84 `purchase` | stripeCheckoutSessionId | offerId, attribution | operational | once per Stripe session | checkout | implemented |
| `onboarding_started` | Onboarding begun | First onboarding record | `emitOnboardingAnalytics` via onboarding store | step, sequence | locale | operational | once per user | onboarding | implemented |
| `onboarding_step_viewed` | Where Architects are | Current step persist | onboarding store | step, sequence | | operational | once per user/step/day | onboarding | implemented |
| `onboarding_step_completed` | Step finished | New completed step | onboarding store | step, sequence | | operational | once per user/step | onboarding | implemented |
| `onboarding_completed` | Onboarding finished | status=completed | onboarding store | step, sequence | | operational | once per user | onboarding | implemented |
| `onboarding_abandoned` | Drop-off | — | — | — | — | — | — | onboarding | **not implemented** — cannot measure reliably without a false signal |
| `journey_entered` | Journey started | First progress upsert | progress store | chapterId | status | operational | once per user | journey | implemented |
| `journey_chapter_started` | Chapter begun | in_progress / chapter change | progress store | chapterId, status | | operational | once per user/chapter | journey | implemented |
| `journey_chapter_completed` | Chapter finished | chapter_completed / journey_completed | progress store | chapterId, status | | operational | once per user/chapter | journey | implemented |
| `journey_activity_started` / `journey_activity_completed` | Fine-grained activity | — | — | — | — | — | — | journey | **not implemented** — product has chapters/sections, not activity IDs; covered by progress_saved |
| `journey_progress_saved` | Save succeeded | Every progress upsert | progress store | chapterId, status | | operational | per save | journey | implemented |
| `journey_resumed` | Return after gap | Save after >6 hours | progress store | chapterId | | operational | once per chapter/day when gap exists | journey | implemented |
| `journey_completed` | Architect finished Journey | progress status `journey_completed` (Chapter 7) | progress store | chapterId, status | | operational | once per user | journey / completion | implemented |
| `journey_save_failed` | Save error | progress write throws | progress store | errorCategory, chapterId | | operational | per failure | journey | implemented |
| `lumina_opened` | Lumina opened | Conversation load | `load-conversation.ts` | conversationId | | operational | once per user/conversation | lumina | implemented |
| `lumina_session_started` | Session exists | Same load | load-conversation | conversationId | | operational | once per conversation | lumina | implemented |
| `lumina_message_sent` | Architect sent a turn | send path | `send-message.ts` | conversationId | chapterId, locale | operational | per user message | lumina | implemented |
| `lumina_response_received` | Lumina replied | send or retry success | send-message | conversationId, responseStatus | latencyMs, chapterId | operational | per assistant message | lumina | implemented |
| `lumina_error` | Lumina failed | force-error or catch | send-message | errorCategory | conversationId | operational | per failure | lumina | implemented |
| `lumina_session_completed` | Session ended | — | — | — | — | — | — | lumina | **not implemented** — no reliable completion state |
| `download_started` | Download requested | Blueprint/certificate GET after auth | `architectDownloadTracker` | assetId, assetType | chapterId | operational | once per user/asset/day | downloads | implemented |
| `download_completed` | PDF returned | Successful PDF response | same | assetId, assetType | | operational | once per user/asset/day | downloads | implemented |
| `download_failed` | Generation failed | route catch | same | assetId, errorCategory | | operational | once per user/asset/day | downloads | implemented |
| `completion_experience_viewed` | Completion surface reached | `journey_completed` progress | product-hooks | chapterId | | operational | once per user | completion | implemented |
| `certificate_generated` | Certificate PDF produced | certificate download completed | downloads.ts | assetId | | operational | once per user | completion | implemented |
| `certificate_downloaded` | Certificate downloaded | same | downloads.ts | assetId | | operational | once per user/day | completion | implemented |
| completion ceremony started/completed | Standalone ceremony | — | — | — | — | — | — | completion | **not implemented** — no separate ceremony product; Chapter 7 completion is the ceremony state |
| `membership_started` | Community subscription created | `subscriptionActivated` | sync-effects | offerId | | operational | once per subscription | membership | implemented |
| `membership_activated` | Membership live | same webhook | sync-effects | offerId | | operational | once per subscription | membership | implemented |
| `membership_renewed` | Recurring invoice paid | `invoice.paid` + `subscription_cycle` | sync-effects | offerId, stripeInvoiceId | | operational | per renewal invoice | membership | implemented |
| `membership_payment_failed` | Recurring payment failed | payment_failed + community | sync-effects | offerId, errorCategory | | operational | per failed invoice | membership | implemented |
| `membership_cancelled` | Subscription canceled | subscriptionCanceled | sync-effects | offerId | | operational | once per subscription | membership | implemented |
| `membership_expired` | Access lapsed | — | — | — | — | — | — | membership | **not implemented** — entitlement past_due exists in billing; no dedicated expiry webhook instrumented for launch |

Assets tracked for download: `guidebook`, `decision-statement`, `back-half-standards`, `architect-identity`, `expansion-plan`, `declaration`, `certificate`.

---

## Coverage matrix

| Product Area | Required Event | Implemented | Tested | Analytics Destination | Notes |
| --- | --- | --- | --- | --- | --- |
| Website | page_viewed | Yes | T1, T15 | product ledger | |
| Website | cinematic entrance viewed / entered / skipped | Yes | entrance review | product ledger | Review route only until Founder Acceptance |
| Website | cta_clicked (Become an Architect, registration, Journey explore) | Yes | T1 | product ledger | `data-bh-cta` on primary CTAs |
| Registration | registration_viewed / started / method_selected / submitted / succeeded / failed / email_verification_required / email_verified | Yes | T3, T4 | product ledger | |
| Checkout | checkout_viewed / started / completed / failed / purchase_completed | Yes | T5, T6 | product ledger + Row 84 | No live charge in validation |
| Onboarding | started / step_viewed / step_completed / completed | Yes | T7 | product ledger | |
| Onboarding | onboarding_abandoned | No | n/a | — | Deferred — unreliable |
| Journey | entered / chapter started / chapter completed / progress saved / resumed / completed / save_failed | Yes | T8, T11 | product ledger | Chapter terminology |
| Journey | activity started/completed | No | n/a | — | No first-class activity IDs |
| Lumina | opened / session_started / message_sent / response_received / error | Yes | T9 | product ledger | No conversation text |
| Lumina | session_completed | No | n/a | — | No completion state |
| Downloads | started / completed / failed | Yes | T10 | product ledger | Blueprint artifacts + certificate |
| Completion | journey_completed / completion_experience_viewed / certificate generated + downloaded | Yes | T11 | product ledger | No separate ceremony |
| Membership | started / activated / renewed / payment_failed / cancelled | Yes | T12 | product ledger | Community subscription |
| Membership | expired | No | n/a | — | Deferred |
| Attribution | UTM through purchase + Row 84 | Yes | T2 | both ledgers | |
| Privacy | blocklist enforced | Yes | T14 | product ledger | Payloads inspected |
| Duplicate protection | critical conversions | Yes | T6, T13 | both ledgers | |
| Language | locale property | Yes | T15 | product ledger | Same taxonomy |

Zero unexplained gaps for launch-existing functionality. Deferred rows are named and bounded.

---

## Testing procedure

Run:

```
npm run fab5:row150
npm run fab5:row150-persist
```

Original suite evidence: `ops/fab-5/runs/row-150-event-tracking-validation.json`  
Persistence evidence: `ops/fab-5/runs/row-150-persistence-validation.json`

The original suite uses an isolated `ANALYTICS_DB_FILE` temp ledger (16 tests: T1–T15 + R1). It does **not** prove production durability.

Persistence tests P1–P6 write to Supabase Postgres `analytics_events` using the approved local/Vercel env injection path, then delete the controlled TEST rows. P2/P3 reset the store singleton (no in-memory dependency). P4 confirms `ON CONFLICT DO NOTHING` across separate store instances for `purchase_completed` and `journey_completed`. P5 inspects the stored Postgres payload. P6 confirms THE QUESTION attribution on the durable purchase row.

Nine-area durable matrix M1–M9 writes one representative TEST event per required area and retrieves each row from `analytics_events`. Hosted probes skip Vercel **Protected deployment** aliases and prefer `thebackhalf.org`.

A separate HOST check calls the protected production probe. HOST is reported separately from P1–P10 so a missing deployed route cannot hide a Postgres write failure, and a probe failure cannot be buried inside the P1–P10 score.

Each original-suite test records EXPECTED EVENT → ACTUAL EVENT → REQUIRED PROPERTIES → ACTUAL PROPERTIES → DESTINATION CONFIRMED → PASS/FAIL.

Tests T1–T15 plus regression R1. Purchase tests use idempotent sandbox session ids and **do not create a live Stripe charge**.

---

## Known limitations

- No third-party analytics dashboard (GA4/Clarity). Reporting is the product ledger plus Row 84 `/ops/admin/launch-kpi`.
- Production analytics persist in Supabase Postgres (`analytics_events`). `.data/` is not the production system of record.
- `onboarding_abandoned`, `lumina_session_completed`, `membership_expired`, Journey activity IDs, and a standalone completion ceremony are **not** instrumented because those product states do not exist or cannot be measured honestly.
- Three cinematic-entrance events exist for the Founder review route only. They are extras on top of the 43 committed product events, not a second taxonomy.
- Native social metrics remain manual (Row 84). Official social accounts were still not live when Row 84 was built.
- Client page views are unique per visitor/path/calendar day (ET) to prevent refresh inflation.
- Downloads are unique per Architect/asset/calendar day (ET).

---

## Validation evidence (2026-08-21)

Local Next.js was restarted after production `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` were present in `.env.local`. The running application loaded `.env.local` and persisted through `trackProductEvent` / `POST /api/analytics/event` into production `analytics_events`. Controlled TEST rows were read back from Postgres, then deleted. Secrets were not printed.

| Gate | Result | Notes |
| --- | --- | --- |
| Local application | **PASS** | `npm run dev` after env load. `/`, `/register`, `/checkout`, `/login` return 200. Ops dashboards 307 to login (not 500). |
| Analytics backend | **supabase_postgres** | Not `file_local_development`. `dataDirIsSourceOfTruth=false`. |
| Production table | **analytics_events** | `CREATE TABLE IF NOT EXISTS` notices confirm the live relation. |
| Original suite `npm run fab5:row150` | **16/16 PASS** | Isolated `ANALYTICS_DB_FILE`. |
| Required product events | **43/43** | Plus 3 cinematic-entrance extras (46 `PRODUCT_EVENT_NAMES`) |
| P1–P6 durable Postgres write/read-back | **PASS** | Production table write, new store instance retrieve, duplicate protection, privacy, attribution. |
| M1–M9 nine-area durable matrix | **PASS** | Website also proven via local `POST /api/analytics/event` then Postgres read-back (HTTP `created` was not treated as proof). |
| P7 Row 84 dual-write | PASS | Isolated marketing test file |
| P8 Test-data isolation | PASS | `cs_test_` / `test=true` excluded from Founder launch KPIs |
| P9 Production fallback protection | PASS | Hosted runtime without Postgres fails visibly; no `.data/` fallback |
| P10 Product resilience | PASS | Analytics force-fail does not block the product action |
| Row 84 isolated suite | **11/11 PASS** | `npm run fab5:row84`. Production KPI/dashboard build also succeeded on `supabase_postgres`. |
| Row 151 sibling D16 | PASS | Row 150 isolated suite spawned from Row 151. Production launch dashboard build succeeded on `supabase_postgres`. Pre-existing D7/D13 empty-state fails are Row 151 items, not caused by this analytics configuration. |
| HOST probe | **FAIL (non-blocking)** | Deployed-site probe still cannot reach `thebackhalf.org` from this workstation (fetch failed) and Vercel aliases are Protected or stale. Local runtime write/read-back to the production table is the persistence proof. Evidence: `ops/fab-5/runs/row-150-persistence-validation.json` |

Do not treat isolated-file PASS as production persistence. Production write/read-back is proven. Founder Acceptance: APPROVED. Final status: COMPLETE.

---

## Implementation map

| Area | Primary files |
| --- | --- |
| Taxonomy / privacy / emit | `lib/analytics/taxonomy.ts`, `privacy.ts`, `track.ts`, `store.ts` |
| Durable store + probe | `lib/analytics/db.ts`, `migrate.ts`, `durability-ops.ts`, `app/api/fab-5/analytics-durability/route.ts` |
| Client | `components/analytics/product-analytics-beacon.tsx`, `app/api/analytics/event/route.ts`, `lib/analytics/client-ingest.ts` |
| Registration | `lib/auth/registration.ts`, `lib/auth/actions/register-email.ts`, `lib/auth/google/register.ts`, `lib/auth/actions/verify-email.ts`, `lib/auth/actions/login-email.ts` |
| Checkout / membership | `lib/checkout/create-session.ts`, `lib/billing/sync-effects.ts` |
| Onboarding / Journey | `lib/analytics/product-hooks.ts`, onboarding + progress stores |
| Lumina | `lib/lumina/actions/load-conversation.ts`, `send-message.ts` |
| Downloads | `lib/analytics/downloads.ts`, `app/api/architect/blueprint/*/route.ts` |
