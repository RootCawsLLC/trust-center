# Privacy

What this Trust Center collects, why, how long it is kept, and who it is shared
with. This describes the application as built; a production deployment should
reconcile this document with the operator's own privacy policy and applicable law
(GDPR/CCPA and any sector rules) before going live.

> This is a pre-UAT review build. See [SECURITY.md](SECURITY.md) for the security
> posture and the hardening checklist that must be completed before real data is
> handled.

## What is collected

**When a visitor requests a document** (`DownloadRequest`):

| Data | Field | Why |
| --- | --- | --- |
| Full name | `requesterName` | Attribute the request and the NDA acceptance to a person |
| Work email | `requesterEmail` | Contact + identity for the access request |
| Email domain | `emailDomain` | Classify the requester's organization (customer vs. lead) |
| IP address | `ipAddress` | Security auditing and abuse investigation |
| User agent | `userAgent` | Security auditing |
| Document requested | `documentTitle` (snapshot) | Record what access was granted |

**When a visitor accepts a click-through NDA** (`NdaAcceptance`): the NDA template
name, a SHA-256 hash of the exact NDA text accepted (`ndaBodyHash`), and the
acceptance timestamp — a non-repudiable record that this person agreed to these
terms at this time.

**For administrators** (`User`, `Account`, `Session`): email, display name, and
either a bcrypt password hash (local/credentials admins) or SSO tokens
(access/refresh/id tokens from Okta/Google when SSO is wired). Admin UI
preferences are stored in `SavedView`.

**Lead classification** (`SalesLead`, `MockSalesforceCustomer`): the requester's
**email domain** is matched against a customer directory to classify the request.
Matching is on the domain only, and there is **no third-party data brokering** —
data is not sold or shared with data brokers.

## What is NOT collected

- No tracking or analytics SDKs, no advertising identifiers, no third-party
  telemetry (verify with a dependency scan before each release).
- No payment or financial data.
- No document *contents* are treated as personal data; documents are the
  vendor's own material, served through a gated, time-boxed download token.

## How consent works

Access is gated behind an explicit, per-document **click-through NDA**. A document
is released only after the requester supplies the identifying details above and
accepts the NDA. The acceptance is recorded in the append-only ledger described
below, which is the record of consent.

## Retention and deletion

- `DownloadRequest`, `NdaAcceptance`, and `AuditLog` are an **append-only,
  immutable ledger**: Postgres `BEFORE UPDATE/DELETE` triggers reject any mutation
  (error `23001`), and the app's runtime database role has only `INSERT`/`SELECT`
  on those tables. They are retained deliberately as consent and access records.
- Because these records are immutable by design, a production operator handling a
  deletion/erasure request must do so through a controlled, audited administrative
  path (a privileged role, outside the app's runtime role) and record the action —
  the application runtime cannot and must not delete ledger rows on its own.
- Mutable content (documents, NDA templates, seeded users) can be changed or
  removed through the admin console and the seed script.

## Who it is shared with (subprocessors)

| Recipient | What it sees | When |
| --- | --- | --- |
| Identity provider (Okta / Google) | Admin authentication | Only when SSO is wired; scaffolded and off by default |
| Salesforce | Requester email domain, for lead classification | Only when the mock table is replaced with a live integration; a seeded mock by default |
| Cloud host (AWS: App Runner + RDS + S3) | All stored data at rest | In a hosted deployment |

No other third parties receive this data.

## Data residency

The reference deployment runs in AWS region **us-east-1** (United States). Data at
rest (RDS, S3) resides in that region. Operators serving users in other
jurisdictions should choose an appropriate region and address cross-border
transfer requirements before going live.

## Security of this data

- Passwords are hashed with bcrypt; SSO tokens are stored server-side.
- The consent/audit ledger is immutable at the database level, not merely by
  application convention.
- Documents live in private storage (S3 with server-side encryption in
  production; local disk in development) and are served only through a gated,
  time-boxed token — never a public object URL.
- All external input is validated with zod; storage keys are normalized to be
  traversal-defensive.
- In transit, production is served over TLS.

## Requests and contact

This is an internal pre-UAT review build. Privacy or data questions, and any
data-subject request (access, correction, erasure), should be routed to the
vendor security/privacy team through the normal internal channel. A production
deployment must publish a real contact and a defined response process here.
