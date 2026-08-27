"use client";

import { useEffect } from "react";
import {
  clearKeyboardInset,
  measureAndApplyKeyboardInset,
} from "@/lib/ui/visual-viewport";

/**
 * Publishes --bh-keyboard-inset so sticky composers and focused fields
 * stay above the software keyboard on mobile browsers.
 */
export function ViewportStability() {
  useEffect(() => {
    const root = document.documentElement.style;

    const update = () => {
      measureAndApplyKeyboardInset(window, root);
    };

    update();

    const visual = window.visualViewport;
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }
      if (!/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
        return;
      }
      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: "center", inline: "nearest" });
      });
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", onFocusIn);
      clearKeyboardInset(root);
    };
  }, []);

  return null;
}
