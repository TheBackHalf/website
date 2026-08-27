import Image from "next/image";

import { LocaleLink } from "@/components/i18n/locale-link";

import { CtaButton } from "@/components/home/cta-button";

import { HeroSection } from "@/components/home/hero-section";

import { LocalizedBrandCopy } from "@/components/pages/localized-brand-copy";

import { LocalizedSiteFooter } from "@/components/pages/localized-site-footer";
import { EligibilityDisclosure } from "@/components/eligibility/eligibility-disclosure";

import { StatementCard } from "@/components/home/statement-card";

import {

  SectionBody,

  SectionHeading,

  SectionShell,

} from "@/components/home/section-shell";

import { luminaAsset } from "@/content/lumina";

import type { Locale } from "@/lib/i18n/config";



type HomePageViewProps = {

  locale: Locale;

};



export function HomePageView({ locale }: HomePageViewProps) {

  return (

    <main className="min-h-dvh bg-bh-cream text-bh-ink">

      <HeroSection locale={locale} />



      <SectionShell

        id="invitation"

        variant="muted"

        eyebrow={locale === "en" ? "The Problem" : "El problema"}

        containerClassName="max-w-5xl"

      >

        <LocalizedBrandCopy

          locale={locale}

          es={

            <>

              <SectionHeading className="mt-6 text-4xl md:text-5xl lg:text-6xl">

                En algún momento del camino...

              </SectionHeading>

              <div className="bh-divider" />

              <div className="mt-2 grid gap-10 md:mt-4 md:grid-cols-3 md:gap-10 md:text-left lg:gap-14">

                <StatementCard index={0}>

                  La vida se convirtió en una lista de tareas.

                </StatementCard>

                <StatementCard index={1}>

                  Perseguimos expectativas en lugar de nuestros deseos más

                  profundos.

                </StatementCard>

                <StatementCard index={2}>

                  Dejamos de creer que una vida mágica era posible.

                </StatementCard>

              </div>

            </>

          }

        >

          <SectionHeading className="mt-6 text-4xl md:text-5xl lg:text-6xl">

            Somewhere along the way...

          </SectionHeading>

          <div className="bh-divider" />

          <div className="mt-2 grid gap-10 md:mt-4 md:grid-cols-3 md:gap-10 md:text-left lg:gap-14">

            <StatementCard index={0}>Life became a checklist.</StatementCard>

            <StatementCard index={1}>

              We pursued expectations instead of our deepest desires.

            </StatementCard>

            <StatementCard index={2}>

              We stopped believing that a magical life was possible.

            </StatementCard>

          </div>

        </LocalizedBrandCopy>

      </SectionShell>



      <SectionShell

        id="awakening"

        variant="light"

        eyebrow={locale === "en" ? "The Awakening" : "El despertar"}

        containerClassName="max-w-5xl"

        className="py-32 md:py-48 lg:py-56"

      >

        <LocalizedBrandCopy

          locale={locale}

          es={

            <SectionHeading className="mt-8 text-4xl leading-[1.12] md:text-6xl lg:text-7xl">

              La vida no se transforma con el tiempo.

              <br />

              <span className="italic text-bh-purple">

                Se transforma con la intención.

              </span>

            </SectionHeading>

          }

        >

          <SectionHeading className="mt-8 text-4xl leading-[1.12] md:text-6xl lg:text-7xl">

            Life isn&apos;t transformed by time.

            <br />

            <span className="italic text-bh-purple">

              It&apos;s transformed by intention.

            </span>

          </SectionHeading>

        </LocalizedBrandCopy>

      </SectionShell>



      <SectionShell

        id="journey"

        variant="accent"

        eyebrow={locale === "en" ? "Our Belief" : "Nuestra creencia"}

        eyebrowOnDark

        containerClassName="max-w-5xl"

        className="flex min-h-[70vh] items-center md:min-h-[80vh]"

        backdrop={

          <>

            <Image

              src="/images/journey-light.jpg"

              alt=""

              fill

              sizes="100vw"

              className="object-cover opacity-55"

            />

            <div className="absolute inset-0 bg-[linear-gradient(160deg,oklch(0.14_0.035_300_/_0.72)_0%,oklch(0.22_0.06_305_/_0.55)_45%,oklch(0.14_0.035_300_/_0.78)_100%)]" />

          </>

        }

      >

        <LocalizedBrandCopy

          locale={locale}

          onDark

          es={

            <SectionHeading className="mt-8 text-4xl leading-[1.15] text-white md:text-6xl lg:text-7xl">

              Toda persona merece la oportunidad

              <br />

              de crear intencionalmente

              <br />

              <span className="italic text-bh-champagne">una vida mágica.</span>

            </SectionHeading>

          }

        >

          <SectionHeading className="mt-8 text-4xl leading-[1.15] text-white md:text-6xl lg:text-7xl">

            Every person deserves the opportunity

            <br />

            to intentionally create

            <br />

            <span className="italic text-bh-champagne">a magical life.</span>

          </SectionHeading>

        </LocalizedBrandCopy>

      </SectionShell>



      <SectionShell

        id="founder"

        variant="light"

        eyebrow={locale === "en" ? "Founder" : "Fundadora"}

        align="left"

        containerClassName="max-w-6xl"

      >

        <div className="mt-10 grid items-center gap-12 md:gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20">

          <LocalizedBrandCopy

            locale={locale}

            es={

              <div>

                <SectionHeading className="text-4xl md:text-5xl lg:text-6xl">

                  Hola, soy Kimberly.

                </SectionHeading>

                <SectionBody className="mt-8 md:mt-10">

                  Durante años, viví una vida exitosa que no se sentía

                  plenamente viva.

                </SectionBody>

                <SectionBody className="mt-6 md:mt-7">

                  The Back Half nació de una creencia: la vida no se transforma

                  con el tiempo—se transforma con la intención.

                </SectionBody>

                <SectionBody className="mt-6 md:mt-7">

                  Mi misión es ayudar a las personas a redescubrir la maravilla

                  y crear intencionalmente una vida mágica.

                </SectionBody>

              </div>

            }

          >

            <div>

              <SectionHeading className="text-4xl md:text-5xl lg:text-6xl">

                Hi, I&apos;m Kimberly.

              </SectionHeading>

              <SectionBody className="mt-8 md:mt-10">

                For years, I lived a successful life that didn&apos;t feel fully

                alive.

              </SectionBody>

              <SectionBody className="mt-6 md:mt-7">

                The Back Half was born from one belief: life is not transformed

                by time—it is transformed by intention.

              </SectionBody>

              <SectionBody className="mt-6 md:mt-7">

                My mission is to help people rediscover wonder and intentionally

                create a magical life.

              </SectionBody>

            </div>

          </LocalizedBrandCopy>

          <div

            aria-hidden="true"

            className="bh-media-frame relative mx-auto aspect-3/4 w-full max-w-md lg:max-h-[36rem] lg:max-w-none"

          >

            <Image

              src="/images/founder-atmosphere.jpg"

              alt=""

              fill

              sizes="(max-width: 1024px) 100vw, 40vw"

              className="object-cover"

            />

          </div>

        </div>

      </SectionShell>



      <SectionShell

        id="lumina"

        variant="dark"

        ariaLabel={locale === "en" ? "Meet Lumina" : "Conoce a Lumina"}

        containerClassName="max-w-5xl"

        className="flex min-h-[65vh] items-center md:min-h-[75vh]"

        backdrop={

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

        }

      >

        <LocaleLink

          href="/lumina"

          locale={locale}

          className="bh-eyebrow bh-eyebrow-on-dark inline-block transition hover:text-bh-champagne"

        >

          {locale === "en" ? "Meet Lumina" : "Conoce a Lumina"}

        </LocaleLink>

      </SectionShell>



      <SectionShell

        id="manifesto"

        variant="dark"

        eyebrow={locale === "en" ? "The Manifesto" : "El manifiesto"}

        eyebrowOnDark

        containerClassName="max-w-4xl"

      >

        <LocalizedBrandCopy

          locale={locale}

          onDark

          es={

            <>

              <SectionHeading className="mt-8 text-4xl text-white md:text-6xl lg:text-7xl">

                Creemos que lo mágico es posible.

              </SectionHeading>

              <div className="mt-12 space-y-0 md:mt-16">

                <p className="bh-manifesto-line">

                  Rechazamos la idea de que la reinversión pertenece solo a los

                  jóvenes.

                </p>

                <p className="bh-manifesto-line">

                  Creemos que la vida no se transforma con el tiempo.

                </p>

                <p className="bh-manifesto-line">

                  Se transforma con la intención.

                </p>

                <p className="bh-manifesto-line border-b border-white/10 pb-2 not-italic">

                  Este es The Back Half.

                </p>

              </div>

            </>

          }

        >

          <>

            <SectionHeading className="mt-8 text-4xl text-white md:text-6xl lg:text-7xl">

              We believe magical is possible.

            </SectionHeading>

            <div className="mt-12 space-y-0 md:mt-16">

              <p className="bh-manifesto-line">

                We reject the idea that reinvention belongs only to the young.

              </p>

              <p className="bh-manifesto-line">

                We believe life is not transformed by time.

              </p>

              <p className="bh-manifesto-line">

                It is transformed by intention.

              </p>

              <p className="bh-manifesto-line border-b border-white/10 pb-2 not-italic">

                This is The Back Half.

              </p>

            </div>

          </>

        </LocalizedBrandCopy>

      </SectionShell>



      <SectionShell

        id="standards"

        variant="light"

        eyebrow={locale === "en" ? "Standards" : "Estándares"}

        containerClassName="max-w-4xl"

      >

        <SectionHeading className="mt-6 text-4xl md:text-5xl lg:text-6xl">

          {locale === "en" ? "Standards" : "Estándares"}

        </SectionHeading>

        <p className="bh-copy-pending mt-8">

          {locale === "en"

            ? "Approved copy pending"

            : "Contenido aprobado pendiente"}

        </p>

        <div className="bh-standards-aura" aria-hidden="true" />

      </SectionShell>



      <SectionShell

        id="cta"

        variant="muted"

        eyebrow={locale === "en" ? "Join the Movement" : "Únete al movimiento"}

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

                  Sé el primero en recibir actualizaciones, inspiración y acceso

                  exclusivo a The Back Half.

                </SectionBody>

              </>

            }

          >

            <>

              <SectionHeading className="relative text-4xl md:text-5xl lg:text-6xl">

                The next chapter of your life begins today.

              </SectionHeading>

              <SectionBody className="relative mx-auto mt-8 max-w-xl">

                Be the first to receive updates, inspiration, and exclusive

                access to The Back Half.

              </SectionBody>

            </>

          </LocalizedBrandCopy>

          <CtaButton
            href="/register"
            locale={locale}
            className="relative"
            data-bh-cta="become_architect"
          >

            {locale === "en" ? "Become an Architect" : "Conviértete en Architect"}

          </CtaButton>
          <EligibilityDisclosure locale={locale} />

        </div>

      </SectionShell>



      <LocalizedSiteFooter locale={locale} />

    </main>

  );

}


