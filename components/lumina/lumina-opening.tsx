"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeroNav } from "@/components/design-system";
import { luminaAsset, luminaOpening, luminaPage } from "@/content/lumina";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type LuminaOpeningProps = {
  onOpen: () => void;
  locale?: Locale;
};

export function LuminaOpening({ onOpen, locale = "en" }: LuminaOpeningProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpening(true);
    onOpen();
    window.setTimeout(() => {
      document.getElementById("lumina-main")?.focus({ preventScroll: true });
      document.getElementById("introduction")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 480);
  }, [onOpen]);

  useEffect(() => {
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        const active = document.activeElement;
        if (active === triggerRef.current) {
          event.preventDefault();
          handleOpen();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleOpen]);

  return (
    <section
      id="lumina-opening"
      aria-labelledby="lumina-opening-heading"
      className={cn(
        "bh-lumina-opening bh-hero px-5 text-center sm:px-6",
        isOpening && "bh-lumina-opening-active",
      )}
    >
      <div aria-hidden="true" className="bh-hero-media">
        <Image
          src={luminaAsset.heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-contain object-center"
        />
      </div>

      <div aria-hidden="true" className="bh-hero-atmosphere">
        <div className="bh-hero-veil" />
        <div className="bh-hero-glow" />
        <div className="bh-hero-beam" />
        <div className="bh-hero-vignette" />
        <div className="bh-hero-noise" />
      </div>

      <HeroNav locale={locale} />

      <div className="bh-reveal relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl flex-col items-center justify-center pt-20 md:pt-24">
        <h1
          id="lumina-opening-heading"
          className="bh-hero-eyebrow bh-eyebrow relative mb-6 text-bh-champagne md:mb-8"
        >
          {locale === "en" ? luminaPage.eyebrow : "Conoce a Lumina"}
        </h1>

        <button
          ref={triggerRef}
          type="button"
          onClick={handleOpen}
          className="bh-lumina-opening-trigger bh-cta bh-hero-cta relative mt-12 md:mt-14"
          aria-controls="lumina-main"
          aria-expanded={isOpening}
        >
          {locale === "en" ? luminaOpening.triggerLabel : "Conoce a Lumina"}
        </button>
      </div>
    </section>
  );
}
