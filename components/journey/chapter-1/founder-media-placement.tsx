"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ResolvedChapter1MediaPlacement } from "@/content/journey/chapter-1-media";
import type { ResolvedChapter2MediaPlacement } from "@/content/journey/chapter-2-media";
import type { ResolvedChapter3MediaPlacement } from "@/content/journey/chapter-3-media";
import type { ResolvedChapter4MediaPlacement } from "@/content/journey/chapter-4-media";
import type { ResolvedChapter5MediaPlacement } from "@/content/journey/chapter-5-media";
import type { ResolvedChapter6MediaPlacement } from "@/content/journey/chapter-6-media";
import type { ResolvedChapter7MediaPlacement } from "@/content/journey/chapter-7-media";
import type { ResolvedOnboardingWelcomeMediaPlacement } from "@/content/journey/onboarding-welcome-media";
import {
  getDictionary,
  resolveAppShellLabel,
} from "@/content/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

type FounderMediaPlacementProps = {
  locale: Locale;
  /** Locale-resolved placement (English or Spanish sources already selected). */
  placement:
    | ResolvedChapter1MediaPlacement
    | ResolvedChapter2MediaPlacement
    | ResolvedChapter3MediaPlacement
    | ResolvedChapter4MediaPlacement
    | ResolvedChapter5MediaPlacement
    | ResolvedChapter6MediaPlacement
    | ResolvedChapter7MediaPlacement
    | ResolvedOnboardingWelcomeMediaPlacement;
};

const VIDEO_2_PLACEMENT_ID = "video-2";
const VIDEO_4_PLACEMENT_ID = "video-4";
const WELCOME_PLACEMENT_ID = "welcome-video";
const VIDEO_2_INSTANCE_ATTR = "data-bh-founder-video2-instance";
const VIDEO_4_INSTANCE_ATTR = "data-bh-founder-video4-instance";
const WELCOME_INSTANCE_ATTR = "data-bh-founder-welcome-instance";
const VIDEO_2_SRC_SUFFIX = "/videos/chapter-1/chapter-1-the-awakening.mp4";
const VIDEO_4_SRC_SUFFIX = "/videos/chapter-2/chapter-2-the-mirror.mp4";
const WELCOME_SRC_SUFFIX = "/videos/onboarding/founding-architect-welcome.mp4";

function ensureVideoSource(video: HTMLVideoElement, src: string) {
  if (video.getAttribute("src") !== src) {
    video.src = src;
  }
}

function ensureCaptionTrack(
  video: HTMLVideoElement,
  captionsSrc: string | null,
  locale: Locale,
  label: string,
) {
  video.querySelectorAll("track[data-bh-founder-captions]").forEach((node) => {
    node.remove();
  });
  for (const textTrack of Array.from(video.textTracks)) {
    textTrack.mode = "disabled";
  }
  if (!captionsSrc) {
    return;
  }
  const track = document.createElement("track");
  track.kind = "captions";
  track.src = captionsSrc;
  track.srclang = locale;
  track.label = label;
  track.setAttribute("data-bh-founder-captions", "1");
  video.appendChild(track);
  video.dataset.bhCaptionLocale = locale;
  video.dataset.bhCaptionLabel = label;
  const applyPreferredTrack = () => {
    const approvedLocale = video.dataset.bhCaptionLocale ?? "";
    const approvedLabel = video.dataset.bhCaptionLabel ?? "";
    for (const textTrack of Array.from(video.textTracks)) {
      const isApproved =
        textTrack.language === approvedLocale &&
        textTrack.label === approvedLabel;
      textTrack.mode = isApproved ? "hidden" : "disabled";
    }
  };
  if (video.dataset.bhCaptionListener !== "1") {
    video.addEventListener("loadedmetadata", applyPreferredTrack);
    video.dataset.bhCaptionListener = "1";
  }
  applyPreferredTrack();
}

/**
 * True singleton: one HTMLVideoElement for Founder Video 2 for the whole app.
 * Prevents React remounts from creating a second audible player.
 */
let video2Element: HTMLVideoElement | null = null;
let video2ListenersAttached = false;
let video2PhraseEndApplied = false;
let video2RafId: number | null = null;
let video2OwnerHost: HTMLElement | null = null;
/** Absolute seconds — end of spoken "Let's begin" (not duration-minus-X). */
let video2PhraseEndSeconds: number | null = null;

/**
 * True singleton: one HTMLVideoElement for Founder Video 4 (Chapter II).
 * Optional playbackEndSeconds: stop within file, or hold last frame past EOF.
 * Never uses Chapter I's phrase endpoint.
 */
let video4Element: HTMLVideoElement | null = null;
let video4ListenersAttached = false;
let video4OwnerHost: HTMLElement | null = null;
let video4PlaybackEndSeconds: number | null = null;
let video4HoldTimerId: ReturnType<typeof setTimeout> | null = null;
let video4EndApplied = false;

/**
 * True singleton: Row 83 Founder Welcome — full source duration, no custom endpoint.
 */
let welcomeElement: HTMLVideoElement | null = null;
let welcomeListenersAttached = false;
let welcomeOwnerHost: HTMLElement | null = null;

function stopVideo2Raf() {
  if (video2RafId != null) {
    cancelAnimationFrame(video2RafId);
    video2RafId = null;
  }
}

function hardStopMedia(media: HTMLMediaElement) {
  try {
    media.pause();
  } catch {
    // ignore
  }
  try {
    if (Number.isFinite(media.currentTime) && media.currentTime !== 0) {
      media.currentTime = 0;
    }
  } catch {
    // ignore
  }
}

function retireForeignMedia(media: HTMLMediaElement) {
  hardStopMedia(media);
  try {
    media.removeAttribute("src");
    while (media.firstChild) {
      media.removeChild(media.firstChild);
    }
    media.load();
  } catch {
    // ignore
  }
}

function isAwakeningSource(media: HTMLMediaElement): boolean {
  const srcAttr = media.getAttribute("src") ?? "";
  const currentSrc = media.currentSrc || media.src || "";
  return (
    srcAttr.includes(VIDEO_2_SRC_SUFFIX) ||
    currentSrc.includes(VIDEO_2_SRC_SUFFIX) ||
    media.hasAttribute(VIDEO_2_INSTANCE_ATTR)
  );
}

function isMirrorSource(media: HTMLMediaElement): boolean {
  const srcAttr = media.getAttribute("src") ?? "";
  const currentSrc = media.currentSrc || media.src || "";
  return (
    srcAttr.includes(VIDEO_4_SRC_SUFFIX) ||
    currentSrc.includes(VIDEO_4_SRC_SUFFIX) ||
    media.hasAttribute(VIDEO_4_INSTANCE_ATTR)
  );
}

function isWelcomeSource(media: HTMLMediaElement): boolean {
  const srcAttr = media.getAttribute("src") ?? "";
  const currentSrc = media.currentSrc || media.src || "";
  return (
    srcAttr.includes(WELCOME_SRC_SUFFIX) ||
    currentSrc.includes(WELCOME_SRC_SUFFIX) ||
    media.hasAttribute(WELCOME_INSTANCE_ATTR)
  );
}

function silenceAllExcept(owner: HTMLMediaElement) {
  document.querySelectorAll("video, audio").forEach((node) => {
    if (!(node instanceof HTMLMediaElement) || node === owner) {
      return;
    }
    const isManagedDuplicate =
      isAwakeningSource(node) ||
      isMirrorSource(node) ||
      isWelcomeSource(node);
    if (!node.paused || isManagedDuplicate) {
      if (isManagedDuplicate) {
        retireForeignMedia(node);
      } else if (!node.paused) {
        node.pause();
      }
    }
  });
}

function applyVideo2PhraseEnd(video: HTMLVideoElement) {
  const endAt = video2PhraseEndSeconds;
  if (endAt == null || !Number.isFinite(endAt) || endAt <= 0) {
    return;
  }

  if (video.currentTime < endAt - 0.05) {
    video2PhraseEndApplied = false;
    video.dataset.bhPlaybackComplete = "false";
    return;
  }

  if (video.currentTime < endAt) {
    return;
  }

  video2PhraseEndApplied = true;
  stopVideo2Raf();
  if (!video.paused) {
    video.pause();
  }
  if (Math.abs(video.currentTime - endAt) > 0.01) {
    try {
      video.currentTime = endAt;
    } catch {
      // ignore
    }
  }
  video.dataset.bhPlaybackEnd = String(endAt);
  video.dataset.bhPlaybackComplete = "true";
}

function startVideo2Raf(video: HTMLVideoElement) {
  stopVideo2Raf();
  const tick = () => {
    applyVideo2PhraseEnd(video);
    if (!video.paused && !video2PhraseEndApplied) {
      video2RafId = requestAnimationFrame(tick);
    } else {
      video2RafId = null;
    }
  };
  video2RafId = requestAnimationFrame(tick);
}

function ensureVideo2Listeners(video: HTMLVideoElement) {
  if (video2ListenersAttached) {
    return;
  }
  video2ListenersAttached = true;

  video.addEventListener("play", () => {
    silenceAllExcept(video);
    applyVideo2PhraseEnd(video);
    if (!video.paused) {
      startVideo2Raf(video);
    }
  });

  video.addEventListener("pause", () => {
    stopVideo2Raf();
  });

  video.addEventListener("timeupdate", () => {
    applyVideo2PhraseEnd(video);
  });

  video.addEventListener("seeking", () => {
    const endAt = video2PhraseEndSeconds;
    if (endAt == null) {
      return;
    }
    if (video.currentTime > endAt) {
      video.currentTime = endAt;
    }
  });

  video.addEventListener("seeked", () => {
    applyVideo2PhraseEnd(video);
  });

  video.addEventListener("ended", () => {
    applyVideo2PhraseEnd(video);
    stopVideo2Raf();
  });

  video.addEventListener("loadedmetadata", () => {
    video.dataset.bhDuration = String(video.duration);
    if (video2PhraseEndSeconds != null) {
      video.dataset.bhPlaybackEnd = String(video2PhraseEndSeconds);
    }
    video2PhraseEndApplied = false;
  });
}

function ensureVideo4Listeners(video: HTMLVideoElement) {
  if (video4ListenersAttached) {
    return;
  }
  video4ListenersAttached = true;

  video.addEventListener("play", () => {
    silenceAllExcept(video);
    clearVideo4HoldTimer();
    video4EndApplied = false;
    video.dataset.bhPlaybackComplete = "false";
    // If a within-file endpoint exists below duration, watch for it.
    startVideo4EndpointWatch(video);
  });

  video.addEventListener("pause", () => {
    // User pause: cancel post-end hold; keep silence.
    if (!video4EndApplied) {
      clearVideo4HoldTimer();
    }
  });

  video.addEventListener("seeked", () => {
    const endAt = video4PlaybackEndSeconds;
    if (endAt == null || !Number.isFinite(video.duration)) {
      return;
    }
    if (video.currentTime < Math.min(endAt, video.duration) - 0.05) {
      video4EndApplied = false;
      video.dataset.bhPlaybackComplete = "false";
      clearVideo4HoldTimer();
    }
  });

  video.addEventListener("loadedmetadata", () => {
    video.dataset.bhDuration = String(video.duration);
    if (video4PlaybackEndSeconds != null) {
      video.dataset.bhPlaybackEnd = String(video4PlaybackEndSeconds);
    }
    video4EndApplied = false;
    video.dataset.bhPlaybackComplete = "false";
  });

  video.addEventListener("ended", () => {
    applyVideo4NaturalEnded(video);
  });

  video.addEventListener("timeupdate", () => {
    applyVideo4WithinFileEndpoint(video);
  });
}

function clearVideo4HoldTimer() {
  if (video4HoldTimerId != null) {
    clearTimeout(video4HoldTimerId);
    video4HoldTimerId = null;
  }
}

function markVideo4Complete(video: HTMLVideoElement) {
  video4EndApplied = true;
  clearVideo4HoldTimer();
  video.dataset.bhPlaybackComplete = "true";
  if (video4PlaybackEndSeconds != null) {
    video.dataset.bhPlaybackEnd = String(video4PlaybackEndSeconds);
  }
}

/** Stop early only when approved endpoint is inside the file. */
function applyVideo4WithinFileEndpoint(video: HTMLVideoElement) {
  const endAt = video4PlaybackEndSeconds;
  if (endAt == null || !Number.isFinite(endAt) || !Number.isFinite(video.duration)) {
    return;
  }
  if (endAt >= video.duration - 0.01) {
    // Endpoint at/after EOF — handled on `ended` via hold.
    return;
  }
  if (video.currentTime < endAt) {
    return;
  }
  if (!video.paused) {
    video.pause();
  }
  if (Math.abs(video.currentTime - endAt) > 0.01) {
    try {
      video.currentTime = endAt;
    } catch {
      // ignore
    }
  }
  markVideo4Complete(video);
}

function applyVideo4NaturalEnded(video: HTMLVideoElement) {
  const endAt = video4PlaybackEndSeconds;
  if (endAt == null || !Number.isFinite(endAt) || !Number.isFinite(video.duration)) {
    markVideo4Complete(video);
    return;
  }

  const holdSeconds = Math.max(0, endAt - video.duration);
  if (holdSeconds <= 0.01) {
    markVideo4Complete(video);
    return;
  }

  // Hold last frame for the remaining endpoint tail (audio already finished).
  video.dataset.bhPlaybackComplete = "false";
  clearVideo4HoldTimer();
  video4HoldTimerId = setTimeout(() => {
    video4HoldTimerId = null;
    markVideo4Complete(video);
  }, holdSeconds * 1000);
}

function startVideo4EndpointWatch(video: HTMLVideoElement) {
  applyVideo4WithinFileEndpoint(video);
}

function getOrCreateVideo2Element(src: string, label: string): HTMLVideoElement {
  if (!video2Element) {
    const video = document.createElement("video");
    video.className = "bh-founder-media-video";
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.setAttribute(VIDEO_2_INSTANCE_ATTR, "1");
    video.setAttribute("data-bh-media-src", src);
    video.setAttribute("aria-label", label);
    video2Element = video;
    ensureVideo2Listeners(video);
  }

  const video = video2Element;
  video.muted = false;
  video.defaultMuted = false;
  if (video.volume <= 0) {
    video.volume = 1;
  }
  video.setAttribute("aria-label", label);
  video.setAttribute("data-bh-media-src", src);
  ensureVideoSource(video, src);
  return video;
}

function getOrCreateVideo4Element(src: string, label: string): HTMLVideoElement {
  if (!video4Element) {
    const video = document.createElement("video");
    video.className = "bh-founder-media-video";
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.autoplay = false;
    video.setAttribute(VIDEO_4_INSTANCE_ATTR, "1");
    video.setAttribute("data-bh-media-src", src);
    video.setAttribute("aria-label", label);
    video4Element = video;
    ensureVideo4Listeners(video);
  }

  const video = video4Element;
  video.muted = false;
  video.defaultMuted = false;
  video.autoplay = false;
  if (video.volume <= 0) {
    video.volume = 1;
  }
  video.setAttribute("aria-label", label);
  video.setAttribute("data-bh-media-src", src);
  ensureVideoSource(video, src);
  return video;
}

function mountVideo2IntoHost(
  host: HTMLElement,
  src: string,
  label: string,
  phraseEndSeconds: number | null,
  captionsSrc: string | null,
  locale: Locale,
  captionsLabel: string,
): HTMLVideoElement {
  detachOtherFounderSingletons("video2");
  video2PhraseEndSeconds =
    typeof phraseEndSeconds === "number" && Number.isFinite(phraseEndSeconds)
      ? phraseEndSeconds
      : null;
  const video = getOrCreateVideo2Element(src, label);
  silenceAllExcept(video);
  if (video2PhraseEndSeconds != null) {
    video.dataset.bhPlaybackEnd = String(video2PhraseEndSeconds);
    video.dataset.bhPhraseEnd = "lets-begin";
  } else {
    delete video.dataset.bhPlaybackEnd;
    delete video.dataset.bhPhraseEnd;
  }

  if (
    video2OwnerHost &&
    video2OwnerHost !== host &&
    video.parentElement === video2OwnerHost
  ) {
    hardStopMedia(video);
    video2OwnerHost.removeChild(video);
  }

  if (video.parentElement !== host) {
    hardStopMedia(video);
    host.replaceChildren(video);
  }

  ensureCaptionTrack(video, captionsSrc, locale, captionsLabel);
  video2OwnerHost = host;
  return video;
}

function mountVideo4IntoHost(
  host: HTMLElement,
  src: string,
  label: string,
  playbackEndSeconds: number | null,
  captionsSrc: string | null,
  locale: Locale,
  captionsLabel: string,
): HTMLVideoElement {
  detachOtherFounderSingletons("video4");

  video4PlaybackEndSeconds =
    typeof playbackEndSeconds === "number" && Number.isFinite(playbackEndSeconds)
      ? playbackEndSeconds
      : null;
  clearVideo4HoldTimer();
  video4EndApplied = false;

  const video = getOrCreateVideo4Element(src, label);
  silenceAllExcept(video);
  delete video.dataset.bhPhraseEnd;
  if (video4PlaybackEndSeconds != null) {
    video.dataset.bhPlaybackEnd = String(video4PlaybackEndSeconds);
  } else {
    delete video.dataset.bhPlaybackEnd;
  }
  video.dataset.bhPlaybackComplete = "false";

  if (
    video4OwnerHost &&
    video4OwnerHost !== host &&
    video.parentElement === video4OwnerHost
  ) {
    hardStopMedia(video);
    video4OwnerHost.removeChild(video);
  }

  if (video.parentElement !== host) {
    hardStopMedia(video);
    host.replaceChildren(video);
  } else {
    ensureVideoSource(video, src);
  }

  ensureCaptionTrack(video, captionsSrc, locale, captionsLabel);
  video4OwnerHost = host;
  return video;
}

function unmountVideo2FromHost(host: HTMLElement) {
  stopVideo2Raf();
  if (!video2Element) {
    return;
  }
  hardStopMedia(video2Element);
  if (video2Element.parentElement === host) {
    host.removeChild(video2Element);
  }
  if (video2OwnerHost === host) {
    video2OwnerHost = null;
  }
}

function unmountVideo4FromHost(host: HTMLElement) {
  clearVideo4HoldTimer();
  video4EndApplied = false;
  if (!video4Element) {
    return;
  }
  hardStopMedia(video4Element);
  if (video4Element.parentElement === host) {
    host.removeChild(video4Element);
  }
  if (video4OwnerHost === host) {
    video4OwnerHost = null;
  }
}

function ensureWelcomeListeners(video: HTMLVideoElement) {
  if (welcomeListenersAttached) {
    return;
  }
  welcomeListenersAttached = true;

  video.addEventListener("play", () => {
    silenceAllExcept(video);
  });

  video.addEventListener("loadedmetadata", () => {
    video.dataset.bhDuration = String(video.duration);
    video.dataset.bhPlaybackComplete = "false";
  });

  video.addEventListener("ended", () => {
    video.dataset.bhPlaybackComplete = "true";
  });
}

function getOrCreateWelcomeElement(
  src: string,
  label: string,
): HTMLVideoElement {
  if (!welcomeElement) {
    const video = document.createElement("video");
    video.className = "bh-founder-media-video";
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.autoplay = false;
    video.setAttribute(WELCOME_INSTANCE_ATTR, "1");
    video.setAttribute("data-bh-media-src", src);
    video.setAttribute("aria-label", label);
    welcomeElement = video;
    ensureWelcomeListeners(video);
  }

  const video = welcomeElement;
  video.muted = false;
  video.defaultMuted = false;
  video.autoplay = false;
  if (video.volume <= 0) {
    video.volume = 1;
  }
  video.setAttribute("aria-label", label);
  video.setAttribute("data-bh-media-src", src);
  ensureVideoSource(video, src);
  return video;
}

function detachOtherFounderSingletons(except: "welcome" | "video2" | "video4") {
  if (except !== "video2" && video2Element) {
    stopVideo2Raf();
    hardStopMedia(video2Element);
    if (video2Element.parentElement) {
      video2Element.parentElement.removeChild(video2Element);
    }
    video2OwnerHost = null;
  }
  if (except !== "video4" && video4Element) {
    clearVideo4HoldTimer();
    hardStopMedia(video4Element);
    if (video4Element.parentElement) {
      video4Element.parentElement.removeChild(video4Element);
    }
    video4OwnerHost = null;
  }
  if (except !== "welcome" && welcomeElement) {
    hardStopMedia(welcomeElement);
    if (welcomeElement.parentElement) {
      welcomeElement.parentElement.removeChild(welcomeElement);
    }
    welcomeOwnerHost = null;
  }
}

function mountWelcomeIntoHost(
  host: HTMLElement,
  src: string,
  label: string,
  captionsSrc: string | null,
  locale: Locale,
  captionsLabel: string,
): HTMLVideoElement {
  detachOtherFounderSingletons("welcome");

  const video = getOrCreateWelcomeElement(src, label);
  silenceAllExcept(video);
  delete video.dataset.bhPhraseEnd;
  delete video.dataset.bhPlaybackEnd;
  video.dataset.bhPlaybackComplete = "false";

  if (
    welcomeOwnerHost &&
    welcomeOwnerHost !== host &&
    video.parentElement === welcomeOwnerHost
  ) {
    hardStopMedia(video);
    welcomeOwnerHost.removeChild(video);
  }

  if (video.parentElement !== host) {
    hardStopMedia(video);
    host.replaceChildren(video);
  } else {
    ensureVideoSource(video, src);
  }

  ensureCaptionTrack(video, captionsSrc, locale, captionsLabel);
  welcomeOwnerHost = host;
  return video;
}

function unmountWelcomeFromHost(host: HTMLElement) {
  if (!welcomeElement) {
    return;
  }
  hardStopMedia(welcomeElement);
  if (welcomeElement.parentElement === host) {
    host.removeChild(welcomeElement);
  }
  if (welcomeOwnerHost === host) {
    welcomeOwnerHost = null;
  }
}

type Chapter3FounderVideoProps = {
  locale: Locale;
  labelId: string;
  label: string;
  src: string;
  captionsSrc?: string | null;
  transcriptSrc?: string | null;
  captionsLabel: string;
  transcriptLabel: string;
  loadingLabel: string;
  placementId?: string;
};

/**
 * Chapter III Founder Welcome video — never shows missing-asset / internal
 * production notices to participants when the approved source is present.
 */
function Chapter3FounderVideo({
  locale,
  labelId,
  label,
  src,
  captionsSrc,
  transcriptSrc,
  captionsLabel,
  transcriptLabel,
  loadingLabel,
  placementId = "chapter-3-welcome",
}: Chapter3FounderVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const clearLoading = () => setIsLoading(false);
    if (video.readyState >= 1) {
      clearLoading();
    }
    video.addEventListener("loadedmetadata", clearLoading);
    video.addEventListener("canplay", clearLoading);
    video.addEventListener("loadeddata", clearLoading);
    const preferApprovedCaptions = () => {
      for (const textTrack of Array.from(video.textTracks)) {
        const isApproved =
          Boolean(captionsSrc) &&
          textTrack.language === locale &&
          textTrack.label === captionsLabel;
        textTrack.mode = isApproved ? "hidden" : "disabled";
      }
    };
    video.addEventListener("loadedmetadata", preferApprovedCaptions);
    preferApprovedCaptions();
    return () => {
      video.removeEventListener("loadedmetadata", clearLoading);
      video.removeEventListener("canplay", clearLoading);
      video.removeEventListener("loadeddata", clearLoading);
      video.removeEventListener("loadedmetadata", preferApprovedCaptions);
    };
  }, [src, captionsSrc, locale, captionsLabel]);

  return (
    <figure
      className="bh-founder-media"
      aria-labelledby={labelId}
      data-bh-founder-media={placementId}
      data-bh-natural-end="true"
    >
      <figcaption id={labelId} className="bh-founder-media-label">
        {label}
      </figcaption>
      <div className="bh-founder-media-frame">
        {isLoading ? (
          <p className="bh-founder-media-loading" aria-live="polite">
            {loadingLabel}
          </p>
        ) : null}
        <video
          ref={videoRef}
          className="bh-founder-media-video"
          controls
          playsInline
          preload="metadata"
          src={src}
          aria-label={label}
          onLoadedMetadata={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onPlay={(event) => {
            const owner = event.currentTarget;
            document.querySelectorAll("video, audio").forEach((node) => {
              if (
                node instanceof HTMLMediaElement &&
                node !== owner &&
                !node.paused
              ) {
                node.pause();
              }
            });
          }}
        >
          {captionsSrc ? (
            <track
              kind="captions"
              src={captionsSrc}
              srcLang={locale}
              label={captionsLabel}
            />
          ) : null}
        </video>
      </div>
      {transcriptSrc ? (
        <p className="bh-founder-media-transcript">
          <a href={transcriptSrc}>{transcriptLabel}</a>
        </p>
      ) : null}
    </figure>
  );
}

/**
 * Production Founder media placement.
 *
 * Founder Video 2: singleton player + phrase endpoint after "Let's begin."
 * Founder Video 4: singleton player; optional Chapter II playbackEndSeconds.
 * Onboarding Welcome: singleton player; full source duration (no custom endpoint).
 * Other placements render a normal React <video> to natural end.
 */
export function FounderMediaPlacement({
  locale,
  placement,
}: FounderMediaPlacementProps) {
  const copy =
    placement.id === VIDEO_4_PLACEMENT_ID
      ? getDictionary(locale).appShell.chapter2
      : placement.id === "chapter-3-welcome"
        ? getDictionary(locale).appShell.chapter3
        : placement.id === "chapter-4-welcome"
          ? getDictionary(locale).appShell.chapter4
          : placement.id === "chapter-5-welcome"
            ? getDictionary(locale).appShell.chapter5
            : placement.id === "chapter-6-welcome"
              ? getDictionary(locale).appShell.chapter6
              : placement.id === "chapter-7-welcome" ||
                  placement.id === "chapter-7-complete"
                ? getDictionary(locale).appShell.chapter7
            : getDictionary(locale).appShell.chapter1;
  const labelId = useId();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(placement.src));

  const src =
    placement.assetStatus === "available" && placement.src
      ? placement.src
      : null;
  const placementId = placement.id;
  const isVideo2 = placementId === VIDEO_2_PLACEMENT_ID;
  const isVideo4 = placementId === VIDEO_4_PLACEMENT_ID;
  const isWelcome = placementId === WELCOME_PLACEMENT_ID;
  const isChapter3 = placementId === "chapter-3-welcome";
  const isChapter4 = placementId === "chapter-4-welcome";
  const isChapter5 = placementId === "chapter-5-welcome";
  const isChapter6 = placementId === "chapter-6-welcome";
  const isChapter7 =
    placementId === "chapter-7-welcome" ||
    placementId === "chapter-7-complete";
  const phraseEndSeconds =
    isVideo2 &&
    typeof placement.playbackEndSeconds === "number" &&
    Number.isFinite(placement.playbackEndSeconds)
      ? placement.playbackEndSeconds
      : null;
  const video4EndSeconds =
    isVideo4 &&
    typeof placement.playbackEndSeconds === "number" &&
    Number.isFinite(placement.playbackEndSeconds)
      ? placement.playbackEndSeconds
      : null;
  const captionsSrc = placement.captionsSrc ?? null;
  const captionsLabel = resolveAppShellLabel(locale, copy.mediaCaptions);

  useEffect(() => {
    if (!src || !isVideo2) {
      return;
    }
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const video = mountVideo2IntoHost(
      host,
      src,
      placement.label,
      phraseEndSeconds,
      captionsSrc,
      locale,
      captionsLabel,
    );
    setIsLoading(video.readyState < 1);

    const onReady = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setHasError(true);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      unmountVideo2FromHost(host);
    };
  }, [src, isVideo2, placement.label, phraseEndSeconds, captionsSrc, locale, captionsLabel]);

  useEffect(() => {
    if (!src || !isVideo4) {
      return;
    }
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const video = mountVideo4IntoHost(
      host,
      src,
      placement.label,
      video4EndSeconds,
      captionsSrc,
      locale,
      captionsLabel,
    );
    setIsLoading(video.readyState < 1);

    const onReady = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setHasError(true);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      unmountVideo4FromHost(host);
    };
  }, [src, isVideo4, placement.label, video4EndSeconds, captionsSrc, locale, captionsLabel]);

  useEffect(() => {
    if (!src || !isWelcome) {
      return;
    }
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const video = mountWelcomeIntoHost(
      host,
      src,
      placement.label,
      captionsSrc,
      locale,
      captionsLabel,
    );
    setIsLoading(video.readyState < 1);

    const onReady = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      setHasError(true);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("error", onError);
      unmountWelcomeFromHost(host);
    };
  }, [src, isWelcome, placement.label, captionsSrc, locale, captionsLabel]);

  if (!src) {
    // Locale-specific asset missing — never expose internal project/asset language.
    // Keep the placement shell; do not substitute another language's video.
    const unavailable = resolveAppShellLabel(locale, copy.mediaUnavailable);
    return (
      <figure
        className="bh-founder-media bh-founder-media-missing"
        aria-labelledby={labelId}
      >
        <figcaption id={labelId} className="bh-founder-media-label">
          {placement.label}
        </figcaption>
        <div
          className="bh-founder-media-frame"
          role="group"
          aria-label={unavailable}
        >
          {unavailable ? (
            <p className="bh-founder-media-status">{unavailable}</p>
          ) : null}
        </div>
      </figure>
    );
  }

  if (isVideo2 || isVideo4 || isWelcome) {
    const endSeconds = isVideo2
      ? phraseEndSeconds
      : isVideo4
        ? video4EndSeconds
        : null;
    return (
      <figure
        className="bh-founder-media"
        aria-labelledby={labelId}
        data-bh-founder-media={placement.id}
        data-bh-phrase-end={isVideo2 ? "lets-begin" : undefined}
        data-bh-playback-end={
          endSeconds != null ? String(endSeconds) : undefined
        }
        data-bh-player="singleton"
        data-bh-natural-end={isVideo4 || isWelcome ? "true" : undefined}
      >
        <figcaption id={labelId} className="bh-founder-media-label">
          {placement.label}
        </figcaption>
        <div className="bh-founder-media-frame">
          {isLoading ? (
            <p className="bh-founder-media-loading" aria-live="polite">
              {resolveAppShellLabel(locale, copy.mediaLoading)}
            </p>
          ) : null}
          {hasError &&
          resolveAppShellLabel(locale, copy.mediaUnavailableDetail) ? (
            <p className="bh-founder-media-detail" role="alert">
              {resolveAppShellLabel(locale, copy.mediaUnavailableDetail)}
            </p>
          ) : null}
          <div ref={hostRef} className="bh-founder-media-host" />
        </div>
        {placement.transcriptSrc ? (
          <p className="bh-founder-media-transcript">
            <a href={placement.transcriptSrc}>
              {resolveAppShellLabel(locale, copy.mediaTranscript)}
            </a>
          </p>
        ) : null}
      </figure>
    );
  }

  if ((isChapter3 || isChapter4 || isChapter5 || isChapter6 || isChapter7) && src) {
    return (
      <Chapter3FounderVideo
        locale={locale}
        labelId={labelId}
        label={placement.label}
        src={src}
        captionsSrc={placement.captionsSrc}
        transcriptSrc={placement.transcriptSrc}
        captionsLabel={resolveAppShellLabel(locale, copy.mediaCaptions)}
        transcriptLabel={resolveAppShellLabel(locale, copy.mediaTranscript)}
        loadingLabel={resolveAppShellLabel(locale, copy.mediaLoading)}
        placementId={placementId}
      />
    );
  }

  return null;
}
