"use client";

import { useEffect } from "react";

function isFormControl(target: EventTarget | null): target is HTMLElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Keeps `--bh-keyboard-inset` aligned with the visual viewport so sticky
 * composers and focused fields stay above the on-screen keyboard.
 */
export function ViewportInsets() {
  useEffect(() => {
    const root = document.documentElement;

    const updateKeyboardInset = () => {
      const visualViewport = window.visualViewport;
      if (!visualViewport) {
        root.style.setProperty("--bh-keyboard-inset", "0px");
        return;
      }

      const inset = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      );
      root.style.setProperty("--bh-keyboard-inset", `${Math.round(inset)}px`);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isFormControl(event.target)) {
        return;
      }
      const field = event.target;
      window.requestAnimationFrame(() => {
        field.scrollIntoView({ block: "center", inline: "nearest" });
      });
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);
    window.addEventListener("orientationchange", updateKeyboardInset);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
      window.removeEventListener("orientationchange", updateKeyboardInset);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
