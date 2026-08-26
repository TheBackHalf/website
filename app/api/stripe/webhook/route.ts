import { NextResponse } from "next/server";
import { processStripeWebhookEvent } from "@/lib/billing/process-webhook";
import {
  constructStripeEvent,
  isStripeWebhookConfigured,
} from "@/lib/billing/webhook-verify";
import { recordLaunchOpsError } from "@/lib/launch-ops-errors/record";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "webhook_not_configured" },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event;
  try {
    event = constructStripeEvent(payload, signature);
  } catch {
    await recordLaunchOpsError({
      productArea: "payment",
      errorCategory: "stripe_invalid_signature",
      route: "/api/stripe/webhook",
      service: "stripe",
      safeCode: "invalid_signature",
      statusCode: 400,
      severity: "HIGH",
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event);

    if (result.status === "failed") {
      await recordLaunchOpsError({
        productArea: "payment",
        errorCategory: "stripe_webhook_processing_failed",
        route: "/api/stripe/webhook",
        service: "stripe",
        safeCode: "webhook_failed",
        statusCode: 500,
        severity: "CRITICAL",
      });
      return NextResponse.json(
        { received: true, status: result.status },
        { status: 500 },
      );
    }

    return NextResponse.json({
      received: true,
      status: result.status,
    });
  } catch {
    await recordLaunchOpsError({
      productArea: "payment",
      errorCategory: "stripe_webhook_unhandled_failure",
      route: "/api/stripe/webhook",
      service: "stripe",
      safeCode: "webhook_unhandled",
      statusCode: 500,
      severity: "CRITICAL",
    });
    return NextResponse.json({ error: "webhook_unhandled" }, { status: 500 });
  }
}
