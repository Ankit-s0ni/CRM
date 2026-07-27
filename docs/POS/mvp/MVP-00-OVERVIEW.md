# DeltCRM POS — MVP Implementation Overview

> Index and ground rules for the POS MVP. Each feature area has its own plan file; this one defines the
> scope boundary, the build order, and the conventions every area file assumes.
>
> **Prerequisites**: [`../POS-FOUNDATION-DECISIONS.md`](../POS-FOUNDATION-DECISIONS.md) (binding structural
> decisions) and Phase 0 + Phase 1 of [`../POS-PHASE-WISE-EXECUTION.md`](../POS-PHASE-WISE-EXECUTION.md)
> (product registration, schema, RLS, module/permission seed). No area below can start until Phase 0 passes
> `pnpm architecture:check`.

---

## 1. MVP scope

Selected from [`../POS-FEATURES-SPECIFICATION.md`](../POS-FEATURES-SPECIFICATION.md).

| Plan file | Spec sections | Area |
|---|---|---|
| [MVP-01-CATALOG](./MVP-01-CATALOG.md) | 5.1 – 5.6 | Products, variants, categories, bundles, import/export, UOM |
| [MVP-02-INVENTORY](./MVP-02-INVENTORY.md) | 4.1, 4.4, 4.5 | Stock tracking, reorder management, valuation |
| [MVP-03-CUSTOMERS](./MVP-03-CUSTOMERS.md) | 6.1 – 6.5 | Profiles, activity, groups, quick-add, import/export |
| [MVP-04-EMPLOYEES](./MVP-04-EMPLOYEES.md) | 12.3 | Invites, role/outlet assignment, PIN, activity log |
| [MVP-05-REGISTERS-SESSIONS](./MVP-05-REGISTERS-SESSIONS.md) | 11.1 – 11.4 | Registers, sessions, reconciliation, multi-register |
| [MVP-06-BILLING](./MVP-06-BILLING.md) | 3.1, 3.2, 3.4, 3.5 | Register UI, cart, checkout, quick sale |
| [MVP-07-PAYMENTS](./MVP-07-PAYMENTS.md) | 10.1, 10.3, 10.4 | Payment methods, Amwal Pay, cash management |
| [MVP-08-RETURNS](./MVP-08-RETURNS.md) | 9.1 – 9.5 | Returns, refunds, exchanges, credit notes, policies |
| [MVP-09-DASHBOARD](./MVP-09-DASHBOARD.md) | 2.1 – 2.3 | Dashboard, widgets, global search |

### Explicitly out of MVP

Not selected — do not build, and do not add tables for:

| Excluded | Spec | Consequence handled in |
|---|---|---|
| Order-level operations (bill discount, salesperson UI, order type, delivery details) | 3.3 | MVP-06 |
| Stock adjustments UI, stock transfers | 4.2, 4.3 | MVP-02, MVP-08 |
| Loyalty & rewards | 7 | MVP-03, MVP-07 |
| Discounts & promotions engine, coupons | 8 | MVP-06 |
| Split payments / multi-tender | 10.2 | MVP-07 ⚠️ |
| Default & custom role builder | 12.1, 12.2 | MVP-04 |
| Commission tracking | 12.4 | MVP-04 |
| Multi-store / multi-warehouse | 13 | MVP-02 |
| Purchase orders & vendors | 14 | MVP-02 ⚠️ |
| Reports & analytics | 15 | MVP-09 |
| Tax reports (VAT return, filing) | 16.3 | — VAT *calculation* is in MVP-06; filing reports are not |
| Hardware integration | 17 | MVP-06 (browser-native barcode only) |
| Offline mode & sync | 18 | MVP-06 |
| Receipt template customisation | 19.1, 19.2 | MVP-06 (one fixed thermal layout) |
| Barcode label generation & printing | 20.1, 20.2 | MVP-01 (barcode *scanning* is in) |
| Online store, omnichannel | 21 | — |
| Notifications & alerts | 22 | MVP-02 (low-stock alert is in-app only) |
| Dynamic workflow engine, form builder | 1A | — `PosSale.workflowId` stays `NULL` for the whole MVP |
| Mobile POS | 26 | — |

---

## 2. Scope collisions — read before starting

The selected subset cuts through four features that other selected features depend on. These are decided
here so the area files can just follow them.

### C1 — Credit notes need multi-tender, but 10.2 is excluded

9.4 issues credit notes and 10.1 accepts them as a payment method, but a credit note rarely equals the new
bill exactly. Without multi-tender a customer with a 3.000 OMR credit note cannot buy a 4.200 OMR item, and
the 9.3 exchange flow becomes impossible.

**Decision**: the `PosSalePayment` table is already 1:N and stays that way. The checkout UI ships
**single-tender by default**, with **one** exception: a credit note may be combined with exactly one other
tender for the remainder. General N-way splitting stays out.

### C2 — Returns must move stock, but 4.2 is excluded

Restocking a resellable return is a stock movement. What 4.2 excludes is the **manual adjustment UI**, not
the ledger.

**Decision**: build `PosStockAdjustment` as the system-written movement ledger in MVP-02. Returns write to
it with `type = RECEIVED`. No manual adjustment screen, no CSV bulk adjustment, no stocktake.

### C3 — Valuation needs cost history, but purchasing is excluded

4.5 asks for FIFO **and** weighted-average valuation. Both need a receipt history to average over, which
comes from goods receipt (14.4) — excluded. `PosBatch` will have no writer.

**Decision**: MVP valuation reports **at current cost price** (`PosProduct.costPrice`, maintained manually)
and **at retail**. FIFO and weighted-average are **not implemented** and the UI must not offer a method
selector that implies they exist. `costAtSale` is still snapshotted on every sale line so historical margin
becomes computable the moment purchasing lands.

### C4 — Item discounts survive, bill discounts do not

3.2 (in scope) has line-item discount and price override. 3.3 (out) has bill-level discount. 8.5 (out) has
the per-role discount ceiling and the manager approval workflow.

**Decision**: line-item discount and price override ship, gated by `pos.sale.discount` and
`pos.sale.price.override`. The ceiling is a **single tenant-wide setting**
(`PosSettings.maxDiscountPercent`), not per-role — per-role limits need 12.2. Exceeding it requires
`pos.sale.discount.override`, satisfied by a manager PIN prompt (MVP-04). `PosSale.discountAmount` stays
`0` for the whole MVP; the columns exist but nothing writes them.

### C5 — Single outlet

13 is excluded, so every tenant operates one outlet. The `PosOutlet` table, `outletId` foreign keys and
`PosEmployeeOutlet` all still ship — scoping everything by outlet from day one is far cheaper than
retrofitting it. The setup wizard creates exactly one outlet and the UI offers no way to add a second.

---

## 3. Build order

Each area depends only on those above it. Areas at the same level can run in parallel.

```
Phase 0 + Phase 1  (product registration, schema, RLS, seed)
        │
        ├── MVP-01 Catalog ──────────┐
        │                            │
        ├── MVP-03 Customers         │
        │                            │
        └── MVP-04 Employees         │
                    │                │
                    ▼                ▼
            MVP-05 Registers    MVP-02 Inventory
                    │                │
                    └────────┬───────┘
                             ▼
                      MVP-06 Billing
                             │
                             ▼
                      MVP-07 Payments
                             │
                             ▼
                      MVP-08 Returns
                             │
                             ▼
                      MVP-09 Dashboard
```

Rationale: nothing sells without a catalogue and a stock row; no sale exists without an open session; a
session needs a cashier; returns need completed sales; the dashboard reads everything, so it goes last and
is not blocked by the rest being polished.

---

## 4. Conventions every area file assumes

Stated once here rather than repeated in nine files.

### Money and quantities

- Every monetary column is `Decimal(12,3)`; tax rates `Decimal(5,3)`; quantities `Decimal(10,3)`.
- **Never** convert to JavaScript `number` for arithmetic or transport. Serialise as **strings** in JSON.
- Compare and total with `Decimal` methods (`plus`, `minus`, `lessThan`), never `+` or `<`.
- Amwal takes integer baisa (1 OMR = 1000 baisa) — convert at the adapter boundary with integer arithmetic.

### Tenancy

- All reads and writes go through `prisma.forTenant()`.
- Every new table gets `tenant_isolation` (`TO app_user`) and `platform_access` (`TO platform_runtime`)
  policies plus grants **in the migration that creates it**.
- Each area ships at least one tenant-isolation test proving cross-tenant reads return zero rows.

### Authorization

- Add keys to `PERMISSIONS` in `apps/api/src/shared/authorization/permissions.constants.ts`, grant them in
  `DEFAULT_ROLE_PERMISSIONS`, and seed the `permissions` rows. Three places, one commit.
- Guard every POS controller with `@RequireModule('POS')` plus the relevant `@RequirePermissions(...)`.
- There is no CASL. Attribute-dependent rules (discount ceiling, return window) live in the service layer.

### Architecture

- POS code lives under `apps/api/src/products/pos/<area>/`, exported only via `products/pos/public.ts`.
- Layering: `presentation -> application -> domain`; `infrastructure` feeds application. Domain files must
  not import `@nestjs/*` or `@prisma/*`.
- Customers are read and written **only** through `platform/customers/public.ts`.
- Never import Attendance. `architecture:check --self-test` enforces it.
- Run `pnpm architecture:check` before every PR.

### Events and audit

- Domain events are written to the **outbox inside the same transaction** as the state change, never
  published to BullMQ directly.
- Money-touching and permission-escalating actions (price override, discount override, void, refund, PIN
  override, session close with discrepancy) write a `TenantAuditLog` row.

### Contracts

- Run `pnpm openapi:generate` after any controller or DTO change and commit the regenerated
  `packages/contracts/src/generated.ts`.

### Web

- Routes under `apps/web/src/app/pos/**`; components under `apps/web/src/features/products/pos/**`.
- TanStack Query + React Hook Form are available **here only**. A `QueryClientProvider` lives in the POS
  root layout.
- Amounts render with exactly three decimals and the `OMR` suffix. One shared formatter, no ad-hoc
  `toFixed(3)` calls.

### Definition of done (every area)

1. Unit tests for domain logic (pricing, tax, reconciliation, refund calculation).
2. One tenant-isolation test.
3. One e2e test covering the area's primary flow.
4. `pnpm quality` passes.
5. OpenAPI regenerated and committed.
6. Permissions seeded and verified against all three MVP roles.

---

## 5. MVP exit criteria

The MVP is done when a single-outlet Omani retailer can, on one working day, without touching a database:

1. Import a product catalogue by CSV and correct it in the UI.
2. Open a register session with a cash float.
3. Ring up a sale by barcode scan and by product search, apply a line discount, attach a customer, take
   cash or Amwal payment, and print a thermal receipt with correct 5% VAT.
4. Process a return against that invoice, issue a credit note, and redeem it on a later sale.
5. Close the session with a denomination count and see the expected-versus-actual discrepancy.
6. See the day's takings, top sellers and low-stock items on the dashboard the following morning.

Anything not required by those six sentences is not MVP.
