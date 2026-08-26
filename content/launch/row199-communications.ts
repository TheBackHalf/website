/**
 * Row 199 remaining launch communications — Founder review.
 * Launch email is Founder-approved and not sent.
 * Partner Note is proposed for Founder acceptance.
 * Does not mark Row 199 Complete.
 */

export const ROW199_REVIEW_URL =
  "http://localhost:3000/_internal/row199-launch-communications-review";

export const approvedLaunchEmail = {
  status: "APPROVED" as const,
  founderApproval: "YES" as const,
  sent: false,
  scheduled: false,
  loadedIntoPlatform: false,
  fromName: "The Back Half",
  fromEmail: "kimberly@thebackhalf.org",
  subject: "THE BACK HALF IS HERE.",
  preheader: "You spent years becoming who you were supposed to be.",
  cta: "Become an Architect",
  destination: "https://thebackhalf.org/register",
  bodyParagraphs: [
    "THE BACK HALF IS HERE.",
    "You spent years becoming who you were supposed to be.",
    "Now comes a different question:",
    "Who do you choose to become next?",
    "There is more life inside your life.",
    "The turn is from expectation to intention.",
    "The Back Half is a Global Life Design Company for that turn.",
    "MAGICAL IS POSSIBLE.",
    "Today, you can Become an Architect.",
    "And your Back Half can begin today.",
  ],
  eligibilitySentenceRemovedFromEmail: true,
  productEighteenPlusEnforcementChanged: false,
  signOff: [
    "In Gratitude,",
    "Kimberly M. Walker",
    "Founder",
    "The Back Half",
  ] as const,
};

/** @deprecated Use approvedLaunchEmail. Kept so older imports fail closed to the approved copy. */
export const proposedLaunchEmail = approvedLaunchEmail;

export const proposedPartnerNote = {
  status: "PROPOSED — FOUNDER APPROVAL REQUIRED" as const,
  founderAcceptance: "PENDING" as const,
  existingNoteReused: true,
  sent: false,
  sender: "Kimberly M. Walker, Founder",
  subject: "The Back Half opens August 31, 2026",
  destination: "https://thebackhalf.org/register",
  site: "https://thebackhalf.org",
  signOff: [
    "In Gratitude,",
    "Kimberly M. Walker",
    "Founder",
    "The Back Half",
  ] as const,
  body: `Hello,

I'm writing because The Back Half opens on August 31, 2026.

The Back Half is a Global Life Design Company for people who have already built a life — and are ready to live the next chapter with intention. From expectation to intention.

The invitation is to Become an Architect: https://thebackhalf.org/register

Eligibility is 18+ only.

Launch channels are Instagram and TikTok: @backhalfco.

Architect Community is not live on August 31. Architect Community — Coming October 25, 2026. Founding Architect includes the first six months of Architect Community access.

The Back Half does not issue refunds.

https://thebackhalf.org

In Gratitude,
Kimberly M. Walker
Founder
The Back Half`,
  correctionsApplied: [
    "Community date: Architect Community — Coming October 25, 2026.",
    "Launch channels named Instagram and TikTok as @backhalfco. LinkedIn was not added as a launch channel.",
    "Founding Architect Community benefit stated as first six months.",
    "No-refund policy stated.",
    "Site URL https://thebackhalf.org included.",
    'Founder sign-off set to "In Gratitude," Kimberly M. Walker, Founder, The Back Half.',
  ],
};

export const row199VerifiedExisting = {
  founderVideo: "PASS — not in this review",
  instagram: "PASS — not in this review",
  tiktok: "PASS — not in this review",
  faqs: "PASS — not in this review",
  supportResponseScripts: "PASS — not in this review",
  linkedinRequired: "NO",
} as const;

export const row199CommunityDateCorrection = {
  approvedDate: "October 25, 2026",
  t28Corrected: true,
  result: "PASS" as const,
};

export const row199RemainingBlockers = [
  "Founder acceptance of Partner Note only.",
] as const;
