# DeltCRM POS — Phase-Wise Execution Plan

> A step-by-step roadmap for building the POS system from scratch using a production-grade, modular architecture. This execution plan prioritizes the backend infrastructure and web-based frontend applications. Mobile app development is deferred.
>
> ⚠️ Read [`POS-FOUNDATION-DECISIONS.md`](./POS-FOUNDATION-DECISIONS.md) first — Phase 1 below was rewritten
> to match the actual codebase (no split schemas, no `src/shared` business modules, no CASL).
>
> **Sequencing concern, unresolved**: Phase 2 builds the dynamic workflow engine and form builder *before*
> Phase 3 builds billing. The workflow engine is the most speculative component in the specification, and
> every tenant needs billing while only service-business tenants need workflows. `PosSale.workflowId` is
> nullable by design, so a fixed retail checkout can ship first at no structural cost. Raise this before
> Phase 2 starts. See the closing section of the decisions document.

---

## Phase 0: Product Registration (prerequisite, ~1 day)

**Goal**: Make POS a legitimate product under the CI-enforced architecture governance before any code lands.

- Copy `apps/api/architecture/templates/module` to `apps/api/src/products/pos`.
- Create the composition root `pos-product.module.ts`, its `public.ts`, and `README.md`.
- Register the product in `apps/api/architecture/module-boundaries.json` — name, owner, composition root,
  public entry, and one `physicalRoots` entry per sub-module folder.
- Add POS and Customers ownership rows to `apps/api/architecture/TABLE-OWNERSHIP.md`.
- Add the architecture self-test asserting `pos -> attendance` stays rejected.
- Verify with `pnpm architecture:check`.

> Skipping this does not "save time" — `pnpm quality` fails and the work cannot merge.

---

## Phase 1: Foundation

**Goal**: Establish the database architecture and the platform capabilities POS depends on.

### 1.1 Database Schema Initialization
- **Schema Location**: Append POS models to the single `apps/api/prisma/schema.prisma` under domain banner comments (`POS — CATALOG`, `POS — SALES`, …). There is no `prisma/schema/` directory (D2).
- **Oman Localization**: All currency fields (`costPrice`, `sellingPrice`, `amount`, …) use `@db.Decimal(12, 3)`; tax rates `@db.Decimal(5, 3)`; weights `@db.Decimal(8, 3)`.
- **Tax Configurations**: Initialize Oman VAT configurations (Standard 5%, Zero-Rated, Exempt, Out-of-Scope).
- **RLS**: Every new POS table gets `tenant_isolation` (`TO app_user`) and `platform_access` (`TO platform_runtime`) policies plus grants **in the same migration that creates it**.
- **`pos_stock` partial unique indexes**: raw SQL in the migration — a plain composite unique does not work with nullable columns (D7.1).
- **Migration Execution**: Generate and apply the migrations; verify RLS with a tenant-isolation test.

### 1.2 Platform & Infrastructure Prerequisites
Not "shared modules" — `src/shared/**` is infrastructure only and may not contain business logic (D5):
- **Customers Context** (`src/platform/customers/`): the platform `Customer` / `CustomerGroup` entities with a `public.ts` exposing queries and a `recordPurchase()` command (D4).
- **Messaging**: add a **WhatsApp provider adapter** behind the existing `notification-provider.port.ts`. Transactional email already exists — configure Resend as its provider rather than building a parallel path.
- **Dynamic form validation**: `ajv` for tenant-authored JSON Schemas, inside `products/pos/workflows/`. API DTOs stay on `class-validator` like the rest of the codebase — do not introduce Zod.
- **Payments**: implement **Thawani Pay** (REST) and **Amwal Pay** (`secureHashValue`) adapters in `products/pos/payments/`, mirroring the existing `payment-provider.port.ts` shape.
- **Storage**: point the existing `private-object-storage.service.ts` at **Wasabi** (S3-compatible, config change). Add **Sharp** for in-memory image compression and the **Cloudflare CDN** domain for delivery.

### 1.3 Core POS Orchestrator Scaffolding
- Wire the sub-module folders into `pos-product.module.ts` and export only through `public.ts`.
- Register `POS` in the module catalog seed (UPPERCASE key) with its `ModuleCapability` rows.
- Add `pos.*` permission keys to `permissions.constants.ts`, grant them in `DEFAULT_ROLE_PERMISSIONS`, seed the rows, and seed the Cashier / Store Manager roles.
- Protect routes with the existing `@RequireModule('POS')` and `@RequirePermissions(...)` decorators. **There is no CASL in this codebase** — do not add an ability factory.

---

## Phase 2: Catalog & Dynamic Workflows

**Goal**: Enable tenants to manage their inventory catalog and define their custom business operational workflows.

### 2.1 Product Catalog
- **Backend API**: Build CRUD endpoints for Products, Categories, and Variants.
- **Image Uploads**: Implement the upload controller leveraging the Wasabi/Sharp service.
- **Frontend Dashboard**: Develop the Web UI at `apps/web/src/app/pos/products` (URL `/pos/products`) for catalog management (list, filters, create/edit forms), using TanStack Query + React Hook Form (D3).

### 2.2 Dynamic Workflow Engine
- **State Machine Backend**: Build the `PosWorkflow`, `PosWorkflowState` and `PosWorkflowTransition` services to define legal state transitions (e.g., `Draft -> Paid` for Retail; `Intake -> Cleaning -> Ready -> Paid` for Laundry). A sale's position is `PosSale.currentStateId`; its financial lifecycle stays in `PosSale.status`. The two are independent (D7.3).
- **Form Schema Linking**: Create the ability to attach a specific JSON Form Schema to a Workflow State (e.g., linking a "Garment Condition Form" to the "Intake" state).

### 2.3 Workflow Configuration UI
- **Frontend Form Builder**: Integrate a drag-and-drop JSON schema builder in the tenant settings.
- **Workflow Visualizer**: Provide a UI for tenants to map out their state transitions and assign forms.

---

## Phase 3: Core POS Billing & Cart Engine

**Goal**: Build the transactional heart of the POS system (The Register).

### 3.1 Register & Session Management
- **Backend**: Implement APIs for opening a register, entering opening float, closing a register, and logging cash movements (Cash In/Out).
- **Frontend UI**: Build the Shift/Session entry screen before a cashier can access the billing UI.

### 3.2 Cart & Tax Engine
- **Cart Calculations**: Build a robust, server-side verified cart engine that calculates line-item totals, applies item-level/cart-level discounts, and calculates Oman VAT.
- **Rounding Rules**: Implement standard OMR rounding rules for cash payments vs. digital payments.
- **Frontend POS UI**: Build the full-screen React/Next.js interface (`/pos/billing`). Include the product grid, barcode scanner listener, and the real-time cart sidebar.

### 3.3 Checkout & Payments
- **Payment Processing**: Integrate the POS payment adapters (Thawani, Amwal, cash) into the checkout flow.
- **Multi-Tender**: Support splitting bills (e.g., paying 5 OMR in cash, 10 OMR via Thawani Pay).
- **Invoice Numbering**: Gapless per-tenant sequence under a row lock, taken late in the transaction.
- **Transaction Atomicity**: `PosSale`, `PosSaleItem`, `PosSalePayment`, inventory decrements, loyalty award and the **outbox event** all commit in a single ACID transaction. Publishing to BullMQ directly instead of the outbox would drop events on rollback.
- **Webhooks**: verify gateway signature and amount before trusting a callback; persist the receipt so replays are idempotent.

---

## Phase 4: Receipts & Notifications

**Goal**: Generate localized, multi-format invoices and automate digital delivery.

### 4.1 Receipt Generation Engine
- **Dynamic Layouts**: Build print layouts optimized for:
  - **A4 / A5**: For B2B customers, showing full VAT Numbers and detailed tax breakdowns.
  - **Thermal Printers**: CSS-optimized layouts for 58mm and 80mm ESC/POS hardware.
- **Frontend Integration**: Implement silent printing / browser print dialog hooks.

### 4.2 Digital Delivery
- **Automated Triggers**: Connect the POS Checkout event to the Shared Messaging Module.
- **WhatsApp Delivery**: Send digital receipt links / PDFs via WhatsApp instantly upon transaction completion.
- **Email Delivery**: Send detailed A4 invoices via Resend for B2B transactions.

---

## Phase 5: Advanced Inventory & Purchasing

**Goal**: Manage stock life-cycles, warehouse transfers, and supplier relationships.

### 5.1 Stock Management
- **Adjustments**: Build APIs and UI for manual stock adjustments (Damage, Theft, Shrinkage).
- **Transfers**: Implement stock transfers between different outlets/warehouses.

### 5.2 Vendor & Purchase Orders (B2B)
- **Vendors**: Build the vendor management UI (tracking VAT numbers, contact details).
- **Purchase Orders**: Build the PO generation workflow.
- **Goods Receipt**: Implement the flow to receive a PO, automatically updating inventory levels and calculating average cost price based on the received batch.

---

## Phase 6: Promotions, Loyalty & Reporting

**Goal**: Provide marketing tools and deep business insights.

### 6.1 Discount Engine & Loyalty
- **Promotions**: Build rule-based promotion engines (e.g., "Buy 2 Get 1 Free", "Spend 50 OMR get 10% off").
- **Loyalty Program**: Implement the points ledger (Points per OMR spent, OMR per point redeemed).

### 6.2 Analytics & Reporting Dashboards
- **Daily Sales & EOD Reports**: Cashier reconciliation reports.
- **VAT Compliance Reports**: Generate standard Oman VAT output tax reports (quarterly summaries).
- **Inventory Valuation**: Reports calculating total stock value based on FIFO/Weighted Average cost.
- **Scheduled Reports**: Use BullMQ and Resend to automatically email weekly/monthly summaries to managers.

---

## Phase 7: Web Offline Mode & Production Polish

**Goal**: Ensure the web POS is highly resilient to network drops and ready for scale.

### 7.1 Web Offline Architecture
- **IndexedDB**: Implement local storage caching for the product catalog and customer list via service workers.
- **Background Sync**: Implement a sync queue for sales made offline. When the internet is restored, the queue flushes to the backend APIs.

### 7.2 Hardware Integration
- **Web Serial API**: Add native browser support to directly trigger Cash Drawers and read from USB/Serial Barcode Scanners and Weighing Scales without external plugins.

### 7.3 Security & Optimization
- **Audit Logging**: Ensure all critical actions (price overrides, voids, discount overrides, stock adjustments, PIN overrides) write to the existing append-only `TenantAuditLog`.
- **Load Testing**: Test the database under high concurrency (multiple registers ringing up items simultaneously) to ensure transaction safety and prevent race conditions on inventory stock columns. Two contention points to measure specifically: the `pos_stock` row lock per product, and the per-tenant invoice-sequence row lock.
- **Partitioning review**: revisit the deferred partitioning decision (D7.2) with real volume data before assuming it is needed.
