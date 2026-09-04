# Security posture

This documents the security controls implemented in the Trust Center, the
deliberate limitations of this review build, and the hardening checklist to
complete before UAT.

## Controls implemented

### Immutable request & consent ledger
- `DownloadRequest`, `NdaAcceptance`, and `AuditLog` are append-only.
- Enforced two ways: (1) Postgres `BEFORE UPDATE OR DELETE` triggers that
  `RAISE EXCEPTION` (SQLSTATE `23001`); (2) a least-privilege runtime role
  (`trust_app`) granted only `SELECT, INSERT` on those tables — no `UPDATE`/`DELETE`
  privilege at all.
- The triggers fire for **every** role, so append-only holds even for the database
  owner. In this build the app connects as the owner and is still blocked from
  mutating the ledger; pointing the app at the `trust_app` role is an additional
  UAT hardening step (below).
- A superuser can still `TRUNCATE`/disable triggers directly — that is an accepted,
  auditable break-glass path, not something the application can do.
- Verified by `tests/immutability.test.mjs`.

### Authentication & authorization
- Admin authentication via Auth.js. Credentials (bcrypt, cost 12) for the seeded
  admin; Okta + Google OIDC scaffolded and gated behind env presence.
- Role-based access control (Owner/Admin/Viewer) enforced server-side in the admin
  layout and in every server action (`requireSession` / `requireWrite` /
  `requireOwner`), not just in the UI.
- Guardrails: you cannot demote or deactivate your own account, and the system
  refuses to remove the last active Owner.
- Middleware provides a fast unauthenticated redirect; it is not the security
  boundary — server-side checks are.

### Document access
- Documents are private blobs (S3 with SSE-S256 in prod; local disk in dev). They
  are never exposed via a public object URL.
- Downloads are released only through a single-use-ish, time-boxed grant token
  (15 min TTL) issued after the gate (form, plus NDA for private docs) is satisfied.
- The download endpoint re-checks that a private document has a recorded NDA
  acceptance before streaming bytes (defense in depth).

### Data capture & privacy
- Every download requires identifying details (name, work email, org, country).
- Non-customer domains are tracked as sales leads; personal-email domains are
  flagged. No third-party data brokering.
- Audit entries record actor, action, target, IP, and structured metadata.

### Input handling
- All external input validated with zod (download form, NDA acceptance, document,
  NDA template, and user schemas).
- Storage keys are app-generated with traversal-defensive normalization.

## Deliberate limitations of this review build

- **SSO is scaffolded, not wired.** Okta/Google providers are implemented but off
  until real tenant credentials are supplied. The seeded credentials admin is the
  login path for review.
- **Salesforce is a seeded mock table** (`MockSalesforceCustomer`). The matching
  logic is isolated in `src/lib/salesforce.ts`; going live means replacing one
  function with a real SOQL query.
- **NDA-accept uses the request id as the capability** to attach consent. Request
  ids are unguessable cuids and attaching consent leaks no data, but a signed token
  would be stronger; noted for hardening.
- **Single tenant** (one vendor). No email notifications. No custom domain (the
  App Runner URL is used for review).

## Known issues / watch-items

- **postcss advisory (GHSA-r28c-9q8g-f849)** is pulled in transitively via Next.js's
  bundled postcss. It is a build-time source-map path-traversal issue affecting
  processing of untrusted CSS; this app processes only its own CSS, so runtime
  exposure is negligible. The upstream fix is Next 16 (a breaking upgrade) —
  tracked, not taken, for this build. Re-check with `npm audit` before UAT.

## UAT hardening checklist

- [ ] Wire real Okta + Google OIDC (set env + callback URLs), provision users.
- [ ] Replace the mock Salesforce table with a live SOQL/API integration.
- [ ] Point the app runtime at the least-privilege `trust_app` role (run
      migrations as the owner, serve requests as `trust_app`).
- [ ] Rotate `AUTH_SECRET` and all seeded passwords; remove seed users.
- [ ] Replace the demonstration NDA template with approved legal language.
- [ ] Set RDS `publicly_accessible = false` and run migrations via a bastion/CI
      rather than from a workstation IP.
- [ ] Put AWS WAF in front (rate limiting, common rule set) if exposed publicly.
- [ ] Confirm S3 bucket public-access-block and SSE; enable access logging.
- [ ] Enable RDS automated backups/retention appropriate to UAT.
- [ ] Add a custom domain + TLS.
- [ ] Re-run `npm audit` and address anything material.

## Reporting

This is a pre-UAT build for internal review. Route findings to the vendor security
team through the normal internal channel.
