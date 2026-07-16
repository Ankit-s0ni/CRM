// =====================================================================
// TECH STACK & FOLDER STRUCTURE GUIDE
// Complete reference for setting up the codebase
// =====================================================================

# Tech Stack & Project Structure

## 1. Technology Stack (by layer)

### Backend
- **Runtime:** Node.js 20+ (LTS)
- **Language:** TypeScript (strict mode)
- **Framework:** NestJS (modular monolith)
- **ORM:** Prisma (with raw SQL for partitioning/RLS)
- **Database:** PostgreSQL 16 (+ PostGIS if/when geofences upgrade to polygons)
- **Cache/Queue:** Redis (BullMQ for background jobs, cache-aside pattern)
- **Validation:** Zod (edge layer) + class-validator (DTOs)
- **Auth:** JWT (self-hosted) + Passport strategies
- **Authorization:** CASL (role-based + attribute-based)
- **File Storage:** AWS S3 or Minio (self-hosted S3-compatible)
- **Biometric Providers:** AWS Rekognition (swap to InsightFace / Clarifai later)
- **Device Attestation:** Play Integrity API (Android), App Attest (iOS)
- **Push Notifications:** Firebase Cloud Messaging (FCM)
- **Email:** AWS SES or Resend
- **Monitoring:** OpenTelemetry + Sentry (errors) + Prometheus/Grafana (metrics)
- **Testing:** Jest (unit/integration), Testcontainers (DB tests), Supertest (HTTP)
- **Migration:** Prisma migrate (schema evolution)
- **API Versioning:** REST + OpenAPI 3.0 (generated client types)

### Web Frontend (three portals, one app)
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Component Library:** shadcn/ui (headless, Tailwind CSS)
- **Admin/CRUD UI:** Refine or React-Admin (data-intensive portals)
- **State:** TanStack Query (server state) + Zustand (UI state)
- **Forms:** React Hook Form + Zod
- **Type Safety:** Prisma-generated types + OpenAPI codegen
- **Charts:** Recharts (muster, reports)
- **Map:** Leaflet + react-leaflet (geofence visualization, live map)
- **Real-time:** TanStack Query (polling) + EventSource/WebSocket (live board)
- **Build:** Next.js built-in (Turbopack)
- **CSS:** Tailwind CSS

### Mobile (Employee App — Flutter + Riverpod 3)
- **Framework:** Flutter 3.16+ (single codebase iOS + Android)
- **Language:** Dart 3.2+ (null safety enforced)
- **State Management:** Riverpod 2.4+ (compile-time safe, reactive)
  - `riverpod`, `flutter_riverpod`, `riverpod_generator`
- **Offline Storage:** Isar (fast, type-safe local database; replaces WatermelonDB)
- **Networking:** Dio (HTTP client; similar to axios)
- **OpenAPI Client:** Dio + OpenAPI Generator (same typed contracts as web)
- **Camera & Liveness:** `camera` + `google_mlkit_face_detection` (on-device face detection + blink verification)
- **Device Integrity:** `play_integrity` (Android), `app_attest_service` (iOS)
- **Location & Background:** `location`, `workmanager` (15-min GPS pings for field staff)
- **Push Notifications:** `firebase_messaging` (FCM) + `flutter_local_notifications`
- **Secure Storage:** `flutter_secure_storage` (encrypted JWT/refresh tokens)
- **Permissions:** `permission_handler` (fine-grained control)
- **Routing:** `go_router` (declarative, type-safe navigation)
- **Serialization:** `freezed`, `json_serializable` (immutable models + JSON codegen)
- **Testing:** `flutter_test`, `mocktail` (mocking)

### DevOps & Deployment
- **Containerization:** Docker (multi-stage builds)
- **Orchestration:** Kubernetes or Fly.io / ECS / Railway (managed)
- **CI/CD:** GitHub Actions (or GitLab CI)
- **Secrets:** AWS Secrets Manager / HashiCorp Vault / Doppler
- **Monitoring:** Datadog / New Relic / Grafana (optional but recommended)
- **Logging:** Structured JSON (pino) → CloudWatch / Datadog / Grafana Loki
- **Infrastructure as Code:** Terraform (optional; managed hosting may not need it)

### Development
- **Package Manager:** pnpm (monorepo) or npm
- **Linting:** ESLint + Prettier
- **Type Checking:** tsc (CI gate)
- **Git Hooks:** husky + lint-staged
- **Commit Convention:** Conventional Commits (via commitizen or enforceable)
- **Changelog:** changesets
- **Local Dev:** Docker Compose (postgres + redis + minio + mailpit)

---

## 2. Folder Structure (Monorepo Layout)

```
hrms-attendance-platform/
├── apps/
│   ├── api/                              # NestJS backend (monolith)
│   │   ├── src/
│   │   │   ├── main.ts                   # app bootstrap
│   │   │   ├── app.module.ts             # root module
│   │   │   ├── modules/                  # BOUNDED CONTEXTS (§3.2)
│   │   │   │   ├── platform/             # BC: Tenancy & subscriptions
│   │   │   │   │   ├── domain/           #   entities, value objects, domain services
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   ├── subscription-plan.entity.ts
│   │   │   │   │   │   │   ├── tenant.entity.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── tenant.service.ts       # public API
│   │   │   │   │   │   │   ├── subscription.service.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── events/       # domain events
│   │   │   │   │   │   │   ├── tenant-created.event.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── policies/     # business rule encapsulation
│   │   │   │   │   │       └── dunning.policy.ts
│   │   │   │   │   │
│   │   │   │   │   ├── application/      # use-cases, ports, DTOs
│   │   │   │   │   │   ├── commands/     # write operations
│   │   │   │   │   │   │   ├── create-tenant.command.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── queries/      # read operations
│   │   │   │   │   │   │   ├── get-tenant.query.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── dto/          # data transfer objects (versioned)
│   │   │   │   │   │   │   ├── v1/
│   │   │   │   │   │   │   │   ├── create-tenant.dto.ts
│   │   │   │   │   │   │   │   └── tenant.response.dto.ts
│   │   │   │   │   │   │   └── v2/ (future versioning)
│   │   │   │   │   │   ├── mappers/      # DTO ↔ entity transformations
│   │   │   │   │   │   │   └── tenant.mapper.ts
│   │   │   │   │   │   └── ports/        # external dependency interfaces
│   │   │   │   │   │       ├── payment-gateway.port.ts
│   │   │   │   │   │       └── smtp.port.ts
│   │   │   │   │   │
│   │   │   │   │   ├── infrastructure/   # implementations of ports, DB access
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   │   ├── prisma-tenant.repository.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── adapters/     # port implementations
│   │   │   │   │   │   │   ├── stripe.payment-gateway.ts
│   │   │   │   │   │   │   ├── aws-ses.smtp.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── jobs/         # background tasks (BullMQ processors)
│   │   │   │   │   │       ├── billing.job.ts
│   │   │   │   │   │       └── ...
│   │   │   │   │   │
│   │   │   │   │   ├── presentation/     # HTTP controllers, guards, formatters
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   │   ├── tenants.controller.ts
│   │   │   │   │   │   │   ├── billing.controller.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── guards/       # decorators: @IsAdmin, @IsBillingOwner
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── formatters/   # response serializers (hide sensitive fields)
│   │   │   │   │   │       └── ...
│   │   │   │   │   │
│   │   │   │   │   ├── platform.module.ts
│   │   │   │   │   └── index.ts          # public API exports (domain events, ports)
│   │   │   │   │
│   │   │   │   ├── identity/             # BC: Users, roles, permissions, sessions
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   ├── user.entity.ts
│   │   │   │   │   │   │   ├── role.entity.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── password.service.ts
│   │   │   │   │   │   │   ├── jwt.service.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   │   └── user-created.event.ts
│   │   │   │   │   │   └── policies/
│   │   │   │   │   │       └── permission-matrix.ts
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── commands/
│   │   │   │   │   │   ├── queries/
│   │   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── mappers/
│   │   │   │   │   │   └── ports/
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   ├── adapters/     # Passport strategies, JWT issuers
│   │   │   │   │   │   └── jobs/
│   │   │   │   │   ├── presentation/
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   ├── guards/       # @UseGuards(JwtAuthGuard)
│   │   │   │   │   │   └── decorators/   # @CurrentUser(), @Roles(...)
│   │   │   │   │   ├── identity.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   ├── organization/         # BC: Employees, departments, designations
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   ├── employee.entity.ts
│   │   │   │   │   │   │   ├── department.entity.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── org-chart.service.ts
│   │   │   │   │   │   │   └── employment-lifecycle.service.ts
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   │   └── employee-created.event.ts
│   │   │   │   │   │   └── policies/
│   │   │   │   │   │       └── quota-enforcement.policy.ts
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── commands/
│   │   │   │   │   │   │   ├── create-employee.command.ts
│   │   │   │   │   │   │   ├── bulk-import-employees.command.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── queries/
│   │   │   │   │   │   ├── dto/
│   │   │   │   │   │   ├── mappers/
│   │   │   │   │   │   └── ports/
│   │   │   │   │   │       ├── employee.repository.ts
│   │   │   │   │   │       └── ...
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   │   ├── prisma-employee.repository.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── adapters/
│   │   │   │   │   │   └── jobs/
│   │   │   │   │   │       └── import-employees.job.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   └── guards/
│   │   │   │   │   ├── organization.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   ├── attendance/           # BC: THE PRODUCT (§4, detailed below)
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── aggregates/
│   │   │   │   │   │   │   ├── attendance-day.aggregate.ts   # aggregate root
│   │   │   │   │   │   │   ├── regularization-request.aggregate.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   │   ├── attendance-log.entity.ts
│   │   │   │   │   │   │   ├── attendance-event.entity.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── value-objects/
│   │   │   │   │   │   │   ├── geo-point.value-object.ts
│   │   │   │   │   │   │   ├── geofence.value-object.ts
│   │   │   │   │   │   │   ├── work-minutes.value-object.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── attendance-calculator.service.ts  # PURE, heavily tested
│   │   │   │   │   │   │   ├── policy-resolver.service.ts       # resolve employee > dept > tenant
│   │   │   │   │   │   │   ├── shift-resolver.service.ts
│   │   │   │   │   │   │   ├── attendance-date-attributor.service.ts  # night shift logic
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── verification/                # the core product (see verification-pipeline.ts)
│   │   │   │   │   │   │   ├── checks/
│   │   │   │   │   │   │   │   ├── device.check.ts
│   │   │   │   │   │   │   │   ├── integrity.check.ts
│   │   │   │   │   │   │   │   ├── location.check.ts
│   │   │   │   │   │   │   │   ├── face.check.ts
│   │   │   │   │   │   │   │   └── base.check.ts       # interface
│   │   │   │   │   │   │   ├── verification.pipeline.ts
│   │   │   │   │   │   │   └── verification.types.ts
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   │   ├── employee-checked-in.event.ts
│   │   │   │   │   │   │   ├── check-in-rejected.event.ts
│   │   │   │   │   │   │   ├── attendance-day-finalized.event.ts
│   │   │   │   │   │   │   ├── security-violation-detected.event.ts
│   │   │   │   │   │   │   ├── regularization-approved.event.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── exceptions/
│   │   │   │   │   │   │   ├── attendance.exception.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── policies/      # business rules
│   │   │   │   │   │       ├── no-double-checkin.policy.ts
│   │   │   │   │   │       ├── regularization-window.policy.ts
│   │   │   │   │   │       └── ...
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── commands/
│   │   │   │   │   │   │   ├── check-in.command.ts
│   │   │   │   │   │   │   ├── check-out.command.ts
│   │   │   │   │   │   │   ├── regularize-attendance.command.ts
│   │   │   │   │   │   │   ├── finalize-attendance-day.command.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── queries/
│   │   │   │   │   │   │   ├── get-attendance-today.query.ts
│   │   │   │   │   │   │   ├── get-muster-roll.query.ts
│   │   │   │   │   │   │   ├── get-live-board.query.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── check-in.service.ts    # use-case orchestrator
│   │   │   │   │   │   │   ├── regularization.service.ts
│   │   │   │   │   │   │   ├── field-tracking.service.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── dto/
│   │   │   │   │   │   │   ├── v1/
│   │   │   │   │   │   │   │   ├── check-in.request.dto.ts
│   │   │   │   │   │   │   │   ├── attendance-log.response.dto.ts
│   │   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   │   └── v2/ (future)
│   │   │   │   │   │   ├── mappers/
│   │   │   │   │   │   │   ├── attendance-log.mapper.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── ports/
│   │   │   │   │   │       ├── attendance-day.repository.ts
│   │   │   │   │   │       ├── verification-log.repository.ts
│   │   │   │   │   │       ├── face-match.provider.ts
│   │   │   │   │   │       ├── device-integrity.provider.ts
│   │   │   │   │   │       ├── office-directory.provider.ts
│   │   │   │   │   │       ├── push-notification.provider.ts
│   │   │   │   │   │       └── ...
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   │   ├── repositories/
│   │   │   │   │   │   │   ├── prisma-attendance-day.repository.ts
│   │   │   │   │   │   │   ├── prisma-verification-log.repository.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── adapters/
│   │   │   │   │   │   │   ├── aws-rekognition.face-match.ts
│   │   │   │   │   │   │   ├── google-play-integrity.device-integrity.ts
│   │   │   │   │   │   │   ├── firebase-fcm.push-notification.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── jobs/
│   │   │   │   │   │       ├── finalize-attendance-day.job.ts
│   │   │   │   │   │       ├── absentee-sweep.job.ts
│   │   │   │   │   │       ├── ingest-location-pings.job.ts
│   │   │   │   │   │       ├── generate-muster-export.job.ts
│   │   │   │   │   │       ├── prune-old-pings.job.ts
│   │   │   │   │   │       └── ...
│   │   │   │   │   ├── presentation/
│   │   │   │   │   │   ├── controllers/
│   │   │   │   │   │   │   ├── check-in.controller.ts
│   │   │   │   │   │   │   ├── attendance-log.controller.ts
│   │   │   │   │   │   │   ├── regularization.controller.ts
│   │   │   │   │   │   │   ├── field-tracking.controller.ts
│   │   │   │   │   │   │   ├── reports.controller.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── guards/
│   │   │   │   │   │   │   ├── can-punch.guard.ts       # custom permissions
│   │   │   │   │   │   │   ├── can-approve-regularization.guard.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── formatters/
│   │   │   │   │   │   │   └── attendance-log.formatter.ts
│   │   │   │   │   │   └── interceptors/
│   │   │   │   │   │       └── attendance-audit.interceptor.ts
│   │   │   │   │   ├── attendance.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   ├── leave/                # BC: Leave policies, requests, balances
│   │   │   │   │   ├── domain/
│   │   │   │   │   ├── application/
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   ├── presentation/
│   │   │   │   │   ├── leave.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   ├── notifications/        # BC: Templates, delivery, preferences
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── entities/
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   │   ├── notification-renderer.service.ts
│   │   │   │   │   │   │   ├── notification-dispatcher.service.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── events/
│   │   │   │   │   │   └── policies/
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── event-handlers/       # subscribe to domain events
│   │   │   │   │   │   │   ├── employee-checked-in.handler.ts
│   │   │   │   │   │   │   ├── check-in-rejected.handler.ts
│   │   │   │   │   │   │   ├── regularization-approved.handler.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   └── dto/
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   │   ├── adapters/
│   │   │   │   │   │   │   ├── fcm.push.ts
│   │   │   │   │   │   │   ├── aws-ses.email.ts
│   │   │   │   │   │   │   └── ...
│   │   │   │   │   │   └── jobs/
│   │   │   │   │   │       └── dispatch-notifications.job.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   ├── notifications.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   ├── audit/                # BC: Append-only audit logs, cross-module
│   │   │   │   │   ├── domain/
│   │   │   │   │   ├── application/
│   │   │   │   │   ├── infrastructure/
│   │   │   │   │   │   └── repositories/
│   │   │   │   │   │       └── prisma-audit-log.repository.ts
│   │   │   │   │   ├── presentation/
│   │   │   │   │   ├── audit.module.ts
│   │   │   │   │   └── index.ts
│   │   │   │   │
│   │   │   │   └── (future modules follow same pattern)
│   │   │   │       ├── payroll/
│   │   │   │       ├── recruitment/
│   │   │   │       ├── projects/
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── shared/                   # Cross-cutting concerns (not a module)
│   │   │   │   ├── kernel/              # DDD base classes & shared types
│   │   │   │   │   ├── entity.ts
│   │   │   │   │   ├── aggregate-root.ts
│   │   │   │   │   ├── domain-event.ts
│   │   │   │   │   ├── domain-error.ts
│   │   │   │   │   ├── result.ts        # Either<Error, T> pattern
│   │   │   │   │   ├── value-object.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── tenancy/             # Tenant context, RLS, middleware
│   │   │   │   │   ├── tenancy.extension.ts  # (file 4, see above)
│   │   │   │   │   ├── tenancy.middleware.ts
│   │   │   │   │   ├── current-context.decorator.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── auth/                # JWT, guards, strategies
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── decorators/
│   │   │   │   │   │   ├── current-user.decorator.ts
│   │   │   │   │   │   ├── roles.decorator.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── jwt.service.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── authorization/       # CASL policies, permission matrix
│   │   │   │   │   ├── casl-ability.factory.ts
│   │   │   │   │   ├── permissions.constant.ts
│   │   │   │   │   ├── authorize.decorator.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── events/              # Event bus, outbox relay
│   │   │   │   │   ├── event-bus.ts
│   │   │   │   │   ├── outbox-relay.job.ts
│   │   │   │   │   ├── event-store.ts   # optional: event sourcing
│   │   │   │   │   └── ...
│   │   │   │   ├── validation/          # Zod schemas, validators
│   │   │   │   │   ├── common.schemas.ts
│   │   │   │   │   ├── geo.schemas.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── config/              # Environment validation, config service
│   │   │   │   │   ├── app.config.ts
│   │   │   │   │   ├── db.config.ts
│   │   │   │   │   ├── redis.config.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── logging/             # Structured logging, pino setup
│   │   │   │   │   ├── logger.service.ts
│   │   │   │   │   ├── pino.config.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── errors/              # Global error handling, exception filters
│   │   │   │   │   ├── http-exception.filter.ts
│   │   │   │   │   ├── domain-error.filter.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── pagination/          # Cursor-based pagination
│   │   │   │   │   └── cursor-pagination.ts
│   │   │   │   ├── caching/             # Cache-aside, Redis wrappers
│   │   │   │   │   ├── cache.service.ts
│   │   │   │   │   ├── cache-key.constants.ts
│   │   │   │   │   └── ...
│   │   │   │   ├── database/            # Prisma setup, seeding
│   │   │   │   │   ├── prisma.service.ts
│   │   │   │   │   └── seed.ts
│   │   │   │   ├── testing/             # Test utilities, fixtures, mocks
│   │   │   │   │   ├── database.fixture.ts
│   │   │   │   │   ├── tenant.fixture.ts
│   │   │   │   │   ├── user.fixture.ts
│   │   │   │   │   ├── mocks/
│   │   │   │   │   │   ├── face-match.mock.ts
│   │   │   │   │   │   ├── device-integrity.mock.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   └── ...
│   │   │   │   └── utils/               # General utilities
│   │   │   │       ├── strings.ts
│   │   │   │       ├── dates.ts         # timezone-aware date handling
│   │   │   │       └── ...
│   │   │   │
│   │   │   └── common/                  # App-level setup, not a module
│   │   │       ├── decorators/
│   │   │       ├── filters/
│   │   │       ├── interceptors/        # logging, error handling, audit
│   │   │       └── middleware/
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma            # (file 2, see above)
│   │   │   ├── migrations/              # auto-generated by prisma migrate
│   │   │   │   ├── 20260715120000_init/
│   │   │   │   │   └── migration.sql
│   │   │   │   ├── 20260715120100_rls_and_partitions/
│   │   │   │   │   └── migration.sql   # (file 3, see above)
│   │   │   │   └── (future migrations…)
│   │   │   └── seed.ts
│   │   │
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   │   ├── attendance/
│   │   │   │   │   ├── domain/
│   │   │   │   │   │   ├── verification/
│   │   │   │   │   │   │   ├── device.check.spec.ts
│   │   │   │   │   │   │   ├── location.check.spec.ts
│   │   │   │   │   │   │   ├── face.check.spec.ts
│   │   │   │   │   │   │   └── pipeline.spec.ts
│   │   │   │   │   │   ├── attendance-calculator.spec.ts
│   │   │   │   │   │   │   (table-driven test cases: night shift, half-day, DST, etc.)
│   │   │   │   │   │   ├── attendance-day.aggregate.spec.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── application/
│   │   │   │   │   │   ├── check-in.service.spec.ts
│   │   │   │   │   │   └── ...
│   │   │   │   │   └── ...
│   │   │   │   └── (other modules…)
│   │   │   ├── integration/
│   │   │   │   ├── tenancy/
│   │   │   │   │   ├── rls-isolation.spec.ts  # PERMANENT CI GATE
│   │   │   │   │   │   (assert tenant A cannot read tenant B)
│   │   │   │   │   └── ...
│   │   │   │   ├── attendance/
│   │   │   │   │   ├── check-in-flow.spec.ts
│   │   │   │   │   ├── verification-pipeline.spec.ts
│   │   │   │   │   └── ...
│   │   │   │   └── ...
│   │   │   └── e2e/
│   │   │       ├── attendance.e2e-spec.ts
│   │   │       └── ...
│   │   │
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── ...
│   │
│   ├── worker/                          # Same codebase, alternate entrypoint for background jobs
│   │   ├── src/
│   │   │   ├── main.ts                  # BullMQ processor setup, not HTTP server
│   │   │   └── (imports from ../api/src)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── ...
│   │
│   ├── web/                             # Next.js web portals
│   │   ├── app/
│   │   │   ├── (super-admin)/           # route group: /admin
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── tenants/
│   │   │   │   │   ├── page.tsx         # tenant CRUD
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── modules/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── audit-logs/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── (business-admin)/        # route group: /admin/<tenant>/org
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── organization/
│   │   │   │   │   ├── departments/
│   │   │   │   │   ├── designations/
│   │   │   │   │   ├── employees/
│   │   │   │   │   └── ...
│   │   │   │   ├── settings/
│   │   │   │   │   ├── policies.tsx
│   │   │   │   │   ├── office-locations.tsx
│   │   │   │   │   └── ...
│   │   │   │   └── billing/
│   │   │   │       ├── plan.tsx
│   │   │   │       ├── invoices.tsx
│   │   │   │       └── ...
│   │   │   │
│   │   │   ├── (hr-portal)/             # route group: /hr
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/           # live board, quick stats
│   │   │   │   ├── attendance/
│   │   │   │   │   ├── page.tsx         # attendance list/filters
│   │   │   │   │   ├── [employeeId]/
│   │   │   │   │   │   └── page.tsx     # employee timeline
│   │   │   │   │   └── ...
│   │   │   │   ├── regularizations/
│   │   │   │   │   ├── page.tsx         # queue
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   └── page.tsx     # detail + approve/reject
│   │   │   │   │   └── ...
│   │   │   │   ├── field-tracking/
│   │   │   │   │   ├── live-map.tsx
│   │   │   │   │   ├── [employeeId]/route.tsx  # playback
│   │   │   │   │   └── ...
│   │   │   │   ├── reports/
│   │   │   │   │   ├── muster.tsx
│   │   │   │   │   ├── payroll.tsx
│   │   │   │   │   ├── late-ot.tsx
│   │   │   │   │   ├── violations.tsx
│   │   │   │   │   └── ...
│   │   │   │   ├── audit-logs/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── (employee-self-service)/  # route group: /account
│   │   │   │   ├── profile/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── my-attendance/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── notifications/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── callback/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   └── layout.tsx               # root layout
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                      # shadcn/ui + custom
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── modal.tsx
│   │   │   │   ├── form-fields.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/
│   │   │   │   ├── navbar.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── ...
│   │   │   ├── attendance/
│   │   │   │   ├── live-board.tsx       # real-time grid
│   │   │   │   ├── attendance-list.tsx
│   │   │   │   ├── regularization-queue.tsx
│   │   │   │   ├── muster-table.tsx
│   │   │   │   └── ...
│   │   │   ├── geofence/
│   │   │   │   ├── map-editor.tsx       # Leaflet map + draw tools
│   │   │   │   └── ...
│   │   │   └── ...
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-attendance.ts        # TanStack Query wrapper
│   │   │   ├── use-tenant.ts
│   │   │   ├── use-live-board.ts        # WebSocket/SSE subscription
│   │   │   └── ...
│   │   │
│   │   ├── lib/
│   │   │   ├── api-client.ts            # OpenAPI-generated + axios config
│   │   │   ├── auth.ts                  # Next.js auth setup (middleware, cookies)
│   │   │   ├── store.ts                 # Zustand stores (UI state)
│   │   │   └── ...
│   │   │
│   │   ├── styles/
│   │   │   ├── globals.css              # Tailwind imports
│   │   │   └── ...
│   │   │
│   │   ├── types/
│   │   │   ├── api.generated.ts         # OpenAPI codegen output
│   │   │   ├── models.ts
│   │   │   └── ...
│   │   │
│   │   ├── middleware.ts                # Next.js middleware (JWT verification, tenant check)
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── package.json
│   │   ├── .env.example
│   │   └── ...
│   │
│   └── mobile/                          # Flutter app (iOS + Android)
│       ├── lib/
│       │   ├── main.dart                # app entrypoint
│       │   ├── config/
│       │   │   ├── app_config.dart      # env, feature flags
│       │   │   ├── app_router.dart      # go_router configuration
│       │   │   ├── di_container.dart    # dependency injection (Riverpod)
│       │   │   └── constants.dart
│       │   │
│       │   ├── features/                # Feature-driven (mirrors bounded contexts)
│       │   │   ├── auth/                # BC: Authentication & sessions
│       │   │   │   ├── data/
│       │   │   │   │   ├── models/
│       │   │   │   │   │   ├── user.model.dart
│       │   │   │   │   │   └── auth_token.model.dart
│       │   │   │   │   ├── datasources/
│       │   │   │   │   │   └── auth_remote_datasource.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── auth_repository_impl.dart
│       │   │   │   │   └── providers/
│       │   │   │   │       └── auth_provider.dart  # Riverpod + DI
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   │   └── user.entity.dart
│       │   │   │   │   ├── failures/
│       │   │   │   │   │   └── auth_failure.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── auth_repository.dart  # interface
│       │   │   │   │   └── usecases/
│       │   │   │   │       ├── login_usecase.dart
│       │   │   │   │       ├── logout_usecase.dart
│       │   │   │   │       └── refresh_token_usecase.dart
│       │   │   │   └── presentation/
│       │   │   │       ├── controllers/
│       │   │   │       │   └── auth_controller.dart  # Riverpod StateNotifier
│       │   │   │       ├── pages/
│       │   │   │       │   ├── login_page.dart
│       │   │   │       │   ├── register_page.dart
│       │   │   │       │   └── splash_page.dart
│       │   │   │       ├── widgets/
│       │   │   │       │   ├── login_form.dart
│       │   │   │       │   └── ...
│       │   │   │       └── providers.dart         # public state exports
│       │   │   │
│       │   │   ├── attendance/                    # BC: Attendance (the core product)
│       │   │   │   ├── data/
│       │   │   │   │   ├── models/
│       │   │   │   │   │   ├── attendance_log.model.dart
│       │   │   │   │   │   ├── attendance_event.model.dart
│       │   │   │   │   │   ├── verification_result.model.dart
│       │   │   │   │   │   └── punch_request.model.dart
│       │   │   │   │   ├── datasources/
│       │   │   │   │   │   ├── attendance_remote_datasource.dart  # API calls
│       │   │   │   │   │   └── attendance_local_datasource.dart   # Isar
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── attendance_repository_impl.dart
│       │   │   │   │   └── providers/
│       │   │   │   │       └── attendance_provider.dart
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   │   ├── attendance_log.entity.dart
│       │   │   │   │   │   ├── verification_requirement.entity.dart
│       │   │   │   │   │   └── punch.entity.dart
│       │   │   │   │   ├── failures/
│       │   │   │   │   │   └── attendance_failure.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── attendance_repository.dart  # interface
│       │   │   │   │   ├── usecases/
│       │   │   │   │   │   ├── check_in_usecase.dart
│       │   │   │   │   │   ├── check_out_usecase.dart
│       │   │   │   │   │   ├── sync_offline_punches_usecase.dart
│       │   │   │   │   │   ├── get_today_attendance_usecase.dart
│       │   │   │   │   │   └── ...
│       │   │   │   │   └── validators/
│       │   │   │   │       ├── verification_validator.dart
│       │   │   │   │       └── punch_validator.dart
│       │   │   │   └── presentation/
│       │   │   │       ├── controllers/
│       │   │   │       │   ├── check_in_controller.dart
│       │   │   │       │   ├── offline_queue_controller.dart
│       │   │   │       │   └── ...
│       │   │   │       ├── pages/
│       │   │   │       │   ├── check_in_page.dart
│       │   │   │       │   ├── today_timeline_page.dart
│       │   │   │       │   ├── attendance_history_page.dart
│       │   │   │       │   └── ...
│       │   │   │       ├── widgets/
│       │   │   │       │   ├── camera_capture.dart          # liveness + selfie UX
│       │   │   │       │   ├── punch_button.dart
│       │   │   │       │   ├── timeline_card.dart
│       │   │   │       │   ├── verification_error_display.dart  # user-friendly errors
│       │   │   │       │   ├── offline_sync_indicator.dart
│       │   │   │       │   └── ...
│       │   │   │       └── providers.dart
│       │   │   │
│       │   │   ├── location/                     # BC: Field tracking & geolocation
│       │   │   │   ├── data/
│       │   │   │   │   ├── models/
│       │   │   │   │   │   ├── location_ping.model.dart
│       │   │   │   │   │   └── geofence.model.dart
│       │   │   │   │   ├── datasources/
│       │   │   │   │   │   ├── location_remote_datasource.dart
│       │   │   │   │   │   └── location_local_datasource.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── location_repository_impl.dart
│       │   │   │   │   └── providers/
│       │   │   │   │       └── location_provider.dart
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   │   ├── location_ping.entity.dart
│       │   │   │   │   │   └── geofence.entity.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── location_repository.dart
│       │   │   │   │   ├── usecases/
│       │   │   │   │   │   ├── start_background_tracking_usecase.dart
│       │   │   │   │   │   ├── stop_background_tracking_usecase.dart
│       │   │   │   │   │   ├── submit_ping_usecase.dart
│       │   │   │   │   │   └── ...
│       │   │   │   │   └── background_task_executor.dart  # workmanager processor
│       │   │   │   └── presentation/
│       │   │   │       ├── pages/
│       │   │   │       ├── widgets/
│       │   │   │       └── providers.dart
│       │   │   │
│       │   │   ├── notifications/                # BC: Push & local notifications
│       │   │   │   ├── data/
│       │   │   │   │   ├── models/
│       │   │   │   │   │   └── notification.model.dart
│       │   │   │   │   ├── datasources/
│       │   │   │   │   │   └── fcm_datasource.dart
│       │   │   │   │   └── repositories/
│       │   │   │   │       └── notification_repository_impl.dart
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── notification_repository.dart
│       │   │   │   │   └── usecases/
│       │   │   │   │       ├── register_device_token_usecase.dart
│       │   │   │   │       └── show_local_notification_usecase.dart
│       │   │   │   └── presentation/
│       │   │   │       └── providers.dart
│       │   │   │
│       │   │   ├── device/                       # Device info, attestation, integrity
│       │   │   │   ├── data/
│       │   │   │   │   ├── datasources/
│       │   │   │   │   │   ├── device_info_datasource.dart
│       │   │   │   │   │   ├── play_integrity_datasource.dart
│       │   │   │   │   │   ├── app_attest_datasource.dart
│       │   │   │   │   │   └── ...
│       │   │   │   │   └── repositories/
│       │   │   │   │       └── device_repository_impl.dart
│       │   │   │   ├── domain/
│       │   │   │   │   ├── entities/
│       │   │   │   │   │   ├── device_info.entity.dart
│       │   │   │   │   │   └── integrity_token.entity.dart
│       │   │   │   │   ├── repositories/
│       │   │   │   │   │   └── device_repository.dart
│       │   │   │   │   └── usecases/
│       │   │   │   │       ├── get_device_integrity_token_usecase.dart
│       │   │   │   │       ├── register_device_usecase.dart
│       │   │   │   │       └── ...
│       │   │   │   └── presentation/
│       │   │   │       └── providers.dart
│       │   │   │
│       │   │   └── common/                       # Shared across features
│       │   │       ├── widgets/
│       │   │       │   ├── error_dialog.dart
│       │   │       │   ├── loading_indicator.dart
│       │   │       │   └── ...
│       │   │       ├── utils/
│       │   │       │   ├── date_utils.dart        # timezone handling, night shift logic
│       │   │       │   ├── location_utils.dart    # Haversine, geofence math
│       │   │       │   ├── logger.dart
│       │   │       │   └── error_mapper.dart      # API error -> user-friendly message
│       │   │       ├── extensions/
│       │   │       │   ├── string_extensions.dart
│       │   │       │   ├── datetime_extensions.dart
│       │   │       │   └── ...
│       │   │       └── constants/
│       │   │           ├── app_strings.dart
│       │   │           ├── app_colors.dart
│       │   │           ├── api_constants.dart     # endpoints, timeouts
│       │   │           └── ...
│       │   │
│       │   ├── services/                         # Low-level cross-cutting services
│       │   │   ├── offline_queue_service.dart    # Isar-backed punch queue
│       │   │   ├── sync_service.dart             # Offline event replay with retry
│       │   │   ├── network_service.dart          # Network status monitoring
│       │   │   ├── secure_storage_service.dart   # flutter_secure_storage wrapper
│       │   │   ├── push_notification_service.dart # FCM setup & handling
│       │   │   ├── location_service.dart         # Background location management
│       │   │   ├── device_integrity_service.dart # Play Integrity / App Attest
│       │   │   └── logger_service.dart           # Structured logging
│       │   │
│       │   └── generated/                        # Code-gen outputs (git-ignored)
│       │       ├── riverpod_generator.config.dart
│       │       └── (other generated files…)
│       │
│       ├── test/
│       │   ├── unit/
│       │   │   ├── features/
│       │   │   │   ├── auth/
│       │   │   │   │   ├── domain/
│       │   │   │   │   │   └── usecases/
│       │   │   │   │   │       └── login_usecase_test.dart
│       │   │   │   │   └── data/
│       │   │   │   │       └── repositories/
│       │   │   │   │           └── auth_repository_test.dart
│       │   │   │   ├── attendance/
│       │   │   │   │   ├── domain/
│       │   │   │   │   │   ├── usecases/
│       │   │   │   │   │   │   ├── check_in_usecase_test.dart
│       │   │   │   │   │   │   └── sync_offline_punches_usecase_test.dart
│       │   │   │   │   │   └── validators/
│       │   │   │   │   │       └── verification_validator_test.dart
│       │   │   │   │   └── data/
│       │   │   │   │       └── repositories/
│       │   │   │   │           └── attendance_repository_test.dart
│       │   │   │   └── location/
│       │   │   │       └── ...
│       │   │   └── services/
│       │   │       ├── offline_queue_service_test.dart
│       │   │       ├── sync_service_test.dart
│       │   │       └── ...
│       │   ├── integration/
│       │   │   ├── attendance_flow_test.dart      # offline → online sync flow
│       │   │   ├── check_in_with_verification_test.dart
│       │   │   └── ...
│       │   ├── widget/
│       │   │   ├── features/
│       │   │   │   ├── check_in_page_test.dart
│       │   │   │   └── ...
│       │   │   └── ...
│       │   ├── fixtures/
│       │   │   ├── mock_attendance_data.dart
│       │   │   ├── mock_user_data.dart
│       │   │   └── ...
│       │   └── golden/
│       │       └── (golden images for UI regression testing)
│       │
│       ├── android/
│       │   ├── app/
│       │   │   └── build.gradle
│       │   ├── gradle.properties              # Android config
│       │   ├── settings.gradle
│       │   └── ... (standard Android files)
│       │
│       ├── ios/
│       │   ├── Runner.xcodeproj
│       │   ├── Pods/                          # CocoaPods dependencies
│       │   ├── Runner/
│       │   │   ├── Info.plist                 # iOS permissions, push, camera
│       │   │   └── GeneratedPluginRegistrant.m
│       │   └── ... (standard iOS files)
│       │
│       ├── pubspec.yaml                       # Dependencies
│       ├── pubspec.lock                       # Lockfile (commit this)
│       ├── analysis_options.yaml              # Linting rules
│       ├── build.yaml                         # build_runner config
│       ├── dart_defines.json                  # Compile-time constants
│       ├── .env.example
│       ├── .gitignore
│       └── README.md
│
├── packages/                            # Shared code (monorepo)
│   ├── contracts/                       # Shared API contracts
│   │   ├── src/
│   │   │   ├── api/
│   │   │   │   ├── v1/
│   │   │   │   │   ├── index.ts         # OpenAPI schema, generated types
│   │   │   │   │   ├── attendance.api.ts
│   │   │   │   │   ├── employee.api.ts
│   │   │   │   │   └── ...
│   │   │   │   └── v2/ (future)
│   │   │   ├── enums/
│   │   │   │   ├── work-type.enum.ts
│   │   │   │   ├── attendance-status.enum.ts
│   │   │   │   └── ...
│   │   │   ├── schemas/
│   │   │   │   ├── geo.schemas.ts
│   │   │   │   ├── attendance.schemas.ts
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                              # Shared React components
│       ├── src/
│       │   ├── components/
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   └── ...
│       │   ├── hooks/
│       │   │   ├── use-form.ts
│       │   │   └── ...
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker/
│   ├── api.Dockerfile                  # (or just apps/api/Dockerfile)
│   ├── worker.Dockerfile
│   ├── web.Dockerfile
│   └── ...
│
├── .github/
│   └── workflows/
│       ├── ci.yml                       # lint, test, type-check, build
│       ├── deploy-staging.yml
│       ├── deploy-production.yml
│       └── ...
│
├── docs/
│   ├── architecture.md                  # (this review)
│   ├── adr/                             # Architecture Decision Records
│   │   ├── 0001-nesting-choice.md
│   │   ├── 0002-multi-tenancy-model.md
│   │   ├── 0003-verification-pipeline.md
│   │   └── ...
│   ├── api/
│   │   ├── attendance-api.md
│   │   └── ...
│   ├── playbook/
│   │   ├── onboarding.md
│   │   ├── database-migrations.md
│   │   ├── troubleshooting.md
│   │   └── ...
│   └── ...
│
├── docker-compose.yml                  # dev: postgres + redis + minio + mailpit
├── .env.example                        # root env template
├── .gitignore
├── pnpm-workspace.yaml                 # or lerna.json / npm workspaces
├── tsconfig.base.json
├── package.json                        # root package.json (scripts)
├── README.md
└── LICENSE

```

---

## 3. Key conventions & guardrails

### NestJS Module boundaries
- **One bounded context = one NestJS module** (attendance.module.ts exports its public API via `index.ts`).
- **Internal imports:** `src/modules/attendance/domain/...` within attendance only.
- **Cross-module imports:** ONLY via the module's public `index.ts` exports (API boundaries).
- **Enforcement:** ESLint boundary rules in CI.

### Folder naming
- **Plural for collections** (`services/`, `repositories/`, `adapters/`).
- **Singular for individuals** (`attendance-calculator.service.ts`, not `attendance_calculators/`).
- **Kebab-case for files**, PascalCase for exports.

### Test file colocation
- Unit tests live next to the code: `attendance-calculator.service.ts` → `attendance-calculator.service.spec.ts`.
- Integration/e2e tests live in `test/integration/`, `test/e2e/`.

### Environment setup
- **`.env.example`** in each app (api/, web/, mobile/) — committed, no secrets.
- **`.env.local`** (git-ignored) — developer overrides, never committed.
- **GitHub Secrets** for CI/CD secrets (API keys, deploy credentials).
- **Config validation:** load from env via zod schema at boot; fail fast if invalid.

---

## 4. Getting started checklist

**Backend (API):**
```bash
cd apps/api
npm install
npx prisma migrate dev --name init
npm run dev
# Server runs on http://localhost:3000
```

**Web:**
```bash
cd apps/web
npm install
npm run dev
# Browser opens http://localhost:3001
```

**Mobile (Flutter):**
```bash
cd apps/mobile
flutter pub get
dart run build_runner build  # generate Riverpod providers, Freezed classes
flutter run -d <device>     # run on connected device or emulator
# Hot reload enabled with 'r' command
```

**Docker local stack:**
```bash
docker-compose up -d
# postgres:5432, redis:6379, minio:9000, mailpit:1025/8025
```

---

## 5. Why this structure matters

This folder organization operationalizes the architecture review:

- **Bounded contexts as modules** (§Phase 1) are the physical seams — teams own contexts, not layers.
- **4-layer per module** (domain/application/infrastructure/presentation) keeps concerns separated — domain is portable, infrastructure is swappable.
- **Shared kernel** (shared/) doesn't become a junk drawer — base classes, enums, validation schemas, and tenancy middleware live there.
- **Test colocation** ensures unit tests are written, kept up-to-date, and run frequently.
- **Monorepo structure** (apps + packages) allows web/mobile to share contract definitions + types.
- **Flutter + Riverpod 3** provides type-safe, reactive state management with compile-time guarantees — no stringly-typed provider keys.
- **Isar** gives offline-first persistence with a type-safe query API, replacing WatermelonDB with better performance and developer experience.
