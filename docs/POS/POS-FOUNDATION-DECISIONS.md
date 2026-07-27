# DeltCRM POS — Foundation Decisions

> **Read this before any other POS document.** These decisions are binding and were made after auditing
> the actual codebase. Where an older POS doc conflicts with this file, this file wins.
>
> Status: Accepted · Date: 2026-07-27

---

## Why this file exists

The original POS documents were written against the stack described in `CLAUDE.md`. An audit of
`apps/api` and `apps/web` found that several of those claims did not match the code — split Prisma
schemas, CASL authorization, Zod validation, `@nestjs/schedule`, TanStack Query and a shared UI package
were all documented but absent. The POS plan inherited those assumptions and built on them.

`CLAUDE.md` has since been corrected. This file records the structural decisions that resolve the
resulting gaps, so the other POS documents can simply point here.

---

## D1 — Route namespace: root `/pos/*`

POS lives at the **route root**, not nested under the workspace shell.

| Surface | Path on disk | URL |
| --- | --- | --- |
| POS back office | `apps/web/src/app/pos/**` | `/pos/*` |
| POS billing register | `apps/web/src/app/pos/billing/page.tsx` | `/pos/billing` |
| Platform POS admin | `apps/web/src/app/platform/pos/**` | `/platform/pos/*` |
| POS feature components | `apps/web/src/features/products/pos/**` | — |

**Rationale**: the billing register is a full-screen terminal application with its own chrome, keyboard
map and session gate. Nesting it under `/app/` would inherit the workspace sidebar and layout it must
replace. Existing surfaces are unchanged: workspace stays `/app/*`, platform admin stays `/platform/*`.

**Consequence**: POS needs its own root layout with auth + tenant resolution, since it does not inherit
`app/app/layout.tsx`. The tenant subdomain middleware is unaffected — it keys off the host, not the path.

---

## D2 — Prisma layout: append to the single schema file

All POS models go into the existing `apps/api/prisma/schema.prisma`. There is **no** `prisma/schema/`
directory and this work will not create one.

Models are grouped under banner comments so the file stays navigable:

```prisma
// ─────────────────────────────────────────────
// POS — CATALOG
// ─────────────────────────────────────────────

model PosProduct { ... }
```

Banner sections, in order: `POS — CATALOG`, `POS — REGISTER & OUTLETS`, `POS — INVENTORY`,
`POS — SALES`, `POS — PURCHASING`, `POS — PROMOTIONS & LOYALTY`, `POS — WORKFLOWS`,
`POS — CONFIGURATION`.

**Rationale**: splitting a 2,088-line working schema is a repo-wide refactor with migration risk that
buys nothing for POS delivery. It can be done later as its own change, independent of this product.

**Consequence**: the schema will roughly double in size. Accepted.

---

## D3 — Web data layer: TanStack Query + React Hook Form, POS only

POS introduces two new frontend dependencies:

- `@tanstack/react-query` — server state, cache invalidation, optimistic cart/stock updates
- `react-hook-form` — the catalog, settings and dynamic-workflow forms

**Scope is enforced by convention**: these may be imported only from `apps/web/src/features/products/pos/**`
and `apps/web/src/app/pos/**`. Attendance and platform code stay on the existing axios + zustand pattern.

**Rationale**: POS is form-heavy and cache-heavy in a way attendance is not — a register screen invalidating
stock across concurrent tabs is exactly the problem React Query solves. Hand-rolling it a third time is
more code, not less.

**Explicitly not adopted**: Zod (the API validates with `class-validator`; adding a second schema language
to the frontend only is not worth it — RHF's built-in validation covers the forms), Recharts (POS reports
reuse the existing hand-rolled SVG chart components), TanStack Table.

**Consequence**: a `QueryClientProvider` in the POS root layout only. No global provider in the app shell.

---

## D4 — Customer is a platform-level entity

The customer record is **not** POS-owned. A new platform context owns it:

```
apps/api/src/platform/customers/
├── customers.module.ts
├── public.ts                 ← the only import surface for other products
├── application/
├── domain/
└── infrastructure/
```

| Table | Owner | Holds |
| --- | --- | --- |
| `customers` | Customers (platform) | Identity, contact, addresses, VAT number, custom fields, group, and rolled-up stats (`totalSpend`, `visitCount`, `lastVisitAt`) |
| `customer_groups` | Customers (platform) | Group name, default discount %, loyalty multiplier |
| `pos_loyalty_transactions` | POS | Points ledger — a POS concept |
| `pos_credit_notes` | POS | Store credit — a POS concept |

POS references `customerId` and updates stats **through the Customers public contract**
(`recordPurchase({ customerId, amount, occurredAt })`), never by writing the table directly. This is
required by `apps/api/architecture/TABLE-OWNERSHIP.md`.

**Rationale**: this is a CRM. A customer that only exists inside POS cannot be reused by invoicing,
support or marketing later, and would have to be migrated out the first time it is needed elsewhere.

**Consequence**: models formerly named `PosCustomer` / `PosCustomerGroup` are now `Customer` /
`CustomerGroup`, tables `customers` / `customer_groups`. All POS docs have been updated accordingly.

---

## D5 — POS is a registered product under architecture governance

`apps/api/architecture/` is CI-enforced (`pnpm architecture:check`, inside `pnpm quality`) and already
contains `examples/pos/README.md` plus a self-test asserting `pos -> attendance` is **rejected**.

POS must therefore:

1. Live at `apps/api/src/products/pos/` with a composition root (`pos-product.module.ts`), a `public.ts`,
   and a `README.md`.
2. Register in `module-boundaries.json` — `name: "pos"`, an owner, the composition root, the public entry,
   and one `physicalRoots` entry per sub-module folder.
3. Add its ownership rows to `TABLE-OWNERSHIP.md` **before** any model is written.
4. Be registered in `AppModule` through `public.ts` only.
5. Consume Identity, Workspace, Organization, Customers, Billing, Audit and Outbox **public contracts** only.
6. Never import Attendance.

### Correction: no business modules under `src/shared/`

The original plan placed `customers/`, `inventory/`, `payments/`, `messaging/` and `forms/` under
`apps/api/src/shared/`. `check-architecture.ts` fails any file in `src/shared/**` that imports
`platform/**` or `products/**`, and unowned business tables violate table ownership. Corrected placement:

| Originally proposed | Now |
| --- | --- |
| `shared/customers/` | `platform/customers/` — new platform context (D4) |
| `shared/inventory/` | `products/pos/inventory/` — POS-owned |
| `shared/payments/` | `products/pos/payments/` — POS checkout payments, implementing the same port shape as `platform/billing/infrastructure/payment-provider.port.ts` |
| `shared/messaging/` | A **WhatsApp provider adapter** behind the existing `platform/notifications/notification-provider.port.ts` |
| `shared/forms/` | `products/pos/workflows/` — schema validation for dynamic forms |

---

## D6 — Reuse before build

The audit found significant existing infrastructure the POS plan proposed to rebuild.

| POS need | Already exists | What is actually left to do |
| --- | --- | --- |
| Plan tiers, feature gating, usage limits | `Module`, `ModuleCapability`, `SubscriptionPlanCapability.limitValue`, `TenantCapabilityOverride`, `ModuleGuard` | Seed `POS` module + capability rows. No new tables, no new admin UI |
| Payment gateways | `payment-provider.port.ts`, `payment-providers.ts`, `BillingWebhookReceipt`, `PaymentGateway` enum | Thawani + Amwal adapters against the same port shape |
| WhatsApp / email delivery | `NotificationsModule` — provider port, dispatcher, worker, templates, `transactional-email.service.ts` | One WhatsApp provider adapter + POS templates |
| Object storage | `shared/storage/private-object-storage.service.ts` on `@aws-sdk/client-s3` | Wasabi is S3-compatible — config change. `sharp` compression and the CDN domain are genuinely new |
| Domain events | `OutboxEvent` + `OutboxService` + `OutboxRelayService` | Publish `pos.*` events on existing rails |
| Audit trail | `TenantAuditLog`, `SystemAuditLog` | Wire POS actions in |
| Sequential invoice numbers | `InvoiceSequence` model (schema.prisma) | Reuse the pattern — see D7.4 |
| OMR currency | Default across `TenantBillingProfile` and `SubscriptionPlan` | Nothing |
| Permissions | `PermissionsGuard` + `PERMISSIONS` + `DEFAULT_ROLE_PERMISSIONS` + seed | Add `pos.*` keys and seed rows — this is not a CASL rules engine |

---

## D7 — Schema defects corrected

The following were errors in the original ERD / implementation plan, not open questions. All POS docs
have been updated.

**7.1 `PosStock` uniqueness was broken.** `@@unique([tenantId, productId, variantId, outletId, warehouseId])`
with nullable `variantId` and `warehouseId` does not work: PostgreSQL treats `NULL`s as distinct, so the
constraint permits **duplicate stock rows** for the most common case (a product with no variant, no
warehouse). Replaced with paired partial unique indexes via raw SQL migration:

```sql
CREATE UNIQUE INDEX pos_stock_key_full ON pos_stock
  ("tenantId","productId","variantId","outletId","warehouseId")
  WHERE "variantId" IS NOT NULL AND "warehouseId" IS NOT NULL;
CREATE UNIQUE INDEX pos_stock_key_no_variant ON pos_stock
  ("tenantId","productId","outletId","warehouseId")
  WHERE "variantId" IS NULL AND "warehouseId" IS NOT NULL;
CREATE UNIQUE INDEX pos_stock_key_no_warehouse ON pos_stock
  ("tenantId","productId","variantId","outletId")
  WHERE "variantId" IS NOT NULL AND "warehouseId" IS NULL;
CREATE UNIQUE INDEX pos_stock_key_minimal ON pos_stock
  ("tenantId","productId","outletId")
  WHERE "variantId" IS NULL AND "warehouseId" IS NULL;
```

**7.2 No partitioning at launch.** The plan called for monthly partitions on `pos_sales`, `pos_sale_items`
and `pos_sale_payments`. This is not possible as specified: PostgreSQL requires the partition key in every
unique constraint, so `@@unique([tenantId, invoiceNumber])` cannot survive partitioning by `createdAt`, and
`pos_sale_items` holds a foreign key into `pos_sales`. The existing precedent (`AttendanceEvent`,
`FieldLocationPing`) partitions only append-only tables with no inbound foreign keys.

Decision: **ship unpartitioned**, with indexes on `(tenantId, createdAt)` and `(tenantId, outletId, createdAt)`.
Revisit when a tenant approaches ~10M sale rows, and partition `pos_stock_adjustments` and
`pos_loyalty_transactions` first — those are genuinely append-only.

**7.3 The workflow engine could not store its own state.** The ERD gave `PosSale.workflow_id` but the
Prisma model omitted the field entirely (declaring only the reverse relation, which does not compile), and
nothing anywhere held the sale's *current* state. Additionally, `PosSaleStatus` and dynamic workflow states
were two competing status systems — user flow 4.1 says "status = INTAKE", which the enum cannot represent.

Resolution — two orthogonal axes, both stored:

| Field | Meaning |
| --- | --- |
| `PosSale.status` (`PosSaleStatus`) | **Financial** lifecycle: `DRAFT`, `OPEN`, `COMPLETED`, `VOIDED`, `RETURNED`, `PARTIALLY_RETURNED` |
| `PosSale.workflowId` (nullable) | Which workflow governs this sale; `NULL` for plain retail |
| `PosSale.currentStateId` (nullable) | **Operational** position in that workflow (Intake / Cleaning / Ready) |

A laundry order is `status = OPEN` + `currentState = Cleaning`; it becomes `COMPLETED` when paid, which
may happen at any workflow state. Retail sales carry `workflowId = NULL` and go straight to `COMPLETED`.
`OPEN` is new — it is the state a workflow-governed sale occupies between intake and payment.

**7.4 Invoice numbering.** `PosSettings.invoiceNextNumber` is one hot row per tenant. It must be read with
`SELECT ... FOR UPDATE` inside the sale transaction, following the existing `InvoiceSequence` model used by
platform billing. Do not generate numbers application-side or from a bare sequence — they must be gapless
per tenant for VAT compliance.

**7.5 Fields added for already-specified features.** These were required by documented flows and reports
but had nowhere to live:

| Model | Added | Needed by |
| --- | --- | --- |
| `PosSaleItem` | `costAtSale` | §15.3 profit & margin reports — impossible retroactively without it |
| `PosSaleItem` | `taxRate` (snapshot) | Historical invoices must not drift when a tax rate changes |
| `PosSaleItem` | `returnReason`, `returnCondition` | Flow 8.1 resellable-vs-damaged handling |
| `PosSale` | `amountPaid`, `amountDue` | Flow 9.4 credit / due bills |
| `PosPaymentMethod` | `DUE` member | Flow 9.4 |
| `PosSale` | `workflowId`, `currentStateId` | §1A workflow engine (7.3) |

**7.6 Entities added.** Specified in features/flows but absent from the schema: `PosCoupon` +
`PosCouponRedemption` (§8.4, flow 10.4 — `PosPromotion` had no code, validity or usage limit),
`PosEmployeeOutlet` (flow 1.3 "assign to outlet(s)", §13 multi-store scoping), `PosCashierPin`
(§12.3 and flow 17.2 PIN login — Argon2-hashed, rate-limited, never a plain column on `users`).
Also promoted from ERD-only into the Prisma schema: `PosPromotionUsage`, `PosReceiptTemplate`,
`PosWorkflowTransition`.

**7.7 Entities explicitly deferred, not modelled.** Loyalty tiers (§7.3) and commission rules (§12.4) are
P2 features with no P0/P1 flow depending on them. They are not in the schema. Add them when the sprint
that delivers them starts — a table with no writer is a liability.

---

## D8 — Oman only; India references removed

The documents carried India-market leftovers that contradicted the stated Oman localisation. All removed:

| Removed | Replaced with |
| --- | --- |
| GST (Sprint POS-1, sidebar "Tax / GST", `PosTaxRate` examples, risk table) | Oman VAT (5% standard, 0% zero-rated, exempt, out-of-scope) |
| Razorpay, PhonePe, PayTM, Pine Labs (§9.2, §10.3, §25.3, Sprint POS-7) | Thawani Pay, Amwal Pay |
| `UPI`, `MOBILE_WALLET` in `PosPaymentMethod` | `THAWANI`, `AMWAL` |
| "UPI QR Code Flow" (§9.2) | Thawani / Amwal hosted-payment flow |
| INR-scaled amounts in the API examples | OMR at 3 decimal places |

All money columns are `Decimal(12,3)`; tax rates are `Decimal(5,3)`; per-unit weights are `Decimal(8,3)`.

> Note: existing platform billing money columns are `Decimal(10,2)`. That is a pre-existing inconsistency
> in subscription billing, out of scope here, but worth correcting before POS revenue reporting is
> reconciled against subscription invoices.

---

## Deferred: scope

The delivery plan remains as documented in `POS-IMPLEMENTATION-PLAN.md` §14 — seven sprints, ~28 weeks.

One ordering concern is recorded but **not** actioned: `POS-PHASE-WISE-EXECUTION.md` builds the dynamic
workflow engine and drag-and-drop form builder (Phase 2) *before* the billing and cart engine (Phase 3).
The workflow engine is the most speculative component in the specification and every tenant needs billing,
while only service-business tenants need workflows. Building a fixed retail checkout first — with
`workflowId` nullable from day one, as the schema already allows — would de-risk the sequence at no
structural cost. Raise this before Phase 2 starts.
