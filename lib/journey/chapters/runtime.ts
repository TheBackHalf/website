/**
 * Backend selection for existing Chapter I–VII stores.
 * Hosted production never falls back to `.data/journey`.
 */

import {
  isHostedProduction,
  journeyPostgresConfigured,
  type JourneyChapterStoreBackend,
} from "@/lib/journey/chapters/db";

export function selectJourneyChapterBackend(input: {
  postgresConfigured: boolean;
  hostedProduction: boolean;
}): JourneyChapterStoreBackend {
  if (input.postgresConfigured) return "supabase_postgres";
  if (input.hostedProduction) return "unconfigured_production";
  return "file_local_development";
}

export function getJourneyChapterDurability(): {
  backend: JourneyChapterStoreBackend;
  productionSourceOfTruth: string;
  dataDirIsSourceOfTruth: boolean;
} {
  const backend = selectJourneyChapterBackend({
    postgresConfigured: journeyPostgresConfigured(),
    hostedProduction: isHostedProduction(),
  });
  if (backend === "supabase_postgres") {
    return {
      backend,
      productionSourceOfTruth:
        "Supabase Postgres table bh_journey_chapters via POSTGRES_URL (shared Journey chapter store)",
      dataDirIsSourceOfTruth: false,
    };
  }
  if (backend === "unconfigured_production") {
    return {
      backend,
      productionSourceOfTruth:
        "Postgres required in Vercel production; filesystem fallback is disabled",
      dataDirIsSourceOfTruth: false,
    };
  }
  return {
    backend,
    productionSourceOfTruth:
      "Local development file fallback. Not the production system of record.",
    dataDirIsSourceOfTruth: false,
  };
}

export function createJourneyChapterStoreInstance<T>(factories: {
  file: () => T;
  postgres: () => T;
  unconfigured: () => T;
}): T {
  const backend = selectJourneyChapterBackend({
    postgresConfigured: journeyPostgresConfigured(),
    hostedProduction: isHostedProduction(),
  });
  if (backend === "supabase_postgres") return factories.postgres();
  if (backend === "unconfigured_production") return factories.unconfigured();
  return factories.file();
}
