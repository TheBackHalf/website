import {
  AppShellPage,
  AppShellPageHeader,
} from "@/components/app-shell/app-shell-page";
import { LuminaConversationPanel } from "@/components/lumina/chat/lumina-conversation-panel";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type LuminaEntryShellProps = {
  locale: Locale;
  /** Safe topic query from results CTA — e.g. aliveness. */
  topic?: string | null;
};

/** Lumina authenticated entry — Row 75 conversation interface (+ Row 84–86 topics). */
export function LuminaEntryShell({ locale, topic }: LuminaEntryShellProps) {
  const lumina = getDictionary(locale).appShell.lumina;
  const safeTopic =
    topic === "aliveness" ||
    topic === "awakening" ||
    topic === "mirror" ||
    topic === "decision" ||
    topic === "standards" ||
    topic === "architect" ||
    topic === "expansion" ||
    topic === "beginning" ||
    topic === "threshold"
      ? topic
      : null;

  return (
    <AppShellPage locale={locale} className="bh-app-page-lumina">
      <AppShellPageHeader
        title={resolveAppShellLabel(locale, lumina.title)}
        description={resolveAppShellLabel(locale, lumina.description)}
      />
      <LuminaConversationPanel locale={locale} topic={safeTopic} />
    </AppShellPage>
  );
}
