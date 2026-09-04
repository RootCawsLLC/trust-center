# Trust Center

[![CI](https://github.com/RootCawsLLC/trust-center/actions/workflows/ci.yml/badge.svg)](https://github.com/RootCawsLLC/trust-center/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A vendor **trust center** (in the spirit of Vanta / SafeBase): a sleek public site
where prospects and customers browse your security, compliance, and audit
documentation, and a vendor admin console to manage it all — backed by an
immutable request ledger and Salesforce-based customer/lead classification.

Single Next.js app (public site + admin), Postgres via Prisma, S3 for document
blobs, Auth.js for admin authentication. Built to run on **AWS App Runner + RDS**.

---

## What it does

**Public trust center**
- Document library grouped by type (Policies, Procedures, Audits, Certifications,
  Reports, Whitepapers), each tagged **Public** or **Private** by the vendor.
- **Every** download is gated by a short form (name, work email, organization,
  country) — the "whitepaper gate" pattern. Nothing is downloadable anonymously.
- **Private** documents additionally require a **click-through NDA** (vendor's own
  text or a built-in template) before the file is released. Acceptance is recorded
  with signer name, email, a SHA-256 hash of the exact NDA text, timestamp, and IP.

**Vendor admin console** (`/admin`)
- Dashboard, document CRUD + upload, per-document public/private + NDA assignment.
- **Requests** — every capture, in an append-only ledger, filterable by
  customer/lead, showing matched Salesforce account or lead domain.
- **Sales leads** — non-customer domains, aggregated with request counts.
- **NDA templates**, **Users** (RBAC: Owner / Admin / Viewer, account creation),
  **Audit log**, and **Settings** (SSO + security posture).
- **Okta + Google SSO** scaffolded — auto-enabled when their env vars are set.

**Data intelligence**
- Each requester's email domain is matched against a Salesforce customer directory
  (a seeded **mock** table in this build; swap for a real SOQL query to go live).
- Match → classified **Customer** (with account name). No match → recorded as a
  **Sales lead** by domain. All of it visible to the vendor team in the admin console.

## Security controls

- **Immutable ledger.** `DownloadRequest`, `NdaAcceptance`, and `AuditLog` are
  append-only. Postgres `BEFORE UPDATE/DELETE` triggers reject any mutation
  (error `23001`), and the app connects with a least-privilege role (`trust_app`)
  that has only `INSERT`/`SELECT` on those tables. Verified by `npm test`.
- **RBAC** (Owner/Admin/Viewer) enforced server-side in the admin layout and every
  server action.
- **Audit logging** of downloads, NDA acceptances, and admin changes.
- **Private document storage** (S3 with SSE in prod; local disk in dev), served only
  through a gated, time-boxed download token — never a public object URL.
- Input validation (zod) everywhere, session hardening, security-conscious defaults.

See [SECURITY.md](SECURITY.md) for the full posture and UAT hardening checklist.

---

## Local development

Prerequisites: Node ≥ 22. No Docker required — a real Postgres 17 runs locally via
`embedded-postgres`.

```bash
npm install
npm run setup:local     # generates .env with a random AUTH_SECRET
npm run db:up           # starts local Postgres (see note below)
npm run db:migrate      # apply schema
npm run db:harden       # apply immutability triggers + least-priv role
npm run db:seed         # seed admin, mock Salesforce, sample documents
npm run dev             # http://localhost:3000
```

Seeded admin login: `admin@trustcenter.local` / `ChangeMe!Admin123` (Owner).
A read-only user (`viewer@trustcenter.local` / `ChangeMe!Viewer123`) is also created.

> **Windows note:** the local DB runs as a LocalSystem Windows service (`trustpg`).
> This is required because on a Windows administrator account the `postgres`
> binary refuses to run and console-launched servers are killed at each command
> boundary. `npm run db:up` registers and starts the service; `npm run db:down`
> stops it; `npm run db:remove` unregisters it. On macOS/Linux it runs via `pg_ctl`.

### Useful scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:up` / `db:down` / `db:status` / `db:remove` | Local Postgres lifecycle |
| `npm run db:migrate` / `db:migrate:dev` | Apply / create migrations |
| `npm run db:harden` | Apply immutability triggers + `trust_app` role |
| `npm run db:seed` | Seed demo data |
| `npm test` | Run the test suite (immutability + Salesforce matching) |

## Environment variables

See [`env.sample`](env.sample). Key ones:

| Var | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js signing secret (generate a random 32 bytes) |
| `STORAGE_DRIVER` | `local` (dev) or `s3` (prod) |
| `S3_BUCKET`, `AWS_REGION` | Document bucket + region (when `s3`) |
| `OKTA_ISSUER` / `OKTA_CLIENT_ID` / `OKTA_CLIENT_SECRET` | Enable Okta SSO |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enable Google SSO |
| `COMPANY_NAME` | Branding on the public site |

## Deployment (AWS)

Target architecture: **App Runner** (container) → **RDS Postgres**, with **S3** for
documents and **Secrets Manager** for credentials. Terraform lives in [`infra/`](infra/).
See [infra/README.md](infra/README.md) for the deploy runbook (finalized once the
image-build path is chosen).

## Project layout

```
src/app            public site, admin console, API routes
src/lib            prisma, auth, storage, salesforce, audit, rbac, validation
src/components     download modal + library, admin UI
prisma/            schema + migrations
scripts/           local Postgres, immutability hardening, seed
tests/             immutability + Salesforce matching tests
infra/             Terraform (AWS)
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
Copyright 2026 RootCawsLLC.
