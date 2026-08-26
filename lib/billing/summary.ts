import { getBillingStore } from "@/lib/billing/store";
import { resolveStripeCustomerIdForUser } from "@/lib/billing/customer";
import {
  isEntitlementCurrentlyActive,
  userHasActiveEntitlement,
} from "@/lib/billing/entitlements";
import type { PurchaseRecord } from "@/lib/billing/types";
import { getCheckoutOffer, type CheckoutOfferId } from "@/lib/checkout/offers";
import { getStripe } from "@/lib/checkout/stripe";

export type BillingDocument = {
  id: string;
  kind: "invoice" | "receipt";
  label: string;
  offerId?: CheckoutOfferId;
  status: "paid" | "open" | "void" | "uncollectible" | "failed" | "draft";
  amountCents?: number;
  currency?: string;
  createdAt: string;
  hostedUrl?: string;
};

export type BillingPurchaseView = {
  offerId: CheckoutOfferId;
  offerName: string;
  status: PurchaseRecord["status"];
  createdAt: string;
  amountCents?: number;
  currency?: string;
  isOneTime: boolean;
  cancellationAvailable: boolean;
};

export type BillingSummary = {
  hasStripeCustomer: boolean;
  stripeCustomerId?: string;
  communitySubscriptionActive: boolean;
  journeyAccess: boolean;
  communityAccess: boolean;
  communityEndsAt?: string;
  purchases: BillingPurchaseView[];
  documents: BillingDocument[];
  canOpenPortal: boolean;
  cancellationAvailable: boolean;
};

function isSuccessfulPurchase(purchase: PurchaseRecord): boolean {
  return purchase.status === "paid";
}

export async function getBillingSummaryForUser(
  userId: string,
): Promise<BillingSummary> {
  const store = getBillingStore();
  const [purchases, entitlements, journeyAccess, communityAccess] =
    await Promise.all([
      store.findPurchasesByUserId(userId),
      store.findEntitlementsByUserId(userId),
      userHasActiveEntitlement(userId, "journey_access"),
      userHasActiveEntitlement(userId, "community_access"),
    ]);

  const customerId = await resolveStripeCustomerIdForUser(userId);
  const communityEntitlement = entitlements.find(
    (entry) => entry.kind === "community_access",
  );
  const communitySubscriptionActive = Boolean(
    communityEntitlement?.stripeSubscriptionId &&
      isEntitlementCurrentlyActive(communityEntitlement),
  );

  const purchaseViews: BillingPurchaseView[] = purchases
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((purchase) => {
      const offer = getCheckoutOffer(purchase.offerId);
      return {
        offerId: purchase.offerId,
        offerName: offer.name,
        status: purchase.status,
        createdAt: purchase.createdAt,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        isOneTime: offer.mode === "payment",
        cancellationAvailable:
          purchase.offerId === "community" &&
          purchase.status === "paid" &&
          communitySubscriptionActive,
      };
    });

  const documents: BillingDocument[] = [];

  if (customerId) {
    const stripe = getStripe();
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 24,
    });

    for (const invoice of invoices.data) {
      // Do not present failed/unpaid invoices as successful receipts.
      if (invoice.status === "paid" || invoice.status === "open") {
        const invoiceId = invoice.id ?? `invoice_${invoice.created}`;
        documents.push({
          id: invoiceId,
          kind: "invoice",
          label: invoice.number ?? invoiceId,
          status: invoice.status === "paid" ? "paid" : "open",
          amountCents: invoice.amount_paid || invoice.amount_due || undefined,
          currency: invoice.currency ?? undefined,
          createdAt: new Date(invoice.created * 1000).toISOString(),
          hostedUrl: invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? undefined,
        });
      }
    }
  }

  for (const purchase of purchases.filter(isSuccessfulPurchase)) {
    if (!purchase.stripePaymentIntentId) {
      continue;
    }

    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(
        purchase.stripePaymentIntentId,
        { expand: ["latest_charge"] },
      );

      if (paymentIntent.status !== "succeeded") {
        continue;
      }

      const charge =
        typeof paymentIntent.latest_charge === "object" &&
        paymentIntent.latest_charge &&
        !("deleted" in paymentIntent.latest_charge)
          ? paymentIntent.latest_charge
          : null;

      const receiptUrl = charge?.receipt_url ?? undefined;
      if (!receiptUrl) {
        continue;
      }

      documents.push({
        id: charge?.id ?? paymentIntent.id,
        kind: "receipt",
        label: getCheckoutOffer(purchase.offerId).name,
        offerId: purchase.offerId,
        status: "paid",
        amountCents: purchase.amountCents ?? paymentIntent.amount_received,
        currency: purchase.currency ?? paymentIntent.currency,
        createdAt: purchase.createdAt,
        hostedUrl: receiptUrl,
      });
    } catch {
      // Skip unreadable historical payment intents.
    }
  }

  documents.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    hasStripeCustomer: Boolean(customerId),
    stripeCustomerId: customerId,
    communitySubscriptionActive,
    journeyAccess,
    communityAccess,
    communityEndsAt: communityEntitlement?.endsAt,
    purchases: purchaseViews,
    documents,
    canOpenPortal: Boolean(customerId),
    cancellationAvailable: communitySubscriptionActive,
  };
}
