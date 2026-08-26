import { resolveLuminaLocale } from "@/lib/lumina/language/resolve-locale";
import { detectLuminaTurnLocaleOverride } from "@/lib/lumina/language/turn-override";
import type { Locale } from "@/lib/i18n/config";

export { detectLuminaTurnLocaleOverride as detectFounderTurnLocaleOverride };

/**
 * Server-authoritative Founder Conversation locale.
 * Same priority as Lumina: turnOverride → routeLocale → profileLocale → default.
 * Never infers language from name, ethnicity, geography, or stereotypes.
 */
export function resolveFounderConversationLocale(input: {
  routeLocale?: unknown;
  profileLocale?: unknown;
  turnOverride?: unknown;
}): Locale {
  return resolveLuminaLocale(input);
}
