# Sprint 9 Implementation Plan

## Modular Architecture, Team Ownership and Developer Experience

**Status:** In progress
**Depends on:** Sprint 8 GA contract freeze and completion of active Sprint 7.5 workflow remediation  
**Primary references:** `TECH-STACK-AND-FOLDER-STRUCTURE.md`, current NestJS module graph, OpenAPI contract and Prisma schema  
**Sprint exit:** Attendance, platform capabilities and future products can be developed by separate teams through documented public contracts, with automated dependency enforcement and no customer-visible regression.

## 1. Purpose

Sprint 9 is an architecture-hardening sprint, not a feature rewrite and not a microservice migration. It keeps the NestJS modular monolith while making module ownership obvious and safe for multiple teams.

The target operating model is:

- One team can change Attendance without understanding POS internals.
- A future POS team can add its product without importing Attendance internals.
- The external mail service is accessed through a stable delivery port or events, never from business services directly.
- Identity, tenants, organization, permissions, billing, audit and outbox remain shared platform capabilities with explicit contracts.
- Existing REST routes, mobile/web behavior, database data and tenant isolation remain compatible throughout the refactor.

## 2. Scope

### Included

- Define the module catalog, ownership map and dependency rules.
- Standardize module folders and public entry points.
- Split oversized Attendance, Organization, Identity, Leave and platform services by use case.
- Replace cross-module concrete-service imports with public facades, query ports or domain events.
- Establish database-table ownership while retaining one PostgreSQL database and Prisma schema.
- Introduce architecture tests, circular-dependency checks and import-boundary linting.
- Add module README templates, local development commands and team handoff documentation.
- Provide a safe scaffold and checklist for future products such as POS.
- Formalize the external mail-service contract and local test adapter.

### Excluded

- Splitting the API into independently deployed microservices.
- Implementing POS business features.
- Replacing Prisma, NestJS, PostgreSQL, RLS, the outbox or existing authentication.
- Renaming or versioning existing public REST routes.
- Large database-table rewrites that do not directly support module isolation.
- UI redesign or product workflow changes.

## 3. Module Catalog and Ownership

| Category | Module/product | Owns | Does not own |
|---|---|---|---|
| Platform kernel | Identity and Access | users, credentials, sessions, roles and permissions | employee records or attendance policy |
| Platform kernel | Tenancy and Workspace | tenants, workspace lifecycle, branding and tenant context | product-specific configuration |
| Platform kernel | Organization | employees, departments, designations, reporting lines and employment lifecycle | login credentials or attendance calculations |
| Platform kernel | Billing and Entitlements | plans, subscriptions, commercial products and tenant entitlements | HR policy configuration |
| Platform kernel | Audit and Outbox | immutable audit evidence and reliable event publication | product business decisions |
| Product | Attendance | schedule, workplace, policy, punch, verification, leave, correction, device and attendance reporting workflows | identity credentials or subscription payment |
| Future product | POS | future POS catalog, sales, inventory and register workflows | Attendance internals |
| Integration | Mail service adapter | translation from notification commands to the external mail-service contract | deciding when business mail must be sent |
| Integration | Storage, push and provider adapters | provider-specific transport | domain policy |

`Leave`, `regularization`, device trust, biometrics and field tracking are Attendance capabilities. They may remain separate Nest submodules for maintainability, but they are not separate commercial CRM products.

## 4. Standard Module Structure

Every product or platform module uses the same structure. Small modules may omit empty subfolders, but they must preserve the dependency direction.

```text
src/
├── platform/                  # Reusable CRM capabilities and control plane
│   ├── identity/
│   ├── access/
│   ├── tenancy/
│   ├── organization/
│   ├── billing/
│   ├── notifications/
│   └── audit/
├── products/
│   └── attendance/            # One commercial product and composition root
│       ├── core/
│       ├── configuration/
│       ├── verification/
│       ├── trust/
│       ├── field/
│       ├── leave/
│       ├── regularization/
│       └── reporting/
└── shared/                    # Product-neutral technical building blocks
```

Within an owned capability, use `domain`, `application`, `infrastructure` and
`presentation` as needed. Product and platform boundaries expose `public.ts`; callers
must not deep-import another boundary's implementation.

### Dependency direction

- `presentation` may depend on `application`, shared HTTP primitives and authorization decorators.
- `application` may depend on `domain`, declared ports and stable shared contracts.
- `infrastructure` implements application ports and may depend on Prisma/provider SDKs.
- `domain` must not import NestJS, Prisma, HTTP DTOs or another module's implementation.
- Cross-module imports must resolve through the target module's `public.ts` or a versioned shared event contract.
- A module must not import another module's controller, repository, Prisma helper or internal service.
- Cycles are forbidden. Shared behavior moves to a narrow platform contract, not a generic dumping-ground utility.

## 5. Public Module Contracts

Each module publishes the smallest contract needed by other modules. Public contracts use business language and do not expose Prisma models.

| Provider | Public contract | Initial consumers |
|---|---|---|
| Identity | account provisioning, account status lookup and actor identity | Organization onboarding, tenant administration |
| Organization | employee directory reader and employment lifecycle events | Attendance, Billing seat synchronization, Notifications |
| Attendance | employee attendance summary reader and attendance lifecycle events | Dashboard, reporting, Notifications |
| Billing/Entitlements | effective product entitlement reader and entitlement-change events | route/module guards, runtime configuration |
| Workspace | tenant status, branding and workspace settings reader | Identity, web/mobile runtime configuration |
| Audit | append audit command | all mutation use cases |
| Outbox | publish transactional event command | all event-producing modules |
| Notifications | notification command/event ingress | Identity, Attendance, Billing |

### Contract rules

- Query contracts return purpose-built read models, not raw database rows.
- Commands validate tenant and actor context at their boundary.
- Events include event ID, event version, occurred-at timestamp, tenant ID, aggregate ID and correlation/request ID.
- Breaking event changes require a new event version and a compatibility period.
- Consumers must be idempotent and must not assume synchronous delivery.
- Cross-module writes use an owning-module command or transactional outbox event; they never update another module's tables directly.

## 6. API Contract Freeze

Sprint 9 adds no required customer-facing endpoint. Existing routes and OpenAPI operation IDs remain stable while internal implementations move.

- [ ] Export and commit the pre-refactor OpenAPI baseline.
- [ ] Map every controller route to its owning module and application use case.
- [ ] Preserve paths, methods, DTO fields, status codes and stable error codes.
- [ ] Fail CI if an operation disappears or changes incompatibly without an approved ADR.
- [ ] Keep tenant headers, JWT claims, permission checks, request IDs and audit attribution unchanged.
- [ ] Add internal health diagnostics only if they do not expose module internals or tenant data.

## 7. Database Ownership and Transactions

The system retains one PostgreSQL database and one Prisma schema. Ownership is documented and enforced in code rather than simulated through premature service separation.

- [x] Create a table-ownership registry covering every Prisma bounded context.
- [ ] Group the Prisma schema by bounded context with ownership comments.
- [ ] Only the owning module's repositories may write its tables.
- [ ] Cross-module reads use a public reader port or an explicitly owned read model.
- [ ] Multi-module business workflows use an application orchestrator plus transactional outbox events.
- [ ] Every tenant-owned table keeps RLS, `forTenant()` access and tenant A/B isolation tests.
- [ ] Platform tables remain accessible only through the admin connection and platform trust boundary.
- [x] No migration is required solely to move TypeScript files.
- [ ] Any corrective migration remains forward-only and includes recovery evidence.

## 8. Attendance Product Restructure

Attendance remains one customer-facing product composed of cohesive internal submodules:

```text
attendance/
├── core/             # punch aggregate, calculation and attendance register
├── configuration/    # policies, schedules, offices, holidays and rosters
├── verification/     # effective policy evaluation and punch evidence checks
├── trust/            # registered devices, integrity and biometrics
├── field/             # field tracking and offline synchronization
├── leave/             # leave policy, balance and request workflow
├── regularization/    # employee correction and HR decision workflow
├── reporting/        # attendance report/read models
└── public.ts
```

This is a logical target. Physical moves occur incrementally and must not create one new Attendance god module.

### Required service splits

- [ ] Split attendance configuration into policy, office, shift/roster, holiday and configuration-resolution use cases.
- [ ] Split attendance runtime into punch command handling, daily summary queries and effective-policy resolution.
- [ ] Keep verification rules pure and provider-independent; adapters supply device, location and biometric evidence.
- [x] Expose one Attendance composition root and public contract for external modules.
- [ ] Move Leave and regularization integrations from concrete service calls to Attendance commands/events.
- [ ] Preserve existing calculation, lock, idempotency and offline-replay invariants.

## 9. Organization and Identity Restructure

### Organization

- [ ] Split employee responsibilities into directory queries, profile lifecycle, placement/assignment, account provisioning orchestration and imports.
- [ ] Keep department/designation/reporting-line rules inside Organization.
- [ ] Publish employee created, changed, activated and terminated events.
- [ ] Remove Attendance, Billing and Identity table writes from Organization internals.

### Identity and Access

- [ ] Split signup, login, token/session, password recovery and employee-account provisioning use cases.
- [ ] Keep credential hashing, temporary-password rotation and session revocation inside Identity.
- [ ] Keep built-in role behavior and permission evaluation behind a public access facade.
- [ ] Ensure Organization references users by stable IDs without owning credentials.

## 10. External Mail Service Boundary

Business modules request notifications; they do not call an SMTP/API provider or the mail service directly.

```text
Business event
  -> Notifications application handler
  -> MailDeliveryPort
  -> DeltCRM mail-service adapter
  -> External mail service
```

- [ ] Define a versioned send-email command with template key, locale, recipient, variables, idempotency key and correlation ID.
- [ ] Define accepted, delivered, bounced, rejected and retryable-failure semantics.
- [ ] Redact credentials, reset tokens and sensitive template variables from logs.
- [ ] Retain outbox leasing, retry, backoff and dead-letter behavior.
- [ ] Provide a local Mailpit/fake adapter and deterministic contract tests.
- [ ] Document service URL, authentication, timeout, retry and ownership without committing secrets.

## 11. Future POS Module Onboarding

Sprint 9 does not implement POS. It proves that a new team can add it without touching Attendance internals.

- [x] Add a non-production module template/scaffolding command or documented copy-safe template.
- [ ] Define how a product registers its commercial catalog key, permissions, routes, navigation metadata and health checks.
- [ ] Require POS to own its tables, migrations, events, public contract and README.
- [ ] Permit dependencies on Identity, Tenancy, Organization, Billing/Entitlements, Audit and Outbox only through public contracts.
- [x] Add an architecture fixture showing that a POS-to-Attendance internal import fails CI.
- [ ] Require a module-specific test command and local seed fixture before integration.

## 12. Shared Code Policy

- `shared` contains stable technical infrastructure used by multiple modules: tenancy context, authorization primitives, database transaction helpers, observability and event envelopes.
- Domain-specific helpers stay in their owning module even if another team finds them convenient.
- Consolidate or retire the duplicate `common` convention; new code must not introduce a third shared location.
- A shared addition requires at least two real consumers, an owner and tests.
- Shared contracts must not import from feature modules.
- Provider SDK types must not escape infrastructure adapters.

## 13. Developer Documentation

Every module README must include:

- Purpose, owner/team and support contact.
- Owned tables and migrations.
- Public commands, queries, events and event versions.
- REST routes and required permissions.
- Allowed upstream/downstream dependencies.
- Required environment variables without secret values.
- Local seed/start/test commands.
- Invariants, idempotency behavior and stable error codes.
- Common failure modes and debugging/runbook links.
- Known limitations and current ADRs.

Repository-level documentation must include a module map, dependency diagram, change checklist, module creation guide and architecture decision record template.

## 14. Architecture Enforcement

- [x] Add import-boundary rules for module internals and allowed layers.
- [x] Add a circular-dependency check for production TypeScript.
- [x] Add an architecture test that verifies every registered product has an owner, README and public entry point.
- [x] Add a forbidden-import fixture so the rule itself is tested.
- [x] Add warnings for oversized controllers/services and require an ADR for justified exceptions.
- [ ] Prevent direct provider SDK imports outside infrastructure adapters.
- [ ] Prevent platform-admin Prisma access from tenant product modules.
- [x] Run architecture checks in local `pnpm` scripts and CI.

Initial maintainability targets:

- Controllers coordinate HTTP only; business decisions live in application/domain code.
- New application use-case classes should normally implement one command or query.
- Files above 400 lines receive a review warning, not an automatic unsafe split.
- Modules export explicit symbols; wildcard public exports are avoided.
- No new direct cross-module concrete-service dependency is accepted.

## 15. Ordered Work Packages

- [ ] **9.0 Baseline and ownership:** capture OpenAPI/module/dependency/table baselines; publish module catalog and ADRs.
- [ ] **9.1 Guardrails:** add public-entry-point convention, import boundaries, cycle checks and CI architecture tests.
- [ ] **9.2 Shared foundation cleanup:** consolidate `common`/`shared`, centralize context assertions and typed internal errors without changing API errors.
- [ ] **9.3 Attendance boundaries:** introduce Attendance public contracts and split configuration/runtime hotspots incrementally.
- [ ] **9.4 Organization and Identity boundaries:** split employee/auth hotspots and remove cross-owned writes.
- [ ] **9.5 Supporting workflows:** align Leave, regularization, reporting, notifications, billing and runtime configuration with public contracts/events.
- [ ] **9.6 Mail and future-product kit:** complete mail-service adapter contract, local fake and POS module onboarding template.
- [ ] **9.7 Documentation and regression:** complete READMEs, diagrams, developer journey, contract comparison and full regression evidence.

Work packages 9.3-9.5 must be delivered as small behavior-preserving changes. A big-bang folder move is explicitly forbidden.

## 16. Test Plan

### Architecture tests

- [x] A new cross-module internal import fails against an exact frozen baseline.
- [x] Domain importing NestJS or Prisma fails unless recorded as a temporary exception.
- [x] A new tenant-module dependency on Platform fails.
- [x] A new circular module dependency group fails.
- [x] Missing registered product README/public entry point/owner fails.

### Contract and regression tests

- [ ] OpenAPI before/after comparison reports no unapproved breaking change.
- [ ] Attendance punch, offline replay, leave, correction, report and payroll-lock journeys remain unchanged.
- [ ] Employee creation and account provisioning remain transactionally safe and idempotent.
- [ ] Billing seat synchronization consumes Organization events once.
- [ ] Mail command retries do not create duplicate logical delivery.
- [ ] Tenant A/B and no-context RLS tests pass for every moved repository.
- [ ] Platform admin/tenant connection separation remains enforced.
- [ ] Unit, integration, e2e, lint, typecheck and production build pass after every work package.

### Developer acceptance journey

A developer unfamiliar with Attendance must be able to:

1. Identify the owning module and team from the module catalog.
2. Start only the required local dependencies using documented commands.
3. Add a small use case through the standard layers.
4. Discover the allowed public dependencies without searching implementation folders.
5. Run the module test suite and architecture checks.
6. Produce a pull request without importing another module's internals.

Target: complete this journey from repository documentation in under 60 minutes, excluding dependency installation.

## 17. Stable Error Catalog

Sprint 9 preserves existing customer-facing errors. New architecture/tooling errors are build-time diagnostics:

| Code | Trigger |
|---|---|
| `ARCH_INTERNAL_IMPORT` | Code imports another module outside its public entry point |
| `ARCH_LAYER_VIOLATION` | A layer imports a forbidden dependency |
| `ARCH_CYCLE_DETECTED` | Module dependency graph contains a cycle |
| `ARCH_DB_OWNERSHIP_VIOLATION` | A module writes a table owned by another module |
| `ARCH_PLATFORM_BOUNDARY_VIOLATION` | Tenant code imports platform-admin database access |
| `ARCH_MODULE_METADATA_MISSING` | Owner, README or public contract is missing |
| `EVENT_VERSION_UNSUPPORTED` | A consumer receives an unsupported event contract version |

Runtime use of `EVENT_VERSION_UNSUPPORTED` must dead-letter safely with observability; architecture codes otherwise fail lint/CI and are not returned to customers.

## 18. Definition of Done

- [ ] Every backend module has an owner, purpose, README, table inventory and public entry point.
- [ ] Attendance is documented as one product with cohesive internal submodules.
- [ ] No new code imports another module's internal implementation.
- [ ] Identified concrete cross-module dependencies are removed or have an approved time-bound ADR.
- [ ] Oversized priority services are split by use case without API behavior changes.
- [ ] External mail delivery uses a tested port/adapter contract.
- [ ] A future POS team can scaffold a compliant module without changing Attendance.
- [ ] OpenAPI compatibility, RLS isolation and critical business journeys pass.
- [ ] Architecture checks run in CI and include a tested failure fixture.
- [ ] The developer acceptance journey meets its target and is signed off by a developer outside the Attendance team.

## 19. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 9.0 Baseline and ownership | Complete | Product catalog, `TABLE-OWNERSHIP.md`, dependency map and ADR-0001 |
| 9.1 Architecture guardrails | Complete | Exact import baseline, cycle/layer checks, self-test and root CI quality gate |
| 9.2 Shared foundation cleanup | Complete | Empty `common` removal, shared runtime helper, and tenant guard owned by the public Tenancy boundary |
| 9.3 Attendance boundaries | In progress | All Attendance capabilities physically consolidated under `src/products/attendance`; large use-case splits remain |
| 9.4 Organization and Identity boundaries | In progress | Platform capabilities physically consolidated under `src/platform`, with public entries and guard ownership fixed; employee/auth service splits remain |
| 9.5 Supporting workflow boundaries | In progress | Public Organization/Workspace/Billing imports added; the exception baseline is reduced and frozen at 4 exact internal imports |
| 9.6 Mail and future-product kit | In progress | Transactional email port/tests and POS templates complete; versioned delivery semantics remain |
| 9.7 Documentation and regression | In progress | API/module guides, diagram, OpenAPI export, 273 unit tests, lint/typecheck/build complete; e2e is waiting for PostgreSQL on port 5433 and external developer sign-off remains |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 20. Required Completion Evidence

- Before/after module dependency diagrams.
- Module and database ownership registry.
- Approved architecture decision records and time-bound exceptions.
- OpenAPI compatibility report.
- Architecture lint/cycle/forbidden-import output.
- Unit, integration, e2e, RLS, typecheck, lint and build totals.
- Attendance, employee provisioning, billing-event and mail-delivery regression results.
- Developer onboarding journey report and sign-off.
- Known limitations with owner and removal date.
