import type { Viewport } from "next";

/**
 * Launch mobile viewport — Row 187.
 * Keeps pinch-zoom available (do not set userScalable: false).
 * `resizes-content` lifts forms and the Lumina composer above the software keyboard
 * on browsers that implement interactive-widget.
 * `viewportFit: cover` enables safe-area insets on notched devices.
 */
export const launchViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};
