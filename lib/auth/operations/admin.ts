"use server";

import {
  AccessDeniedError,
  assertCanAssignRole,
  requirePermission,
} from "@/lib/auth/access";
import type { AssignableHumanRole } from "@/lib/auth/roles";
import { getAuthStore } from "@/lib/auth/store";
import { normalizeEmail } from "@/lib/auth/normalize-email";

export type AdminAccountSummary = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  arcCode: string;
  emailVerified: boolean;
  role: string;
  authProvider: string;
  locale: string;
  createdAt: string;
};

/** Safe admin listing — never includes password hashes or secrets. */
export async function listArchitectAccountsForAdmin(): Promise<
  | { status: "ok"; accounts: AdminAccountSummary[] }
  | { status: "unauthorized" }
  | { status: "forbidden" }
> {
  try {
    await requirePermission("admin:accounts:list");
    const users = await getAuthStore().listUsers();
    return {
      status: "ok",
      accounts: users.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        arcCode: user.arcCode,
        emailVerified: user.emailVerified,
        role: user.role,
        authProvider: user.authProvider,
        locale: user.locale,
        createdAt: user.createdAt,
      })),
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status: error.code === "unauthenticated" ? "unauthorized" : "forbidden",
      };
    }
    throw error;
  }
}

export async function assignHumanRoleAction(input: {
  email: string;
  role: string;
}): Promise<
  | { status: "ok"; email: string; role: AssignableHumanRole }
  | { status: "unauthorized" }
  | { status: "forbidden" }
  | { status: "not_found" }
> {
  try {
    const actor = await requirePermission("admin:roles:assign");
    assertCanAssignRole(actor, input.role);

    const store = getAuthStore();
    const target = await store.findUserByEmail(normalizeEmail(input.email));
    if (!target) {
      return { status: "not_found" };
    }

    const updated = await store.setUserRole(target.id, input.role);
    if (!updated) {
      return { status: "forbidden" };
    }

    return { status: "ok", email: updated.email, role: input.role };
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return {
        status: error.code === "unauthenticated" ? "unauthorized" : "forbidden",
      };
    }
    throw error;
  }
}
