/**
 * Downstream integration boundaries for the Architect application shell.
 *
 * Row 62 delivers layout, navigation, and insertion-ready UI only.
 * Do not implement business logic for the rows listed below here.
 */

export const appShellIntegrationPoints = {
  /** Row 63 — account registration flows, signup forms, email verification */
  registration: {
    row: 63,
    hook: "useArchitectRegistration",
    path: "lib/auth/registration.ts",
    status: "connected" as const,
  },
  /** Row 64 — login, session management, logout enforcement */
  session: {
    row: 64,
    hook: "useArchitectLogin",
    path: "lib/auth/login.ts",
    layoutGuard: "proxy.ts",
    logoutAction: "components/app-shell/app-account-menu.tsx",
    status: "connected" as const,
  },
  /** Row 65 — profile, preferences, persistence */
  profile: {
    row: 65,
    hook: "useArchitectProfile",
    path: "lib/account/use-architect-profile.ts",
    settingsSections: [
      "profile",
      "language",
      "supportPreference",
      "timeZone",
      "luminaMemory",
      "consentHistory",
      "accountControls",
    ],
    status: "connected" as const,
  },
  /** Row 66 — roles, permissions, access control */
  access: {
    row: 66,
    hook: "useArchitectAccess",
    path: "lib/auth/access.ts",
    clientHookPath: "lib/auth/use-architect-access.ts",
    status: "connected" as const,
  },
  /** Row 68 — Stripe Checkout for approved offers */
  checkout: {
    row: 68,
    path: "lib/checkout/",
    routes: ["/checkout", "/checkout/[offer]", "/checkout/success", "/checkout/cancel"],
    status: "connected" as const,
  },
  /** Row 69 — Stripe webhooks + Journey/Community entitlements */
  entitlements: {
    row: 69,
    path: "lib/billing/",
    webhookRoute: "/api/stripe/webhook",
    status: "connected" as const,
  },
  /** Row 70 — Billing Portal, invoices/receipts, approved cancellation */
  billingPortal: {
    row: 70,
    path: "lib/billing/portal.ts",
    route: "/architect/billing",
    status: "connected" as const,
  },
  /** Row 71 — Stripe/database/email/analytics/account-status synchronization */
  billingSync: {
    row: 71,
    path: "lib/billing/sync-effects.ts",
    reconcilePath: "lib/billing/reconcile.ts",
    analyticsPath: "lib/analytics/",
    status: "connected" as const,
  },
  /** Row 75 — Lumina conversation interface (intelligence arrives in later rows) */
  luminaConversation: {
    row: 75,
    hook: "useLuminaConversation",
    path: "lib/lumina/conversation.ts",
    uiSlot: "components/app-shell/lumina-entry-shell.tsx",
    status: "connected" as const,
  },
  /** Row 76 — Lumina cross-session memory with consent and clear */
  luminaMemory: {
    row: 76,
    path: "lib/lumina/memory/",
    retrievePath: "lib/lumina/memory/retrieve.ts",
    actionsPath: "lib/lumina/memory/actions.ts",
    settingsSection: "luminaMemory",
    progressStubPath: "lib/journey/progress-pointers.ts",
    status: "connected" as const,
  },
  /** Row 77 — Lumina Journey-aware context assembly (server-only; no Journey engine) */
  luminaJourneyContext: {
    row: 77,
    path: "lib/lumina/context/",
    assemblePath: "lib/lumina/context/assemble.ts",
    sendPath: "lib/lumina/actions/send-message.ts",
    status: "connected" as const,
  },
  /** Row 79 — Lumina bilingual language, voice, and UI label behavior */
  luminaBilingual: {
    row: 79,
    path: "lib/lumina/language/",
    status: "connected" as const,
  },
  /** Row 80 — Lumina evaluation suite (stub voice/memory/safety/latency/cost) */
  luminaEvaluationSuite: {
    row: 80,
    path: "scripts/lumina-eval/",
    runScript: "npm run eval:lumina",
    entryPath: "scripts/lumina-eval/run.ts",
    status: "connected" as const,
  },
  /** Row 81 — Lumina acceptance threshold (eval suite + known limitations) */
  luminaAcceptance: {
    row: 81,
    path: "scripts/lumina-eval/",
    runScript: "npm run eval:lumina",
    knownLimitationsPath: "scripts/lumina-eval/KNOWN_LIMITATIONS.md",
    status: "connected" as const,
  },
  /** Row 82 — Architect Dashboard business logic and live data */
  dashboard: {
    row: 82,
    hook: "useArchitectDashboard",
    path: "lib/dashboard/architect-dashboard.ts",
    uiSlot: "components/app-shell/dashboard-shell.tsx",
    status: "connected" as const,
  },
  /** Row 46 — Printable Blueprint guidebook, standalone assets, certificate PDFs */
  blueprintPrintables: {
    row: 46,
    path: "content/blueprint/",
    previewRoutes: "/blueprint/print/",
    downloadsPath: "public/downloads/blueprint/",
    exportScript: "npm run export:blueprint",
    status: "pending" as const,
  },
  /** Row 83 — Journey onboarding flow (welcome → Awakening entry) */
  journeyOnboarding: {
    row: 83,
    path: "lib/journey/onboarding/",
    progressPath: "lib/journey/progress/",
    routes: ["/architect/onboarding", "/architect/onboarding/[step]"],
    uiSlot: "components/onboarding/",
    status: "connected" as const,
  },
  /** Row 84 — Aliveness Assessment Experience (questions, scoring, results, Lumina) */
  alivenessAssessmentExperience: {
    row: 84,
    path: "lib/journey/assessments/",
    contentPath: "content/journey/aliveness-index.ts",
    routes: [
      "/architect/assessment/aliveness",
      "/architect/assessment/aliveness/results",
    ],
    uiSlot: "components/assessment/",
    luminaContextPath: "lib/lumina/context/assemble.ts",
    status: "connected" as const,
  },
  /** Row 85 — Chapter I — The Awakening (content, exercises, saves, progress, Lumina) */
  chapter1Awakening: {
    row: 85,
    path: "lib/journey/chapters/",
    contentPath: "content/journey/chapter-1-awakening.ts",
    routes: [
      "/architect/journey/chapter-1",
      "/architect/journey/chapter-1/[section]",
    ],
    uiSlot: "components/journey/chapter-1/",
    progressPath: "lib/journey/progress/",
    luminaContextPath: "lib/lumina/context/assemble.ts",
    status: "connected" as const,
  },
  /** Row 86 — Chapter II — The Mirror (content, exercises, saves, progress, Lumina) */
  chapter2Mirror: {
    row: 86,
    path: "lib/journey/chapters/",
    contentPath: "content/journey/chapter-2-mirror.ts",
    routes: [
      "/architect/journey/chapter-2",
      "/architect/journey/chapter-2/[section]",
    ],
    uiSlot: "components/journey/chapter-2/",
    progressPath: "lib/journey/progress/",
    luminaContextPath: "lib/lumina/context/assemble.ts",
    status: "connected" as const,
  },
  /**
   * Rows 83–94 — Journey chapters, progression, saving, assessments.
   * Rows 83–86 connected; Chapters III–VII pending 87+.
   */
  journeyExperience: {
    rows: [83, 94] as const,
    hook: "useArchitectJourney",
    path: "lib/journey/chapters/",
    progressPath: "lib/journey/progress/",
    assessmentPath: "lib/journey/assessments/",
    uiSlot: "components/journey/chapter-2/",
    note: "Row 83–86 connected; Chapters III–VII pending 87+",
    status: "connected" as const,
  },
} as const;

export type IntegrationPointStatus = "pending" | "connected";
