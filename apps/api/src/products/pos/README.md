# POS Product

## Purpose

POS (Point of Sale) is one customer-facing DeltCRM product. Its capabilities are composed
by `PosProductModule`; they are not separate products or independently sold CRM modules.
Design documents live in `docs/POS/`, and the MVP scope is defined in `docs/POS/mvp/`.

## Capabilities

- Core register settings, outlets, tax configuration, and tenant setup
- Product catalog, variants, categories, and bundles
- Stock levels, movement ledger, reorder alerts, and valuation
- Register sessions, cash movements, and reconciliation
- Cart, checkout, returns, and credit notes
- Cash and Amwal Pay tender processing
- Sales dashboard and cross-module search

All POS capabilities are physically consolidated under this product boundary. New POS code
must not create another top-level product sibling — put it under the POS product or extend
an existing capability.

## Owns

- Outlets, registers, sessions, cash movements
- Catalog: products, variants, categories, bundles, batches, units of measure
- Inventory: stock levels and the append-only stock movement ledger
- Sales: sales, sale items, sale payments, credit notes
- Configuration: POS settings, invoice sequence, tax rates and tax groups

See `architecture/TABLE-OWNERSHIP.md` for the authoritative list.

## Does Not Own

- **Customers** — `customers` and `customer_groups` belong to the Customers platform
  context. POS references `customerId` and updates purchase statistics through that
  context's public contract. POS never writes those tables directly.
- **Employees, users, roles, permissions** — owned by Organization and Identity & Access.
- **Subscription billing** — `platform/billing` owns tenant subscription payments. POS
  checkout payments are a separate bounded context with separate tables.
- **Attendance** — POS must never import Attendance in any form.

## Public Contract

Other products import only from `src/products/pos/public.ts`. Internal services,
repositories, controllers, DTOs, and Prisma details are not public contracts.

> **`public.ts` may re-export only from `./pos-product.module` and `./core/**`.**
> The architecture checker attributes `public.ts` to the `pos` (kernel) physical root, so
> re-exporting from `./catalog`, `./sales` or any other area creates a `pos -> pos-<area>`
> dependency edge. That edge is not in the allowlist, and once the area depends on `core`
> it forms a cycle, which `architecture:check` rejects outright. Types intended for
> cross-product consumption belong in `core/domain/`.

## Ownership

- Product owner: POS team
- Database ownership: documented in `architecture/TABLE-OWNERSHIP.md`
- Composition root: `pos-product.module.ts`
- Public entry point: `public.ts`

## Dependency Rules

- `domain` contains framework-free business rules — no `@nestjs/*`, no `@prisma/*`.
- `application` orchestrates use cases through ports.
- `infrastructure` implements ports and persistence.
- `presentation` owns HTTP DTOs, guards, and controllers.
- Cross-product work uses public contracts or versioned outbox events.
- Tenant POS code must never use the platform-admin database connection.
- Internal dependency direction between POS physical roots is declared in
  `architecture/module-boundaries.json` and flows one way:
  `core <- catalog <- inventory`, `core <- payments`, and
  `{core, catalog, inventory, payments} <- sales <- dashboard`.

## POS-Specific Conventions

**Outbox payloads must not carry a top-level `employeeId`.** `OutboxRelayService` forwards
every tenant-scoped event to the notification queue, and the notification dispatcher
resolves recipients from `payload.employeeId`. A POS event carrying that key would fan out
employee notifications nobody asked for. Use `cashierUserId` or `salespersonEmployeeId`.

**Background workers are registered through `PosProductModule`**, never wired directly into
`src/worker.module.ts`. `worker.module.ts` sits outside the architecture checker's scan
scope, so direct registration there silently bypasses the product boundary.

**Money is `Decimal(12,3)`** (Omani Rial, 3 decimal places), tax rates are `Decimal(5,3)`,
quantities are `Decimal(10,3)`. Never convert to a JavaScript `number` for arithmetic or
transport — serialise as strings and compare with `Decimal` methods. This intentionally
differs from platform billing's `Decimal(12,2)`; do not "harmonise" them.

## Local Verification

```bash
pnpm --filter api architecture:test     # boundary + self-test assertions
pnpm --filter api test -- pos           # POS unit tests
pnpm --filter api test:e2e              # includes RLS isolation for POS tables
```
