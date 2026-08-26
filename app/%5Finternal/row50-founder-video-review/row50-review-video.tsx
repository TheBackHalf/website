"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n/config";

type Row50ReviewVideoProps = {
  id: string;
  locale: Locale;
  src: string;
  captionsSrc: string | null;
};

export function Row50ReviewVideo({
  id,
  locale,
  src,
  captionsSrc,
}: Row50ReviewVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captionsLabel = locale === "es" ? "Subtítulos" : "Captions";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const preferApprovedCaptions = () => {
      for (const textTrack of Array.from(video.textTracks)) {
        const isApproved =
          Boolean(captionsSrc) &&
          textTrack.language === locale &&
          textTrack.label === captionsLabel;
        textTrack.mode = isApproved ? "showing" : "disabled";
      }
    };
    video.addEventListener("loadedmetadata", preferApprovedCaptions);
    preferApprovedCaptions();
    return () => {
      video.removeEventListener("loadedmetadata", preferApprovedCaptions);
    };
  }, [src, captionsSrc, locale, captionsLabel]);

  return (
    <video
      ref={videoRef}
      className="bh-founder-media-video"
      controls
      playsInline
      preload="metadata"
      data-bh-row50-review-video={id}
      data-bh-row50-locale={locale}
    >
      <source src={src} type="video/mp4" />
      {captionsSrc ? (
        <track
          kind="captions"
          src={captionsSrc}
          srcLang={locale}
          label={captionsLabel}
          default
        />
      ) : null}
    </video>
  );
}
