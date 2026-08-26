"use client";

import { useEffect } from "react";

const KEYBOARD_INSET_VAR = "--bh-keyboard-inset";
const FOCUSABLE =
  "input:not([type='hidden']):not([type='checkbox']):not([type='radio']):not([type='range']):not([type='button']):not([type='submit']):not([type='reset']), textarea, select, [contenteditable='true']";

function measureKeyboardInset(): number {
  const visual = window.visualViewport;
  if (!visual) {
    return 0;
  }
  return Math.max(
    0,
    Math.round(window.innerHeight - visual.height - visual.offsetTop),
  );
}

function applyKeyboardInset(px: number) {
  document.documentElement.style.setProperty(KEYBOARD_INSET_VAR, `${px}px`);
}

/**
 * Keeps sticky composers and focused fields above the software keyboard.
 * `interactive-widget=resizes-content` covers Chromium; visualViewport covers iOS Safari.
 */
export function KeyboardInsets() {
  useEffect(() => {
    const visual = window.visualViewport;
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        applyKeyboardInset(measureKeyboardInset());
      });
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches(FOCUSABLE)) {
        return;
      }
      window.setTimeout(() => {
        target.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
        sync();
      }, 50);
    };

    applyKeyboardInset(measureKeyboardInset());
    visual?.addEventListener("resize", sync);
    visual?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", sync);

    return () => {
      cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", sync);
      visual?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", sync);
      document.documentElement.style.removeProperty(KEYBOARD_INSET_VAR);
    };
  }, []);

  return null;
}
