import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { FounderConversationPanel } from "@/components/ai-kimberly/founder-conversation-panel";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type AiKimberlyEntryShellProps = {
  locale: Locale;
};

/** Authenticated Architect Founder Conversation — not a public chat. */
export function AiKimberlyEntryShell({ locale }: AiKimberlyEntryShellProps) {
  const copy = getDictionary(locale).appShell.aiKimberly;

  return (
    <AppShellPage locale={locale} className="bh-app-page-lumina">
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, copy.title)}
        description={resolveAppShellLabel(locale, copy.description)}
      />
      <FounderConversationPanel locale={locale} />
    </AppShellPage>
  );
}
