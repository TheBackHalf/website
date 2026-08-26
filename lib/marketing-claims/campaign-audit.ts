import { existsSync } from "node:fs";
import path from "node:path";

export type Row33Status =
  | "PASS"
  | "CORRECTED"
  | "FOUNDER/LEGAL JUDGMENT REQUIRED"
  | "FAIL";

export type Row33ClaimType =
  | "Brand / philosophy"
  | "Factual product"
  | "Experience"
  | "Mixed philosophy + factual";

export type CampaignComplianceRow = {
  assetId: string;
  date: string;
  platform: "Instagram" | "LinkedIn" | "TikTok";
  message: string;
  claimType: Row33ClaimType;
  permissible: boolean;
  substantiationRequired: string;
  testimonialEndorsement: "None";
  aiDisclosureRequired: string;
  disclosurePresent: string;
  productRealityMatch: string;
  status: Row33Status;
  correctionRequired: string;
  caption: string;
  onScreenCopy: string;
  cta: string;
  destination: string;
  previewFiles: string[];
  /** False = archived / future enhancement; not required for August 28–31 launch execution. */
  launchRequired?: boolean;
};

const ARCHIVE = "approved-assets/row-81-social-launch";

export const CAMPAIGN_COMPLIANCE: CampaignComplianceRow[] = [
  {
    assetId: "R78-0828-IG",
    date: "2026-08-28",
    platform: "Instagram",
    message: "What if this isn't all there is?",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "None — question and brand philosophy only.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch: "Date August 31, 2026 matches launch. Destination is the site home.",
    status: "PASS",
    correctionRequired: "None",
    caption:
      "A life can be full — career, family, home, accomplishment — and still grow quiet. The Back Half was created for that moment. August 31, 2026.",
    onScreenCopy:
      "THE QUESTION / What if this isn't all there is? / You did everything you were supposed to do. / Now what? / August 31.",
    cta: "Stay with the question.",
    destination: "https://thebackhalf.org/",
    previewFiles: [
      `${ARCHIVE}/instagram/R78-0828-IG-S01.png`,
      `${ARCHIVE}/instagram/R78-0828-IG-S02.png`,
      `${ARCHIVE}/instagram/R78-0828-IG-S03.png`,
      `${ARCHIVE}/instagram/R78-0828-IG-S04.png`,
    ],
  },
  {
    assetId: "R78-0828-LI",
    date: "2026-08-28",
    platform: "LinkedIn",
    message: "What if this isn't all there is?",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired:
      "Company descriptor. Official positioning remains Global Life Design Company.",
    testimonialEndorsement: "None",
    aiDisclosureRequired:
      "Not required for this still + caption. Sign-off is Founder voice, not an AI video.",
    disclosurePresent: "Signed Kimberly M. Walker, Founder (human Founder voice).",
    productRealityMatch: "Launch date accurate. Destination /#awakening exists on the homepage.",
    status: "PASS",
    correctionRequired:
      "None — LinkedIn is a future enhancement. Asset preserved. Do not revise for August 28–31 launch.",
    caption:
      "I created The Back Half as a transformational life design company for that moment. From expectation to intention. August 31, 2026.",
    onScreenCopy: "THE QUESTION / What if this isn't all there is?",
    cta: "If you recognized yourself, begin at the beginning.",
    destination: "https://thebackhalf.org/#awakening",
    previewFiles: [`${ARCHIVE}/linkedin/R78-0828-LI.png`],
    launchRequired: false,
  },
  {
    assetId: "R78-0828-TT",
    date: "2026-08-28",
    platform: "TikTok",
    message: "What if this isn't all there is?",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "None",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch: "August 31 date accurate. No outcome guarantee.",
    status: "PASS",
    correctionRequired: "None",
    caption:
      "You can do everything right and still feel the quiet. August 31.",
    onScreenCopy:
      "Visual pause / THE QUESTION / You did everything you were supposed to do. / Now what? / August 31.",
    cta: "If that landed — August 31.",
    destination: "https://thebackhalf.org/",
    previewFiles: [
      `${ARCHIVE}/tiktok/R78-0828-TT-cover.png`,
      `${ARCHIVE}/tiktok/R78-0828-TT.mp4`,
    ],
  },
  {
    assetId: "R78-0829-IG",
    date: "2026-08-29",
    platform: "Instagram",
    message: "When was the last time you felt completely alive?",
    claimType: "Mixed philosophy + factual",
    permissible: true,
    substantiationRequired: "Journey is seven chapters — matches journeyStages.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch:
      "Seven-chapter Journey exists. Magical is Possible. is approved aspiration, not a guarantee. Destination /journey exists.",
    status: "PASS",
    correctionRequired: "None",
    caption:
      "The Back Half Journey is how that feeling becomes a design. Seven chapters. Intention instead of hope.",
    onScreenCopy:
      "THE QUESTION / When was the last time you felt completely alive? / Magical is Possible. / What are you saving for someday? / There is a path.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    previewFiles: [
      `${ARCHIVE}/instagram/R78-0829-IG-S01.png`,
      `${ARCHIVE}/instagram/R78-0829-IG-S02.png`,
      `${ARCHIVE}/instagram/R78-0829-IG-S03.png`,
      `${ARCHIVE}/instagram/R78-0829-IG-S04.png`,
    ],
  },
  {
    assetId: "R78-0829-LI",
    date: "2026-08-29",
    platform: "LinkedIn",
    message: "When was the last time you felt completely alive?",
    claimType: "Mixed philosophy + factual",
    permissible: true,
    substantiationRequired: "Seven-chapter path is factual.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "Founder sign-off; not an AI video.",
    productRealityMatch: "Seven-chapter Journey exists. Destination /journey exists.",
    status: "PASS",
    correctionRequired:
      "None — LinkedIn is a future enhancement. Asset preserved. Do not revise for August 28–31 launch.",
    caption:
      "The Back Half Journey is a seven-chapter path for people who have already built a life — and now want to live it with intention.",
    onScreenCopy: "THE QUESTION / When was the last time you felt completely alive?",
    cta: "See the path.",
    destination: "https://thebackhalf.org/journey",
    previewFiles: [`${ARCHIVE}/linkedin/R78-0829-LI.png`],
    launchRequired: false,
  },
  {
    assetId: "R78-0829-TT",
    date: "2026-08-29",
    platform: "TikTok",
    message: "When was the last time you felt completely alive?",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "Journey path exists.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch:
      "Magical is Possible. preserved as aspiration. Journey destination accurate. August 31 date accurate.",
    status: "PASS",
    correctionRequired: "None",
    caption: "The Journey is the path. August 31.",
    onScreenCopy:
      "THE QUESTION about aliveness / Magical is Possible. / What are you saving for someday? / There is a path.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    previewFiles: [
      `${ARCHIVE}/tiktok/R78-0829-TT-cover.png`,
      `${ARCHIVE}/tiktok/R78-0829-TT.mp4`,
    ],
  },
  {
    assetId: "R78-0830-IG",
    date: "2026-08-30",
    platform: "Instagram",
    message: "What if someday is August 31?",
    claimType: "Mixed philosophy + factual",
    permissible: true,
    substantiationRequired: "Lumina is the participant-facing AI Guide. Launch is August 31.",
    testimonialEndorsement: "None",
    aiDisclosureRequired:
      "Required: identify Lumina as AI (in caption). First-comment link to /legal/ai-disclosure at placement.",
    disclosurePresent:
      "Caption: “Lumina — your AI Guide.” Placement overlay in this standard requires the quiet first-comment legal link at publish time.",
    productRealityMatch:
      "Does not claim live Community on August 31. Become an Architect / Lumina match product. Destination /lumina exists.",
    status: "PASS",
    correctionRequired:
      "Do not rewrite the caption. At publish, add the quiet first-comment link required by this standard.",
    caption:
      "Inside The Back Half Journey is Lumina — your AI Guide. Tomorrow, you can Become an Architect.",
    onScreenCopy:
      "What if someday is August 31? / Lumina presence only / Tomorrow.",
    cta: "Return tomorrow. Become an Architect.",
    destination: "https://thebackhalf.org/lumina",
    previewFiles: [
      `${ARCHIVE}/instagram/R78-0830-IG-S01.png`,
      `${ARCHIVE}/instagram/R78-0830-IG-S02.png`,
      `${ARCHIVE}/instagram/R78-0830-IG-S03.png`,
    ],
  },
  {
    assetId: "R78-0830-LI",
    date: "2026-08-30",
    platform: "LinkedIn",
    message: "What if someday is August 31?",
    claimType: "Mixed philosophy + factual",
    permissible: true,
    substantiationRequired: "Lumina is AI Guide. Founding Architect is a live checkout offer.",
    testimonialEndorsement: "None",
    aiDisclosureRequired:
      "Caption identifies Lumina as AI Guide. Quiet end-link to /legal/ai-disclosure at placement.",
    disclosurePresent: "Lumina is your AI Guide inside the Journey.",
    productRealityMatch:
      "Does not claim a live community experience on August 31. Founding Architect is the invitation to begin — matches offer name. Destination /register exists.",
    status: "PASS",
    correctionRequired:
      "LinkedIn is a future enhancement. Asset preserved. If later published, keep the quiet AI Disclosure end-link. Do not revise for August 28–31 launch.",
    caption:
      "The Back Half opens August 31, 2026. Lumina is your AI Guide inside the Journey. Founding Architect is the invitation to begin.",
    onScreenCopy: "THE QUESTION / What if someday is August 31?",
    cta: "Tomorrow, Become an Architect.",
    destination: "https://thebackhalf.org/register",
    previewFiles: [`${ARCHIVE}/linkedin/R78-0830-LI.png`],
    launchRequired: false,
  },
  {
    assetId: "R78-0830-TT",
    date: "2026-08-30",
    platform: "TikTok",
    message: "What if someday is August 31?",
    claimType: "Mixed philosophy + factual",
    permissible: true,
    substantiationRequired: "Lumina exists. Launch is tomorrow from this post’s date.",
    testimonialEndorsement: "None",
    aiDisclosureRequired:
      "Lumina appears on-screen. First-comment AI Disclosure link at placement.",
    disclosurePresent:
      "Caption: Lumina will be there. On-screen is presence-only; caption does not call her human.",
    productRealityMatch: "No live-community claim. Destination /register exists.",
    status: "PASS",
    correctionRequired: "Do not rewrite. Add quiet first-comment AI Disclosure at publish.",
    caption:
      "Tomorrow, The Back Half opens. Lumina will be there. You can begin.",
    onScreenCopy:
      "What if someday is August 31? / Lumina presence / Tomorrow.",
    cta: "Tomorrow.",
    destination: "https://thebackhalf.org/register",
    previewFiles: [
      `${ARCHIVE}/tiktok/R78-0830-TT-cover.png`,
      `${ARCHIVE}/tiktok/R78-0830-TT.mp4`,
    ],
  },
  {
    assetId: "R81-0831-IG",
    date: "2026-08-31",
    platform: "Instagram",
    message: "THE BACK HALF IS HERE.",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "Launch-day announcement. Registration is live.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch:
      "Approved manifesto sequence preserved, including MAGICAL IS POSSIBLE and BECOME AN ARCHITECT. Destination /register exists. No refund, support, or community-live claims.",
    status: "PASS",
    correctionRequired: "None",
    caption:
      "The doors are open. Your Back Half can begin today. Become an Architect. thebackhalf.org/register",
    onScreenCopy:
      "THE BACK HALF IS HERE. / You spent years becoming who you were supposed to be. / Now comes a different question. / Who do you choose to become next? / FROM EXPECTATION TO INTENTION. / There is more life inside your life. / MAGICAL IS POSSIBLE. / BECOME AN ARCHITECT. thebackhalf.org/register",
    cta: "Become an Architect.",
    destination: "https://thebackhalf.org/register",
    previewFiles: [
      `${ARCHIVE}/instagram/R81-0831-IG-S01.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S02.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S03.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S04.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S05.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S06.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S07.png`,
      `${ARCHIVE}/instagram/R81-0831-IG-S08.png`,
    ],
  },
  {
    assetId: "R81-0831-LI",
    date: "2026-08-31",
    platform: "LinkedIn",
    message: "THE BACK HALF IS HERE.",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "Launch-day announcement.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required for this still. Founder voice sign-off.",
    disclosurePresent: "Kimberly M. Walker, Founder",
    productRealityMatch:
      "Doors open / register URL accurate. Transformational life design is philosophy, not a guaranteed outcome.",
    status: "PASS",
    correctionRequired:
      "None — LinkedIn is a future enhancement. Asset preserved. Do not revise for August 28–31 launch.",
    caption:
      "The Back Half is a transformational life design company created for that question. From expectation to intention. The doors are open. https://thebackhalf.org/register",
    onScreenCopy: "THE BACK HALF IS HERE. The doors are open. August 31, 2026",
    cta: "Become an Architect.",
    destination: "https://thebackhalf.org/register",
    previewFiles: [`${ARCHIVE}/linkedin/R81-0831-LI.png`],
    launchRequired: false,
  },
  {
    assetId: "R81-0831-TT",
    date: "2026-08-31",
    platform: "TikTok",
    message: "THE BACK HALF IS HERE.",
    claimType: "Brand / philosophy",
    permissible: true,
    substantiationRequired: "Launch-day announcement.",
    testimonialEndorsement: "None",
    aiDisclosureRequired: "Not required",
    disclosurePresent: "N/A",
    productRealityMatch:
      "Manifesto sequence matches approved copy. MAGICAL IS POSSIBLE preserved. Destination /register exists.",
    status: "PASS",
    correctionRequired: "None",
    caption:
      "The doors are open. Your Back Half can begin today. Become an Architect. thebackhalf.org/register",
    onScreenCopy:
      "THE BACK HALF IS HERE. / Who do you choose to become next? / FROM EXPECTATION TO INTENTION. / MAGICAL IS POSSIBLE. / BECOME AN ARCHITECT.",
    cta: "Become an Architect.",
    destination: "https://thebackhalf.org/register",
    previewFiles: [
      `${ARCHIVE}/tiktok/R81-0831-TT-cover.png`,
      `${ARCHIVE}/tiktok/R81-0831-TT.mp4`,
    ],
  },
];

export type WebsiteClaimRow = {
  surface: string;
  claim: string;
  claimType: Row33ClaimType;
  status: Row33Status;
  note: string;
};

export const WEBSITE_CLAIM_AUDIT: WebsiteClaimRow[] = [
  {
    surface: "Homepage / SEO",
    claim: "The Back Half helps people transition from living by expectation to living with intention.",
    claimType: "Experience",
    status: "PASS",
    note: "“Helps” is experience language, not a guaranteed outcome.",
  },
  {
    surface: "Homepage invitation",
    claim: "We stopped believing that a magical life was possible.",
    claimType: "Brand / philosophy",
    status: "PASS",
    note: "Aspiration / problem framing. Not a product guarantee.",
  },
  {
    surface: "Homepage awakening / belief",
    claim: "Every person deserves the opportunity to intentionally create a magical life.",
    claimType: "Brand / philosophy",
    status: "PASS",
    note: "Philosophy. Distinct from guaranteeing a magical life.",
  },
  {
    surface: "Homepage manifesto",
    claim: "We believe magical is possible. Life is transformed by intention.",
    claimType: "Brand / philosophy",
    status: "PASS",
    note: "Belief language. MAGICAL IS POSSIBLE preserved.",
  },
  {
    surface: "Homepage Founder",
    claim: "Hi, I'm Kimberly. Founder photography.",
    claimType: "Factual product",
    status: "PASS",
    note: "Labeled Founder, not live AI chat. No AI Kimberly participant chat at launch.",
  },
  {
    surface: "Homepage Lumina",
    claim: "Meet Lumina",
    claimType: "Factual product",
    status: "PASS",
    note: "Links to /lumina. Public page and Architect chat identify AI Disclosure.",
  },
  {
    surface: "Nav — Community / Book",
    claim: "Community and Book are not launch navigation items. No live Community page or Book destination exists for August 31.",
    claimType: "Factual product",
    status: "PASS",
    note: "Dead # placeholders removed from header, hero, and footer. Items hidden until a launch-ready destination exists.",
  },
  {
    surface: "Registration",
    claim: "Become an Architect. Required legal acknowledgments.",
    claimType: "Factual product",
    status: "PASS",
    note: "Account creation exists. No testimonials. No refunds.",
  },
  {
    surface: "Checkout — Founding Architect",
    claim:
      "Blueprint + first six months of Architect Community included (Architect Community — Coming October 25, 2026). Enrollment August 31–December 31, 2026.",
    claimType: "Factual product",
    status: "PASS",
    note: "Public enrollment opens with launch on August 31. Community is included commercially and is Coming October 25, 2026. No live-community-on-launch claim.",
  },
  {
    surface: "Support",
    claim: "Typically 3 days / 72-hour goal. No refunds. Email and form only.",
    claimType: "Factual product",
    status: "PASS",
    note: "Matches Row 153. No 24/7, live chat, or phone.",
  },
  {
    surface: "Journey",
    claim: "Seven chapters / stages.",
    claimType: "Factual product",
    status: "PASS",
    note: "journeyStages has seven entries. Health is a life-design domain, not treatment.",
  },
  {
    surface: "Spanish public site",
    claim: "Spanish routing exists for core public pages.",
    claimType: "Factual product",
    status: "PASS",
    note: "Launch social campaign is English. Do not invent Spanish campaign copy.",
  },
];

export const PRODUCT_REALITY = [
  {
    area: "Blueprint",
    status: "PASS" as Row33Status,
    note: "Checkout offer exists at $500. Described as seven-chapter Blueprint experience.",
  },
  {
    area: "Journey",
    status: "PASS" as Row33Status,
    note: "Seven stages implemented. Campaign seven-chapter claim matches.",
  },
  {
    area: "Lumina",
    status: "PASS" as Row33Status,
    note: "Public Meet Lumina and Architect Lumina exist. Identified as AI Guide.",
  },
  {
    area: "AI Kimberly",
    status: "PASS" as Row33Status,
    note: "No public participant chat at launch. Campaign does not claim live AI Kimberly chat.",
  },
  {
    area: "Support",
    status: "PASS" as Row33Status,
    note: "Form + support@thebackhalf.org. Typical 3-day response. No 24/7/live chat/phone.",
  },
  {
    area: "Community",
    status: "PASS" as Row33Status,
    note: "Architect Community does not launch as a live experience on August 31, 2026. Checkout states Architect Community — Coming October 25, 2026. Founding Architect includes the first six months of Architect Community as a future commercial inclusion.",
  },
  {
    area: "Membership",
    status: "PASS" as Row33Status,
    note: "Founding Architect and Community subscription offers exist in checkout.",
  },
  {
    area: "Downloads",
    status: "PASS" as Row33Status,
    note: "Architect resources surface exists. Campaign does not invent download counts.",
  },
  {
    area: "Spanish experience",
    status: "PASS" as Row33Status,
    note: "Website Spanish exists. Campaign remains English. No invented Spanish legal or social translations.",
  },
];

export function allCampaignFilesExist(cwd = process.cwd()): {
  missing: string[];
  present: number;
} {
  const files = CAMPAIGN_COMPLIANCE.flatMap((row) => row.previewFiles);
  const missing = files.filter((file) => !existsSync(path.join(cwd, file)));
  return { missing, present: files.length - missing.length };
}

export function campaignHasProhibitedCopy(): string[] {
  const hits: string[] = [];
  const banned =
    /\b(guaranteed|risk[- ]free|money[- ]back|clinically proven|scientifically proven|24\/7|live chat|phone support|works for everyone|will change your life)\b/i;
  for (const row of CAMPAIGN_COMPLIANCE) {
    const haystack = `${row.caption} ${row.onScreenCopy} ${row.cta}`;
    if (banned.test(haystack)) hits.push(row.assetId);
    if (/\bwe (offer|issue) refunds\b/i.test(haystack)) hits.push(`${row.assetId}:refund`);
  }
  return hits;
}
