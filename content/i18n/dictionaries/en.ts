import { contactPage, supportPage } from "@/content/contact-support";
import { legalDocumentList } from "@/content/legal/documents";
import { luminaPage } from "@/content/lumina";
import { journeyIntro } from "@/content/journey-stages";
import { siteSeoDefaults } from "@/content/seo/pages";
import type { Dictionary } from "@/content/i18n/types";

const journeyDescription = journeyIntro.heading.lines.join(" ");

export const enDictionary: Dictionary = {
  locale: "en",
  common: {
    siteName: "The Back Half",
    copyPending: "Approved copy pending",
    legalCopyPending: "APPROVED LEGAL COPY PENDING",
    translationPending: "Approved Spanish translation pending",
    skipToMain: "Skip to main content",
    legal: "Legal",
    submitting: "Submitting…",
  },
  languageSwitcher: {
    label: "Language",
    english: "English",
    spanish: "Español",
  },
  nav: {
    manifesto: "Manifesto",
    book: "Book",
    community: "Community",
    contact: contactPage.title,
    support: supportPage.title,
  },
  forms: {
    name: "Name",
    email: "Email",
    reasonCategory: "Support category",
    subject: "Subject",
    alreadyArchitect: "Are you already an Architect?",
    architectYes: "Yes",
    architectNo: "No",
    message: "Message",
    nameRequired: "Name is required.",
    emailRequired: "Email is required.",
    emailInvalid: "Enter a valid email address.",
    categoryRequired: "Select a reason or category.",
    subjectRequired: "Subject is required.",
    messageRequired: "Message is required.",
    messageMinLength: "Message must be at least 10 characters.",
    categoriesPending: "Approved categories pending.",
    approvedCategoriesPending: "Approved copy pending",
    sensitiveNotice:
      "Please do not include passwords, payment-card information, or other sensitive account information in your message.",
    submissionPending:
      "We received your request.",
    submissionPendingDetail:
      "The Back Half Support typically responds within 3 days, with a goal of 72 hours or less.",
    submissionReceived: "We received your request.",
    submissionReceivedDetail:
      "Your ticket ID is {ticketId}. We typically respond within 3 days, with a goal of 72 hours or less. Urgent security and privacy concerns are prioritized. Please do not send passwords or payment-card information.",
    submissionError:
      "We could not send your request. Please try again, or write to support@thebackhalf.org.",
    contactSubmit: contactPage.title,
  },
  registration: {
    title: "Become an Architect",
    description:
      "Create your Back Half account to begin your Journey as an Architect.",
    firstName: "First name",
    lastName: "Last name",
    password: "Password",
    passwordConfirm: "Confirm password",
    createAccount: "Create account",
    continueWithGoogle: "Continue with Google",
    consentLegend: "Account creation acknowledgments",
    firstNameRequired: "First name is required.",
    lastNameRequired: "Last name is required.",
    passwordRequired: "Password is required.",
    passwordConfirmRequired: "Confirm your password.",
    passwordMismatch: "Passwords do not match.",
    passwordRequirements:
      "Use at least {min} characters with at least one letter and one number.",
    consentRequired: "Required acknowledgments must be accepted.",
    duplicateEmail:
      "An account with this email already exists. Sign in or use a different email.",
    genericError: "We could not create your account. Please try again.",
    submitting: "Creating account…",
    googleNotConfigured: "",
    googleCancelled: "Google sign-in was cancelled.",
    googleConflict:
      "This email is already registered with email and password.",
    googleConsentRequired:
      "Accept all required acknowledgments before continuing with Google.",
    confirmationTitle: "Verify your email",
    confirmationDescription:
      "Your account was created. Check your email for a verification link to access your Architect space.",
    confirmationResend: "Resend verification email",
    confirmationResent: "Verification email sent.",
    verifyTitle: "Email verification",
    verifySuccess: "Your email is verified. Redirecting to your Architect space…",
    verifyExpired: "This verification link has expired. Request a new one.",
    verifyInvalid: "This verification link is invalid.",
    verifyRedirecting: "Redirecting…",
    alreadyHaveAccount: "Already have an account? Sign in",
    googleNoAccount:
      "No Back Half account is linked to this Google sign-in yet. Create an account to continue.",
    googleAgeRequired:
      "Confirm that you are at least 18 years old before continuing with Google.",
  },
  eligibility: {
    gateTitle: "Confirm you are 18 or older",
    gateDescription:
      "Platform participation at launch — including registration, purchase, the Journey, Lumina, AI Kimberly, and membership — is available to individuals who are at least 18 years of age. The Back Half’s broader message can still resonate with people of many ages.",
    question: "Are you 18 years of age or older?",
    yesLabel: "Yes, I am 18 or older",
    noLabel: "No, I am under 18",
    confirm: "Continue",
    required: "Confirm whether you are at least 18 years old to continue.",
    confirmFailed: "We could not confirm your age selection. Please try again.",
    disclosure:
      "Participants must be at least 18 years old to register, purchase, or use participant experiences.",
    marketingDisclosure:
      "Participants must be at least 18 years old to register, purchase, or use the Journey, Lumina, AI Kimberly, and membership.",
    notEligibleTitle: "This platform experience is not available",
    notEligibleBody:
      "The Back Half platform is available to individuals who are 18 years of age or older. If you are under 18, you cannot register, purchase, create an account, complete onboarding, participate in the Journey, use Lumina or AI Kimberly, or submit personal information through Architect participant experiences at launch.",
    notEligibleReturn: "Return to The Back Half",
    supportNote:
      "Architect support intake is for eligible participants 18 or older. Do not submit personal information if you are under 18.",
    legalHeading: "Launch eligibility",
    confirmContinue: "Continue",
  },
  login: {
    title: "Sign in",
    description: "Sign in to continue your Journey as an Architect.",
    signIn: "Sign in",
    continueWithGoogle: "Continue with Google",
    forgotPassword: "Forgot password?",
    createAccount: "Need an account? Become an Architect",
    passwordRequired: "Password is required.",
    invalidCredentials: "Invalid email or password.",
    submitting: "Signing in…",
    googleNotConfigured: "",
    googleCancelled: "Google sign-in was cancelled.",
    googleConflict:
      "This email is already registered with email and password. Sign in with your password.",
    googleFailed: "Google sign-in could not be completed. Please try again.",
    resetSuccess: "Your password has been updated. Sign in with your new password.",
  },
  forgotPassword: {
    title: "Forgot password",
    description:
      "Enter your email address and we will send password reset instructions if an account exists.",
    submit: "Send reset instructions",
    submitting: "Sending…",
    accepted:
      "If an account exists for that email address, password reset instructions have been sent.",
    backToLogin: "Back to sign in",
  },
  resetPassword: {
    title: "Reset password",
    description: "Choose a new password for your Back Half account.",
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    submit: "Update password",
    submitting: "Updating…",
    invalidToken: "This password reset link is invalid.",
    expiredToken: "This password reset link has expired. Request a new one.",
    usedToken: "This password reset link has already been used. Request a new one.",
    missingToken: "A valid password reset link is required.",
  },
  unsubscribe: {
    title: "Unsubscribe",
    confirmedTitle: "You are unsubscribed",
    confirmed:
      "You have been unsubscribed from The Back Half marketing email. You will not be re-added by automations.",
    already:
      "This address is already unsubscribed from The Back Half marketing email. The suppression remains in place.",
    invalid: "This unsubscribe link is invalid.",
    missing: "A valid unsubscribe link is required.",
    transactionalNote:
      "Account, payment, and support emails that are required to operate your relationship with The Back Half may still be sent. They are not marketing messages.",
  },
  metadata: {
    home: {
      title: siteSeoDefaults.title,
      description: siteSeoDefaults.description,
    },
    journey: {
      title: "The Journey — The Back Half",
      description: journeyDescription,
    },
    lumina: {
      title: `${luminaPage.title} — The Back Half`,
      description: `${luminaPage.title}. ${siteSeoDefaults.description}`,
    },
    contact: {
      title: `${contactPage.title} — The Back Half`,
      description: `${contactPage.title}. ${siteSeoDefaults.description}`,
    },
    support: {
      title: `${supportPage.title} — The Back Half`,
      description: `${supportPage.title}. ${siteSeoDefaults.description}`,
    },
    register: {
      title: "Become an Architect — The Back Half",
      description:
        "Create your Back Half account to begin your Journey as an Architect.",
    },
    registerConfirmation: {
      title: "Verify your email — The Back Half",
      description: "Confirm your email address to access your Architect space.",
    },
    verifyEmail: {
      title: "Email verification — The Back Half",
      description: "Verify your Back Half account email address.",
    },
    login: {
      title: "Sign in — The Back Half",
      description: "Sign in to continue your Journey as an Architect.",
    },
    forgotPassword: {
      title: "Forgot password — The Back Half",
      description: "Request password reset instructions for your Back Half account.",
    },
    resetPassword: {
      title: "Reset password — The Back Half",
      description: "Choose a new password for your Back Half account.",
    },
    checkout: {
      title: "Checkout — The Back Half",
      description: "Choose your Back Half offer and continue to secure checkout.",
    },
    checkoutSuccess: {
      title: "Payment successful — The Back Half",
      description: "Your Back Half payment was completed.",
    },
    checkoutCancel: {
      title: "Checkout cancelled — The Back Half",
      description: "Your Back Half checkout was cancelled. You can try again anytime.",
    },
    eligibility: {
      title: "Confirm your eligibility — The Back Half",
      description:
        "Participants must be at least 18 years old to register, purchase, or use participant experiences.",
    },
    notEligible: {
      title: "Eligibility — The Back Half",
      description:
        "The Back Half platform is available to individuals who are 18 years of age or older.",
    },
    unsubscribe: {
      title: "Unsubscribe — The Back Half",
      description: "Unsubscribe from The Back Half marketing email.",
    },
    legal: (slug: string) => {
      const document = legalDocumentList.find((item) => item.slug === slug);
      if (!document) {
        return null;
      }

      return {
        title: `${document.title} — The Back Half`,
        description: `${document.title}. ${siteSeoDefaults.description}`,
      };
    },
  },
  access: {
    deniedTitle: "Access denied",
    deniedDescription:
      "You do not have permission to view this area of The Back Half.",
    signInRequired: "Sign-in required.",
    unauthorized: "Unauthorized.",
    returnHome: "Return home",
    returnDashboard: "Return to Architect Dashboard",
    adminTitle: "Founder / admin operations",
    adminDescription:
      "Authorized administrative access for operating The Back Half.",
    supportTitle: "Support operations",
    supportDescription:
      "Limited support access for resolving Architect account issues.",
    accountsHeading: "Accounts",
    lookupLabel: "Architect email",
    lookupButton: "Look up account",
    noAccounts: "No accounts found.",
    reconcileHeading: "Billing reconciliation",
    reconcileDescription:
      "Recover Stripe billing state into local purchases, entitlements, and account access for one Architect.",
    reconcileLabel: "Architect email or user id",
    reconcileButton: "Reconcile billing",
    reconcileSuccess: "Billing reconciled.",
    reconcileNotFound: "Account not found.",
    reconcileInvalid: "Enter an email or user id.",
  },
  checkout: {
    catalogTitle: "Choose your path",
    catalogDescription:
      "Select an approved Back Half offer. Secure payment is handled by Stripe Checkout.",
    offerCta: "Continue",
    oneTime: "One-time",
    monthly: "Monthly",
    continueToPayment: "Continue to secure checkout",
    consentLegend: "Checkout acknowledgments",
    consentRequired: "Required acknowledgments must be accepted.",
    signInRequired: "Sign in to continue to checkout.",
    notConfigured:
      "Checkout is not configured yet. Stripe sandbox credentials are required.",
    priceMismatch:
      "This offer is temporarily unavailable. Please contact support.",
    genericError: "We could not start checkout. Please try again.",
    submitting: "Starting secure checkout…",
    successTitle: "Payment complete",
    successDescription:
      "Thank you. Your payment for The Back Half was completed successfully.",
    successOfferLabel: "Purchased offer",
    successNextStep: "Return to your Architect Dashboard",
    successNextStepOnboarding: "Begin Journey onboarding",
    successAccessPending:
      "Payment is confirmed. Access is provisioned by secure webhook processing. Refresh your Architect Journey shortly if access is not visible yet.",
    successIncomplete:
      "This checkout session is not complete. No access has been granted.",
    successInvalid:
      "We could not confirm this payment session. No access has been granted.",
    cancelTitle: "Checkout cancelled",
    cancelDescription:
      "Your checkout was cancelled or left unfinished. No payment was taken and no access was granted.",
    cancelRetry: "Try checkout again",
    cancelHome: "Return home",
    returnOffers: "View offers",
    returnDashboard: "Go to Architect Dashboard",
    offerBlueprintName: "The Back Half Blueprint",
    offerBlueprintDescription:
      "The seven-chapter Blueprint experience — $1,500 one-time.",
    offerBundleName: "Founding Architect",
    offerBundleDescription:
      "Blueprint + first six months of Architect Community included — $1,750 one-time. Architect Community launches October 25, 2026. Founding Architect Community period runs October 25, 2026 through April 25, 2027. Enrollment August 31–December 31, 2026.",
    offerCommunityName: "The Back Half Community",
    offerCommunityDescription:
      "$50/month after Blueprint completion. Architect Community — Coming October 25, 2026. Founding Architect renews at $50/month after the first six months of Architect Community access.",
    eligibilityDisclosure:
      "Participants must be at least 18 years old to purchase The Back Half Blueprint, membership, or any launch offer.",
    ageIneligible:
      "Checkout is available only to participants who are at least 18 years old.",
    refundPolicy:
      "Cancellation is not a refund. The Back Half standard policy is no refunds.",
  },
  appShell: {
    appName: "Architect",
    navLabel: "Architect application",
    accountMenuLabel: "Account menu",
    logout: "Log out",
    logoutPending: "Signing out…",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    skipToApp: "Skip to application content",
    downstreamPending: "Implementation pending",
    downstreamDetail:
      "This area will be connected when the corresponding Launch Readiness row is complete.",
    nav: {
      dashboard: "Dashboard",
      journey: "The Journey",
      lumina: "Lumina",
      resources: "Architect Resources",
      settings: "Settings",
      billing: "Billing",
      support: supportPage.title,
    },
    dashboard: {
      title: "Architect Dashboard",
      description:
        "Your Architect home — current Journey chapter, progress, resources, and the next step forward.",
      welcomeSlot: "Welcome",
      welcome: "Welcome, {name}.",
      currentChapter: "Current Journey chapter",
      progress: "Journey progress",
      continueJourney: "Continue Journey",
      continueOnboarding: "Continue onboarding",
      continueCheckout: "Get Journey access",
      resourcesPreview: "Architect Resources",
      viewAllResources: "View all Architect Resources",
      notStarted: "Your Journey has not started yet.",
      noProgress: "No Journey progress is recorded yet.",
      noAccess:
        "Journey access is not active on this account. Continue to checkout to begin.",
      noCurrentChapter: "No current chapter is recorded yet.",
      stateNotStarted: "Not started",
      stateInProgress: "In progress",
      stateStageCompleted: "Stage completed",
      stateJourneyCompleted: "Journey completed",
      stateNoAccess: "Access needed",
      stagePosition: "Stage {current} of {total}",
      quickLinksLabel: "Account and support",
      loadError:
        "We could not load your Architect dashboard. Please try again or contact support.",
      loading: "Loading your Architect dashboard…",
    },
    settings: {
      title: "Profile & Preferences",
      description:
        "Manage your Architect profile, preferences, consent history, and account controls.",
      profile: "Profile",
      preferences: "Preferences",
      language: "Language",
      supportPreference: "Support preference",
      timeZone: "Time zone",
      consentHistory: "Consent history",
      accountControls: "Account",
      optionPlaceholder: "Select an option",
      firstName: "First name",
      lastName: "Last name",
      pronunciation: "Name pronunciation",
      pronunciationHelper:
        "Optional. Tell The Back Half how to pronounce your name.",
      languageHelper:
        "Choose the language for your authenticated Architect experience.",
      languageEnglish: "English",
      languageSpanish: "Español",
      supportPreferenceHelper:
        "Choose how you prefer to reach launch support channels that are available today.",
      supportChannelSupport: "Support page",
      supportChannelContact: "Contact page",
      timeZoneHelper:
        "Used for scheduling, communications, community, and Journey timing.",
      timeZonePlaceholder: "Select a time zone",
      save: "Save changes",
      saving: "Saving…",
      saved: "Your profile and preferences were saved.",
      saveError: "We could not save your changes. Please try again.",
      firstNameRequired: "Enter your first name.",
      lastNameRequired: "Enter your last name.",
      firstNameTooLong: "First name is too long.",
      lastNameTooLong: "Last name is too long.",
      pronunciationTooLong: "Pronunciation is too long.",
      languageRequired: "Select a language.",
      supportPreferenceRequired: "Select a support preference.",
      supportPreferenceInvalid: "Select a valid support preference.",
      timeZoneRequired: "Select a time zone.",
      timeZoneInvalid: "Select a valid time zone.",
      consentType: "Agreement",
      consentStatus: "Status",
      consentAccepted: "Accepted",
      consentAcceptedAt: "Accepted on",
      consentVersion: "Version",
      consentVersionUnavailable: "Not recorded",
      consentEmpty: "No consent records are available for this account yet.",
      consentReadOnlyNote:
        "Consent history is read-only audit information and cannot be edited here.",
      consentTerms: "Terms of Use",
      consentPrivacy: "Privacy Policy",
      consentParticipant: "Participant Agreement",
      consentAi: "AI Disclosure",
      consentMembership: "Membership Agreement",
      consentBilling: "Billing & Subscription",
      consentLuminaMemory: "Lumina memory",
      memoryTitle: "Lumina memory",
      memoryDescription:
        "When enabled, Lumina may keep approved summaries, decisions, milestones, and Journey progress pointers across sessions. Identity and preferences continue to come from your profile.",
      memoryEnableLabel:
        "Optional: Enable Lumina memory for this account. You can change this later in Settings.",
      memoryEnableHelper:
        "When enabled, Lumina may retain approved insights across sessions. Memory always honors your consent. Turning this off stops new durable memory writes without erasing consent history.",
      memoryCounts:
        "{summaries} summaries · {decisions} decisions · {milestones} milestones",
      memoryDisabledCounts: "Durable memory is off. Existing stored items are not shown while disabled.",
      memoryClear: "Clear Lumina memory",
      memoryClearConfirm:
        "Clear stored Lumina summaries, decisions, milestones, and progress pointers? This does not delete your account, billing records, consent history, or conversation history.",
      memoryClearConfirmAction: "Yes, clear Lumina memory",
      memoryClearCancel: "Cancel",
      memoryClearing: "Clearing…",
      memoryClearSuccess: "Lumina memory was cleared.",
      memoryClearError: "We could not clear Lumina memory. Please try again.",
      memoryEnabledSuccess: "Lumina memory is enabled.",
      memoryDisabledSuccess: "Lumina memory is disabled. New durable writes are blocked.",
      memoryUpdateError: "We could not update Lumina memory. Please try again.",
      memoryClearDistinctNote:
        "Clearing Lumina memory is separate from account deletion, which is not available yet.",
      accountEmail: "Account email",
      accountRole: "Account role",
      roleArchitect: "Architect",
      roleAdmin: "Founder / admin",
      roleSupport: "Support",
      roleSystem: "System",
      accountProvider: "Sign-in method",
      accountProviderEmail: "Email and password",
      accountProviderGoogle: "Google",
      accountArcCode: "ARC code",
      accountPassword: "Password",
      resetPasswordLink: "Reset password",
      googleLinked: "Google account linked",
      googleNotLinked: "Google account not linked",
      signOut: "Sign out",
      accountDeletionUnavailable:
        "Account deletion is not available yet. An approved deletion or deactivation process has not been configured.",
    },
    journey: {
      title: "The Journey",
      description:
        "Continue Chapter One — The Awakening and your authenticated Journey experience.",
    },
    onboarding: {
      title: "Journey Onboarding",
      description:
        "Set your preferences and begin Chapter One — The Awakening.",
      descriptionLead: "Set your preferences and begin ",
      descriptionEmphasis: "Chapter One — The Awakening.",
      progressLabel: "Onboarding progress",
      stepOf: "Step {current} of {total}",
      continue: "Continue",
      back: "Back",
      loading: "Loading onboarding…",
      error: "Something went wrong. Please try again.",
      saveAndContinue: "Save and continue",
      alreadyComplete: "Onboarding is already complete. Continue your Journey.",
      communityBlocked:
        "Community access alone does not include Journey onboarding.",
      welcomeTitle: "A welcome from the Founder",
      preferencesTitle: "Preferences",
      preferencesBody:
        "Confirm your profile preferences before you continue.",
      consentTitle: "Consent",
      consentBody:
        "Review and acknowledge the required agreements for your Journey.",
      consentAllRecorded: "Required acknowledgments are already on file.",
      consentLuminaMemoryOptional:
        "Optional: Enable Lumina memory for this account. You can change this later in Settings.",
      luminaTitle: "Meet Lumina",
      luminaBody:
        "Lumina is available in your Architect space. Open Lumina when you are ready, then continue.",
      luminaOpen: "Open Lumina",
      assessmentTitle: "Aliveness Index",
      assessmentIntroLabel: "About this assessment",
      assessmentScaleLabel: "Rating scale",
      assessmentProgress: "{answered} of {total} statements rated",
      assessmentSave: "Save responses",
      assessmentCompleteHint:
        "Rate every statement to continue. Your answers save with this Architect account.",
      assessmentRememberLabel: "Remember",
      assessmentReflectionLabel: "Reflection",
      assessmentScoreLabel: "Overall Aliveness Score: {score} / {max}",
      awakeningTitle: "The Awakening",
      awakeningCta: "Chapter One begins",
      awakeningBegin: "Enter Chapter One",
    },
    assessment: {
      questionsDescription:
        "Answer each statement honestly based on your life today. Your responses save with this Architect account.",
      resultsTitle: "Your Aliveness Index",
      resultsDescription:
        "Review your scores, reflect with the approved prompts, and continue when you are ready.",
      resultsEyebrow: "Aliveness Index",
      overallLabel: "Overall Aliveness Score",
      domainsLabel: "Domain scores",
      prioritiesLabel: "Highest and lowest",
      highestLabel: "Highest",
      lowestLabel: "Lowest — inviting your attention",
      attentionHint:
        "Use the reflection prompts below. No score band or clinical label is assigned.",
      highestMarker: "Highest",
      lowestMarker: "Lowest",
      domainScoreAria: "{name}: {score} of {max}",
      discussWithLumina: "Discuss with Lumina",
      continueJourney: "Continue Journey",
      viewResults: "See results",
      saved: "Responses saved.",
      reviewOnlyHint:
        "This assessment is complete and reviewable. Answers are not overwritten.",
      incompleteBody:
        "Complete every statement before viewing results.",
      openFullExperience: "Open Aliveness assessment",
      statementFallbackNote: "English statement — Spanish translation pending",
      dashboardLinkIncomplete: "Continue Aliveness Index",
      dashboardLinkComplete: "View Aliveness results",
    },
    chapter1: {
      title: "Chapter One — The Awakening",
      description:
        "Founder Welcome, reflection, The Aliveness Project, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter One sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionProject: "The Aliveness Project",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToProject: "Continue to The Aliveness Project",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      addAnswer: "Add another answer",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      examplesLabel: "Examples",
      examplesOwnLabel: "Examples (don't use these—create your own):",
      questionsLabel: "Aliveness Project questions",
      alivenessProjectTitle: "The Aliveness Project",
      alivenessProjectIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      projectComplete: "The Aliveness Project requirements are complete.",
      incompleteProject:
        "Complete every Aliveness Project question to the required answer count before finishing Chapter One.",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose awareness over autopilot.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter One — The Awakening is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter One completion when reflection, The Aliveness Project, and weekly commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter One complete",
      discussWithLumina: "Discuss Chapter One with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter One",
      resumeChapter: "Continue Chapter One",
      chapterCompleteLink: "Review Chapter One",
      resourcesTitle: "Chapter One resources",
      resourcesDescription:
        "Approved downloads available for Chapter I work in this Architect account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote:
        "Chapter One program body is shown in English — approved Spanish manuscript translation is not available yet.",
      error: "Something went wrong. Please try again.",
    },
    chapter2: {
      title: "Chapter Two — The Mirror",
      description:
        "Founder Welcome, reflection, The Back Half Mirror, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter Two sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionProject: "The Back Half Mirror",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToProject: "Continue to The Back Half Mirror",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      addAnswer: "Add another answer",
      addMatrixRow: "Add another row",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      matrixProgress: "{filled} complete row(s) (minimum {target})",
      dimensionProgress: "{filled} of {target} dimensions noted",
      examplesLabel: "Examples",
      questionsLabel: "Mirror exercise steps",
      mirrorExerciseTitle: "The Back Half Mirror",
      mirrorExerciseIntro:
        "Work each step honestly. Your responses save with this Architect account and restore when you return.",
      projectComplete: "The Back Half Mirror requirements are complete.",
      incompleteProject:
        "Complete every Mirror step to the required thresholds before finishing Chapter Two.",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose honesty over comfort.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter Two — The Mirror is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Two completion when reflection, The Back Half Mirror, and weekly commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Two complete",
      discussWithLumina: "Discuss Chapter Two with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Two",
      resumeChapter: "Continue Chapter Two",
      chapterCompleteLink: "Review Chapter Two",
      resourcesTitle: "Chapter Two resources",
      resourcesDescription:
        "Approved downloads available for Chapter II work in this Architect account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote:
        "Chapter Two program body is shown in English — approved Spanish manuscript translation is not available yet.",
      error: "Something went wrong. Please try again.",
    },
    chapter3: {
      title: "Chapter III — The Decision",
      description:
        "Founder Welcome, reflection, Decision Statement practice, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter Three sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      practiceHint:
        "Your Decision Statement saves with this Architect account.",
      practiceComplete: "Your Decision Statement is saved.",
      incompletePractice:
        "Write your Decision Statement before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose intention over expectation.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter III — The Decision is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Three completion when reflection, practice, and commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Three complete",
      discussWithLumina: "Discuss Chapter Three with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Three",
      resumeChapter: "Continue Chapter Three",
      chapterCompleteLink: "Review Chapter Three",
      resourcesTitle: "Chapter Three resources",
      resourcesDescription:
        "Approved downloads available for Chapter III work in this Architect account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      // Never expose internal missing-asset / project language on Chapter III.
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote:
        "Chapter Three program body is shown in English — approved Spanish manuscript translation is not available yet.",
      error: "Something went wrong. Please try again.",
    },
    chapter4: {
      title: "Chapter IV — The Standards",
      description:
        "Founder Welcome, reflection, Back Half Standards practice, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter Four sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      practiceHint:
        "Your Back Half Standards save with this Architect account.",
      practiceComplete: "Your Back Half Standards are saved.",
      incompletePractice:
        "Write five Back Half Standards before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose standards over excuses.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter IV — The Standards is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Four completion when reflection, practice, and commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Four complete",
      discussWithLumina: "Discuss Chapter Four with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Four",
      resumeChapter: "Continue Chapter Four",
      chapterCompleteLink: "Review Chapter Four",
      resourcesTitle: "Chapter Four resources",
      resourcesDescription:
        "Approved downloads available for Chapter IV work in this Architect account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote: "",
      error: "Something went wrong. Please try again.",
    },
    chapter5: {
      title: "Chapter V — Becoming the Architect",
      description:
        "Founder Welcome, reflection, Architect Identity Statement practice, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter Five sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      practiceHint:
        "Your Architect Identity Statement saves with this Architect account.",
      practiceComplete: "Your Architect Identity Statement is saved.",
      incompletePractice:
        "Write your Architect Identity Statement before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose to live as the Architect of my life.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter V — Becoming the Architect is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Five completion when reflection, practice, and commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Five complete",
      discussWithLumina: "Discuss Chapter Five with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Five",
      resumeChapter: "Continue Chapter Five",
      chapterCompleteLink: "Review Chapter Five",
      resourcesTitle: "Chapter Five resources",
      resourcesDescription:
        "Approved downloads available for Chapter V work in this account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote: "",
      error: "Something went wrong. Please try again.",
    },
    chapter6: {
      title: "Chapter VI — Expansion",
      description:
        "Founder Welcome, reflection, Expansion Plan practice, and weekly commitment — saved with this Architect account.",
      progressLabel: "Chapter Six sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      practiceHint:
        "Your Expansion Plan saves with this Architect account.",
      practiceComplete: "Your Expansion Plan is saved.",
      incompletePractice:
        "Complete each Expansion Plan area before continuing.",
      commitmentAffirm:
        "I choose this weekly commitment: This week, I choose contribution over complacency.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter VI — Expansion is complete. Your work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Six completion when reflection, practice, and commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Six complete",
      discussWithLumina: "Discuss Chapter Six with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Six",
      resumeChapter: "Continue Chapter Six",
      chapterCompleteLink: "Review Chapter Six",
      resourcesTitle: "Chapter Six resources",
      resourcesDescription:
        "Approved downloads available for Chapter VI work in this account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote: "",
      error: "Something went wrong. Please try again.",
    },
    chapter7: {
      title: "Chapter VII — The Beginning",
      description:
        "Founder Welcome, reflection, Back Half Declaration, and final commitment — saved with this Architect account.",
      progressLabel: "Chapter Seven sections",
      sectionWelcome: "Founder Welcome",
      sectionTeaching: "Core Teaching",
      sectionReflection: "Reflection Questions",
      sectionPractice: "Intentional Practice",
      sectionCommitment: "Weekly Commitment",
      sectionClosing: "Founder Closing Reflection",
      sectionComplete: "Chapter Complete",
      sectionDone: "Completed",
      continueToTeaching: "Continue to Core Teaching",
      continueToReflection: "Continue to Reflection Questions",
      continueToPractice: "Continue to Intentional Practice",
      continueToCommitment: "Continue to Weekly Commitment",
      continueToClosing: "Continue to Founder Closing Reflection",
      continueToComplete: "Continue to Chapter Complete",
      back: "Back",
      saveAnswers: "Save answers",
      saving: "Saving…",
      saved: "Answers saved.",
      answerLabel: "Answer {n}",
      answerProgress: "{filled} of {target} answers",
      reflectionTitle: "Architect Reflection Questions",
      reflectionIntro:
        "Answer each question honestly. Your responses save with this Architect account and restore when you return.",
      reflectionComplete: "Reflection questions are complete.",
      incompleteReflection:
        "Answer every reflection question before continuing.",
      practiceHint:
        "Your Back Half Declaration saves with this Architect account.",
      practiceComplete: "Your Back Half Declaration is saved.",
      incompletePractice:
        "Write, sign, and date your Back Half Declaration before continuing.",
      signatureLabel: "Architect signature",
      signedDateLabel: "Date",
      commitmentAffirm:
        "I choose this weekly commitment: Today, and every day, I choose to live intentionally and create a life of fullness, purpose, and possibility.",
      commitmentNoteLabel: "Optional note for this week",
      commitmentComplete: "Weekly commitment saved.",
      incompleteCommitment:
        "Affirm your weekly commitment before continuing.",
      incompleteWork:
        "Complete the required work in this section before continuing.",
      completeBody:
        "Chapter VII — The Beginning is complete. Your Journey work remains saved with this Architect account.",
      completePendingBody:
        "Confirm Chapter Seven completion when reflection, practice, and commitment are finished. Your saved answers are preserved.",
      markComplete: "Mark Chapter Seven complete",
      discussWithLumina: "Discuss Chapter Seven with Lumina",
      returnDashboard: "Return to Dashboard",
      returnJourney: "Journey overview",
      openChapter: "Begin Chapter Seven",
      resumeChapter: "Continue Chapter Seven",
      chapterCompleteLink: "Review Chapter Seven",
      resourcesTitle: "Chapter Seven resources",
      resourcesDescription:
        "Approved downloads available for Chapter VII and Journey completion in this account.",
      downloadLabel: "Download",
      mediaUnavailable: "Founder media unavailable",
      mediaUnavailableDetail: "",
      mediaLoading: "Loading Founder video…",
      mediaCaptions: "Captions",
      mediaTranscript: "Transcript",
      translationPendingNote: "",
      error: "Something went wrong. Please try again.",
    },
    lumina: {
      title: "Lumina",
      description: "A quiet space to continue with Lumina.",
      emptyTitle: "Begin when you are ready",
      emptyBody: "Write a message below. Your conversation stays with this Architect account.",
      composerLabel: "Message to Lumina",
      composerPlaceholder: "Write your message…",
      send: "Send",
      sending: "Sending…",
      responding: "Lumina is responding…",
      retry: "Retry",
      errorGeneric: "Something went wrong. You can try again.",
      citationsLabel: "References",
      externalLinkHint: "opens in a new tab",
      architectLabel: "Architect",
      luminaLabel: "Lumina",
      disclosureLink: "AI Disclosure",
      memoryActive: "Memory on",
      memoryInactive: "Memory off",
    },
    resources: {
      title: "Architect Resources",
      description:
        "Approved downloads, portfolio materials, and journal assets will appear here.",
    },
    billing: {
      title: "Billing",
      description:
        "Review your purchases, open invoices and receipts, and manage Community billing securely through Stripe.",
      purchasesHeading: "Your purchases",
      noPurchases: "No purchases are on file for this Architect account yet.",
      activeCommunity: "Active Community subscription",
      noActiveCommunity: "No active Community subscription",
      paidThrough: "Paid through",
      manageBilling: "Manage billing",
      manageBillingPending: "Opening Stripe Billing Portal…",
      portalUnavailable:
        "Billing Portal is not available right now. Please try again or contact support.",
      portalNoCustomer:
        "Billing management becomes available after a Stripe purchase is associated with your account.",
      portalError: "We could not open billing management. Please try again.",
      invoicesReceiptsHeading: "Invoices & receipts",
      noDocuments: "No invoices or receipts are available yet.",
      invoiceLabel: "Invoice",
      receiptLabel: "Receipt",
      openDocument: "Open",
      cancellationHeading: "Cancellation",
      cancellationCommunityOnly:
        "Community membership may be cancelled through Manage billing. Cancellation stops future renewals.",
      cancellationNotRefund:
        "Cancellation is not a refund. The Back Half standard policy is no refunds.",
      cancellationOneTimeUnavailable:
        "One-time Blueprint and Bundle purchases do not include cancellation controls after successful payment.",
      supportHeading: "Billing support",
      supportDescription:
        "Need help with a payment method, invoice, receipt, or subscription question?",
      supportCta: "Contact Support",
      statusPaid: "Paid",
      statusFailed: "Failed",
      statusRefunded: "Refunded",
      journeyAccessOn: "Journey access: active",
      journeyAccessOff: "Journey access: not active",
      communityAccessOn: "Community access: active",
      communityAccessOff: "Community access: not active",
    },
    metadata: {
      dashboard: {
        title: "Architect Dashboard — The Back Half",
        description:
          "Your Architect home with current Journey chapter, progress, resources, and continue actions.",
      },
      journey: {
        title: "The Journey — Architect — The Back Half",
        description: "Continue your Journey as an Architect.",
      },
      onboarding: {
        title: "Journey onboarding — Architect — The Back Half",
        description:
          "Set your preferences and begin your Journey as an Architect.",
      },
      assessment: {
        title: "Aliveness Index — Architect — The Back Half",
        description:
          "Complete the Aliveness Index assessment for your Architect Journey.",
      },
      assessmentResults: {
        title: "Aliveness Index results — Architect — The Back Half",
        description:
          "Review your Aliveness Index scores and reflection prompts.",
      },
      lumina: {
        title: "Lumina — Architect — The Back Half",
        description: "Meet Lumina in your Architect space.",
      },
      resources: {
        title: "Architect Resources — The Back Half",
        description: "Resources for Architects.",
      },
      settings: {
        title: "Profile & Preferences — Architect — The Back Half",
        description: "Architect profile, preferences, consent history, and account controls.",
      },
      billing: {
        title: "Billing — Architect — The Back Half",
        description: "Manage purchases, invoices, receipts, and Community billing.",
      },
    },
  },
};
