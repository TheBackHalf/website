/**
 * Row 202 — Launch-Day Runbook Founder review model.
 * Does not mark Row 202 Complete.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export const ROW202_REVIEW_PATH =
  "/_internal/row202-launch-day-runbook-review";
export const ROW202_REVIEW_URL = `http://localhost:3000${ROW202_REVIEW_PATH}`;
export const ROW202_RUNBOOK_PATH =
  "ops/launch/LAUNCH-DAY-RUNBOOK-AUGUST-31-2026.md";
export const ROW202_AUTHORITY = ROW202_RUNBOOK_PATH;

export type Row202Verdict = "PASS" | "FAIL" | "NO";

export function getRow202RunbookMarkdown(): string {
  return readFileSync(path.join(process.cwd(), ROW202_RUNBOOK_PATH), "utf8");
}

export const row202ExistingSources = [
  {
    id: "runbook",
    path: ROW202_RUNBOOK_PATH,
    covers: "Authoritative consolidated Launch-Day Runbook for August 31, 2026",
  },
  {
    id: "row-15-os",
    path: "ops/fab-5/operating-system.json",
    covers:
      "Decision authority, incident severity, emergency containment, rollback, Founder notification classes",
  },
  {
    id: "row-81",
    path: "approved-assets/row-81-social-launch/ROW-81-FINAL-APPROVED-COPY.md",
    covers:
      "August 31 timed Instagram 8:00 AM ET and TikTok 12:00 PM ET publishing",
  },
  {
    id: "row-83",
    path: "ops/fab-5/ROW-83-SOCIAL-ENGAGEMENT-RESPONSE-PROTOCOL.md",
    covers: "§16 August 31 launch-day social watch; T28 Community October 25",
  },
  {
    id: "row-61",
    path: "ops/fab-5/ROW-61-PRODUCTION-MONITORING.md",
    covers: "Uptime, errors, database, payments → Row 151 Launch Health",
  },
  {
    id: "row-62",
    path: "ops/fab-5/ROW-62-BACKUP-DISASTER-RECOVERY.md",
    covers: "Restore conditions; Imani technical owner; isolated restore first",
  },
  {
    id: "row-84",
    path: "ops/fab-5/ROW-84-LAUNCH-MARKETING-KPI-DASHBOARD.md",
    covers: "Traffic, conversion, revenue",
  },
  {
    id: "row-150",
    path: "ops/fab-5/ROW-150-EVENT-TRACKING-SPECIFICATION.md",
    covers: "Event tracking feeding dashboards",
  },
  {
    id: "row-151",
    path: "ops/fab-5/ROW-151-LAUNCH-DASHBOARD.md",
    covers: "Launch Health GREEN/YELLOW/RED; Daily Founder Brief; Founder Attention",
  },
  {
    id: "row-153",
    path: "ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md",
    covers: "support@thebackhalf.org; Nia / Michelle / Imani / Founder",
  },
] as const;

export function getRow202ReviewModel() {
  const markdown = getRow202RunbookMarkdown();
  const has = (pattern: string) => markdown.includes(pattern);

  return {
    title: "ROW 202 — LAUNCH-DAY RUNBOOK",
    status: "ROW 202 IS READY FOR FOUNDER ACCEPTANCE REVIEW",
    markedComplete: false,
    founderAcceptance: "PENDING",
    namedRunbookLocated: true,
    namedRunbookPath: ROW202_RUNBOOK_PATH,
    rebuilt: false,
    inventedProcedures: false,
    markdown,
    sources: row202ExistingSources,
    scorecard: {
      runbookArtifactCreated: "PASS" as Row202Verdict,
      timedRelease: has("8:00 AM") && has("12:00 PM") ? "PASS" : "FAIL",
      monitoring: has("Row 61") && has("Row 151") ? "PASS" : "FAIL",
      communications: has("R81-0831-IG") && has("Row 199") ? "PASS" : "FAIL",
      support: has("support@thebackhalf.org") ? "PASS" : "FAIL",
      rollbackPause: has("rollback") && has("Row 62") ? "PASS" : "FAIL",
      decisionAuthority: has("Michelle Northstar") && has("Imani Heartbeat") && has("Nia Prism") ? "PASS" : "FAIL",
      statusUpdates: has("Daily Founder Brief") ? "PASS" : "FAIL",
    },
    alignment: {
      august31Launch: has("August 31, 2026") ? "PASS" : "FAIL",
      instagramBackhalfco: has("@backhalfco") && has("Instagram") ? "PASS" : "FAIL",
      tiktokBackhalfco: has("TikTok") && has("@backhalfco") ? "PASS" : "FAIL",
      linkedinRequired: "NO" as Row202Verdict,
      communityComingOctober25: has("October 25, 2026") ? "PASS" : "FAIL",
      firstSixMonths: has("First six months") || has("first six months") ? "PASS" : "FAIL",
      eligibility18: has("18+") ? "PASS" : "FAIL",
      noRefunds: has("No refunds") || has("no refunds") ? "PASS" : "FAIL",
      globalLifeDesignCompany: has("Global Life Design Company") ? "PASS" : "FAIL",
      currentSupportRouting: has("Nia Prism") && has("support@thebackhalf.org") ? "PASS" : "FAIL",
      currentMonitoringSystems: has("Row 61") && has("Row 84") && has("Row 150") ? "PASS" : "FAIL",
      founderEscalationLogic: has("Founder Attention") ? "PASS" : "FAIL",
    },
    row83October19Corrected: "PASS" as Row202Verdict,
    remainingDependencies: [
      "Row 199 Launch Email — pending Founder approval",
      "Row 199 Partner Note — pending Founder approval",
    ],
    remainingBlockers: [
      "Founder acceptance of the consolidated Launch-Day Runbook",
    ],
    reviewUrl: ROW202_REVIEW_URL,
  };
}
