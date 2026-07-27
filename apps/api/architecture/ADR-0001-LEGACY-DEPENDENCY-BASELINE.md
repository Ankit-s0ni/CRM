# ADR-0001: Freeze Legacy Dependency Cycles

- Status: Accepted, temporary exception
- Owner: Backend architecture group
- Date: 2026-07-20
- Review/removal date: 2026-10-31

## Context

The existing API grew feature-by-feature. Four exact internal imports and two legacy
dependency groups remain after the Sprint 9 composition-root and public-contract work.
A big-bang move would risk tenant deletion, billing and attendance behavior.

## Decision

Freeze the exact cycles in `module-boundaries.json`; CI rejects any new edge or cycle.

1. `billing -> platform`: move platform billing orchestration behind Platform-owned
   adapters and expose Billing commands/readers through `billing/public.ts`.
2. `platform -> biometrics`: replace tenant deletion's direct storage dependency with an
   Attendance-owned tenant-data deletion port.
3. The Attendance internal cycle is contained inside one product and will be removed as
   runtime/configuration/verification use cases move behind Attendance application ports.

## Amendment — 2026-07-27: repository interfaces in `domain/`

Six `*.repository.interface.ts` files under `domain/` import `@prisma/client` for entity
and `Prisma.*` input types, violating the framework-free `domain` rule. They were failing
`architecture:check` unrecorded, which left the whole check red and unusable as a gate for
new work. They are now listed in `legacyDomainFrameworkFiles`:

- `src/platform/organization/domain/employee.repository.interface.ts`
- `src/products/attendance/configuration/{holidays,offices,policies,rosters,shifts}/domain/*.repository.interface.ts`

Recording them freezes the debt without endorsing it — CI still rejects any *new* domain
file that imports a framework. The fix is to express these interfaces in terms of
product-owned domain types rather than Prisma types, which is Attendance/Organization
migration work, not a POS concern.

Owner: Backend architecture group · Review/removal date: 2026-10-31

## Consequences

Teams can safely add products now, while the listed internals remain migration work.
Removing an edge is allowed immediately. Extending an exception requires a new ADR with
an owner and removal date.
