/**
 * Row 187 — visual-viewport helpers for mobile keyboard overlap.
 * Pure geometry only. No secrets, no auth, no network.
 */

export type VisualViewportMetrics = {
  innerHeight: number;
  visualViewportHeight: number;
  visualViewportOffsetTop: number;
};

/** Pixels the software keyboard (or other chrome) overlays the layout viewport. */
export function computeKeyboardInset(metrics: VisualViewportMetrics): number {
  const inset =
    metrics.innerHeight -
    metrics.visualViewportHeight -
    metrics.visualViewportOffsetTop;
  return Number.isFinite(inset) ? Math.max(0, Math.round(inset)) : 0;
}

export const KEYBOARD_OPEN_INSET_PX = 80;

export function isKeyboardOpen(insetPx: number): boolean {
  return insetPx > KEYBOARD_OPEN_INSET_PX;
}
