import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/types";

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("bh-session")?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
