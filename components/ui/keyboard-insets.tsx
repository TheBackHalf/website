"use client";

import { useEffect } from "react";

const KEYBOARD_VAR = "--bh-keyboard-inset";
const OFFSET_VAR = "--bh-vv-offset-top";
const HEIGHT_VAR = "--bh-vv-height";

function isTextEntry(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target instanceof HTMLTextAreaElement) {
    return true;
  }
  if (target instanceof HTMLSelectElement) {
    return true;
  }
  if (target instanceof HTMLInputElement) {
    return target.type !== "hidden" && target.type !== "button" && target.type !== "submit";
  }
  return target.isContentEditable;
}

/**
 * Maps the visual viewport onto CSS variables so sticky composers and
 * focused fields stay above the software keyboard on iOS/Android.
 */
export function KeyboardInsets() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.setProperty(KEYBOARD_VAR, "0px");
        root.style.setProperty(OFFSET_VAR, "0px");
        root.style.setProperty(HEIGHT_VAR, `${window.innerHeight}px`);
        return;
      }

      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      root.style.setProperty(KEYBOARD_VAR, `${Math.round(inset)}px`);
      root.style.setProperty(OFFSET_VAR, `${Math.round(viewport.offsetTop)}px`);
      root.style.setProperty(HEIGHT_VAR, `${Math.round(viewport.height)}px`);
    };

    apply();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", apply);
    viewport?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);

    let focusTimer = 0;
    const onFocusIn = (event: FocusEvent) => {
      if (!isTextEntry(event.target)) {
        return;
      }
      const field = event.target;
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        field.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }, 280);
    };

    document.addEventListener("focusin", onFocusIn);

    return () => {
      viewport?.removeEventListener("resize", apply);
      viewport?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("focusin", onFocusIn);
      window.clearTimeout(focusTimer);
      root.style.setProperty(KEYBOARD_VAR, "0px");
    };
  }, []);

  return null;
}
