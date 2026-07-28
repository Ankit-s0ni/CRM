# MVP-01 Catalog — Web UI Handoff (C8)

> **Self-contained brief for an agent with no prior session context.**
> The catalog **backend is complete, tested and merged into the working tree**. Only the web UI is left.
> Everything below was verified against the code on 2026-07-27.

---

## 1. What already exists

**Backend (done — do not modify):** 21 POS endpoints, 11 unit tests and 18 e2e tests passing,
`pnpm --filter api architecture:test` green, OpenAPI regenerated into
`packages/contracts/src/generated.ts`.

**Web (done):**

```
apps/web/src/app/pos/layout.tsx                 POS shell + QueryClientProvider
apps/web/src/app/pos/providers.tsx              PosQueryProvider (React Query, POS routes only)
apps/web/src/app/pos/page.tsx                   /pos dashboard page
apps/web/src/features/products/pos/core/pos-shell.tsx          sidebar, auth redirect, module gate
apps/web/src/features/products/pos/core/pos-dashboard-view.tsx setup wizard + settings summary
```

**Your job:** build the catalog screens listed in §4.

---

## 2. Ground rules (these are not negotiable)

1. **React Query is POS-only.** `@tanstack/react-query@^5.101.4` is installed and its provider is mounted
   in `app/pos/layout.tsx`. Use it for all server state in `/pos` routes. Do **not** lift the provider
   higher or use it outside `/pos` — the rest of the app deliberately stays on plain axios + `useState`.
2. **`react-hook-form` is NOT installed and must not be added.** Build forms with `useState`, exactly like
   `apps/web/src/features/products/attendance/configuration/attendance-config-views.tsx`.
3. **No toast library exists.** Feedback is inline — success banners and per-field errors. Do not add one.
4. **No shared table, select, tabs, badge or pagination component exists.** Hand-roll what you need inside
   `features/products/pos/catalog/`. Do **not** start a component library.
5. **Money and quantities are strings, never JS numbers.** `costPrice: "2.500"`, `quantity: "1.000"`.
   Never `parseFloat` a price for display arithmetic — render the string. OMR has 3 decimal places.
6. **One file per screen.** The attendance equivalent is a 2,940-line single file; do not repeat that.

---

## 3. Building blocks to reuse

### Transport
`apps/web/src/lib/api-client.ts` — an axios instance that already attaches the JWT, `x-tenant-id` and
`x-workspace-subdomain`, and refreshes on 401. Always use it; never call `fetch` directly.

```ts
import { apiClient } from "@/lib/api-client";
```

### Error helpers
`apps/web/src/lib/api-error.ts`

```ts
getApiErrorCode(error: unknown): string | undefined   // branch on this, never on the message
getApiErrorMessage(error: unknown, fallback: string): string
```

### Layout primitives — `apps/web/src/shared/components/page-primitives.tsx`

```ts
AdminPage({ title: string; description: string; action?: ReactNode; children: ReactNode })
Panel({ children: ReactNode; className?: string })
PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>)
Field({ label: string; children: ReactNode; helpKey?: AttendanceHelpKey })   // omit helpKey for POS
inputClass: string                                                          // apply to <input>/<select>
LoadingState()
EmptyState({ title: string; body: string })
ErrorState({ message: string })
```

### UI kit — `apps/web/src/shared/ui/`
`button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`. That is the entire kit.

### Navigation
`apps/web/src/features/products/pos/core/pos-shell.tsx` already lists the routes with `comingSoon: true`:

```ts
{ section: "Catalog", items: [
  { label: "Products",   href: "/pos/products",   icon: Package,    comingSoon: true },
  { label: "Categories", href: "/pos/categories", icon: FolderTree, comingSoon: true },
]}
```

**Flip both to `comingSoon: false`** when the screens land, and add a `Units` item
(`href: "/pos/units"`, suggest the `Ruler` icon from lucide-react).

> Note the route is `/pos/categories`, **not** `/pos/products/categories`. Match the shell.

### API error envelope
Every 4xx returns:

```json
{ "code": "POS_PRODUCT_DUPLICATE", "message": "…",
  "details": [{ "field": "sku", "messages": ["Already in use"] }] }
```

Map `details[].field` onto your form inputs. Codes you must handle explicitly:

| Code | HTTP | Meaning |
|---|---|---|
| `POS_NOT_INITIALIZED` | 409 | POS setup has not run — send the user to `/pos`, which renders the wizard |
| `MODULE_ACCESS_DENIED` | 403 | POS module not enabled for the tenant (the shell already handles this) |
| `POS_PRODUCT_DUPLICATE` | 409 | `details[].field` is `sku` or `barcode` |
| `POS_CATEGORY_DUPLICATE` / `POS_UNIT_DUPLICATE` | 409 | name / code already used |
| `POS_CATEGORY_CYCLE` | 400 | tried to move a category beneath itself |
| `POS_BUNDLE_NESTED` / `POS_BUNDLE_SELF_REFERENCE` / `POS_BUNDLE_EMPTY` | 400 | bundle composition invalid |
| `POS_VARIANT_MATRIX_INVALID` | 400 | matrix too large or SKUs collide — show `message` verbatim |
| `POS_IMAGE_INVALID` | 400 | wrong MIME or over 5 MB |
| `POS_IMPORT_FILE_INVALID` | 400 | not a CSV or over 10 MB |

---

## 4. Screens to build

Routes under `apps/web/src/app/pos/`, components under
`apps/web/src/features/products/pos/catalog/`. Keep pages thin — a page renders one view component.

| Route | Page file | View component |
|---|---|---|
| `/pos/products` | `app/pos/products/page.tsx` | `product-list-view.tsx` |
| `/pos/products/new` | `app/pos/products/new/page.tsx` | `product-form-view.tsx` |
| `/pos/products/[id]` | `app/pos/products/[id]/page.tsx` | `product-form-view.tsx` (edit mode) + `variant-matrix-editor.tsx` + `bundle-editor.tsx` + `product-image-uploader.tsx` |
| `/pos/products/import` | `app/pos/products/import/page.tsx` | `product-import-wizard.tsx` |
| `/pos/categories` | `app/pos/categories/page.tsx` | `category-tree-view.tsx` |
| `/pos/units` | `app/pos/units/page.tsx` | `unit-list-view.tsx` |

### 4.1 Product list
- Search box (debounce 300 ms → `q`), category filter, "include inactive" checkbox.
- Hand-rolled `<table>`: Name, SKU, Barcode, Category, Cost, Price, Status.
- Pagination from `meta` (`page`, `pageSize`, `total`).
- Actions: New Product, Import, Export (see §5.4), row → edit.
- `EmptyState` when a fresh tenant has no products, pointing at Import.

### 4.2 Product form
Collapsible sections — Basic, Pricing, Tax & Unit, Category, Images, Inventory. Not a wizard.
Prices are text inputs validated as up-to-3-decimal strings. Category/tax-group/unit are `<select>`s
populated from their list endpoints.

### 4.3 Variant matrix editor (edit page only)
The most intricate piece. Let the user define attributes (name + values), preview the generated
combinations, then POST to `/variants/generate`. The endpoint is **additive** — it returns
`meta: { created, skipped }`, so re-running after adding a value only creates the new rows. Surface that
("3 added, 6 already existed") rather than implying a rebuild. Individual variants can be deleted.

### 4.4 Bundle editor (edit page only)
Only meaningful once the product is saved. Pick component products (never a bundle — the API rejects it),
set a quantity per component and a bundle price. `PUT` replaces the whole composition.

### 4.5 Category tree
Nested list from the flat array (join on `parentId`). Create/rename/reparent/delete.
`DELETE` returns `{ data, deactivated: boolean }` — when `deactivated` is `true` the category was in use
and was deactivated instead of removed. Say so in the UI.

### 4.6 Units
Flat table: code, name, base unit, conversion factor. Same deactivate-instead-of-delete semantics.
Eight defaults (PCS, KG, GRAM, LTR, MTR, BOX, PACK, DOZEN) are seeded automatically.

---

## 5. API contract

All routes require `Authorization: Bearer <jwt>` and `x-tenant-id` — `apiClient` adds both.

### 5.1 Products

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/pos/products` | `q`, `categoryId`, `includeInactive`, `page`, `pageSize` | `{ data: Product[], meta: { page, pageSize, total } }` |
| GET | `/pos/products/lookup` | `?barcode=` or `?sku=` | `{ data: { …, variantId } }` — register hot path, not needed by these screens |
| GET | `/pos/products/:id` | — | `{ data: Product & { category, variants[], bundle } }` |
| POST | `/pos/products` | `CreateProduct` | `{ data: Product }` — **201** |
| PATCH | `/pos/products/:id` | partial `CreateProduct` + `isActive` | `{ data: Product }` |
| DELETE | `/pos/products/:id` | — | `{ data: Product }` — soft delete, sets `isActive:false` |

```ts
type CreateProduct = {
  name: string; sku: string;                     // required
  costPrice: string; sellingPrice: string;       // required, e.g. "2.500"
  barcode?: string; description?: string; brand?: string; vatCode?: string;
  categoryId?: string; taxGroupId?: string; unitOfMeasureId?: string;
  mrp?: string; wholesalePrice?: string; weight?: string;
  imageKeys?: string[];                          // max 5
  trackInventory?: boolean; allowNegativeStock?: boolean; sellByWeight?: boolean;
  reorderPoint?: number; reorderQuantity?: number;
};
```

`Product` responses also carry `imageUrls: string[]` — pre-signed, ~15 min TTL. Render those; never try to
build a URL from `imageKeys` yourself.

### 5.2 Variants & bundles

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/pos/products/:id/variants` | `{ name, sku, barcode?, costPrice?, sellingPrice?, attributes?, imageKey? }` | `{ data: Variant }` |
| POST | `/pos/products/:id/variants/generate` | `{ attributes: [{ name, values: string[] }] }` | `{ data: Variant[], meta: { created, skipped } }` |
| DELETE | `/pos/products/:id/variants/:variantId` | — | `{ data: Variant }` |
| PUT | `/pos/products/:id/bundle` | `{ bundlePrice, components: [{ productId, variantId?, quantity }] }` | `{ data: Bundle & { components } }` |

### 5.3 Categories & units

| Method | Path | Body |
|---|---|---|
| GET/POST | `/pos/categories` | `{ name, parentId?, imageKey?, sortOrder? }` |
| PATCH/DELETE | `/pos/categories/:id` | partial + `isActive?` |
| GET/POST | `/pos/units` | `{ code, name, baseUnitId?, conversionFactor? }` |
| PATCH/DELETE | `/pos/units/:id` | partial + `isActive?` |

Both `DELETE`s return `{ data, deactivated: boolean }`.

### 5.4 Import & export

**There is no multipart upload anywhere in this API.** Uploads are always presign → client `PUT` → register.

```
1. POST /pos/products/import/presign   { filename, contentType: "text/csv", fileSize }
      → { objectKey, uploadUrl, expiresIn }
2. PUT  <uploadUrl>                    raw File body, header Content-Type: text/csv
      (plain fetch/axios — NOT apiClient, this goes to S3 and must carry no auth headers)
3. POST /pos/products/import           { objectKey, mode?: "CREATE" | "UPSERT",
                                         originalFilename?, contentType?, fileSize?,
                                         idempotencyKey? }
      → { data: ImportJob, replayed: boolean }
4. GET  /pos/products/import/:id        → { data: ImportJob }        poll until status COMPLETED/FAILED
5. GET  /pos/products/import/:id/errors → { data: ImportRow[] }      failed rows
```

```ts
type ImportJob = {
  id: string; status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalRows: number; successRows: number; errorRows: number;
  rowErrors: { rowNumber: number; column: string; message: string }[];
  failureReason: string | null;
};
```

- Send an `idempotencyKey` (min 8 chars) so a retried registration returns the original job rather than
  importing twice. Check `replayed` in the response.
- Poll `GET /pos/products/import/:id` every ~1.5 s, capped at ~2 minutes.
- `GET /pos/products/import/template` → `{ data: { columns, required, csv } }` for a "download template"
  link.
- `GET /pos/products/export` returns **raw CSV text** (`Content-Type: text/csv`), not JSON. Trigger a
  browser download via a Blob. The column order matches the importer exactly, so an export round-trips.

Import columns, in order:
`sku, name, barcode, description, brand, category, taxGroup, unit, costPrice, sellingPrice, mrp,
wholesalePrice, trackInventory, reorderPoint, reorderQuantity`
(required: `sku`, `name`, `costPrice`, `sellingPrice`; `category`/`taxGroup` match by **name**, `unit` by
**code**).

### 5.5 Product images

```
1. POST /pos/products/:id/images/presign  { filename, contentType, fileSize }
      → { objectKey, uploadUrl, expiresIn }
2. PUT  <uploadUrl>                       raw File body (again: not apiClient)
3. PATCH /pos/products/:id                { imageKeys: [...existing, newObjectKey] }
```

PNG / JPEG / WebP only, 5 MB each, **max 5 per product**. There is no server-side compression — the API
never sees the bytes. If large uploads become a problem, compress client-side before step 2.

---

## 6. Permissions

Read them from `useAuthStore().user?.permissions` (a `string[]`) and hide actions the user cannot perform.

| Action | Permission |
|---|---|
| View products / export | `pos.product.read` |
| Create | `pos.product.create` |
| Edit, variants, bundles, images | `pos.product.update` |
| Deactivate | `pos.product.delete` |
| Import | `pos.product.import` |
| Categories | `pos.category.manage` |
| Units | `pos.unit.manage` |

---

## 7. Definition of done

1. All six routes render, are reachable from the sidebar, and their `comingSoon` flags are cleared.
2. A product can be created, edited, given up to 5 images, given variants via the matrix, made into a
   bundle, and deactivated — entirely through the UI.
3. A CSV with a deliberate bad row imports: good rows land, the bad row is reported with its row number
   and column, and the user can fix and re-import.
4. Export downloads a CSV that re-imports cleanly in `UPSERT` mode.
5. API validation errors appear against the right field, not as a generic banner.
6. `POS_NOT_INITIALIZED` routes the user to `/pos` rather than showing an error.
7. Verification passes:

```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web build
```

---

## 8. Traps that will cost you time

- **Prices are strings.** `data.costPrice` is `"2.500"`. Rendering `Number(...)` drops the trailing zero
  and float maths corrupts baisa. Render the string; format only for display.
- **`imageUrls` expire (~15 min).** Re-fetch the product rather than caching URLs across a long session.
- **The S3 `PUT` must not carry auth headers.** Use bare `fetch`/`axios`, not `apiClient`, or S3 rejects
  the signature.
- **`/pos/products/export` and `/pos/products/lookup` are literal paths, not ids.** They are declared
  before `:id` on the server; on the client just don't route `/pos/products/export` into the detail page.
- **`POST` returns 201, not 200**, for products, categories, units, variants and import registration.
  `PUT`/`PATCH`/`DELETE` return 200.
- **Category delete may not delete.** Check `deactivated` in the response.
- **Variant generation is additive.** Never present it as "regenerate", which implies destruction.
- **`GRAM` and `DOZEN` ship with a `conversionFactor`.** Show it read-only if you like, but nothing
  consumes it until MVP-02 — don't build unit-conversion maths.

---

## 9. Reference implementations in this repo

| For | Look at |
|---|---|
| Form + inline validation + hand-rolled table, no RHF | `apps/web/src/features/products/attendance/configuration/attendance-config-views.tsx` |
| React Query + `POS_NOT_INITIALIZED` + mutation + invalidation | `apps/web/src/features/products/pos/core/pos-dashboard-view.tsx` |
| Page shell, auth redirect, module gate | `apps/web/src/features/products/pos/core/pos-shell.tsx` |
| Typed endpoint contracts | `packages/contracts/src/generated.ts` (regenerate with `pnpm openapi:generate`) |
| Full milestone spec | `docs/POS/mvp/MVP-01-CATALOG.md` |
| Binding structural decisions | `docs/POS/POS-FOUNDATION-DECISIONS.md` |

---

## 10. Repo state you are inheriting

- Nothing is committed; the catalog backend sits in the working tree.
- **Pre-existing, unrelated red gates:** `pnpm lint` reports 464 errors and 16 e2e suites fail — both were
  already broken before POS work started (verified against `HEAD`). Judge your work by *no new* failures,
  not by a green repo.
- `pnpm --filter web typecheck`, `lint` and `build` **are** clean today. Keep them that way.
