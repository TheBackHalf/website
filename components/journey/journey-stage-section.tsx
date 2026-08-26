import type { JourneyStage } from "@/content/journey-stages";

import { CopyPending } from "@/components/journey/copy-pending";

import { LifeAreaGrid } from "@/components/journey/life-area-grid";

import {

  SectionHeading,

  SectionShell,

} from "@/components/home/section-shell";

import type { Locale } from "@/lib/i18n/config";

import { cn } from "@/lib/utils";



type StageVariant = "light" | "muted" | "accent" | "dark";



const stageVariants: StageVariant[] = [

  "light",

  "muted",

  "dark",

  "light",

  "accent",

  "muted",

  "dark",

];



type JourneyStageSectionProps = {

  stage: JourneyStage;

  locale?: Locale;

};



function renderHeadingLines(

  lines: string[],

  accentLineIndex: number | undefined,

  onDark: boolean,

) {

  return lines.map((line, index) => (

    <p

      key={line}

      className={cn(

        "font-display text-2xl leading-snug font-medium tracking-[-0.01em] md:text-3xl md:leading-snug lg:text-4xl",

        onDark ? "text-white/90" : "text-bh-ink/90",

        index === accentLineIndex &&

          (onDark ? "italic text-bh-champagne" : "italic text-bh-purple"),

      )}

    >

      {line}

    </p>

  ));

}



export function JourneyStageSection({

  stage,

  locale = "en",

}: JourneyStageSectionProps) {

  const variant = stageVariants[stage.order - 1] ?? "light";

  const onDark = variant === "accent" || variant === "dark";

  const isArchitect = stage.id === "architect";

  const isStandards = stage.id === "standards";



  return (

    <SectionShell

      id={stage.id}

      ariaLabel={

        locale === "en"

          ? `Stage ${stage.order}: ${stage.name}`

          : `Etapa ${stage.order}: ${stage.name}`

      }

      variant={variant}

      align={isArchitect ? "left" : "center"}

      eyebrow={stage.eyebrow}

      eyebrowClassName={onDark ? "bh-eyebrow-on-dark" : undefined}

      containerClassName={cn(

        isArchitect ? "max-w-6xl" : "max-w-5xl",

        isStandards && "relative",

      )}

      className={cn(

        stage.order === 1 && "py-32 md:py-48 lg:py-56",

        isArchitect && "min-h-[70vh] md:min-h-[75vh]",

        stage.order === 7 && "pb-32 md:pb-40",

      )}

    >

      <div

        className={cn(

          "bh-journey-stage-marker mx-auto flex max-w-3xl flex-col",

          isArchitect ? "lg:max-w-none" : "items-center text-center",

        )}

      >

        <p

          className={cn(

            "bh-journey-stage-index",

            onDark && "text-bh-champagne/70",

          )}

          aria-hidden="true"

        >

          {String(stage.order).padStart(2, "0")}

        </p>



        <SectionHeading

          as="h2"

          className={cn(

            "mt-6 text-4xl leading-[1.12] md:text-5xl lg:text-6xl",

            onDark && "text-white",

            isArchitect && "max-w-2xl",

          )}

        >

          {stage.name}

        </SectionHeading>



        {stage.heading ? (

          <div

            className={cn(

              "mt-8 space-y-2 md:mt-10",

              !isArchitect && "mx-auto max-w-3xl",

            )}

          >

            {renderHeadingLines(

              stage.heading.lines,

              stage.heading.accentLineIndex,

              onDark,

            )}

          </div>

        ) : null}



        {stage.bodyPending && !stage.lifeAreas ? (

          <CopyPending className="mt-10 md:mt-12" onDark={onDark} locale={locale} />

        ) : null}



        {isStandards ? <div className="bh-standards-aura" aria-hidden="true" /> : null}

      </div>



      {stage.lifeAreas ? (

        <div className="relative z-10 mt-4">

          {stage.bodyPending ? (

            <CopyPending

              className={cn("mx-auto", isArchitect && "md:mx-0")}

              onDark={onDark}

              locale={locale}

            />

          ) : null}

          <LifeAreaGrid areas={stage.lifeAreas} onDark={onDark} locale={locale} />

        </div>

      ) : null}

    </SectionShell>

  );

}


