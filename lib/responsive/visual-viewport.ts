/**
 * Distance the software keyboard covers at the bottom of the layout viewport.
 * visualViewport.height shrinks and offsetTop grows when the keyboard is open
 * on iOS Safari; Android Chrome with interactive-widget=resizes-content
 * typically reports 0 because the layout viewport already resized.
 */
export function keyboardInsetPx(
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

export const KEYBOARD_INSET_CUSTOM_PROPERTY = "--bh-keyboard-inset";
