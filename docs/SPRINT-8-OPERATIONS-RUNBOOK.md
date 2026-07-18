# Sprint 8 Production Operations Runbook

## Ownership and severity

The primary on-call owns initial triage; billing, security/privacy, and database
owners join when their boundary is affected. `SEV-1` means login, punching,
billing integrity, cross-tenant exposure, or data loss is occurring. Acknowledge
SEV-1 within 10 minutes and SEV-2 within 30 minutes. Record release, request IDs,
tenant IDs, start/end timestamps, impact, commands, and decision owner.

## Standard triage

1. Check `/healthz`, `/readyz`, `/platform/health`, payment-provider health, queue depth, dead letters, PostgreSQL saturation, Redis, S3, Sentry, and OTel traces.
2. Correlate by request ID; never paste tokens, biometric keys, face scores, payment tokens, or raw location histories into tickets.
3. Stop rollout or use the release rollback when error rate, tenant isolation, invoice integrity, or punch acceptance breaches its budget.
4. Preserve audit records and provider webhook payload hashes before remediation.

## Payment provider outage and dunning

- Confirm provider status and webhook lag before retrying. Do not replay a webhook with a changed body or event ID.
- Pause automated dunning transitions when provider success cannot be trusted; do not directly mutate subscription or tenant status.
- Resume through the idempotent dunning worker. Validate payment transaction, invoice, subscription history, lifecycle audit, and tenant access recovery.
- Manual retry requires `platform.billing.manage`, fresh platform MFA, no impersonation session, and an operator reason.

## Impersonation

- Require a support ticket, target tenant, purpose, reason, shortest useful scope, and fresh MFA.
- Billing mutation, platform lifecycle mutation, credential changes, and biometric export remain forbidden.
- End the session immediately after diagnosis and reconcile platform system audit with tenant audit.

## Tenant deletion and biometric purge

- Confirm the tenant, legal-hold decision, approver, and retention obligations before scheduling.
- Scheduling immediately suspends the tenant and revokes refresh tokens. The worker anonymizes identities, deletes private biometric/location evidence, and preserves billing/audit records.
- Verify job status `COMPLETED`, evidence receipt hash, S3 deletion, anonymized user/employee fields, revoked payment methods, and both system/tenant audit attribution.
- A failed job is retried only through the explicit platform deletion retry action; never delete records manually without incident approval.

## Backup and recovery drill

Create and validate a backup with `pnpm ops:backup`. Restore only into a database
whose name ends `_restore_drill` or `_pitr_drill` using
`pnpm ops:restore-drill`. For managed PostgreSQL PITR, restore the latest snapshot
to the selected timestamp, run `restore-smoke.sql`, compare the last committed
invoice/attendance/outbox timestamps, and record measured RPO/RTO. Never run the
restore command against production.

## Retention verification

Run `pnpm ops:retention-audit` before and after the worker cycle. Confirm two
future partitions exist for attendance, verification logs, and field pings;
expired notifications/tokens/challenges trend to zero; and raw pings older than
90 days are removed. Archive query output with release evidence.

## Observability alerts

Alerts must route through `OBSERVABILITY_ALERT_WEBHOOK_URL`. Page on sustained
5xx rate, failed punch/sync budget, database/Redis/S3 unavailability, outbox dead
letters, webhook lag, payment failures, deletion failures, partition creation
failure, and retention backlog. Sentry must not collect default PII.

Before GA, run `pnpm --filter api ops:observability-drill` with production-like
Sentry, OTLP and alert-webhook configuration. Record the emitted `drillId` and
prove the same ID reached all three destinations. Dashboard panels, budgets,
required environment and evidence rules are defined in
`docs/SPRINT-8-OBSERVABILITY-GATE.md`.
