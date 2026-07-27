# DeltCRM POS — Phase-Wise Execution Plan

> A step-by-step roadmap for building the POS system from scratch using a production-grade, modular architecture. This execution plan prioritizes the backend infrastructure and web-based frontend applications. Mobile app development is deferred.

---

## Phase 1: Foundation & Shared Modules

**Goal**: Establish the database architecture, core libraries, and shared top-level modules required to support the POS orchestration.

### 1.1 Database Schema Initialization
- **Prisma Schema Division**: Create isolated `.prisma` files for the shared domains (`customers.prisma`, `inventory.prisma`, `payments.prisma`, `messaging.prisma`) and POS-specific domains (`pos-workflows.prisma`, `pos-catalog.prisma`, `pos-core.prisma`).
- **Oman Localization**: Ensure all currency fields (`costPrice`, `sellingPrice`, `amount`, etc.) are mapped to `@db.Decimal(12, 3)` or `@db.Decimal(8, 3)` to support Omani Rial (OMR) precision.
- **Tax Configurations**: Initialize Oman VAT configurations (Standard 5%, Zero-Rated, Exempt, Out-of-Scope).
- **Migration Execution**: Generate and apply the initial Prisma migrations to the PostgreSQL database.

### 1.2 Shared Modules Development (`apps/api/src/shared/`)
Build the foundational micro-modules that can be used across the DeltCRM ecosystem:
- **Messaging Module**: Integrate the WhatsApp Business API for automated notifications. Integrate **Resend** for transactional emails (e.g., scheduled reports, large invoices).
- **Forms Module**: Create the JSON schema validation engine (using `Zod` and `ajv`) to validate dynamic payloads.
- **Payment Module**: Scaffold standard interfaces for payment gateways and implement the **Thawani Pay** (REST API) and **Amwal Pay** (secureHashValue) providers.
- **Storage Service**: Configure the **Wasabi** S3-compatible client. Integrate **Sharp** for compressing images buffer-in-memory before upload, and set up the **Cloudflare CDN** domain for delivery.

### 1.3 Core POS Orchestrator Scaffolding
- Scaffold `apps/api/src/products/pos/pos.module.ts`.
- Set up tenant-isolation middleware (Row-Level Security via Prisma Extensions).
- Implement basic RBAC (Role-Based Access Control) using CASL (e.g., Cashier, Store Manager, Admin).

---

## Phase 2: Catalog & Dynamic Workflows

**Goal**: Enable tenants to manage their inventory catalog and define their custom business operational workflows.

### 2.1 Product Catalog
- **Backend API**: Build CRUD endpoints for Products, Categories, and Variants.
- **Image Uploads**: Implement the upload controller leveraging the Wasabi/Sharp service.
- **Frontend Dashboard**: Develop the Web UI (`/pos/products`) for catalog management (list, filters, create/edit forms).

### 2.2 Dynamic Workflow Engine
- **State Machine Backend**: Build the `PosWorkflow` and `PosWorkflowState` services to define legal state transitions (e.g., `Draft -> Paid` for Retail; `Intake -> Cleaning -> Ready -> Paid` for Laundry).
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
- **Payment Processing**: Integrate the Shared Payment Module into the POS checkout flow.
- **Multi-Tender**: Support splitting bills (e.g., paying 5 OMR in cash, 10 OMR via Thawani Pay).
- **Transaction Atomicity**: Ensure that `PosSale`, `PosSaleItem`, `PosPayment`, and `Inventory` decrements are committed within a single ACID database transaction.

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
- **Audit Logging**: Ensure all critical actions (price overrides, voids, stock adjustments) generate an immutable audit trail.
- **Load Testing**: Test the database under high concurrency (multiple registers ringing up items simultaneously) to ensure transaction safety and prevent race conditions on inventory stock columns.
