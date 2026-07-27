# DeltCRM POS — Implementation Plan

> Detailed technical implementation plan for integrating a Point of Sale system into the DeltCRM platform, modeled after Zoho POS (Zakya).

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
│  apps/api/src/shared/                                               │
│  ├── customers/           ← NEW: Shared Customer Module             │
│  ├── inventory/           ← NEW: Shared Inventory Module            │
│  ├── payments/            ← NEW: Shared Payment Module              │
│  ├── messaging/           ← NEW: Shared Messaging (WhatsApp) Module │
│  └── forms/               ← NEW: Shared Dynamic Forms Module        │
│                                                                     │
│  apps/api/src/products/                                             │
│  ├── attendance/          ← Existing Attendance Product Module      │
│  └── pos/                 ← NEW: POS Product Module                 │
│      ├── core/            ← Orders, billing, cart, checkout         │
│      ├── catalog/         ← Products, categories, variants          │
│      ├── register/        ← Registers, sessions, cash management    │
│      ├── purchasing/      ← Purchase orders, vendors, goods receipt │
│      ├── promotions/      ← Discounts, coupons, promotions          │
│      ├── reporting/       ← Sales, inventory, financial reports     │
│      ├── configuration/   ← POS settings, tax, receipts, hardware   │
│      ├── workflows/       ← NEW: Dynamic order states & transitions │
│      └── storefront/      ← Online store, omnichannel               │
│                                                                     │
│  apps/web/src/                                                      │
│  ├── app/app/attendance/  ← Existing attendance routes              │
│  ├── app/pos/             ← NEW: Tenant POS Dashboard (/pos/*)      │
│  ├── app/pos/register/    ← NEW: Full-screen POS Billing UI         │
│  └── app/platform/pos/    ← NEW: Platform Admin POS Management      │
│                                                                     │
│  apps/mobile/lib/features/                                          │
│  ├── attendance/          ← Existing attendance features            │
│  └── pos/                 ← NEW: Mobile POS features                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Backend Module | NestJS module under `src/products/pos/` | Follows existing DDD modular monolith pattern |
| Database | Prisma schema files in `prisma/schema/pos-*.prisma` | Follows existing split-schema convention |
| Multi-tenancy | Same RLS + Prisma Extensions approach | Consistent with existing tenant isolation |
| Real-time | SSE for live register updates, inventory alerts | Proven pattern from field-tracking module |
| Queue/Jobs | BullMQ workers for async tasks | Inventory recalculation, report generation, sync |
| Offline | IndexedDB (web) + Isar (mobile) with background sync | Aligns with mobile offline-first architecture |
| Hardware | Web Serial API + WebUSB for direct hardware | Browser-native APIs, no plugins needed |
| Payments | Amwal Pay + Thawani Pay SDKs/APIs | Local Omani payment integrations required |
| Forms & UI | JSON Schema + Zod Validation + Dynamic Renderers | Supports custom workflow data capture across tenants |

### 1.3 Routing Architecture

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
| `/pos/settings/tax` | Tax/VAT configuration | POS sidebar layout |
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
| **Authentication** | JWT + Argon2 + CASL | Same auth system, POS-specific permissions added |
| **Multi-tenancy** | RLS + Prisma Extensions | Same tenant isolation, POS data tenant-scoped |
| **Employee/User** | `User`, `Employee`, `Role` | POS roles (Cashier, Store Manager) extend existing role system |
| **Billing/Plans** | `SubscriptionPlan`, `TenantPlan` | POS added as a new module in the plan system |
| **Audit** | `AuditModule` | POS transactions logged to existing audit trail |
| **Notifications** | `NotificationsModule` | POS alerts (low stock, etc.) use existing notification channels |
| **File Storage** | Wasabi + Cloudflare CDN | Product images, receipt PDFs (compressed via Sharp) |
| **Queue/Workers** | BullMQ | POS-specific workers added to existing worker process |

### 2.2 New Permissions for POS

```typescript
// POS-specific permissions to add to the CASL permission system
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
  'pos.loyalty.manage': 'Manage loyalty program',
};
```

### 2.3 Module Registration

The POS module will be registered in the existing Module Catalog system:

```typescript
// In the platform module catalog
{
  key: 'pos',
  name: 'Point of Sale',
  description: 'Retail POS billing, inventory, and customer management',
  icon: 'ShoppingCart',
  category: 'products',
  subModules: [
    { key: 'pos.billing', name: 'Billing & Checkout' },
    { key: 'pos.inventory', name: 'Inventory Management' },
    { key: 'pos.customers', name: 'Customer Management' },
    { key: 'pos.purchasing', name: 'Purchase Orders' },
    { key: 'pos.reporting', name: 'Reports & Analytics' },
    { key: 'pos.loyalty', name: 'Loyalty Program' },
    { key: 'pos.online-store', name: 'Online Store' },
  ],
}
```

---

## 3. Database Schema Design

### 3.1 Schema File Organization

Following the existing convention of split Prisma schema files:

```
apps/api/prisma/schema/
├── attendance.prisma      ← Existing
├── auth.prisma             ← Existing
├── employee.prisma         ← Existing
├── ...
├── pos-catalog.prisma      ← NEW: Products, Categories, Variants
├── pos-inventory.prisma    ← NEW: Stock, Adjustments, Transfers
├── pos-sales.prisma        ← NEW: Orders, OrderItems, Payments
├── pos-customers.prisma    ← NEW: POS Customers, Loyalty, CreditNotes
├── pos-register.prisma     ← NEW: Registers, Sessions, CashMovements
├── pos-purchasing.prisma   ← NEW: PurchaseOrders, Vendors, GoodsReceipt
├── pos-promotions.prisma   ← NEW: Discounts, Coupons, Promotions
├── pos-config.prisma       ← NEW: POS Settings, TaxRates, ReceiptTemplates
└── pos-workflows.prisma    ← NEW: Order State Machines, Form Schemas
```

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

#### Catalog Domain (`pos-catalog.prisma`)

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

#### Sales Domain (`pos-sales.prisma`)

```prisma
model PosSale {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String    @db.Uuid
  outletId        String    @db.Uuid
  registerId      String    @db.Uuid
  sessionId       String    @db.Uuid
  invoiceNumber   String              // Auto-generated, sequential
  customerId      String?   @db.Uuid
  salespersonId   String?   @db.Uuid
  orderType       PosOrderType @default(WALK_IN)
  status          PosSaleStatus @default(COMPLETED)
  subtotal        Decimal   @db.Decimal(12, 3)
  discountAmount  Decimal   @db.Decimal(12, 3) @default(0)
  discountType    DiscountType?
  discountValue   Decimal?  @db.Decimal(12, 3)
  taxAmount       Decimal   @db.Decimal(12, 3) @default(0)
  totalAmount     Decimal   @db.Decimal(12, 3)
  roundOffAmount  Decimal   @db.Decimal(8, 3) @default(0)
  netAmount       Decimal   @db.Decimal(12, 3)  // totalAmount + roundOff
  notes           String?
  isReturn        Boolean   @default(false)
  originalSaleId  String?   @db.Uuid          // For return transactions
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant      Tenant          @relation(fields: [tenantId], references: [id])
  outlet      PosOutlet       @relation(fields: [outletId], references: [id])
  register    PosRegister     @relation(fields: [registerId], references: [id])
  session     PosSession      @relation(fields: [sessionId], references: [id])
  customer    PosCustomer?    @relation(fields: [customerId], references: [id])
  items       PosSaleItem[]
  payments    PosSalePayment[]
  originalSale PosSale?       @relation("SaleReturn", fields: [originalSaleId], references: [id])
  returns      PosSale[]      @relation("SaleReturn")

  @@unique([tenantId, invoiceNumber])
  @@index([tenantId, outletId, createdAt])
  @@index([tenantId, customerId])
  @@index([tenantId, createdAt])
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
  discountAmount Decimal @db.Decimal(12, 3) @default(0)
  taxAmount     Decimal @db.Decimal(12, 3) @default(0)
  taxGroupId    String? @db.Uuid
  subtotal      Decimal @db.Decimal(12, 3)  // (unitPrice * quantity) - discount
  total         Decimal @db.Decimal(12, 3)  // subtotal + tax
  notes         String?
  isReturned    Boolean @default(false)
  returnQuantity Decimal? @db.Decimal(10, 3)

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
  referenceNumber String?         // Card auth code, UPI ref, cheque number
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
  DRAFT        // Held/parked order
  COMPLETED
  VOIDED
  RETURNED
  PARTIALLY_RETURNED
}

enum PosPaymentMethod {
  CASH
  CREDIT_CARD
  DEBIT_CARD
  UPI
  MOBILE_WALLET
  BANK_TRANSFER
  CHEQUE
  CREDIT_NOTE
  LOYALTY_POINTS
  CUSTOM
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}
```

#### Register Domain (`pos-register.prisma`)

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

#### Inventory Domain (`pos-inventory.prisma`)

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

  @@unique([tenantId, productId, variantId, outletId, warehouseId])
  @@index([tenantId, productId])
  @@map("pos_stock")
}

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

#### Customer Domain (`pos-customers.prisma`)

```prisma
model PosCustomer {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String  @db.Uuid
  code          String           // Auto or manual customer code
  name          String
  phone         String?
  email         String?
  dateOfBirth   DateTime?
  gender        String?
  billingAddress  String?
  shippingAddress String?
  vatNumber         String?          // For B2B customers
  groupId       String? @db.Uuid
  loyaltyPoints Int     @default(0)
  totalSpend    Decimal @db.Decimal(14, 3) @default(0)
  visitCount    Int     @default(0)
  lastVisitAt   DateTime?
  customFields  Json?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant           @relation(fields: [tenantId], references: [id])
  group  PosCustomerGroup? @relation(fields: [groupId], references: [id])
  sales  PosSale[]
  loyaltyHistory PosLoyaltyTransaction[]
  creditNotes    PosCreditNote[]

  @@unique([tenantId, code])
  @@unique([tenantId, phone])
  @@index([tenantId, name])
  @@map("pos_customers")
}

model PosCustomerGroup {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String  @db.Uuid
  name        String
  description String?
  discountPercent Decimal? @db.Decimal(5, 3)
  loyaltyMultiplier Decimal @db.Decimal(5, 3) @default(1)
  createdAt   DateTime @default(now())

  tenant    Tenant        @relation(fields: [tenantId], references: [id])
  customers PosCustomer[]

  @@unique([tenantId, name])
  @@map("pos_customer_groups")
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
  customer PosCustomer @relation(fields: [customerId], references: [id])

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
  customer PosCustomer @relation(fields: [customerId], references: [id])

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

#### Purchasing Domain (`pos-purchasing.prisma`)

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

#### Configuration Domain (`pos-config.prisma`)

```prisma
model PosTaxRate {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId  String  @db.Uuid
  name      String           // e.g., "GST 18%", "GST 5%"
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
  conditions    Json             // { minQty, minAmount, applicableProducts, applicableCategories }
  scope         Json             // { outlets: [], customerGroups: [] }
  startsAt      DateTime
  endsAt        DateTime?
  isActive      Boolean @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@index([tenantId, isActive, startsAt, endsAt])
  @@map("pos_promotions")
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

#### Workflow & Forms Domain (`pos-workflows.prisma`)

```prisma
model PosWorkflow {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  name        String           // e.g., "Laundry Intake", "Retail Checkout"
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant Tenant             @relation(fields: [tenantId], references: [id])
  states PosWorkflowState[]
  sales  PosSale[]

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

  @@unique([workflowId, name])
  @@map("pos_workflow_states")
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

### 3.4 Table Partitioning

High-volume tables will use time-range partitioning (following the existing `AttendanceEvent` and `FieldLocationPing` pattern):

- **`pos_sales`** — Monthly partitions by `createdAt`
- **`pos_sale_items`** — Monthly partitions by sale creation date
- **`pos_sale_payments`** — Monthly partitions
- **`pos_stock_adjustments`** — Monthly partitions by `createdAt`
- **`pos_loyalty_transactions`** — Monthly partitions by `createdAt`

---

## 4. Backend Implementation

### 4.1 Module Structure

```
apps/api/src/shared/
├── customers/                       → Shared Customer Module
│   ├── customers.module.ts
│   ├── customer.controller.ts
│   └── customer.service.ts
├── inventory/                       → Shared Inventory Module
│   ├── inventory.module.ts
│   ├── stock.service.ts
│   ├── adjustment.service.ts
│   └── transfer.service.ts
├── payments/                        → Shared Payment Module
│   ├── payments.module.ts
│   └── payment.service.ts
├── messaging/                       → Shared Messaging (WhatsApp) Module
│   ├── messaging.module.ts
│   └── whatsapp.service.ts
├── forms/                           → Shared Dynamic Forms Module
│   ├── forms.module.ts
│   └── form-schema.service.ts

apps/api/src/products/pos/
├── pos.module.ts                    → Root POS module
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
│   └── dto/
├── register/
│   ├── register.module.ts
│   ├── register.controller.ts       → CRUD /pos/registers
│   ├── session.controller.ts        → Open/Close sessions
│   ├── session.service.ts           → Session management, cash tracking
│   ├── cash-movement.service.ts
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
    // 8. Generate invoice number (sequential, atomic)
    // 9. Create PosSale record
    // 10. Create PosSaleItem records
    // 11. Create PosSalePayment records
    // 12. Decrement inventory for each item
    // 13. Update customer stats (totalSpend, visitCount, lastVisitAt)
    // 14. Award loyalty points (if loyalty enabled and customer attached)
    // 15. Publish domain event: 'pos.sale.completed'
    // 16. Return completed sale with receipt data
  });
}
```

#### Inventory Decrement (Atomic)

```typescript
// Use Prisma atomic operations for stock changes
async decrementStock(productId: string, outletId: string, quantity: number) {
  const stock = await tx.posStock.update({
    where: { tenantId_productId_variantId_outletId_warehouseId: {...} },
    data: { quantity: { decrement: quantity } },
  });
  
  // Check for negative stock (if not allowed)
  if (!settings.allowNegativeStock && stock.quantity < 0) {
    throw new InsufficientStockError(productId, stock.quantity + quantity);
  }
  
  // Record stock adjustment for audit
  await tx.posStockAdjustment.create({...});
  
  // Check reorder point
  if (stock.quantity <= product.reorderPoint) {
    await this.eventBus.publish(new LowStockEvent(productId, outletId));
  }
}
```

### 4.3 BullMQ Workers

New workers to add to the existing `src/worker.ts`:

| Worker | Queue | Purpose |
|---|---|---|
| `PosInventorySyncWorker` | `pos:inventory-sync` | Recalculate stock after batch operations |
| `PosReportWorker` | `pos:reports` | Generate heavy reports asynchronously |
| `PosStockAlertWorker` | `pos:stock-alerts` | Process low-stock notifications |
| `PosLoyaltyExpiryWorker` | `pos:loyalty-expiry` | Cron: expire stale loyalty points |
| `PosProductImportWorker` | `pos:product-import` | Process CSV product imports |

### 4.4 SSE Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /pos/register/:id/stream` | Real-time register status updates |
| `GET /pos/inventory/alerts/stream` | Live low-stock and out-of-stock alerts |
| `GET /pos/outlets/:id/sales/stream` | Live sales feed for outlet dashboard |

---

## 5. Frontend Implementation — Tenant POS Dashboard

### 5.1 Route Structure

```
apps/web/src/app/app/pos/
├── layout.tsx                      → POS-specific sidebar layout
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
    ├── tax/page.tsx                → Tax/GST configuration
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
      { title: 'Tax / GST', href: '/pos/settings/tax' },
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

```
apps/web/src/app/app/platform/pos/
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
3. **Keyboard shortcuts**:
   - `F1` — Open/close session
   - `F2` — Customer search
   - `F3` — Hold order
   - `F4` — Recall held order
   - `F5` — Apply discount
   - `F8` — Process payment
   - `F9` — Print last receipt
   - `Esc` — Clear search / Cancel dialog
   - `+` / `-` — Increment/decrement quantity of selected item
   - `Del` — Remove selected item
4. **Touch-optimized** — large touch targets, swipe to delete, pinch for product grid
5. **Sound effects** — beep on scan success, error sound on invalid scan

### 7.3 State Management (Zustand)

```typescript
// POS Register Store
interface PosRegisterStore {
  // Cart state
  cart: CartItem[];
  customer: PosCustomer | null;
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
  setCustomer: (customer: PosCustomer | null) => void;
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

```typescript
// Payment processor interface
interface PaymentProcessor {
  name: string;
  processPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResult>;
  getStatus(transactionId: string): Promise<PaymentStatus>;
}

// Implementations
class ThawaniPayProcessor implements PaymentProcessor { ... }
class AmwalPayProcessor implements PaymentProcessor { ... }
class CashProcessor implements PaymentProcessor { ... }
```

### 9.2 UPI QR Code Flow

1. POS generates payment request with amount
2. Backend creates Razorpay/PhonePe payment link
3. QR code displayed on POS screen (and customer-facing display)
4. Customer scans and pays
5. Webhook callback confirms payment
6. POS auto-completes the sale

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

### Sprint POS-1: Foundation (4 weeks)

**Goal**: Basic product catalog and billing functionality

| Task | Effort | Priority |
|---|---|---|
| Database schema creation (all POS Prisma files) | 3d | P0 |
| Prisma migrations, seed data | 2d | P0 |
| Product CRUD API (controller, service, DTOs) | 3d | P0 |
| Category CRUD API | 2d | P0 |
| Product variant support | 2d | P0 |
| Outlet and Register CRUD API | 2d | P0 |
| Basic POS billing API (create sale, cart logic) | 4d | P0 |
| Tax calculation engine (GST) | 3d | P0 |
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
| Multiple payment methods (card, UPI) | 3d | P1 |
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
| POS permissions (CASL rules) | 3d | P0 |
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
| Payment gateway integration (Razorpay) | 4d | P1 |
| UPI QR code generation | 2d | P1 |
| Platform admin POS management | 3d | P0 |
| POS plan/feature gating | 3d | P0 |
| E-commerce sync (Shopify) | 4d | P3 |
| WhatsApp receipt sharing | 2d | P2 |
| API documentation (OpenAPI) | 2d | P1 |
| End-to-end testing | 3d | P0 |
| Production deployment prep | 2d | P0 |

---

## 15. Deployment Considerations

### 15.1 Database Migrations

- POS tables are added as new Prisma schema files — no changes to existing tables
- Partitioned tables (`pos_sales`, `pos_sale_items`) require raw SQL migration
- RLS policies must be added for all new POS tables
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
| Stock levels | Redis | 30 sec | On sale / adjustment |
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
| GST regulation changes | Low | Medium | Configurable tax engine, not hardcoded |
| Multi-store stock inconsistency | Medium | Medium | Eventual consistency model + reconciliation reports |

---

## Appendix: OpenAPI Contract Examples

### POST `/pos/sales`

```json
{
  "outletId": "uuid",
  "registerId": "uuid",
  "sessionId": "uuid",
  "customerId": "uuid | null",
  "salespersonId": "uuid | null",
  "orderType": "WALK_IN",
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid | null",
      "quantity": 2,
      "unitPrice": 500.00,
      "discount": { "type": "PERCENTAGE", "value": 10 },
      "notes": "Gift wrap"
    }
  ],
  "discount": { "type": "FIXED_AMOUNT", "value": 50 },
  "payments": [
    { "method": "CASH", "amount": 1500, "changeAmount": 76 },
    { "method": "UPI", "amount": 574, "referenceNumber": "UPI123456" }
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
  "subtotal": 1000.00,
  "discountAmount": 150.00,
  "taxAmount": 153.00,
  "totalAmount": 1003.00,
  "roundOffAmount": -3.00,
  "netAmount": 1000.00,
  "items": [...],
  "payments": [...],
  "customer": {...},
  "loyaltyPointsEarned": 10,
  "createdAt": "2026-07-26T14:00:00Z"
}
```
