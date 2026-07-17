# Implementation Sprint Index

This index translates `FEATURE-LIST.md` and `PROJECT-ROADMAP.md` into implementation-ready delivery sprints. Sprints 1-5 are complete. Sprints 6-8 cover all remaining MVP and GA requirements without treating future hooks as committed scope.

## Source of Truth

- `docs/files/FEATURE-LIST.md`
- `docs/files/PROJECT-ROADMAP.md`
- `docs/STITCH-SCREEN-PROMPTS.md`
- `docs/TECH-STACK-AND-FOLDER-STRUCTURE.md`
- `docs/FILES-EXPLAINED.md`
- `docs/verification-pipeline.ts`
- `apps/api/prisma/schema.prisma`

## Delivery Sequence

| Sprint | Outcome                                                                                                   | Primary screens                        | Indicative size | Status      |
| ------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------- | ----------- |
| 1      | Organization, employees, tenant access, imports, API hardening                                            | API foundation for B3-B8               | Complete scope  | Complete    |
| 2      | Platform owner core and operational foundation                                                            | S1-S4, S9-S11                          | Complete scope  | Complete    |
| 3      | Business-admin web and attendance configuration                                                           | B1-B9, H4-H8                           | Complete scope  | Complete    |
| 4      | Deterministic attendance calculator, shared Business/HR dashboard, web punches, register and finalization | H1 shared role variants, H9, H10, H13  | Complete scope  | Complete    |
| 5      | Trusted mobile attendance with device, integrity, location and face verification                          | M1-M13, M19-M20, H14                   | MVP complete; production providers carried to Sprint 6.0 | Complete (MVP) |
| 6      | Field tracking, offline replay, live map and route playback                                               | H2-H3, M16-M17                         | 3-4 weeks       | Not started |
| 7      | Regularization, notifications, reports, payroll lock and minimal leave                                    | H11-H16, M14-M15, M18, L1-L3           | 3-4 weeks       | Not started |
| 8      | Billing, revenue operations, retention, security hardening and GA                                         | S5-S8, S1/S11 enhancements, B10, A2-A3 | 4-5 weeks       | Not started |

Indicative sizes assume one cross-functional delivery team and include API, UI, automated tests and hardening. Re-estimate each sprint after its contract/design handoff; do not trade away its exit gate to preserve a calendar date.

## Sequencing Rules

- Sprint 2 must deliver owner tenant/module control plus the outbox relay and worker entrypoint before tenant configuration expands.
- Sprint 3 provides the tenant/admin shell and effective configuration resolvers required by attendance runtime.
- Sprint 4 calculator behavior is frozen before mobile verification begins.
- Sprint 5 produces trusted online punches; Sprint 6 adds offline and field transport without changing attendance invariants.
- Sprint 7 consumes domain events and finalized attendance data; it must not bypass the attendance aggregate.
- Sprint 8 billing adapters may develop earlier, but GA cannot occur before Sprints 2-7 pass their gates.
- Every new tenant table must receive RLS, fail-closed coverage, and tenant A/B isolation tests in the same work package.

## Cross-Sprint Definition of Done

- [ ] Database migration is forward-only and tested on a seeded database
- [ ] Tenant routes use `forTenant()` and persisted permission checks
- [ ] Public/platform routes have explicit trust boundaries and audit attribution
- [ ] DTO validation, coded errors, request IDs, audit/outbox writes and OpenAPI are complete
- [ ] Unit, integration, e2e, RLS, lint, typecheck and build gates pass
- [ ] Web/mobile flows include loading, empty, error, forbidden and suspended states
- [ ] Roadmap checkboxes change only after the corresponding sprint gate passes

## Shared Implementation Contract

### API and data

- Routes remain unversioned until the coordinated `/api/v1` migration; generated clients use the exported OpenAPI contract.
- Protected tenant routes require bearer authentication and `x-tenant-id`; JWT/header/context must match.
- Input uses typed DTOs, whitelist validation, coded errors, ISO date-only strings and explicit pagination limits.
- Tenant writes run through `forTenant()` and multi-write business operations use one caller-owned transaction.
- Cross-tenant IDs return `404`; they never reveal another tenant's resource.
- Important mutations write audit/outbox records in the same transaction and preserve request ID, actor and impersonation attribution.
- Sensitive fields are write-only/redacted and forbidden from application logs, error details and general serializers.
- Every new tenant table receives RLS, grants, no-context fail-closed tests and tenant A/B isolation coverage in its creating sprint.

### Google Stitch design reference

- Google Stitch screens are visual and interaction references and may contain inconsistencies or incomplete states. Sprint requirements, domain rules, accessibility and tested behavior are authoritative.
- Existing useful HTML exports, screenshots, imagery and font references should be archived locally before implementation starts.
- Implementation translates the design into reusable Next.js/Flutter components; it must not paste unsafe generated scripts or replace the composition with a generic template.
- Each screen work package begins with a screen-to-route/state map and an asset inventory.
- Required visual checks include the Stitch reference viewport plus supported responsive breakpoints, loading, empty, populated, validation, API error, forbidden, suspended and offline states where applicable.
- Deterministic screenshots support regression review but pixel parity is not a completion gate. Intentional differences and corrections to flawed references require a documented product decision.
- Credentials for Stitch or any provider are environment secrets and must never be stored in source/history.

### Required evidence for completion

- Migration name/status and rollback/forward-recovery notes
- OpenAPI operation count and generated-client drift result
- Unit/integration/e2e/RLS/UI test totals and commands
- Performance/security thresholds with measured output
- Stitch/reference and implementation screenshots for representative delivered states
- Known limitations and deferred items, with owner/target sprint
- Progress-table evidence links before status changes to `Complete`

## Planning Detail Standard

Every sprint plan must contain all of the following before implementation begins:

- [x] Bounded-context/module layout
- [x] Exact route inventory and permission model
- [x] DTO fields, validation and response semantics
- [x] Business invariants and state transitions
- [x] Schema constraints, indexes, RLS and migration decisions
- [x] Stable error-code catalog
- [x] Ordered work packages and dependency gates
- [x] Unit, integration, e2e, isolation, performance and UI tests
- [x] Stitch screen/state acceptance criteria
- [x] Deterministic acceptance fixtures/journeys
- [x] Definition of Done and evidence-backed progress tracker

## Files

- `docs/Sprint list /SPRINT-1-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-2-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-3-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-4-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-5-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-6-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-7-IMPLEMENTATION.md`
- `docs/Sprint list /SPRINT-8-IMPLEMENTATION.md`
