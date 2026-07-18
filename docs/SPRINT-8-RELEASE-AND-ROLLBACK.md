# Sprint 8 Release and Rollback Plan

## Forward release

1. Freeze the release SHA; generate contracts, SBOM/scans, API/web/mobile artifacts and checksums.
2. Confirm secrets/config validation, managed backup/PITR health, provider credentials, alert routing and legal/store URLs.
3. Apply additive migrations, deploy workers, deploy API, then web/mobile policy. Run health, auth, billing webhook, punch/sync and invoice smoke tests.
4. Enable traffic progressively and watch 5xx, latency, punch acceptance, queue/dead-letter depth, webhook lag and payment failures.

## Rollback

- Stop traffic increase and disable affected jobs/provider ingestion before changing state.
- Roll back web/API/workers to the last schema-compatible release. Mobile force-upgrade policy must never require a version that was rolled back or rejected by a store.
- Migrations in this sprint are additive; do not drop billing/deletion data during application rollback. Use a corrective forward migration for schema defects.
- Do not PITR production over the existing cluster. Restore to an isolated cluster, verify, then perform an approved cutover only for confirmed data-loss recovery.
- Reconcile outbox, webhook receipts, invoice sequence/checksums, payment transactions, dunning and tenant lifecycle before reopening writes.

Record the trigger, decision owner, versions, database state, commands, start/end,
customer impact, reconciliation queries and post-incident actions in release evidence.
