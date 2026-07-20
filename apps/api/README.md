# DeltCRM API

The API is a NestJS modular monolith. Products can be developed by separate teams,
but share one deployment and PostgreSQL database until operational scale justifies a
service split.

## Start Here

```bash
pnpm install
pnpm --filter api exec prisma generate
pnpm --filter api start:dev
```

The API uses port `4001` by default. Swagger is available at
`http://localhost:4001/api/docs`.

## Product Map

| Boundary          | Public entry                                             | Responsibility                                                  |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| Attendance        | `src/products/attendance/public.ts`                      | Punches, policy, schedule, leave, correction, trust and reports |
| Identity & Access | `src/platform/identity/public.ts` and `access/public.ts` | Authentication, accounts, roles and permissions                 |
| Organization      | `src/platform/organization/public.ts`                    | Employees, placement and reporting hierarchy                    |
| Workspace         | `src/platform/workspace/public.ts`                       | Tenant lifecycle, branding and settings                         |
| Billing           | `src/platform/billing/public.ts`                         | Plans, subscriptions, invoices and seats                        |
| Platform Admin    | `src/platform/control-plane/public.ts`                   | DeltCRM operator control plane                                  |
| Notifications     | `src/platform/notifications/public.ts`                   | Provider-neutral delivery contracts                             |

Attendance is one product. Its `core`, `configuration`, `verification`, `trust`,
`field`, `leave`, `regularization` and `reporting` folders are internal capabilities,
not separate commercial products.

## Dependency Rule

Code may import another product only through that product's `public.ts`. Domain code
must not import NestJS, Prisma or HTTP DTOs. Shared technical code must never import a
business module.

Run the enforceable checks before opening a pull request:

```bash
pnpm --filter api architecture:test
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test -- --runInBand
pnpm --filter api build
```

Architecture rules and ownership are documented in
`architecture/MODULE-DEVELOPMENT.md` and `architecture/TABLE-OWNERSHIP.md`.

## Add a Product or Capability

1. Read `architecture/MODULE-DEVELOPMENT.md`.
2. Copy the files from `architecture/templates/module`.
3. Register ownership and allowed dependencies in `architecture/module-boundaries.json`.
4. Add tables to `architecture/TABLE-OWNERSHIP.md` before writing a migration.
5. Expose only stable commands, readers and modules from `public.ts`.
6. Add a module-specific test and run `architecture:test`.

Do not add a new top-level module merely because a screen or endpoint exists. A folder
represents an owned business capability, not a navigation tab.

## Contracts and Tests

```bash
pnpm --filter api openapi:export
pnpm --filter api test:e2e -- --runInBand
```

The committed OpenAPI contract is `docs/openapi.json`. CI regenerates it and fails on
drift. Database-backed e2e tests require PostgreSQL, Redis and object storage from the
root `docker-compose.yml`.
