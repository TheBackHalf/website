/**
 * Official Version 1 ENGLISH legal package — Founder-approved bodies.
 * Published into content/legal/documents.ts as Version 1.0 / August 31, 2026.
 * Do not rewrite the approved section bodies.
 */

import {
  BILLING_PURCHASE_ACKNOWLEDGMENT,
  CONSENT_LABELS_BY_DOCUMENT_ID,
} from "@/content/legal/consent-copy";

export type LegalV1Section = {
  heading?: string;
  paragraphs: readonly string[];
};

export type LegalV1Change =
  | "version"
  | "effective-date"
  | "mailbox"
  | "formatting"
  | "same-session-approved-replacement"
  | "founder-decision";

export type LegalV1Candidate = {
  id: string;
  title: string;
  version: "1.0";
  effectiveDate: "August 31, 2026";
  status: "APPROVED";
  publicationStatus: "PUBLISHED / FINAL";
  baseSource: string;
  mailboxes: readonly string[];
  contactInformation: string;
  ageProvision: string;
  noRefundProvision: string;
  communityProvision: string;
  mailboxCorrections: "PASS" | "FAIL";
  ageConsistency: "PASS" | "FAIL";
  noRefundConsistency: "PASS" | "FAIL" | "N/A";
  approvedBasePreserved: "PASS" | "FAIL";
  candidateCreated: "PASS" | "FAIL";
  founderFinalApprovalRequired: false;
  changesFromBase: readonly { category: LegalV1Change; detail: string }[];
  sections: readonly LegalV1Section[];
};

export const LEGAL_V1_PUBLICATION_STATUS = "PUBLISHED / FINAL" as const;

export const NO_REFUND_OPERATIVE_LANGUAGE =
  "All purchases are non-refundable. The Back Half does not issue refunds. Cancellation of a recurring Community membership, where applicable, prevents future billing only and is not a refund." as const;

export const MEMBERSHIP_SECTION_4_PREVIOUS =
  "The Architect Community may include, from time to time:" as const;

export const MEMBERSHIP_SECTION_4_UPDATED =
  "The Architect Community may include the following membership types:" as const;

export const LEGAL_V1_VERSION = "1.0" as const;
export const LEGAL_V1_EFFECTIVE_DATE = "August 31, 2026" as const;

export const privacyPolicyV1: LegalV1Candidate = {
  id: "privacy-policy",
  title: "Privacy Policy",
  version: LEGAL_V1_VERSION,
  effectiveDate: LEGAL_V1_EFFECTIVE_DATE,
  status: "APPROVED",
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  baseSource:
    "The Foundry/August 2026/The Back Half_8.3.2026.docx — Founder-approved Privacy Policy draft (Effective Date: August 19, 2026).",
  mailboxes: ["privacy@thebackhalf.org"],
  contactInformation: "privacy@thebackhalf.org",
  ageProvision:
    "§11 Participant Age Eligibility: Participation in The Back Half is limited to individuals who are 18 years of age or older. The Services are not directed to anyone under 18 years of age.",
  noRefundProvision:
    "Not addressed in this instrument. Purchases are governed by the no-refund terms in the Terms of Use, Participant Agreement, and Membership Agreement.",
  communityProvision:
    "Not a Community-timing instrument. Age eligibility applies to all Services, including Architect Community.",
  mailboxCorrections: "PASS",
  ageConsistency: "PASS",
  noRefundConsistency: "N/A",
  approvedBasePreserved: "PASS",
  candidateCreated: "PASS",
  founderFinalApprovalRequired: false,
  changesFromBase: [
    { category: "version", detail: "Added Version 1.0." },
    {
      category: "effective-date",
      detail: "Replaced August 19, 2026 with August 31, 2026.",
    },
    {
      category: "mailbox",
      detail: "Preserved privacy@thebackhalf.org. No legal@ or billing@ present.",
    },
    {
      category: "founder-decision",
      detail:
        'Replaced heading “Children\'s Privacy” with “Participant Age Eligibility.” Restated the 18+ participation rule in professional language. Did not add COPPA language, date-of-birth collection, or parental-consent procedures.',
    },
  ],
  sections: [
    {
      heading: "1. Introduction",
      paragraphs: [
        'The Back Half ("Company," "we," "our," or "us") is committed to protecting the privacy, confidentiality, and security of the personal information entrusted to us.',
        'This Privacy Policy explains how we collect, use, disclose, retain, and protect information when you access or use The Back Half website, digital platform, applications, products, services, artificial intelligence experiences, and related offerings (collectively, the "Services").',
        "By using the Services, you acknowledge that you have read and understood this Privacy Policy.",
      ],
    },
    {
      heading: "2. Information We Collect",
      paragraphs: [
        "Depending upon your interaction with the Services, we may collect the following categories of information:",
      ],
    },
    {
      heading: "Personal Information",
      paragraphs: [
        "Name",
        "Email address",
        "Billing information",
        "Account credentials",
        "Country and time zone",
      ],
    },
    {
      heading: "Account Information",
      paragraphs: [
        "Purchase history",
        "Membership status",
        "Journey progress",
        "Architect Resources",
        "Assessment results",
      ],
    },
    {
      heading: "Technical Information",
      paragraphs: [
        "IP address",
        "Browser type",
        "Device information",
        "Operating system",
        "Cookies",
        "Log data",
        "Analytics information",
      ],
    },
    {
      heading: "Communications",
      paragraphs: [
        "Customer support correspondence",
        "Survey responses",
        "Feedback",
        "Communications submitted through the Services",
      ],
    },
    {
      heading: "3. How We Use Information",
      paragraphs: [
        "We may use personal information to:",
        "Provide and improve the Services;",
        "Process purchases and memberships;",
        "Deliver educational content;",
        "Personalize the Architect experience;",
        "Support Lumina and AI Kimberly interactions;",
        "Respond to inquiries;",
        "Provide customer support;",
        "Improve platform performance;",
        "Maintain platform security;",
        "Comply with legal obligations; and",
        "Communicate important service updates.",
      ],
    },
    {
      heading: "4. Artificial Intelligence",
      paragraphs: [
        "Interactions with Lumina and AI Kimberly may be processed to improve the quality, safety, consistency, and performance of The Back Half experience.",
        "Personal information is handled in accordance with this Privacy Policy and the AI Disclosure.",
      ],
    },
    {
      heading: "5. Cookies and Analytics",
      paragraphs: [
        "The Back Half uses cookies and similar technologies to:",
        "Maintain secure sessions;",
        "Remember user preferences;",
        "Measure website performance;",
        "Improve usability;",
        "Analyze traffic patterns; and",
        "Enhance the overall user experience.",
        "Analytics providers may include Google Analytics and Microsoft Clarity.",
      ],
    },
    {
      heading: "6. Information Sharing",
      paragraphs: [
        "The Back Half does not sell personal information.",
        "Information may be shared only as necessary with trusted service providers supporting business operations, including providers of:",
        "Payment processing;",
        "Authentication;",
        "Website hosting;",
        "Cloud infrastructure;",
        "Email communications;",
        "Analytics; and",
        "Customer support.",
        "All service providers are required to maintain appropriate confidentiality and security safeguards.",
      ],
    },
    {
      heading: "7. Data Security",
      paragraphs: [
        "The Back Half maintains administrative, technical, and organizational safeguards designed to protect personal information from unauthorized access, disclosure, alteration, or destruction.",
        "While no security system can guarantee absolute protection, we employ commercially reasonable measures consistent with industry standards.",
      ],
    },
    {
      heading: "8. Data Retention",
      paragraphs: [
        "Personal information is retained only for as long as reasonably necessary to:",
        "Provide the Services;",
        "Maintain account records;",
        "Comply with legal obligations;",
        "Resolve disputes;",
        "Enforce applicable agreements; or",
        "Protect the legitimate interests of The Back Half.",
      ],
    },
    {
      heading: "9. Your Rights",
      paragraphs: [
        "Subject to applicable law, you may have the right to:",
        "Access your personal information;",
        "Correct inaccurate information;",
        "Request deletion of your information;",
        "Request a copy of your information;",
        "Withdraw consent where applicable; and",
        "Exercise other privacy rights available under applicable law.",
        "Requests may be submitted using the contact information below.",
      ],
    },
    {
      heading: "10. International Users",
      paragraphs: [
        "If you access the Services from outside the United States, you acknowledge that your information may be transferred to and processed within the United States or other jurisdictions in which our service providers operate.",
      ],
    },
    {
      heading: "11. Participant Age Eligibility",
      paragraphs: [
        "Participation in The Back Half is limited to individuals who are 18 years of age or older.",
        "The Services are not directed to anyone under 18 years of age.",
      ],
    },
    {
      heading: "12. Changes to this Privacy Policy",
      paragraphs: [
        "The Back Half reserves the right to amend, modify, or update this Privacy Policy at its discretion.",
        "Any revisions shall become effective upon publication of the updated Privacy Policy on the official The Back Half website, unless otherwise required by applicable law.",
      ],
    },
    {
      heading: "13. Contact Information",
      paragraphs: [
        "Questions regarding this Privacy Policy or privacy-related requests should be directed to:",
        "privacy@thebackhalf.org",
      ],
    },
    {
      heading: "Governing Principle",
      paragraphs: [
        "The Back Half recognizes that trust is earned through responsible stewardship of personal information. We are committed to maintaining the privacy, dignity, and confidence of every Architect through practices that reflect the highest standards of integrity, security, and professionalism.",
      ],
    },
  ],
};

export const termsOfUseV1: LegalV1Candidate = {
  id: "terms-of-use",
  title: "Terms of Use",
  version: LEGAL_V1_VERSION,
  effectiveDate: LEGAL_V1_EFFECTIVE_DATE,
  status: "APPROVED",
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  baseSource:
    "The Foundry/August 2026/The Back Half_8.3.2026.docx — Founder-approved Terms of Use (My Response: Approved).",
  mailboxes: ["kimberly@thebackhalf.org"],
  contactInformation: "kimberly@thebackhalf.org",
  ageProvision:
    "§2 Eligibility: The Services are intended for individuals who are 18 years of age or older.",
  noRefundProvision: `§7 Purchases: ${NO_REFUND_OPERATIVE_LANGUAGE}`,
  communityProvision:
    "§7 Purchases: The Architect Community launches on October 25, 2026, and is not live on August 31, 2026. Founding Architect Community benefit is set out in the Membership Agreement.",
  mailboxCorrections: "PASS",
  ageConsistency: "PASS",
  noRefundConsistency: "PASS",
  approvedBasePreserved: "PASS",
  candidateCreated: "PASS",
  founderFinalApprovalRequired: false,
  changesFromBase: [
    { category: "version", detail: "Added Version 1.0." },
    {
      category: "effective-date",
      detail: "Replaced August 19, 2026 with August 31, 2026.",
    },
    {
      category: "mailbox",
      detail:
        "Section 18 contact: legal@thebackhalf.org → kimberly@thebackhalf.org (8.4 Founder-approved Version 1 email strategy: legal notices → kimberly@).",
    },
    {
      category: "founder-decision",
      detail:
        "Replaced “18 years of age or the age of legal majority” with the operative 18+ standard: 18 years of age or older.",
    },
    {
      category: "founder-decision",
      detail:
        "Removed dead “Refund Policy” incorporation. Incorporated the Founder-approved no-refund terms directly into §7 Purchases and removed Refund Policy from §17 Entire Agreement. No standalone Refund Policy instrument was created.",
    },
  ],
  sections: [
    {
      heading: "1. Acceptance of Terms",
      paragraphs: [
        'These Terms of Use ("Terms") govern your access to and use of The Back Half website, digital platform, products, services, applications, artificial intelligence experiences, and related content (collectively, the "Services").',
        "By accessing or using any portion of the Services, you acknowledge that you have read, understood, and agree to be legally bound by these Terms.",
        "If you do not agree to these Terms, you may not access or use the Services.",
      ],
    },
    {
      heading: "2. Eligibility",
      paragraphs: [
        "The Services are intended for individuals who are 18 years of age or older.",
        "By using the Services, you represent and warrant that you are 18 years of age or older.",
      ],
    },
    {
      heading: "3. License to Use",
      paragraphs: [
        "Subject to these Terms, The Back Half grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Services solely for your personal, non-commercial use.",
        "No ownership rights are transferred through your use of the Services.",
      ],
    },
    {
      heading: "4. Intellectual Property Rights",
      paragraphs: [
        "All content made available through the Services, including but not limited to text, graphics, logos, trademarks, videos, audio, software, artificial intelligence experiences, educational materials, assessments, journals, downloadable resources, designs, and other proprietary content, is owned exclusively by The Back Half or its licensors and is protected by applicable intellectual property laws.",
        "No content may be copied, reproduced, distributed, modified, published, displayed, transmitted, sold, licensed, reverse engineered, or otherwise exploited without the prior written authorization of The Back Half.",
      ],
    },
    {
      heading: "5. User Accounts",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your account credentials and for all activity occurring under your account.",
        "You agree to provide accurate information and to promptly update your account information as necessary.",
      ],
    },
    {
      heading: "6. Acceptable Use",
      paragraphs: [
        "You agree not to:",
        "Violate any applicable law or regulation;",
        "Interfere with or disrupt the operation or security of the Services;",
        "Attempt unauthorized access to systems or data;",
        "Share or distribute copyrighted materials without authorization;",
        "Impersonate another individual or entity;",
        "Use the Services for unlawful, fraudulent, or harmful purposes; or",
        "Engage in conduct that could impair the experience of other users.",
      ],
    },
    {
      heading: "7. Purchases",
      paragraphs: [
        "All purchases are subject to the applicable pricing, Participant Agreement, Membership Agreement, Privacy Policy, and AI Disclosure.",
        NO_REFUND_OPERATIVE_LANGUAGE,
        "The Architect Community launches on October 25, 2026, and is not live on August 31, 2026.",
        "Completion of a purchase constitutes acceptance of each applicable agreement.",
      ],
    },
    {
      heading: "8. Artificial Intelligence Services",
      paragraphs: [
        "The Back Half may provide AI-powered experiences, including Lumina and AI Kimberly.",
        "These experiences are intended solely to support educational and personal development.",
        "They do not constitute medical, legal, financial, psychological, or other professional advice.",
      ],
    },
    {
      heading: "9. Third-Party Services",
      paragraphs: [
        "The Services may integrate with third-party providers for payment processing, authentication, communications, analytics, hosting, or other operational functions.",
        "The Back Half is not responsible for the independent policies, practices, or services of such third parties.",
      ],
    },
    {
      heading: "10. Disclaimer of Warranties",
      paragraphs: [
        'The Services are provided on an "as is" and "as available" basis.',
        "To the fullest extent permitted by law, The Back Half disclaims all warranties, whether express, implied, statutory, or otherwise, including any implied warranties of merchantability, fitness for a particular purpose, title, or non-infringement.",
      ],
    },
    {
      heading: "11. Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law, The Back Half shall not be liable for any indirect, incidental, consequential, special, exemplary, punitive, or similar damages arising from or relating to the use of the Services.",
      ],
    },
    {
      heading: "12. Indemnification",
      paragraphs: [
        "You agree to defend, indemnify, and hold harmless The Back Half, its officers, directors, employees, contractors, affiliates, successors, and assigns from and against any claims, liabilities, damages, losses, costs, or expenses arising out of your violation of these Terms or misuse of the Services.",
      ],
    },
    {
      heading: "13. Suspension or Termination",
      paragraphs: [
        "The Back Half reserves the right to suspend, restrict, or terminate access to the Services, with or without notice, where necessary to protect the integrity, security, operations, intellectual property, or community of The Back Half, or where a user violates these Terms or applicable law.",
      ],
    },
    {
      heading: "14. Amendments",
      paragraphs: [
        "The Back Half reserves the right to amend, modify, or update these Terms at its discretion.",
        "Any revisions shall become effective upon publication of the updated Terms on the official The Back Half website, unless otherwise required by applicable law.",
      ],
    },
    {
      heading: "15. Governing Law",
      paragraphs: [
        "These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to its conflict of law principles.",
      ],
    },
    {
      heading: "16. Severability",
      paragraphs: [
        "If any provision of these Terms is determined to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.",
      ],
    },
    {
      heading: "17. Entire Agreement",
      paragraphs: [
        "These Terms, together with the Privacy Policy, Participant Agreement, Membership Agreement, AI Disclosure, and any additional policies expressly incorporated by reference, constitute the entire agreement between you and The Back Half regarding the Services and supersede all prior or contemporaneous communications relating to their subject matter.",
      ],
    },
    {
      heading: "18. Contact Information",
      paragraphs: [
        "For legal inquiries regarding these Terms, please contact:",
        "kimberly@thebackhalf.org",
      ],
    },
    {
      heading: "Governing Principle",
      paragraphs: [
        "The Back Half is committed to conducting its business with integrity, professionalism, and respect for the rights of every Architect. These Terms are intended to protect both the community we are building and the enduring value of The Back Half.",
      ],
    },
  ],
};

export const participantAgreementV1: LegalV1Candidate = {
  id: "participant-agreement",
  title: "Participant Agreement",
  version: LEGAL_V1_VERSION,
  effectiveDate: LEGAL_V1_EFFECTIVE_DATE,
  status: "APPROVED",
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  baseSource:
    "The Foundry/August 2026/The Back Half_8.3.2026.docx — The Back Half Participant Agreement, including the Founder-approved Changes-clause replacement in the same session.",
  mailboxes: [],
  contactInformation: "None in this instrument. Support inquiries: support@thebackhalf.org.",
  ageProvision:
    "Eligibility: Participants must be 18 years of age or older.",
  noRefundProvision: `Payments: ${NO_REFUND_OPERATIVE_LANGUAGE}`,
  communityProvision:
    "Community Standards apply when participating in the Architect Community. Architect Community launches October 25, 2026, and is not live on August 31, 2026. The Founding Architect Community benefit is set out in the Membership Agreement.",
  mailboxCorrections: "PASS",
  ageConsistency: "PASS",
  noRefundConsistency: "PASS",
  approvedBasePreserved: "PASS",
  candidateCreated: "PASS",
  founderFinalApprovalRequired: false,
  changesFromBase: [
    { category: "version", detail: "Added Version 1.0." },
    {
      category: "effective-date",
      detail: "Replaced August 19, 2026 with August 31, 2026.",
    },
    {
      category: "mailbox",
      detail:
        "No contact mailbox in the approved Participant Agreement body. No legal@ or billing@ inserted.",
    },
    {
      category: "same-session-approved-replacement",
      detail:
        'Replaced the casual Changes sentence ("The Back Half may update this Participant Agreement from time to time.") with the Founder-approved professional replacement from the same 8.3 session.',
    },
    {
      category: "founder-decision",
      detail:
        "Replaced “18 years of age or the age of legal majority” with the operative 18+ standard: 18 years of age or older.",
    },
    {
      category: "founder-decision",
      detail:
        "Removed the dead “official Refund Policy” reference. Incorporated the Founder-approved no-refund terms directly into Payments.",
    },
  ],
  sections: [
    {
      heading: "Welcome",
      paragraphs: [
        "Welcome to The Back Half.",
        "This Participant Agreement explains the expectations and responsibilities of every Architect participating in The Back Half Blueprint and any future Back Half experiences.",
        "By purchasing or participating in The Back Half, you agree to the following terms.",
      ],
    },
    {
      heading: "Purpose",
      paragraphs: [
        "The Back Half exists to inspire people to intentionally create lives of fullness, purpose, and possibility.",
        "Participation is a personal commitment to growth, reflection, and intentional action.",
      ],
    },
    {
      heading: "Eligibility",
      paragraphs: [
        "Participants must be 18 years of age or older.",
      ],
    },
    {
      heading: "Personal Responsibility",
      paragraphs: [
        "You acknowledge that:",
        "You are responsible for your own decisions and actions.",
        "Your results depend upon your participation and commitment.",
        "The Back Half cannot guarantee any personal, financial, professional, or relational outcome.",
      ],
    },
    {
      heading: "Educational Experience",
      paragraphs: [
        "The Back Half is an educational and personal development experience.",
        "Nothing provided through the Blueprint, Community, Lumina, AI Kimberly, or any Back Half resource constitutes:",
        "Medical advice",
        "Mental health treatment",
        "Psychological counseling",
        "Financial advice",
        "Investment advice",
        "Legal advice",
        "Tax advice",
        "Always seek qualified professionals regarding those matters.",
      ],
    },
    {
      heading: "Participation Expectations",
      paragraphs: [
        "Architects agree to:",
        "Participate respectfully.",
        "Engage honestly.",
        "Protect the privacy of other Architects.",
        "Use the materials only for personal use unless otherwise authorized.",
      ],
    },
    {
      heading: "Community Standards",
      paragraphs: [
        "The Architect Community launches on October 25, 2026, and is not live on August 31, 2026.",
        "When participating in the Architect Community, you agree to:",
        "Encourage others.",
        "Treat every Architect with dignity and respect.",
        "Avoid harassment, discrimination, abusive language, or disruptive behavior.",
        "Contribute in ways that strengthen the community.",
        "The Back Half reserves the right to remove any participant whose conduct is inconsistent with these standards.",
      ],
    },
    {
      heading: "Intellectual Property",
      paragraphs: [
        "All Blueprint content, videos, journals, worksheets, resources, AI experiences, branding, graphics, and written materials remain the exclusive intellectual property of The Back Half.",
        "Participants may not copy, reproduce, distribute, teach, sell, publish, or create derivative works without prior written permission.",
      ],
    },
    {
      heading: "AI Experiences",
      paragraphs: [
        "Lumina and AI Kimberly are artificial intelligence experiences created exclusively for The Back Half.",
        "Although designed to provide thoughtful guidance, they are not human beings and should not be relied upon for professional advice or emergency situations.",
      ],
    },
    {
      heading: "Privacy",
      paragraphs: [
        "Your personal information will be handled in accordance with The Back Half Privacy Policy.",
        "Your personal reflections and responses remain private except as described in that policy or required by law.",
      ],
    },
    {
      heading: "Account Security",
      paragraphs: [
        "You are responsible for maintaining the confidentiality of your account credentials.",
        "You agree not to share your account or provide unauthorized access to others.",
      ],
    },
    {
      heading: "Payments",
      paragraphs: [
        NO_REFUND_OPERATIVE_LANGUAGE,
        "By completing your purchase, you acknowledge and accept this no-refund policy.",
      ],
    },
    {
      heading: "Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by law, The Back Half and its affiliates, officers, employees, contractors, and representatives shall not be liable for any indirect, incidental, consequential, special, or punitive damages arising from participation in The Back Half.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "The Back Half reserves the right to amend, modify, or update this Participant Agreement at its discretion. Any revisions will become effective upon publication of the updated Agreement on the official The Back Half website, unless otherwise required by applicable law.",
        "The most current version will always be available on the official website.",
      ],
    },
    {
      heading: "Governing Law",
      paragraphs: [
        "This Agreement shall be governed by and interpreted in accordance with the laws of the State of Georgia, without regard to its conflict of law principles.",
      ],
    },
    {
      heading: "Acceptance",
      paragraphs: [
        "By purchasing, accessing, or participating in The Back Half, you acknowledge that you have read, understood, and agree to be bound by this Participant Agreement.",
      ],
    },
    {
      heading: "Guiding Principle",
      paragraphs: [
        "The Back Half is built on trust, intentionality, and mutual respect.",
        "Every Architect contributes to preserving an experience where people feel safe, encouraged, challenged, and inspired to intentionally create lives of fullness, purpose, and possibility.",
      ],
    },
  ],
};

export const membershipAgreementV1: LegalV1Candidate = {
  id: "membership-agreement",
  title: "Membership Agreement",
  version: LEGAL_V1_VERSION,
  effectiveDate: LEGAL_V1_EFFECTIVE_DATE,
  status: "APPROVED",
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  baseSource:
    "The Foundry/August 2026/The Back Half_8.3.2026.docx — The Back Half Membership Agreement. Founder: “All others approved.” Section 4 “from time to time” is now professionalized by Founder decision without changing contractual meaning.",
  mailboxes: [],
  contactInformation: "None in this instrument. Support inquiries: support@thebackhalf.org.",
  ageProvision:
    "§3 Eligibility: Membership is available only to individuals who are 18 years of age or older, and who satisfy the remaining membership requirements.",
  noRefundProvision: `§7 Founding Architect Bundle and §11 Suspension or Termination: ${NO_REFUND_OPERATIVE_LANGUAGE} Termination for policy violations does not entitle the member to a refund.`,
  communityProvision:
    "§7: Architect Community launches October 25, 2026, and is not live on August 31, 2026. The Founding Architect Community benefit is the first six (6) months of Architect Community access, commencing October 25, 2026, and concluding April 25, 2027.",
  mailboxCorrections: "PASS",
  ageConsistency: "PASS",
  noRefundConsistency: "PASS",
  approvedBasePreserved: "PASS",
  candidateCreated: "PASS",
  founderFinalApprovalRequired: false,
  changesFromBase: [
    { category: "version", detail: "Added Version 1.0." },
    {
      category: "effective-date",
      detail: "Replaced August 19, 2026 with August 31, 2026.",
    },
    {
      category: "mailbox",
      detail:
        "No contact mailbox in the approved Membership Agreement body. billing@ was not published. Support contact, where a mailbox is required, is support@thebackhalf.org.",
    },
    {
      category: "founder-decision",
      detail: `§4: replaced “from time to time” with professional language. PREVIOUS: “${MEMBERSHIP_SECTION_4_PREVIOUS}” UPDATED: “${MEMBERSHIP_SECTION_4_UPDATED}” Underlying contractual meaning unchanged.`,
    },
    {
      category: "founder-decision",
      detail:
        "§3: added the operative 18+ eligibility standard. Did not add date-of-birth collection, parental consent, or a COPPA program.",
    },
    {
      category: "founder-decision",
      detail:
        "§7: preserved the approved first six months of Architect Community access; stated the October 25, 2026 Community launch; calculated the six-month period as October 25, 2026 through April 25, 2027; stated that Community is not live on August 31, 2026. Did not use first year / twelve months.",
    },
    {
      category: "founder-decision",
      detail:
        "Removed the dead “official Refund Policy” reference. Incorporated the Founder-approved no-refund terms directly into §7.",
    },
  ],
  sections: [
    {
      heading: "1. Membership Agreement",
      paragraphs: [
        'This Membership Agreement ("Agreement") governs participation in the Architect Community offered by The Back Half ("Company," "we," "our," or "us").',
        "By purchasing, activating, or participating in the Architect Community, you acknowledge that you have read, understood, and agree to be bound by this Agreement.",
      ],
    },
    {
      heading: "2. Purpose of Membership",
      paragraphs: [
        "The Architect Community exists to provide an ongoing environment for learning, encouragement, accountability, and intentional personal growth following completion of The Back Half Blueprint.",
        "Membership is a privilege extended to Architects and is intended to preserve a respectful, professional, and transformational community experience.",
      ],
    },
    {
      heading: "3. Eligibility",
      paragraphs: [
        "Membership is available only to individuals who:",
        "Are 18 years of age or older;",
        "Have completed eligibility requirements established by The Back Half;",
        "Maintain an active Community membership, when applicable; and",
        "Continue to comply with all Community Standards and governing agreements.",
        "The Back Half reserves the right to determine membership eligibility at its sole discretion.",
      ],
    },
    {
      heading: "4. Membership Types",
      paragraphs: [
        MEMBERSHIP_SECTION_4_UPDATED,
        "Founding Architect Membership",
        "Standard Monthly Membership",
        "Promotional or invitation-only membership offerings approved by The Back Half",
        "Membership offerings, pricing, and benefits may vary over time.",
      ],
    },
    {
      heading: "5. Membership Fees",
      paragraphs: [
        "Membership fees are published on the official The Back Half website.",
        "Except where expressly stated, all membership fees are billed in advance and are non-transferable.",
        "Recurring memberships automatically renew until canceled by the member.",
      ],
    },
    {
      heading: "6. Cancellation",
      paragraphs: [
        "Members enrolled in a recurring monthly Community membership may cancel future renewals at any time through their account or by contacting The Back Half.",
        "Cancellation prevents future billing only.",
        "Membership benefits continue through the end of the current billing period.",
      ],
    },
    {
      heading: "7. Founding Architect Bundle",
      paragraphs: [
        "The Founding Architect Bundle includes the first six (6) months of Architect Community access as part of a single bundled purchase.",
        "The Architect Community launches on October 25, 2026, and is not live on The Back Half company launch date of August 31, 2026. The six-month Founding Architect Community benefit commences on October 25, 2026, and concludes on April 25, 2027.",
        "The Community portion of the Founding Architect Bundle:",
        "Cannot be canceled separately;",
        "Cannot be exchanged;",
        "Cannot be transferred; and",
        "Is not eligible for refund.",
        NO_REFUND_OPERATIVE_LANGUAGE,
      ],
    },
    {
      heading: "8. Community Standards",
      paragraphs: [
        "Members agree to conduct themselves in a manner consistent with the values of The Back Half.",
        "Prohibited conduct includes, but is not limited to:",
        "Harassment or intimidation;",
        "Discrimination;",
        "Hate speech;",
        "Abusive or threatening behavior;",
        "Spam or solicitation;",
        "Unauthorized promotion of products or services;",
        "Sharing another member's confidential information without permission; and",
        "Any conduct that materially disrupts the Community experience.",
      ],
    },
    {
      heading: "9. Intellectual Property",
      paragraphs: [
        "All Community content, discussions, videos, materials, recordings, presentations, resources, AI experiences, and related intellectual property remain the exclusive property of The Back Half unless otherwise stated.",
        "No Community content may be copied, reproduced, distributed, published, recorded, or used for commercial purposes without prior written authorization.",
      ],
    },
    {
      heading: "10. Privacy and Confidentiality",
      paragraphs: [
        "Members are expected to respect the privacy of fellow Architects.",
        "Personal stories, discussions, reflections, and shared experiences within the Community should be treated as confidential unless the originating member expressly authorizes disclosure.",
      ],
    },
    {
      heading: "11. Suspension or Termination",
      paragraphs: [
        "The Back Half reserves the right to suspend or terminate Community access, with or without notice, for conduct that violates this Agreement, the Participant Agreement, applicable law, or the integrity of the Community.",
        "Termination for policy violations does not entitle the member to a refund.",
      ],
    },
    {
      heading: "12. Limitation of Liability",
      paragraphs: [
        "To the fullest extent permitted by applicable law, The Back Half shall not be liable for any indirect, incidental, consequential, special, exemplary, or punitive damages arising out of or relating to Community participation.",
      ],
    },
    {
      heading: "13. Modifications",
      paragraphs: [
        "The Back Half reserves the right to amend, modify, or update this Membership Agreement at its discretion.",
        "Any revisions shall become effective upon publication of the updated Agreement on the official The Back Half website, unless otherwise required by applicable law.",
      ],
    },
    {
      heading: "14. Governing Law",
      paragraphs: [
        "This Agreement shall be governed by and construed in accordance with the laws of the State of Georgia, without regard to its conflict of law principles.",
      ],
    },
    {
      heading: "15. Acceptance",
      paragraphs: [
        "By enrolling in or participating in the Architect Community, you acknowledge that you have read, understood, and agree to be legally bound by this Membership Agreement.",
      ],
    },
    {
      heading: "Guiding Principle",
      paragraphs: [
        "The Architect Community is founded upon trust, integrity, intentionality, and mutual respect. Every member shares responsibility for preserving an environment that reflects the standards and values of The Back Half and supports the continued growth of every Architect.",
      ],
    },
  ],
};

export const aiDisclosureV1: LegalV1Candidate = {
  id: "ai-disclosure",
  title: "AI Disclosure",
  version: LEGAL_V1_VERSION,
  effectiveDate: LEGAL_V1_EFFECTIVE_DATE,
  status: "APPROVED",
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  baseSource:
    "The Foundry/August 2026/The Back Half_8.3.2026.docx — AI Disclosure, including the Founder-directed Section 10 replacement in the same session.",
  mailboxes: ["kimberly@thebackhalf.org"],
  contactInformation: "kimberly@thebackhalf.org",
  ageProvision:
    "Not addressed in this instrument. Participant eligibility is governed by the Terms of Use and Participant Agreement: 18 years of age or older.",
  noRefundProvision:
    "Not addressed in this instrument. Purchases are governed by the no-refund terms in the Terms of Use, Participant Agreement, and Membership Agreement.",
  communityProvision:
    "Not a Community-timing instrument. AI experiences do not represent Architect Community as live on August 31, 2026.",
  mailboxCorrections: "PASS",
  ageConsistency: "PASS",
  noRefundConsistency: "N/A",
  approvedBasePreserved: "PASS",
  candidateCreated: "PASS",
  founderFinalApprovalRequired: false,
  changesFromBase: [
    { category: "version", detail: "Added Version 1.0." },
    {
      category: "effective-date",
      detail: "Replaced August 19, 2026 with August 31, 2026.",
    },
    {
      category: "mailbox",
      detail:
        "Contact: legal@thebackhalf.org → kimberly@thebackhalf.org (8.4 Founder-approved Version 1 email strategy: legal notices → kimberly@).",
    },
    {
      category: "same-session-approved-replacement",
      detail:
        'Replaced Section 10 "Future AI Enhancements" / "from time to time" with the Founder-directed "10. Future AI Capabilities" replacement from the same 8.3 session.',
    },
  ],
  sections: [
    {
      heading: "1. Purpose",
      paragraphs: [
        'The Back Half incorporates artificial intelligence ("AI") technologies to enhance the educational experience, improve accessibility, and provide personalized guidance throughout the Journey.',
        "This AI Disclosure explains how AI is used within The Back Half and establishes important limitations regarding its use.",
      ],
    },
    {
      heading: "2. AI Experiences",
      paragraphs: [
        "The Back Half currently utilizes the following AI experiences:",
        "Lumina — The Back Half's AI Guide",
        "AI Kimberly — A digital representation of Kimberly M. Walker created from approved knowledge, voice, and content",
        "Both experiences are designed exclusively to support The Back Half educational platform.",
      ],
    },
    {
      heading: "3. Educational Purpose",
      paragraphs: [
        "AI experiences are intended solely to:",
        "Explain approved Back Half concepts;",
        "Encourage thoughtful reflection;",
        "Guide Architects through the Blueprint;",
        "Answer questions regarding approved Back Half content;",
        "Support the learning experience; and",
        "Enhance accessibility and participant engagement.",
        "AI is not intended to replace personal judgment or professional advice.",
      ],
    },
    {
      heading: "4. No Professional Advice",
      paragraphs: [
        "Neither Lumina nor AI Kimberly provides:",
        "Medical advice",
        "Mental health treatment or counseling",
        "Psychological services",
        "Legal advice",
        "Financial or investment advice",
        "Tax advice",
        "Emergency assistance",
        "Participants should consult appropriately qualified professionals regarding such matters.",
      ],
    },
    {
      heading: "5. AI Limitations",
      paragraphs: [
        "Although The Back Half endeavors to maintain accurate and reliable AI experiences, artificial intelligence may occasionally generate incomplete, inaccurate, outdated, or unintended responses.",
        "Participants should exercise independent judgment and should not rely exclusively upon AI-generated content when making significant personal, legal, financial, medical, or other important decisions.",
      ],
    },
    {
      heading: "6. Founder Representation",
      paragraphs: [
        "AI Kimberly is an authorized digital representation of Kimberly M. Walker created for educational purposes.",
        "While AI Kimberly reflects Kimberly's approved teachings, philosophy, voice, and knowledge, participants acknowledge that AI Kimberly is an artificial intelligence experience and not a live interaction with Kimberly M. Walker.",
      ],
    },
    {
      heading: "7. AI Learning and Improvement",
      paragraphs: [
        "The Back Half may review AI interactions for purposes including:",
        "Improving response quality;",
        "Enhancing participant experience;",
        "Increasing accuracy and consistency;",
        "Identifying technical issues;",
        "Strengthening platform security; and",
        "Improving future AI performance.",
        "Such activities are conducted in accordance with the Privacy Policy.",
      ],
    },
    {
      heading: "8. Participant Responsibilities",
      paragraphs: [
        "Participants agree to use AI experiences responsibly and shall not:",
        "Attempt to manipulate or circumvent platform safeguards;",
        "Submit unlawful, abusive, or harmful content;",
        "Use AI to violate applicable law;",
        "Misrepresent AI-generated content as official guidance outside The Back Half; or",
        "Attempt to extract confidential or proprietary system information.",
      ],
    },
    {
      heading: "9. Intellectual Property",
      paragraphs: [
        "Lumina, AI Kimberly, AI prompts, AI personalities, AI system instructions, AI training materials, AI conversations, and all related technologies constitute proprietary intellectual property of The Back Half and are protected by applicable intellectual property laws.",
        "Unauthorized copying, reproduction, reverse engineering, extraction, redistribution, or commercial use is strictly prohibited.",
      ],
    },
    {
      heading: "10. Future AI Capabilities",
      paragraphs: [
        "The Back Half reserves the right to develop, implement, modify, expand, suspend, or discontinue artificial intelligence features, functionalities, or services at its sole discretion.",
        "Any additional AI capabilities introduced by The Back Half shall be governed by this AI Disclosure, together with all other applicable agreements, policies, and terms governing the Services.",
      ],
    },
    {
      heading: "11. Modifications",
      paragraphs: [
        "The Back Half reserves the right to amend, modify, or update this AI Disclosure at its discretion.",
        "Any revisions shall become effective upon publication of the updated AI Disclosure on the official The Back Half website, unless otherwise required by applicable law.",
      ],
    },
    {
      heading: "12. Contact Information",
      paragraphs: [
        "Questions regarding this AI Disclosure should be directed to:",
        "kimberly@thebackhalf.org",
      ],
    },
    {
      heading: "Governing Principle",
      paragraphs: [
        "Artificial intelligence is employed by The Back Half to extend the reach of the Founder, enrich the Architect experience, and support intentional personal growth. AI is designed to complement—never replace—human wisdom, personal responsibility, or the transformational relationship between the Architect and The Back Half.",
      ],
    },
  ],
};

export const legalV1LaunchCandidates: readonly LegalV1Candidate[] = [
  privacyPolicyV1,
  termsOfUseV1,
  participantAgreementV1,
  membershipAgreementV1,
  aiDisclosureV1,
];

export type ProposedConsentLabel = {
  id: string;
  moment: string;
  surface: "REGISTRATION / ACCOUNT" | "CHECKOUT";
  label: string;
  linkedDocument: string;
  documents: readonly string[];
  founderApprovalRequired: false;
  status: "APPROVED — ACTIVATED";
  activated: true;
};

export const proposedConsentLabels: readonly ProposedConsentLabel[] = [
  {
    id: "reg-terms",
    moment: "Registration / Account — Terms of Use",
    surface: "REGISTRATION / ACCOUNT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["terms-of-use"].sentence,
    linkedDocument: "Terms of Use",
    documents: ["Terms of Use"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "reg-privacy",
    moment: "Registration / Account — Privacy Policy",
    surface: "REGISTRATION / ACCOUNT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["privacy-policy"].sentence,
    linkedDocument: "Privacy Policy",
    documents: ["Privacy Policy"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "reg-participant",
    moment: "Registration / Account — Participant Agreement",
    surface: "REGISTRATION / ACCOUNT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["participant-agreement"].sentence,
    linkedDocument: "Participant Agreement",
    documents: ["Participant Agreement"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "reg-ai",
    moment: "Registration / Account — AI Disclosure",
    surface: "REGISTRATION / ACCOUNT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["ai-disclosure"].sentence,
    linkedDocument: "AI Disclosure",
    documents: ["AI Disclosure"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "checkout-terms",
    moment: "Checkout — Terms of Use",
    surface: "CHECKOUT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["terms-of-use"].sentence,
    linkedDocument: "Terms of Use",
    documents: ["Terms of Use"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "checkout-participant",
    moment: "Checkout — Participant Agreement",
    surface: "CHECKOUT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["participant-agreement"].sentence,
    linkedDocument: "Participant Agreement",
    documents: ["Participant Agreement"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
  {
    id: "checkout-membership",
    moment: "Checkout — Membership Agreement",
    surface: "CHECKOUT",
    label: CONSENT_LABELS_BY_DOCUMENT_ID["membership-agreement"].sentence,
    linkedDocument: "Membership Agreement",
    documents: ["Membership Agreement"],
    founderApprovalRequired: false,
    status: "APPROVED — ACTIVATED",
    activated: true,
  },
];

export const PROPOSED_BILLING_ACKNOWLEDGMENT_TEXT = BILLING_PURCHASE_ACKNOWLEDGMENT;

export const proposedBillingAcknowledgment = {
  status: "APPROVED — ACTIVATED" as const,
  founderApprovalRequired: false as const,
  activated: true as const,
  basedOn: [
    "Active checkout offers display material terms before this acknowledgment: Blueprint $1,500 one-time; Founding Architect $1,750 one-time including the first six months of Architect Community; Architect Community launches October 25, 2026; Founding Architect Community period October 25, 2026 through April 25, 2027; standalone Architect Community $50/month where applicable; NO REFUNDS.",
    "Founder-approved billing acknowledgment is the shorter sentence below. Material purchase terms remain visible on the checkout offer itself.",
  ],
  label: BILLING_PURCHASE_ACKNOWLEDGMENT,
};

export const refundPolicyImplementation = {
  standaloneInstrumentCreated: false,
  method:
    "Incorporated the Founder-approved no-refund terms directly into Terms of Use §7, Participant Agreement Payments, and Membership Agreement §7. Removed dead “Refund Policy” / “official Refund Policy” references, including from Terms of Use §17 Entire Agreement. No sixth Version 1 instrument was created.",
  operativeLanguage: NO_REFUND_OPERATIVE_LANGUAGE,
  obsoleteBillingMailbox: "billing@thebackhalf.org was not published. Support contact where applicable: support@thebackhalf.org.",
};

export const communityGuidelinesPrep = {
  classification: "PRE-COMMUNITY-LAUNCH REQUIREMENT" as const,
  requirement: "PRE-COMMUNITY-LAUNCH" as const,
  august31Blocker: false,
  deadline: "BEFORE OCTOBER 25, 2026",
  communityTarget: "October 25, 2026",
  status: "FOUNDATION IDENTIFIED — STANDALONE INSTRUMENT NOT ISOLATED",
  baseSource:
    "The Foundry/August 2026/The Back Half_8.4.2026.docx records Founder completion of Community Guidelines as a launch-readiness item and maps Community Guidelines contact to support@thebackhalf.org. A standalone titled Community Guidelines legal manuscript was not isolated as a complete instrument in that file.",
  mailboxIfPublished: "support@thebackhalf.org",
  relatedApprovedLegal:
    "Membership Agreement §8 Community Standards and Participant Agreement Community Standards (Version 1 candidates above).",
  sop4PrinciplesFrom84: [
    "Respect",
    "Encouragement",
    "Confidentiality",
    "Accountability",
    "Kindness",
    "Constructive dialogue",
  ],
  sop4Remove: [
    "Harassing",
    "Discriminatory",
    "Profane",
    "Promotional spam",
    "Unsafe",
    "Inconsistent with Community Guidelines",
  ],
  note: "Community Guidelines are not an August 31, 2026 launch blocker. They must be finalized and published before Architect Community launches on October 25, 2026. Do not use October 19. Do not invent the body in this package.",
};

export type LegalV1FounderDecisionStatus = {
  id: string;
  label: string;
  result: "PASS" | "FAIL" | "NO";
};

export const legalV1FounderDecisionsApplied: readonly LegalV1FounderDecisionStatus[] =
  [
    { id: "age-18", label: "18+ Only", result: "PASS" },
    {
      id: "privacy-heading",
      label: "Privacy Heading — Participant Age Eligibility",
      result: "PASS",
    },
    {
      id: "membership-s4",
      label: "Membership §4 Professionalized",
      result: "PASS",
    },
    {
      id: "community-oct-25",
      label: "Community Launch — October 25, 2026",
      result: "PASS",
    },
    {
      id: "fa-six-months",
      label: "Founding Architect Community Benefit — First Six Months",
      result: "PASS",
    },
    { id: "no-refunds", label: "No-Refund Policy", result: "PASS" },
    {
      id: "no-dob",
      label: "DOB Not Collected/Added",
      result: "PASS",
    },
    { id: "no-coppa", label: "COPPA Program Added", result: "NO" },
  ];

/** Settled. Do not reopen as Founder judgment items. */
export const legalV1JudgmentItems: readonly never[] = [];

export const legalV1Audit = {
  publicationStatus: LEGAL_V1_PUBLICATION_STATUS,
  obsoleteAugust19InCandidates: "NONE" as const,
  obsoleteLegalAtInCandidates: "NONE" as const,
  obsoleteBillingAtInCandidates: "NONE" as const,
  obsoleteOctober19InCandidates: "NONE" as const,
  incorrectFirstYearCommunityInActiveLegalAndCheckout: "NONE" as const,
  incorrectTwelveMonthCommunityInActiveLegalAndCheckout: "NONE" as const,
  deadRefundPolicyReferencesInCandidates: "NONE" as const,
  trademarkRegistrationSymbolInCandidates: "NONE",
  spanishLegalManuscripts: "PENDING APPROVED TRANSLATION",
  publishedToWebsite: true,
  catalogReplaced: true,
  consentLabelsActivated: true,
  billingAcknowledgmentActivated: true,
  row32MarkedComplete: true,
  rows25to30RemarkedComplete: false,
  launchRoadmapAltered: false,
  founderNotesAltered: false,
};

export function candidateFullText(candidate: LegalV1Candidate): string {
  const blocks = [
    candidate.title,
    `Version ${candidate.version}`,
    `Effective Date: ${candidate.effectiveDate}`,
    `Status: ${candidate.status}`,
    "",
  ];
  for (const section of candidate.sections) {
    if (section.heading) blocks.push(section.heading, "");
    for (const paragraph of section.paragraphs) {
      blocks.push(paragraph, "");
    }
  }
  return blocks.join("\n").trim();
}
