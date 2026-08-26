/**
 * Row 33 — Marketing Claims, Testimonial & Social Media Standard (structured).
 * Human-readable authority: ops/fab-5/ROW-33-MARKETING-CLAIMS-TESTIMONIAL-SOCIAL-STANDARD.md
 * Founder accepted 2026-08-21. Complete.
 */

export const ROW33_STANDARD_TITLE =
  "THE BACK HALF MARKETING CLAIMS, TESTIMONIAL & SOCIAL MEDIA STANDARD";

export const ROW33_STANDARD_VERSION = "1.0";
export const ROW33_STANDARD_STATUS = "COMPLETE";
export const ROW33_STANDARD_EFFECTIVE = "2026-08-21";
export const ROW33_FOUNDER_ACCEPTANCE = "YES";
export const ROW33_COMMUNITY_LAUNCH_DATE = "October 25, 2026";
export const ROW33_COMMUNITY_COMING_COPY =
  "Architect Community — Coming October 25, 2026";
export const ROW33_CAMPAIGN_AUDIT_DATE = "2026-08-21";
export const ROW33_AUTHORITY_PATH =
  "ops/fab-5/ROW-33-MARKETING-CLAIMS-TESTIMONIAL-SOCIAL-STANDARD.md";

export const APPROVED_BRAND = {
  company: "The Back Half",
  positioning: "Global Life Design Company",
  audience: "Not women-only. For people who want to move from expectation to intention.",
  launchDate: "August 31, 2026",
  channels: ["Instagram", "TikTok"] as const,
  futureEnhancementChannels: ["LinkedIn"] as const,
  excludedChannels: ["X"] as const,
  communityLiveOnLaunch: false,
  communityLaunchDate: ROW33_COMMUNITY_LAUNCH_DATE,
  communityComingCopy: ROW33_COMMUNITY_COMING_COPY,
  communityRolloutNote:
    `Architect Community does not launch as a live experience on August 31, 2026. ${ROW33_COMMUNITY_COMING_COPY}. The Back Half company launches August 31, 2026; Architect Community launches ${ROW33_COMMUNITY_LAUNCH_DATE}.`,
  refunds: false,
  phrases: [
    "The Back Half",
    "Magical is Possible.",
    "Become an Architect",
    "There is more life inside your life.",
    "Who do you choose to become next?",
    "And your Back Half can begin today.",
    "From expectation to intention.",
  ] as const,
} as const;

export const PERMITTED_CLAIMS = {
  brandPhilosophy: [
    "Possibility, intention, aliveness, reflection, life design, personal choice, exploration, becoming, purpose, adventure, contribution, relationships.",
    "Health and career as life-design domains for reflection — not as treatment or income promises.",
    "Aspirational brand language may be used when it does not guarantee a specific measurable result.",
    "MAGICAL IS POSSIBLE. is approved aspiration. It is not “The Back Half guarantees a magical life.”",
  ],
  factualProduct: [
    "What The Back Half Blueprint contains, Journey chapter/stage count, downloads, Lumina as AI Guide, support channels, membership offers, language availability, pricing, features, access periods, and the August 31, 2026 launch date — only when they match current implementation.",
  ],
  experience: [
    "designed to help",
    "invites you to",
    "gives you a framework",
    "provides tools for",
    "helps you explore",
    "creates space to",
    "guides reflection",
  ],
} as const;

export const CONDITIONAL_CLAIMS = [
  "Any factual feature, price, date, availability, or inclusion statement — only with current product or approved documentation support.",
  "Lumina or other AI surfaces — identify as AI; link https://thebackhalf.org/legal/ai-disclosure at placement when the post features Lumina or an AI spokesperson.",
  "Founding Architect Community inclusion — may describe the commercial inclusion only if it does not imply a live community experience on August 31, 2026.",
  "Testimonials and endorsements — only with authenticity, permission, and recordkeeping (none exist for this launch).",
  "Material-connection disclosures — required when the speaker is paid, employed, gifted, affiliated, or otherwise incentivized.",
  "Exceptional-result stories — require typicality context; none exist for this launch.",
] as const;

export const PROHIBITED_CLAIMS = [
  "Cure or treat a medical or mental-health condition; replace therapy; eliminate depression or anxiety; heal trauma.",
  "Guaranteed weight loss, health outcomes, repaired marriage/relationship, career advancement, employment, business success, income, investment returns, wealth, happiness, fulfillment, a magical life, transformation, or any specific measurable personal outcome.",
  "clinically proven; scientifically proven; guaranteed; risk free; works for everyone; will change your life — or material equivalents without approved substantiation.",
  "Refund available; money-back guarantee; risk-free trial.",
  "24/7 support; instant response; guaranteed resolution; live chat; phone support.",
  "Live Architect Community or YouTube community on August 31, 2026.",
  "AI-generated fake customers, quotations, or transformation stories presented as real.",
  "Women-only audience. Adding X as a launch channel.",
] as const;

export const HEALTH_RULES = [
  "Health may be discussed as an approved Journey life-design domain for intention and reflection.",
  "Do not represent The Back Half, Lumina, AI Kimberly, the Blueprint, or the Journey as medical diagnosis, treatment, mental-health diagnosis, therapy, psychiatric care, clinical treatment, emergency intervention, or professional medical advice.",
] as const;

export const FINANCE_RULES = [
  "Career intention, purpose, professional reflection, goals, and possibilities may be discussed.",
  "Do not promise income, investment returns, employment, promotion, business revenue, financial independence, or wealth creation unless specifically substantiated and Founder-approved.",
] as const;

export const TESTIMONIAL_RULES = {
  authenticity: [
    "Authentic. From a real person unless explicitly identified otherwise.",
    "Used with appropriate permission. Accurately represented. Not materially edited to change meaning.",
    "Not fabricated. Not generated and presented as a real customer. Not misleading about the person's experience.",
    "Not used to imply guaranteed results.",
  ],
  permissionFields: [
    "Person/source",
    "Permission/authorization",
    "Approved quotation or content",
    "Date permission obtained",
    "Where the testimonial may be used",
    "Any material relationship",
    "Any compensation, free product, or incentive",
    "Required disclosure",
    "Approval status",
  ],
  exceptionalResults:
    "If a testimonial describes an exceptional result, marketing must not imply that result is typical without approved support or context.",
  aiSynthetic:
    "AI-generated fake customers, quotations presented as genuine, synthetic people presented as Architects, and AI transformation stories represented as real experiences are prohibited. AI may assist editing a real approved testimonial only if the final representation remains truthful.",
  launchRule:
    "Do not invent testimonials for launch. Do not create placeholder customer praise that could be mistaken for a genuine testimonial. Launch campaign contains none.",
} as const;

export const ENDORSEMENT_RULES = [
  "If someone promoting The Back Half has a material relationship (payment, free access, gifts, affiliate compensation, employment, contractor relationship, ownership, or other meaningful incentive), disclose it clearly.",
  "Disclosures must be understandable and not buried where a reasonable viewer is unlikely to see them.",
  "Official company replies follow the same claims standard as original posts (Row 83).",
] as const;

export const AI_FOUNDER_RULES = {
  identity: "Kimberly M. Walker (AI)",
  humanFounder: "Kimberly M. Walker, Founder",
  requirement: [
    "The approved AI Founder / digital twin may be used.",
    "Do not deceptively imply that an AI-generated Founder interaction or video is a live human interaction when it is not.",
    "Use Kimberly M. Walker (AI) where the surface is the AI Founder representation.",
    "Do not rename the Founder. Do not remove the AI Founder. Do not weaken the approved Founder experience.",
    "Website Founder biography with Founder photography is the human Founder surface unless a specific asset is the AI Founder.",
    "Lumina is the participant-facing AI Guide, not the Founder. Identify Lumina as AI.",
  ],
  compliantExample:
    "Lumina — your AI Guide. Quiet first-comment link to /legal/ai-disclosure when Lumina appears.",
  noncompliantExample:
    "Presenting an AI Founder video or chat as a live conversation with Kimberly without identification.",
} as const;

export const SYNTHETIC_MEDIA_RULES = [
  "Decorative or AI-assisted production imagery does not require disclosure merely because tools assisted creation.",
  "Disclose when omission could materially mislead about who is speaking, whether a person is real, whether a testimonial is real, whether an experience occurred, or whether an endorsement is authentic.",
  "AI spokesperson/avatar requires identification. Synthetic testimonials are prohibited.",
] as const;

export const SOCIAL_RULES = [
  "Claims must match actual product reality.",
  "No unsupported transformation guarantees. No fabricated testimonials.",
  "Material relationships disclosed. AI Founder identified where the surface is AI.",
  "Pricing, dates, availability, support, refunds, and community timing must be accurate.",
  "Links and destinations accurate. Captions cannot contradict graphics. Video narration cannot contradict captions.",
  "Hashtags cannot create materially false claims. Launch campaign has no approved branded hashtags — do not invent them.",
  "Official company replies follow this standard and Row 83. Do not add X. Active August 28–31 launch channels are Instagram and TikTok. LinkedIn is a future enhancement; preserve archived LinkedIn assets and do not revise them for launch.",
] as const;
