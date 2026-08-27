"use client";

import { useEffect } from "react";
import {
  KEYBOARD_INSET_CUSTOM_PROPERTY,
  keyboardInsetPx,
} from "@/lib/responsive/visual-viewport";

/**
 * Publishes the software-keyboard overlap as `--bh-keyboard-inset`
 * so sticky composers, form scroll-margin, and safe padding stay visible.
 */
export function VisualViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;

    function apply() {
      const vv = window.visualViewport;
      const inset = vv
        ? keyboardInsetPx(window.innerHeight, vv.height, vv.offsetTop)
        : 0;
      root.style.setProperty(KEYBOARD_INSET_CUSTOM_PROPERTY, `${inset}px`);
      root.dataset.bhKeyboard = inset > 0 ? "open" : "closed";
    }

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    return () => {
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      root.style.removeProperty(KEYBOARD_INSET_CUSTOM_PROPERTY);
      delete root.dataset.bhKeyboard;
    };
  }, []);

  return null;
}
