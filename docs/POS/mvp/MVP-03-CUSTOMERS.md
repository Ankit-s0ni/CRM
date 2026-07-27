# MVP-03 — Customer Management

> **Spec sections**: 6.1 Profiles · 6.2 Activity · 6.3 Groups · 6.4 Search & Quick-Add · 6.5 Import/Export
> **Depends on**: Phase 1 (the Customers platform context must exist)
> **Blocks**: MVP-06 Billing (customer attach), MVP-08 Returns (credit notes are customer-scoped)
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: customer profiles with B2B VAT numbers, purchase history and lifetime stats, customer groups,
phone-first search and quick-add from the register, CSV import/export with duplicate merge.

**Out**: loyalty points earning, redemption and tier logic (7 — the `loyaltyPoints` column exists and stays
`0`), group-level automatic discounts (needs 8), group-level loyalty multipliers (needs 7).

> ⚠️ **This is a platform context, not a POS module.** Per
> [`../POS-FOUNDATION-DECISIONS.md`](../POS-FOUNDATION-DECISIONS.md) D4, `Customer` and `CustomerGroup` are
> owned by `apps/api/src/platform/customers/` and consumed by POS through its `public.ts`. POS must never
> write these tables directly. This is enforced by `pnpm architecture:check`.

---

## Data model

Under the `CUSTOMERS` banner alongside the other **platform** models — not in the POS block.

| Model | Notes |
|---|---|
| `Customer` | 6.1 fields + rolled-up stats (`totalSpend`, `visitCount`, `lastVisitAt`), `customFields Json`, `vatNumber` for B2B |
| `CustomerGroup` | `name`, `description`, `discountPercent`, `loyaltyMultiplier` — both stored, neither *applied* in MVP |

Constraints: `@@unique([tenantId, code])`, `@@unique([tenantId, phone])`, `@@index([tenantId, name])`.

`phone` is nullable and unique per tenant — walk-in sales simply carry no customer, so many null phones
coexist without colliding.

### Group fields that exist but do nothing yet

`discountPercent` needs the discount engine (8) and `loyaltyMultiplier` needs loyalty (7). Both are
excluded. Store the values, render them in the group form, and **do not read them at checkout** — a
discount that silently fails to apply is worse than one that is visibly absent.

---

## Public contract

`apps/api/src/platform/customers/public.ts` — the only surface POS may import:

```ts
export { CustomersModule } from './customers.module';

// Queries
findCustomerById(id): Promise<CustomerView | null>
searchCustomers({ phone?, name?, code?, q?, limit }): Promise<CustomerView[]>

// Commands
createCustomer(input): Promise<CustomerView>
recordPurchase({ customerId, amount, occurredAt, tx }): Promise<void>
```

`recordPurchase` is what MVP-06 calls inside the sale transaction to bump `totalSpend`, `visitCount` and
`lastVisitAt`. It takes the caller's `tx`. POS **never** updates those columns itself.

Returns (MVP-08) call it with a negative amount to reverse the spend, without decrementing `visitCount` —
a refunded visit still happened.

---

## Permissions

```
customer.read    customer.create    customer.update    customer.delete    customer.import
```

Owned by the Customers context, not prefixed `pos.` — they will be reused by any future product.

Grants: Administrator all; Store Manager all except `delete`; Cashier `customer.read` + `customer.create`
(needed for quick-add at the register, 6.4).

---

## API

`apps/api/src/platform/customers/presentation/`

| Method | Route | Permission |
|---|---|---|
| GET | `/customers` — paginated; filters: group, active, `q` | `customer.read` |
| GET | `/customers/search?phone=` — register fast path, phone prefix match | `customer.read` |
| GET | `/customers/:id` | `customer.read` |
| GET | `/customers/:id/purchases` — paginated invoice history | `customer.read` |
| POST | `/customers` | `customer.create` |
| POST | `/customers/quick` — name + phone only, returns the full view | `customer.create` |
| PATCH | `/customers/:id` | `customer.update` |
| DELETE | `/customers/:id` — soft delete via `isActive` | `customer.delete` |
| POST | `/customers/merge` — `{ keepId, mergeId }` | `customer.update` |
| GET/POST/PATCH/DELETE | `/customer-groups` | `customer.update` |
| POST | `/customers/import` — async, returns `jobId` | `customer.import` |
| GET | `/customers/export` — streamed CSV | `customer.read` |

`/customers/search?phone=` is typed into during checkout, so it must be debounced client-side and indexed
server-side. Cap results at 10 and never return a full profile from it.

`/customers/:id/purchases` reads `PosSale` — a POS table. To respect ownership, the Customers context
exposes the route but delegates the query to a POS-side query contract, or the route lives in POS
(`/pos/customers/:id/purchases`) reading its own table. **Prefer the latter** — it keeps ownership clean.

---

## Web

```
apps/web/src/app/pos/customers/
├── page.tsx            → list, search, filters, export
├── new/page.tsx        → full create form
├── [id]/page.tsx       → profile + summary cards + tabs
├── groups/page.tsx     → group CRUD
└── import/page.tsx     → upload → validate → merge decisions → commit
```

Detail page tabs: **Purchase History** (invoice, date, total, payment method, status) and **Credit Notes**
(populated by MVP-08). No Loyalty tab in the MVP — do not render an empty one.

Summary cards: Total Spend, Visit Count, Last Visit, Active Credit Notes balance.

---

## Implementation steps

1. **Scaffold the context** — `apps/api/src/platform/customers/` from `architecture/templates/module`, with
   composition root, `public.ts` and README. Register it in `module-boundaries.json` and add its ownership
   row to `TABLE-OWNERSHIP.md` **before** writing models.
2. **Schema** — `Customer` and `CustomerGroup` under the `CUSTOMERS` banner, with RLS policies and grants.
3. **Customer code generation** — `CUST-00001` per tenant, allocated under a row lock like the invoice
   sequence, or user-supplied. Uniqueness enforced by the DB, not by a pre-check.
4. **Service + controller** — CRUD, search, quick-add. `recordPurchase` accepts the caller's `tx`.
5. **Groups** — CRUD. Store `discountPercent` / `loyaltyMultiplier`; mark them in the UI as
   "applies once discounts/loyalty ship" so nobody assumes they are live.
6. **Merge** — reassign the losing customer's sales and credit notes to the winner inside one transaction,
   sum `totalSpend` and `visitCount`, keep the earliest `createdAt` and latest `lastVisitAt`, then
   soft-delete the loser. Merging is irreversible: require an explicit confirmation showing both records.
7. **CSV import worker** — reuse the import-job pattern from MVP-01. Duplicate phone is a *decision* per
   row (skip / merge / create anyway), not a hard failure.
8. **CSV export** — streamed, round-trips with the import template.
9. **Web** — list, forms, detail with tabs, groups, import wizard.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Customer code sequence allocation |
| Unit | Merge arithmetic — spend sums, visit counts, date selection |
| Integration | Duplicate phone rejected per tenant, permitted across tenants |
| Integration | Multiple customers with `NULL` phone coexist |
| Integration | `recordPurchase` inside a rolled-back transaction leaves stats unchanged |
| Integration | Tenant isolation on customer reads |
| Integration | POS cannot import the customer repository directly (`architecture:check`) |
| E2E | Quick-add from the register → customer attached to sale → appears in purchase history |

---

## Done when

- A cashier can find a customer by partial phone in under a second and create one in two fields.
- Lifetime stats update transactionally with the sale and reverse correctly on refund.
- POS touches customers only through `platform/customers/public.ts`, proven by the architecture check.

---

## Open decisions

- **Purchase-history route ownership** — recommend `/pos/customers/:id/purchases` in POS, since it reads
  `PosSale`. Confirm before step 4.
- **Customer code format** — proposal `CUST-00001`. Confirm.
- **Merge audit** — recommend writing a `TenantAuditLog` entry capturing both records' pre-merge state,
  since the operation cannot be undone.
