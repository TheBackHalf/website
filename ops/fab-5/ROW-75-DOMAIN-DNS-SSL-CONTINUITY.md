# ROW-75-DOMAIN-DNS-SSL-CONTINUITY

**Status:** NOT READY — canonical DNS missing. Not Complete. Founder acceptance not recorded.  
**Evidence:** `ops/fab-5/runs/row-75-domain-dns-ssl-validation.json`  
**Founder review:** http://localhost:3000/_internal/row75-domain-dns-ssl-review

Long-running execution stopped. Validator was not re-run. DNS was not re-polled. Row 74 was not redone. DNS, nameservers, MX, Vercel domains, and certificates were not changed.

## Work preserved (this interrupted run + prior artifacts)

- Time-bounded DNS-over-HTTPS (2026-08-24, 8s, no retries): SOA present; NS `anirban.ns.cloudflare.com` / `ulla.ns.cloudflare.com`; apex A/AAAA/CNAME empty; www NXDOMAIN.
- Production host `https://website-two-psi-49.vercel.app` HTTP 200; TLS `*.vercel.app` valid through 2026-09-26.
- Review page `/_internal/row75-domain-dns-ssl-review` reads persisted evidence (does not live-query DNS).
- Row 74 PIR RDAP (2026-08-25, imported, not re-queried): registrar Cloudflare, Inc. IANA 1910; registered 2026-07-25; expires 2027-07-25; status client transfer prohibited; Cloudflare recovery documented; Cloudflare MFA INACTIVE — Founder risk accepted.
- Vercel Production already lists aliases `thebackhalf.org` and `www.thebackhalf.org`. Attachment is waiting on Cloudflare records.

## Cause of stall

RDAP.org and TLS/HTTP against unresolved `thebackhalf.org` / `www`. Those cannot succeed until Founder adds Cloudflare address records. Later runs repeated the same waits instead of importing Row 74 and stopping.

## Required Cloudflare DNS records (not applied)

Do not change MX, nameservers, or registrar ownership. Proxy = DNS only (grey cloud) so Vercel can issue the certificate.

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `10.0.1.2` | DNS only |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

## Domain / certificate recovery procedure

1. Detect: `thebackhalf.org` does not resolve, certificate invalid, or Cloudflare/Vercel login lost.
2. Initiate: Founder for Cloudflare registrar/DNS identity. Imani for Vercel domain/certificate technical follow-up. Michelle coordinates.
3. Method: Cloudflare account recovery + Cloudflare Support (Row 74). Do not unlock transfer. Do not change nameservers. Restore DNS records above if missing. After DNS, Vercel Settings → Domains must show Valid; Vercel auto-renews the Let’s Encrypt cert.
4. If Cloudflare remains inaccessible: production continues on `https://website-two-psi-49.vercel.app`. Source remains on GitHub `TheBackHalf/website`.
5. Verify after: apex and www resolve to Vercel; HTTPS valid for both hostnames; MX unchanged.
6. Notify: Michelle ops. Founder for ownership. Imani if the public URL is affected.

## Founder dashboard checks (not inferred)

- Auto-renew: Cloudflare → Domain Registration → thebackhalf.org → Auto-renew ON.
- Billing: Cloudflare → Billing → Payment methods → valid method on file.
- Expiration alerts: Cloudflare → Notifications → domain expiration/renewal to Founder mailbox.
- After DNS: Vercel → back-half/website → Settings → Domains → Valid for apex and www.
