import Image from "next/image";

import { CtaButton, HeroNav } from "@/components/design-system";

import type { Locale } from "@/lib/i18n/config";



type HeroSectionProps = {

  locale?: Locale;

};



export function HeroSection({ locale = "en" }: HeroSectionProps) {

  return (

    <section id="hero" className="bh-hero px-5 text-center sm:px-6">

      <div aria-hidden="true" className="bh-hero-media">

        <Image

          src="/images/hero-atmosphere.jpg"

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

        <p className="bh-hero-eyebrow bh-eyebrow relative mb-6 md:mb-8">

          The Back Half

        </p>



        <h1 className="bh-hero-headline relative max-w-4xl text-[2.75rem] leading-[1.05] sm:text-5xl md:text-7xl lg:text-[5.75rem]">

          Magical is Possible.

        </h1>



        <p className="bh-hero-subtext relative mt-7 max-w-2xl text-lg leading-8 md:mt-10 md:max-w-4xl md:text-xl md:leading-9 lg:text-[clamp(1.05rem,1.45vw,1.5rem)] lg:leading-10 lg:tracking-[-0.015em]">

          {locale === "en"

            ? "The Back Half helps people transition from living by expectation to living with intention."

            : "The Back Half ayuda a las personas a pasar de vivir por expectativa a vivir con intención."}

        </p>



        <CtaButton

          href={locale === "en" ? "/journey" : "/es/journey"}

          locale={locale}

          variant="hero"

          className="relative"

          data-bh-cta="journey_explore"

        >

          {locale === "en" ? "Begin Your Journey" : "Comienza tu Journey"}

        </CtaButton>



        <a

          href="#invitation"

          aria-label={

            locale === "en"

              ? "Scroll to invitation"

              : "Desplazar a la invitación"

          }

          className="bh-hero-scroll relative mt-14 flex flex-col items-center gap-3 transition md:mt-20"

        >

          <span className="font-sans text-[0.62rem] tracking-[0.4em] uppercase">

            {locale === "en" ? "Scroll" : "Desplazar"}

          </span>

          <span className="bh-hero-scroll-line block h-12 w-px origin-top" />

        </a>

      </div>

    </section>

  );

}


