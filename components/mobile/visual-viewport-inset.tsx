"use client";

import { useEffect } from "react";
import {
  computeKeyboardInset,
  isKeyboardOpen,
} from "@/lib/ui/visual-viewport";

function writeVisualViewportProperties() {
  const root = document.documentElement;
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const offsetTop = vv?.offsetTop ?? 0;
  const inset = computeKeyboardInset({
    innerHeight: window.innerHeight,
    visualViewportHeight: height,
    visualViewportOffsetTop: offsetTop,
  });

  root.style.setProperty("--bh-keyboard-inset", `${inset}px`);
  root.style.setProperty("--bh-vv-height", `${Math.round(height)}px`);
  root.style.setProperty("--bh-vv-offset-top", `${Math.round(offsetTop)}px`);
  root.dataset.bhKeyboard = isKeyboardOpen(inset) ? "open" : "closed";
}

function scrollActiveFieldIntoView() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) {
    return;
  }
  if (!active.matches("input, textarea, select, [contenteditable='true']")) {
    return;
  }
  active.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

/**
 * Publishes visual-viewport CSS variables so composers and forms stay
 * above the software keyboard on iPhone/Android browsers.
 */
export function VisualViewportInset() {
  useEffect(() => {
    writeVisualViewportProperties();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", writeVisualViewportProperties);
    vv?.addEventListener("scroll", writeVisualViewportProperties);
    window.addEventListener("resize", writeVisualViewportProperties);
    window.addEventListener("orientationchange", writeVisualViewportProperties);

    function onFocusIn() {
      writeVisualViewportProperties();
      window.setTimeout(scrollActiveFieldIntoView, 280);
    }

    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv?.removeEventListener("resize", writeVisualViewportProperties);
      vv?.removeEventListener("scroll", writeVisualViewportProperties);
      window.removeEventListener("resize", writeVisualViewportProperties);
      window.removeEventListener(
        "orientationchange",
        writeVisualViewportProperties,
      );
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
