# Sprint 2 Implementation Plan

## Platform Owner Core and Operational Foundation

**Status:** Complete
**Completed:** July 17, 2026
**Depends on:** Sprint 1 tenant/auth/RLS foundation
**Primary references:** roadmap Phase 0 and Phase 6.2; feature sections 1.1, 1.3 and 1.4; Stitch S1-S4/S9-S11
**Sprint exit:** The CRM owner can authenticate with MFA, create and manage tenants, control modules, inspect global/tenant audit trails, impersonate safely, and monitor core system health before attendance modules expand.

## 1. Why This Sprint Comes Second

The platform owner is the operational root of the CRM. Tenant configuration and attendance development require an owner-controlled way to provision workspaces, activate modules, suspend unsafe accounts, investigate failures and support users. Billing-dependent metrics are not required for this control plane and remain in Sprint 8.

## 2. Included Scope

- Phase 0 delivery foundation: CI, outbox relay, worker entrypoint, structured logging, health and observability ports
- Dedicated platform-user authentication, production MFA, MVP local bypass, lockout and rotating sessions
- S1 operational dashboard with projected MRR, plan mix, tenant/employee counts, failed-payment count and system health from authoritative current data
- S2 tenant directory and filters
- S3 tenant detail, suspend/reactivate, module summary and scoped impersonation
- S4 manual tenant onboarding with expiring administrator invitation
- S9 module registry and per-tenant activation
- S10 global audit search/detail
- S11 API/database/Redis/queue/object-storage health and system alerts
- Platform permissions and strict `platform_runtime` request-path boundary

## 3. Deferred

- S5/S6 plan creation/editor: Sprint 8
- S7/S8 invoice, payment and dunning screens: Sprint 8
- Recognized/collected revenue, gateway conversion and dunning KPIs on S1: Sprint 8 enhancement
- Payment gateway health on S11: Sprint 8 enhancement
- Self-serve A2/A3 GA flow: Sprint 8; existing API remains available for controlled testing
- Churn/deletion execution and biometric purge: Sprint 8 retention/GA work

## 4. Architecture and Trust Boundaries

```text
apps/api/src/modules/platform/
├── auth/                 # platform credentials, MFA and sessions
├── tenants/              # lifecycle, onboarding and modules
├── impersonation/        # scoped, expiring support sessions
├── audit/                # append-only system audit reads/writes
├── operations/           # dashboard, health and alerts
├── application/          # commands, queries and ports
├── infrastructure/       # isolated platform_runtime repositories and adapters
└── presentation/         # /platform controllers and DTOs
apps/web/src/app/platform/
└── S1/S2/S3/S4/S9/S10/S11 routes and platform shell
```

- Platform modules use a separately typed database service on `platform_runtime`; tenant modules cannot inject it. `app_admin` remains the migration/infrastructure owner only.
- Tenant services continue to use `forTenant()` and cannot call platform repositories.
- Platform JWTs use separate issuer, audience, secret/key and guards from tenant JWTs.
- Platform routes never trust `x-tenant-id` as authority.
- Every mutation writes append-only `SystemAuditLog`; tenant-impacting actions also write attributed `TenantAuditLog` where appropriate.
- Impersonation never grants platform authority inside a tenant session.

## 5. Required Foundation Work

- [X] Add root workspace/Turbo commands for API/web lint, typecheck, unit, e2e, build and OpenAPI
- [X] Add CI with PostgreSQL, Redis and MinIO services and migration/seed validation
- [X] Add OpenAPI-to-TypeScript client generation and drift detection
- [X] Implement outbox relay claim/lease, retry/backoff, dead-letter handling and crash recovery
- [X] Add worker entrypoint; every tenant job uses `TenantJobContextRunner`
- [X] Add Pino request logs with request/tenant IDs, secret redaction, actor and impersonation correlation
- [X] Add `/healthz` liveness and `/readyz` dependency readiness
- [X] Add Sentry/OpenTelemetry ports and local no-op adapters
- [X] Complete system/tenant auth and impersonation audit attribution for IP, UA and request ID
- [X] Add auth regression gates for refresh reuse, lockout and single-use tokens

## 6. API Contract

### 6.1 Platform authentication

| Method   | Endpoint                      | Purpose                           |
| -------- | ----------------------------- | --------------------------------- |
| `POST` | `/platform/auth/login`      | Password stage and MFA challenge  |
| `POST` | `/platform/auth/mfa/verify` | Complete login with TOTP          |
| `POST` | `/platform/auth/refresh`    | Rotate platform refresh family    |
| `POST` | `/platform/auth/logout`     | Revoke current platform session   |
| `GET`  | `/platform/auth/me`         | Platform identity and permissions |

### 6.2 Dashboard and tenants

| Method    | Endpoint                                 | Permission                        | Purpose                             |
| --------- | ---------------------------------------- | --------------------------------- | ----------------------------------- |
| `GET`   | `/platform/dashboard`                  | `platform.dashboard.read`       | Operational KPIs and recent tenants |
| `GET`   | `/platform/tenants`                    | `platform.tenants.read`         | Paginated tenant directory          |
| `POST`  | `/platform/tenants`                    | `platform.tenants.create`       | Manual tenant onboarding            |
| `GET`   | `/platform/tenants/:id`                | `platform.tenants.read`         | Tenant detail and usage summary     |
| `PATCH` | `/platform/tenants/:id`                | `platform.tenants.update`       | Safe metadata update                |
| `POST`  | `/platform/tenants/:id/suspend`        | `platform.tenants.lifecycle`    | Suspend with reason                 |
| `POST`  | `/platform/tenants/:id/reactivate`     | `platform.tenants.lifecycle`    | Restore access                      |
| `GET`   | `/platform/tenants/:id/modules`        | `platform.modules.read`         | Effective modules                   |
| `PUT`   | `/platform/tenants/:id/modules`        | `platform.modules.manage`       | Atomic activation replacement       |
| `POST`  | `/platform/tenants/:id/impersonations` | `platform.impersonation.create` | Start scoped support session        |
| `POST`  | `/platform/impersonations/:id/end`     | current actor/session             | End immediately                     |

### 6.3 Modules, audit and operations

| Method    | Endpoint                             | Permission                  | Purpose                          |
| --------- | ------------------------------------ | --------------------------- | -------------------------------- |
| `GET`   | `/platform/modules`                | `platform.modules.read`   | Module registry                  |
| `POST`  | `/platform/modules`                | `platform.modules.manage` | Add future CRM module key        |
| `PATCH` | `/platform/modules/:id`            | `platform.modules.manage` | Rename/availability metadata     |
| `GET`   | `/platform/plans`                  | `platform.plans.read`     | Read seeded plans for onboarding |
| `GET`   | `/platform/audit-logs`             | `platform.audit.read`     | Search global audit              |
| `GET`   | `/platform/audit-logs/:id`         | `platform.audit.read`     | Full attributed diff             |
| `GET`   | `/platform/alerts`                 | `platform.alerts.read`    | System alerts                    |
| `POST`  | `/platform/alerts/:id/acknowledge` | `platform.alerts.manage`  | Acknowledge                      |
| `POST`  | `/platform/alerts/:id/resolve`     | `platform.alerts.manage`  | Resolve                          |
| `GET`   | `/platform/health`                 | `platform.health.read`    | Dependency status/latency        |

## 7. DTO and Response Contracts

| DTO                         | Fields                                                                 | Validation                                                        |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `PlatformLoginDto`        | email, password                                                        | normalized email; generic failure; lockout tracked                |
| `VerifyPlatformMfaDto`    | challenge token, six-digit TOTP                                        | one-time challenge; replay rejected; bounded attempts             |
| `CreatePlatformTenantDto` | company, subdomain, admin email, seeded plan ID, module keys, timezone | normalized unique subdomain/email; valid plan/modules/timezone    |
| `UpdatePlatformTenantDto` | company name and safe metadata only                                    | status/modules/billing excluded                                   |
| `TenantLifecycleDto`      | reason                                                                 | 10-1000 characters                                                |
| `ReplaceTenantModulesDto` | module keys                                                            | unique known keys; dependency rules validated                     |
| `CreateImpersonationDto`  | target user, reason, requested scopes, minutes                         | active same-tenant target; duration 1-30; scopes subset of policy |
| `SystemAlertDecisionDto`  | note                                                                   | 1-1000 characters; actor from JWT                                 |

List responses use `{ data, pagination }`. Dashboard labels subscription-derived revenue as projected MRR and calculates it from current plan price, billing period and seats. Failed-payment counts come from recorded transactions. Sensitive platform/MFA/session fields are never serialized.

## 8. Business Rules

### Tenant lifecycle

- [X] Creation atomically writes tenant, settings, subscription, modules, system roles and hashed expiring admin invitation
- [X] API never returns or stores a plaintext temporary password
- [X] Subdomain is globally unique, reserved-word aware and case-insensitive
- [X] Suspend records timestamp/reason/actor, revokes active tenant refresh families and blocks protected routes immediately
- [X] Reactivate does not restore revoked sessions; users authenticate again
- [X] Lifecycle commands are idempotent and emit audited events

### Modules

- [X] Attendance is explicitly activated, not assumed from UI navigation
- [X] Module dependency/conflict rules are validated server-side
- [X] Disabled modules are rejected by a live-state API guard even with cached permissions/JWTs
- [X] Module changes take effect without a workspace cache and are audited in both contexts

### Impersonation

- [X] MFA must be fresh according to policy
- [X] Token contains platform actor, session, tenant, target, scopes and expiry and cannot refresh
- [X] Billing mutation, platform routes, password/MFA changes and biometric export are forbidden
- [X] Tenant audit identifies acting tenant user and impersonation session; system audit identifies platform actor
- [X] Banner/session status remains available across platform navigation; end takes effect immediately

## 9. Platform Roles and Permissions

| Capability                          | Super Admin  | Support                |
| ----------------------------------- | ------------ | ---------------------- |
| Dashboard/tenant/module/health read | Yes          | Yes                    |
| Create/update tenant                | Yes          | Configurable           |
| Suspend/reactivate                  | Yes          | No by default          |
| Manage module registry/assignments  | Yes          | No by default          |
| Impersonate                         | Yes with MFA | Scoped policy only     |
| Read global audit                   | Yes          | Redacted/scoped        |
| Manage alerts                       | Yes          | Acknowledge if granted |
| Manage platform users/permissions   | Yes          | Self only              |

Platform permission keys are persisted and seeded; role-name checks are forbidden.

## 10. Migration Plan

- [X] Add platform refresh/challenge/MFA recovery/session tables or equivalent final model
- [X] Add persisted platform roles/permissions if enum-only role cannot express least privilege
- [X] Add impersonation scopes, ended reason and revocation metadata
- [X] Add module availability/dependency metadata needed by S9
- [X] Add system alert resolution actor/note fields if absent
- [X] Add invitation/onboarding idempotency key for manual tenant creation
- [X] Enforce append-only `system_audit_logs` for runtime platform role
- [X] Revoke platform tables from `app_user`; grant minimum platform runtime role separately
- [X] Add indexes for tenant status/search, audit actor/module/time and alert status/severity/time
- [X] Verify tenant table RLS remains fail-closed while platform repositories intentionally bypass through the isolated runtime role

## 11. Error Catalog

| Code                              | Status | Trigger                                 |
| --------------------------------- | -----: | --------------------------------------- |
| `PLATFORM_AUTH_INVALID`         |    401 | Generic login/MFA failure               |
| `PLATFORM_ACCOUNT_LOCKED`       |    423 | Failed-attempt lockout                  |
| `MFA_REQUIRED`                  |    401 | Password stage completed                |
| `MFA_INVALID`                   |    401 | Invalid/replayed/expired TOTP challenge |
| `PLATFORM_PERMISSION_DENIED`    |    403 | Missing platform permission             |
| `TENANT_SUBDOMAIN_EXISTS`       |    409 | Normalized duplicate                    |
| `TENANT_ALREADY_SUSPENDED`      |    409 | Invalid lifecycle transition            |
| `TENANT_NOT_SUSPENDED`          |    409 | Reactivate active tenant                |
| `MODULE_DEPENDENCY_VIOLATION`   |    409 | Unsafe module assignment                |
| `LAST_PLATFORM_ADMIN`           |    409 | Disabling final active super admin      |
| `IMPERSONATION_NOT_ALLOWED`     |    403 | Target/scope/MFA restriction            |
| `IMPERSONATION_EXPIRED`         |    401 | Ended/expired support session           |
| `SYSTEM_ALERT_ALREADY_RESOLVED` |    409 | Invalid lifecycle transition            |

## 12. Stitch Screen Contract

- Stitch S1/S2/S3/S4/S9/S10/S11 is the visual source of truth; preserve exact shell, spacing, typography, colors, charts, tables and imagery.
- S1 shows tenants, active/suspended counts, employees, projected MRR, plan mix, failed payments, recent signups and system health using authoritative stored data; Sprint 8 upgrades these with gateway-backed recognized revenue and dunning metrics.
- S3 keeps danger-zone lifecycle controls and a persistent impersonation banner when active.
- S4 submits the real tenant creation workflow and displays invitation status, never credentials.
- S11 distinguishes liveness, readiness, degraded and unavailable dependencies.
- Archive Stitch HTML/assets locally; do not hotlink or commit Stitch credentials.
- Verify 1440 and 1024 desktop widths plus loading, empty, populated, validation, API error, forbidden and degraded states.
- Screenshot comparison is required; intentional visual differences need documented approval.

## 13. Ordered Work Packages

### 2.0 Operational foundation

- [X] CI, contracts, relay, worker, logging, health and observability

### 2.1 Platform authentication

- [X] Platform user seed, MFA, sessions, lockout, guards and permissions

### 2.2 Tenant lifecycle

- [X] Directory/detail/create/update/suspend/reactivate APIs
- [X] Stitch S2-S4 tenant directory, detail and invitation-based onboarding screens
- [X] Deterministic screenshot comparison at the approved reference viewport and 1024/1440 widths

### 2.3 Modules and impersonation

- [X] Module registry/assignment, live-state guard and dependency/conflict APIs
- [X] Scoped, expiring and immediately revocable support impersonation with dual audit
- [X] Live Stitch MCP S3/S9 implementation and persistent session banner
- [X] Deterministic S3/S9 screenshot comparison at 1024/1440 widths

### 2.4 Audit, alerts and dashboard

- [X] S1/S10/S11 APIs/screens and attribution
- [X] Deterministic S1/S10/S11 screenshot comparison at 1024/1440 widths

### 2.5 Hardening

- [X] OpenAPI, platform/tenant boundary tests, load/security and runbooks

## 14. Test Plan

- [X] Unit: subdomain normalization, module dependencies, lifecycle and impersonation scope
- [X] Integration: atomic tenant provisioning, invitation hash/expiry, append-only system audit and permission persistence
- [X] Auth: MFA challenge/replay, refresh rotation/reuse, lockout and last-admin protection
- [X] E2E: owner creates tenant, activates attendance, invitation accepted and tenant login succeeds
- [X] E2E: suspend rejects tenant access/refresh; reactivate requires fresh login
- [X] E2E: support impersonation permits scoped read, forbids billing/platform mutation and double-audits action
- [X] Isolation: tenant APIs cannot read platform data; platform query cannot accidentally use tenant middleware context
- [X] Failure: relay/Redis/MinIO degradation reflected correctly in readiness/S11
- [X] Playwright: S1-S4/S9-S11 happy, empty, error, forbidden and degraded states
- [X] Performance: tenant list 10k rows, audit pagination and dashboard aggregate budgets

## 15. Acceptance Fixture

Seed one Super Admin and one Support user, four modules, three plans read-only, and four tenants: trial, active, suspended and module-limited. Acceptance creates a fifth tenant with Attendance enabled, accepts its admin invitation, performs an impersonated read, suspends/reactivates it and verifies matching system/tenant audits. S1/S11 use deterministic health adapters for healthy, degraded and failed screenshots.

## 16. Definition of Done

- [X] CRM owner can control tenants/modules/support before attendance expansion
- [X] Platform authentication is MFA-protected in production and isolated from tenant auth
- [X] Platform request paths use isolated `platform_runtime`; `app_admin` is reserved for migrations/infrastructure
- [X] Manual onboarding creates a usable tenant without plaintext credentials
- [X] Suspension/module guards apply immediately across APIs
- [X] Impersonation is scoped, expiring, visible and double-audited
- [X] S1-S4/S9-S11 match approved Stitch references and use real APIs
- [X] Build, lint, unit, integration, e2e, security, OpenAPI and Playwright gates pass

## 17. Progress Tracker

| Work package                    | Status      | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0 Operational foundation      | Complete    | Root pnpm/Turbo orchestration and CI services; generated OpenAPI TypeScript contracts with drift gate; durable outbox migration/relay; separate worker; Pino redaction; health/readiness; provider-neutral observability ports; tenant and platform-auth request attribution; refresh-reuse/lockout/single-use-token regressions; compiled API/worker smoke tests passed on July 16, 2026.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2.1 Platform authentication     | Complete    | Isolated platform challenge/session/refresh/recovery/permission schema; Argon2 password stage; RFC 6238 TOTP; bounded one-time MFA challenge; platform issuer/audience JWT; live database session guard; persisted permission guard; rotating refresh family with replay revocation; logout; lockout; owner/support seeds; system audit correlation; hostile tenant-header isolation and `app_user` platform-table denial. Migration applied; generated contracts, production build, 14 unit suites/23 tests and full 9 e2e suites/23 tests passed on July 16, 2026.                                                                                                                                                                                                                                                                                   |
| 2.2 Tenant lifecycle            | Complete    | Tenant directory/detail/plan/create/update/suspend/reactivate APIs and responsive S2-S4 screens use real platform APIs. Atomic onboarding, invitation hash/24-hour expiry, request-hash idempotency, rollback on late outbox failure, reserved/case-insensitive subdomains, session revocation and lifecycle audit/outbox behavior are covered by the full regression suite. |
| 2.3 Modules and impersonation   | Complete    | Registry/assignment APIs, dependency/conflict validation, live module guard, scoped non-refreshable impersonation, immediate revocation, dual audit attribution, S3/S9 screens and persistent support banner are implemented and covered by policy, integration and e2e tests. |
| 2.4 Audit, alerts and dashboard | Complete    | S1/S10/S11 APIs and screens provide dashboard aggregates, attributed append-only audit search, dependency/queue health and alert decisions. Failure tests prove readiness returns 503 while the protected health snapshot reports degradation without throwing. |
| 2.5 Hardening                   | Complete    | Dedicated `platform_runtime` connection, versioned grants, append-only audit privileges, tenant/platform denial tests, security scanner, 10k-tenant/audit performance tests, deployment runbook, fresh 15-migration/seed proof, and deterministic Playwright comparisons are complete. On July 16, 2026: security/lint/typecheck/build passed; 15 unit suites/27 tests, 13 API e2e suites/29 tests and 19 browser tests passed; OpenAPI had no generated drift. |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.
