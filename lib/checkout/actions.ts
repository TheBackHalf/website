"use server";

import { createCheckoutSession } from "@/lib/checkout/create-session";
import type { CreateCheckoutSessionInput } from "@/lib/checkout/create-session";

export async function startCheckoutAction(input: CreateCheckoutSessionInput) {
  return createCheckoutSession(input);
}
