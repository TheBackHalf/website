import { redirect } from "next/navigation";
import {
  AccessDeniedError,
  requireAuthenticatedUser,
} from "@/lib/auth/access";
import { getLoginPath } from "@/lib/auth/routing";
import { getLocalizedArchitectPath } from "@/lib/app-shell/routing";
import { userHasActiveEntitlement } from "@/lib/billing/entitlements";
import type { EntitlementKind } from "@/lib/billing/types";
import type { Locale } from "@/lib/i18n/config";
import { getLocalizedPath } from "@/lib/i18n/routing";

/**
 * Paid-product access. Operational roles do NOT imply product entitlements.
 */
export async function requireEntitlement(
  kind: EntitlementKind,
  locale: Locale = "en",
) {
  let actor;
  try {
    actor = await requireAuthenticatedUser();
  } catch (error) {
    if (
      error instanceof AccessDeniedError &&
      error.code === "unauthenticated"
    ) {
      const next =
        kind === "journey_access"
          ? getLocalizedArchitectPath("journey", locale)
          : getLocalizedPath("/checkout", locale);
      redirect(`${getLoginPath(locale)}?next=${encodeURIComponent(next)}`);
    }
    throw error;
  }

  const entitled = await userHasActiveEntitlement(actor.user.id, kind);
  if (!entitled) {
    redirect(`${getLocalizedPath("/checkout", locale)}?need=${kind}`);
  }

  return actor;
}

export async function getEntitlementSnapshot(userId: string) {
  const [journey, community] = await Promise.all([
    userHasActiveEntitlement(userId, "journey_access"),
    userHasActiveEntitlement(userId, "community_access"),
  ]);

  return {
    journeyAccess: journey,
    communityAccess: community,
  };
}
