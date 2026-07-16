# Sprint 3 Attendance Configuration Runbook

## Runtime Dependencies

- PostgreSQL on `5433` with `DATABASE_URL`, `DATABASE_URL_APP`, and `DATABASE_URL_PLATFORM` configured.
- Redis on `6379` for policy resolver caching and BullMQ roster imports.
- S3-compatible private storage for logos and roster CSV files.
- API on `4001`, tenant web on `4002`, and a worker process for queued imports.

Use `IMPORT_QUEUE_MODE=inline` only for deterministic tests. Normal environments use `worker`; tune `IMPORT_WORKER_CONCURRENCY` conservatively because each job writes row results transactionally.

## Deployment Order

1. Run `pnpm --filter api exec prisma migrate deploy`.
2. Run `pnpm --filter api exec prisma db seed` for local/demo environments only.
3. Start Redis and private object storage.
4. Start the API with `pnpm dev:api`.
5. Start the worker with `pnpm --filter api start:worker`.
6. Start the web app with `pnpm dev:web`.
7. Verify `http://localhost:4001/healthz` and `http://localhost:4001/api/docs`.

## Resolver Cache

Policy cache keys include tenant, generation, employee, and date. Configuration mutations increment the tenant generation only after the database transaction commits. Cache entries expire after 30 seconds.

If Redis is unavailable, policy resolution bypasses the cache and reads PostgreSQL; correctness is preserved at higher database cost. Restore Redis and monitor API latency. Do not manually copy cache keys between tenants. A safe tenant cache reset is an increment of `attendance:policy-version:<tenant-id>`.

## Roster Imports

The client requests a private upload key, uploads CSV, registers the import with an idempotency key, and polls the import resource. The worker queue is `roster-imports`.

Required CSV columns are `employee_code`, `shift_name`, and `roster_date`. Row errors expose stable safe codes for malformed dates, unknown employees/shifts, duplicates, conflicts, and holidays. Re-registering the same object and idempotency key returns the existing job without duplicating rosters or audit/outbox events.

If jobs remain queued:

1. Confirm Redis connectivity and that the worker process is running.
2. Check the import job status and `failureReason`; never expose raw worker exceptions to users.
3. Restore object-storage access if the private CSV cannot be read.
4. Retry the same job/idempotency key after correcting infrastructure; row persistence prevents duplicate processing.

## Security Checks

- Tenant routes require bearer auth, matching `x-tenant-id`, an active Attendance module, and persisted permission keys.
- Configuration and roster-import tables use fail-closed RLS; an `app_user` session without `app.tenant_id` must return zero rows.
- Logo and CSV object keys must start with the tenant ID and remain private.
- Configuration mutations must create tenant audit and outbox records.
- Never use `app_admin` or `platform_runtime` as the tenant API runtime connection.

## Verification Commands

```bash
pnpm security:check
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api test:e2e --runInBand
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web test:e2e
pnpm build
```

The Sprint 3 acceptance fixture is `apps/api/test/fixtures/rosters-60.csv`: 60 rows, 56 accepted, and 4 stable row errors.
