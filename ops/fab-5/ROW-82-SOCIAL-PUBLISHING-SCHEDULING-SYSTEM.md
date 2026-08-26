# ROW-82-SOCIAL-PUBLISHING-SCHEDULING-SYSTEM

**Launch Readiness Row:** 82  
**Deliverable:** Implement Social Publishing and Scheduling System  
**Status:** IMPLEMENTED — FOUNDER ACTION REQUIRED. Not Complete.  
**Founder Acceptance:** NOT YET RECORDED  
**Authoritative artifact:** this file.  
**Publishing manifest:** `ops/fab-5/row-82-social-publishing-manifest.json`  
**Founder review:** http://localhost:3000/_internal/row82-social-publishing-review  
**Launch date:** August 31, 2026  
**Pre-launch:** August 28–30, 2026  
**Timezone:** America/New_York — Eastern Time (ET)

Do not mark Row 82 Complete. Do not record Founder acceptance. Do not publish launch content early. Do not rewrite approved copy or assets. Do not add LinkedIn or X. Do not purchase a new scheduler.

---

## 1. Purpose

Configure the approved publishing workflow, connect supported launch channels, load approved August 28–31 posts into a mechanically previewable schedule, verify dates/times/captions/media/CTAs, and establish manual publishing instructions where automation is unavailable — so Nia Prism can execute approved Instagram and TikTok updates without requiring the Founder to log in at posting time (Row 77 Option B).

---

## 2. Scope

**In scope:** Instagram @backhalfco and TikTok @backhalfco for the locked August 28–31 campaign.

**Out of scope:** LinkedIn (future enhancement; not a launch channel). X (do not add). YouTube (October 25, 2026 Architect Community). New paid social SaaS. Live publication during this row. Rewriting Row 81 copy/assets. Completing Row 77 automatically.

---

## 3. Approved Channels

| Channel | Handle | Launch requirement |
|---|---|---|
| Instagram | @backhalfco | YES |
| TikTok | @backhalfco | YES |
| LinkedIn | — | NO — FUTURE ENHANCEMENT |
| X | — | NO — DO NOT ADD |

Social operating owner: Nia Prism — Chief Experience & Transformation Officer.  
Backup monitoring/logging/routing: Michelle Northstar.  
Technical/security: Imani Heartbeat.  
Account owner / identity recovery / threshold approval: Kimberly M. Walker — Founder.

Nia is an operating role, not a human credential holder. Do not invent a Nia Instagram/TikTok login.

---

## 4. Publishing Architecture

**EXISTING PUBLISHING MECHANISM (audit):**

| Candidate | Result |
|---|---|
| Instagram Graph API in this application | NONE |
| TikTok Content Posting API | NONE |
| Paid scheduler (Buffer / Later / Hootsuite / Sprout) | NONE — do not subscribe |
| Production cron that publishes social | NONE |
| Row 77 Option B queue | YES — `ops/fab-5/social-publishing-queue.json` |
| Platform-native Instagram Professional / Meta Business Suite scheduler | YES — existing account capability; not yet Founder-loaded |
| Platform-native TikTok scheduler | YES as the no-new-vendor path; not identical to Instagram; not yet Founder-loaded |
| Row 81 approved archive | YES — `approved-assets/row-81-social-launch/` |
| Row 202 Launch Day Runbook | YES — preserved; Nia publishes locked Aug 31 IG 8:00 AM ET and TikTok 12:00 PM ET |

**Reuse, do not duplicate:** Row 82 implements the workflow on top of the Row 77 Option B queue and native platform schedulers. No new vendor.

Live publish remains **disabled**. Row 82 validation must not publish.

---

## 5. Platform Connections

### Instagram @backhalfco

| Check | Result |
|---|---|
| ACCOUNT IDENTIFIED | PASS (Row 76 Founder-accepted) |
| AUTHORIZED | FOUNDER ACTION REQUIRED |
| PUBLISHING ACCESS | FOUNDER ACTION REQUIRED |
| SCHEDULING ACCESS | FOUNDER ACTION REQUIRED — native Meta Business Suite / Instagram Professional scheduler |

### TikTok @backhalfco

| Check | Result |
|---|---|
| ACCOUNT IDENTIFIED | PASS (Row 76 Founder-accepted) |
| AUTHORIZED | FOUNDER ACTION REQUIRED |
| PUBLISHING ACCESS | FOUNDER ACTION REQUIRED |
| SCHEDULING ACCESS | FOUNDER ACTION REQUIRED — native TikTok Studio / Professional scheduler. If unavailable, FOUNDER DECISION REQUIRED — NEW VENDOR. Do not purchase from this row. |

Do not invent successful authorization. MFA and Workspace recovery are already Founder-verified PASS on Row 77 and are not repeated here.

---

## 6. Publishing Workflow

1. Approved copy and assets live in `approved-assets/row-81-social-launch/`.  
2. Company queue lists the eight Instagram/TikTok jobs with Eastern Time instants.  
3. Founder review page previews every asset, caption, CTA, date, and time.  
4. Founder loads those jobs into native Instagram and TikTok schedulers (one-time authorization).  
5. At posting time, native schedulers publish without Founder login. Nia owns the operating duty.  
6. Pause/cancel: queue `paused` plus native scheduled-post cancel.  
7. Logging: `ops/fab-5/runs/social-publishing-log.json` plus platform scheduled/failed visibility.  
8. If a platform cannot schedule safely, use the manual instructions in §13. Do not live-test publication.

Posts are **prepared in the company queue**. They are **not** “scheduled” on Instagram/TikTok until Founder confirms the native items. A reminder is not automation. A prepared draft is not a scheduled post.

---

## 7. Scheduling Workflow

All times are stored and displayed as **Eastern Time (ET)** / `America/New_York`. August 28–31, 2026 is EDT (UTC−4). Founder-approved times are preserved:

| Date | Instagram | TikTok |
|---|---|---|
| August 28, 2026 | 8:00 AM ET | 12:00 PM ET |
| August 29, 2026 | 8:00 AM ET | 12:00 PM ET |
| August 30, 2026 | 8:00 AM ET | 12:00 PM ET |
| August 31, 2026 | 8:00 AM ET | 12:00 PM ET |

Do not invent replacement posting times.

---

## 8. August 28–31 Publishing Manifest

Authoritative machine-readable file: `ops/fab-5/row-82-social-publishing-manifest.json`.

Launch-family entries (LinkedIn excluded):

- R78-0828-IG / R78-0828-TT — What if this isn't all there is?
- R78-0829-IG / R78-0829-TT — When was the last time you felt completely alive?
- R78-0830-IG / R78-0830-TT — What if someday is August 31?
- R81-0831-IG / R81-0831-TT — THE BACK HALF IS HERE.

Each entry includes id, date, time, timezone, platform, account, assets, caption source, CTA, destination, publishing method (`platform_native_scheduler`), scheduling status, preview status, owner, and fallback. No credentials.

**Loading:** prepared in the company queue. **Not loaded** to native platform schedulers. Status: FOUNDER ACTION REQUIRED — PLATFORM AUTHORIZATION.

---

## 9. Asset Preview Results

Every Instagram carousel slide and every TikTok video/cover is inspected (PNG signature and pixel size, MP4 ftyp/moov/mdat) and rendered on the Founder review page.

Expected:

- Instagram carousels: 1080×1350, correct slide count and order (4 / 4 / 3 / 8).  
- TikTok: 1080×1920 video plus cover; playable preview on the review page.

Do not rely only on filenames.

---

## 10. Link/CTA Validation

Approved enrollment CTA: **Become an Architect**  
Approved enrollment destination: **https://thebackhalf.org/register**

Actionable enrollment destinations in this launch family (R78-0830-TT, R81-0831-IG, R81-0831-TT) use that URL. Pre-launch homepage / Journey / Lumina destinations remain the Founder-approved copy and were not replaced.

No localhost. No Vercel preview URL. Canonical live reachability of `thebackhalf.org` remains **EXTERNAL DEPENDENCY — ROW 75**. The approved CTA was not replaced with a Vercel fallback.

---

## 11. Time-Zone Validation

Every launch-family entry stores `America/New_York` and displays Eastern Time explicitly. Times match the Founder-approved copy. No ambiguous platform-default timezone is relied on in the company workflow.

---

## 12. Automated Publishing

Intended automation, after native schedules are loaded:

Instagram: AUTOMATED via Meta Business Suite / Instagram Professional scheduler.  
TikTok: AUTOMATED via TikTok native scheduler where supported.

**Current classification (honest):** FOUNDER ACTION REQUIRED for both platforms. Native items are not yet loaded. Do not call the company queue “scheduled on platform.”

---

## 13. Manual Publishing

Required until native schedules are confirmed. Nia owns the operating duty. Actual platform clicks require Founder authentication.

For each of the eight jobs:

- Platform / account: Instagram or TikTok @backhalfco  
- Date / time ET: as in the manifest  
- Exact asset path: `approved-assets/row-81-social-launch/` files listed on the review page  
- Exact caption source: `approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md` heading for that asset ID  
- CTA/link: as approved; enrollment destination https://thebackhalf.org/register  
- Preview checklist: correct account, slide order or video/cover, caption, CTA, ET time  
- Publish steps: Founder opens the native app/suite → upload exact files → paste exact caption → do not add hashtags → publish or schedule at the approved ET time → do not rewrite  
- Post-publication verification: live post matches locked copy/assets; enrollment link if applicable  
- Failure/escalation: §14  
- Responsible operating owner: Nia Prism  

---

## 14. Failure/Fallback Procedure

Preserve Row 83 for comments/DMs. Do not create a competing engagement protocol.

| Event | Detection | Immediate action | Owner | Manual fallback | Escalate / notify Founder |
|---|---|---|---|---|---|
| Scheduler outage | Native scheduled list missing / failed | Pause remaining; log | Nia / Michelle | Founder-authenticated manual publish at ET time if still valid | If launch window will be missed |
| Instagram authorization failure | Cannot open @backhalfco | Stop; do not create a new handle | Imani + Founder | Manual after restore | YES — identity |
| TikTok authorization failure | Cannot open @backhalfco | Stop; do not create a new handle | Imani + Founder | Manual after restore | YES — identity |
| Media upload failure | Platform reject | Retry exact archive file; do not substitute | Nia operating; Founder login | Different device / native app | If still failing inside the window |
| Scheduled post missing its time | Not live at +15 min | Manual publish if still appropriate; log late | Nia / Michelle | Founder-authenticated publish | If launch-day IG/TT miss |
| Wrong asset loaded | Preview mismatch | Pause/cancel; reload exact archive file | Nia / Michelle | Manual correct file | If already public |
| Wrong caption loaded | Caption ≠ copy record | Pause/edit/delete per platform; paste exact caption | Nia | Manual correction | If meaning changed publicly |
| Broken CTA | Link ≠ approved destination | Correct bio/sticker/caption | Nia | Manual | If enrollment path is wrong |
| Account temporarily inaccessible | Login/session fail | Do not create replacement accounts | Founder identity; Imani | Wait/restore then manual | YES if window at risk |
| Platform outage | Platform status / failed publish | Wait; then manual | Michelle log | Other launch channel remains | If both channels down |
| Duplicate publication | Second live post | Hide/delete duplicate; preserve evidence if needed | Nia / Michelle | — | If reputational |
| Accidental early publication | Live before approved time | Remove/archive; do not replace with new copy | Nia / Michelle | Resume remaining schedule | YES if launch content posted early |

WHO CAN PAUSE: Nia Prism, Michelle Northstar, Imani Heartbeat when security-related.  
Communications: Nia. Security: Imani. Identity recovery: Founder.

---

## 15. Row 77 Option B Continuity Evidence

Do **not** change Row 77 completion status from this row.

| Test | Result |
|---|---|
| Can approved Instagram content publish at the approved time without Founder logging in at posting time? | FAIL — native schedules not Founder-confirmed |
| Can approved TikTok content publish at the approved time without Founder logging in at posting time? | FAIL — native schedules not Founder-confirmed |
| Can Nia’s approved publishing responsibility execute through the established workflow without Founder being online? | FAIL until those native items exist |
| ROW 77 OPTION B CONTINUITY | FAIL |

Evidence provided: queue, manifest, review previews, native-scheduler workflow, isolated Founder authorization. After Founder confirms native loads, this evidence can be reconciled on Row 77 separately.

---

## 16. Founder Actions Required

Do not repeat MFA or Workspace recovery. Do not send secrets. Do not add a second human admin. Do not purchase a scheduler.

**PLATFORM:** Instagram @backhalfco  
**ACTION:** Load the four locked August 28–31 Instagram jobs into Instagram Professional / Meta Business Suite native scheduler at 8:00 AM ET using exact archive assets and captions. Do not publish now except as those scheduled times.  
**WHY:** Native scheduling is the Option B unattended path. No Graph API exists in this application.  
**EXPECTED RESULT:** Four scheduled Instagram items that publish without Founder login at posting time and can be paused/cancelled before publication.

**PLATFORM:** TikTok @backhalfco  
**ACTION:** Load the four locked August 28–31 TikTok jobs into TikTok native scheduling at 12:00 PM ET using exact archive videos, covers, and captions. If native TikTok scheduling is unavailable, name that item.  
**WHY:** Native scheduling is the Option B path. No TikTok API exists. Capabilities are not identical to Instagram.  
**EXPECTED RESULT:** Four scheduled TikTok items that publish without Founder login at posting time, or an explicit report that native scheduling is unavailable.

Then inspect http://localhost:3000/_internal/row82-social-publishing-review and reply after review. Do not mark Row 82 Complete until explicit Founder acceptance.

---

## 17. Validation Results

See `ops/fab-5/runs/row-82-social-publishing-validation.json` after `npm run fab5:row82`.

Mechanical checks intended to PASS: archive assets, captions, dates, Eastern Time, CTA configuration, no live publish, no LinkedIn/X added, review page, manifest, fallback procedure.

Platform native load remains Founder-only.

---

## 18. Final Status

**IMPLEMENTED — FOUNDER ACTION REQUIRED**

The approved publishing workflow is configured and previewable. Instagram and TikTok posts are prepared in the company queue and visually inspectable. They are not loaded onto native platform schedulers. No accidental public publication occurred. Do not mark Row 82 Complete. Wait for explicit Founder review and approval.
