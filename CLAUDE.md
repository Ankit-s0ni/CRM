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
| ORM             | Prisma 6 with `@prisma/adapter-pg`, split schema files per domain |
| Database        | PostgreSQL 16 (RLS, partitioning, role-based connection strings)   |
| Cache & Queues  | Redis 7 (ioredis) + BullMQ                                        |
| Object Storage  | MinIO / AWS S3 (`@aws-sdk/client-s3`)                              |
| Auth            | Passport JWT + Argon2 password hashing                             |
| Authorization   | CASL (`@casl/ability`, `@casl/prisma`) with custom NestJS guards   |
| Validation      | Zod (`nestjs-zod`)                                                 |
| Real-time       | Server-Sent Events (SSE) for live field tracking                   |
| Scheduling      | `@nestjs/schedule` for cron jobs                                   |
| CQRS            | `@nestjs/cqrs` for command/query separation                        |
| Logging         | Pino (`nestjs-pino`)                                               |
| Observability   | OpenTelemetry + Sentry                                             |
| API Docs        | `@nestjs/swagger` → OpenAPI spec auto-generation                   |
| Testing         | Jest 30, Testcontainers for DB integration tests                   |

### Frontend (`apps/web/`)

| Layer            | Technology                                                     |
| ---------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router)                                        |
| Language         | TypeScript                                                      |
| Styling          | Tailwind CSS v4                                                 |
| Components       | Shadcn UI (Radix primitives + custom components)                |
| State Management | Zustand v5 (persisted stores for auth)                          |
| Data Fetching    | TanStack React Query + Axios with JWT interceptors              |
| Forms            | React Hook Form + Zod validation                                |
| Tables           | TanStack React Table                                            |
| Charts           | Recharts                                                        |
| Maps             | Leaflet (react-leaflet) for live field tracking                 |
| E2E Testing      | Playwright                                                      |

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

## Backend Module Map

### Platform Modules (`src/platform/`)

| Module                    | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `TenancyModule`           | Multi-tenant routing, isolation, subdomain lookup  |
| `IdentityModule`          | User authentication, JWT token issuance            |
| `OrganizationModule`      | Employees, Departments, Designations               |
| `AccessModule`            | RBAC + ABAC via CASL, role/permission management   |
| `AuditModule`             | Append-only audit logging                          |
| `NotificationsModule`     | Multi-channel notification delivery (via workers)  |
| `BillingModule`           | Invoicing, dunning, Stripe/Razorpay integrations   |
| `PlatformControlPlaneModule` | Super-admin tenant lifecycle management         |
| `WorkspaceProductModule`  | Workspace configurations                          |

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

### Shared Modules (`src/shared/`)

| Module               | Purpose                                     |
| -------------------- | ------------------------------------------- |
| `DatabaseModule`     | Prisma client setup, tenant-aware extensions |
| `AuthorizationModule`| CASL ability factory, permission guards      |
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
├── (auth)/           → login, signup, forgot-password, verify-email, accept-invitation
├── app/              → Multi-tenant workspace routes
│   ├── dashboard/    → Main dashboard
│   ├── attendance/   → Attendance register, exceptions, field, holidays, leave,
│   │                   offices, policies, regularizations, requests, rosters,
│   │                   shifts, security, setup
│   ├── employees/    → Employee list and detail ([id])
│   ├── settings/     → General, roles, modules, plans
│   └── ...
└── platform/         → Platform admin routes
    ├── tenants/      → Tenant management
    ├── billing/      → Billing management
    ├── audit/        → Audit logs
    └── ...
```

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

- **Format**: `resource.action` (e.g., `attendance.read`, `punch.create`, `workspace.dashboard.admin.read`)
- **Engine**: CASL for fine-grained attribute-based access control
- **Guards**: `JwtTenantGuard`, `PermissionsGuard`, `ModuleGuard`
- **Decorators**: `@RequirePermissions()`, `@RequireModule()`
- **UI**: Conditional rendering based on CASL abilities (fail-safe)

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

1. **Prisma schema** is split into domain-specific files under `apps/api/prisma/schema/`
2. **OpenAPI is the single source of truth** for API contracts — always run `pnpm openapi:generate` after API changes
3. **All tenant data access** must go through `prisma.forTenant()` — RLS enforces this at DB level
4. **Permissions** are checked at both API (guards) and UI (conditional rendering) levels
5. **Offline-first** in mobile — always handle connectivity loss gracefully
6. **Append-only audit** — never update or delete audit log entries
7. **Background jobs** run in a separate worker process (`src/worker.ts`), not in the API process
8. **Load tests** should be written for any new high-throughput endpoint

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
