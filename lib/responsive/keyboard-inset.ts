/**
 * Distance the software keyboard covers at the bottom of the layout viewport.
 * iOS Safari often leaves layout height unchanged while visualViewport shrinks.
 */
export function computeKeyboardInset(
  innerHeight: number,
  visualHeight: number,
  offsetTop: number,
): number {
  if (
    !Number.isFinite(innerHeight) ||
    !Number.isFinite(visualHeight) ||
    !Number.isFinite(offsetTop)
  ) {
    return 0;
  }

  return Math.max(0, Math.round(innerHeight - visualHeight - offsetTop));
}
