# DeltCRM POS — Implementation Plan

> Detailed technical implementation plan for integrating a Point of Sale system into the DeltCRM platform, modeled after Zoho POS (Zakya).
>
> ⚠️ **Read [`POS-FOUNDATION-DECISIONS.md`](./POS-FOUNDATION-DECISIONS.md) first.** It records the binding
> structural decisions (routing, schema layout, data layer, customer ownership, architecture governance)
> and the schema defects corrected in this document. Where anything here is ambiguous, that file wins.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Integration with Existing CRM](#2-integration-with-existing-crm)
3. [Database Schema Design](#3-database-schema-design)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation — Tenant POS Dashboard](#5-frontend-implementation--tenant-pos-dashboard)
6. [Frontend Implementation — Platform Admin POS](#6-frontend-implementation--platform-admin-pos)
7. [Frontend Implementation — POS Billing Register](#7-frontend-implementation--pos-billing-register)
8. [Mobile POS Implementation](#8-mobile-pos-implementation)
9. [Payment Integration](#9-payment-integration)
10. [Hardware Integration](#10-hardware-integration)
11. [Offline Mode Architecture](#11-offline-mode-architecture)
12. [Real-Time Features](#12-real-time-features)
13. [Testing Strategy](#13-testing-strategy)
14. [Sprint Breakdown](#14-sprint-breakdown)
15. [Deployment Considerations](#15-deployment-considerations)
16. [Risk Assessment](#16-risk-assessment)

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DeltCRM Monorepo                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  apps/api/src/platform/                                             │
│  └── customers/           ← NEW: platform-level Customer context    │
│                              (customers, customer_groups) — D4      │
│                                                                     │
│  apps/api/src/shared/     ← infrastructure ONLY, no business code   │
│                              (see D5: shared may not import         │
│                               platform/** or products/**)           │
│                                                                     │
│  apps/api/src/products/                                             │
│  ├── attendance/          ← Existing Attendance Product Module      │
│  └── pos/                 ← NEW: POS Product Module                 │
│      ├── pos-product.module.ts  ← composition root                  │
│      ├── public.ts        ← the ONLY import surface for other code  │
│      ├── README.md        ← required by architecture governance     │
│      ├── core/            ← Orders, billing, cart, checkout         │
│      ├── catalog/         ← Products, categories, variants          │
│      ├── register/        ← Registers, sessions, cash management    │
│      ├── inventory/       ← Stock, adjustments, transfers           │
│      ├── payments/        ← Thawani / Amwal checkout adapters       │
│      ├── purchasing/      ← Purchase orders, vendors, goods receipt │
│      ├── promotions/      ← Discounts, coupons, promotions          │
│      ├── loyalty/         ← Points ledger, credit notes             │
│      ├── reporting/       ← Sales, inventory, financial reports     │
│      ├── configuration/   ← POS settings, tax, receipts, hardware   │
│      ├── workflows/       ← Dynamic order states, transitions, forms│
│      └── storefront/      ← Online store, omnichannel (P3)          │
│                                                                     │
│  apps/api/src/platform/notifications/                               │
│  └── whatsapp provider adapter ← NEW, behind the existing           │
│      notification-provider.port.ts (not a new module)               │
│                                                                     │
│  apps/web/src/                                                      │
│  ├── app/app/attendance/  ← Existing attendance routes (/app/*)     │
│  ├── app/pos/             ← NEW: POS at the route ROOT (/pos/*)     │
│  ├── app/pos/billing/     ← NEW: Full-screen POS Billing UI         │
│  ├── app/platform/pos/    ← NEW: Platform Admin POS Management      │
│  └── features/products/pos/  ← NEW: POS feature components          │
│                                                                     │
│  apps/mobile/lib/features/                                          │
│  ├── attendance/          ← Existing attendance features            │
│  └── pos/                 ← NEW: Mobile POS features (P2/P3)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

> **Placement corrections** — the earlier draft of this plan put `customers/`, `inventory/`, `payments/`,
> `messaging/` and `forms/` under `apps/api/src/shared/`. `pnpm architecture:check` fails any file in
> `src/shared/**` that imports `platform/**` or `products/**`, and business tables there would have no
> owner under `TABLE-OWNERSHIP.md`. See D5 for the full mapping.

### 1.2 Technology Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Backend Module | NestJS product at `src/products/pos/`, registered in `module-boundaries.json` | Required by architecture governance (D5) |
| Database | POS models appended to the single `apps/api/prisma/schema.prisma` under banner comments | There is no split-schema directory; splitting is a separate refactor (D2) |
| Multi-tenancy | `prisma.forTenant()` + per-table RLS policies in the creating migration | Consistent with existing tenant isolation |
| Customer record | Platform-level `Customer` in `src/platform/customers/` | Reusable across products; this is a CRM (D4) |
| Real-time | SSE for live register updates, inventory alerts | Proven pattern from field-tracking module |
| Queue/Jobs | BullMQ workers; recurring work as repeatable jobs | `@nestjs/schedule` is not installed and not used anywhere |
| Offline | IndexedDB (web) + Isar (mobile) with background sync | Aligns with mobile offline-first architecture |
| Hardware | Web Serial API + WebUSB for direct hardware | Browser-native APIs, no plugins needed |
| Payments | Thawani Pay + Amwal Pay adapters against the existing `payment-provider.port.ts` shape | Local Omani gateways; port already proven by platform billing |
| API validation | `class-validator` DTOs + `createValidationPipe()` | Matches the rest of the API — there is no Zod/`nestjs-zod` in this codebase |
| Dynamic form schemas | JSON Schema stored in `pos_form_schemas`, validated server-side with `ajv` | Tenant-authored schemas are data, not code, so they need a runtime validator |
| Web data layer | TanStack React Query + React Hook Form, scoped to POS routes | Cache invalidation and form density justify it here only (D3) |

### 1.3 Routing Architecture

POS sits at the **route root** (`/pos/*`), not under the `/app/*` workspace shell — see D1. On disk that is
`apps/web/src/app/pos/**`; platform POS administration is `apps/web/src/app/platform/pos/**`.

Because it does not inherit `app/app/layout.tsx`, `apps/web/src/app/pos/layout.tsx` must establish auth,
tenant resolution, the `QueryClientProvider`, and the POS module guard itself.

| Route | Purpose | Layout |
|---|---|---|
| `/pos` | POS Dashboard (home) | POS sidebar layout |
| `/pos/billing` | POS Register / Billing screen | Full-screen, no sidebar |
| `/pos/products` | Product catalog management | POS sidebar layout |
| `/pos/products/[id]` | Product detail/edit | POS sidebar layout |
| `/pos/inventory` | Inventory overview | POS sidebar layout |
| `/pos/inventory/adjustments` | Stock adjustments | POS sidebar layout |
| `/pos/inventory/transfers` | Stock transfers | POS sidebar layout |
| `/pos/customers` | Customer list | POS sidebar layout |
| `/pos/customers/[id]` | Customer detail | POS sidebar layout |
| `/pos/orders` | Order/transaction history | POS sidebar layout |
| `/pos/orders/[id]` | Order detail | POS sidebar layout |
| `/pos/returns` | Returns management | POS sidebar layout |
| `/pos/purchase-orders` | Purchase orders | POS sidebar layout |
| `/pos/vendors` | Vendor management | POS sidebar layout |
| `/pos/promotions` | Discounts & promotions | POS sidebar layout |
| `/pos/loyalty` | Loyalty program config | POS sidebar layout |
| `/pos/reports` | Reports dashboard | POS sidebar layout |
| `/pos/reports/[type]` | Specific report view | POS sidebar layout |
| `/pos/registers` | Register management | POS sidebar layout |
| `/pos/settings` | POS settings | POS sidebar layout |
| `/pos/settings/tax` | Tax / VAT configuration | POS sidebar layout |
| `/pos/settings/receipts` | Receipt template config | POS sidebar layout |
| `/pos/settings/payments` | Payment method config | POS sidebar layout |
| `/pos/settings/hardware` | Hardware config | POS sidebar layout |
| `/pos/online-store` | Online store management | POS sidebar layout |
| `/platform/pos` | Platform POS admin | Platform sidebar layout |
| `/platform/pos/tenants` | Tenant POS subscriptions | Platform sidebar layout |
| `/platform/pos/plans` | POS plan management | Platform sidebar layout |
| `/platform/pos/features` | Feature flag management | Platform sidebar layout |

---

## 2. Integration with Existing CRM

### 2.1 Shared Infrastructure

The POS module will leverage existing CRM infrastructure:

| Component | Existing | POS Usage |
|---|---|---|
| **Authentication** | Passport JWT + Argon2 | Same auth system, POS-specific permissions added |
| **Authorization** | `PermissionsGuard` + `ModuleGuard` over a flat `Permission.key` table | Add `pos.*` keys to `permissions.constants.ts`, grant in `DEFAULT_ROLE_PERMISSIONS`, seed rows. **Not CASL** — `@casl/*` is installed but unused |
| **Multi-tenancy** | `prisma.forTenant()` + RLS policies | Same tenant isolation; every POS table gets `tenant_isolation` + `platform_access` policies and grants in its creating migration |
| **Employee/User** | `User`, `Employee`, `Role` | POS roles (Cashier, Store Manager) are seeded roles in the existing system |
| **Customer** | *(none — POS introduces it)* | New platform context `src/platform/customers/` owning `customers` + `customer_groups` (D4) |
| **Billing/Plans** | `SubscriptionPlan`, `Module`, `ModuleCapability`, `SubscriptionPlanCapability.limitValue`, `TenantCapabilityOverride` | POS registers as module key `POS` with capability rows. Plan tiers and usage limits are **seed data**, not new tables |
| **Payments** | `payment-provider.port.ts`, `payment-providers.ts`, `BillingWebhookReceipt` | Thawani + Amwal checkout adapters implementing the same port shape, with POS-owned transaction tables |
| **Audit** | `TenantAuditLog`, `SystemAuditLog` | POS transactions logged to existing audit trail |
| **Notifications** | `NotificationsModule` + `notification-provider.port.ts` + dispatcher + worker + templates | POS alerts and receipts ride existing rails; WhatsApp is one new provider adapter |
| **Domain events** | `OutboxEvent` + `OutboxService` + `OutboxRelayService` | `pos.*` events published transactionally on existing rails |
| **File Storage** | `shared/storage/private-object-storage.service.ts` on `@aws-sdk/client-s3` | Wasabi is S3-compatible — configuration change. `sharp` compression and the Cloudflare CDN domain are new |
| **Invoice numbering** | `InvoiceSequence` model (platform billing) | Reuse the row-locking pattern for gapless per-tenant POS invoice numbers |
| **Queue/Workers** | BullMQ | POS-specific workers added to existing worker process |
| **Architecture governance** | `apps/api/architecture/` + `pnpm architecture:check` | POS registers as a product with a composition root, `public.ts`, table ownership and a self-test (D5) |

### 2.2 New Permissions for POS

POS permissions are plain keys in the existing system. Three places must be updated together:

1. `apps/api/src/shared/authorization/permissions.constants.ts` — add to the `PERMISSIONS` object
2. the same file's `DEFAULT_ROLE_PERMISSIONS` — grant to `BUSINESS_ADMIN` and the new POS roles
3. `apps/api/prisma/seed.js` — upsert the `permissions` rows

There is no ability factory to update; guards read these keys directly via `@RequirePermissions()`.

```typescript
// POS-specific permission keys (added to PERMISSIONS in permissions.constants.ts)
const POS_PERMISSIONS = {
  // Catalog
  'pos.product.read': 'View products',
  'pos.product.create': 'Create products',
  'pos.product.update': 'Edit products',
  'pos.product.delete': 'Delete products',
  'pos.product.import': 'Import products (CSV)',
  'pos.category.manage': 'Manage product categories',
  
  // Billing/Sales
  'pos.sale.create': 'Create sales / Process billing',
  'pos.sale.void': 'Void/cancel transactions',
  'pos.sale.discount': 'Apply discounts at POS',
  'pos.sale.discount.override': 'Override discount limits',
  'pos.sale.price.override': 'Override product prices',
  'pos.sale.return': 'Process returns and refunds',
  'pos.sale.credit-note': 'Issue credit notes',
  
  // Inventory
  'pos.inventory.read': 'View inventory levels',
  'pos.inventory.adjust': 'Make stock adjustments',
  'pos.inventory.transfer': 'Create stock transfers',
  'pos.inventory.receive': 'Receive goods',
  
  // Register
  'pos.register.manage': 'Create/configure registers',
  'pos.register.open-session': 'Open register sessions',
  'pos.register.close-session': 'Close register sessions',
  'pos.register.cash-management': 'Record cash in/out',
  
  // Customers
  'pos.customer.read': 'View customers',
  'pos.customer.create': 'Create customers',
  'pos.customer.update': 'Edit customers',
  'pos.customer.delete': 'Delete customers',
  
  // Purchase Orders
  'pos.purchase-order.read': 'View purchase orders',
  'pos.purchase-order.create': 'Create purchase orders',
  'pos.purchase-order.approve': 'Approve purchase orders',
  'pos.purchase-order.receive': 'Receive goods against PO',
  
  // Reports
  'pos.report.sales': 'View sales reports',
  'pos.report.inventory': 'View inventory reports',
  'pos.report.financial': 'View financial reports',
  'pos.report.employee': 'View employee performance reports',
  'pos.report.export': 'Export reports',
  
  // Settings
  'pos.settings.manage': 'Manage POS settings',
  'pos.settings.tax': 'Configure tax/VAT',
  'pos.settings.payment': 'Configure payment methods',
  
  // Promotions
  'pos.promotion.manage': 'Manage discounts and promotions',
  'pos.coupon.manage': 'Create and revoke coupon codes',
  'pos.loyalty.manage': 'Manage loyalty program',
  'pos.loyalty.adjust': 'Manually adjust customer loyalty points',

  // Workflows (dynamic order state machines)
  'pos.workflow.manage': 'Create and edit workflows and form schemas',
  'pos.order.advance': 'Advance an order to its next workflow state',

  // Outlets
  'pos.outlet.read': 'View outlets',
  'pos.outlet.manage': 'Create/configure outlets and warehouses',
};
```

Customer permissions are **not** in this list — customers are a platform context (D4) and reuse
`customer.read` / `customer.create` / `customer.update` / `customer.delete` keys owned by that context.
The `pos.customer.*` keys above are retained only as POS-scoped view grants for cashier roles; the write
paths go through the Customers public contract.

**Discount limits.** `pos.sale.discount` is a boolean grant. The per-role *maximum* discount percentage
(feature spec §8.5, flow 10.3) is not expressible as a permission key — it is stored as a numeric field on
the POS role configuration and enforced server-side in the cart service, with `pos.sale.discount.override`
gating the manager-PIN escalation path.

### 2.3 Module Registration

POS registers in the existing catalog. Module keys are **UPPERCASE** (`ATTENDANCE`, `FIELD_TRACKING`), and
there is no `subModules` field — sub-features are `ModuleCapability` rows, which is also what plan tiers and
usage limits hang off. Seeded in `apps/api/prisma/seed.js` alongside the attendance module:

```javascript
const posModule = await prisma.module.upsert({
  where: { key: 'POS' },
  update: {
    name: 'Point of Sale',
    description: 'Retail billing, inventory, catalog and customer operations',
    icon: 'shopping-cart',
    availability: 'AVAILABLE',
    kind: 'PRODUCT',
    catalogOrder: 30,
    customerVisible: true,
  },
  create: {
    key: 'POS',
    name: 'Point of Sale',
    description: 'Retail billing, inventory, catalog and customer operations',
    icon: 'shopping-cart',
    kind: 'PRODUCT',
    catalogOrder: 30,
  },
});
```

Capabilities — `[key, name, isCore, configurable, dependencyKeys, displayOrder]`:

```javascript
const posCapabilities = [
  ['POS_CORE',            'Billing, cart and checkout',      true,  true,  [],            10],
  ['POS_CATALOG',         'Products, categories, variants',  true,  true,  ['POS_CORE'],  20],
  ['POS_INVENTORY',       'Stock tracking and adjustments',  false, true,  ['POS_CORE'],  30],
  ['POS_SESSIONS',        'Register sessions and cash count',false, true,  ['POS_CORE'],  40],
  ['POS_RETURNS',         'Returns, refunds, credit notes',  false, true,  ['POS_CORE'],  50],
  ['POS_PROMOTIONS',      'Discounts, promotions, coupons',  false, true,  ['POS_CORE'],  60],
  ['POS_LOYALTY',         'Loyalty points programme',        false, true,  ['POS_CORE'],  70],
  ['POS_MULTI_OUTLET',    'Multiple outlets and transfers',  false, true,  ['POS_CORE'],  80],
  ['POS_PURCHASING',      'Vendors and purchase orders',     false, true,  ['POS_INVENTORY'], 90],
  ['POS_WORKFLOWS',       'Dynamic order workflows + forms', false, true,  ['POS_CORE'],  100],
  ['POS_ADVANCED_REPORTS','Advanced and scheduled reports',  false, true,  ['POS_CORE'],  110],
  ['POS_OFFLINE',         'Offline billing and sync',        false, true,  ['POS_CORE'],  120],
  ['POS_API_ACCESS',      'REST API and webhooks',           false, true,  ['POS_CORE'],  130],
];
```

Numeric limits from the plan matrix (feature spec §24.2 — users, registers, outlets, monthly transactions)
are `SubscriptionPlanCapability.limitValue` JSON on the relevant capability, with per-tenant exceptions via
`TenantCapabilityOverride`. **No new tables and no new platform admin UI are required for plan gating.**

Route protection uses the existing decorators:

```typescript
@RequireModule('POS')
@RequirePermissions('pos.sale.create')
```

---

## 3. Database Schema Design

### 3.1 Schema File Organization

There is **one** schema file — `apps/api/prisma/schema.prisma` (~2,088 lines). No `prisma/schema/`
directory exists, and this work does not create one (D2). POS models are appended to that file, grouped
under banner comments:

```prisma
// ═════════════════════════════════════════════
// POS — CATALOG
// ═════════════════════════════════════════════
model PosCategory { ... }
model PosProduct { ... }
model PosVariant { ... }
model PosBatch { ... }

// ═════════════════════════════════════════════
// POS — REGISTER & OUTLETS
// ═════════════════════════════════════════════
...
```

Section order: `CATALOG` → `REGISTER & OUTLETS` → `INVENTORY` → `SALES` → `PURCHASING` →
`PROMOTIONS & LOYALTY` → `WORKFLOWS` → `CONFIGURATION`. Platform `Customer` / `CustomerGroup` models go
in a separate `CUSTOMERS` banner near the other platform models, not in the POS block — they are owned by
the Customers context (D4).

Enums live immediately above the first model that uses them, matching the file's existing style.

**Before writing any model**, add the ownership rows to `apps/api/architecture/TABLE-OWNERSHIP.md`:

| Context | Owned data |
|---|---|
| Customers | customers, customer groups |
| POS | outlets, registers, sessions, cash movements, catalog, variants, batches, stock, adjustments, transfers, sales, sale items, sale payments, sale field data, vendors, purchase orders, promotions, coupons, loyalty ledger, credit notes, workflows, form schemas, POS settings, receipt templates |

### 3.2 Core Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Tenant     │────<│   Outlet     │────<│   Register   │
└──────────────┘     └──────────────┘     └──────────────┘
                           │                     │
                           │                     │
                     ┌─────┘─────┐         ┌─────┘─────┐
                     │           │         │           │
               ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐
               │ Warehouse│ │  Staff │ │Session │ │  Sale  │
               └──────────┘ └────────┘ └────────┘ └────────┘
                     │                       │         │
               ┌─────┘────┐                 │    ┌────┘─────┐
               │          │                 │    │          │
          ┌────────┐ ┌─────────┐     ┌──────────┐  ┌──────────┐
          │ Stock  │ │Transfer │     │CashMove  │  │SaleItem  │
          └────────┘ └─────────┘     └──────────┘  └──────────┘
               │                                        │
          ┌────┘──────────────────────┐            ┌────┘
          │                           │            │
     ┌────────┐  ┌──────────┐   ┌─────────┐  ┌────────┐
     │Product │──│ Variant  │   │Adjustment│  │Payment │
     └────────┘  └──────────┘   └─────────┘  └────────┘
          │
     ┌────┘────┐
     │         │
┌────────┐ ┌────────┐
│Category│ │ Batch  │
└────────┘ └────────┘
```

### 3.3 Detailed Entity Definitions

#### Catalog Domain — banner `POS — CATALOG`

```prisma
model PosProduct {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  name            String
  sku             String
  barcode         String?
  description     String?
  brand           String?
  vatCode         String?          // VAT classification code
  unitOfMeasure   String   @default("PCS")
  costPrice       Decimal  @db.Decimal(12, 3)
  sellingPrice    Decimal  @db.Decimal(12, 3)
  mrp             Decimal? @db.Decimal(12, 3)
  wholesalePrice  Decimal? @db.Decimal(12, 3)
  taxGroupId      String?  @db.Uuid
  categoryId      String?  @db.Uuid
  imageUrls       String[]         // Wasabi URLs (Served via Cloudflare)
  isActive        Boolean  @default(true)
  trackInventory  Boolean  @default(true)
  allowNegativeStock Boolean @default(false)
  reorderPoint    Int?
  reorderQuantity Int?
  weight          Decimal? @db.Decimal(8, 3)
  sellByWeight    Boolean  @default(false)
  hasVariants     Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant     Tenant          @relation(fields: [tenantId], references: [id])
  category   PosCategory?    @relation(fields: [categoryId], references: [id])
  taxGroup   PosTaxGroup?    @relation(fields: [taxGroupId], references: [id])
  variants   PosVariant[]
  saleItems  PosSaleItem[]
  stockItems PosStock[]
  batchItems PosBatch[]

  @@unique([tenantId, sku])
  @@unique([tenantId, barcode])
  @@index([tenantId, categoryId])
  @@index([tenantId, isActive])
  @@map("pos_products")
}

model PosCategory {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  name        String
  parentId    String? @db.Uuid
  imageUrl    String?
  sortOrder   Int     @default(0)
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant        @relation(fields: [tenantId], references: [id])
  parent   PosCategory?  @relation("CategoryTree", fields: [parentId], references: [id])
  children PosCategory[] @relation("CategoryTree")
  products PosProduct[]

  @@unique([tenantId, name, parentId])
  @@map("pos_categories")
}

model PosVariant {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String  @db.Uuid
  productId     String  @db.Uuid
  name          String           // e.g., "Red / Large"
  sku           String
  barcode       String?
  costPrice     Decimal? @db.Decimal(12, 3)
  sellingPrice  Decimal? @db.Decimal(12, 3)
  attributes    Json             // { "color": "Red", "size": "Large" }
  imageUrl      String?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant   Tenant      @relation(fields: [tenantId], references: [id])
  product  PosProduct  @relation(fields: [productId], references: [id])
  stock    PosStock[]

  @@unique([tenantId, sku])
  @@map("pos_variants")
}

model PosBatch {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @db.Uuid
  productId     String   @db.Uuid
  batchNumber   String
  manufactureDate DateTime?
  expiryDate    DateTime?
  quantity      Int
  costPrice     Decimal  @db.Decimal(12, 3)
  createdAt     DateTime @default(now())

  tenant  Tenant     @relation(fields: [tenantId], references: [id])
  product PosProduct @relation(fields: [productId], references: [id])

  @@unique([tenantId, productId, batchNumber])
  @@map("pos_batches")
}
```

#### Sales Domain — banner `POS — SALES`

> **Two orthogonal status axes** (D7.3). `status` is the *financial* lifecycle; `currentStateId` is the
> *operational* position in a tenant-defined workflow. A laundry order is `status = OPEN` with
> `currentState = Cleaning`; a retail sale carries `workflowId = NULL` and goes straight to `COMPLETED`.
> The earlier draft had `workflow_id` in the ERD but not in the model, and no field at all for the current
> state — the state machine had nowhere to persist itself.

```prisma
model PosSale {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String    @db.Uuid
  outletId        String    @db.Uuid
  registerId      String    @db.Uuid
  sessionId       String    @db.Uuid
  invoiceNumber   String              // Gapless per tenant — see 4.2
  customerId      String?   @db.Uuid  // → platform Customer (D4)
  salespersonId   String?   @db.Uuid
  orderType       PosOrderType @default(WALK_IN)
  status          PosSaleStatus @default(COMPLETED)  // financial lifecycle
  workflowId      String?   @db.Uuid  // null = plain retail checkout
  currentStateId  String?   @db.Uuid  // operational position within the workflow
  subtotal        Decimal   @db.Decimal(12, 3)
  discountAmount  Decimal   @db.Decimal(12, 3) @default(0)
  discountType    DiscountType?
  discountValue   Decimal?  @db.Decimal(12, 3)
  taxAmount       Decimal   @db.Decimal(12, 3) @default(0)
  totalAmount     Decimal   @db.Decimal(12, 3)
  roundOffAmount  Decimal   @db.Decimal(8, 3) @default(0)
  netAmount       Decimal   @db.Decimal(12, 3)  // totalAmount + roundOff
  amountPaid      Decimal   @db.Decimal(12, 3) @default(0)  // credit/due bills
  amountDue       Decimal   @db.Decimal(12, 3) @default(0)  // netAmount - amountPaid
  notes           String?
  isReturn        Boolean   @default(false)
  originalSaleId  String?   @db.Uuid          // For return transactions
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant       Tenant            @relation(fields: [tenantId], references: [id])
  outlet       PosOutlet         @relation(fields: [outletId], references: [id])
  register     PosRegister       @relation(fields: [registerId], references: [id])
  session      PosSession        @relation(fields: [sessionId], references: [id])
  customer     Customer?         @relation(fields: [customerId], references: [id])
  workflow     PosWorkflow?      @relation(fields: [workflowId], references: [id])
  currentState PosWorkflowState? @relation("SaleCurrentState", fields: [currentStateId], references: [id])
  items        PosSaleItem[]
  payments     PosSalePayment[]
  fieldData    PosSaleFieldData[]
  promotionUsages PosPromotionUsage[]
  originalSale PosSale?          @relation("SaleReturn", fields: [originalSaleId], references: [id])
  returns      PosSale[]         @relation("SaleReturn")

  @@unique([tenantId, invoiceNumber])
  @@index([tenantId, outletId, createdAt])
  @@index([tenantId, customerId])
  @@index([tenantId, createdAt])
  @@index([tenantId, workflowId, currentStateId])  // order queue by state
  @@map("pos_sales")
}

model PosSaleItem {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String  @db.Uuid
  saleId        String  @db.Uuid
  productId     String  @db.Uuid
  variantId     String? @db.Uuid
  productName   String           // Snapshot at time of sale
  sku           String           // Snapshot
  quantity      Decimal @db.Decimal(10, 3)
  unitPrice     Decimal @db.Decimal(12, 3)  // Price at time of sale
  costAtSale    Decimal @db.Decimal(12, 3)  // Cost snapshot — required for margin/P&L reports
  discountAmount Decimal @db.Decimal(12, 3) @default(0)
  taxGroupId    String? @db.Uuid
  taxRate       Decimal @db.Decimal(5, 3)   // Rate snapshot — invoices must not drift on rate change
  taxAmount     Decimal @db.Decimal(12, 3) @default(0)
  subtotal      Decimal @db.Decimal(12, 3)  // (unitPrice * quantity) - discount
  total         Decimal @db.Decimal(12, 3)  // subtotal + tax
  notes         String?
  isReturned    Boolean @default(false)
  returnQuantity Decimal? @db.Decimal(10, 3)
  returnReason   String?                    // Defective / Wrong item / Changed mind
  returnCondition PosReturnCondition?       // RESELLABLE restocks, DAMAGED does not

  tenant   Tenant      @relation(fields: [tenantId], references: [id])
  sale     PosSale     @relation(fields: [saleId], references: [id])
  product  PosProduct  @relation(fields: [productId], references: [id])

  @@index([tenantId, saleId])
  @@index([tenantId, productId])
  @@map("pos_sale_items")
}

model PosSalePayment {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String  @db.Uuid
  saleId        String  @db.Uuid
  method        PosPaymentMethod
  amount        Decimal @db.Decimal(12, 3)
  referenceNumber String?         // Card auth code, gateway ref, cheque number
  gatewayTransactionId String?    // Payment gateway reference
  changeAmount  Decimal? @db.Decimal(12, 3) // For cash (tendered - total)
  creditNoteId  String? @db.Uuid  // If paying with credit note
  loyaltyPoints Int?              // If paying with loyalty points
  createdAt     DateTime @default(now())

  tenant Tenant  @relation(fields: [tenantId], references: [id])
  sale   PosSale @relation(fields: [saleId], references: [id])

  @@index([tenantId, saleId])
  @@map("pos_sale_payments")
}

enum PosOrderType {
  WALK_IN
  DELIVERY
  PICKUP
  ONLINE
}

enum PosSaleStatus {
  DRAFT               // Held/parked order, not yet committed
  OPEN                // Workflow-governed order in progress, not yet fully paid
  COMPLETED
  VOIDED
  RETURNED
  PARTIALLY_RETURNED
}

enum PosPaymentMethod {
  CASH
  THAWANI             // Thawani Pay (Oman)
  AMWAL               // Amwal Pay (Oman)
  CREDIT_CARD         // EDC terminal, reference captured manually
  DEBIT_CARD
  BANK_TRANSFER
  CHEQUE
  CREDIT_NOTE
  LOYALTY_POINTS
  DUE                 // Credit sale — balance recorded against the customer
  CUSTOM
}

enum PosReturnCondition {
  RESELLABLE          // Restocked
  DAMAGED             // Not restocked; logged as a damaged return
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

#### Register Domain — banner `POS — REGISTER & OUTLETS`

```prisma
model PosOutlet {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  name        String
  address     String?
  city        String?
  state       String?
  pincode     String?
  phone       String?
  email       String?
  vatNumber       String?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant     Tenant        @relation(fields: [tenantId], references: [id])
  registers  PosRegister[]
  sales      PosSale[]
  stock      PosStock[]
  warehouses PosWarehouse[]

  @@unique([tenantId, name])
  @@map("pos_outlets")
}

model PosRegister {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @db.Uuid
  outletId  String  @db.Uuid
  name      String           // e.g., "Counter 1", "Register A"
  deviceId  String?          // Mapped device identifier
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant   Tenant      @relation(fields: [tenantId], references: [id])
  outlet   PosOutlet   @relation(fields: [outletId], references: [id])
  sessions PosSession[]
  sales    PosSale[]

  @@unique([tenantId, outletId, name])
  @@map("pos_registers")
}

model PosSession {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  registerId      String   @db.Uuid
  cashierId       String   @db.Uuid   // User who opened the session
  openingFloat    Decimal  @db.Decimal(12, 3)
  closingAmount   Decimal? @db.Decimal(12, 3)
  expectedAmount  Decimal? @db.Decimal(12, 3) // Auto-calculated
  discrepancy     Decimal? @db.Decimal(12, 3) // closing - expected
  status          PosSessionStatus @default(OPEN)
  openedAt        DateTime @default(now())
  closedAt        DateTime?
  closingNotes    String?
  denominations   Json?            // { "2000": 2, "500": 5, "200": 3, ... }

  tenant       Tenant           @relation(fields: [tenantId], references: [id])
  register     PosRegister      @relation(fields: [registerId], references: [id])
  sales        PosSale[]
  cashMovements PosCashMovement[]

  @@index([tenantId, registerId, status])
  @@map("pos_sessions")
}

model PosCashMovement {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  sessionId   String  @db.Uuid
  type        PosCashMovementType
  amount      Decimal @db.Decimal(12, 3)
  reason      String
  performedBy String  @db.Uuid
  createdAt   DateTime @default(now())

  tenant  Tenant     @relation(fields: [tenantId], references: [id])
  session PosSession @relation(fields: [sessionId], references: [id])

  @@map("pos_cash_movements")
}

enum PosSessionStatus {
  OPEN
  CLOSED
}

enum PosCashMovementType {
  CASH_IN
  CASH_OUT
}
```

#### Inventory Domain — banner `POS — INVENTORY`

> ⚠️ **Corrected (D7.1).** The original `@@unique([tenantId, productId, variantId, outletId, warehouseId])`
> does not do what it looks like: `variantId` and `warehouseId` are nullable, and PostgreSQL treats `NULL`s
> as distinct in unique indexes. A product with no variant and no warehouse — the most common case — could
> therefore get **duplicate stock rows**, silently splitting its quantity. Prisma cannot express the fix, so
> the composite unique is replaced by four partial unique indexes in raw SQL.

```prisma
model PosStock {
  id         String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId   String  @db.Uuid
  productId  String  @db.Uuid
  variantId  String? @db.Uuid
  outletId   String  @db.Uuid
  warehouseId String? @db.Uuid
  quantity   Decimal @db.Decimal(12, 3)
  committed  Decimal @db.Decimal(12, 3) @default(0) // Reserved by pending orders
  updatedAt  DateTime @updatedAt

  tenant    Tenant       @relation(fields: [tenantId], references: [id])
  product   PosProduct   @relation(fields: [productId], references: [id])
  variant   PosVariant?  @relation(fields: [variantId], references: [id])
  outlet    PosOutlet    @relation(fields: [outletId], references: [id])
  warehouse PosWarehouse? @relation(fields: [warehouseId], references: [id])

  // Uniqueness enforced by partial indexes in the migration — see below.
  @@index([tenantId, productId])
  @@index([tenantId, outletId])
  @@map("pos_stock")
}
```

Raw SQL appended to the creating migration:

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

Stock rows are created lazily on first movement. Because the upsert target varies by which columns are
null, the stock service selects the matching index explicitly rather than relying on a single Prisma
`upsert` — see 4.2.

```prisma

model PosStockAdjustment {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  productId   String  @db.Uuid
  variantId   String? @db.Uuid
  outletId    String  @db.Uuid
  type        PosAdjustmentType
  quantity    Decimal @db.Decimal(12, 3) // +ve for addition, -ve for reduction
  reason      String
  notes       String?
  performedBy String  @db.Uuid
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, productId])
  @@index([tenantId, outletId, createdAt])
  @@map("pos_stock_adjustments")
}

model PosStockTransfer {
  id              String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String  @db.Uuid
  transferNumber  String
  sourceOutletId  String  @db.Uuid
  destOutletId    String  @db.Uuid
  status          PosTransferStatus @default(DRAFT)
  notes           String?
  createdBy       String  @db.Uuid
  shippedAt       DateTime?
  receivedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  items  PosStockTransferItem[]

  @@unique([tenantId, transferNumber])
  @@map("pos_stock_transfers")
}

model PosStockTransferItem {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  transferId  String  @db.Uuid
  productId   String  @db.Uuid
  variantId   String? @db.Uuid
  sentQty     Decimal @db.Decimal(12, 3)
  receivedQty Decimal? @db.Decimal(12, 3)

  tenant   Tenant           @relation(fields: [tenantId], references: [id])
  transfer PosStockTransfer @relation(fields: [transferId], references: [id])

  @@map("pos_stock_transfer_items")
}

model PosWarehouse {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @db.Uuid
  outletId  String  @db.Uuid
  name      String
  address   String?
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant    @relation(fields: [tenantId], references: [id])
  outlet PosOutlet @relation(fields: [outletId], references: [id])
  stock  PosStock[]

  @@unique([tenantId, name])
  @@map("pos_warehouses")
}

enum PosAdjustmentType {
  DAMAGE
  THEFT
  STOCKTAKE
  GIFT
  RETURN_TO_VENDOR
  RECEIVED
  OTHER
}

enum PosTransferStatus {
  DRAFT
  IN_TRANSIT
  RECEIVED
  CANCELLED
}
```

#### Customer Domain — platform-owned (D4)

> `Customer` and `CustomerGroup` are **not** POS tables. They are owned by the new Customers context at
> `apps/api/src/platform/customers/`, live under a `CUSTOMERS` banner alongside the other platform models,
> and are consumed by POS through `platform/customers/public.ts`. POS never writes them directly — it calls
> `recordPurchase()` on the public contract to roll up the spend statistics.
>
> The loyalty ledger and credit notes stay POS-owned: they are POS concepts, not general CRM ones.

```prisma
model Customer {
  id            String  @id @default(uuid(7)) @db.Uuid
  tenantId      String  @db.Uuid
  code          String           // Auto or manual customer code
  name          String
  phone         String?
  email         String?
  dateOfBirth   DateTime?
  gender        String?
  billingAddress  String?
  shippingAddress String?
  vatNumber     String?          // For B2B customers
  groupId       String? @db.Uuid
  loyaltyPoints Int     @default(0)   // Denormalised balance; ledger is authoritative
  totalSpend    Decimal @db.Decimal(14, 3) @default(0)
  visitCount    Int     @default(0)
  lastVisitAt   DateTime?
  customFields  Json?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant         @relation(fields: [tenantId], references: [id])
  group  CustomerGroup? @relation(fields: [groupId], references: [id])
  sales  PosSale[]
  loyaltyHistory PosLoyaltyTransaction[]
  creditNotes    PosCreditNote[]

  @@unique([tenantId, code])
  @@unique([tenantId, phone])
  @@index([tenantId, name])
  @@map("customers")
}

model CustomerGroup {
  id          String  @id @default(uuid(7)) @db.Uuid
  tenantId    String  @db.Uuid
  name        String
  description String?
  discountPercent Decimal? @db.Decimal(5, 3)
  loyaltyMultiplier Decimal @db.Decimal(5, 3) @default(1)
  createdAt   DateTime @default(now())

  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  customers Customer[]

  @@unique([tenantId, name])
  @@map("customer_groups")
}

model PosLoyaltyTransaction {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  customerId  String  @db.Uuid
  saleId      String? @db.Uuid
  type        PosLoyaltyTransactionType
  points      Int              // +ve for earn, -ve for redeem
  balance     Int              // Running balance after this transaction
  description String?
  expiresAt   DateTime?
  createdAt   DateTime @default(now())

  tenant   Tenant      @relation(fields: [tenantId], references: [id])
  customer Customer   @relation(fields: [customerId], references: [id])

  @@index([tenantId, customerId])
  @@map("pos_loyalty_transactions")
}

model PosCreditNote {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  customerId  String  @db.Uuid
  creditNumber String
  originalAmount Decimal @db.Decimal(12, 3)
  balanceAmount  Decimal @db.Decimal(12, 3)
  reason      String?
  saleId      String? @db.Uuid     // Originating return sale
  expiresAt   DateTime?
  status      PosCreditNoteStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant      @relation(fields: [tenantId], references: [id])
  customer Customer   @relation(fields: [customerId], references: [id])

  @@unique([tenantId, creditNumber])
  @@map("pos_credit_notes")
}

enum PosLoyaltyTransactionType {
  EARNED
  REDEEMED
  ADJUSTED
  EXPIRED
  REVERSED
}

enum PosCreditNoteStatus {
  ACTIVE
  FULLY_REDEEMED
  EXPIRED
  CANCELLED
}
```

#### Purchasing Domain — banner `POS — PURCHASING`

```prisma
model PosVendor {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  name        String
  companyName String?
  phone       String?
  email       String?
  vatNumber       String?
  address     String?
  bankDetails Json?
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant         Tenant             @relation(fields: [tenantId], references: [id])
  purchaseOrders PosPurchaseOrder[]

  @@unique([tenantId, name])
  @@map("pos_vendors")
}

model PosPurchaseOrder {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  poNumber    String
  vendorId    String  @db.Uuid
  outletId    String  @db.Uuid
  status      PosPurchaseOrderStatus @default(DRAFT)
  subtotal    Decimal @db.Decimal(12, 3)
  taxAmount   Decimal @db.Decimal(12, 3) @default(0)
  totalAmount Decimal @db.Decimal(12, 3)
  notes       String?
  expectedDate DateTime?
  createdBy   String  @db.Uuid
  approvedBy  String? @db.Uuid
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant    @relation(fields: [tenantId], references: [id])
  vendor PosVendor @relation(fields: [vendorId], references: [id])
  items  PosPurchaseOrderItem[]

  @@unique([tenantId, poNumber])
  @@map("pos_purchase_orders")
}

model PosPurchaseOrderItem {
  id              String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String  @db.Uuid
  purchaseOrderId String  @db.Uuid
  productId       String  @db.Uuid
  variantId       String? @db.Uuid
  orderedQty      Decimal @db.Decimal(12, 3)
  receivedQty     Decimal @db.Decimal(12, 3) @default(0)
  unitCost        Decimal @db.Decimal(12, 3)
  taxAmount       Decimal @db.Decimal(12, 3) @default(0)
  subtotal        Decimal @db.Decimal(12, 3)

  tenant        Tenant           @relation(fields: [tenantId], references: [id])
  purchaseOrder PosPurchaseOrder @relation(fields: [purchaseOrderId], references: [id])

  @@map("pos_purchase_order_items")
}

enum PosPurchaseOrderStatus {
  DRAFT
  SENT
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}
```

#### Configuration Domain — banner `POS — CONFIGURATION`

```prisma
model PosTaxRate {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @db.Uuid
  name      String           // e.g., "Standard VAT 5%", "Zero-Rated"
  rate      Decimal @db.Decimal(5, 3)
  type      PosTaxType
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())

  tenant Tenant       @relation(fields: [tenantId], references: [id])
  groups PosTaxGroupRate[]

  @@unique([tenantId, name])
  @@map("pos_tax_rates")
}

model PosTaxGroup {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @db.Uuid
  name      String           // e.g., "VAT 5%"
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenantId], references: [id])
  rates    PosTaxGroupRate[]
  products PosProduct[]

  @@unique([tenantId, name])
  @@map("pos_tax_groups")
}

model PosTaxGroupRate {
  id         String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId   String @db.Uuid
  taxGroupId String @db.Uuid
  taxRateId  String @db.Uuid

  tenant   Tenant     @relation(fields: [tenantId], references: [id])
  taxGroup PosTaxGroup @relation(fields: [taxGroupId], references: [id])
  taxRate  PosTaxRate  @relation(fields: [taxRateId], references: [id])

  @@unique([taxGroupId, taxRateId])
  @@map("pos_tax_group_rates")
}

model PosSettings {
  id                    String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId              String  @db.Uuid @unique
  vatNumber                 String?
  vatRegistrationType       String?
  taxInclusive          Boolean @default(true)
  allowNegativeStock    Boolean @default(false)
  autoPrintReceipt      Boolean @default(true)
  defaultPaymentMethod  PosPaymentMethod @default(CASH)
  invoicePrefix         String  @default("INV")
  invoiceNextNumber     Int     @default(1)
  loyaltyEnabled        Boolean @default(false)
  loyaltyPointsPerUnit  Decimal @db.Decimal(8, 3) @default(0) // Points per 1 OMR
  loyaltyRedemptionRate Decimal @db.Decimal(8, 3) @default(0) // OMR per point
  returnWindowDays      Int     @default(7)
  receiptHeader         String?
  receiptFooter         String?
  logoUrl               String?
  updatedAt             DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("pos_settings")
}

model PosPromotion {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String  @db.Uuid
  name          String
  description   String?
  type          PosPromotionType
  discountType  DiscountType
  discountValue Decimal @db.Decimal(12, 3)
  conditions    Json             // { minQty, minAmount, applicableProducts, applicableCategories, daysOfWeek, timeOfDay }
  scope         Json             // { outlets: [], customerGroups: [] }
  startsAt      DateTime
  endsAt        DateTime?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  usages PosPromotionUsage[]
  coupons PosCoupon[]

  @@index([tenantId, isActive, startsAt, endsAt])
  @@map("pos_promotions")
}

// Audit of which promotion actually fired on which sale, and for how much.
// Was present in the ERD but missing from the schema.
model PosPromotionUsage {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  promotionId     String   @db.Uuid
  saleId          String   @db.Uuid
  couponId        String?  @db.Uuid
  discountApplied Decimal  @db.Decimal(12, 3)
  createdAt       DateTime @default(now())

  tenant    Tenant       @relation(fields: [tenantId], references: [id])
  promotion PosPromotion @relation(fields: [promotionId], references: [id])
  sale      PosSale      @relation(fields: [saleId], references: [id])
  coupon    PosCoupon?   @relation(fields: [couponId], references: [id])

  @@index([tenantId, promotionId, createdAt])
  @@map("pos_promotion_usages")
}

// Coupon codes — specified in features §8.4 and flow 10.4, but absent from the
// original schema (PosPromotion had no code, validity window or usage limit).
model PosCoupon {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String   @db.Uuid
  promotionId   String   @db.Uuid          // The discount this code unlocks
  code          String                     // e.g. "SAVE20"
  maxRedemptions Int?                      // null = unlimited
  redemptionCount Int     @default(0)
  perCustomerLimit Int?
  startsAt      DateTime
  endsAt        DateTime?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant     Tenant       @relation(fields: [tenantId], references: [id])
  promotion  PosPromotion @relation(fields: [promotionId], references: [id])
  usages     PosPromotionUsage[]

  @@unique([tenantId, code])
  @@index([tenantId, isActive])
  @@map("pos_coupons")
}

// Multi-format receipt layouts. Present in the ERD, missing from the schema.
model PosReceiptTemplate {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String   @db.Uuid
  outletId  String?  @db.Uuid       // null = tenant-wide default
  name      String
  paperSize PosPaperSize
  layout    Json                    // Field toggles, header/footer, fonts, margins
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant     @relation(fields: [tenantId], references: [id])
  outlet PosOutlet? @relation(fields: [outletId], references: [id])

  @@unique([tenantId, name])
  @@map("pos_receipt_templates")
}

// Restricts an employee to specific outlets (flow 1.3, features §13).
model PosEmployeeOutlet {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId   String   @db.Uuid
  userId     String   @db.Uuid
  outletId   String   @db.Uuid
  assignedAt DateTime @default(now())

  tenant Tenant    @relation(fields: [tenantId], references: [id])
  outlet PosOutlet @relation(fields: [outletId], references: [id])

  @@unique([tenantId, userId, outletId])
  @@index([tenantId, outletId])
  @@map("pos_employee_outlets")
}

// PIN-based cashier quick-switch (features §12.3, flow 17.2).
// Argon2-hashed like every other credential — never a plaintext column on `users`.
model PosCashierPin {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String    @db.Uuid
  userId       String    @db.Uuid
  pinHash      String                       // Argon2
  failedCount  Int       @default(0)
  lockedUntil  DateTime?
  lastUsedAt   DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, userId])
  @@map("pos_cashier_pins")
}

enum PosPaperSize {
  A4
  A5
  THERMAL_58
  THERMAL_80
}

enum PosTaxType {
  VAT
  EXEMPT
  ZERO_RATED
  OUT_OF_SCOPE
}

enum PosPromotionType {
  ITEM_DISCOUNT
  BILL_DISCOUNT
  BUY_X_GET_Y
  QUANTITY_BREAK
  COMBO
}
```

#### Workflow & Forms Domain — banner `POS — WORKFLOWS`

> `PosWorkflowTransition` was in the ERD but missing here — without it there is no definition of which
> state moves are legal, which permission each requires, or what side effects they fire. Added below.

```prisma
model PosWorkflow {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  name        String           // e.g., "Laundry Intake", "Retail Checkout"
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant      Tenant             @relation(fields: [tenantId], references: [id])
  states      PosWorkflowState[]
  transitions PosWorkflowTransition[]
  sales       PosSale[]

  @@unique([tenantId, name])
  @@map("pos_workflows")
}

model PosWorkflowState {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  workflowId  String   @db.Uuid
  name        String           // e.g., "Intake", "Cleaning", "Ready"
  orderIndex  Int
  isInitial   Boolean  @default(false)
  isFinal     Boolean  @default(false)
  formSchemaId String? @db.Uuid // Optional dynamic form for this state

  tenant   Tenant       @relation(fields: [tenantId], references: [id])
  workflow PosWorkflow  @relation(fields: [workflowId], references: [id])
  form     PosFormSchema? @relation(fields: [formSchemaId], references: [id])
  fieldData PosSaleFieldData[]
  salesHere PosSale[]    @relation("SaleCurrentState")
  outgoing  PosWorkflowTransition[] @relation("TransitionFrom")
  incoming  PosWorkflowTransition[] @relation("TransitionTo")

  @@unique([workflowId, name])
  @@map("pos_workflow_states")
}

model PosWorkflowTransition {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId           String   @db.Uuid
  workflowId         String   @db.Uuid
  fromStateId        String   @db.Uuid
  toStateId          String   @db.Uuid
  label              String            // e.g., "Mark as Cleaned"
  requiredPermission String?           // e.g., "pos.order.advance"
  sideEffects        Json?             // [{ type: "SEND_WHATSAPP", template: "order_ready" }]
  createdAt          DateTime @default(now())

  tenant    Tenant           @relation(fields: [tenantId], references: [id])
  workflow  PosWorkflow      @relation(fields: [workflowId], references: [id])
  fromState PosWorkflowState @relation("TransitionFrom", fields: [fromStateId], references: [id])
  toState   PosWorkflowState @relation("TransitionTo", fields: [toStateId], references: [id])

  @@unique([workflowId, fromStateId, toStateId])
  @@map("pos_workflow_transitions")
}

model PosFormSchema {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  name        String
  schema      Json             // JSON Schema for the form fields
  uiSchema    Json?            // UI layout schema (e.g., React JSON Schema Form format)
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
  states PosWorkflowState[]

  @@map("pos_form_schemas")
}

model PosSaleFieldData {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  saleId      String   @db.Uuid
  stateId     String   @db.Uuid
  formData    Json             // The captured data matching the form schema

  tenant Tenant           @relation(fields: [tenantId], references: [id])
  sale   PosSale          @relation(fields: [saleId], references: [id])
  state  PosWorkflowState @relation(fields: [stateId], references: [id])

  @@unique([saleId, stateId])
  @@map("pos_sale_field_data")
}
```

### 3.4 Table Partitioning — deferred (D7.2)

**Ship unpartitioned.** The original plan called for monthly partitions on `pos_sales`, `pos_sale_items`
and `pos_sale_payments`. That is not implementable as written:

- PostgreSQL requires the partition key in every unique constraint. Partitioning `pos_sales` by `createdAt`
  makes `@@unique([tenantId, invoiceNumber])` illegal — and gapless per-tenant invoice numbers are a VAT
  compliance requirement, not a nicety.
- `pos_sale_items`, `pos_sale_payments`, `pos_sale_field_data` and `pos_promotion_usages` all hold foreign
  keys into `pos_sales`; referencing a partitioned table requires the partition key in the referenced key.

The existing precedent supports this reading: `AttendanceEvent` and `FieldLocationPing` are partitioned, and
both are append-only with no inbound foreign keys. Sales are neither.

Instead, index for the access patterns that matter:

```prisma
@@index([tenantId, createdAt])
@@index([tenantId, outletId, createdAt])
@@index([tenantId, customerId])
```

**Revisit when** a single tenant approaches ~10M sale rows or reporting latency targets are missed. At that
point partition the genuinely append-only tables first — `pos_stock_adjustments` and
`pos_loyalty_transactions` — which carry no inbound foreign keys and can be partitioned without redesign.

---

## 4. Backend Implementation

### 4.1 Module Structure

Layering inside every folder follows the governance rule
`presentation -> application -> domain`, with `infrastructure` feeding application. Domain files must not
import NestJS or Prisma.

```
apps/api/src/platform/customers/     → NEW platform context (D4)
├── customers.module.ts
├── public.ts                        → CustomersModule + query/command contracts
├── README.md
├── presentation/customer.controller.ts   → CRUD /customers
├── application/customer.service.ts       → incl. recordPurchase() used by POS
└── infrastructure/customer.repository.ts

apps/api/src/platform/notifications/
└── infrastructure/whatsapp.provider.ts   → NEW adapter behind the existing
                                             notification-provider.port.ts

apps/api/src/products/pos/
├── pos-product.module.ts            → composition root (registered in module-boundaries.json)
├── public.ts                        → the ONLY import surface for other modules
├── README.md                        → required by architecture governance
├── core/
│   ├── core.module.ts
│   ├── sale.controller.ts           → POST /pos/sales, GET /pos/sales/:id
│   ├── sale.service.ts              → Transaction processing, inventory decrement
│   ├── cart.service.ts              → Cart operations, pricing, tax calculation
│   ├── return.controller.ts         → POST /pos/returns
│   ├── return.service.ts            → Return processing, stock increment
│   ├── held-order.controller.ts     → CRUD for held/parked orders
│   └── dto/
│       ├── create-sale.dto.ts
│       ├── sale-item.dto.ts
│       └── process-return.dto.ts
├── catalog/
│   ├── catalog.module.ts
│   ├── product.controller.ts        → CRUD /pos/products
│   ├── product.service.ts
│   ├── category.controller.ts       → CRUD /pos/categories
│   ├── category.service.ts
│   ├── variant.service.ts
│   ├── batch.service.ts
│   ├── product-import.service.ts    → CSV import processing
│   └── dto/
├── register/
│   ├── register.module.ts
│   ├── register.controller.ts       → CRUD /pos/registers
│   ├── session.controller.ts        → Open/Close sessions
│   ├── session.service.ts           → Session management, cash tracking
│   ├── cash-movement.service.ts
│   ├── cashier-pin.service.ts       → Argon2 PIN verify, lockout on repeat failure
│   └── dto/
├── inventory/
│   ├── inventory.module.ts
│   ├── stock.service.ts             → Level reads, atomic decrement/increment
│   ├── adjustment.service.ts        → Manual adjustments, stocktake
│   ├── transfer.service.ts          → Inter-outlet transfers
│   └── dto/
├── payments/
│   ├── payments.module.ts
│   ├── pos-payment-processor.port.ts
│   ├── thawani.processor.ts
│   ├── amwal.processor.ts
│   ├── payment-webhook.controller.ts → Signature + amount verification, idempotent
│   └── dto/
├── loyalty/
│   ├── loyalty.module.ts
│   ├── loyalty.service.ts           → Earn, redeem, reverse, expire
│   ├── credit-note.service.ts
│   └── dto/
├── purchasing/
│   ├── purchasing.module.ts
│   ├── vendor.controller.ts         → CRUD /pos/vendors
│   ├── purchase-order.controller.ts → CRUD /pos/purchase-orders
│   ├── goods-receipt.controller.ts  → POST /pos/goods-receipts
│   ├── purchase-order.service.ts
│   └── dto/
├── promotions/
│   ├── promotions.module.ts
│   ├── promotion.controller.ts      → CRUD /pos/promotions
│   ├── promotion.service.ts
│   ├── promotion-engine.service.ts  → Auto-apply promotions to cart
│   └── dto/
├── reporting/
│   ├── reporting.module.ts
│   ├── sales-report.controller.ts   → GET /pos/reports/sales/*
│   ├── inventory-report.controller.ts
│   ├── financial-report.controller.ts
│   ├── report.service.ts
│   └── dto/
├── configuration/
│   ├── configuration.module.ts
│   ├── settings.controller.ts       → GET/PUT /pos/settings
│   ├── tax.controller.ts            → CRUD /pos/settings/tax
│   ├── outlet.controller.ts         → CRUD /pos/outlets
│   └── dto/
├── workflows/
│   ├── workflows.module.ts
│   ├── workflow.controller.ts       → CRUD /pos/workflows
│   ├── state-machine.service.ts     → Handles order state transitions
│   ├── form-schema.controller.ts    → CRUD /pos/forms
│   └── form-validation.service.ts   → Validates dynamic form submissions
└── workers/
    ├── inventory-sync.worker.ts     → Async inventory recalculation
    ├── report-generation.worker.ts  → Async report generation
    ├── stock-alert.worker.ts        → Low stock notification
    └── loyalty-expiry.worker.ts     → Auto-expire loyalty points
```

### 4.2 Key Business Logic Services

#### Sale Processing (`sale.service.ts`)

```typescript
// Pseudocode for the core sale transaction
async processSale(dto: CreateSaleDto, context: TenantContext): Promise<Sale> {
  return this.prisma.forTenant(context).transaction(async (tx) => {
    // 1. Validate all items have sufficient stock (if trackInventory)
    // 2. Calculate line-item totals (price * qty)
    // 3. Apply line-item discounts
    // 4. Apply bill-level discount
    // 5. Auto-apply matching promotions
    // 6. Calculate tax per line item (based on tax group)
    // 7. Calculate order totals
    // 8. Reserve invoice number under a row lock (see below)
    // 9. Create PosSale record (workflowId/currentStateId if workflow-governed)
    // 10. Create PosSaleItem records — snapshot name, sku, unitPrice, costAtSale, taxRate
    // 11. Create PosSalePayment records; set amountPaid / amountDue
    // 12. Decrement inventory for each item
    // 13. Update customer stats via the Customers public contract (never a direct write)
    // 14. Award loyalty points (if loyalty enabled and customer attached)
    // 15. Write the outbox event 'pos.sale.completed' in the SAME transaction
    // 16. Return completed sale with receipt data
  });
}
```

Steps 9–15 must share one transaction. The outbox write in step 15 is what makes receipt delivery,
low-stock alerts and analytics reliable — publishing to BullMQ directly would drop events on rollback.

#### Invoice Numbering (gapless, per tenant)

VAT compliance requires a gapless sequence per tenant, so this cannot use a bare Postgres sequence (which
skips on rollback) or application-side generation. Reuse the row-lock pattern from the platform
`InvoiceSequence` model:

```typescript
// Inside the sale transaction, before creating the sale
const [seq] = await tx.$queryRaw`
  SELECT "invoiceNextNumber" FROM pos_settings
  WHERE "tenantId" = ${tenantId}::uuid
  FOR UPDATE`;                       // serialises concurrent registers
await tx.posSettings.update({
  where: { tenantId },
  data: { invoiceNextNumber: seq.invoiceNextNumber + 1 },
});
const invoiceNumber = `${prefix}-${String(seq.invoiceNextNumber).padStart(5, '0')}`;
```

This makes concurrent checkouts on different registers contend on one row per tenant. That is intended —
it is the price of a gapless sequence, and the lock is held for milliseconds. Take the lock **late** in the
transaction, after validation and pricing, to keep the critical section short.

#### Inventory Decrement (Atomic)

```typescript
// Atomic decrement. Note: no compound `where` key exists — uniqueness is enforced by
// partial indexes (D7.1), so match on the nullable columns explicitly.
async decrementStock(tx, { tenantId, productId, variantId, outletId, warehouseId, quantity }) {
  const [stock] = await tx.$queryRaw`
    UPDATE pos_stock
       SET quantity = quantity - ${quantity}, "updatedAt" = now()
     WHERE "tenantId" = ${tenantId}::uuid
       AND "productId" = ${productId}::uuid
       AND "outletId" = ${outletId}::uuid
       AND "variantId" IS NOT DISTINCT FROM ${variantId}::uuid
       AND "warehouseId" IS NOT DISTINCT FROM ${warehouseId}::uuid
    RETURNING quantity`;

  if (!stock) throw new StockRowMissingError(productId, outletId);

  // Negative stock check (product setting overrides tenant default)
  if (!allowNegativeStock && stock.quantity.lessThan(0)) {
    throw new InsufficientStockError(productId, stock.quantity.plus(quantity));
  }

  // Immutable audit row
  await tx.posStockAdjustment.create({...});

  // Reorder point → outbox event, not a direct publish
  if (product.reorderPoint != null && stock.quantity.lessThanOrEqualTo(product.reorderPoint)) {
    await this.outbox.write(tx, 'pos.stock.low', { productId, outletId });
  }
}
```

`IS NOT DISTINCT FROM` is what makes the nullable-column match work; `= NULL` would never match. The `UPDATE`
takes a row lock for the duration of the transaction, which is what serialises concurrent sales of the same
product — this is the mitigation for the "inventory race conditions" risk in §16.

Comparisons use `Decimal` methods (`lessThan`, `plus`), never JavaScript `<` or `+` — `quantity` is a
`Decimal(12,3)` and float arithmetic would corrupt it.

### 4.3 BullMQ Workers

New workers to add to the existing `src/worker.ts`:

| Worker | Queue | Purpose |
|---|---|---|
| `PosInventorySyncWorker` | `pos:inventory-sync` | Recalculate stock after batch operations |
| `PosReportWorker` | `pos:reports` | Generate heavy reports asynchronously |
| `PosStockAlertWorker` | `pos:stock-alerts` | Process low-stock notifications |
| `PosLoyaltyExpiryWorker` | `pos:loyalty-expiry` | Expire stale loyalty points |
| `PosProductImportWorker` | `pos:product-import` | Process CSV product imports |
| `PosReceiptDeliveryWorker` | `pos:receipt-delivery` | Render receipt PDF, send via WhatsApp/email |

Recurring work (loyalty expiry, daily summaries, low-stock sweeps) uses **BullMQ repeatable jobs**.
`@nestjs/schedule` is not installed and `@Cron` is not used anywhere in this codebase — do not introduce it
for POS without a separate decision.

### 4.4 SSE Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /pos/register/:id/stream` | Real-time register status updates |
| `GET /pos/inventory/alerts/stream` | Live low-stock and out-of-stock alerts |
| `GET /pos/outlets/:id/sales/stream` | Live sales feed for outlet dashboard |

---

## 5. Frontend Implementation — Tenant POS Dashboard

### 5.1 Route Structure

POS is at the route **root** — `apps/web/src/app/pos/`, not `app/app/pos/` (D1).

```
apps/web/src/app/pos/
├── layout.tsx                      → POS shell: auth, tenant, QueryClientProvider,
│                                     RequireModule('POS'), sidebar
├── page.tsx                        → POS Dashboard (home)
├── billing/
│   └── page.tsx                    → Full-screen POS Register UI
├── products/
│   ├── page.tsx                    → Product listing
│   ├── [id]/page.tsx               → Product detail/edit
│   ├── new/page.tsx                → Add new product
│   ├── categories/page.tsx         → Category management
│   └── import/page.tsx             → CSV import
├── inventory/
│   ├── page.tsx                    → Stock overview
│   ├── adjustments/page.tsx        → Stock adjustments
│   ├── transfers/page.tsx          → Stock transfers
│   └── transfers/[id]/page.tsx     → Transfer detail
├── customers/
│   ├── page.tsx                    → Customer listing
│   ├── [id]/page.tsx               → Customer detail + history
│   ├── new/page.tsx                → Add customer
│   └── groups/page.tsx             → Customer groups
├── orders/
│   ├── page.tsx                    → Sales/transaction history
│   └── [id]/page.tsx               → Order detail + receipt
├── returns/
│   └── page.tsx                    → Returns management
├── purchase-orders/
│   ├── page.tsx                    → PO listing
│   ├── [id]/page.tsx               → PO detail
│   └── new/page.tsx                → Create PO
├── vendors/
│   ├── page.tsx                    → Vendor listing
│   └── [id]/page.tsx               → Vendor detail
├── promotions/
│   ├── page.tsx                    → Promotions listing
│   └── new/page.tsx                → Create promotion
├── loyalty/
│   └── page.tsx                    → Loyalty program config + reports
├── reports/
│   ├── page.tsx                    → Reports dashboard
│   ├── sales/page.tsx              → Sales reports
│   ├── inventory/page.tsx          → Inventory reports
│   ├── customers/page.tsx          → Customer reports
│   └── financial/page.tsx          → Financial reports
├── registers/
│   └── page.tsx                    → Register & session management
├── outlets/
│   ├── page.tsx                    → Outlet listing
│   └── [id]/page.tsx               → Outlet detail
└── settings/
    ├── page.tsx                    → General POS settings
    ├── tax/page.tsx                → Tax / VAT configuration
    ├── receipts/page.tsx           → Receipt template customization
    ├── payments/page.tsx           → Payment method configuration
    ├── hardware/page.tsx           → Hardware setup
    └── barcode/page.tsx            → Barcode generation/printing
```

### 5.2 POS Sidebar Navigation

```typescript
const posSidebarNav = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/pos' },
  { title: 'Billing', icon: ShoppingCart, href: '/pos/billing' },
  {
    title: 'Catalog',
    icon: Package,
    children: [
      { title: 'Products', href: '/pos/products' },
      { title: 'Categories', href: '/pos/products/categories' },
      { title: 'Import', href: '/pos/products/import' },
    ],
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    children: [
      { title: 'Stock Overview', href: '/pos/inventory' },
      { title: 'Adjustments', href: '/pos/inventory/adjustments' },
      { title: 'Transfers', href: '/pos/inventory/transfers' },
    ],
  },
  { title: 'Customers', icon: Users, href: '/pos/customers' },
  { title: 'Orders', icon: ClipboardList, href: '/pos/orders' },
  { title: 'Returns', icon: RotateCcw, href: '/pos/returns' },
  {
    title: 'Purchasing',
    icon: Truck,
    children: [
      { title: 'Purchase Orders', href: '/pos/purchase-orders' },
      { title: 'Vendors', href: '/pos/vendors' },
    ],
  },
  { title: 'Promotions', icon: Tag, href: '/pos/promotions' },
  { title: 'Loyalty', icon: Gift, href: '/pos/loyalty' },
  { title: 'Reports', icon: BarChart3, href: '/pos/reports' },
  { title: 'Registers', icon: Monitor, href: '/pos/registers' },
  { title: 'Outlets', icon: Store, href: '/pos/outlets' },
  {
    title: 'Settings',
    icon: Settings,
    children: [
      { title: 'General', href: '/pos/settings' },
      { title: 'Tax / VAT', href: '/pos/settings/tax' },
      { title: 'Receipts', href: '/pos/settings/receipts' },
      { title: 'Payments', href: '/pos/settings/payments' },
      { title: 'Hardware', href: '/pos/settings/hardware' },
      { title: 'Barcodes', href: '/pos/settings/barcode' },
    ],
  },
];
```

### 5.3 Component Architecture

```
apps/web/src/features/products/pos/
├── core/
│   ├── pos-dashboard-view.tsx
│   ├── sales-summary-card.tsx
│   ├── top-selling-items.tsx
│   ├── low-stock-alerts.tsx
│   ├── revenue-chart.tsx
│   └── active-registers-card.tsx
├── billing/
│   ├── pos-register-view.tsx         → Full-screen POS billing UI
│   ├── product-grid.tsx              → Touch-friendly product tiles
│   ├── product-search-bar.tsx        → Search + barcode input
│   ├── cart-panel.tsx                → Right-side cart
│   ├── cart-item-row.tsx             → Individual cart line item
│   ├── checkout-dialog.tsx           → Payment method selection
│   ├── payment-split-panel.tsx       → Split payment UI
│   ├── held-orders-dialog.tsx        → List of parked orders
│   ├── customer-attach-dialog.tsx    → Attach customer to sale
│   ├── discount-dialog.tsx           → Apply discount
│   └── receipt-preview.tsx           → Post-sale receipt view
├── catalog/
│   ├── product-list-view.tsx
│   ├── product-form.tsx
│   ├── product-detail-view.tsx
│   ├── category-tree-view.tsx
│   ├── variant-editor.tsx
│   ├── product-import-view.tsx
│   └── barcode-print-view.tsx
├── inventory/
│   ├── stock-overview-view.tsx
│   ├── stock-adjustment-form.tsx
│   ├── stock-transfer-form.tsx
│   ├── stock-transfer-receive.tsx
│   └── low-stock-report.tsx
├── customers/
│   ├── customer-list-view.tsx
│   ├── customer-form.tsx
│   ├── customer-detail-view.tsx
│   ├── customer-purchase-history.tsx
│   ├── loyalty-config-view.tsx
│   └── credit-note-list.tsx
├── orders/
│   ├── order-list-view.tsx
│   ├── order-detail-view.tsx
│   └── return-processing-view.tsx
├── purchasing/
│   ├── purchase-order-list.tsx
│   ├── purchase-order-form.tsx
│   ├── goods-receipt-form.tsx
│   └── vendor-list-view.tsx
├── promotions/
│   ├── promotion-list-view.tsx
│   └── promotion-form.tsx
├── reports/
│   ├── report-dashboard.tsx
│   ├── sales-report-view.tsx
│   ├── inventory-report-view.tsx
│   └── financial-report-view.tsx
├── register/
│   ├── register-list-view.tsx
│   ├── session-open-dialog.tsx
│   ├── session-close-dialog.tsx
│   └── cash-movement-dialog.tsx
└── settings/
    ├── pos-general-settings.tsx
    ├── tax-configuration-view.tsx
    ├── receipt-template-editor.tsx
    ├── payment-config-view.tsx
    └── hardware-setup-view.tsx
```

---

## 6. Frontend Implementation — Platform Admin POS

### 6.1 Route Structure

Platform admin lives under the existing platform tree at `apps/web/src/app/platform/` — **not**
`app/app/platform/`, which does not exist.

```
apps/web/src/app/platform/pos/
├── page.tsx                      → POS module dashboard (overview across tenants)
├── tenants/
│   └── page.tsx                  → Tenant POS subscription management
├── plans/
│   ├── page.tsx                  → POS plan management
│   └── [id]/page.tsx             → Plan detail/edit
├── features/
│   └── page.tsx                  → Feature flag management
└── analytics/
    └── page.tsx                  → Platform-wide POS analytics
```

### 6.2 Platform Admin Features
- View all tenants with POS enabled
- Manage POS subscription plans and feature limits
- Global POS feature flags (enable/disable features across platform)
- Platform-wide POS analytics (total transactions, revenue, active registers)
- Tenant POS health monitoring

> **Scope note (D6).** Most of this is *configuration of existing machinery*, not new construction.
> Enabling POS for a tenant is a `TenantModule` row; plan tiers are `SubscriptionPlanCapability` rows;
> per-tenant exceptions are `TenantCapabilityOverride` rows; feature flags are capability `availability`
> values. The existing platform module-management screens already edit these. Budget these pages as
> *POS-specific views over existing endpoints*, and drop the "POS plan/feature gating" line item from
> Sprint POS-7 down to seed data plus a filtered view.
>
> The only genuinely new work here is the **monthly transaction counter** needed to enforce the Free-tier
> cap in feature spec §24.2 — nothing currently counts sales per tenant per month.

---

## 7. Frontend Implementation — POS Billing Register

The billing register is the most critical UI component. It must be **fast**, **responsive**, and **optimized for both keyboard and touch input**.

### 7.1 Layout Design

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔍 Search / Scan Barcode          │  Customer: Walk-in  │  ☰ Menu │
├─────────────────────────────────────┼───────────────────────────────┤
│                                     │                               │
│   ┌──────┐ ┌──────┐ ┌──────┐      │  CART                          │
│   │ Prod │ │ Prod │ │ Prod │      │  ┌─────────────────────────┐   │
│   │  A   │ │  B   │ │  C   │      │  │ Product A    1 × 5.000OMR │   │
│   │ 5.000│ │ 3.000│ │ 1.500│      │  │ Product B    2 × 3.000OMR │   │
│   └──────┘ └──────┘ └──────┘      │  │ Product D    1 × 7.500OMR │   │
│   ┌──────┐ ┌──────┐ ┌──────┐      │  └─────────────────────────┘   │
│   │ Prod │ │ Prod │ │ Prod │      │                               │
│   │  D   │ │  E   │ │  F   │      │  Subtotal:        18.500 OMR │
│   │ 7.500│ │ 2.000│ │ 4.500│      │  Discount:          -0.500 OMR│
│   └──────┘ └──────┘ └──────┘      │  Tax (VAT 5%):     0.900 OMR │
│                                     │  ────────────────────────     │
│   [All] [Food] [Drinks] [Snacks]   │  TOTAL:           18.900 OMR │
│                                     │                               │
│                                     │  ┌──────────────────────────┐ │
│                                     │  │    💳 PAY 18.900 OMR     │ │
│                                     │  └──────────────────────────┘ │
│                                     │  [Hold] [Discount] [Customer] │
└─────────────────────────────────────┴───────────────────────────────┘
```

### 7.2 Key UI Behaviors

1. **Auto-focus search bar** — cursor always returns to search after item added
2. **Barcode scan** — instant item add on scan (no Enter key needed for scanners in suffix mode)
3. **Keyboard shortcuts** — this table is the single source of truth; `POS-USER-FLOWS.md` follows it:

   | Key | Action |
   |---|---|
   | `F1` | Open / close session |
   | `F2` | Customer search |
   | `F3` | Hold order |
   | `F4` | Recall held order |
   | `F5` | Apply discount |
   | `F8` | Process payment |
   | `F9` | Print last receipt |
   | `Esc` | Clear search / cancel dialog |
   | `+` / `-` | Increment / decrement quantity of selected item |
   | `Del` | Remove selected item |
4. **Touch-optimized** — large touch targets, swipe to delete, pinch for product grid
5. **Sound effects** — beep on scan success, error sound on invalid scan

### 7.3 State Management (Zustand)

```typescript
// POS Register Store
interface PosRegisterStore {
  // Cart state
  cart: CartItem[];
  customer: Customer | null;
  salesperson: Employee | null;
  orderType: PosOrderType;
  billDiscount: { type: DiscountType; value: number } | null;
  
  // Session state
  currentSession: PosSession | null;
  register: PosRegister | null;
  
  // Held orders
  heldOrders: HeldOrder[];
  
  // Actions
  addItem: (product: PosProduct, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyItemDiscount: (itemId: string, discount: Discount) => void;
  applyBillDiscount: (discount: Discount) => void;
  setCustomer: (customer: Customer | null) => void;
  holdOrder: () => void;
  recallOrder: (orderId: string) => void;
  clearCart: () => void;
  
  // Computed
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  grandTotal: number;
}
```

---

## 8. Mobile POS Implementation

### 8.1 Feature Structure

```
apps/mobile/lib/features/pos/
├── data/
│   ├── models/
│   │   ├── pos_product.dart
│   │   ├── pos_sale.dart
│   │   ├── pos_cart.dart
│   │   └── pos_customer.dart
│   └── repositories/
│       ├── pos_product_repository.dart
│       ├── pos_sale_repository.dart
│       └── pos_inventory_repository.dart
├── domain/
│   ├── entities/
│   └── usecases/
│       ├── process_sale.dart
│       ├── search_product.dart
│       └── sync_offline_sales.dart
├── presentation/
│   ├── providers/
│   │   ├── pos_cart_provider.dart
│   │   ├── pos_product_provider.dart
│   │   └── pos_sync_provider.dart
│   ├── screens/
│   │   ├── pos_billing_screen.dart
│   │   ├── pos_product_search_screen.dart
│   │   ├── pos_checkout_screen.dart
│   │   ├── pos_receipt_screen.dart
│   │   ├── pos_inventory_screen.dart
│   │   └── pos_reports_screen.dart
│   └── widgets/
│       ├── product_tile.dart
│       ├── cart_list.dart
│       ├── payment_selector.dart
│       └── barcode_scanner.dart
```

### 8.2 Offline-First Architecture

```
┌──────────────────────────────────┐
│        Flutter POS App           │
├──────────────────────────────────┤
│  Presentation Layer (Riverpod)   │
├──────────────────────────────────┤
│  Domain Layer (Use Cases)        │
├──────────────────────────────────┤
│  Data Layer                      │
│  ┌──────────┐  ┌──────────────┐ │
│  │ Isar DB  │  │ Dio API      │ │
│  │ (Local)  │  │ (Remote)     │ │
│  └──────────┘  └──────────────┘ │
│       ↑                ↑        │
│       └── SyncManager ─┘        │
│           (Workmanager)          │
└──────────────────────────────────┘
```

- Products catalog cached in Isar for offline access
- Sales created locally first, then synced
- Inventory levels cached but flagged as "may be stale" when offline
- Background sync via Workmanager when connectivity returns

---

## 9. Payment Integration

### 9.1 Payment Architecture

POS checkout payments live in `products/pos/payments/` and mirror the port shape already proven by
platform billing (`platform/billing/infrastructure/payment-provider.port.ts`). They are a **separate
implementation with separate tables** — subscription billing and customer checkout are different bounded
contexts that happen to share an interface shape.

```typescript
// Payment processor interface (products/pos/payments/)
interface PosPaymentProcessor {
  name: string;
  processPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
}

// Implementations — Oman market only
class ThawaniPayProcessor implements PosPaymentProcessor { ... }
class AmwalPayProcessor implements PosPaymentProcessor { ... }
class CashProcessor implements PosPaymentProcessor { ... }
```

Amounts are `Decimal(12,3)` end to end. Never convert to `number` for a payment call — Thawani takes
integer baisa (1 OMR = 1000 baisa), so convert with integer arithmetic at the adapter boundary.

### 9.2 Hosted Payment / QR Flow (Thawani & Amwal)

1. POS generates a payment request for the sale total
2. Backend creates the gateway session:
   - **Thawani** — `POST /api/v1/checkout/session`, authenticated with the tenant's secret key
   - **Amwal** — `POST /MerchantOrder/CreatePaymentLink`, signed with `secureHashValue`
3. QR code / payment link displayed on the POS screen (and customer-facing display)
4. Customer scans and pays
5. Gateway webhook confirms payment — **verify signature and amount before trusting it**, and persist the
   receipt for idempotent replay (the `BillingWebhookReceipt` pattern)
6. POS auto-completes the sale

The sale is only marked `COMPLETED` on confirmed payment. If the webhook has not arrived when the cashier
needs to move on, the sale stays `OPEN` with `amountDue` outstanding and reconciles when the webhook lands.

---

## 10. Hardware Integration

### 10.1 Web Hardware Access

| Hardware | API | Approach |
|---|---|---|
| Barcode Scanner | HID Keyboard Emulation | Listen for rapid keystrokes, detect as scan |
| Thermal Printer | Web Serial API / Cloud Print | Direct serial or print via browser |
| Cash Drawer | Via Printer Kick Command | ESC/POS command sent through printer |
| Weighing Scale | Web Serial API | Read weight data from serial port |
| Customer Display | Secondary Window/Screen | Open window on second monitor |

### 10.2 ESC/POS Printing

```typescript
// Receipt printing service
class ReceiptPrinterService {
  async printReceipt(sale: PosSale, template: ReceiptTemplate): Promise<void> {
    const commands = new EscPosEncoder()
      .initialize()
      .align('center')
      .image(template.logo)
      .text(template.businessName)
      .text(template.address)
      .line('─')
      .align('left')
      .text(`Invoice: ${sale.invoiceNumber}`)
      .text(`Date: ${format(sale.createdAt, 'dd/MM/yyyy HH:mm')}`)
      .text(`Cashier: ${sale.cashier.name}`)
      .line('─')
      // ... item lines
      .line('═')
      .bold(true)
      .text(`TOTAL: ${sale.netAmount} OMR`)
      .bold(false)
      .line('─')
      .align('center')
      .text(template.footer)
      .cut()
      .encode();

    await this.serialPort.write(commands);
  }
}
```

---

## 11. Offline Mode Architecture

### 11.1 Data Sync Strategy

| Data | Direction | Sync Frequency | Strategy |
|---|---|---|---|
| Products | Server → Client | On login + hourly poll | Full catalog cached locally |
| Stock Levels | Server → Client | On login + every 5 min | Incremental sync |
| Sales (new) | Client → Server | Real-time (or on reconnect) | Append-only queue |
| Customers | Bidirectional | On login + on change | Last-write-wins |
| Sessions | Client → Server | On close | Full sync |
| Held Orders | Local only | N/A | IndexedDB/Isar only |

### 11.2 Conflict Resolution

- **Stock conflicts**: If offline sale decremented item below 0 (and negative stock not allowed), flag for manager review
- **Invoice numbers**: Use UUID-based temporary IDs, server assigns sequential numbers on sync
- **Price changes**: Offline sales use cached price; server validates and flags discrepancies

---

## 12. Real-Time Features

### 12.1 SSE Streams

| Stream | Events | Consumers |
|---|---|---|
| Register Stream | session_opened, session_closed, sale_completed | Dashboard, register management |
| Inventory Stream | stock_low, stock_out, stock_received | Dashboard, POS register alerts |
| Sales Stream | new_sale, sale_voided, return_processed | Dashboard, live sales feed |

### 12.2 Event Bus (BullMQ)

| Event | Trigger | Actions |
|---|---|---|
| `pos.sale.completed` | Sale processed | Update customer stats, award loyalty, update stock alerts |
| `pos.stock.low` | Stock below reorder | Send notification, suggest PO creation |
| `pos.stock.out` | Stock reaches 0 | Alert all registers, disable item in POS |
| `pos.return.processed` | Return completed | Update stock, reverse loyalty points |
| `pos.session.closed` | Session ended | Generate shift report, reconcile cash |

---

## 13. Testing Strategy

### 13.1 Unit Tests

| Module | Test Focus | Framework |
|---|---|---|
| Cart Service | Pricing, tax calculation, discount application | Jest |
| Sale Service | Transaction integrity, stock decrement | Jest + Testcontainers |
| Promotion Engine | Promotion matching, discount computation | Jest |
| Loyalty Service | Points earning, redemption, expiry | Jest |
| Stock Service | Adjustments, transfers, reorder alerts | Jest |

### 13.2 E2E Tests

| Scenario | Coverage |
|---|---|
| Complete sale flow | Add items → apply discount → checkout → receipt |
| Return flow | Find sale → select items → process return → credit note |
| Session flow | Open session → process sales → cash movement → close session |
| Multi-register | Concurrent sessions on different registers |
| Offline sale | Process sale offline → reconnect → verify sync |

### 13.3 Load Tests (k6)

| Test | Target | Scenario |
|---|---|---|
| `pos-sale.js` | Sale processing throughput | 100 concurrent sales per minute |
| `pos-search.js` | Product search latency | 1000 search queries per minute |
| `pos-inventory.js` | Inventory query performance | 500 stock checks per minute |
| `pos-reports.js` | Report generation under load | 50 concurrent report requests |

---

## 14. Sprint Breakdown

> Effort figures carried over from the original draft have **not** been re-estimated wholesale, but three
> line items were corrected where the audit showed the work was already done by existing platform
> machinery — POS permissions (3d → 1d, it is seed data not a rules engine) and POS plan/feature gating
> (Sprint POS-7) — and foundation tasks the original plan omitted have been added to Sprint POS-1
> (architecture registration, the Customers context, RLS policies, invoice sequencing).

### Sprint POS-1: Foundation (4 weeks)

**Goal**: Basic product catalog and billing functionality

| Task | Effort | Priority |
|---|---|---|
| **Register POS in `module-boundaries.json` + `TABLE-OWNERSHIP.md`; scaffold composition root, `public.ts`, README, architecture self-test** | 1d | P0 |
| **Platform `Customer` / `CustomerGroup` context + public contract (D4)** | 3d | P0 |
| Database schema — POS models appended to `schema.prisma` under banners | 3d | P0 |
| Prisma migrations incl. RLS policies + grants for every POS table | 2d | P0 |
| `pos_stock` partial unique indexes (raw SQL, D7.1) | 0.5d | P0 |
| Seed: `POS` module, capabilities, permissions, default roles, Oman VAT rates | 1d | P0 |
| Product CRUD API (controller, service, DTOs) | 3d | P0 |
| Category CRUD API | 2d | P0 |
| Product variant support | 2d | P0 |
| Outlet and Register CRUD API | 2d | P0 |
| Basic POS billing API (create sale, cart logic) | 4d | P0 |
| Invoice number sequence (row-locked, gapless) | 1d | P0 |
| Tax calculation engine (Oman VAT) | 3d | P0 |
| Web: add `@tanstack/react-query` + `react-hook-form`, POS root layout + providers (D3) | 1d | P0 |
| Web: POS sidebar layout + navigation | 2d | P0 |
| Web: Product list + create/edit pages | 3d | P0 |
| Web: Category management page | 1d | P0 |
| Web: POS Register billing screen (MVP) | 5d | P0 |
| Web: Checkout flow + cash payment | 2d | P0 |
| Receipt generation (text-based) | 2d | P1 |
| Product CSV import | 2d | P1 |

### Sprint POS-2: Inventory & Customers (4 weeks)

**Goal**: Full inventory management, customer management, and enhanced billing

| Task | Effort | Priority |
|---|---|---|
| Stock tracking service (real-time levels) | 3d | P0 |
| Stock adjustment API + UI | 2d | P0 |
| Stock transfer API + workflow | 3d | P0 |
| Reorder point alerts | 2d | P0 |
| Customer CRUD API | 2d | P0 |
| Customer group management | 1d | P0 |
| Customer attachment at POS | 1d | P0 |
| Hold/recall orders at POS | 2d | P0 |
| Multiple payment methods (Thawani, Amwal, card) | 3d | P1 |
| Split payment support | 2d | P1 |
| Web: Inventory overview page | 2d | P0 |
| Web: Stock adjustment page | 1d | P0 |
| Web: Stock transfer page | 2d | P0 |
| Web: Customer list + detail pages | 2d | P0 |
| Web: Enhanced POS register (search, categories) | 3d | P0 |
| Session management (open/close) | 2d | P0 |
| Cash in/out tracking | 1d | P0 |

### Sprint POS-3: Returns, Roles & Promotions (4 weeks)

**Goal**: Returns/refunds, role-based access, discounts/promotions

| Task | Effort | Priority |
|---|---|---|
| Return processing API | 3d | P0 |
| Credit note system | 2d | P0 |
| Exchange workflow | 2d | P1 |
| POS permission keys + seed + role grants | 1d | P0 |
| POS roles (Cashier, Store Manager) | 2d | P0 |
| Discount engine (item-level, bill-level) | 3d | P0 |
| Promotion engine (scheduled, conditional) | 4d | P1 |
| Coupon code system | 2d | P1 |
| Barcode generation and printing | 2d | P1 |
| Web: Returns processing page | 2d | P0 |
| Web: Credit note management | 1d | P0 |
| Web: Promotion CRUD pages | 2d | P1 |
| Web: Barcode print page | 1d | P1 |
| Web: Role-based POS UI restrictions | 2d | P0 |

### Sprint POS-4: Multi-Store, Loyalty & Purchasing (4 weeks)

**Goal**: Multi-outlet support, loyalty program, vendor/PO management

| Task | Effort | Priority |
|---|---|---|
| Multi-outlet data scoping | 3d | P0 |
| Outlet-specific stock and pricing | 2d | P0 |
| Loyalty program engine | 4d | P1 |
| Loyalty points earn/redeem at POS | 2d | P1 |
| Vendor CRUD API | 2d | P1 |
| Purchase order workflow API | 4d | P1 |
| Goods receipt processing | 2d | P1 |
| Web: Outlet management pages | 2d | P0 |
| Web: Loyalty configuration page | 2d | P1 |
| Web: Vendor management pages | 2d | P1 |
| Web: Purchase order pages | 3d | P1 |
| Web: Goods receipt page | 2d | P1 |

### Sprint POS-5: Reports, Analytics & Polish (4 weeks)

**Goal**: Comprehensive reporting, analytics dashboard, UX polish

| Task | Effort | Priority |
|---|---|---|
| Sales reports API (by item, category, customer, time) | 4d | P0 |
| Inventory reports API | 2d | P0 |
| Financial reports API (P&L, tax) | 3d | P0 |
| Employee/session reports | 2d | P0 |
| Report scheduling (email) | 2d | P1 |
| Web: POS Dashboard with widgets and charts | 4d | P0 |
| Web: Reports pages (all report types) | 4d | P0 |
| Web: Report export (PDF, CSV) | 2d | P0 |
| POS billing UI polish and keyboard shortcuts | 3d | P0 |
| Performance optimization (query tuning, caching) | 3d | P0 |

### Sprint POS-6: Offline Mode, Hardware & Mobile (4 weeks)

**Goal**: Offline support, hardware integration, mobile POS MVP

| Task | Effort | Priority |
|---|---|---|
| Web: Offline billing (IndexedDB + Service Worker) | 5d | P1 |
| Offline sync engine | 4d | P1 |
| Thermal receipt printer integration (Web Serial) | 3d | P1 |
| Barcode scanner integration (HID) | 1d | P1 |
| Cash drawer integration | 1d | P2 |
| Mobile: POS billing screen | 5d | P2 |
| Mobile: Product search + barcode scan | 3d | P2 |
| Mobile: Offline billing with Isar | 4d | P2 |
| Mobile: Stock check | 2d | P2 |
| Load testing (k6 suite) | 3d | P1 |
| Security audit | 2d | P0 |

### Sprint POS-7: Online Store, Integrations & GA (4 weeks)

**Goal**: Online ordering, payment gateway integration, general availability

| Task | Effort | Priority |
|---|---|---|
| Online store / mobile store | 5d | P2 |
| Payment gateway integration (Thawani + Amwal) | 4d | P1 |
| Hosted payment link / QR generation | 2d | P1 |
| Platform admin POS views (over existing module/capability endpoints) | 2d | P0 |
| POS plan/feature gating — capability + limit seed data (D6) | 1d | P0 |
| Monthly transaction counter for Free-tier cap enforcement | 2d | P0 |
| E-commerce sync (Shopify) | 4d | P3 |
| WhatsApp receipt sharing | 2d | P2 |
| API documentation (OpenAPI) | 2d | P1 |
| End-to-end testing | 3d | P0 |
| Production deployment prep | 2d | P0 |

---

## 15. Deployment Considerations

### 15.1 Database Migrations

- POS models are appended to the single `apps/api/prisma/schema.prisma` (D2). Existing tables are untouched;
  the only additions to the platform block are `Customer` and `CustomerGroup` (D4)
- **RLS is mandatory for every new POS table** — the creating migration must add the `tenant_isolation`
  policy (`TO app_user`) and the `platform_access` policy (`TO platform_runtime`), plus the matching
  `GRANT`s, following the pattern in `20260719151000_product_catalog_rls`
- `pos_stock` partial unique indexes require raw SQL in the migration (D7.1)
- No partitioning at launch (D7.2)
- Seed script must create default POS data (tax rates, settings) for existing tenants

### 15.2 Performance Targets

| Operation | Target Latency | Notes |
|---|---|---|
| Product search | < 50ms | Indexed by name, SKU, barcode |
| Add to cart | < 20ms | Client-side, no API call |
| Process sale | < 500ms | Full transaction including stock update |
| Generate receipt | < 200ms | Including print command |
| Dashboard load | < 1s | Aggregate queries with caching |
| Report generation | < 5s | Complex queries, potentially async |

### 15.3 Caching Strategy

| Data | Cache | TTL | Invalidation |
|---|---|---|---|
| Product catalog | Redis | 5 min | On product update event |
| Tax rates | Redis | 1 hour | On settings change |
| Stock levels | Redis | 30 sec | On sale / adjustment — **read-through cache only**; never satisfy the negative-stock check from cache, always re-read inside the sale transaction |
| Dashboard metrics | Redis | 1 min | On sale event |
| Report data | Redis | 5 min | On manual refresh |

---

## 16. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inventory race conditions (concurrent sales) | High | High | Atomic Prisma operations + database-level locks |
| Offline sync conflicts | Medium | Medium | Conflict resolution strategy + manual review queue |
| Invoice number duplication | Medium | High | Database sequence + UUID fallback for offline |
| Payment gateway failures | Medium | High | Retry logic + manual payment recording fallback |
| Thermal printer compatibility | Medium | Low | ESC/POS standard + vendor-specific drivers |
| Performance under high transaction volume | Medium | Medium | Table partitioning + query optimization + caching |
| Oman VAT regulation changes | Low | Medium | Configurable tax engine, not hardcoded |
| Multi-store stock inconsistency | Medium | Medium | Eventual consistency model + reconciliation reports |

---

## Appendix: OpenAPI Contract Examples

### POST `/pos/sales`

All monetary values are OMR strings with exactly 3 decimal places. They are serialised as **strings**, not
JSON numbers, so that `Decimal(12,3)` precision survives the wire.

```json
{
  "outletId": "uuid",
  "registerId": "uuid",
  "sessionId": "uuid",
  "customerId": "uuid | null",
  "salespersonId": "uuid | null",
  "workflowId": "uuid | null",
  "orderType": "WALK_IN",
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid | null",
      "quantity": "2.000",
      "unitPrice": "5.000",
      "discount": { "type": "PERCENTAGE", "value": "10.000" },
      "notes": "Gift wrap"
    }
  ],
  "discount": { "type": "FIXED_AMOUNT", "value": "0.500" },
  "payments": [
    { "method": "CASH", "amount": "6.000", "changeAmount": "1.550" },
    { "method": "THAWANI", "amount": "3.000", "gatewayTransactionId": "chk_9f2a1c" }
  ],
  "notes": "Regular customer"
}
```

### Response

```json
{
  "id": "uuid",
  "invoiceNumber": "INV-000042",
  "status": "COMPLETED",
  "workflowId": null,
  "currentStateId": null,
  "subtotal": "10.000",
  "discountAmount": "1.500",
  "taxAmount": "0.425",
  "totalAmount": "8.925",
  "roundOffAmount": "0.000",
  "netAmount": "8.925",
  "amountPaid": "8.925",
  "amountDue": "0.000",
  "items": [...],
  "payments": [...],
  "customer": {...},
  "loyaltyPointsEarned": 10,
  "createdAt": "2026-07-26T14:00:00Z"
}
```
