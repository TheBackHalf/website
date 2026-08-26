import type { Locale } from "@/lib/i18n/config";

import { getDictionary } from "@/content/i18n/get-dictionary";

import { cn } from "@/lib/utils";



type LifeAreaGridProps = {

  areas: readonly string[];

  onDark?: boolean;

  locale?: Locale;

};



export function LifeAreaGrid({

  areas,

  onDark = false,

  locale = "en",

}: LifeAreaGridProps) {

  const dictionary = getDictionary(locale);



  return (

    <ul

      className="bh-life-area-grid mt-12 grid gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-3 lg:gap-6"

      aria-label={locale === "en" ? "Life areas" : "Áreas de vida"}

    >

      {areas.map((area, index) => (

        <li key={area}>

          <div

            className={cn(

              "bh-reveal bh-life-area",

              onDark && "bh-life-area-dark",

            )}

            style={{ animationDelay: `${index * 80}ms` }}

          >

            <span className="bh-life-area-index" aria-hidden="true">

              {String(index + 1).padStart(2, "0")}

            </span>

            <p className="bh-life-area-label">{area}</p>

            <p

              className={cn(

                "bh-copy-pending mt-4 text-[0.58rem] tracking-[0.28em]",

                onDark && "bh-copy-pending-on-dark",

              )}

            >

              {dictionary.common.copyPending}

            </p>

          </div>

        </li>

      ))}

    </ul>

  );

}


