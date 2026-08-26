import { normalizeAppRole } from "@/lib/auth/roles";
import { getAuthStore } from "@/lib/auth/store";
import type { SessionPayload } from "@/lib/auth/types";

/**
 * Live session check: password reset and role demotion bump sessionVersion.
 * JWT role is never trusted after this point.
 */
export async function hydrateLiveSession(
  session: SessionPayload,
): Promise<SessionPayload | null> {
  const user = await getAuthStore().findUserById(session.sub);
  if (!user) return null;
  const tokenVersion = session.sessionVersion ?? 1;
  const liveVersion = user.sessionVersion ?? 1;
  if (tokenVersion !== liveVersion) {
    return null;
  }
  return {
    ...session,
    role: normalizeAppRole(user.role),
    email: user.email,
    emailVerified: user.emailVerified,
    ageEligible: user.ageEligible === true,
    sessionVersion: liveVersion,
  };
}
