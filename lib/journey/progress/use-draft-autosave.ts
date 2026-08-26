"use client";

import { useEffect, useRef, useState } from "react";

export const JOURNEY_FLUSH_DRAFTS_EVENT = "bh-journey-flush-drafts";

type SaveResult = { status: "ok" } | { status: "error"; code?: string };

type UseJourneyDraftAutosaveOptions<T> = {
  value: T;
  save: (value: T) => Promise<SaveResult>;
  enabled?: boolean;
  delayMs?: number;
};

function serialize(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function flushJourneyDrafts(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(JOURNEY_FLUSH_DRAFTS_EVENT));
  await new Promise((resolve) => {
    window.setTimeout(resolve, 40);
  });
}

/**
 * Preserve in-progress answers without requiring the Architect to click Save.
 * Skips the initial mount so restored drafts are not rewritten on load.
 */
export function useJourneyDraftAutosave<T>({
  value,
  save,
  enabled = true,
  delayMs = 900,
}: UseJourneyDraftAutosaveOptions<T>): {
  saving: boolean;
  saved: boolean;
  error: boolean;
  flush: () => Promise<void>;
} {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const lastSaved = useRef(serialize(value));
  const skipFirst = useRef(true);
  const valueRef = useRef(value);
  const saveRef = useRef(save);
  const inflight = useRef<Promise<void> | null>(null);
  const serialized = serialize(value);

  valueRef.current = value;
  saveRef.current = save;

  async function persist(next: T): Promise<void> {
    const serialized = serialize(next);
    if (serialized === lastSaved.current) {
      return;
    }
    setSaving(true);
    setError(false);
    try {
      const result = await saveRef.current(next);
      if (result.status === "ok") {
        lastSaved.current = serialized;
        setSaved(true);
      } else {
        setError(true);
        setSaved(false);
      }
    } catch {
      setError(true);
      setSaved(false);
    } finally {
      setSaving(false);
    }
  }

  async function flush(): Promise<void> {
    if (!enabled) {
      return;
    }
    if (inflight.current) {
      await inflight.current;
    }
    const run = persist(valueRef.current);
    inflight.current = run;
    await run;
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (skipFirst.current) {
      skipFirst.current = false;
      lastSaved.current = serialized;
      return;
    }
    setSaved(false);
    const timer = window.setTimeout(() => {
      const run = persist(valueRef.current);
      inflight.current = run;
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, enabled, serialized]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    function onFlush() {
      void flush();
    }

    function onHide() {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    }

    window.addEventListener(JOURNEY_FLUSH_DRAFTS_EVENT, onFlush);
    window.addEventListener("pagehide", onFlush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener(JOURNEY_FLUSH_DRAFTS_EVENT, onFlush);
      window.removeEventListener("pagehide", onFlush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [enabled]);

  return { saving, saved, error, flush };
}
