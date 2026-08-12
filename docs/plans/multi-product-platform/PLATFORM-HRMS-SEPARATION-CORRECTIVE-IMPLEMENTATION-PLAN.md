# Platform and HRMS Separation Corrective Implementation Plan

## Document status

- **Status:** Ready for implementation
- **Scope:** DeltCRM Platform, DeltCRM HRMS, product contracts, local gateway, data migration, staging, and production cutover
- **Primary objective:** Make Platform and HRMS independently owned, built, deployed, and operated products while preserving one unified customer experience
- **Data-safety rule:** No production table, row, object, or migration history may be deleted during separation or cutover

## 1. Why this corrective plan is required

The separation is not complete yet. We currently have useful boundary work, but the codebase and runtime still contain transitional pieces:

- Platform application code is substantially cleaner, but the Platform Prisma schema and migration history still contain HRMS-owned models and migrations.
- HRMS has a separate repository and an API boundary, but it is not yet proven as a complete independently deployable product for every attendance and payroll flow.
- Local Docker containers prove parts of the boundary, but they do not yet provide one deterministic Platform + HRMS + gateway acceptance environment.
- The official product contract is available, but package usage, compatibility checks, SSO, entitlements, deep links, lifecycle events, and failure behavior must be verified end to end.
- Data snapshot, replay, reconciliation, rollback, staging, cutover, and observation gates are not complete.

This plan replaces ad hoc cleanup with explicit ownership, checkpoints, evidence, and rollback rules.

## 2. Target architecture

### Platform owns

- Tenant and workspace identity
- Platform users, authentication, sessions, SSO, token issuance, JWKS, and global security policy
- Products, plans, pricing, subscriptions, billing, entitlements, and feature grants
- Platform roles and cross-product permission assignments
- Product registry, product lifecycle events, and tenant provisioning state
- Global localization catalogs and supported locale policy
- Platform audit, operational health, and product integration status
- Unified shell, product navigation, and gateway routing

### HRMS owns

- Organization structure used by HRMS
- Departments, designations, offices, and employee records
- Attendance policies, shifts, schedules, rosters, holidays, and leave
- Device trust, biometrics, geofencing, attendance evidence, and corrections
- Payroll structures, compensation, pay groups, payroll runs, approvals, statutory data, accounting mappings, outputs, and reports
- HRMS documents and product-specific audit evidence
- HRMS web and API implementation

### Product contract owns

- Token and identity claim schemas
- Tenant, user, role, permission, entitlement, and locale contracts
- Product registration and capability manifests
- Lifecycle event schemas and idempotency requirements
- Deep-link and route metadata
- Error envelope, correlation, tracing, and compatibility conventions
- Versioning and deprecation policy

### Runtime rule

Platform and HRMS may communicate only through versioned APIs, signed tokens, lifecycle events, and the official contract package. Neither service may query the other service's database or import the other service's application code.

## 3. Intended local topology

| Component | Local address | Ownership |
| --- | --- | --- |
| Gateway | `http://localhost:4080` | Unified entrypoint |
| Platform API | `http://localhost:4011` | Platform |
| Platform web | `http://localhost:4022` | Platform |
| Platform PostgreSQL | `localhost:5451` | Platform only |
| Platform Redis | `localhost:6381` | Platform only |
| Platform MinIO | `localhost:9100` / `9101` | Platform only |
| HRMS API | `http://localhost:4012` | HRMS |
| HRMS web | `http://localhost:4023` | HRMS |
| HRMS PostgreSQL | `localhost:5452` | HRMS only |
| HRMS Redis | `localhost:6382` | HRMS only |
| HRMS MinIO | `localhost:9200` / `9201` | HRMS only |

The browser must use the gateway. Internal ports exist for diagnostics and automated tests, not as customer-facing URLs.

## 4. Non-negotiable safety rules

- [ ] Never run `prisma migrate reset`, `prisma db push`, database recreation, destructive seeds, `DROP`, `TRUNCATE`, or bulk deletion against production.
- [ ] Use `prisma migrate deploy` only after reviewing generated SQL and taking a verified backup.
- [ ] Keep the existing production database and HRMS tables intact through migration, cutover, rollback window, and observation period.
- [ ] Make schema changes additive first. Move reads, verify parity, move writes, observe, and clean up only in a later release.
- [ ] Every data transfer must be restartable, idempotent, tenant-scoped, and recorded in a migration ledger.
- [ ] Record row counts, checksums, orphan checks, and business totals before and after each migration stage.
- [ ] Do not commit credentials, tokens, database URLs, SMTP secrets, or private package tokens.
- [ ] A failed entitlement, identity, or tenant-resolution check must fail closed.
- [ ] Production cutover requires named Platform, HRMS, DBA, security, and product approvals.

## 5. Phase 0: Freeze the boundary and approve ownership

### Implementation

- [x] Inventory every Prisma model, enum, migration, API route, event, queue, object-storage prefix, scheduled job, report, and UI route in both repositories.
- [x] Classify each item as `PLATFORM`, `HRMS`, `SHARED_CONTRACT`, `TRANSITIONAL`, or `REMOVE_AFTER_OBSERVATION`.
- [x] Resolve mixed tables explicitly. Do not leave a table shared because moving it is inconvenient.
- [x] Define authoritative IDs for tenant, user, product, employee, subscription, entitlement, and external references.
- [x] Document which service creates, updates, reads, and deletes each entity.
- [x] Freeze new cross-boundary imports and direct database access.
- [x] Add CODEOWNERS for Platform, HRMS, contracts, migrations, and gateway configuration.

### Required evidence

- [x] Approved table ownership matrix
- [x] Approved route and event ownership matrix
- [x] Approved object-storage and queue ownership matrix
- [x] No unresolved `SHARED_DATABASE` ownership entries

### Exit gate

Every persisted entity and public capability has exactly one owning service.

## 6. Phase 1: Make Platform schema genuinely Platform-only

Deleting legacy migrations is unsafe because production may already have applied them. The correction must separate the future Platform source of truth from historical compatibility.

### Implementation

- [x] Create a Platform-only Prisma schema containing only Platform-owned models and enums.
- [x] Generate the Platform Prisma client exclusively from that schema.
- [ ] Update Platform repositories and services to compile only against Platform-owned models.
- [x] Add an architecture test that fails if HRMS model names or product-owned tables return to Platform runtime code.
- [x] Create a clean Platform migration track for new installations.
- [x] Preserve the existing migration ledger for already deployed databases during the compatibility window.
- [x] Document how an existing database advances safely while a new Platform database starts from the clean Platform migration track.
- [x] Remove HRMS seeds and fixtures from Platform startup and Platform local compose.
- [x] Ensure Platform local initialization cannot create HRMS tables.

### Validation

- [x] A fresh Platform database contains only approved Platform tables.
- [x] Platform API starts and passes its tests without an HRMS Prisma client.
- [x] Platform migrations do not reference employee, attendance, leave, device, biometric, or payroll tables.
- [x] Existing production migration history remains untouched.

### Exit gate

A fresh Platform environment can be built, migrated, seeded, and tested without creating or importing any HRMS data model.

## 7. Phase 2: Complete the HRMS-owned schema and runtime

### Core HRMS domains

- [x] Organization, department, designation, office, and employee ownership is complete.
- [x] Attendance policies, shifts, schedules, rosters, holidays, and leave are complete.
- [x] Attendance logs, evidence, corrections, security events, devices, biometrics, and geofencing are complete.
- [x] HRMS documents, reports, exports, audit history, jobs, and notifications are complete.

### Payroll domains

- [x] Salary component definitions
- [x] Salary structures and versions
- [x] Employee compensation assignments and effective dates
- [x] Pay groups and payroll calendars
- [x] Variable earnings and deductions
- [x] Attendance and leave payroll inputs
- [x] Statutory and jurisdiction-specific employee details
- [x] Payroll run calculation, review, approval, lock, reopen, and cancellation
- [x] Accounting mappings and journal outputs
- [x] Payslips, bank files, statutory outputs, exports, and reports
- [x] Audit evidence and immutable run snapshots

### Runtime boundaries

- [x] HRMS uses the official versioned product-contract package, not a workspace copy.
- [x] HRMS does not import Platform application code.
- [x] HRMS does not connect to Platform PostgreSQL, Redis, or object storage credentials.
- [x] Platform IDs are stored as external references without database foreign keys across services.
- [x] Lifecycle consumers are idempotent and safe to replay.

### Exit gate

All HRMS and payroll flows build and run with only HRMS infrastructure plus contract-based Platform integration.

## 8. Phase 3: Official contract and compatibility enforcement

### Package use

- [x] Publish immutable semantic versions from `deltcrm-product-contracts`.
- [x] Pin Platform and HRMS to an explicit compatible version.
- [ ] Configure private GitHub Packages access locally, in CI, and in deployment secrets.
- [ ] Remove vendored and workspace-local copies after package adoption passes.
- [ ] Add dependency checks that reject unsupported contract versions.

### Required contract coverage

- [x] Tenant and workspace identity
- [x] User identity and session claims
- [x] Role and permission grants
- [x] Product and feature entitlements
- [x] Locale, region, timezone, and currency policy
- [x] Product registration and route manifest
- [x] Tenant created, updated, suspended, reactivated, and deleted events
- [x] User and role lifecycle events
- [x] Entitlement changed and subscription changed events
- [x] Correlation IDs, idempotency keys, timestamps, and event versions
- [x] Standard errors and retry behavior

### Compatibility tests

- [x] Current Platform producer to current HRMS consumer
- [ ] Current Platform producer to previous supported HRMS consumer
- [ ] Previous supported Platform producer to current HRMS consumer
- [x] Unknown additive fields are tolerated
- [ ] Breaking fields fail CI until a new major contract version is accepted

### Exit gate

Both products consume the official package and CI proves the supported compatibility window.

## 9. Phase 4: Deterministic independent local stacks

### Platform compose

- [x] Finalize `docker-compose.platform-local.yml`.
- [x] Use only Platform migrations and Platform-safe seed data.
- [x] Add health checks for API, web, PostgreSQL, Redis, and MinIO.
- [x] Use named volumes unique to Platform.

### HRMS compose

- [x] Add `docker-compose.hrms-local.yml` to the HRMS repository.
- [x] Use only HRMS migrations and HRMS-safe seed data.
- [x] Add health checks for API, web, PostgreSQL, Redis, and MinIO.
- [x] Use named volumes unique to HRMS.

### Gateway compose

- [x] Add one local gateway configuration that routes Platform and HRMS by path.
- [x] Route `/platform`, authentication, billing, plans, and control-plane APIs to Platform.
- [x] Route `/{lang}/app/hrms` and HRMS API paths to HRMS.
- [x] Preserve tenant host, locale, request ID, forwarded protocol, and client IP.
- [x] Do not expose internal service hostnames to browser navigation.

### Container hygiene

- [x] Use stable project and container names rather than creating timestamped test containers.
- [x] Add a documented cleanup command for stopped test containers and unused test networks.
- [x] Preserve named volumes unless an explicitly disposable environment is being removed.
- [x] One command starts the complete local environment; one command stops it without deleting data.

### Exit gate

A clean machine can start Platform, HRMS, and gateway independently and reach the complete system only through `http://localhost:4080`.

## 10. Phase 5: Local end-to-end acceptance

### Identity and SSO

- [ ] Platform login creates one session usable by HRMS.
- [ ] HRMS validates signature, issuer, audience, expiry, tenant, user, roles, permissions, and entitlements.
- [ ] Refresh and logout behavior is consistent across Platform and HRMS.
- [ ] Revoked or suspended access fails closed.
- [ ] Tokens are not exposed in URLs or browser logs.

### Routing and localization

- [ ] `/{lang}/app` opens the Platform shell.
- [ ] `/{lang}/app/hrms` opens HRMS without a second login.
- [ ] HRMS deep links survive browser refresh and direct navigation.
- [ ] English LTR and Arabic RTL work through the gateway.
- [ ] Invalid tenant, locale, product, and route combinations return controlled errors.

### Entitlements and permissions

- [ ] Platform can enable and disable HRMS for a tenant.
- [ ] Platform can assign HRMS roles and permissions.
- [ ] HRMS API enforces grants independently of UI visibility.
- [ ] Entitlement removal becomes effective within the defined propagation target.
- [ ] Tenant isolation tests prove one tenant cannot access another tenant's HRMS data.

### HRMS business flows

- [ ] Organization and office setup
- [ ] Employee creation, update, status change, and access provisioning
- [ ] Attendance policy, shift, schedule, roster, and holiday setup
- [ ] Check-in, checkout, break, worked-time calculation, and correction
- [ ] Leave request and approval
- [ ] Device approval, biometrics, geofence, and security events
- [ ] Payroll setup, compensation, inputs, run, approval, lock, outputs, and reports
- [ ] Documents and generated exports

### Failure tests

- [ ] Platform unavailable while HRMS is running
- [ ] HRMS unavailable while Platform is running
- [ ] Redis, object storage, queue, or email dependency unavailable
- [ ] Invalid token, expired token, stale entitlement, duplicate event, and out-of-order event
- [ ] Each product can restart and redeploy without restarting the other

### Exit gate

The complete customer journey passes through the gateway with separate databases and no direct cross-service access.

## 11. Phase 6: Data migration, replay, and reconciliation tooling

### Migration tooling

- [ ] Build a tenant-scoped snapshot exporter from the existing production database.
- [ ] Build an HRMS importer using stable external IDs.
- [ ] Add a migration ledger recording tenant, entity, batch, checksum, status, timestamps, and error.
- [ ] Make imports idempotent and resumable.
- [ ] Support dry-run, validation-only, retry, and rollback modes.
- [ ] Build event replay for changes made after the snapshot watermark.
- [ ] Define a write-freeze or dual-write/outbox strategy for the final delta.

### Reconciliation

- [ ] Compare per-tenant row counts by entity.
- [ ] Compare employee, attendance, leave, payroll, and document business totals.
- [ ] Detect missing parents, orphan rows, duplicate external IDs, and invalid tenant references.
- [ ] Validate indexes and representative query plans.
- [ ] Compare generated attendance and payroll reports before and after migration.
- [ ] Produce a signed reconciliation report for every migrated tenant.

### Rollback

- [ ] Preserve the source database as authoritative until cutover approval.
- [ ] Define how gateway routing returns a tenant to the legacy path.
- [ ] Define how post-cutover writes are replayed back or retained safely.
- [ ] Test rollback before staging acceptance.

### Exit gate

A full snapshot plus incremental replay can be migrated, reconciled, repeated, and rolled back without data loss.

## 12. Phase 7: Quality gates and operational readiness

### Platform quality gates

- [ ] API typecheck, unit tests, integration tests, architecture checks, and production build pass.
- [ ] Web typecheck, lint, relevant tests, localization audits, and production build pass.
- [ ] Fresh Platform migrations pass on a disposable database.

### HRMS quality gates

- [ ] API typecheck, unit tests, integration tests, architecture checks, OpenAPI checks, and production build pass.
- [ ] Web typecheck, lint, relevant tests, localization audits, and production build pass.
- [ ] Fresh HRMS migrations pass on a disposable database.
- [ ] Attendance and payroll calculation regression suites pass.

### Operational readiness

- [ ] Structured logs contain product, tenant, request, correlation, and trace context without secrets.
- [ ] Health and readiness probes distinguish process health from dependency readiness.
- [ ] Metrics and alerts cover auth failures, entitlement failures, event lag, job failures, error rate, latency, and database health.
- [ ] Independent Platform and HRMS backups are configured and restore-tested.
- [ ] Independent blue-green deployment and rollback are rehearsed.
- [ ] Runbooks cover outage, migration failure, event replay, restore, and tenant rollback.

### Exit gate

Both products pass their complete quality gates and can be deployed, observed, backed up, restored, and rolled back independently.

## 13. Phase 8: Staging acceptance

- [ ] Deploy Platform, HRMS, contract version, gateway, and independent infrastructure to staging.
- [ ] Migrate a production-like anonymized snapshot.
- [ ] Run automated reconciliation and manually inspect sampled tenants.
- [ ] Run SSO, deep-link, localization, entitlement, and complete HRMS acceptance tests.
- [ ] Run load tests for login, tenant context, employee directory, attendance, reports, and payroll.
- [ ] Run security tests for tenant isolation, token misuse, permission escalation, replay, and insecure direct object references.
- [ ] Run backup and restore drills.
- [ ] Rehearse deployment and rollback at least once using the release artifacts intended for production.
- [ ] Obtain product, engineering, DBA, security, and operations approval.

### Exit gate

Staging evidence proves functional parity, data parity, security, performance, recovery, and independent operations.

## 14. Phase 9: Production migration and tenant cutover

### Before cutover

- [ ] Confirm production database and object-storage backups and test restore access.
- [ ] Confirm migration SQL is additive and reviewed.
- [ ] Confirm capacity, monitoring, alerts, on-call ownership, and rollback authority.
- [ ] Select a low-risk pilot tenant and communicate the maintenance window if required.

### Per-tenant cutover

- [ ] Capture snapshot watermark.
- [ ] Export, import, and reconcile tenant data.
- [ ] Replay incremental events.
- [ ] Run smoke tests using a real tenant administrator and employee account.
- [ ] Switch only that tenant's gateway/product route.
- [ ] Monitor errors, latency, event lag, attendance actions, payroll actions, and reports.
- [ ] Record approval or execute the rehearsed rollback.

### Rollout

- [ ] Complete pilot observation before adding tenants.
- [ ] Roll out in controlled batches with an explicit stop condition.
- [ ] Keep the legacy source and route available throughout the rollback window.

### Exit gate

Every production tenant is migrated, reconciled, smoke-tested, approved, and operating on the independent HRMS product.

## 15. Phase 10: Observation and final monolith removal

- [ ] Complete the agreed observation period with no unresolved severity-one or data-integrity incident.
- [ ] Verify all tenants use HRMS routes, APIs, jobs, reports, and storage.
- [ ] Verify no Platform runtime query touches HRMS tables.
- [ ] Verify no HRMS runtime uses Platform application code or Platform infrastructure credentials.
- [ ] Archive migration evidence, reconciliation reports, approvals, and rollback artifacts.
- [ ] Disable legacy HRMS jobs and writes before deleting code.
- [ ] Remove HRMS controllers, services, workers, UI, generated clients, tests, seeds, and dependencies from Platform.
- [ ] Remove legacy HRMS tables from the old database only in a separate approved retention project, never as part of cutover.
- [ ] Update architecture diagrams, onboarding guides, runbooks, CODEOWNERS, and product documentation.

### Exit gate

Platform contains only control-plane and shell concerns; HRMS contains all attendance and payroll implementation; the legacy copy is no longer executable.

## 16. Immediate execution order

Work should proceed in this order to avoid building tests on an invalid boundary:

1. Approve the ownership matrix.
2. Create and validate the Platform-only Prisma schema and clean migration track.
3. Complete HRMS schema ownership, especially payroll.
4. Enforce the official contract package in both repositories.
5. Finalize separate Platform and HRMS Docker stacks.
6. Fix and standardize the local gateway.
7. Pass local SSO, deep-link, entitlement, isolation, and HRMS flow tests.
8. Build and prove migration, replay, reconciliation, and rollback tooling.
9. Pass all quality and operational gates.
10. Complete staging acceptance.
11. Perform tenant-by-tenant production cutover.
12. Observe before removing the legacy HRMS code and data structures.

## 17. Progress tracking

Do not report completion based only on copied files or model counts. Track these ten exit gates:

| Gate | Result required |
| --- | --- |
| G1 Ownership | Every entity and capability has one approved owner |
| G2 Platform purity | Fresh Platform DB and runtime contain no HRMS models |
| G3 HRMS completeness | Attendance and payroll run independently |
| G4 Contract | Official package and compatibility tests pass |
| G5 Local topology | Independent stacks and gateway are deterministic |
| G6 Local acceptance | Complete SSO, entitlement, isolation, and product flows pass |
| G7 Migration | Snapshot, replay, reconciliation, and rollback pass |
| G8 Operations | Build, test, security, observability, backup, and restore pass |
| G9 Staging | Production-like acceptance and approvals complete |
| G10 Production | All tenants cut over and observation complete |

The separation is production-complete only when all ten gates are complete. Code extraction alone is not production completion.

## 18. Inputs required from the product owner

- [ ] Confirm the final table ownership matrix, especially organization, users, roles, localization, documents, notifications, and audit records.
- [ ] Confirm supported SSO/session behavior and acceptable entitlement propagation delay.
- [ ] Confirm the tenant URL and localized HRMS route convention.
- [ ] Confirm payroll jurisdictions and statutory scope required for first release.
- [ ] Provide staging infrastructure, production change window, and named approvers.
- [ ] Approve pilot tenant selection, batch size, observation period, and rollback window.
- [ ] Approve data-retention timing before any later legacy-table removal project.

## 19. Definition of done

The work is done only when:

- Platform and HRMS are separate repositories, applications, databases, caches, object stores, queues, migrations, CI pipelines, deployments, backups, and ownership boundaries.
- Platform controls tenant identity, subscriptions, entitlements, permissions, and product navigation.
- HRMS implements attendance and payroll and consumes Platform capabilities only through the official contract and supported integration endpoints.
- Customers have one login and one tenant URL with stable English and Arabic deep links.
- Local, staging, migration, rollback, security, performance, backup, restore, and production acceptance evidence is complete.
- Production data remains intact and reconciled.
- Legacy HRMS implementation is removed from Platform only after successful production observation.
