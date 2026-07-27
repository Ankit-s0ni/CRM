# MVP-02 — Inventory

> **Spec sections**: 4.1 Stock Tracking · 4.4 Reorder Management · 4.5 Inventory Valuation
> **Depends on**: MVP-01 Catalog
> **Blocks**: MVP-06 Billing (needs `decrementStock`), MVP-08 Returns (needs `incrementStock`)
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: the stock table and its movement ledger, real-time levels, committed vs available, reorder points
and low-stock alerting, valuation at cost and at retail, stock aging.

**Out**: manual stock adjustment UI and CSV bulk adjustment (4.2), stock transfers (4.3), multi-warehouse
(13.2), purchase orders and goods receipt (14).

### ⚠️ Two collisions decided in the overview

**C2 — this area owns the movement ledger even though 4.2 is excluded.** Returns must restock and sales
must deplete, so `PosStockAdjustment` ships as the **system-written** movement log. What is excluded is the
*manual adjustment screen*, the CSV bulk adjust and the stocktake flow. Build the table and the service;
build no adjustment form.

**C3 — FIFO and weighted-average valuation are NOT implemented.** Both need a receipt history that only
goods receipt (14.4, excluded) can produce. `PosBatch` has no writer. MVP valuation is **at current cost
price** and **at retail** only. The UI must not present a valuation-method selector — offering a choice
that silently returns the same number is worse than offering none.

---

## Data model

| Model | Notes |
|---|---|
| `PosStock` | `quantity`, `committed`, per product/variant/outlet/warehouse |
| `PosStockAdjustment` | Append-only movement ledger — `type`, signed `quantity`, `reason`, `performedBy`, `saleId?` |

### `PosStock` uniqueness — the one thing to get right

A plain `@@unique([tenantId, productId, variantId, outletId, warehouseId])` **does not work**:
`variantId` and `warehouseId` are nullable and PostgreSQL treats `NULL`s as distinct in unique indexes, so
the most common row shape (no variant, no warehouse) could be inserted twice and split a product's stock
in half silently.

Four partial unique indexes are used instead — full SQL in
[`../POS-FOUNDATION-DECISIONS.md`](../POS-FOUNDATION-DECISIONS.md) D7.1. Every query matching these columns
must use `IS NOT DISTINCT FROM`, never `=`, because `= NULL` never matches.

### Movement types in MVP

| Type | Written by | Sign |
|---|---|---|
| `SALE` | MVP-06 checkout | negative |
| `RETURN` | MVP-08 resellable return | positive |
| `VOID` | MVP-06 sale void | positive |
| `OPENING` | MVP-01 product create / CSV import with opening stock | positive |

`DAMAGE`, `THEFT`, `STOCKTAKE`, `GIFT`, `RETURN_TO_VENDOR` exist in the enum but have no writer until 4.2
ships.

### Committed stock

`committed` is reserved-but-not-sold quantity. In the MVP the only thing that reserves is a **held/parked
order** (3.2). Available = `quantity - committed`, and that is what the register shows and validates
against.

---

## Permissions

```
pos.inventory.read
```

`pos.inventory.adjust`, `pos.inventory.transfer` and `pos.inventory.receive` are seeded but granted to
nobody in the MVP — their endpoints do not exist yet. Seeding them now keeps the key list stable.

Grants: Administrator and Store Manager get `pos.inventory.read`; Cashier does not get the inventory
screens but *does* see live availability in the register (served by the catalog lookup, not this module).

---

## API

`apps/api/src/products/pos/inventory/`

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/inventory` — levels, filters: category, stock state, `q` | `pos.inventory.read` |
| GET | `/pos/inventory/:productId` — per-location detail + movement history | `pos.inventory.read` |
| GET | `/pos/inventory/low-stock` — at or below reorder point | `pos.inventory.read` |
| GET | `/pos/inventory/valuation` — totals at cost and retail, by category | `pos.inventory.read` |
| GET | `/pos/inventory/aging` — buckets by days since last inbound movement | `pos.inventory.read` |
| GET | `/pos/inventory/export` — streamed CSV | `pos.inventory.read` |

### Internal service — the part that matters

`StockService` is consumed by MVP-06 and MVP-08 and is where correctness lives:

```ts
decrementStock(tx, { tenantId, productId, variantId, outletId, warehouseId, quantity, reason, saleId })
incrementStock(tx, { ...same })
```

Both:

- take the caller's transaction — they never open their own,
- update with `IS NOT DISTINCT FROM` matching on the nullable columns,
- take a row lock via the `UPDATE`, which is what serialises concurrent sales of the same product,
- reject a negative result unless `allowNegativeStock` (product setting overriding the tenant default),
- write the `PosStockAdjustment` ledger row,
- write a `pos.stock.low` **outbox** event when the new level crosses the reorder point.

Reference implementation is in [`../POS-IMPLEMENTATION-PLAN.md`](../POS-IMPLEMENTATION-PLAN.md) §4.2.

Bundles decrement their **components**, not the bundle product. That resolution happens here, so checkout
does not need to know what a bundle is.

---

## Web

```
apps/web/src/app/pos/inventory/
├── page.tsx            → levels: summary cards + table
├── [productId]/page.tsx→ per-product detail + movement history
└── valuation/page.tsx  → valuation + aging
```

Summary cards: total products, in stock, low stock, out of stock, total value at cost.

The levels table shows On Hand / Committed / Available / Cost / Value. Low-stock rows are visually flagged;
because purchase orders are out of scope, the "create PO" quick action from 4.4 is **not** rendered — the
alert is informational in the MVP.

---

## Implementation steps

1. **Schema** — `PosStock` and `PosStockAdjustment` under the `POS — INVENTORY` banner, with RLS policies
   and grants.
2. **Partial unique indexes** — raw SQL appended to the same migration (D7.1). Add a test that inserting a
   second no-variant/no-warehouse row for the same product fails.
3. **StockService** — `decrementStock` / `incrementStock` as above, plus bundle component resolution.
   This is the highest-risk code in the MVP; unit-test it before anything consumes it.
4. **Opening stock** — accept an opening quantity on product create and on CSV import, written as an
   `OPENING` ledger row through the same service. No other path may write `PosStock` directly.
5. **Read endpoints** — levels, detail, low-stock, valuation, aging, export.
6. **Low-stock alerting** — a BullMQ **repeatable** job (`pos:stock-alerts`) sweeps hourly and raises an
   in-app notification through the existing notifications dispatcher. Email and WhatsApp alerts are out of
   scope (22). Debounce so a product below its point does not alert every hour — alert on **crossing**.
7. **Web** — levels, detail, valuation pages.
8. **Load test** — `tests/load/pos/pos-stock-contention.js`: N concurrent sales of the *same* product,
   asserting final quantity equals start minus N and that no ledger rows are lost.
9. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Decrement below zero rejected when `allowNegativeStock` is false; permitted when true |
| Unit | Bundle sale decrements components in the right multiples |
| Unit | Available = quantity − committed |
| Unit | Valuation totals at cost and at retail, on `Decimal` |
| Integration | Second stock row for the same key is rejected by the partial index |
| Integration | `IS NOT DISTINCT FROM` matches the null-variant row (a `=` match would return nothing) |
| Integration | Reorder crossing writes exactly one outbox event, not one per sweep |
| Integration | Tenant isolation on stock reads |
| Load | Concurrent same-product sales conserve stock exactly |

---

## Done when

- `StockService` is the single writer of `PosStock`, and MVP-06/MVP-08 can call it inside their own
  transactions.
- Concurrent sales of one product cannot oversell or lose a movement row.
- A manager can see what is low, what it is worth at cost and retail, and what has not moved.

---

## Open decisions

- **Aging buckets** — proposal: 0–30 / 31–60 / 61–90 / 90+ days since last inbound movement. Confirm.
- **Low-stock sweep interval** — proposal: hourly. With crossing-based debounce the interval mostly affects
  alert latency, not volume.
