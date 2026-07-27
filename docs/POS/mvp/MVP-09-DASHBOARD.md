# MVP-09 — Dashboard & Global Search

> **Spec sections**: 2.1 Main Dashboard · 2.2 Dashboard Widgets · 2.3 Global Search
> **Depends on**: everything — this area only reads
> **Blocks**: nothing
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: today's sales summary, sales trend chart, top sellers, low-stock alerts, recent transactions,
revenue by payment method, active register status, configurable widget layout with period selectors, quick
actions, and unified search across products, customers, invoices and employees.

**Out**: the full reporting module (15 — this is a dashboard, not a report suite), scheduled report emails
(15.6), store performance comparison (13 — single outlet per C5), saved report widgets (15.6).

Build this **last**. It reads every other area, so it is the natural integration check — but it must not be
what blocks a release, since nothing depends on it.

### Widgets in the MVP

| Widget | Source | Notes |
|---|---|---|
| Today's Sales | MVP-06 | Total, transaction count, average ticket |
| Sales Trend | MVP-06 | Line chart, selectable period |
| Top Selling Items | MVP-06 | By quantity or revenue |
| Low Stock Alerts | MVP-02 | No "create PO" action — purchasing is out |
| Recent Transactions | MVP-06 | Latest 20 |
| Revenue by Payment Method | MVP-07 | Cash / Amwal / card / cheque / credit note |
| Active Registers | MVP-05 | Open sessions, cashier, session duration |
| ~~Store Performance~~ | — | **Not built** — single outlet (C5) |

---

## Net revenue — get the arithmetic right

Returns are stored as negative sales (MVP-08), so:

```
Gross revenue = SUM(netAmount) WHERE isReturn = false
Returns       = ABS(SUM(netAmount)) WHERE isReturn = true
Net revenue   = SUM(netAmount) over ALL sales      ← includes returns naturally
```

Voided sales are excluded everywhere (`status != 'VOIDED'`). Do not "subtract returns" from a gross figure
computed over all rows — that double-counts. The sign convention exists precisely so net revenue is one
`SUM()`.

Average ticket uses **non-return, non-void** sales as the denominator. A refund is not a sale.

---

## Query performance

Dashboard queries aggregate over `pos_sales` and `pos_sale_items`, which grow fastest of any POS table, and
the page loads on every manager's first action of the day. Target: **< 1 s** for the whole dashboard.

Rules:

1. **One endpoint, not eight.** `GET /pos/dashboard?period=` returns every widget's data in a single
   response. Eight parallel requests each opening a transaction is how a dashboard becomes the slowest page
   in the product.
2. **Aggregate in SQL**, never by loading rows into Node and reducing. Use `groupBy` or raw SQL with the
   `(tenantId, createdAt)` and `(tenantId, outletId, createdAt)` indexes from MVP-06.
3. **Cache in Redis** with a 60-second TTL, keyed by tenant + period. Invalidate on `pos.sale.completed`
   and `pos.return.processed` outbox events. A minute-stale dashboard is fine; a slow one is not.
4. **Bound every range.** A period selector that permits "all time" will eventually table-scan a tenant's
   entire history. Cap custom ranges at 12 months.
5. Money aggregates stay `Decimal` end to end. Summing in floating point produces totals that disagree with
   the receipts by fractions of a baisa — which is exactly the kind of discrepancy that destroys trust in
   the numbers.

---

## Global search (2.3)

One endpoint, `GET /pos/search?q=`, returning grouped results:

| Group | Matches on | Permission |
|---|---|---|
| Products | name, SKU, barcode | `pos.product.read` |
| Customers | name, phone, email, code | `customer.read` |
| Invoices | invoice number | `pos.sale.read` |
| Employees | name, email | `pos.employee.read` |

Rules:

- **Filter groups by permission.** A cashier searching must not see employee records. Omit the group
  entirely rather than returning an empty one — an empty "Employees" heading still leaks that the category
  exists.
- Cap at 5 per group, with a "see all" link into the relevant filtered list page.
- Debounce 250 ms client-side; require at least 2 characters.
- Barcode-shaped input (all digits, 8+ characters) short-circuits to an exact product-barcode match.
- Use trigram indexes (`pg_trgm`) for name search, or accept prefix-only matching in the MVP. Do **not**
  use `LIKE '%term%'` unindexed across four tables — that is a full scan per keystroke.

---

## Permissions

No new keys. Every widget and search group is gated by the permission of the data it exposes, and the
dashboard endpoint returns only the widgets the caller may see.

---

## API

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/dashboard?period=today\|7d\|30d\|custom&from=&to=` | any POS permission; widgets filtered per key |
| GET | `/pos/dashboard/layout` — the caller's saved widget arrangement | any POS permission |
| PUT | `/pos/dashboard/layout` | any POS permission |
| GET | `/pos/search?q=` | any POS permission; groups filtered per key |

Widget layout is stored per user — a `Json` column on a small `PosDashboardLayout` table keyed by
`(tenantId, userId)`. Do not build a layout engine; store an ordered list of widget keys plus each
widget's period override.

---

## Web

```
apps/web/src/app/pos/page.tsx      → the dashboard (POS home)
```

Components in `features/products/pos/dashboard/`:

```
pos-dashboard-view.tsx     sales-summary-card.tsx    sales-trend-chart.tsx
top-selling-items.tsx      low-stock-alerts.tsx      recent-transactions.tsx
payment-method-chart.tsx   active-registers-card.tsx
quick-actions.tsx          global-search.tsx
```

### Charts

Recharts is **not** a dependency of this project (see `CLAUDE.md`), and MVP-00 §4 does not add it. Use the
existing hand-rolled SVG chart components in `apps/web/src/shared/components`. Two shapes are needed — a
line/bar trend and a proportion breakdown. If those components do not exist yet, build them there (shared),
not in the POS feature folder, so attendance reporting can reuse them.

Before writing chart code, read the `dataviz` skill guidance on palette, axes and accessible contrast.

### Quick actions (2.2)

Open Register, New Sale, Add Product, View Inventory. Each hidden when the user lacks the permission — a
disabled button the user can never enable is noise.

### Empty states

A tenant on day one has no sales. Every widget needs a real empty state that points at the next useful
action ("No sales yet — open a register to start"), not a zero and a blank chart.

---

## Implementation steps

1. **Aggregation queries** — one service assembling all widget payloads, SQL-side aggregation, `Decimal`
   throughout.
2. **Dashboard endpoint** — single response, widgets filtered by permission.
3. **Redis caching** — 60 s TTL, invalidated by sale and return outbox events.
4. **Layout persistence** — `PosDashboardLayout` table, get/put.
5. **Search endpoint** — grouped, permission-filtered, capped, with the barcode short-circuit.
6. **Search indexes** — trigram or prefix indexes on the four searched columns, in a migration.
7. **Shared chart components** — trend and proportion, in `shared/components`.
8. **Web dashboard** — widgets, period selectors, drag-reorder, quick actions, empty states.
9. **Global search UI** — command-palette style, keyboard-navigable, mounted in the POS layout header.
10. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Net revenue includes returns via a single sum; voids excluded |
| Unit | Average ticket excludes returns and voids from the denominator |
| Unit | Period boundaries respect the tenant's timezone, not UTC |
| Integration | Dashboard returns only widgets the caller's permissions allow |
| Integration | Search omits the Employees group for a cashier |
| Integration | Cache invalidates on sale completion — a new sale appears within one refresh |
| Integration | Tenant isolation on every aggregate |
| Performance | Dashboard responds < 1 s on a tenant with 100k sales |
| E2E | Complete a sale → dashboard totals and recent transactions reflect it |

---

## Done when

- A manager opens `/pos` and sees the day's takings, top sellers, low stock and register status in under a
  second.
- Net revenue on the dashboard equals the sum of the day's receipts minus refunds, to the baisa.
- Global search finds a product by barcode, a customer by phone and an invoice by number from one box.

---

## Open decisions

- **Timezone** — all "today" boundaries must use the tenant's timezone. Oman is UTC+4, so a UTC-based day
  boundary shifts takings across days. Confirm the tenant timezone source (`TenantSettings`) before step 1.
- **Trigram vs prefix search** — `pg_trgm` needs a Postgres extension in a migration. Proposal: enable it;
  prefix-only search is noticeably worse for customer names. Confirm.
- **Widget layout scope** — per user (proposed) or per tenant? Per user is friendlier; per tenant is one
  fewer table row to reason about.
