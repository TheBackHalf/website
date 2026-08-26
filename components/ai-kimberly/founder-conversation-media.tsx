"use client";

import { resolveFounderConversationMedia } from "@/lib/ai-kimberly/media";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type FounderConversationMediaProps = {
  locale: Locale;
};

/**
 * Locale-bound spoken/avatar media for Founder Conversation.
 * Español never receives the English source. Missing Spanish assets stay unavailable.
 */
export function FounderConversationMedia({
  locale,
}: FounderConversationMediaProps) {
  const copy = getDictionary(locale).appShell.aiKimberly;
  const media = resolveFounderConversationMedia(locale);

  if (media.assetStatus === "missing" || !media.src) {
    return (
      <p className="bh-ai-kimberly-media-unavailable" role="status">
        {resolveAppShellLabel(locale, copy.mediaUnavailable)}
      </p>
    );
  }

  return (
    <figure className="bh-ai-kimberly-media">
      <video
        className="bh-ai-kimberly-media-video"
        controls
        playsInline
        preload="metadata"
        src={media.src}
        lang={locale}
        data-bh-founder-conversation-locale={locale}
        data-bh-founder-conversation-src={media.src}
      >
        {media.captionsSrc ? (
          <track
            kind="captions"
            src={media.captionsSrc}
            srcLang={locale}
            label={copy.mediaCaptions}
          />
        ) : null}
      </video>
      <figcaption className="sr-only">{copy.mediaCaption}</figcaption>
    </figure>
  );
}
