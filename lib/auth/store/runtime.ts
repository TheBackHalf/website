import { isHostedProduction } from "@/lib/analytics/db";
import { createFileAuthStore } from "@/lib/auth/store/file-store";
import { authPostgresConfigured } from "@/lib/auth/store/db";
import {
  createPostgresAuthStore,
  createUnconfiguredProductionAuthStore,
} from "@/lib/auth/store/postgres-store";
import type { AuthStore } from "@/lib/auth/store/types";

let storeInstance: AuthStore | null = null;

export function getAuthStore(): AuthStore {
  if (!storeInstance) {
    if (authPostgresConfigured()) {
      storeInstance = createPostgresAuthStore();
    } else if (isHostedProduction()) {
      storeInstance = createUnconfiguredProductionAuthStore();
    } else {
      storeInstance = createFileAuthStore();
    }
  }

  return storeInstance;
}

/** Test helper — replace auth store implementation. */
export function setAuthStoreForTests(store: AuthStore | null) {
  storeInstance = store;
}
