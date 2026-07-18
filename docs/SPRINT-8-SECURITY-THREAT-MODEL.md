# Sprint 8 Security Threat Model

## Assets and trust boundaries

Critical assets are tenant identity and role data, attendance/location history,
biometric evidence, refresh tokens, platform authority, payment token references,
invoices, webhook payloads, audit logs, backups, and deletion evidence. Boundaries
are the public web/mobile clients, tenant API with RLS connection, platform API
with isolated runtime connection, workers/Redis, private object storage, payment
providers, notification gateway, observability exporters, and operators.

| Threat | Required mitigation | Verification |
|---|---|---|
| Cross-tenant IDOR/query | Tenant context derived server-side, RLS fail closed, no client-authoritative tenant IDs | RLS/isolation e2e |
| Platform privilege escalation | Separate JWT/audience/database connection, MFA, explicit permissions, fresh-MFA high-risk actions | Sprint 2 regression |
| Impersonation abuse | Reason, short expiry, narrow scope, billing/lifecycle denial, double audit | Platform impersonation e2e |
| Webhook forgery/replay | Raw-body HMAC/signature verification, unique provider event ID, payload hash conflict | Sprint 8 billing e2e |
| Duplicate charge/invoice | Idempotency keys, locked sequence, immutable invoice snapshot/checksum | Sprint 8 billing e2e |
| Token/code theft | Hash verification/reset codes at rest, short access tokens, revocable refresh tokens, log redaction | Auth integration/security scan |
| Biometric/location over-retention | Private S3, signed access, configurable policy, deletion jobs, 90-day raw-ping purge | Deletion/retention tests |
| Device/integrity bypass | Server-side attestation/liveness adapters and production fail-fast configuration | Sprint 6 provider tests |
| Queue replay/loss | Transactional outbox, leases, retries/backoff/dead-letter state, idempotent consumers | Outbox tests |
| Backup disclosure/corruption | Managed encryption/access control, checksum, isolated restore drill | PITR evidence |
| PII leakage to logs/telemetry | Pino redaction, no default Sentry PII, route-only spans, request-ID correlation | Observability tests/review |
| Dependency/supply-chain compromise | Lockfile, SBOM, dependency/SAST/secret scans, signed release artifacts | Release evidence |

## Abuse cases and release blockers

- A tenant or employee must never read another tenant's identifiers, exports,
  live map, invoices, or notification payloads.
- Support impersonation must never mutate billing, tenant lifecycle, credentials,
  biometric identity, or payment methods.
- A forged or modified webhook must return an authentication/conflict response
  before changing billing state.
- A deletion job must stop on legal hold, preserve required billing/audit records,
  and produce a verifiable completion receipt.
- Any confirmed cross-tenant exposure, payment duplication, auth bypass, leaked
  secret, or unresolved critical/high penetration finding blocks release.

Residual risks requiring external validation are payment-provider production
configuration, managed-cloud IAM/PITR, mobile platform attestation, notification
deliverability, legal retention/disclosure approval, and third-party penetration
testing.
