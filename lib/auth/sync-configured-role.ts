import { getConfiguredRoleForEmail } from "@/lib/auth/roles";
import { getAuthStore } from "@/lib/auth/store";
import type { UserRecord } from "@/lib/auth/types";

/**
 * Applies trusted env-configured admin/support roles at session creation time.
 * Never grants system. Never demotes an admin to support via email lists.
 */
export async function syncConfiguredRole(
  user: UserRecord,
): Promise<UserRecord> {
  const configured = getConfiguredRoleForEmail(user.email);
  if (!configured) {
    return user;
  }

  if (user.role === configured) {
    return user;
  }

  // Do not silently demote an admin when they are also listed as support.
  if (user.role === "admin" && configured === "support") {
    return user;
  }

  const updated = await getAuthStore().setUserRole(user.id, configured);
  return updated ?? user;
}
