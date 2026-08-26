/**
 * Ops route classifiers for middleware and Row 20 access tests.
 * Ticket administration is support-scoped. Super-admin ops remain admin-only.
 */

export function isSupportTicketAdminPath(pathname: string): boolean {
  return (
    pathname === "/ops/admin/support" ||
    pathname.startsWith("/ops/admin/support/") ||
    pathname === "/es/ops/admin/support" ||
    pathname.startsWith("/es/ops/admin/support/") ||
    pathname.startsWith("/api/admin/support/")
  );
}

export function isArchitectPath(pathname: string): boolean {
  return (
    pathname === "/architect" ||
    pathname.startsWith("/architect/") ||
    pathname === "/es/architect" ||
    pathname.startsWith("/es/architect/")
  );
}

export function isAdminOpsPath(pathname: string): boolean {
  if (isSupportTicketAdminPath(pathname)) return false;
  return (
    pathname === "/ops/admin" ||
    pathname.startsWith("/ops/admin/") ||
    pathname === "/es/ops/admin" ||
    pathname.startsWith("/es/ops/admin/") ||
    pathname.startsWith("/api/admin/")
  );
}

export function isSupportOpsPath(pathname: string): boolean {
  if (
    pathname === "/api/support/request" ||
    pathname.startsWith("/api/support/request/") ||
    pathname === "/api/support/inbound" ||
    pathname.startsWith("/api/support/inbound/")
  ) {
    return false;
  }
  return (
    pathname === "/ops/support" ||
    pathname.startsWith("/ops/support/") ||
    pathname === "/es/ops/support" ||
    pathname.startsWith("/es/ops/support/") ||
    pathname.startsWith("/api/support/") ||
    isSupportTicketAdminPath(pathname)
  );
}
