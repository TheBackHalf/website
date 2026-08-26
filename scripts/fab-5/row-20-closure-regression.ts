/**
 * Narrow Row 20 closure regression. Does not rebuild the access matrix,
 * rotate secrets, send mail, or mutate payments.
 */

import { readFileSync } from "node:fs";

import {
  isAdminOpsPath,
  isSupportTicketAdminPath,
  isSupportOpsPath,
} from "@/lib/auth/ops-paths";
import { roleHasPermission } from "@/lib/auth/permissions";

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(rel, "utf8")) as T;
}

function main() {
  const social = readJson<{
    preferredHandle?: string;
    channels?: {
      instagram?: { preferredHandle?: string };
      tiktok?: { preferredHandle?: string };
      linkedin?: {
        doNotTreatAsRow76LaunchRequirement?: boolean;
        scope?: string;
      };
    };
  }>("ops/fab-5/social-channels.json");
  const status = readJson<{
    founderAcceptance?: string;
    status?: string;
    row21Started?: boolean;
  }>("ops/fab-5/row-20-status.json");
  const matrix = readJson<{
    markedComplete?: boolean;
    executives?: Array<{ id: string; name: string; title: string }>;
  }>("ops/fab-5/systems-access-matrix.json");
  const names = (matrix.executives ?? []).map((row) => `${row.id}:${row.name}:${row.title}`);

  const result = {
    supportTicketPathIsSupportScoped:
      isSupportTicketAdminPath("/ops/admin/support") &&
      isSupportTicketAdminPath("/api/admin/support/tickets") &&
      !isAdminOpsPath("/ops/admin/support") &&
      isSupportOpsPath("/ops/admin/support"),
    launchKpiRemainsAdmin: isAdminOpsPath("/ops/admin/launch-kpi"),
    launchDashboardRemainsAdmin: isAdminOpsPath("/ops/admin/launch-dashboard"),
    agentOperationsRemainsAdmin: isAdminOpsPath("/ops/admin/agent-operations"),
    adminHomeRemainsAdmin: isAdminOpsPath("/ops/admin"),
    architectDeniedAdmin: !roleHasPermission("architect", "admin:ops:access"),
    supportDeniedAdmin: !roleHasPermission("support", "admin:ops:access"),
    supportHasTicketAccess: roleHasPermission("support", "support:ops:access"),
    adminHasTicketAccess: roleHasPermission("admin", "support:ops:access"),
    supportDeniedBilling: !roleHasPermission("support", "admin:billing:reconcile"),
    supportDeniedRoleAssign: !roleHasPermission("support", "admin:roles:assign"),
    officialHandle: social.preferredHandle === "backhalfco",
    instagramHandle: social.channels?.instagram?.preferredHandle === "backhalfco",
    tiktokHandle: social.channels?.tiktok?.preferredHandle === "backhalfco",
    linkedinNotRequired:
      social.channels?.linkedin?.doNotTreatAsRow76LaunchRequirement === true ||
      social.channels?.linkedin?.scope === "FUTURE ENHANCEMENT",
    leadership:
      names.includes("michelle:Michelle Northstar:Chief of Staff & Operations Officer") &&
      names.includes("imani:Imani Heartbeat:Chief Technology & Risk Officer") &&
      names.includes("nia:Nia Prism:Chief Experience & Transformation Officer") &&
      names.includes("kimberly:Kimberly M. Walker:Founder"),
    founderAcceptanceRecorded:
      status.founderAcceptance === "YES" && status.status === "Complete",
    matrixMarkedComplete: matrix.markedComplete === true,
    row21NotStarted: status.row21Started === false,
  };
  const pass = Object.values(result).every(Boolean);
  console.log(JSON.stringify({ pass, result }, null, 2));
  if (!pass) process.exit(1);
}

main();
