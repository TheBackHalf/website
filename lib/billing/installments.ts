/**
 * Launch policy: installments are not offered.
 * Row 69 satisfies “handle installments” by ensuring no installment entitlement path exists.
 */
export const INSTALLMENTS_OFFERED_AT_LAUNCH = false;

export function assertNoInstallmentEntitlementPath(): void {
  if (INSTALLMENTS_OFFERED_AT_LAUNCH) {
    throw new Error("Installment entitlement path is not approved for launch.");
  }
}
