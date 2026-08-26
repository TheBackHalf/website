/** Shared public launch navigation. Dead `#` destinations are not allowed. */
export const navLinks = [
  { href: "/#manifesto", key: "manifesto" as const, label: "Manifesto" },
  { href: "/contact", key: "contact" as const, label: "Contact" },
] as const;

export type NavLinkKey = (typeof navLinks)[number]["key"];
