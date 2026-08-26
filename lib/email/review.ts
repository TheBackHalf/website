import { EMAIL_TEMPLATE_CATALOG, listTemplatesByKind } from "@/lib/email/classification";
import { getEmailComplianceDurability } from "@/lib/email/store";
import { MARKETING_SENDER, getConfiguredPhysicalAddress, isUsablePhysicalAddress } from "@/lib/email/identity";
import { unsubscribeSecretConfigured } from "@/lib/email/unsubscribe-token";

export function getRow162ReviewModel() {
  const durability = getEmailComplianceDurability();
  const physical = getConfiguredPhysicalAddress();
  return {
    title: "ROW 162 — EMAIL MARKETING COMPLIANCE AND SUPPRESSION CONTROLS",
    row: 162,
    aosWorkId: "al-162",
    rowMarkedComplete: false,
    founderAcceptance: null,
    founderAccepted: false,
    kitWired: false,
    newsletterCaptureOnLaunchPath: false,
    registrationIsMarketingConsent: false,
    purchaseIsMarketingConsent: false,
    sender: MARKETING_SENDER,
    physicalAddressConfigured: isUsablePhysicalAddress(physical),
    unsubscribeSigningConfigured: unsubscribeSecretConfigured(),
    durability,
    templates: EMAIL_TEMPLATE_CATALOG,
    transactionalTemplates: listTemplatesByKind("transactional").map((entry) => entry.id),
    marketingTemplates: listTemplatesByKind("marketing").map((entry) => entry.id),
    unsubscribePath: "/unsubscribe",
    oneClickPath: "/api/email/unsubscribe",
    remainingBlockers: isUsablePhysicalAddress(physical)
      ? "Founder acceptance remains with Kimberly Walker (human). Do not mark Row 162 Complete from this review."
      : "EMAIL_SENDER_PHYSICAL_ADDRESS is not configured. Marketing sends fail closed until a valid physical postal address is set. Founder acceptance remains with Kimberly Walker (human).",
  };
}
