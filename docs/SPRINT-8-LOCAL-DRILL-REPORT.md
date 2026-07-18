# Sprint 8 Local Drill Report

**Executed:** July 18, 2026  
**Environment:** Local macOS host, API on `127.0.0.1:4001`, PostgreSQL 16.14
in Docker, k6 2.1.0. This report is repository verification and is not the
production-like GA capacity report.

## Database recovery

- A PostgreSQL custom archive was created, validated with `pg_restore --list`,
  and checksummed with SHA-256.
- The archive was restored into the guarded disposable database
  `hrms_restore_drill`.
- The PostgreSQL 18.3 client to PostgreSQL 16.14 compatibility path was
  exercised successfully.
- Restore smoke checks passed for migrations, tenants, attendance, invoices,
  and invalid tenant-user references.
- Measured local restore time: 1 second. This does not establish managed-service
  RPO/RTO or PITR correctness.

## Retention and partitions

- `pnpm ops:retention-audit` found 15 current/future/default partitions.
- Expired notifications, verification tokens, integrity challenges, and field
  pings older than 90 days all had zero pending rows.
- `pnpm ops:partition-audit` passed production catalog checks and transactional
  July/August/default month-edge routing probes.

## Payment-provider outage

The Sprint 8 billing PostgreSQL acceptance suite directed an authenticated,
MFA-protected manual payment retry to an unreachable provider endpoint. The API
returned a durable failed payment transaction with
`PAYMENT_PROVIDER_UNREACHABLE`, entered dunning, recorded both platform and
tenant audits, suspended after the configured progression, and recovered after
a valid signed success webhook. Webhook replay, conflicting payload, and
out-of-order failure checks remained green.

## Local k6 smoke

Each profile ran for five seconds at one arrival per second using short-lived
local sessions. All configured thresholds passed.

| Profile | Requests | HTTP failure | Checks | p95 |
|---|---:|---:|---:|---:|
| Punch | 6 | 0% | 100% | 70.2 ms |
| Offline sync | 5 | 0% | 100% | 52.6 ms |
| Report queue | 5 | 0% | 100% | 33.1 ms |

Machine-readable summaries and checksums are in
`artifacts/load/sprint8-local/`.

Field ping and live-board profiles parsed successfully in k6 but were not run:
the local Acme fixture does not license `FIELD_TRACKING`, and changing a real
tenant entitlement solely to make a load test green would invalidate the test.

## Remaining GA exercises

- Run all five profiles at documented target rates and durations in an isolated
  production-like environment with role-specific identities and field fixtures.
- Execute managed PostgreSQL snapshot restore and timestamp PITR, recording
  measured RPO/RTO and invoice/attendance/outbox cutoffs.
- Deliver a real provider outage/alert drill with provider, Sentry, OTel, and
  on-call receipt timestamps.
