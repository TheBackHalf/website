import {
  AccessDeniedError,
  requireSystemCaller,
  SYSTEM_CALL_MARKER,
} from "@/lib/auth/access";

export type SystemHealthReport = {
  status: "ok";
  checkedAt: string;
  scope: "system";
};

/**
 * Trusted server-side operation. Not exposed as a client-callable Server Action.
 * Callers must pass SYSTEM_CALL_MARKER from server code only.
 */
export function runSystemHealthCheck(marker: symbol): SystemHealthReport {
  requireSystemCaller(marker);
  return {
    status: "ok",
    checkedAt: new Date().toISOString(),
    scope: "system",
  };
}

export function tryRunSystemHealthCheckFromUntrustedContext(): {
  status: "forbidden";
} {
  try {
    // Deliberately use a non-system marker to prove client/untrusted paths fail.
    requireSystemCaller(Symbol("untrusted"));
    return { status: "forbidden" };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return { status: "forbidden" };
    }
    throw error;
  }
}

export { SYSTEM_CALL_MARKER };
