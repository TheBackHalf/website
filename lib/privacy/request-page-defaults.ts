import { getServerSession } from "@/lib/auth/session/server";
import { getAuthStore } from "@/lib/auth/store";

export async function loadPrivacyRequestPageDefaults(): Promise<{
  sessionVerified: boolean;
  defaults: {
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    timeZone?: string;
  };
}> {
  const session = await getServerSession().catch(() => null);
  if (!session?.sub) {
    return { sessionVerified: false, defaults: {} };
  }
  const user = await getAuthStore().findUserById(session.sub);
  if (!user || user.deletedAt) {
    return { sessionVerified: false, defaults: { email: session.email } };
  }
  return {
    sessionVerified: true,
    defaults: {
      name: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      timeZone: user.timeZone,
    },
  };
}
