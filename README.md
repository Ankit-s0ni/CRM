# DeltCRM

A multi-tenant SaaS CRM/HRMS platform built with a modern TypeScript + Flutter monorepo. Currently focused on a comprehensive **Attendance Management** module with plans for full CRM expansion.

## Features

### 🏢 Multi-Tenant Platform

- Subdomain-based tenant isolation with PostgreSQL Row-Level Security
- Subscription plan and module management
- Platform admin control plane for tenant lifecycle
- Billing and invoicing (Stripe/Razorpay)

### ⏱️ Attendance Management

- **Punch In/Out** — GPS-verified, selfie-captured, biometric-authenticated
- **Multi-Layer Verification Pipeline** — Device → Integrity → Location → Face
- **Shift Management** — Configurable shifts, grace periods, half-day thresholds
- **Weekly-Off Patterns** — Flexible weekly-off configurations (e.g., alternate Saturdays)
- **Holiday Calendar** — Tenant-specific holiday definitions
- **Geofence Enforcement** — Office location-based punch validation
- **Attendance Reports** — Daily summaries, monthly sheets, late/early/absent reports
- **Regularization** — Employee-initiated attendance corrections with approval workflow
- **Payroll Lock** — Period-based attendance locking for payroll processing

### 📍 Field Tracking

- Real-time field employee location tracking
- SSE-powered live board with map visualization
- Route playback and history
- Background location pings from mobile app

### 🏖️ Leave Management

- Leave type configuration (Casual, Sick, Earned, etc.)
- Application and approval workflows
- Balance tracking and accrual policies

### 👥 Employee Management

- Employee profiles with department and designation
- Document upload and verification pipeline
- Bulk import via CSV

### 🔐 Role-Based Access Control

- CASL-powered fine-grained permissions (RBAC + ABAC)
- Role hierarchy: Platform Admin → Business Admin → HR Admin → Manager → Employee
- UI-level conditional rendering based on permissions

### 📱 Mobile App

- Flutter cross-platform app (iOS + Android)
- Offline-first with background sync
- Camera-based punch verification
- GPS and biometric integration
- Push notifications

## Tech Stack

| Component               | Technology                                       |
| ----------------------- | ------------------------------------------------ |
| **Backend**       | NestJS 11, TypeScript, Prisma 6, PostgreSQL 16   |
| **Frontend**      | Next.js 16, React 19, Tailwind CSS v4, Shadcn UI |
| **Mobile**        | Flutter, Dart, Riverpod, GoRouter                |
| **Cache/Queue**   | Redis 7, BullMQ                                  |
| **Storage**       | MinIO (S3-compatible)                            |
| **Auth**          | JWT + Argon2 + CASL                              |
| **Monorepo**      | pnpm workspaces + Turborepo                      |
| **Testing**       | Jest, Playwright, k6 (load)                      |
| **Observability** | OpenTelemetry, Sentry, Pino                      |

## Repository Structure

```
CRM/
├── apps/
│   ├── api/            # NestJS backend + BullMQ workers
│   ├── web/            # Next.js web frontend
│   └── mobile/         # Flutter mobile app
├── packages/
│   ├── contracts/      # Shared OpenAPI-generated TypeScript types
│   └── ui/             # Shared UI component library
├── docs/               # Architecture docs, ERD, runbooks, sprint history
├── scripts/            # Deployment, ops, and codegen scripts
└── tests/
    └── load/           # k6 load testing scripts
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 11.1.2
- **Docker** & **Docker Compose** (for local infrastructure)
- **Flutter SDK** >= 3.7.1 (for mobile development)
- **k6** (for load testing, optional)

## Getting Started

### 1. Clone and Install

```bash
git clone <repository-url>
cd CRM
pnpm install
```

### 2. Start Infrastructure

```bash
docker compose up -d
```

This starts:

- **PostgreSQL 16** on port `5433`
- **Redis 7** on port `6379`
- **MinIO** on ports `9000` (API) / `9001` (Console)

### 3. Configure Environment

```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your local configuration
```

Key variables:

| Variable          | Default / Example                                          |
| ----------------- | ---------------------------------------------------------- |
| `DATABASE_URL`  | `postgresql://postgres:postgres@localhost:5433/hrms_dev` |
| `REDIS_URL`     | `redis://localhost:6379`                                 |
| `JWT_SECRET`    | `your-secret-key`                                        |
| `S3_ENDPOINT`   | `http://localhost:9000`                                  |
| `S3_ACCESS_KEY` | `minioadmin`                                             |
| `S3_SECRET_KEY` | `minioadmin`                                             |
| `PORT`          | `4001`                                                   |

### 4. Setup Database

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 5. Start Development Servers

```bash
# From root directory
pnpm dev:api    # Starts API on http://localhost:4001
pnpm dev:web    # Starts web app on http://localhost:3000
```

### 6. Mobile Development

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Development Commands

```bash
# Quality gate (run before PR)
pnpm quality

# Individual checks
pnpm lint                    # ESLint across all packages
pnpm typecheck               # TypeScript type checking
pnpm test                    # Unit tests
pnpm test:e2e                # API end-to-end tests
pnpm test:web:e2e            # Web Playwright tests
pnpm architecture:check      # Architecture fitness tests

# Code generation
pnpm openapi:generate        # OpenAPI → TypeScript types + Flutter API routes

# Load testing
pnpm load:sprint8:punch      # Punch flow load test
pnpm load:sprint8:sync       # Sync load test
pnpm load:sprint8:pings      # Location pings load test
pnpm load:sprint8:reports    # Reports load test

# Operations
pnpm ops:backup              # PostgreSQL backup
pnpm ops:restore-drill       # Restore drill
pnpm security:check          # Dependency vulnerability scan
pnpm security:sbom           # Generate CycloneDX SBOM
```

## Architecture Highlights

### Multi-Tenancy

- **3-layer defense-in-depth**: Middleware (subdomain → tenant ID) → ORM (auto-scoped queries) → Database (RLS policies)
- Fail-closed design: queries return 0 rows if tenant context is missing

### Backend Architecture

- **Modular Monolith** with DDD Bounded Contexts
- **CQRS** for command/query separation
- **Transactional Outbox** for reliable event publishing
- **Separate Worker Process** for background jobs
- **Database Partitioning** on high-volume tables (events, location pings)

### Mobile Architecture

- **Clean Architecture** with feature-first organization
- **Offline-First** with local Isar DB + Workmanager background sync
- **Multi-Layer Verification** for punch: Device → Integrity → Location → Face

## API Documentation

The API auto-generates an OpenAPI spec:

```bash
pnpm openapi:export    # Exports to docs/openapi.json
```

## Production Deployment

Production runs on Ubuntu EC2 via PM2:

```bash
./scripts/deploy-production.sh
```

Deployment steps: `git pull` → `pnpm install` → `prisma generate` → `build` → `prisma migrate deploy` → `PM2 restart`

## Documentation

| Document                                                             | Description                                        |
| -------------------------------------------------------------------- | -------------------------------------------------- |
| [Sprint Index](docs/SPRINTS-IMPLEMENTATION-INDEX.md)                  | Complete sprint history and implementation details |
| [Tech Stack &amp; Structure](docs/TECH-STACK-AND-FOLDER-STRUCTURE.md) | Detailed architecture and folder structure         |
| [Operations Runbook](docs/SPRINT-8-OPERATIONS-RUNBOOK.md)             | Production operations procedures                   |
| [Security Threat Model](docs/SPRINT-8-SECURITY-THREAT-MODEL.md)       | Security analysis and mitigations                  |
| [Role Permissions](docs/ROLE-PERMISSION-GUIDE.md)                     | RBAC permission model guide                        |
| [Biometric Protection](docs/BIOMETRIC-DATA-PROTECTION.md)             | Biometric data handling policies                   |

## License

Proprietary — DeltTech. All rights reserved.
