# MVP-06 — Billing & Checkout

> **Spec sections**: 3.1 Register Interface · 3.2 Cart / Order Management · 3.4 Checkout Flow ·
> 3.5 Quick Sale
> **Depends on**: MVP-01 Catalog, MVP-02 Inventory, MVP-03 Customers, MVP-05 Registers & Sessions
> **Blocks**: MVP-07 Payments, MVP-08 Returns, MVP-09 Dashboard
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

This is the core of the MVP — the screen the business actually runs on.

**In**: full-screen register UI, product grid and search, barcode scan input, cart operations, line-item
discount and price override, hold/recall, customer attach, quick sale, the checkout transaction, VAT
calculation, and a fixed thermal receipt.

**Out — 3.3 Order-Level Operations is excluded**, which removes: bill-level discount, bill-level notes,
the salesperson picker, order type selection, and delivery details. Also out: promotions and coupons (8),
loyalty (7), offline mode (18), receipt template customisation (19), hardware beyond keyboard-emulation
scanners (17).

### ⚠️ C4 — what survives of discounting

| Feature | Status |
|---|---|
| Line-item discount (% or fixed) | **In** — 3.2 |
| Price override per line | **In** — 3.2, permission-gated |
| Bill-level discount | **Out** — 3.3. `PosSale.discountAmount` stays `0` |
| Per-role discount ceiling | **Out** — needs 12.2. One tenant-wide `PosSettings.maxDiscountPercent` instead |
| Automatic promotions, coupons | **Out** — 8 |

Exceeding `maxDiscountPercent` requires `pos.sale.discount.override`, obtained through the manager PIN
dialog from MVP-04. Every override writes an audit row naming both the cashier and the approving manager.

---

## Data model

| Model | Notes |
|---|---|
| `PosSale` | Header. `workflowId` and `currentStateId` stay `NULL` for the whole MVP |
| `PosSaleItem` | Line with snapshots: `productName`, `sku`, `unitPrice`, `costAtSale`, `taxRate` |
| `PosSalePayment` | Written by MVP-07; the 1:N relation exists from the start |
| `PosSettings` | `invoicePrefix`, `invoiceNextNumber`, `taxInclusive`, `allowNegativeStock`, `maxDiscountPercent`, `autoPrintReceipt`, receipt header/footer, `logoUrl` |

Held orders are `PosSale` rows with `status = DRAFT`. No separate table.

### Snapshots are not optional

`productName`, `sku`, `unitPrice`, `costAtSale` and `taxRate` are copied onto the line at sale time. A
renamed product, a repriced item or a changed VAT rate must never alter a historical invoice. `costAtSale`
in particular is the only thing that makes margin reporting possible later — it cannot be reconstructed.

---

## Pricing and VAT engine

A pure domain module — `products/pos/core/domain/cart-pricing.ts` — with no NestJS or Prisma imports, so it
is unit-testable in isolation and reusable by the offline client later.

Per line:

```
gross      = unitPrice × quantity
discount   = percentage ? gross × rate : fixedAmount
subtotal   = gross − discount
tax        = taxInclusive
             ? subtotal − (subtotal ÷ (1 + taxRate))
             : subtotal × taxRate
total      = taxInclusive ? subtotal : subtotal + tax
```

Rules:

1. **Tax is computed on the discounted amount** (16.2), never on the gross.
2. `taxInclusive` is a tenant setting; both paths must be tested, and both must produce a VAT figure the
   receipt can display separately — Oman tax invoices show the VAT amount even when prices include it.
3. Round **per line** to 3 decimals, then sum. Summing unrounded values and rounding once at the end
   produces totals that do not match the printed lines.
4. Rounding is half-up on the third decimal.
5. `roundOffAmount` — cash totals may be rounded to the nearest 5 baisa where the tenant enables it;
   `netAmount = totalAmount + roundOffAmount`. Digital payments take the exact figure.
6. All arithmetic on `Decimal`. A single `Number(...)` in this file is a defect.

The server **recomputes every total** at checkout. Client-computed figures are for display only and are
discarded — never trust a price, discount or tax arriving from the browser.

---

## The checkout transaction

One transaction, in this order:

1. Validate the session is `OPEN` and belongs to the caller.
2. Re-read every product and price from the database — ignore client-supplied prices.
3. Validate stock for each line (unless `allowNegativeStock`).
4. Recompute all line and order totals.
5. Validate that payments sum exactly to `netAmount` (MVP-07 supplies them).
6. **Reserve the invoice number** under a row lock — late, to keep the critical section short.
7. Create `PosSale`, then `PosSaleItem` rows with snapshots.
8. Create `PosSalePayment` rows.
9. Decrement stock through `StockService`, inside this same transaction.
10. `recordPurchase()` on the Customers public contract if a customer is attached.
11. Write `pos.sale.completed` to the **outbox**.
12. Commit, then return the receipt payload.

Invoice numbers must be gapless per tenant for VAT compliance — see
[`../POS-IMPLEMENTATION-PLAN.md`](../POS-IMPLEMENTATION-PLAN.md) §4.2. Not a bare sequence, which skips on
rollback.

Idempotency: the client sends an `Idempotency-Key` header. A retry after a network timeout must return the
original sale, not create a second one. This is the difference between a dropped response and a
double-charged customer.

---

## Permissions

```
pos.sale.create    pos.sale.discount    pos.sale.discount.override
pos.sale.price.override    pos.sale.void    pos.sale.read
```

Grants: Cashier gets `create`, `discount`, `read`. Store Manager adds both overrides and `void`.
Administrator all.

---

## API

`apps/api/src/products/pos/core/`

| Method | Route | Permission |
|---|---|---|
| POST | `/pos/sales` — checkout; `Idempotency-Key` required | `pos.sale.create` |
| GET | `/pos/sales` — history, filters: date, register, cashier, customer, status | `pos.sale.read` |
| GET | `/pos/sales/:id` — full detail + receipt payload | `pos.sale.read` |
| POST | `/pos/sales/:id/void` — `{ reason }`, restores stock | `pos.sale.void` |
| GET | `/pos/sales/:id/receipt` — rendered receipt payload | `pos.sale.read` |
| POST | `/pos/sales/quote` — server-side price/tax preview for the cart | `pos.sale.create` |
| POST | `/pos/held-orders` — park the cart | `pos.sale.create` |
| GET | `/pos/held-orders` — list for this register | `pos.sale.create` |
| GET | `/pos/held-orders/:id` — recall | `pos.sale.create` |
| DELETE | `/pos/held-orders/:id` — discard | `pos.sale.create` |

`/pos/sales/quote` lets the register show authoritative totals without committing — the client renders
optimistically, then reconciles against the quote. It is also what keeps the pricing engine honest: the
same code path produces the quote and the final sale.

---

## Web

Route: `apps/web/src/app/pos/billing/page.tsx`, using the POS root layout but **suppressing the sidebar** —
full-screen by design.

Layout (per [`../POS-IMPLEMENTATION-PLAN.md`](../POS-IMPLEMENTATION-PLAN.md) §7.1): product grid and search
on the left, cart on the right, pay button anchored bottom-right.

Components in `features/products/pos/billing/`:

```
pos-register-view.tsx      product-grid.tsx        product-search-bar.tsx
cart-panel.tsx             cart-item-row.tsx       quick-sale-dialog.tsx
line-discount-dialog.tsx   price-override-dialog.tsx
held-orders-dialog.tsx     customer-attach-dialog.tsx
receipt-preview.tsx        session-gate.tsx
```

Cart state is Zustand (client-only, ephemeral); server data is TanStack Query. Do not put the cart in
React Query — it is not server state until checkout.

### Behaviours that matter

- **Session gate** — if the register has no open session, render `<SessionOpenDialog>` (MVP-05) over the
  screen. No cart interaction is possible until it is open.
- **Barcode scanning** — keyboard-emulation scanners type fast and end with Enter. Detect by inter-keystroke
  timing (< 30 ms between characters) rather than by focusing a field, so a scan works regardless of focus.
  Unknown barcode: audible error, toast, and an offer to create the product if the user has permission.
- **Search focus** — after any add, focus returns to the search input. A cashier must never have to click.
- **Keyboard map** — as defined in [`../POS-IMPLEMENTATION-PLAN.md`](../POS-IMPLEMENTATION-PLAN.md) §7.2:
  F1 session, F2 customer, F3 hold, F4 recall, F5 discount, F8 pay, F9 reprint, Esc cancel, +/- quantity,
  Del remove.
- **Quick sale (3.5)** — description + price + tax group, no product record. Persisted as a sale line with
  a null `productId`; `productName` carries the description. Stock is not touched.
- **Optimistic cart, authoritative server** — totals render instantly client-side and are corrected by the
  quote response if they ever differ. Any mismatch is a bug and should be logged.

### Receipt

One fixed 80 mm thermal layout (19.1 customisation is out). Rendered as HTML with a print stylesheet and
sent via the browser print dialog — no Web Serial in the MVP (17.2/17.3 excluded).

Must include, for Oman VAT compliance: tenant name and address, VAT number, invoice number, date/time,
cashier, line details, **VAT shown separately**, total, tender and change.

---

## Implementation steps

1. **Schema** — `PosSale`, `PosSaleItem`, `PosSettings` under `POS — SALES` / `POS — CONFIGURATION`, with
   RLS and grants. `PosSalePayment` lands with MVP-07 but its relation is declared here.
2. **Pricing domain module** — `cart-pricing.ts`, pure, both tax modes, per-line rounding. Test it before
   anything calls it.
3. **Invoice sequence service** — row-locked, gapless, per tenant.
4. **Quote endpoint** — runs the pricing engine over a cart without persisting.
5. **Sale service** — the 12-step transaction above, with idempotency-key handling.
6. **Void** — restores stock through `StockService`, sets `VOIDED`, audits with a mandatory reason.
   Voiding is permitted only within the same session; anything later is a return (MVP-08).
7. **Held orders** — create/list/recall/discard as `DRAFT` sales; recall repopulates the cart and deletes
   the draft.
8. **Receipt payload + layout** — server assembles the data, client renders and prints.
9. **Register UI** — grid, search, scanner listener, cart, dialogs, session gate, keyboard map.
10. **Load test** — `tests/load/pos/pos-sale.js`, 100 concurrent checkouts, asserting no duplicate invoice
    numbers and no lost stock movements.
11. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Tax-exclusive and tax-inclusive both produce the correct separately-stated VAT |
| Unit | Tax computed on the discounted amount, not the gross |
| Unit | Per-line rounding sums to the printed total |
| Unit | Percentage and fixed line discounts; discount larger than the line is rejected |
| Unit | Round-off to nearest 5 baisa for cash |
| Integration | Client-supplied prices are ignored — a tampered payload produces server-side totals |
| Integration | Payments not summing to `netAmount` reject the checkout |
| Integration | Concurrent checkouts produce gapless, unique invoice numbers |
| Integration | Same `Idempotency-Key` twice returns the same sale and creates one row |
| Integration | Checkout without an open session is rejected |
| Integration | Stock decrements and sale insert commit or roll back together |
| Integration | Discount above `maxDiscountPercent` without override permission is rejected |
| Integration | Tenant isolation on sales |
| E2E | Scan → discount → attach customer → cash payment → receipt shows correct VAT |
| E2E | Hold → serve another customer → recall → complete |
| Load | 100 concurrent sales: no duplicate invoice numbers, stock conserved |

---

## Done when

- A cashier can complete a barcode-scanned sale, with VAT correct to 3 decimals, without a mouse.
- Nothing the browser sends can change what the customer is charged.
- A network retry cannot double-charge.
- Invoice numbers are gapless per tenant under concurrency.

---

## Open decisions

- **Round-off** — is nearest-5-baisa cash rounding wanted? Proposal: a `PosSettings.cashRoundingEnabled`
  flag, default off, since Oman still circulates 5-baisa coins. Confirm.
- **Void window** — proposal: same session only. Confirm.
- **Quick sale tax group** — proposal: default to the tenant's standard-rate group, changeable in the
  dialog. Confirm.
