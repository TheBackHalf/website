import { getJourneyStages } from "@/content/journey/localized";

import type { Locale } from "@/lib/i18n/config";

import { cn } from "@/lib/utils";



type JourneyStageNavProps = {

  className?: string;

  variant?: "light" | "dark";

  locale?: Locale;

};



export function JourneyStageNav({

  className,

  variant = "dark",

  locale = "en",

}: JourneyStageNavProps) {

  const stages = getJourneyStages(locale);

  return (

    <nav

      aria-label={locale === "en" ? "Journey stages" : "Etapas del Journey"}

      className={cn("bh-journey-stage-nav", className)}

    >

      <ol className="bh-journey-stage-nav-list">

        {stages.map((stage) => (

          <li key={stage.id}>

            <a

              href={`#${stage.id}`}

              className={cn(

                "bh-journey-stage-nav-link",

                variant === "light" && "bh-journey-stage-nav-link-light",

              )}

            >

              <span className="bh-journey-stage-nav-number" aria-hidden="true">

                {String(stage.order).padStart(2, "0")}

              </span>

              <span className="bh-journey-stage-nav-label">

                {stage.name}

              </span>

            </a>

          </li>

        ))}

      </ol>

    </nav>

  );

}


