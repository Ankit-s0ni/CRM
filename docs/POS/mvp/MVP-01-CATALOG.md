# MVP-01 — Product & Catalog Management

> **Spec sections**: 5.1 Product Information · 5.2 Variants · 5.3 Categories · 5.4 Item Groups & Bundles ·
> 5.5 Import/Export · 5.6 Units of Measure
> **Depends on**: Phase 0 + Phase 1 (product registration, schema, RLS, module/permission seed)
> **Blocks**: MVP-02 Inventory, MVP-06 Billing
> **Conventions**: [MVP-00-OVERVIEW](./MVP-00-OVERVIEW.md) §4

---

## Scope

**In**: product CRUD with images, variants and the variant matrix, nested categories, bundles, CSV
import/export, units of measure with conversions, barcode capture.

**Out**: barcode *generation* and label printing (20.1/20.2 — scanning an existing barcode is in;
producing labels is not), per-outlet pricing (13.1), vendor cost prices (14.1), batch/expiry capture
(needs goods receipt, 14.4).

`PosBatch` ships as a table because `PosProduct.trackBatches` is referenced by the schema, but **nothing
writes it in the MVP**. Do not build UI for it.

---

## Data model

New models — all under the `POS — CATALOG` banner in `apps/api/prisma/schema.prisma`:

| Model | Notes |
|---|---|
| `PosCategory` | Self-referential `parentId`, `sortOrder`, `imageUrl` |
| `PosProduct` | Per 5.1 + inventory flags; `@@unique([tenantId, sku])`, `@@unique([tenantId, barcode])` |
| `PosVariant` | `attributes Json`, own SKU/barcode/prices |
| `PosBundle` | Bundle header — `bundlePrice`, links to a `PosProduct` marked `isBundle` |
| `PosBundleComponent` | `bundleId`, `productId`, `variantId?`, `quantity` |
| `PosUnitOfMeasure` | Tenant-defined units + `baseUnitId` and `conversionFactor` |
| `PosTaxGroup`, `PosTaxRate`, `PosTaxGroupRate` | Seeded with Oman VAT in Phase 1; product references `taxGroupId` |
| `PosBatch` | Created, unwritten in MVP |

Notes:

- `barcode` is nullable and unique per tenant. PostgreSQL treats `NULL`s as distinct, so many products
  without barcodes coexist — that is intended, and the uniqueness only binds real barcodes.
- Bundles are modelled as a `PosProduct` with `isBundle = true` plus a `PosBundle` row, so they flow
  through cart, tax and reporting as ordinary sale lines with no special-casing at checkout.
- `sellByWeight` and `unitOfMeasureId` are captured now; the weighing-scale integration (17.5) is not.

---

## Permissions

```
pos.product.read      pos.product.create    pos.product.update
pos.product.delete    pos.product.import    pos.category.manage
```

Grants: Administrator all; Store Manager all except `delete`; Cashier `pos.product.read` only.

---

## API

`apps/api/src/products/pos/catalog/`

| Method | Route | Permission |
|---|---|---|
| GET | `/pos/products` — paginated, filters: category, status, stock state, `q` | `pos.product.read` |
| GET | `/pos/products/:id` | `pos.product.read` |
| GET | `/pos/products/lookup?barcode=` — single-row fast path for the register | `pos.product.read` |
| POST | `/pos/products` | `pos.product.create` |
| PATCH | `/pos/products/:id` | `pos.product.update` |
| DELETE | `/pos/products/:id` — soft delete via `isActive` | `pos.product.delete` |
| POST | `/pos/products/:id/images` — multipart, Sharp → Wasabi | `pos.product.update` |
| POST | `/pos/products/:id/variants` · PATCH · DELETE | `pos.product.update` |
| GET/POST/PATCH/DELETE | `/pos/categories` | `pos.category.manage` |
| GET/POST/PATCH/DELETE | `/pos/units` | `pos.product.update` |
| POST | `/pos/products/import` — async, returns `jobId` | `pos.product.import` |
| GET | `/pos/products/import/:jobId` — progress + row errors | `pos.product.import` |
| GET | `/pos/products/export` — streamed CSV | `pos.product.read` |

`/pos/products/lookup` is the register's hot path — it must be a single indexed query returning only the
fields the cart needs. Do not reuse the list endpoint's serialiser for it.

---

## Web

Routes under `apps/web/src/app/pos/products/`:

```
products/
├── page.tsx              → list: search, filters, bulk select, export
├── new/page.tsx          → create form
├── [id]/page.tsx         → edit form + variant matrix + images
├── categories/page.tsx   → tree with drag-reorder
├── units/page.tsx        → UOM + conversions
└── import/page.tsx       → upload → map → validate → commit
```

Components in `apps/web/src/features/products/pos/catalog/`.

The product form is large enough to warrant collapsible sections: Basic, Pricing, Tax, Category, Images,
Inventory, Variants. React Hook Form with one schema per section; do not build a wizard.

The variant matrix generates the cartesian product of attribute values, then lets the user delete rows and
edit SKU/barcode/price per row before saving. Warn — do not silently drop — when a generated SKU collides.

---

## Implementation steps

1. **Schema** — add the models above under the `POS — CATALOG` banner. Migration includes RLS policies and
   grants for every new table.
2. **Seed** — Oman VAT tax rates (5% standard, 0% zero-rated, exempt, out-of-scope), the matching tax
   groups, and the predefined units (PCS, KG, GRAM, LTR, MTR, BOX, PACK, DOZEN).
3. **Category service + controller** — nested reads, cycle prevention on reparent, `sortOrder`
   maintenance. A category with products or children cannot be deleted, only deactivated.
4. **Product service + controller** — CRUD, SKU auto-generation when `PosSettings.autoGenerateSku` is on,
   duplicate SKU/barcode rejection with a field-level error.
5. **Image upload** — multipart → `sharp` resize/compress in memory → existing
   `private-object-storage.service.ts` (Wasabi) → store the CDN URL in `imageUrls`. Cap count and byte size
   per product; reject non-image MIME types by content sniffing, not by file extension.
6. **Variant service** — matrix generation, per-variant SKU/barcode uniqueness, `hasVariants` maintenance
   on the parent.
7. **Bundle service** — component add/remove, bundle price, and a guard that a bundle cannot contain
   itself or another bundle (one level only in MVP).
8. **UOM service** — CRUD plus conversion factors against a base unit.
9. **CSV import worker** — `PosProductImportWorker` on `pos:product-import`. Parse with the existing
   `csv-parse`, validate per row, report `{ row, column, message }` errors, and support update-by-SKU.
   Import runs in batches inside transactions so a bad row does not roll back the whole file.
10. **CSV export** — streamed, same column order as the import template, so an export round-trips.
11. **Web** — list, forms, category tree, UOM page, import wizard.
12. **OpenAPI** — regenerate and commit.

---

## Tests

| Level | Case |
|---|---|
| Unit | Variant matrix generation, including collision handling |
| Unit | Bundle component validation (self-reference, nesting) |
| Unit | UOM conversion arithmetic on `Decimal` |
| Unit | CSV row validation — missing name, duplicate SKU, bad decimal, unknown category |
| Integration | Duplicate SKU and duplicate barcode both rejected per tenant, allowed across tenants |
| Integration | Tenant isolation — tenant B cannot read tenant A's products |
| E2E | Import a 200-row CSV → correct one row in the UI → export → re-import cleanly |

---

## Done when

- A catalogue can be created by CSV and corrected in the UI, with images.
- `/pos/products/lookup?barcode=` returns a product in a single query, and MVP-06 can build on it.
- Every product resolves to a tax group, so MVP-06 can compute VAT without a fallback path.
- Deleting is soft — no product referenced by a sale can ever be hard-deleted.

---

## Open decisions

- **Auto-SKU format** — `PosSettings.autoGenerateSku` exists but the pattern is unspecified. Proposal:
  `<CATEGORY-PREFIX>-<5-digit sequence>`, editable before save. Confirm before building step 4.
- **Image count cap** — proposal: 5 per product, 5 MB each pre-compression. Confirm.
