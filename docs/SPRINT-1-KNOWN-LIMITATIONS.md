# Sprint 1 Known Limitations

Sprint 1 satisfies the organization, employee, access-control, import, audit, and tenant-isolation exit criteria. The following production operations are intentionally deferred and do not change the API contract delivered by this sprint.

## Deferred Operations

- Outbox events are created atomically with quota mutations, but a production broker publisher, retry policy, and dead-letter process are not yet configured.
- Import upload URLs expire after 15 minutes, but automated object retention and deletion are not yet scheduled.
- CSV uploads enforce MIME type and a 5 MiB declared-size limit. A strict `.csv` filename rule, object metadata verification, and configurable row-count ceiling should be added before public self-service imports.
- Verification and invitation tokens are hash-stored, expiring, and single-use, but production email-provider delivery and templates are not connected.

## Dependency Warning

The passing e2e suite emits a `pg` deprecation warning about overlapping `client.query()` calls. Trace output points into Prisma 7.8's `@prisma/adapter-pg` query interpreter rather than application query code. It does not fail tests on `pg` 8.22, but Prisma and the adapter must be upgraded or verified before adopting `pg` 9.

## Verification Baseline

- Build/typecheck: passed
- ESLint: passed with zero findings
- Unit: 12 suites, 18 tests passed
- E2E: 8 suites, 22 tests passed
- RLS: tenant A/B reads, missing-context fail-closed behavior, and append-only audit privileges passed
- OpenAPI: exported to `docs/openapi.json`
