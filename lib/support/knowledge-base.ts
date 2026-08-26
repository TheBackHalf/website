import { MINIMUM_PARTICIPANT_AGE } from "@/lib/eligibility/policy";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_TOKEN_TTL_MS,
  VERIFICATION_TOKEN_TTL_MS,
} from "@/lib/auth/config";
import {
  CHECKOUT_OFFERS,
  formatOfferPrice,
} from "@/lib/checkout/offers";
import { CHECKOUT_PURCHASE_TERMS } from "@/lib/checkout/purchase-terms";
import {
  ROW33_COMMUNITY_COMING_COPY,
  ROW33_COMMUNITY_LAUNCH_DATE,
} from "@/lib/marketing-claims/standard";
import { enDictionary } from "@/content/i18n/dictionaries/en";
import { BILLING_PURCHASE_ACKNOWLEDGMENT } from "@/content/legal/consent-copy";
import {
  PRIORITY_RESPONSE_HOURS,
  PUBLISHED_RESPONSE_HOURS,
  SUPPORT_FROM_NAME,
  SUPPORT_MAILBOX,
  type SupportOwner,
  type SupportPriority,
  type SupportTicketCategory,
} from "@/lib/support/catalog";

const HOURS = 60 * 60 * 1000;
export const VERIFICATION_LINK_HOURS = VERIFICATION_TOKEN_TTL_MS / HOURS;
export const PASSWORD_RESET_LINK_HOURS = PASSWORD_RESET_TOKEN_TTL_MS / HOURS;

export const SUPPORT_SIGN_OFF = `${SUPPORT_FROM_NAME}\n${SUPPORT_MAILBOX}`;

export const PUBLIC_SUPPORT_URL = "https://thebackhalf.org/support";
export const PUBLIC_REGISTER_URL = "https://thebackhalf.org/register";
export const PUBLIC_LOGIN_URL = "https://thebackhalf.org/login";
export const PUBLIC_FORGOT_PASSWORD_URL = "https://thebackhalf.org/forgot-password";
export const PUBLIC_CHECKOUT_URL = "https://thebackhalf.org/checkout";
export const PUBLIC_BILLING_PATH = "/architect/billing";
export const PUBLIC_RESOURCES_PATH = "/architect/resources";
export const PUBLIC_ONBOARDING_PATH = "/architect/onboarding";
export const PUBLIC_JOURNEY_PATH = "/architect/journey";
export const PUBLIC_LUMINA_PATH = "/architect/lumina";
export const PUBLIC_AI_DISCLOSURE_URL = "https://thebackhalf.org/legal/ai-disclosure";

export const BLUEPRINT_PRICE = formatOfferPrice(CHECKOUT_OFFERS.blueprint);
export const FOUNDING_ARCHITECT_PRICE = formatOfferPrice(CHECKOUT_OFFERS.bundle);
export const COMMUNITY_PRICE = formatOfferPrice(CHECKOUT_OFFERS.community);

export const NO_REFUND_PUBLIC_LINE = enDictionary.checkout.refundPolicy;
export const COMMUNITY_COMING_LINE = ROW33_COMMUNITY_COMING_COPY;
export const COMMUNITY_LAUNCH_DATE = ROW33_COMMUNITY_LAUNCH_DATE;
export const FOUNDING_COMMUNITY_PERIOD = "October 25, 2026 through April 25, 2027";
export const FOUNDING_ENROLLMENT_WINDOW = "August 31–December 31, 2026";
export const COMPANY_LAUNCH_DATE = "August 31, 2026";

export const LAUNCH_SUPPORT_KB_REQUIRED_TOPICS = [
  "account-creation",
  "verification",
  "login",
  "payment",
  "receipts",
  "onboarding",
  "journey-progress",
  "blueprint-downloads",
  "lumina",
  "cancellations",
  "community-timing",
  "technical-issues",
  "escalation",
] as const;

export type LaunchSupportTopicId = (typeof LAUNCH_SUPPORT_KB_REQUIRED_TOPICS)[number];

export type LaunchSupportArticle = {
  id: LaunchSupportTopicId;
  title: string;
  ticketCategory: SupportTicketCategory;
  owner: SupportOwner;
  priorityHint: SupportPriority;
  participantFacing: string;
  internal: string;
  never: readonly string[];
  escalateWhen: string;
  productionSources: readonly string[];
};

function reply(body: string): string {
  return `${body.trim()}\n\n${SUPPORT_SIGN_OFF}`;
}

export const LAUNCH_SUPPORT_ARTICLES: LaunchSupportArticle[] = [
  {
    id: "account-creation",
    title: "Account creation",
    ticketCategory: "REGISTRATION",
    owner: "nia",
    priorityHint: "P2",
    participantFacing: reply(`Thank you for writing. To become an Architect, create your account at ${PUBLIC_REGISTER_URL}. You will need to confirm that you are ${MINIMUM_PARTICIPANT_AGE} or older, then enter your name, email, and a password of at least ${PASSWORD_MIN_LENGTH} characters with at least one letter and one number — or continue with Google. Required acknowledgments are Terms of Use, Privacy Policy, Participant Agreement, and AI Disclosure.

After email-and-password registration, we send a verification link. That link expires in ${VERIFICATION_LINK_HOURS} hours. Google registration does not use a separate verification email.

Please do not send your password here. If something failed on the page, tell us what you were doing and what you saw, without account secrets.`),
    internal: `Production: POST registration at /register (and /es/register). Age attestation is required; no date of birth is collected. Ineligible users are redirected to /not-eligible and blocked from /register, /checkout, and /architect/*. Email+password creates emailVerified=false and sends /api/auth/verify-email. Google OAuth sets emailVerified=true. Duplicate email: “An account with this email already exists.” Google conflict with an existing password account: sign in with email and password. Consents are the four account-creation documents. Checkout is a separate signed-in step at ${PUBLIC_CHECKOUT_URL}. Support lookup: /ops/support. Do not create accounts for the Architect. Do not walk through a password in the ticket.`,
    never: [
      "Do not collect date of birth or invent a different age cutoff.",
      "Do not ask for a password, one-time code, or magic link.",
      "Do not promise that registration includes paid Journey or Community access.",
      "Do not invent coupons or scholarships.",
    ],
    escalateWhen:
      "Registration is failing for multiple Architects, or an 18+ / eligibility dispute appears. Eligibility policy is Founder-accepted 18+ only — Imani/Michelle if the gate is broken; Founder if someone asks to change the age rule.",
    productionSources: [
      "lib/auth/actions/register-email.ts",
      "lib/auth/google/register.ts",
      "lib/eligibility/policy.ts",
      "content/legal/documents.ts",
      "content/i18n/dictionaries/en.ts",
    ],
  },
  {
    id: "verification",
    title: "Email verification",
    ticketCategory: "REGISTRATION",
    owner: "nia",
    priorityHint: "P2",
    participantFacing: reply(`Your email-and-password account is created first, then verified from the link we send. Open the message titled “Verify your Back Half account,” then use the link. It expires in ${VERIFICATION_LINK_HOURS} hours.

If the link expired, return to the verification page and choose Resend verification email. We can resend about once per minute. Google accounts are already verified and do not use this email.

Please do not forward the verification link into this ticket, and do not send a password.`),
    internal: `TTL ${VERIFICATION_LINK_HOURS}h. Resend cooldown 60 seconds. Handler: GET /api/auth/verify-email?token=&locale=. Outcomes: verified (session + Architect dashboard), already_verified (re-establishes session), expired, invalid. Google-only resend is treated as already verified. If SMTP is not configured in production, the email is not sent — that is a P1/P2 access failure for email registrants; route Michelle/Imani. Support cannot mint a new token from the console. Confirm emailVerified via /ops/support lookup.`,
    never: [
      "Do not paste or request the verification token.",
      "Do not tell a Google-only Architect to wait for a verification email.",
      "Do not promise a different expiry than 24 hours.",
    ],
    escalateWhen:
      "Verification mail is not arriving for more than one Architect, or SMTP/auth email delivery is down. Technical: Imani Heartbeat. Routing: Michelle Northstar.",
    productionSources: [
      "lib/auth/config.ts",
      "lib/auth/email/send-verification.ts",
      "lib/auth/actions/verify-email.ts",
      "lib/auth/actions/resend-verification.ts",
    ],
  },
  {
    id: "login",
    title: "Login",
    ticketCategory: "ACCOUNT_LOGIN",
    owner: "michelle",
    priorityHint: "P2",
    participantFacing: reply(`Sign in at ${PUBLIC_LOGIN_URL} with the email and password on the account, or Continue with Google if that is how you created the account.

Email-and-password sign-in requires a verified email. If you never verified, use the verification email first. If you forgot the password, use ${PUBLIC_FORGOT_PASSWORD_URL}. We send reset instructions only when a password account exists; the confirmation on that page is the same either way, so it does not tell anyone whether an email is registered. Reset links expire in ${PASSWORD_RESET_LINK_HOURS} hours.

Google-only accounts do not have a Back Half password. Use Continue with Google. If this email was created with a password, Google sign-in will ask you to use that password instead.

Please do not send your password, reset link, or codes here.`),
    internal: `Methods in production: email+password (requires passwordHash + emailVerified) and Google OAuth. No magic-link login. No OTP. Unverified password accounts receive the generic “Invalid email or password.” Forgot-password always returns accepted after validation; Google-only and unverified accounts do not receive a token. Session cookie bh-session, 30 days. /architect/* requires login + architect:dashboard:access + ageEligible. Support lookup is read-only and cannot reset passwords. Default ticket owner for ACCOUNT_LOGIN is Michelle (routing); Nia still owns the Architect-facing reply.`,
    never: [
      "Do not reset a password for the Architect.",
      "Do not confirm whether an email exists unless the Architect is already authenticated in a support-safe lookup and you are answering that Architect.",
      "Do not diagnose “I see you in the system” on social or in public.",
      "Do not walk someone through a password reset in a public comment (Row 83 T12).",
    ],
    escalateWhen:
      "Suspected account compromise, unauthorized access, or lockout affecting many Architects → Imani Heartbeat (P1). Individual cannot access a purchased experience after sign-in works → keep P2 and check entitlements at /ops/support.",
    productionSources: [
      "lib/auth/actions/login-email.ts",
      "lib/auth/actions/forgot-password.ts",
      "lib/auth/email/send-password-reset.ts",
      "lib/auth/config.ts",
      "middleware.ts",
    ],
  },
  {
    id: "payment",
    title: "Payment",
    ticketCategory: "PAYMENT_BILLING",
    owner: "michelle",
    priorityHint: "P2",
    participantFacing: reply(`Checkout is at ${PUBLIC_CHECKOUT_URL} after you are signed in and confirmed ${MINIMUM_PARTICIPANT_AGE} or older. Live offers:

• ${CHECKOUT_OFFERS.blueprint.name} — ${BLUEPRINT_PRICE} one-time
• ${CHECKOUT_OFFERS.bundle.name} — ${FOUNDING_ARCHITECT_PRICE} one-time, includes Blueprint plus the first six months of Architect Community. ${COMMUNITY_COMING_LINE}. Founding Architect Community period ${FOUNDING_COMMUNITY_PERIOD}. Enrollment ${FOUNDING_ENROLLMENT_WINDOW}.
• ${CHECKOUT_OFFERS.community.name} — ${COMMUNITY_PRICE}

Payment is card-only through Stripe Checkout. There are no promotion codes. Access is enabled after payment is processed — not at the moment you click pay.

${NO_REFUND_PUBLIC_LINE}

If checkout was cancelled or left unfinished: no payment was taken and no access was granted. You can try again from ${PUBLIC_CHECKOUT_URL}. If a charge failed, you should also receive “Payment could not be completed — The Back Half,” and no paid access was granted.

Please do not send card numbers, bank details, or screenshots of full statements.`),
    internal: `Server action startCheckoutAction → Stripe Checkout. Card only. allow_promotion_codes: false. Clients cannot supply price IDs. Billing acknowledgment required: “${BILLING_PURCHASE_ACKNOWLEDGMENT}”. Material terms shown before the checkbox: ${CHECKOUT_PURCHASE_TERMS.blueprint.join("; ")}; ${CHECKOUT_PURCHASE_TERMS.bundle.join("; ")}; ${CHECKOUT_PURCHASE_TERMS.community.join("; ")}. Duplicate Stripe events are ignored; entitlements are idempotent per checkout session. No automated refund. Duplicate-charge language classifies P2 PAYMENT_BILLING. Checkout outage is P1. refund_notice email exists only if Stripe later marks a refund — that is not a public refund offer. Default owner Michelle. Founder for exception/chargeback severity. There is no Refund ticket category.`,
    never: [
      "Do not promise a refund, credit, coupon, or exception.",
      "Do not quote a price from memory if it might be stale — use the live /checkout page or the figures in this article, which match lib/checkout/offers.ts.",
      "Do not take card data in email or tickets.",
      "Do not say Community is live on August 31, 2026.",
    ],
    escalateWhen:
      "Checkout/payment outage (P1, Imani + Michelle). Duplicate charge or individual payment failure preventing access (P2, Michelle; Imani if webhook/entitlement sync is broken). Chargeback or Founder exception — Founder. Do not invent a refund.",
    productionSources: [
      "lib/checkout/offers.ts",
      "lib/checkout/purchase-terms.ts",
      "lib/checkout/create-session.ts",
      "lib/billing/process-webhook.ts",
      "content/i18n/dictionaries/en.ts",
    ],
  },
  {
    id: "receipts",
    title: "Receipts",
    ticketCategory: "PAYMENT_BILLING",
    owner: "michelle",
    priorityHint: "P3",
    participantFacing: reply(`After a successful payment you should receive “Payment confirmed — The Back Half.” That message confirms the purchase. Itemized invoices and Stripe receipts are in your account at ${PUBLIC_BILLING_PATH} under Invoices & receipts. Open a paid document from that page.

If nothing is listed yet, payment may still be provisioning. Refresh the Billing page shortly. If the charge succeeded and the document still does not appear, write back from the email used at checkout and we will look it up — without collecting card numbers.`),
    internal: `Billing portal /architect/billing lists Stripe hosted_invoice_url / invoice_pdf and PaymentIntent receipt_url. SMTP confirmation is not a tax invoice. customer_email is set on the Stripe session. Support lookup shows hasPaidPurchase / hasFailedPurchase / hasRefundedPurchase only — no Stripe secrets. Do not generate a fake receipt.`,
    never: [
      "Do not attach a fabricated invoice.",
      "Do not ask for a full card number to “find the receipt.”",
      "Do not treat the confirmation email as a refund document.",
    ],
    escalateWhen:
      "Paid purchase on Stripe but no documents and no entitlements after webhook processing — Imani (billing sync) with Michelle routing.",
    productionSources: [
      "lib/billing/summary.ts",
      "lib/billing/notifications.ts",
      "components/billing/billing-portal-panel.tsx",
      "content/i18n/dictionaries/en.ts",
    ],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    ticketCategory: "ONBOARDING",
    owner: "nia",
    priorityHint: "P3",
    participantFacing: reply(`After a Blueprint or Founding Architect purchase, Begin Journey onboarding takes you to ${PUBLIC_ONBOARDING_PATH}. If access is not visible immediately: “Payment is confirmed. Access is provisioned by secure webhook processing. Refresh your Architect Journey shortly if access is not visible yet.”

Onboarding is sequential: welcome, preferences, consent, Lumina, assessment, then Chapter One — The Awakening. You continue from the current step; completed onboarding is not repeated.

Community membership alone does not include Journey onboarding. Architect Community is not live on ${COMPANY_LAUNCH_DATE}. ${COMMUNITY_COMING_LINE}.`),
    internal: `ONBOARDING_STEPS: welcome, preferences, consent, lumina, assessment, awakening. canAccessOnboardingStep only allows the current step; completed records cannot re-enter. Community-only accounts are blocked (reason community_only) and sent to the dashboard. Not entitled → /checkout?need=journey_access. Dashboard/journey/chapter routes redirect incomplete onboarding to the resume step. Settings, billing, Lumina, and support are not gated by this onboarding helper. Support cannot complete or skip steps for the Architect.`,
    never: [
      "Do not skip onboarding steps for an Architect.",
      "Do not tell a Community-only purchaser that Journey onboarding is included.",
      "Do not promise instant access before webhook processing.",
    ],
    escalateWhen:
      "Entitled Architect stuck on an onboarding step after purchase (material access) — Nia + Michelle; Imani if entitlement/webhook is wrong.",
    productionSources: [
      "lib/journey/onboarding/types.ts",
      "lib/journey/onboarding/service.ts",
      "lib/journey/onboarding/eligibility.ts",
      "lib/journey/onboarding/gate.ts",
      "components/checkout/checkout-success-view.tsx",
    ],
  },
  {
    id: "journey-progress",
    title: "Journey progress",
    ticketCategory: "JOURNEY",
    owner: "nia",
    priorityHint: "P2",
    participantFacing: reply(`The Journey is a seven-chapter experience. After onboarding, continue at ${PUBLIC_JOURNEY_PATH}. Your place in a chapter is saved as you complete the work. Sign in on the same account to resume.

Journey access comes with The Back Half Blueprint or Founding Architect. Community membership alone does not include the Journey.

Support cannot reset, skip, or rewrite your Journey answers. If a chapter would not save or a page would not load, tell us the chapter, what you were doing, and what you saw — not your written answers.`),
    internal: `journey_access entitlement required for Journey pages. No inter-chapter sequential lock in code — once entitled and onboarded, chapter routes 1–7 are reachable. Within-chapter sections use completion gates. Progress stores are file-backed (.data/journey/), not the support console. There is no Journey reset API. Support lookup shows journeyAccess boolean only, not chapter detail. Do not quote Journey answers in tickets. Default owner Nia. Material “cannot continue after purchase” escalates Nia; technical failure Imani.`,
    never: [
      "Do not reset Journey progress.",
      "Do not request or paste Journey answers, Aliveness ratings, or Blueprint prose.",
      "Do not promise a specific transformation outcome.",
      "Do not say this is therapy or clinical care.",
    ],
    escalateWhen:
      "Purchased Journey is unusable (P2/P1 depending on blast radius) — Nia for experience, Imani if the chapter service or store is failing.",
    productionSources: [
      "lib/billing/access.ts",
      "lib/journey/progress/store.ts",
      "app/architect/journey/page.tsx",
      "lib/auth/operations/support.ts",
    ],
  },
  {
    id: "blueprint-downloads",
    title: "Blueprint downloads",
    ticketCategory: "DOWNLOADS_MATERIALS",
    owner: "nia",
    priorityHint: "P3",
    participantFacing: reply(`Architect Resources are at ${PUBLIC_RESOURCES_PATH} after you sign in. Download PDF is available there, including The Back Half Blueprint guidebook and other approved materials. Personalized pages use the Journey responses already saved on your account. If a download looks incomplete, finish and save that part of the Journey, then download again.

Please sign in first. We cannot email a password-protected copy, and we should not send the PDF to a different address than the account.`),
    internal: `GET /api/architect/blueprint/* requires authentication only — not journey_access and not chapter completion. Guidebook/chapter PDFs are Puppeteer-rendered; some assets are static under public/downloads/blueprint/. Certificate copy describes completion; the API does not enforce completion. Empty personalization usually means missing saved responses, not a broken entitlement. PDF generation needs Chrome/Puppeteer on the server — a 500 on download with sign-in working is technical (Imani). Do not email the binary from a personal mailbox.`,
    never: [
      "Do not email Blueprint PDFs to an unverified third-party address.",
      "Do not promise a chapter is required before download if you have not checked the live Resources page — production does not chapter-gate the API.",
      "Do not collect Journey answers in order to “rebuild” a PDF by hand.",
    ],
    escalateWhen:
      "Signed-in Architects cannot generate PDFs (Puppeteer/Chrome) — Imani. Content/personalization confusion — Nia.",
    productionSources: [
      "lib/blueprint/downloads.ts",
      "app/api/architect/blueprint/guidebook/route.ts",
      "lib/blueprint/launch-pdf-browser.ts",
      "content/i18n/dictionaries/en.ts",
    ],
  },
  {
    id: "lumina",
    title: "Lumina",
    ticketCategory: "LUMINA",
    owner: "nia",
    priorityHint: "P2",
    participantFacing: reply(`Lumina is The Back Half’s AI Guide, not a person and not the Founder. Kimberly M. Walker is the Founder. You can meet Lumina in your Architect space at ${PUBLIC_LUMINA_PATH} after you sign in. How we use AI is disclosed at ${PUBLIC_AI_DISCLOSURE_URL}.

Lumina does not provide medical advice, mental-health treatment, legal advice, financial advice, or emergency assistance. Memory is optional and controlled in Settings. Clearing memory does not delete your account, billing, or legal acknowledgments.

If Lumina is unavailable, tell us what you were doing and what you saw. Please do not paste long private transcripts into this ticket unless we ask for a short, non-sensitive snippet.`),
    internal: `Lumina routes require sign-in and age eligibility. journey_access and completed onboarding are NOT enforced on Lumina load/send. Current assistant replies are stub (provider=none): fuller conversation intelligence arrives in a later release. Memory is opt-in (lumina-memory v1); writes require enabled memory and explicit remember behavior. Crisis: Support is not a crisis service — use the public support-page boundary. Do not describe Lumina as an operating executive or as live Kimberly. Serious Lumina failure for a paying Architect is P2; outage-like failure for many is P1.`,
    never: [
      "Do not say Lumina is a real person, therapist, or the Founder.",
      "Do not promise live model reasoning beyond the current Guide experience.",
      "Do not dump Lumina transcripts into social, the decision log, or Founder mail.",
      "Do not offer emergency or clinical help.",
    ],
    escalateWhen:
      "Lumina outage or data/privacy concern in transcripts — Imani. Architect-experience failure — Nia. “Are executives AI / Fab 5” in public — stop, DRAFT_HOLD_ESCALATE Founder (Row 83 T11).",
    productionSources: [
      "lib/lumina/actions/load-conversation.ts",
      "lib/lumina/actions/send-message.ts",
      "lib/lumina/conversation.ts",
      "lib/lumina/memory/service.ts",
      "content/legal/v1-candidates.ts",
      "components/pages/support-page-view.tsx",
    ],
  },
  {
    id: "cancellations",
    title: "Cancellations",
    ticketCategory: "MEMBERSHIP",
    owner: "michelle",
    priorityHint: "P3",
    participantFacing: reply(`Standalone Architect Community membership (${COMMUNITY_PRICE}) can be cancelled from ${PUBLIC_BILLING_PATH} with Manage billing. Cancellation stops future renewals. Membership benefits continue through the end of the current billing period.

${NO_REFUND_PUBLIC_LINE}

One-time Blueprint and Founding Architect purchases do not include cancellation controls after successful payment. The Founding Architect Community benefit cannot be canceled separately, exchanged, or transferred, and it is not eligible for a refund.

Architect Community is not live on ${COMPANY_LAUNCH_DATE}. ${COMMUNITY_COMING_LINE}.`),
    internal: `Stripe Billing Portal is offered only when communitySubscriptionActive (standalone $50/month). Bundle community_access is a one-time commercial inclusion — Membership Agreement §7 cannot be canceled separately. Legal operative language: all purchases are non-refundable; cancellation of recurring Community prevents future billing only. If they demand a refund, stay in PAYMENT_BILLING, use this script, do not create a Refund category, do not promise an exception. Founder only if chargeback/exception severity. A Stripe-processed refund can trigger refund_notice and a Refunded document status — still not a promise.`,
    never: [
      "Do not promise a refund.",
      "Do not cancel Founding Architect Community separately.",
      "Do not tell a Blueprint-only purchaser they can “cancel” the one-time payment.",
      "Do not use a legal@ address.",
    ],
    escalateWhen:
      "Refund demand plus chargeback/attorney language — Michelle + Founder. Portal cannot open for an active standalone subscription — Imani.",
    productionSources: [
      "content/i18n/dictionaries/en.ts",
      "components/billing/billing-portal-panel.tsx",
      "content/legal/v1-candidates.ts",
      "lib/checkout/purchase-terms.ts",
    ],
  },
  {
    id: "community-timing",
    title: "Community timing",
    ticketCategory: "MEMBERSHIP",
    owner: "nia",
    priorityHint: "P3",
    participantFacing: reply(`Architect Community is not live on ${COMPANY_LAUNCH_DATE}. ${COMMUNITY_COMING_LINE}.

Founding Architect includes the first six months of Architect Community access. That Community period runs ${FOUNDING_COMMUNITY_PERIOD}. After those six months, Founding Architect renews at ${COMMUNITY_PRICE} where membership continues.

There is no live Community space, feed, or events on launch day. Do not wait on Community to begin the Journey if you purchased Blueprint or Founding Architect.`),
    internal: `Public and legal source of truth is October 25, 2026 — never October 19. Community Guidelines are unpublished until before that date. Checkout still sells community commercially. Copy says standalone Community is available after Blueprint completion; checkout does NOT enforce Blueprint completion in code — do not invent a hard gate, and do not advertise a loophole. BILLING CODE GAP (do not tell Architects): bundle community_access fallback uses addOneYear(grantedAt) in lib/billing/entitlements.ts when communityEndsAt is missing. Published term is six months starting October 25, 2026. If an Architect asks how long access lasts, use the published six-month period. If entitlements show a different endsAt, route Imani — Nia does not change billing code.`,
    never: [
      "Do not say Community is open on August 31, 2026.",
      "Do not use October 19, 2026.",
      "Do not tell Founding Architects they have a first year / twelve months.",
      "Do not invent Community Guidelines or events.",
    ],
    escalateWhen:
      "Entitlement end date contradicts the published six-month Founding Architect Community period — Imani (billing). Public claim that Community is live at launch — Nia + Michelle, correct with this article.",
    productionSources: [
      "lib/marketing-claims/standard.ts",
      "lib/checkout/offers.ts",
      "lib/checkout/purchase-terms.ts",
      "content/legal/v1-candidates.ts",
      "lib/billing/entitlements.ts",
    ],
  },
  {
    id: "technical-issues",
    title: "Technical issues",
    ticketCategory: "TECHNICAL",
    owner: "michelle",
    priorityHint: "P3",
    participantFacing: reply(`Thank you for telling us. Please send what you were trying to do, the page URL if you have it, and what happened. Do not include passwords or payment-card information.

Spanish-language pages live under https://thebackhalf.org/es/ — for example /es/register, /es/support, /es/architect/journey. Product names (The Back Half, Journey, Lumina, Architect) stay in English.

If the whole site or checkout is unavailable, we treat that as urgent. Individual page errors are handled through this ticket.`),
    internal: `Classifier: error/bug/outage/500/crash → TECHNICAL. Broad outage / “down for everyone” is P1 → Imani. Default owner Michelle for TECHNICAL. Known production facts to mention only when accurate and useful: Lumina is a stub Guide pending fuller intelligence; Journey progress is file-backed; Blueprint PDF needs Puppeteer; Spanish legal manuscripts remain pending approved translation — do not invent Spanish legal acknowledgments; point to English legal documents. No participant-facing browser-requirement copy exists — do not invent one. IMAP inbound poll is every 15 minutes plus Fetch inbound mail on the console.`,
    never: [
      "Do not request passwords, OTPs, or card data to “reproduce” a bug.",
      "Do not invent a supported-browser matrix.",
      "Do not auto-translate legal documents into Spanish.",
      "Do not promise 24/7 live chat or phone support.",
    ],
    escalateWhen:
      "Site-wide or checkout outage, data loss, or security symptom — Imani P1. Isolated UX defect — Nia after Imani confirms it is not infra.",
    productionSources: [
      "lib/support/classify.ts",
      "lib/lumina/conversation.ts",
      "lib/blueprint/launch-pdf-browser.ts",
      "content/legal/documents.ts",
      "ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md",
    ],
  },
  {
    id: "escalation",
    title: "Escalation",
    ticketCategory: "GENERAL",
    owner: "nia",
    priorityHint: "P3",
    participantFacing: reply(`The Back Half Support is here for registration, payment, onboarding, the Journey, Lumina, downloads, and related Architect experience.

Write to ${SUPPORT_MAILBOX} or use ${PUBLIC_SUPPORT_URL}. We typically respond within 3 days, with a goal of ${PUBLISHED_RESPONSE_HOURS} hours or less. That is a response expectation, not a promise of immediate resolution. Urgent security and privacy concerns are prioritized.

Please do not include passwords, payment-card information, or other sensitive account information.

If you are in danger, contact local emergency services or a crisis line in your area. The Back Half Support is not a crisis service.

Privacy requests use this same channel with category Privacy. Do not send a second copy to another invented address.`),
    internal: `Primary: Nia Prism — Chief Experience & Transformation Officer. Backup/routing: Michelle Northstar — Chief of Staff & Operations Officer. Technical/security: Imani Heartbeat — Chief Technology & Risk Officer. Founder only when criteria are met — never routine operator, never reply as Kimberly. Mailbox ${SUPPORT_MAILBOX}. Sender ${SUPPORT_FROM_NAME}. privacy@thebackhalf.org is reserved; Privacy category uses this tracker. No legal@ mailbox. SLAs: P1 ${PRIORITY_RESPONSE_HOURS.P1}h, P2 ${PRIORITY_RESPONSE_HOURS.P2}h, P3/P4 ${PRIORITY_RESPONSE_HOURS.P3}h. Published Architect expectation ${PUBLISHED_RESPONSE_HOURS}h. P1: security/privacy exposure, checkout/payment outage, major production outage, many Architects with the same critical failure. Legal/attorney/regulator → Founder + established legal procedure, no substantive social/legal reply. Ticket statuses: NEW, IN_PROGRESS, WAITING_ON_ARCHITECT, ESCALATED, RESOLVED, CLOSED. Console: /ops/admin/support. Lookup: /ops/support. Social handoff: Row 83 T12–T16 then create ticket source social_row83.`,
    never: [
      "Do not reply as Kimberly or from a personal Founder mailbox.",
      "Do not invent legal@ or a second support tracker.",
      "Do not promise a resolution time.",
      "Do not handle crisis as a clinical service.",
      "Do not mark Founder acceptance yourself.",
    ],
    escalateWhen:
      "See Row 153 urgent table: security/privacy → Imani (+ Michelle routing); major outage → Imani; payment/revenue incident → Michelle, Imani if outage, Founder if exception/chargeback; major Architect-experience failure → Nia + Michelle; legal → Founder; serious reputational/executive → Founder, Nia if Architect-experience harm.",
    productionSources: [
      "lib/support/catalog.ts",
      "lib/support/escalate.ts",
      "lib/support/classify.ts",
      "components/pages/support-page-view.tsx",
      "ops/fab-5/ROW-153-SUPPORT-CHANNELS-OPERATING-PROTOCOL.md",
    ],
  },
];

export function getLaunchSupportArticle(
  id: string,
): LaunchSupportArticle | undefined {
  return LAUNCH_SUPPORT_ARTICLES.find((article) => article.id === id);
}

export function launchSupportArticlesForCategory(
  category: SupportTicketCategory,
): LaunchSupportArticle[] {
  return LAUNCH_SUPPORT_ARTICLES.filter(
    (article) => article.ticketCategory === category,
  );
}

export function launchSupportParticipantCorpus(): string {
  return LAUNCH_SUPPORT_ARTICLES.map((article) => article.participantFacing).join(
    "\n",
  );
}

export function launchSupportKnowledgeBaseCorpus(): string {
  return LAUNCH_SUPPORT_ARTICLES.map((article) =>
    [
      article.id,
      article.title,
      article.participantFacing,
      article.internal,
      article.never.join("\n"),
      article.escalateWhen,
    ].join("\n"),
  ).join("\n");
}

const FORBIDDEN_PUBLIC_PROMISES = [
  /\brefunds? available\b/i,
  /\bmoney-?back\b/i,
  /\brisk-?free\b/i,
  /\b24\/7 support\b/i,
  /\blive chat\b/i,
  /\bphone support\b/i,
  /\blegal@/i,
  /\bOctober 19, 2026\b/,
  /\bguaranteed resolution\b/i,
  /\binstant response\b/i,
];

export function forbiddenLaunchSupportKbHits(
  corpus = launchSupportParticipantCorpus(),
): string[] {
  return FORBIDDEN_PUBLIC_PROMISES.filter((pattern) => pattern.test(corpus)).map(
    (pattern) => pattern.source,
  );
}
