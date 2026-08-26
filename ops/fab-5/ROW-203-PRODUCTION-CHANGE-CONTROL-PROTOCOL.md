# ROW 203 — Production Change-Control Protocol

**Launch Readiness row:** 203 (August Launch excel row 204)  
**Deliverable:** Create Production Change-Control Protocol  
**Status:** DRAFT — FOUNDER ACCEPTANCE REVIEW. Not Complete. Founder Acceptance: not recorded.  
**Window:** Final QA through production freeze, launch day, and stabilization  
**Operational owner (protocol / coordination):** Michelle Northstar — Chief of Staff & Operations Officer  
**Technical execution owner (production mutation):** Imani Heartbeat — Chief Technology & Risk Officer  
**Participant-facing acceptance:** Nia Prism — Chief Experience & Transformation Officer  
**Founder acceptance authority:** Kimberly Walker (human) only  
**Launch date:** August 31, 2026  
**Source of truth for this protocol:** this document  
**Authority source it operationalizes:** `ops/fab-5/operating-system.json` (`productionChangeAuthority`, `emergencyAuthority`, `blockAuthority`, decision rights)

This protocol does **not** invent a second host, a second deploy platform, a second incident tracker, new executive titles, or new vendor-console access. It does **not** take Imani security/infrastructure implementation ownership or Nia curriculum/brand ownership. Kimberly Walker (AI) is not an operating agent and is not production-change capacity. Lumina has no operating authority.

Command Center workbook status, Launch Roadmap, and Founder Notes are not updated by this draft. Row 203 is not marked Complete.

---

## 1. Purpose

From final QA through stabilization, every production change must have a named owner, a change class, required testing, a rollback plan, and a durable record **before** it can affect launch-critical functionality.

Unreviewed “quick fixes,” unsigned merges to `main`, dashboard hot-edits, and AOS/Cursor Cloud Agent pull requests are not production authority.

---

## 2. Applicability window

| Phase | When | What may change production |
|---|---|---|
| **Final QA** | After Feature Complete intent; before Founder Go/No-Go freeze | Approved, tested, reversible changes that restore or preserve Version 1 scope. New scope is Founder-reserved. |
| **Production freeze** | Row 218 after Founder Go/No-Go. Imani executes the freeze; Founder remains vendor ADMIN. | Noncritical changes **stop**. Only freeze-exempt work in §8. |
| **Launch day** | Monday, August 31, 2026 (America/New_York) | Launch-Day Runbook plus this protocol. Containment and rollback first. No opportunistic fixes. |
| **Stabilization** | First 72 hours after public enrollment, then until Launch Health is no longer RED because of a change. First-30-day hypercare (Row 208) uses the same gates when that row is operating. | Same as freeze: restore approved safe behavior only, unless Founder authorizes otherwise. |

If Row 218 freeze has not yet executed, **this protocol still binds**. Absence of a freeze tag is not permission to skip review.

---

## 3. Launch-critical production surfaces

A change that can affect any of the following is a **production change** and is in scope:

| Surface | Canonical check | Technical owner | Block / verify |
|---|---|---|---|
| Public site | `https://thebackhalf.org` and `/`, `/es` | Imani | Michelle evidence; Nia if copy/UX |
| Registration / eligibility | `/register`, `/es/register` (18+ only) | Imani | Nia UX; Michelle evidence |
| Authentication / login | `/login`, `/es/login` | Imani | Michelle evidence |
| Checkout / payment initiation | `/checkout`, `/es/checkout` | Imani | Michelle; Founder for Stripe **configuration** |
| Onboarding | onboarding routes as implemented | Imani + Nia | Nia participant-facing |
| Journey (seven-part) | `/journey` | Imani implement; Nia Triple E | Nia block if Triple E fails |
| Lumina | `/lumina` | Imani implement; Nia voice | Nia block if experience fails |
| Support | `/support`, `support@thebackhalf.org`, `/ops/admin/support` | Nia primary; Imani technical | Michelle routing |
| Analytics / launch health | Row 150 / 84 / 151; `/ops/admin/launch-dashboard` | Imani instrumentation | Michelle synthesis |
| Essential transactional email | approved templates only | Imani execute; Nia copy | Michelle if non-template |
| Legal pages | Founder-accepted legal text | Imani implement approved text | Founder for legal change |
| Mobile-responsive delivery | same routes on a narrow viewport | Imani + Nia | Nia experience |

**Out of agent mutation scope (do not change from this protocol or from AOS engineering):** Stripe configuration, Cloudflare DNS, Vercel custom-domain settings, `thebackhalf.org` nameservers, secrets/API keys, authentication-control weakening.

Production host is the existing Vercel production application. Do not invent another host.

---

## 4. Who may change production

Vendor-console **ADMIN** (Vercel production deploy, alias, rollback of deployments, production env) remains **Founder-held**. Row 20 access: Michelle NONE; Nia NONE; Imani hosted EXECUTE without Owner/Billing; Founder Owner/ADMIN. OS decision rights still let Imani **execute an approved, tested deploy** and **roll back to restore approved safe behavior** where technically authorized, then notify Michelle.

| Actor | May change production? | How |
|---|---|---|
| **Kimberly Walker (human)** | Yes — vendor ADMIN; Founder-reserved classes | Vercel/GitHub owner actions. Sole acceptance of this protocol and of Class D / blocker-override. |
| **Imani Heartbeat** | Yes — technical execution within OS classes A–C and emergency E | Prepare git/PR, required tests, rollback plan. Direct or request the production deploy. Execute hosted runtime. Emergency containment/rollback when delay creates material technical or security harm, then notify Michelle and Founder. May **not** weaken security/privacy, destroy data, override a valid Nia block, or release despite unresolved launch-critical evidence failure. |
| **Michelle Northstar** | No vendor deploy. Yes — coordination, evidence gate, pause of affected operations | Verify evidence. Block completion for insufficient evidence. Record the change. Pause affected operations. May **not** deploy, merge to `main`, or clear a valid Imani/Nia release block. |
| **Nia Prism** | No vendor deploy. Yes — participant-facing accept/block | Verify Architect-facing behavior. Issue Triple E / experience block. Pause participant-facing release within safety/experience authority. May **not** make infrastructure/security/payment decisions. |
| **AOS / Cursor Cloud Agents** | No | Isolated `cursor/...` branch, pull request only. Never merge. Never deploy. Failed validation stays unmerged. |
| **Kimberly Walker (AI)** | No | Not an operating agent. Not production-change capacity. |
| **Lumina** | No | Participant-facing guide only. |
| **Anyone else / unnamed tool** | No | Stop. Log. Escalate. |

**Merge to `main` is a production change** whenever Vercel production tracks GitHub `main`. Opening a pull request is not.

If Imani lacks vendor-console ADMIN for a needed deploy or rollback, **Founder executes the vendor action under Imani’s written technical direction**. That does not make Founder the continuous operator.

---

## 5. Change classes (from the operating system)

Use the existing `productionChangeAuthority` classes. There is no “hotfix” class.

| Class | Meaning | Who may authorize | Founder before change? |
|---|---|---|---|
| **A** | Routine reversible approved change restoring or preserving approved behavior | Imani after required testing/evidence; Michelle verifies evidence | No |
| **B** | Participant-facing change | Imani executes; Nia verifies participant-facing acceptance; Michelle verifies evidence | No, unless another reserved rule triggers |
| **C** | High-risk but reversible (auth, payments path, data migration that is reversible, monitoring/cron, freeze-window launch-critical defect) | Imani + Michelle coordination; Nia if participant-facing | Only if existing reserved rules trigger |
| **D** | Irreversible / data-destructive / material-scope / new product behavior / legal / pricing / launch-date / Stripe config / DNS / custom domain | Founder | **Yes** |
| **E** | Emergency containment to prevent material technical or security harm | Imani acts immediately; Michelle incident coordination; Nia may pause CX | After-action notice, not prior approval. Does **not** expand other authority. |

**Class selection rule:** If unsure, use the higher class. A cosmetic copy fix that touches checkout or legal is at least B and may be D. Restoring a broken `/register` to last known-good is A or E, not new-feature work.

---

## 6. Standard change path (non-emergency)

No production change proceeds without this sequence. Executor is not final verifier.

1. **Classify** — A/B/C/D (E uses §10). Name the launch-critical surfaces.
2. **Isolate** — branch off current production `main`. No direct commits to `main`.
3. **Implement** — restore approved behavior or apply an already-approved packet. Do not add Version 1 scope.
4. **Test** — §7 gates for that class. Record commands and results (pass/fail). Failed validation = do not merge, do not deploy.
5. **Rollback plan** — §9. Name the prior known-good git SHA and, when known, Vercel deployment id. Do not invent a second rollback product.
6. **Review**
   - Imani: technical readiness (DESIGNED → BUILT → TESTED; production-ready only with evidence).
   - Nia: required for Class B and any Architect-facing Class C.
   - Michelle: evidence complete; decision-log record drafted; no source-of-truth contradiction.
7. **Blocks honored** — Imani technical/risk block, Nia Triple E/experience block, Michelle evidence block. Founder override of a valid block requires an explicit recorded accepted risk. Deploying despite an unresolved blocker is Founder-reserved (Class D/E-notify).
8. **Record** — `ops/fab-5/decision-log.json` entry, type `production_change` (§11). Do not create a second tracker.
9. **Pull request** — required. AOS/Cursor PRs stay open until a human with merge authority, following this protocol, merges. Never merge failed work.
10. **Deploy** — Imani executes or directs; Founder performs vendor ADMIN if required. Preview/deployment URLs are not production.
11. **Verify production** — Row 61 probes and the specific surfaces in the change record. Do not place a live Stripe charge to “test.”
12. **Close or roll back** — if verification fails, roll back (§9) before any further fix-forward on the same incident, unless Imani records why rollback itself is unsafe.

---

## 7. Required testing

Minimum gates before merge/deploy. Skip none because the diff “looks small.”

| Gate | When required | Command / method |
|---|---|---|
| Typecheck | Any TypeScript/application change | `npm run typecheck` or `npx tsc --noEmit` |
| Package tests | When a test script exists for the touched area | `npm test` or the nearest package/`fab5:row*` script |
| Production build | Any change that can affect the production application | `npm run build` |
| Row validators | Change touches an encoded Launch Readiness row | Existing `npm run fab5:rowXX` (or equivalent) for that row |
| Launch-critical HTTP | Change can affect a surface in §3 | `/`, `/register`, `/login`, `/checkout`, `/journey`, `/lumina`, `/support` and Spanish equivalents as applicable. Expected auth redirects (3xx) are healthy. 5xx/DNS failure is not. |
| Row 61 | Any production deploy or rollback | Uptime, errors, database probe, payment **read-only**. Investigation: `/ops/admin/launch-dashboard`. |
| Participant-facing | Class B; Architect-facing Class C | Nia independently verifies against approved experience/copy. Imani self-report is not acceptance. |
| Evidence | All classes | Michelle confirms artifacts exist. Missing evidence = incomplete. Do not mark Complete. |

**Never required / never used as a test:** live card charge, refund, production data dump, secrets in logs, weakening auth to “get it working,” editing Stripe/DNS/domain settings.

If validation fails: leave the branch unmerged, do not deploy, record the failure in the change entry.

---

## 8. Production freeze rules (Row 218)

Row 218 (Freeze Production Release) is Imani-executed after Founder Go/No-Go: stop noncritical changes, tag the release, back up data, document rollback, restrict production access. This protocol defines what “stop noncritical” means.

**Stopped during freeze / launch day / stabilization**

- New features, copy experiments, curriculum/brand changes, marketing-page redesigns
- Dependency upgrades without a SEV-1/SEV-2 driver
- Refactors, formatting-only application PRs, “while we’re here” edits
- AOS engineering jobs that are not restoring approved launch-critical behavior
- Env, domain, DNS, Stripe, or nameserver changes

**Freeze-exempt (still Class A–C or E, still reviewed)**

- Restore approved launch-critical behavior
- Security/privacy control **implementation** that does not weaken the control model
- Emergency containment (Class E)
- Founder-authorized Class D
- Documentation-only ops records that cannot affect production runtime (this protocol’s own ops files)

**Release tag / backup:** Imani names the freeze git SHA and confirms Row 62 backup posture before freeze cutover. Founder performs vendor actions Imani cannot. Do not restore over production as the first recovery action (Row 62).

---

## 9. Rollback requirements

A production change without a named rollback is not approved.

| Requirement | Rule |
|---|---|
| Named prior good state | Git SHA of `main` (or freeze tag) **and** Vercel production deployment id when known. |
| Owner | Imani Heartbeat owns technical rollback. Michelle coordinates and logs. Founder executes vendor ADMIN rollback when Imani lacks that access. |
| Independent Class A rollback | Rollback to restore safety or approved behavior does **not** need prior Founder approval. Notify Michelle immediately; Founder if SEV-1 / Launch Health RED / Attention YES / data-loss possible / public-legal. |
| Destructive restore | Never restore over production as the first action. Isolated restore first. Founder gates production cutover (Row 62). |
| Database | Row 62 procedure. No `DROP`/`RESET` against production. No dumps in Git or chat. |
| Application | Redeploy the named prior Vercel deployment / git SHA. Do not invent a second platform. |
| Payments | Stripe remains system of record. No refund promise. No live charge to verify recovery. |
| Verify after rollback | Row 61 probes; affected §3 surfaces; Launch Health no longer RED for the triggering change, or remaining RED is a recorded distinct cause. |
| Fix-forward | Allowed only when Imani records that rolling back would cause equal or greater harm (for example a one-way migration). That record is Class C or D. |
| Launch-stop | Material launch-stop / resume is Founder-reserved. Imani may still contain. |

---

## 10. Emergency change authority (Class E)

Use Class E only to prevent material technical or security harm. It is not a shortcut for unreviewed product work.

**Imani may immediately:** disable affected functionality; roll back; isolate; stop unsafe processing; revoke/rotate compromised access where technically authorized; take other **reversible** containment within delegated access.

**Michelle may immediately:** activate incident coordination; reprioritize; pause affected operations; initiate escalation; write the incident/change record.

**Nia may immediately:** block participant-facing release; pause participant-facing experience/content within her authority when continued exposure violates approved experience/safety standards.

**Does not permit:** strategy change; legal signature; unsupported public/legal admissions; destroying evidence; concealing incidents; unnecessary destruction of production data; Stripe/DNS/domain mutation; merging unrelated diffs; marking Launch Readiness Complete.

**Notify:** Michelle as soon as containment starts. Founder immediate for SEV-1 (launch unavailable; payment broadly failing; material security/privacy; widespread access failure; material data-loss risk; severe participant-impacting production failure). Nia if participant impact. Human legal expert only if legally required.

**After-action (required, not optional):** complete §11 record within **4 hours** or before the next Daily Founder Brief, whichever is first. Run §7 verification as soon as safe. If the emergency change stays in production, it must still pass the same testing gates as a Class C change or be rolled back.

Sequence remains the operating-system path: Detection → Classification → Domain owner → Containment → Evidence → Michelle coordination → Cross-functional support if needed → Founder/human expert only if triggered → Correction → Retest → Resolution → Audit close.

---

## 11. Documentation

Do not create a second change tracker. Use `ops/fab-5/decision-log.json`.

Every production change (including Class E after-action) adds an entry:

```json
{
  "id": "prod-change-YYYYMMDD-short-slug",
  "at": "YYYY-MM-DD",
  "type": "production_change",
  "status": "proposed | approved | deployed | rolled_back | closed | failed_unmerged",
  "class": "A | B | C | D | E",
  "summary": "What changed and why, in one sentence. No secrets.",
  "owner": "imani",
  "surfaces": ["/register"],
  "prUrl": "https://github.com/TheBackHalf/website/pull/N",
  "priorGitSha": "abc1234",
  "priorVercelDeploymentId": "dpl_… or null if unknown",
  "testing": ["npx tsc --noEmit", "npm run build"],
  "rollbackPlan": "Redeploy prior SHA / named Vercel deployment; Row 61 verify.",
  "reviewers": ["michelle", "nia"],
  "founderApproval": null,
  "requiresFounderAcceptance": false,
  "emergency": false
}
```

Also record: pull request URL; test command output location (ops run JSON or CI); Row 61/151 health after deploy; SEV if incident. **Never** print secrets, API keys, connection strings, Journey answers, Lumina transcripts, or payment credentials.

AOS engineering status files under `ops/fab-5/runs/aos-engineering-status/` are execution receipts. They are **not** production approval.

---

## 12. Forbidden (unreviewed-fix prevention)

- Direct commit to `main` or any branch that deploys to production
- Merging a pull request with failed typecheck, tests, or build
- AOS/Cursor Cloud Agent merge or deploy
- Treating a preview URL as production
- “Quick fix,” “just this once,” or formatting-only application changes during freeze
- Deploying despite a valid Imani, Nia, or Michelle block
- Fixing launch-critical defects without a rollback plan
- Weakening authentication or security controls
- Changing Stripe configuration, Cloudflare DNS, Vercel custom domains, or nameservers
- Using emergency Class E to ship new features or copy
- Fabricating Founder approval
- Marking Command Center / Founder-acceptance rows Complete from an agent run
- Kimberly Walker (AI) or Lumina executing production changes

---

## 13. AOS / Cursor Cloud Agent path

Existing AOS engineering path only:

**AOS → authorized task → Cursor Cloud Agents API → isolated `cursor/...` branch → validation in the agent prompt → pull request (no auto-merge) → durable job row → AOS ingest.**

Concurrent jobs remain capped. Stripe, Cloudflare DNS, and custom-domain settings stay out of scope. Failed validation stays unmerged. Command Center and Founder-gated deliverables never auto-complete.

A successful Cloud Agent PR is **input to this protocol**, not a production change.

---

## 14. Related systems (do not duplicate)

| Need | Use |
|---|---|
| Authority / SEV / blocks | `ops/fab-5/operating-system.json` |
| Launch-day timing, pause, Founder contact | `ops/launch/LAUNCH-DAY-RUNBOOK-AUGUST-31-2026.md` |
| Uptime / errors / DB / payments | Row 61 — `ops/fab-5/ROW-61-PRODUCTION-MONITORING.md` |
| Backup / restore | Row 62 — `ops/fab-5/ROW-62-BACKUP-DISASTER-RECOVERY.md` |
| Support routing | Row 153 — `ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md` |
| Access / who has Vercel ADMIN | Row 20 — `ops/fab-5/systems-access-matrix.json` |
| Freeze execution | Row 218 (Imani executes after Founder Go/No-Go) |
| Rollback plan row | Row 207 (do not invent a second rollback product) |
| Hypercare cadence | Row 208 when operating |

---

## 15. Founder acceptance (not claimed)

Kimberly Walker (human) is the sole Founder acceptance authority for this Command Center row.

This draft is **ACCEPTANCE_READY** as an operations protocol. It is **not** Complete. It does not freeze production (Row 218). It does not declare Go/No-Go (Row 217). It does not assert that Feature Complete or Production Freeze dependencies are satisfied.

**Founder is asked only to accept or reject this protocol** when reviewing Row 203. Routine execution of the protocol after acceptance does not require Founder on every Class A–C change.
