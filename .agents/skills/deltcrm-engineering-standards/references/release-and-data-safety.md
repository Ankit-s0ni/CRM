# Release And Production Data Safety

## Prohibited In Production

- `prisma migrate reset`
- `prisma db push`
- `prisma migrate dev`
- seed scripts unless an individually reviewed, idempotent production data operation was explicitly approved
- `DROP`, `TRUNCATE`, database recreation, volume removal, or replacing the production database
- destructive Git commands or deleting unknown server files/processes
- exposing secrets in commands, logs, screenshots, commits, or support messages

## Migration Design

1. Add nullable/new structures and indexes safely.
2. Deploy code capable of reading old and new representations when compatibility is needed.
3. Backfill deterministically in bounded, observable batches.
4. Switch reads/writes after verification.
5. Remove obsolete structures only in a later reviewed release after rollback is no longer dependent on them.

Assess table locks, index creation strategy, defaults, large backfills, RLS/grants, unique constraints, and rollback/forward-recovery behavior.

## Deployment Sequence

1. Confirm branch, commit, clean/reviewed diff, and release scope.
2. Verify a recent restorable production backup without printing credentials.
3. Record database migration status and PM2/process health.
4. Pull the exact approved commit.
5. Install dependencies when lockfile/manifests changed.
6. Generate Prisma/client/contracts when their sources changed.
7. Build API, worker, web, and other affected deployables.
8. Apply `prisma migrate deploy` only after migration review and backup verification.
9. Restart the existing named PM2 services with updated environment only when required.
10. Verify PM2 status/logs, API health/readiness, web response, login, tenant routing, and changed critical workflow.
11. Monitor errors and keep a forward-recovery or application rollback decision ready.

## Data-Safety Evidence

Before declaring success, retain backup timestamp/status, pre/post migration status, applied migration names, build results, PM2 process names/status, health and critical smoke-test results, and confirmation that no seed/reset/destructive command ran.

Never promise that data is safe solely because a migration command exited successfully.
