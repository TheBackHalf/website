/**
 * Row 187 — keep focused controls above the mobile software keyboard.
 * visualViewport shrinks when the keyboard opens; layout viewport often does not.
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

export function applyKeyboardInset(root: CSSStyleDeclaration, insetPx: number): void {
  root.setProperty(KEYBOARD_INSET_CUSTOM_PROPERTY, `${Math.max(0, insetPx)}px`);
}

export function clearKeyboardInset(root: CSSStyleDeclaration): void {
  root.removeProperty(KEYBOARD_INSET_CUSTOM_PROPERTY);
}

export function measureAndApplyKeyboardInset(
  view: Pick<Window, "innerHeight" | "visualViewport">,
  root: CSSStyleDeclaration,
): number {
  const visual = view.visualViewport;
  if (!visual) {
    clearKeyboardInset(root);
    return 0;
  }

  const inset = keyboardInsetPx(view.innerHeight, visual.height, visual.offsetTop);
  applyKeyboardInset(root, inset);
  return inset;
}
