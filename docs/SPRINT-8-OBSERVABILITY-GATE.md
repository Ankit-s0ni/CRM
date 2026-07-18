# Sprint 8 Observability Dashboard and Alert Gate

**Status:** Instrumentation and drill tooling complete; production dashboard and
alert-receipt evidence pending.

## Required dashboard

One release dashboard must filter by environment, service and release and expose:

| Signal | Window | GA budget / alert |
|---|---|---|
| API 5xx rate | 5 and 15 minutes | warning above 1%; critical above 5% |
| API latency | p50/p95/p99 over 15 minutes | critical when route p95 exceeds its load budget for 10 minutes |
| Punch/sync acceptance | 5 minutes | critical on sustained failures or idempotency conflicts above baseline |
| PostgreSQL, Redis and private S3 readiness | 1 minute | critical after 2 consecutive failed probes |
| Outbox unpublished/dead-letter depth | 5 minutes | warning on age/depth growth; critical on any durable dead letter |
| Payment provider latency/failure and webhook lag | 5 minutes | critical when successful billing state cannot be trusted |
| Dunning/suspension transitions | 15 minutes | warning on unexplained spike or stuck transition |
| Report/import/notification/deletion worker failures | 5 minutes | warning on retry growth; critical at dead letter/final failure |
| Retention backlog and partition horizon | daily | critical if expired rows remain or future partitions are missing |
| Mobile release rejection/update gate | release | critical if required version has no approved store binary |

Telemetry must contain request/release/tenant correlation identifiers only where
approved. Do not export names, email, phone, tokens, biometric scores/evidence,
payment tokens or raw coordinates. Sentry `sendDefaultPii` remains disabled.

## Correlated routing drill

Run from a production-like environment using real Sentry, OTLP and on-call
destinations:

```bash
NODE_ENV=production \
SENTRY_DSN=... \
OTEL_EXPORTER_OTLP_ENDPOINT=... \
OTEL_SERVICE_NAME=deltcrm-api \
RELEASE_VERSION=... \
DEPLOYMENT_ENVIRONMENT=staging \
OBSERVABILITY_ALERT_WEBHOOK_URL=... \
pnpm --filter api ops:observability-drill
```

The command prints one `drillId`. The monitoring gate passes only after the same
ID is visible in a Sentry issue, an OTel trace and the final on-call destination.
Archive screenshots/links, exporter timestamps, alert receipt/acknowledgement,
release SHA and operator under the `monitoringAlertReceipt` gate in
`artifacts/release/sprint8-ga-evidence.json`.

## Failure handling

- Missing configuration or non-production mode fails before emission.
- A non-2xx/timeout alert webhook fails the drill; it must not be marked PASS.
- Exporting an event is not receipt evidence. Operators must verify all three
  destinations and acknowledgement latency.
- Production alert rules must be exercised after routing/team changes and before
  each GA release candidate.
