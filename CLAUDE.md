# DeltCRM — AI Assistant Context

> This file provides comprehensive context for AI coding assistants working on the DeltCRM project.

## Project Overview

DeltCRM is a **multi-tenant SaaS CRM/HRMS platform** built by DeltTech. It currently focuses on an **Attendance Management** module with plans to expand into a full-featured CRM. The platform supports multiple tenants (organizations), each with their own employees, roles, and configurations.

## Monorepo Structure

```
CRM/
├── apps/
│   ├── api/          → NestJS backend (REST API + BullMQ workers)
│   ├── web/          → Next.js 16 frontend (App Router)
│   └── mobile/       → Flutter mobile app (Dart)
├── packages/
│   ├── contracts/    → Shared OpenAPI-generated TypeScript types (@hrms/contracts)
│   └── ui/           → Shared UI component library (@hrms/ui)
├── docs/             → Architecture docs, sprint history, runbooks, ERD
├── scripts/          → Deployment, operations, and code generation scripts
├── tests/
│   └── load/         → k6 load test scripts (per sprint)
├── docker-compose.yml → Local dev infrastructure (Postgres, Redis, MinIO)
├── ecosystem.config.cjs → PM2 production process config
├── turbo.json        → Turborepo build pipeline config
└── pnpm-workspace.yaml → pnpm workspace definition
```

## Tech Stack

### Backend (`apps/api/`)

| Layer           | Technology                                                         |
| --------------- | ------------------------------------------------------------------ |
| Framework       | NestJS 11 (Express adapter)                                       |
| Language        | TypeScript (strict, ESNext)                                        |
| ORM             | Prisma 7 with `@prisma/adapter-pg`, **single** `prisma/schema.prisma` |
| Database        | PostgreSQL 16 (RLS, partitioning, role-based connection strings)   |
| Cache & Queues  | Redis 7 (ioredis) + BullMQ                                        |
| Object Storage  | MinIO / AWS S3 / Wasabi (`@aws-sdk/client-s3`)                     |
| Auth            | Passport JWT + Argon2 password hashing                             |
| Authorization   | Permission-key guards (`PermissionsGuard`, `ModuleGuard`) over a flat `Permission.key` table |
| Validation      | `class-validator` + `class-transformer` via `createValidationPipe()` |
| Real-time       | Server-Sent Events (SSE) for live field tracking                   |
| Scheduling      | BullMQ repeatable jobs in the worker process (no `@nestjs/schedule`) |
| CQRS            | `@nestjs/cqrs` for command/query separation                        |
| Logging         | Pino (`nestjs-pino`)                                               |
| Observability   | OpenTelemetry + Sentry                                             |
| API Docs        | `@nestjs/swagger` → OpenAPI spec auto-generation                   |
| Testing         | Jest 30, Testcontainers for DB integration tests                   |

> ⚠️ `@casl/ability` and `@casl/prisma` are present in `package.json` but **not imported anywhere** in `src/`.
> Authorization is permission-key based — see `src/shared/authorization/`. Do not write CASL code without
> agreeing to adopt it first.

### Frontend (`apps/web/`)

| Layer            | Technology                                                     |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router)                                        |
| Language         | TypeScript                                                      |
| Styling          | Tailwind CSS v4                                                 |
| Components       | Shadcn UI + `@base-ui/react` primitives                         |
| State Management | Zustand v5 (persisted stores for auth)                          |
| Data Fetching    | Axios (`src/lib/api-client.ts`) with JWT + tenant interceptors  |
| Forms            | Native React state + manual validation                          |
| Tables           | Hand-rolled table components in `src/shared/components`         |
| Charts           | Hand-rolled SVG components                                      |
| Maps             | Leaflet (direct, not `react-leaflet`) for live field tracking   |
| E2E Testing      | Playwright                                                      |

> **POS-only exception**: the POS product introduces **TanStack React Query** and **React Hook Form**
> (see `docs/POS/POS-FOUNDATION-DECISIONS.md`, D3). They are scoped to `src/features/products/pos/**`
> and `src/app/pos/**`. Attendance and platform code stay on the axios/zustand pattern — do not migrate
> them opportunistically.
>
> ⚠️ `packages/ui` (`@hrms/ui`) is an **empty shell** — a `package.json` whose `main` points at a file
> that does not exist. Shared UI actually lives in `apps/web/src/shared/{components,layouts,ui}`.

### Mobile (`apps/mobile/`)

| Layer            | Technology                                              |
| ---------------- | ------------------------------------------------------- |
| Framework        | Flutter (SDK >=3.7.1)                                    |
| Language         | Dart                                                     |
| State Management | Riverpod (with code generation)                          |
| Routing          | GoRouter                                                 |
| API Client       | Dio (with interceptors for auth + tenant headers)        |
| Local Storage    | Isar Community (offline-first) + flutter_secure_storage  |
| Location         | Geolocator + flutter_map                                 |
| Camera           | camera plugin (punch selfie verification)                |
| Background Jobs  | Workmanager (background sync, location pings)            |
| Notifications    | flutter_local_notifications                              |
| Biometrics       | local_auth                                               |
| Connectivity     | connectivity_plus (online/offline detection)             |

## Architecture Patterns

### Multi-Tenancy (Defense-in-Depth)

1. **Middleware Layer**: Resolves subdomain → tenant ID, checks suspension, stores in `AsyncLocalStorage`
2. **ORM Layer**: `prisma.forTenant(tx)` automatically sets `SET LOCAL app.tenant_id = '<uuid>'`
3. **Database Layer**: PostgreSQL RLS policies enforce `USING (tenant_id = current_setting('app.tenant_id'))` — fail-closed design

### API Architecture

- **Modular Monolith**: Organized into DDD Bounded Contexts under `src/platform/` and `src/products/`
- **CQRS**: Command/query separation in core modules
- **Transactional Outbox**: Domain events persisted atomically, relayed via `OutboxRelayService` to Redis/BullMQ
- **Separate Worker Process**: `src/worker.ts` runs BullMQ workers (employee import, attendance jobs, field ping, reporting, dunning, tenant deletion)
- **Verification Pipeline**: Chain of responsibility (Device → Integrity → Location → Face) with short-circuit logic

### Mobile Architecture

- **Clean Architecture + Feature-First**: Each feature has `data/`, `domain/`, `presentation/` layers
- **Offline-First**: Isar local DB + Workmanager for background sync when connectivity returns

### Architecture Governance (CI-enforced)

`apps/api/architecture/` is the binding contract for backend structure. It is checked by
`apps/api/scripts/check-architecture.ts` via `pnpm architecture:check`, which runs inside `pnpm quality`.

| File | Role |
| ---- | ---- |
| `module-boundaries.json` | Per-product `owner`, `compositionRoot`, `publicEntry`, `physicalRoots`, plus frozen legacy dependency/cycle allowlists |
| `TABLE-OWNERSHIP.md` | Which bounded context owns writes to which tables — **must be updated before adding models** |
| `MODULE-DEVELOPMENT.md` | The "New Product Journey" checklist and layering rules |
| `templates/module/` | Scaffold for a new product (`module.ts`, `public.ts`, `README.md`) |
| `examples/pos/` | Isolation fixture asserting a future POS product stays independent of Attendance |
| `ADR-0001-...md` | The frozen legacy dependency baseline |

Rules the checker enforces — violations fail CI:

1. `src/shared/**` must not import `platform/**` or `products/**` (only the `tenancy` and `audit` public entries). **Shared is infrastructure, never business logic.**
2. `**/domain/**` must not import `@nestjs/*`, `@prisma/*` or `prisma`.
3. Cross-product imports must go through the target's `public.ts` — never deep-import a service or repository.
4. New cross-module dependencies and new dependency cycles are rejected unless allowlisted.
5. `src/common` must stay empty.
6. `.service.ts` / `.controller.ts` files over 400 lines emit warnings.
7. `check-architecture.ts --self-test` asserts that a `pos -> attendance` dependency is **rejected**.

**Adding a new product** (e.g. POS): copy `templates/module` → create composition root + `public.ts` →
register in `module-boundaries.json` → add DB ownership to `TABLE-OWNERSHIP.md` → register in `AppModule`
through `public.ts` only → add catalog/permissions/navigation/seed entries via their owning contracts →
add an architecture self-test.

## Backend Module Map

### Platform Modules (`src/platform/`)

| Module                    | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `TenancyModule`           | Multi-tenant routing, isolation, subdomain lookup  |
| `IdentityModule`          | User authentication, JWT token issuance            |
| `OrganizationModule`      | Employees, Departments, Designations               |
| `AccessModule`            | RBAC — roles, permission keys, role assignment     |
| `AuditModule`             | Append-only audit logging                          |
| `NotificationsModule`     | Multi-channel notification delivery (via workers)  |
| `BillingModule`           | Subscription invoicing, dunning, Stripe/Razorpay (platform billing only — POS customer checkout uses Thawani/Amwal separately) |
| `PlatformControlPlaneModule` | Super-admin tenant lifecycle management         |
| `WorkspaceProductModule`  | Workspace configurations                          |
| `CustomersModule` *(planned)* | Platform-level `Customer` / `CustomerGroup` — the CRM's shared customer record, consumed by POS and future products |

### Product Modules (`src/products/`)

| Module                    | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `AttendanceProductModule` | Core attendance system containing sub-modules:        |
| ↳ `core`                 | Punch recording, daily attendance computation         |
| ↳ `field`                | Real-time location pings, SSE live board, route history |
| ↳ `biometrics`           | Biometric verification                                |
| ↳ `leave`                | Leave application, approval, balance, accrual         |
| ↳ `reporting`            | Attendance reports, monthly sheets, late/absent reports |
| ↳ `payroll-lock`         | Payroll period locking                                |
| ↳ `configuration`        | Shifts, weekly-off patterns, holidays, geofences, policies |
| ↳ `verification`         | Multi-layer verification pipeline (Device → Face)     |
| `PosProductModule` *(planned)* | Point of Sale — see `docs/POS/`. Sub-modules: |
| ↳ `core`                 | Cart, sale, checkout, returns, held orders            |
| ↳ `catalog`              | Products, categories, variants, batches               |
| ↳ `register`             | Outlets, registers, sessions, cash movements          |
| ↳ `inventory`            | Stock levels, adjustments, transfers                  |
| ↳ `purchasing`           | Vendors, purchase orders, goods receipt               |
| ↳ `promotions`           | Discounts, coupons, promotion engine                  |
| ↳ `loyalty`              | Points ledger, credit notes                           |
| ↳ `workflows`            | Dynamic order state machines + form schemas           |
| ↳ `reporting`            | Sales, inventory, VAT and financial reports           |
| ↳ `configuration`        | POS settings, tax groups, receipt templates           |

### Shared Modules (`src/shared/`)

| Module               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `DatabaseModule`     | Prisma client setup, tenant-aware extensions |
| `AuthorizationModule`| `PermissionsGuard`, `ModuleGuard`, permission-key constants |
| `OutboxModule`       | Transactional outbox event relay             |
| `HealthModule`       | Health check endpoints                       |
| `ObservabilityModule`| OpenTelemetry + Sentry integration           |
| `RetentionModule`    | Data retention policy enforcement            |

## Database Schema Key Entities

### Platform

- `Tenant`, `SubscriptionPlan`, `TenantInvoice`, `PlatformUser`, `SystemAlert`

### Organization

- `User`, `Role`, `Employee`, `Department`, `Designation`

### Attendance

- `AttendancePolicy`, `AttendanceRecord`, `AttendanceEvent` (partitioned), `FieldLocationPing` (partitioned), `LeaveRequest`, `OfficeLocation`

### Key Design Decisions

- **UUIDv7 primary keys** for sortable, distributed-safe IDs
- **Time-range partitioning** on `AttendanceEvent` and `FieldLocationPing` for high-volume writes
- **Append-only audit tables** with `REVOKE UPDATE, DELETE` on application roles

## Web Frontend Route Structure

```
src/app/
├── login/, forgot-password/, accept-invitation/   → Auth routes
├── app/              → Multi-tenant workspace routes (URLs are /app/*)
│   ├── page.tsx      → Main dashboard
│   ├── attendance/   → Attendance register, exceptions, field, holidays, leave,
│   │                   offices, policies, regularizations, requests, rosters,
│   │                   shifts, security, setup
│   ├── employees/    → Employee list and detail ([id])
│   ├── access/, imports/, leave/, modules/, notifications/, organization/, reports/
│   └── settings/     → General, roles, modules, billing, audit, security
├── pos/              → POS product routes (URLs are /pos/*) — NOT nested under /app
│   ├── billing/      → Full-screen register (no sidebar)
│   └── products/, inventory/, customers/, orders/, reports/, settings/ ...
└── platform/         → Platform admin routes (URLs are /platform/*)
    ├── tenants/      → Tenant management
    ├── billing/      → Billing management
    ├── audit/        → Audit logs
    └── pos/          → POS module administration across tenants
```

> POS deliberately sits at the route root (`/pos/*`), not under `/app/`, because the billing register is a
> full-screen terminal app with its own shell. See `docs/POS/POS-FOUNDATION-DECISIONS.md` (D1).

## Mobile App Feature Map

| Feature        | Screens                                                             |
| -------------- | ------------------------------------------------------------------- |
| Auth           | Splash, Login, Biometric login                                      |
| Home           | Dashboard with quick actions                                        |
| Attendance     | Break, day detail, history, punch camera, punch success              |
| Tracking       | Active location/time tracking                                       |
| Leave          | Application, history, balance                                       |
| Profile        | Employee profile view                                               |
| Notifications  | Notification center                                                  |
| Settings       | App settings                                                         |
| Sync           | Offline data synchronization                                        |
| Enrollment     | Device enrollment                                                    |
| Consent        | Privacy consent flows                                                |

## Authorization Model

### Role Hierarchy

1. **Platform Admin** — Super-admin across all tenants
2. **Business Admin** — Tenant-level administrative control
3. **HR Admin** — HR workflows, attendance, employee management
4. **Manager** — Team view, leave approvals
5. **Employee** — Self-service only

### Permission Structure

- **Format**: `domain.resource.action` (e.g., `attendance.records.read`, `identity.roles.create`, `workspace.dashboard.admin.read`, `pos.sale.create`)
- **Engine**: flat permission keys. `Permission` rows → `RolePermission` → `Role` → `UserRole`. Source of truth for the key list is `src/shared/authorization/permissions.constants.ts` (`PERMISSIONS` + `DEFAULT_ROLE_PERMISSIONS`), mirrored into the DB by `prisma/seed.js`
- **Guards**: `JwtTenantGuard`, `PermissionsGuard`, `ModuleGuard`
- **Decorators**: `@RequirePermissions()`, `@RequireModule()`
- **UI**: conditional rendering from the permission list on the authenticated user (fail-safe); nav items declare `permission` / `anyPermissions` / `moduleKey` in `src/lib/tenant-navigation.ts`

**Adding a permission** — three places, together: the `PERMISSIONS` constant, the relevant
`DEFAULT_ROLE_PERMISSIONS` entries, and the seed. There is no ability factory and no ABAC engine; rules
that depend on record attributes (e.g. a cashier's maximum discount) are enforced in the service layer.

## Development Commands

```bash
# Infrastructure
docker compose up -d               # Start Postgres, Redis, MinIO

# Development
pnpm dev:api                       # Start API dev server
pnpm dev:web                       # Start web dev server

# Quality Gate (run before PR)
pnpm quality                       # security → mobile-check → release-evidence → architecture → lint → typecheck → test → build

# Individual checks
pnpm lint                          # Lint all packages
pnpm typecheck                     # TypeScript type checking
pnpm test                          # Unit tests
pnpm test:e2e                      # API end-to-end tests
pnpm test:web:e2e                  # Web Playwright tests
pnpm architecture:check            # Architecture fitness tests

# Code Generation
pnpm openapi:generate              # Export OpenAPI → generate TS types + Flutter routes

# Load Testing (k6)
pnpm load:sprint8:punch            # Punch load test
pnpm load:sprint8:sync             # Sync load test
pnpm load:sprint8:pings            # Location pings load test
pnpm load:sprint8:reports          # Reports load test
pnpm load:sprint8:live-board       # Live board SSE load test

# Operations
pnpm ops:backup                    # PostgreSQL backup
pnpm ops:restore-drill             # Restore drill
pnpm ops:retention-audit           # Data retention audit
pnpm ops:partition-audit           # Partition boundary audit

# Security
pnpm security:check                # Dependency vulnerability scan
pnpm security:sbom                 # Generate CycloneDX SBOM
```

## Environment Variables

Key variables needed (see `apps/api/.env.example`):

| Variable               | Purpose                        |
| ---------------------- | ------------------------------ |
| `DATABASE_URL`         | PostgreSQL connection string    |
| `DATABASE_URL_APP`     | App-role DB connection          |
| `DATABASE_URL_PLATFORM`| Platform-role DB connection     |
| `REDIS_URL`            | Redis connection string          |
| `JWT_SECRET`           | JWT signing secret               |
| `S3_ENDPOINT`          | MinIO/S3 endpoint                |
| `S3_ACCESS_KEY`        | MinIO/S3 access key              |
| `S3_SECRET_KEY`        | MinIO/S3 secret key              |
| `S3_PRIVATE_BUCKET`    | Storage bucket name              |
| `PORT`                 | API server port (default 4001)   |
| `CORS_ORIGIN`          | Allowed CORS origins             |
| `NODE_ENV`             | Environment (development/production) |

## Production Deployment

- **Server**: Ubuntu EC2 (`/home/ubuntu/CRM`)
- **Process Manager**: PM2 (`ecosystem.config.cjs`)
  - `deltcrm-api` — NestJS API server
  - `deltcrm-web` — Next.js production server
- **Deploy**: `scripts/deploy-production.sh` (git pull → pnpm install → prisma generate → build → migrate → PM2 restart)
- **SSH**: `crm.pem` key file

## Key Conventions

1. **Prisma schema is one file** — `apps/api/prisma/schema.prisma`. Group new models under a banner comment for their domain; do not introduce a `prisma/schema/` directory without migrating the whole file
2. **OpenAPI is the single source of truth** for API contracts — always run `pnpm openapi:generate` after API changes
3. **All tenant data access** must go through `prisma.forTenant()` — RLS enforces this at DB level. Every new tenant-scoped table needs its own `tenant_isolation` (for `app_user`) and `platform_access` (for `platform_runtime`) policies plus grants, in the same migration that creates it
4. **Permissions** are checked at both API (guards) and UI (conditional rendering) levels. Add the key to `src/shared/authorization/permissions.constants.ts`, grant it in `DEFAULT_ROLE_PERMISSIONS`, and seed the `permissions` row — there is no CASL ability to update
5. **Module keys are UPPERCASE** (`ATTENDANCE`, `FIELD_TRACKING`, `POS`). Feature tiers and plan limits are `ModuleCapability` + `SubscriptionPlanCapability.limitValue` rows, not bespoke tables
6. **Respect `apps/api/architecture/`** — run `pnpm architecture:check` before opening a PR
7. **Offline-first** in mobile — always handle connectivity loss gracefully
8. **Append-only audit** — never update or delete audit log entries
9. **Background jobs** run in a separate worker process (`src/worker.ts`), not in the API process. Recurring work uses BullMQ repeatable jobs
10. **Load tests** should be written for any new high-throughput endpoint

## Sprint History

| Sprint    | Status      | Focus                                                            |
| --------- | ----------- | ---------------------------------------------------------------- |
| Sprint 1  | ✅ Complete | Organization, employees, tenant access, imports, API hardening    |
| Sprint 2  | ✅ Complete | Platform owner core, operational foundation                       |
| Sprint 3  | ✅ Complete | Business-admin web, attendance configuration                     |
| Sprint 4  | ✅ Complete | Deterministic attendance calculator, dashboard, web punches       |
| Sprint 5  | ✅ Complete | Trusted mobile attendance (device, integrity, location, face)     |
| Sprint 6  | 🔄 In Progress | Field tracking, offline replay, live map, route playback     |
| Sprint 6.5| ✅ Complete | Dynamic tenant runtime, attendance capability config, branding    |
| Sprint 7  | ✅ Complete | Regularization, notifications, reports, payroll lock, minimal leave |
| Sprint 7.5| 🔄 In Progress | Tenant HR portal reconstruction for GA                    |
| Sprint 8  | 🔄 In Progress | Billing, revenue ops, retention, security hardening, GA gate |
| Sprint 9  | ⏳ Not Started | Modular architecture refactoring, team ownership            |
| POS 1–7   | ⏳ Not Started | Point of Sale product — see `docs/POS/POS-IMPLEMENTATION-PLAN.md` §14 |

## Important Documentation

- [Sprint Implementation Index](docs/SPRINTS-IMPLEMENTATION-INDEX.md)
- [Tech Stack & Folder Structure](docs/TECH-STACK-AND-FOLDER-STRUCTURE.md)
- [Files Explained](docs/FILES-EXPLAINED.md)
- [Role Permission Guide](docs/ROLE-PERMISSION-GUIDE.md)
- [Tenant Dashboard Role Model](docs/TENANT-DASHBOARD-ROLE-MODEL.md)
- [Sprint 8 Operations Runbook](docs/SPRINT-8-OPERATIONS-RUNBOOK.md)
- [Sprint 8 Security Threat Model](docs/SPRINT-8-SECURITY-THREAT-MODEL.md)
- [Biometric Data Protection](docs/BIOMETRIC-DATA-PROTECTION.md)
- [OpenAPI Spec](docs/openapi.json)
- [ERD](docs/erd-v4.puml)

### Point of Sale (planned product)

- [POS Foundation Decisions](docs/POS/POS-FOUNDATION-DECISIONS.md) — **read first**; binding structural decisions
- [POS Implementation Plan](docs/POS/POS-IMPLEMENTATION-PLAN.md)
- [POS Features Specification](docs/POS/POS-FEATURES-SPECIFICATION.md)
- [POS ERD](docs/POS/POS-ERD.md)
- [POS User Flows](docs/POS/POS-USER-FLOWS.md)
- [POS Phase-Wise Execution](docs/POS/POS-PHASE-WISE-EXECUTION.md)
