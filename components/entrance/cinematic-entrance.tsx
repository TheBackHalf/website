"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

import { HomePageView } from "@/components/pages/home-page-view";
import { EntranceButterflies } from "@/components/entrance/entrance-butterflies";
import { EntranceDoorFace } from "@/components/entrance/entrance-door-face";
import { emitEntranceAnalytics } from "@/components/entrance/emit-entrance-event";
import type { Locale } from "@/lib/i18n/config";

import "./cinematic-entrance.css";

const SEEN_KEY = "bh-entrance-seen";

type Phase = "closed" | "opening" | "open" | "entering" | "revealed";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CinematicEntranceExperience({
  locale = "en",
  reviewMode = false,
  forceReducedMotion = false,
}: {
  locale?: Locale;
  reviewMode?: boolean;
  forceReducedMotion?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [reduced, setReduced] = useState(forceReducedMotion);

  useEffect(() => {
    const reducedNow = forceReducedMotion || prefersReducedMotion();
    setReduced(reducedNow);
    let seen = false;
    if (!reviewMode) {
      try {
        seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
      } catch {
        seen = false;
      }
    }
    emitEntranceAnalytics({ name: "entrance_viewed" });
    const delay = reducedNow ? 80 : seen ? 320 : 1200;
    const start = window.setTimeout(() => setPhase("opening"), delay);
    const opened = window.setTimeout(
      () =>
        setPhase((current) =>
          current === "entering" || current === "revealed" ? current : "open",
        ),
      delay + (reducedNow ? 560 : seen ? 1500 : 4000),
    );
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(opened);
    };
  }, [forceReducedMotion, reviewMode]);

  const finish = useCallback(
    (reason: "enter" | "skip") => {
      try {
        window.sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // ignore
      }
      if (reason === "skip") {
        emitEntranceAnalytics({ name: "entrance_skipped", cta: "skip" });
        setPhase("revealed");
        return;
      }
      emitEntranceAnalytics({ name: "entrance_entered", cta: "enter_the_back_half" });
      setPhase("entering");
      window.setTimeout(() => setPhase("revealed"), reduced ? 420 : 1150);
    },
    [reduced],
  );

  const replay = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SEEN_KEY);
    } catch {
      // ignore
    }
    setPhase("closed");
    window.setTimeout(() => setPhase("opening"), 80);
    window.setTimeout(() => setPhase("open"), reduced ? 640 : 4080);
  }, [reduced]);

  const stageClass = [
    "bh-ent-stage",
    reduced ? "is-reduced" : "",
    phase === "opening" ? "is-opening" : "",
    phase === "open" ? "is-open is-opening" : "",
    phase === "entering" ? "is-open is-entering is-exiting" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (phase === "revealed") {
    return (
      <div className="bh-ent">
        <HomePageView locale={locale} />
        {reviewMode ? (
          <div className="bh-ent-reviewbar">
            <p>Founder review — production homepage is unchanged.</p>
            <button type="button" onClick={replay}>
              Replay entrance
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  const particles = Array.from({ length: reduced ? 0 : 10 }, (_, index) => ({
    id: index,
    x: `${8 + ((index * 21) % 84)}%`,
    dur: `${18 + (index % 8)}s`,
    delay: `${(index * 1.1) % 14}s`,
    drift: `${(index % 2 === 0 ? 1 : -1) * (10 + index * 2)}px`,
    size: `${1.5 + (index % 2)}px`,
  }));

  const living = phase === "opening" || phase === "open" || phase === "entering";

  return (
    <div className="bh-ent">
      <section className={stageClass} aria-label="The Back Half entrance">
        <div className="bh-ent-fallback" />
        <div className="bh-ent-world">
          <Image
            src="/images/hero-atmosphere.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="bh-ent-photo object-cover"
          />
          <div className="bh-ent-sun" />
          <div className="bh-ent-haze" />
          <div className="bh-ent-haze-2" />
          <div className="bh-ent-mist" />
          <div className="bh-ent-water" />
          <div className="bh-ent-path" />
          <EntranceButterflies active={living} reduced={reduced} layer="deep" />
          <div className="bh-ent-midflora" aria-hidden="true">
            <img src="/images/entrance/flora-mid.webp?v=2" alt="" />
          </div>
          <div className="bh-ent-particles">
            {particles.map((particle) => (
              <span
                key={particle.id}
                className="bh-ent-particle"
                style={{
                  ["--x" as string]: particle.x,
                  ["--dur" as string]: particle.dur,
                  ["--delay" as string]: particle.delay,
                  ["--drift" as string]: particle.drift,
                  ["--size" as string]: particle.size,
                }}
              />
            ))}
          </div>
          <EntranceButterflies active={living} reduced={reduced} layer="near" />
          <div className="bh-ent-bokeh" />
          <div className="bh-ent-vignette" />
        </div>

        <div className="bh-ent-threshold">
          <div className="bh-ent-portal">
            <div className="bh-ent-entablature" />
            <div className="bh-ent-sill" />
            <div className="bh-ent-spill" />
            <div className="bh-ent-reveal" />
            <div className="bh-ent-door is-left">
              <div className="bh-ent-door-slab">
                <div className="bh-ent-door-face">
                  <EntranceDoorFace side="left" />
                </div>
                <div className="bh-ent-door-edge" />
              </div>
            </div>
            <div className="bh-ent-door is-right">
              <div className="bh-ent-door-slab">
                <div className="bh-ent-door-face">
                  <EntranceDoorFace side="right" />
                </div>
                <div className="bh-ent-door-edge" />
              </div>
            </div>
          </div>
        </div>

        <div className="bh-ent-canopy" aria-hidden="true">
          <img src="/images/entrance/flora-canopy.webp?v=2" alt="" />
        </div>

        <div className="bh-ent-copy">
          <div className="bh-ent-copy-veil" />
          <p className="bh-ent-brand">The Back Half</p>
          <p className="bh-ent-question">
            <span>What if this isn&apos;t all there is?</span>
          </p>
          <h1 className="bh-ent-statement">Magical is possible.</h1>
          <button
            type="button"
            className="bh-ent-enter"
            data-bh-cta="enter_the_back_half"
            onClick={() => finish("enter")}
          >
            Enter the Back Half
          </button>
        </div>

        <div className="bh-ent-foreflora is-left" aria-hidden="true">
          <img src="/images/entrance/flora-left.webp?v=2" alt="" />
        </div>
        <div className="bh-ent-foreflora is-right" aria-hidden="true">
          <img src="/images/entrance/flora-right.webp?v=2" alt="" />
        </div>

        <button type="button" className="bh-ent-skip" onClick={() => finish("skip")}>
          Skip
        </button>
        <span className="sr-only">
          A pair of castle doors opens onto a living lavender-gold garden.
          Enter to continue to The Back Half.
        </span>
      </section>
    </div>
  );
}
