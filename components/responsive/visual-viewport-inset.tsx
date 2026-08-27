"use client";

import { useEffect } from "react";
import { computeKeyboardInset } from "@/lib/responsive/keyboard-inset";

const KEYBOARD_INSET_VAR = "--bh-keyboard-inset";

function publishKeyboardInset(): number {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  if (!viewport) {
    root.style.setProperty(KEYBOARD_INSET_VAR, "0px");
    return 0;
  }

  const inset = computeKeyboardInset(
    window.innerHeight,
    viewport.height,
    viewport.offsetTop,
  );
  root.style.setProperty(KEYBOARD_INSET_VAR, `${inset}px`);
  return inset;
}

function shouldRevealField(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLElement &&
    target.matches("input, textarea, select, [contenteditable='true']")
  );
}

/**
 * Keeps sticky composers and focused fields above the software keyboard.
 * Chrome/Android also honors `interactive-widget=resizes-content` from the
 * root viewport export. This hook covers iOS Safari, where the layout
 * viewport often does not shrink.
 */
export function VisualViewportInset() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    publishKeyboardInset();

    const onViewportChange = () => {
      publishKeyboardInset();
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!shouldRevealField(event.target)) {
        return;
      }
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const inset = publishKeyboardInset();
      if (!coarse && inset <= 0) {
        return;
      }
      const field = event.target;
      window.setTimeout(() => {
        field.scrollIntoView({ block: "center", inline: "nearest" });
      }, 80);
    };

    viewport?.addEventListener("resize", onViewportChange);
    viewport?.addEventListener("scroll", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      viewport?.removeEventListener("resize", onViewportChange);
      viewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
      document.removeEventListener("focusin", onFocusIn);
      root.style.removeProperty(KEYBOARD_INSET_VAR);
    };
  }, []);

  return <span data-bh-row187="visual-viewport-inset" hidden />;
}
