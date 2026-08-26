import Image from "next/image";
import { CtaButton, HeroNav } from "@/components/design-system";
import { JourneyStageNav } from "@/components/journey/journey-stage-nav";
import { getJourneyIntro } from "@/content/journey/localized";
import type { Locale } from "@/lib/i18n/config";

type JourneyHeroProps = {
  locale?: Locale;
};

export function JourneyHero({ locale = "en" }: JourneyHeroProps) {
  const localizedIntro = getJourneyIntro(locale);

  return (
    <section
      id="journey-hero"
      aria-labelledby="journey-hero-heading"
      className="bh-hero px-5 text-center sm:px-6"
    >
      <div aria-hidden="true" className="bh-hero-media">
        <Image
          src="/images/journey-light.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
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
      <div className="bh-reveal relative z-10 mx-auto flex max-w-5xl flex-col items-center pt-20 md:pt-24">
        <p className="bh-hero-eyebrow bh-eyebrow relative mb-6 text-bh-champagne md:mb-8">
          {localizedIntro.eyebrow}
        </p>
        <h1
          id="journey-hero-heading"
          className="bh-hero-headline relative max-w-4xl text-[2.5rem] leading-[1.08] sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {localizedIntro.heading.lines.map((line, index) => (
            <span key={line} className="block">
              {index === localizedIntro.heading.accentLineIndex ? (
                <span className="italic text-bh-champagne">{line}</span>
              ) : (
                line
              )}
            </span>
          ))}
        </h1>
        <CtaButton href="#awakening" variant="hero" className="relative">
          {locale === "en" ? "Begin Your Journey" : "Comienza tu Journey"}
        </CtaButton>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-10 pt-16 md:px-10 md:pb-14 md:pt-20">
        <JourneyStageNav locale={locale} />
      </div>
    </section>
  );
}
