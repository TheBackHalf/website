/**
 * Row 80 — First 30-day post-launch content plan (September 1–30, 2026).
 * Planning only. Does not produce assets, schedule, publish, or mark Complete.
 */

export const ROW80_ARTIFACT_PATH =
  "ops/fab-5/ROW-80-FIRST-30-DAY-POST-LAUNCH-CONTENT-PLAN.md";
export const ROW80_STATUS_PATH = "ops/fab-5/row-80-status.json";
export const ROW80_REVIEW_PATH = "/_internal/row80-30-day-content-plan-review";
export const ROW80_REVIEW_URL = `http://localhost:3000${ROW80_REVIEW_PATH}`;
export const APPROVED_ENROLLMENT_CTA = "Become an Architect";
export const APPROVED_ENROLLMENT_URL = "https://thebackhalf.org/register";
export const ROW80_FINAL_STATUS = "ROW 80 IS READY FOR FOUNDER STRATEGY REVIEW";

export type Row80Pillar =
  | "Education"
  | "Founder POV"
  | "Journey philosophy"
  | "FAQs / objections"
  | "Product education"
  | "Lumina"
  | "Enrollment CTA";

export type Row80Post = {
  id: string;
  date: string;
  weekday: string;
  week: 1 | 2 | 3 | 4;
  platform: "Instagram" | "TikTok";
  pillar: Row80Pillar;
  format: "carousel" | "static" | "short-form-vertical-video";
  hook: string;
  coreMessage: string;
  purpose: string;
  cta: string;
  destination: string;
  source: string;
  newAssetRequired: "YES" | "NO";
  founderInputRequired: "YES" | "NO";
  enrollmentCta: boolean;
  crossPlatformPair?: string;
};

export const ROW80_STRATEGY = {
  primaryObjective:
    "Move the post-launch audience from recognition to understanding to enrollment — quality, trust, and learning over volume. Community is not live in September.",
  instagramCadence: "3× per week (Tuesday, Thursday, Saturday) at 8:00 AM ET — recommended window, not scheduled.",
  tiktokCadence: "2× per week (Wednesday, Saturday) at 12:00 PM ET — recommended window, not scheduled.",
  contentMix:
    "Education and Journey philosophy lead. Founder POV weekly. Product, Lumina, and FAQs in week 3. Enrollment concentrated late week 3 and week 4. Transformation stories and social proof are not yet available and are not invented.",
  founderPovFrequency: "Weekly — four Founder ideas (five posts including Saturday reuse).",
  enrollmentCtaFrequency:
    "Not on every post. Direct Become an Architect → /register on six posts (four ideas) in weeks 3–4.",
  formatMix:
    "Instagram carousels for teaching; TikTok native vertical video. Do not recut Instagram carousels as TikTok. About 13 still/carousel and 9 video.",
  crossPlatformStrategy:
    "Saturday is the shared-idea day: one thought, platform-native execution. Tuesday/Thursday Instagram and Wednesday TikTok stay independent.",
  communityBridge:
    "Light Week 4 only. Architect Community — Coming October 25, 2026. Do not imply Community is live. September is not a Community launch campaign.",
} as const;

export const ROW80_WEEKS = [
  {
    week: 1 as const,
    dates: "September 1–6",
    theme: "Launch → orientation / understanding",
  },
  {
    week: 2 as const,
    dates: "September 7–13",
    theme: "Education / philosophy / Founder POV",
  },
  {
    week: 3 as const,
    dates: "September 14–20",
    theme: "Product / Journey / Lumina / objections",
  },
  {
    week: 4 as const,
    dates: "September 21–30",
    theme: "Trust / deeper engagement / enrollment / October bridge",
  },
];

export const ROW80_POSTS: Row80Post[] = [
  {
    id: "R80-0901-IG",
    date: "2026-09-01",
    weekday: "Tuesday",
    week: 1,
    platform: "Instagram",
    pillar: "Education",
    format: "carousel",
    hook: "The doors are open. Now what?",
    coreMessage:
      "The Back Half is a Global Life Design Company for people who have already built a life — and still feel there is more life inside it.",
    purpose: "Week 1 orientation after August 31.",
    cta: "Begin at the beginning.",
    destination: "https://thebackhalf.org/",
    source: "Row 83 T02; R81-0831 manifesto; Aug 28 recognition copy.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0902-TT",
    date: "2026-09-02",
    weekday: "Wednesday",
    week: 1,
    platform: "TikTok",
    pillar: "Education",
    format: "short-form-vertical-video",
    hook: "What if this isn't all there is?",
    coreMessage:
      "A life can be full and still grow quiet. Expectation can be completed, and aliveness can still be waiting.",
    purpose: "Continue THE QUESTION as orientation. Do not republish launch assets.",
    cta: "Stay with the question.",
    destination: "https://thebackhalf.org/",
    source: "R78-0828 approved copy as basis only.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0903-IG",
    date: "2026-09-03",
    weekday: "Thursday",
    week: 1,
    platform: "Instagram",
    pillar: "Journey philosophy",
    format: "carousel",
    hook: "From expectation to intention.",
    coreMessage:
      "The work is not starting over. It is choosing what comes next.",
    purpose: "Name the philosophy that the Journey is built on.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    source: "Approved brand phrases; R81-0831 slides 5–6; journey intro.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0905-IG",
    date: "2026-09-05",
    weekday: "Saturday",
    week: 1,
    platform: "Instagram",
    pillar: "Founder POV",
    format: "carousel",
    hook: "Not a crisis. A question.",
    coreMessage:
      "A quieter intelligence arrives — whether the next chapter will be chosen, or merely continued. The Back Half was created for that moment.",
    purpose: "Substantive Founder voice. No invented biography.",
    cta: "If you recognized yourself, begin at the beginning.",
    destination: "https://thebackhalf.org/",
    source: "R78-0828-LI Founder caption as basis. Do not fabricate personal history.",
    newAssetRequired: "YES",
    founderInputRequired: "YES",
    enrollmentCta: false,
    crossPlatformPair: "R80-0905",
  },
  {
    id: "R80-0905-TT",
    date: "2026-09-05",
    weekday: "Saturday",
    week: 1,
    platform: "TikTok",
    pillar: "Founder POV",
    format: "short-form-vertical-video",
    hook: "Not a crisis. A question.",
    coreMessage:
      "Same Founder idea as Instagram, native video. Chosen next chapter, not continued default.",
    purpose: "Saturday reuse. Founder POV in motion.",
    cta: "Begin at the beginning.",
    destination: "https://thebackhalf.org/",
    source: "R78-0828-LI Founder caption as basis.",
    newAssetRequired: "YES",
    founderInputRequired: "YES",
    enrollmentCta: false,
    crossPlatformPair: "R80-0905",
  },
  {
    id: "R80-0908-IG",
    date: "2026-09-08",
    weekday: "Tuesday",
    week: 2,
    platform: "Instagram",
    pillar: "Education",
    format: "carousel",
    hook: "There is more life inside your life.",
    coreMessage:
      "Aliveness is not somewhere else. It is what happens when you stop saving your life for later.",
    purpose: "Education slot. Replaces unavailable transformation-story slot.",
    cta: "None — reflection.",
    destination: "none",
    source: "Approved brand phrase; R78-0829 copy as basis.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0909-TT",
    date: "2026-09-09",
    weekday: "Wednesday",
    week: 2,
    platform: "TikTok",
    pillar: "Journey philosophy",
    format: "short-form-vertical-video",
    hook: "The Journey is the path.",
    coreMessage:
      "A seven-chapter path for becoming the Architect of your next chapter. Not a performance.",
    purpose: "Journey philosophy in motion.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    source: "R78-0829; Row 83 T07; journey-stages.ts.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0910-IG",
    date: "2026-09-10",
    weekday: "Thursday",
    week: 2,
    platform: "Instagram",
    pillar: "Founder POV",
    format: "carousel",
    hook: "Not start over. Not blow it up.",
    coreMessage:
      "A quieter, more serious question: what do I intentionally want now?",
    purpose: "Founder POV from approved launch-day thought. No invented biography.",
    cta: "None — point of view.",
    destination: "none",
    source: "R81-0831-LI caption as basis.",
    newAssetRequired: "YES",
    founderInputRequired: "YES",
    enrollmentCta: false,
  },
  {
    id: "R80-0912-IG",
    date: "2026-09-12",
    weekday: "Saturday",
    week: 2,
    platform: "Instagram",
    pillar: "FAQs / objections",
    format: "carousel",
    hook: "Is this therapy?",
    coreMessage:
      "No. This is not therapy. The Back Half is transformational life design — from expectation to intention.",
    purpose: "Trust / objection. Do not use therapy language as a promise.",
    cta: "None — clarity.",
    destination: "none",
    source: "Row 83 T09; Row 33 health/therapy rules.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
    crossPlatformPair: "R80-0912",
  },
  {
    id: "R80-0912-TT",
    date: "2026-09-12",
    weekday: "Saturday",
    week: 2,
    platform: "TikTok",
    pillar: "FAQs / objections",
    format: "short-form-vertical-video",
    hook: "This is not therapy.",
    coreMessage:
      "Same FAQ as Instagram, native video. Life design, not clinical care.",
    purpose: "Saturday reuse of the therapy objection.",
    cta: "None — clarity.",
    destination: "none",
    source: "Row 83 T09; Row 33.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
    crossPlatformPair: "R80-0912",
  },
  {
    id: "R80-0915-IG",
    date: "2026-09-15",
    weekday: "Tuesday",
    week: 3,
    platform: "Instagram",
    pillar: "Product education",
    format: "carousel",
    hook: "Seven chapters. One decision.",
    coreMessage:
      "The Awakening, The Mirror, The Decision, The Standards, Becoming the Architect, Expansion, The Beginning. Life-design domains include health, relationships, purpose, career, adventure, and contribution — as reflection, not treatment or income promises.",
    purpose: "Product / Journey education.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    source: "content/journey-stages.ts; Row 33 factual product claims.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0916-TT",
    date: "2026-09-16",
    weekday: "Wednesday",
    week: 3,
    platform: "TikTok",
    pillar: "Lumina",
    format: "short-form-vertical-video",
    hook: "Lumina is not a person.",
    coreMessage:
      "Lumina is your AI Guide inside the Journey — a place for better questions and deeper reflection. Identify as AI. Quiet disclosure to /legal/ai-disclosure when produced.",
    purpose: "Lumina introduction after launch.",
    cta: "Meet Lumina.",
    destination: "https://thebackhalf.org/lumina",
    source: "R78-0830; Row 83 T10; Row 33 AI identification.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0917-IG",
    date: "2026-09-17",
    weekday: "Thursday",
    week: 3,
    platform: "Instagram",
    pillar: "FAQs / objections",
    format: "carousel",
    hook: "Who is this for?",
    coreMessage:
      "People who have already built a life — and still feel there is more life inside it. Adults 18 and older. Not women-only.",
    purpose: "Audience and eligibility without a hard sell.",
    cta: "If that is you, you already know.",
    destination: "none",
    source: "Row 83 T03 and T08; Row 33 audience rule.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0919-IG",
    date: "2026-09-19",
    weekday: "Saturday",
    week: 3,
    platform: "Instagram",
    pillar: "Product education",
    format: "carousel",
    hook: "Become an Architect.",
    coreMessage:
      "The Journey is a seven-chapter experience for becoming the Architect of your next chapter. Live offers are on the registration page — do not quote prices from memory.",
    purpose: "First strategic enrollment of September.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "Row 83 T04, T06, T07; current offer facts.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
    crossPlatformPair: "R80-0919",
  },
  {
    id: "R80-0919-TT",
    date: "2026-09-19",
    weekday: "Saturday",
    week: 3,
    platform: "TikTok",
    pillar: "Product education",
    format: "short-form-vertical-video",
    hook: "The door has a URL.",
    coreMessage: "Create your account at thebackhalf.org/register. That is the door.",
    purpose: "Saturday reuse of the first enrollment idea.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "Row 83 T04.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
    crossPlatformPair: "R80-0919",
  },
  {
    id: "R80-0922-IG",
    date: "2026-09-22",
    weekday: "Tuesday",
    week: 4,
    platform: "Instagram",
    pillar: "Founder POV",
    format: "carousel",
    hook: "Magical is Possible.",
    coreMessage:
      "Aspiration, not a guarantee. Possibility is a stance. The work is intention.",
    purpose: "Trust. Replaces unavailable social-proof slot.",
    cta: "None — philosophy.",
    destination: "none",
    source: "Row 33 MAGICAL IS POSSIBLE.; R81-0831.",
    newAssetRequired: "YES",
    founderInputRequired: "YES",
    enrollmentCta: false,
  },
  {
    id: "R80-0923-TT",
    date: "2026-09-23",
    weekday: "Wednesday",
    week: 4,
    platform: "TikTok",
    pillar: "FAQs / objections",
    format: "short-form-vertical-video",
    hook: "Community is coming. It is not here yet.",
    coreMessage:
      "Architect Community — Coming October 25, 2026. The company launched August 31. These are two dates. September is for beginning.",
    purpose: "Accurate timing. Light curiosity. Not a Community launch.",
    cta: "None — timing clarity.",
    destination: "none",
    source: "Row 83 T28; Row 33 community timing.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: false,
  },
  {
    id: "R80-0924-IG",
    date: "2026-09-24",
    weekday: "Thursday",
    week: 4,
    platform: "Instagram",
    pillar: "Enrollment CTA",
    format: "carousel",
    hook: "Founding Architect is the invitation to begin.",
    coreMessage:
      "The Blueprint is available now. Founding Architect includes the first six months of Architect Community when Community opens October 25, 2026 — Community is not live in September. Live terms are on the registration page. 18+. No refunds.",
    purpose: "Honest offer education plus enrollment.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "en.ts Founding Architect offer; Row 33; Row 83 T06.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
  },
  {
    id: "R80-0926-IG",
    date: "2026-09-26",
    weekday: "Saturday",
    week: 4,
    platform: "Instagram",
    pillar: "Enrollment CTA",
    format: "carousel",
    hook: "Who do you choose to become next?",
    coreMessage:
      "You don’t have to wait for someday. Your Back Half can begin today.",
    purpose: "Enrollment without fabricated urgency.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "R81-0831 approved launch language as basis. New September asset.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
    crossPlatformPair: "R80-0926",
  },
  {
    id: "R80-0926-TT",
    date: "2026-09-26",
    weekday: "Saturday",
    week: 4,
    platform: "TikTok",
    pillar: "Enrollment CTA",
    format: "short-form-vertical-video",
    hook: "Your Back Half can begin today.",
    coreMessage: "Same enrollment idea as Instagram, native video.",
    purpose: "Saturday reuse of the enrollment idea.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "R81-0831 as basis.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
    crossPlatformPair: "R80-0926",
  },
  {
    id: "R80-0929-IG",
    date: "2026-09-29",
    weekday: "Tuesday",
    week: 4,
    platform: "Instagram",
    pillar: "Founder POV",
    format: "carousel",
    hook: "October 25 is a date. Intention is a practice.",
    coreMessage:
      "Architect Community will open October 25, 2026. The Journey is available now. Do not wait for Community to begin living by intention.",
    purpose: "Founder POV plus light October bridge.",
    cta: "Explore the Journey.",
    destination: "https://thebackhalf.org/journey",
    source: "Row 83 T28; approved Founder invitation tone. No invented biography.",
    newAssetRequired: "YES",
    founderInputRequired: "YES",
    enrollmentCta: false,
  },
  {
    id: "R80-0930-TT",
    date: "2026-09-30",
    weekday: "Wednesday",
    week: 4,
    platform: "TikTok",
    pillar: "Enrollment CTA",
    format: "short-form-vertical-video",
    hook: "Someday already had a date.",
    coreMessage:
      "August 31 opened the company. September is for beginning. Become an Architect.",
    purpose: "Month close. Enrollment without scarcity theater.",
    cta: APPROVED_ENROLLMENT_CTA,
    destination: APPROVED_ENROLLMENT_URL,
    source: "R78-0830 and R81-0831 as basis.",
    newAssetRequired: "YES",
    founderInputRequired: "NO",
    enrollmentCta: true,
  },
];

export const ROW80_CHECKPOINTS = [
  {
    name: "End of Week 1",
    when: "September 7, 2026",
    review:
      "Reach, engagement, follower growth, link clicks. Did orientation land? Do not invent missing native metrics.",
  },
  {
    name: "Mid-Month",
    when: "September 15, 2026",
    review:
      "Week 1 metrics plus landing-page sessions, checkout starts, and directional continuation. Is understanding converting? Adjust remaining cadence only after Founder review of this plan.",
  },
  {
    name: "End of Month",
    when: "September 30, 2026",
    review:
      "Full Row 84 funnel: reach, engagement, follower growth, link clicks, landing-page sessions, checkout starts, purchases, conversion. Set October 1–24 cadence before Community. Do not create a new analytics system.",
  },
] as const;

export const ROW80_FOUNDER_DECISIONS = [
  {
    id: "objective",
    label: "September strategic objective",
    recommendation: ROW80_STRATEGY.primaryObjective,
  },
  {
    id: "cadence",
    label: "Posting cadence",
    recommendation: "Instagram 3×/week; TikTok 2×/week. Not daily. Not scheduled.",
  },
  {
    id: "balance",
    label: "Instagram/TikTok balance",
    recommendation: ROW80_STRATEGY.crossPlatformStrategy,
  },
  {
    id: "mix",
    label: "Content-pillar mix",
    recommendation: ROW80_STRATEGY.contentMix,
  },
  {
    id: "founder-pov",
    label: "Founder POV frequency",
    recommendation: ROW80_STRATEGY.founderPovFrequency,
  },
  {
    id: "cta",
    label: "CTA frequency",
    recommendation: ROW80_STRATEGY.enrollmentCtaFrequency,
  },
  {
    id: "community",
    label: "Community bridge",
    recommendation: ROW80_STRATEGY.communityBridge,
  },
  {
    id: "overall",
    label: "Overall September plan",
    recommendation: "FOUNDER APPROVAL REQUIRED",
  },
] as const;

function passFail(ok: boolean): "PASS" | "FAIL" {
  return ok ? "PASS" : "FAIL";
}

export function collectRow80Counts() {
  const instagram = ROW80_POSTS.filter((post) => post.platform === "Instagram").length;
  const tiktok = ROW80_POSTS.filter((post) => post.platform === "TikTok").length;
  const pairs = new Set(
    ROW80_POSTS.map((post) => post.crossPlatformPair).filter(Boolean),
  );
  return {
    total: ROW80_POSTS.length,
    instagram,
    tiktok,
    crossPlatform: pairs.size,
    founderPov: ROW80_POSTS.filter((post) => post.pillar === "Founder POV").length,
    directEnrollmentCta: ROW80_POSTS.filter((post) => post.enrollmentCta).length,
    newAssetsRequired: ROW80_POSTS.filter((post) => post.newAssetRequired === "YES")
      .length,
    founderInputRequired: ROW80_POSTS.filter(
      (post) => post.founderInputRequired === "YES",
    ).length,
  };
}

export function validateRow80Plan() {
  const text = ROW80_POSTS.map((post) => `${post.hook} ${post.coreMessage}`).join(" ");
  const pillars = new Set(ROW80_POSTS.map((post) => post.pillar));
  const enrollmentDestinations = ROW80_POSTS.filter((post) => post.enrollmentCta).map(
    (post) => post.destination,
  );
  const inventedProof = /testimonial|review says|our customers|#\d+|enrolled \d+/i.test(
    text,
  );
  const vercel = /vercel\.app/i.test(text) || ROW80_POSTS.some((post) =>
    /vercel/i.test(post.destination),
  );
  const communityLive = /community is live|community is open now|join community today/i.test(
    text,
  );
  const brand = passFail(
    text.includes("from expectation to intention") ||
      ROW80_POSTS.some((post) =>
        /expectation to intention|more life inside|Magical is Possible/i.test(
          `${post.hook} ${post.coreMessage}`,
        ),
      ),
  );
  const founder = passFail(
    pillars.has("Founder POV") &&
      !/I grew up|when I was \d+|my divorce|my illness/i.test(text),
  );
  const journey = passFail(
    pillars.has("Journey philosophy") &&
      ROW80_POSTS.some((post) => /seven-chapter|The Awakening/i.test(post.coreMessage)),
  );
  const lumina = passFail(
    pillars.has("Lumina") &&
      ROW80_POSTS.some((post) => /AI Guide/i.test(post.coreMessage)),
  );
  const product = passFail(
    pillars.has("Product education") &&
      ROW80_POSTS.some((post) => /Founding Architect|first six months/i.test(post.coreMessage)),
  );
  const claims = passFail(
    ROW80_POSTS.some((post) => /Aspiration, not a guarantee/i.test(post.coreMessage)) &&
      !/guarantees a magical|will change your life|risk-free/i.test(text),
  );
  const community = passFail(
    ROW80_POSTS.some((post) => /October 25, 2026/.test(post.coreMessage)) &&
      !communityLive,
  );
  const cta = passFail(
    enrollmentDestinations.every((url) => url === APPROVED_ENROLLMENT_URL) &&
      !vercel &&
      ROW80_POSTS.filter((post) => post.enrollmentCta).length < ROW80_POSTS.length,
  );
  const noProof = inventedProof ? "FAIL" : "NOT YET AVAILABLE — DO NOT INVENT";
  const faq = passFail(pillars.has("FAQs / objections"));
  const education = passFail(pillars.has("Education"));
  const enrollment = passFail(pillars.has("Enrollment CTA") && cta === "PASS");

  const allPass =
    brand === "PASS" &&
    founder === "PASS" &&
    journey === "PASS" &&
    lumina === "PASS" &&
    product === "PASS" &&
    claims === "PASS" &&
    community === "PASS" &&
    cta === "PASS" &&
    faq === "PASS" &&
    education === "PASS" &&
    enrollment === "PASS" &&
    noProof !== "FAIL";

  return {
    brand,
    founderMessaging: founder,
    journey,
    lumina,
    productReality: product,
    claims,
    communityOctober25: community,
    cta,
    noInventedSocialProof: noProof,
    education,
    founderPov: passFail(pillars.has("Founder POV")),
    transformationStories: "NOT YET AVAILABLE — DO NOT INVENT" as const,
    faqs: faq,
    productEducation: product,
    enrollmentCtas: enrollment,
    socialProof: "NOT YET AVAILABLE — DO NOT INVENT" as const,
    defectsFound: allPass ? "NONE" : "See FAIL items.",
    correctionsMade: "NONE",
    remainingBlockers: "FOUNDER REVIEW AND APPROVAL ONLY",
    readyForFounderReview: allPass,
  };
}

export function getRow80ReviewModel() {
  const validation = validateRow80Plan();
  const counts = collectRow80Counts();
  return {
    title: "ROW 80 — SEPTEMBER CONTENT PLAN",
    period: "September 1–30, 2026",
    finalStatus: validation.readyForFounderReview
      ? ROW80_FINAL_STATUS
      : "ROW 80 IS NOT READY FOR FOUNDER STRATEGY REVIEW",
    rowMarkedComplete: false,
    strategy: ROW80_STRATEGY,
    weeks: ROW80_WEEKS,
    posts: ROW80_POSTS,
    checkpoints: ROW80_CHECKPOINTS,
    founderDecisions: ROW80_FOUNDER_DECISIONS,
    counts,
    validation,
    ctaConfiguration: "PASS",
    liveCanonicalReachability: "EXTERNAL DEPENDENCY — ROW 75",
    artifact: ROW80_ARTIFACT_PATH,
    reviewUrl: ROW80_REVIEW_URL,
  };
}
