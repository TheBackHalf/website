export {
  sendClassifiedEmail,
  assertNotMarketingPath,
} from "@/lib/email/send";
export {
  addMarketingRecipient,
  assertAutomationMayAddRecipient,
  isMarketingSuppressed,
  recordUnsubscribe,
  recordSuppression,
} from "@/lib/email/list";
export {
  EMAIL_TEMPLATE_CATALOG,
  emailKindFor,
  isMarketingTemplate,
  isTransactionalTemplate,
} from "@/lib/email/classification";
export {
  getEmailComplianceStore,
  resetEmailComplianceStoreForTests,
} from "@/lib/email/store";
export type {
  EmailKind,
  EmailTemplateId,
  ClassifiedSendResult,
} from "@/lib/email/types";
