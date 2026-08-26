import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateBilingualEmailLibrary } from "@/lib/email/templates/validate";
import { inventoryParticipantEmailTemplates } from "@/lib/email/templates";

async function main() {
  const validation = validateBilingualEmailLibrary();
  const inventory = inventoryParticipantEmailTemplates();
  const payload = {
    row: 145,
    generatedAt: new Date().toISOString(),
    owner: "nia",
    deliverable: "Build Bilingual Email Templates",
    stripeCharged: false,
    socialPublished: false,
    launchEmailSent: false,
    reviewUrl: "http://localhost:3000/_internal/row145-email-templates-review",
    inventory,
    validation,
    wiredSenders: [
      "lib/auth/email/send-verification.ts",
      "lib/auth/email/send-password-reset.ts",
      "lib/billing/notifications.ts",
      "lib/support/acknowledge.ts",
      "lib/email/send-journey-progress.ts",
    ],
    existingAlreadyBilingual: [
      "verify_account",
      "password_reset",
    ],
    notes:
      "Branded HTML + plain-text fallback + EN/ES language logic. Launch announcement is templated from Row 199 approved copy and is not sent. Journey progress templates exist and are not auto-dripped.",
  };

  const dir = path.join(process.cwd(), "ops/fab-5/runs");
  await mkdir(dir, { recursive: true });
  const evidencePath = path.join(dir, "row-145-bilingual-email-templates-2026-08-26.json");
  await writeFile(evidencePath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ allPassed: validation.allPassed, evidencePath }, null, 2));
  if (!validation.allPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
