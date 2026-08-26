import {
  AccessDeniedError,
  requirePermission,
} from "@/lib/auth/access";
import { toLuminaMemoryControlsView } from "@/lib/lumina/memory/retrieve";
import { getLuminaMemoryStore } from "@/lib/lumina/memory/store";
import type { LuminaMemoryControlsView } from "@/lib/lumina/memory/types";

export async function getLuminaMemoryControlsForSession(): Promise<LuminaMemoryControlsView | null> {
  try {
    const actor = await requirePermission("architect:lumina_memory:manage_own");
    const memory = await getLuminaMemoryStore().findMemoryForUser(
      actor.user.id,
    );
    return toLuminaMemoryControlsView(memory);
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return null;
    }
    throw error;
  }
}
