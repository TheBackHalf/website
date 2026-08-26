"use client";



import Image from "next/image";

import { useState } from "react";

import { CtaButton } from "@/components/home/cta-button";

import { LuminaDisclosure } from "@/components/lumina/lumina-disclosure";

import { LuminaOpening } from "@/components/lumina/lumina-opening";

import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";

import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";

import {

  SectionBody,

  SectionHeading,

  SectionShell,

} from "@/components/home/section-shell";

import { luminaAsset, luminaCta, luminaSections } from "@/content/lumina";

import type { Locale } from "@/lib/i18n/config";

import { cn } from "@/lib/utils";



const sectionVariants = ["dark", "light", "muted"] as const;



type LuminaPageContentProps = {

  locale?: Locale;

};



export function LuminaPageContent({ locale = "en" }: LuminaPageContentProps) {

  const [hasOpened, setHasOpened] = useState(false);



  return (

    <>

      <LuminaOpening onOpen={() => setHasOpened(true)} locale={locale} />



      <div

        id="lumina-main"

        tabIndex={-1}

        className={cn(

          "bh-lumina-main outline-none transition-opacity duration-700",

          hasOpened ? "opacity-100" : "pointer-events-none opacity-0",

        )}

        aria-hidden={!hasOpened}

        inert={!hasOpened ? true : undefined}

      >

        {luminaSections.map((section, index) => {

          const variant = sectionVariants[index] ?? "light";

          const onDark = variant === "dark";

          const sectionEyebrow =

            locale === "en" ? section.eyebrow : "Conoce a Lumina";



          return (

            <SectionShell

              key={section.id}

              id={section.id}

              ariaLabel={sectionEyebrow}

              variant={variant}

              eyebrowOnDark={onDark}

              eyebrow={sectionEyebrow}

              containerClassName="max-w-5xl"

              className={cn(

                index === 0 && "min-h-[60vh] md:min-h-[70vh]",

                index === 1 && "pb-8 md:pb-12",

              )}

              backdrop={

                index === 0 ? (

                  <>

                    <Image

                      src={luminaAsset.heroImage}

                      alt=""

                      fill

                      sizes="100vw"

                      className="object-contain object-center opacity-70"

                    />

                    <div className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.14_0.035_300_/_0.35)_0%,oklch(0.12_0.04_305_/_0.25)_45%,oklch(0.14_0.035_300_/_0.55)_100%)]" />

                  </>

                ) : undefined

              }

            />

          );

        })}



        <SectionShell

          id="lumina-disclosure-section"

          variant="light"

          ariaLabel={

            locale === "en"

              ? "AI and privacy disclosure"

              : "Divulgación de IA y privacidad"

          }

          containerClassName="max-w-4xl"

          className="py-20 md:py-28"

        >

          <LuminaDisclosure locale={locale} />

        </SectionShell>



        <SectionShell

          id="lumina-cta"

          variant="muted"

          eyebrow={

            locale === "en" ? luminaCta.eyebrow : "Únete al movimiento"

          }

          containerClassName="max-w-3xl"

        >

          <div className="bh-cta-panel mx-auto text-center">

            <LocalizedBrandCopy

              locale={locale}

              es={

                <>

                  <SectionHeading className="relative text-4xl md:text-5xl lg:text-6xl">

                    El próximo capítulo de tu vida comienza hoy.

                  </SectionHeading>

                  <SectionBody className="relative mx-auto mt-8 max-w-xl">

                    Elige The Back Half Blueprint, Founding Architect o Architect

                    Community — luego continúa al checkout seguro.

                  </SectionBody>

                </>

              }

            >

              <>

                <SectionHeading className="relative text-4xl md:text-5xl lg:text-6xl">

                  {luminaCta.heading}

                </SectionHeading>

                <SectionBody className="relative mx-auto mt-8 max-w-xl">

                  {luminaCta.body}

                </SectionBody>

              </>

            </LocalizedBrandCopy>

            <CtaButton
              href="/checkout"
              locale={locale}
              className="relative"
              data-bh-cta="become_architect"
            >

              {locale === "en" ? luminaCta.button : "Conviértete en Architect"}

            </CtaButton>
            <EligibilityDisclosure locale={locale} />

          </div>

        </SectionShell>



        <LocalizedSiteFooter locale={locale} />

      </div>

    </>

  );

}


