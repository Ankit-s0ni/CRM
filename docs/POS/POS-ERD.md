# DeltCRM POS — Entity Relationship Diagram

> Complete database schema ERD for the POS module and the platform entities it consumes.
> All monetary values use `Decimal(12,3)` for **Omani Rial (OMR)** 3-decimal precision.
> All tables include implicit fields: `id UUID PK`, `created_at`, `updated_at`, `tenant_id FK` (where applicable).
>
> ⚠️ Read [`POS-FOUNDATION-DECISIONS.md`](./POS-FOUNDATION-DECISIONS.md) first — it records the corrections
> applied to this ERD (customer ownership, the two status axes, `pos_stock` uniqueness, partitioning) and
> the entities added since the first draft.
>
> **All models live in the single `apps/api/prisma/schema.prisma`** under domain banner comments — there is
> no split-schema directory. Every POS table carries RLS policies created in the same migration as the table.

---

## Legend

| Symbol | Meaning |
|---|---|
| `PK` | Primary Key |
| `FK` | Foreign Key |
| `UQ` | Unique Constraint |
| `?` | Nullable / Optional |
| `[]` | Array |
| `Decimal(p,s)` | Precision, Scale |
| `Json` | Flexible JSON column |
| `>>` | One-to-Many |
| `--` | One-to-One |

---

## Domain Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DeltCRM POS — Domain Map                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐  │
│  │  PLATFORM CORE  │   │   CUSTOMERS     │   │     POS PRODUCT         │  │
│  │                 │   │  (platform ctx) │   │  (owns everything Pos*) │  │
│  │  Tenants        │──▶│                 │──▶│  Core (Sales/Cart)      │  │
│  │  SubscrPlans    │   │  Customer       │   │  Catalog (Products)     │  │
│  │  Modules +      │   │  CustomerGroup  │   │  Register (Sessions)    │  │
│  │   Capabilities  │   │                 │   │  Inventory (Stock)      │  │
│  │  TenantModules  │   │  Consumed by    │   │  Payments (Thawani/     │  │
│  │  Users          │   │  POS via        │   │            Amwal)       │  │
│  │  Roles          │   │  public.ts —    │   │  Purchasing (PO)        │  │
│  │  Permissions    │   │  never written  │   │  Promotions + Coupons   │  │
│  │  Employees      │   │  directly       │   │  Loyalty + Credit Notes │  │
│  │  Notifications  │   │                 │   │  Workflows + Forms      │  │
│  │  Outbox / Audit │   │                 │   │  Configuration (VAT)    │  │
│  └─────────────────┘   └─────────────────┘   └─────────────────────────┘  │
│                                                                             │
│  Note: there is no "shared modules" tier. src/shared/** is infrastructure   │
│  only and may not import platform/** or products/** — see D5.               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ERD — Full Mermaid Diagram

```mermaid
erDiagram

    %% ──────────────────────────────────────────────
    %% PLATFORM CORE
    %% ──────────────────────────────────────────────

    Tenant {
        uuid    id                  PK
        string  company_name
        string  subdomain           UQ
        string  status              "TRIAL|ACTIVE|SUSPENDED|CHURNED"
        string  company_logo_url
        bool    onboarding_done
        ts      created_at
        ts      updated_at
    }

    SubscriptionPlan {
        uuid    id                  PK
        string  name
        string  key                 UQ
        decimal price_per_user      "Decimal(10,2) OMR — existing platform column"
        string  billing_period      "MONTHLY|YEARLY"
        int     max_employees
        int     max_outlets
        ts      created_at
    }

    TenantSubscription {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    plan_id             FK
        string  status              "TRIALING|ACTIVE|PAST_DUE|CANCELLED"
        int     seat_count
        date    period_start
        date    period_end
        ts      created_at
        ts      updated_at
    }

    Module {
        uuid    id                  PK
        string  key                 UQ   "UPPERCASE: POS, ATTENDANCE"
        string  name
    }

    TenantModule {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    module_id           FK
        bool    is_active
        ts      activated_at
        uuid    activated_by        FK
    }

    User {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  email               UQ
        string  password_hash
        string  first_name
        string  last_name
        string  phone
        string  status              "ACTIVE|INACTIVE|INVITED"
        ts      last_login_at
        ts      created_at
        ts      updated_at
    }

    Role {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name
        string  description
        bool    is_system           "Built-in vs custom"
        ts      created_at
    }

    UserRole {
        uuid    id                  PK
        uuid    user_id             FK
        uuid    role_id             FK
        ts      assigned_at
    }

    Permission {
        uuid    id                  PK
        string  key                 UQ   "e.g. pos.sale.create"
        string  description
        string  module              "key format pos.resource.action"
    }

    RolePermission {
        uuid    id                  PK
        uuid    role_id             FK
        uuid    permission_id       FK
    }

    Employee {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    user_id             FK
        string  employee_code       UQ
        string  first_name
        string  last_name
        string  designation
        string  department
        string  status              "ACTIVE|INACTIVE"
        ts      joined_at
        ts      created_at
        ts      updated_at
    }

    %% ──────────────────────────────────────────────
    %% CATALOG DOMAIN
    %% ──────────────────────────────────────────────

    PosCategory {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name
        uuid    parent_id           FK   "Self-ref nullable"
        string  image_url
        int     sort_order
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosTaxGroup {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                "e.g. VAT 5%"
        bool    is_active
        ts      created_at
    }

    PosTaxRate {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                "e.g. Standard VAT"
        decimal rate                "Decimal(5,3)"
        string  type                "VAT|EXEMPT|ZERO_RATED|OUT_OF_SCOPE"
        bool    is_active
        ts      created_at
    }

    PosTaxGroupRate {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    tax_group_id        FK
        uuid    tax_rate_id         FK
    }

    PosProduct {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    category_id         FK
        uuid    tax_group_id        FK
        string  name
        string  sku                 UQ "per tenant"
        string  barcode             UQ "per tenant, nullable"
        string  description
        string  brand
        string  vat_code
        string  unit_of_measure     "PCS|KG|LTR|MTR..."
        decimal cost_price          "Decimal(12,3)"
        decimal selling_price       "Decimal(12,3)"
        decimal mrp                 "Decimal(12,3) nullable"
        decimal wholesale_price     "Decimal(12,3) nullable"
        string  image_urls          "Array of Wasabi/Cloudflare URLs"
        bool    is_active
        bool    track_inventory
        bool    allow_negative_stock
        bool    has_variants
        bool    sell_by_weight
        int     reorder_point
        int     reorder_quantity
        decimal weight              "Decimal(8,3) nullable"
        ts      created_at
        ts      updated_at
    }

    PosVariant {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    product_id          FK
        string  name                "e.g. Red / Large"
        string  sku                 UQ "per tenant"
        string  barcode
        decimal cost_price          "Decimal(12,3) nullable"
        decimal selling_price       "Decimal(12,3) nullable"
        json    attributes          "{color: Red, size: L}"
        string  image_url
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosBatch {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    product_id          FK
        string  batch_number
        date    manufacture_date
        date    expiry_date
        int     quantity
        decimal cost_price          "Decimal(12,3)"
        ts      created_at
    }

    %% ──────────────────────────────────────────────
    %% REGISTER & OUTLET DOMAIN
    %% ──────────────────────────────────────────────

    PosOutlet {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                UQ "per tenant"
        string  address
        string  city
        string  state
        string  pincode
        string  phone
        string  email
        string  vat_number
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosWarehouse {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    outlet_id           FK
        string  name                UQ "per tenant"
        string  address
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosRegister {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    outlet_id           FK
        string  name                UQ "per outlet"
        string  device_id
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosEmployeeOutlet {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    user_id             FK
        uuid    outlet_id           FK
        ts      assigned_at
    }

    PosCashierPin {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    user_id             FK   UQ "one per user per tenant"
        string  pin_hash            "Argon2"
        int     failed_count
        ts      locked_until
        ts      last_used_at
        ts      created_at
        ts      updated_at
    }

    PosSession {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    register_id         FK
        uuid    cashier_id          FK "→ User"
        decimal opening_float       "Decimal(12,3)"
        decimal closing_amount      "Decimal(12,3) nullable"
        decimal expected_amount     "Decimal(12,3) nullable"
        decimal discrepancy         "Decimal(12,3) nullable"
        string  status              "OPEN|CLOSED"
        ts      opened_at
        ts      closed_at
        string  closing_notes
        json    denominations
    }

    PosCashMovement {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    session_id          FK
        string  type                "CASH_IN|CASH_OUT"
        decimal amount              "Decimal(12,3)"
        string  reason
        uuid    performed_by        FK "→ User"
        ts      created_at
    }

    %% ──────────────────────────────────────────────
    %% INVENTORY DOMAIN
    %% ──────────────────────────────────────────────

    PosStock {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    product_id          FK
        uuid    variant_id          FK   "nullable"
        uuid    outlet_id           FK
        uuid    warehouse_id        FK   "nullable"
        decimal quantity            "Decimal(12,3)"
        decimal committed           "Decimal(12,3) reserved qty"
        ts      updated_at
    }

    PosStockAdjustment {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    product_id          FK
        uuid    variant_id          FK   "nullable"
        uuid    outlet_id           FK
        string  type                "DAMAGE|THEFT|STOCKTAKE|GIFT|RETURN_TO_VENDOR|RECEIVED|OTHER"
        decimal quantity            "Decimal(12,3) +ve/-ve"
        string  reason
        string  notes
        uuid    performed_by        FK "→ User"
        ts      created_at
    }

    PosStockTransfer {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  transfer_number     UQ "per tenant"
        uuid    source_outlet_id    FK
        uuid    dest_outlet_id      FK
        string  status              "DRAFT|IN_TRANSIT|RECEIVED|CANCELLED"
        string  notes
        uuid    created_by          FK "→ User"
        ts      shipped_at
        ts      received_at
        ts      created_at
        ts      updated_at
    }

    PosStockTransferItem {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    transfer_id         FK
        uuid    product_id          FK
        uuid    variant_id          FK   "nullable"
        decimal sent_qty            "Decimal(12,3)"
        decimal received_qty        "Decimal(12,3) nullable"
    }

    %% ──────────────────────────────────────────────
    %% CUSTOMER DOMAIN
    %% ──────────────────────────────────────────────

    CustomerGroup {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                UQ "per tenant"
        string  description
        decimal discount_percent    "Decimal(5,3) nullable"
        decimal loyalty_multiplier  "Decimal(5,3) default 1"
        ts      created_at
    }

    Customer {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    group_id            FK   "nullable"
        string  code                UQ "per tenant"
        string  name
        string  phone               UQ "per tenant, nullable"
        string  email
        date    date_of_birth
        string  gender
        string  billing_address
        string  shipping_address
        string  vat_number          "For B2B"
        int     loyalty_points
        decimal total_spend         "Decimal(14,3)"
        int     visit_count
        ts      last_visit_at
        json    custom_fields
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosLoyaltyTransaction {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    customer_id         FK
        uuid    sale_id             FK   "nullable"
        string  type                "EARNED|REDEEMED|ADJUSTED|EXPIRED|REVERSED"
        int     points              "+ve earn / -ve redeem"
        int     balance             "Running balance"
        string  description
        ts      expires_at
        ts      created_at
    }

    PosCreditNote {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    customer_id         FK
        string  credit_number       UQ "per tenant"
        decimal original_amount     "Decimal(12,3)"
        decimal balance_amount      "Decimal(12,3)"
        string  reason
        uuid    sale_id             FK   "Originating return"
        ts      expires_at
        string  status              "ACTIVE|FULLY_REDEEMED|EXPIRED|CANCELLED"
        ts      created_at
        ts      updated_at
    }

    %% ──────────────────────────────────────────────
    %% SALES / CORE DOMAIN
    %% ──────────────────────────────────────────────

    PosSale {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    outlet_id           FK
        uuid    register_id         FK
        uuid    session_id          FK
        uuid    customer_id         FK   "nullable → Customer (platform)"
        uuid    salesperson_id      FK   "nullable → User/Employee"
        uuid    workflow_id         FK   "nullable → PosWorkflow"
        uuid    current_state_id    FK   "nullable → PosWorkflowState"
        string  invoice_number      UQ "per tenant, gapless"
        string  order_type          "WALK_IN|DELIVERY|PICKUP|ONLINE"
        string  status              "DRAFT|OPEN|COMPLETED|VOIDED|RETURNED|PARTIALLY_RETURNED"
        decimal subtotal            "Decimal(12,3)"
        decimal discount_amount     "Decimal(12,3)"
        string  discount_type       "PERCENTAGE|FIXED_AMOUNT nullable"
        decimal discount_value      "Decimal(12,3) nullable"
        decimal tax_amount          "Decimal(12,3)"
        decimal total_amount        "Decimal(12,3)"
        decimal round_off_amount    "Decimal(8,3)"
        decimal net_amount          "Decimal(12,3)"
        decimal amount_paid         "Decimal(12,3)"
        decimal amount_due          "Decimal(12,3) credit/due bills"
        string  notes
        bool    is_return
        uuid    original_sale_id    FK   "nullable → self"
        ts      created_at
        ts      updated_at
    }

    PosSaleItem {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    sale_id             FK
        uuid    product_id          FK
        uuid    variant_id          FK   "nullable"
        uuid    tax_group_id        FK   "nullable"
        string  product_name        "Snapshot at time of sale"
        string  sku                 "Snapshot"
        decimal quantity            "Decimal(10,3)"
        decimal unit_price          "Decimal(12,3)"
        decimal cost_at_sale        "Decimal(12,3) snapshot for margin reports"
        decimal discount_amount     "Decimal(12,3)"
        decimal tax_rate            "Decimal(5,3) snapshot"
        decimal tax_amount          "Decimal(12,3)"
        decimal subtotal            "Decimal(12,3)"
        decimal total               "Decimal(12,3)"
        string  notes
        bool    is_returned
        decimal return_quantity     "Decimal(10,3) nullable"
        string  return_reason       "nullable"
        string  return_condition    "RESELLABLE|DAMAGED nullable"
    }

    PosSalePayment {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    sale_id             FK
        string  method              "CASH|THAWANI|AMWAL|CREDIT_CARD|DEBIT_CARD|CREDIT_NOTE|LOYALTY_POINTS|CHEQUE|BANK_TRANSFER|DUE|CUSTOM"
        decimal amount              "Decimal(12,3)"
        string  reference_number    "Auth code / Cheque no."
        string  gateway_txn_id      "Gateway reference"
        decimal change_amount       "Decimal(12,3) nullable cash change"
        uuid    credit_note_id      FK   "nullable if paying by credit note"
        int     loyalty_points_used "nullable"
        ts      created_at
    }

    PosSaleFieldData {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    sale_id             FK
        uuid    state_id            FK   "→ PosWorkflowState"
        json    form_data           "Dynamic field data captured at this state"
    }

    %% ──────────────────────────────────────────────
    %% PURCHASING DOMAIN
    %% ──────────────────────────────────────────────

    PosVendor {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                UQ "per tenant"
        string  company_name
        string  phone
        string  email
        string  vat_number
        string  address
        json    bank_details
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosPurchaseOrder {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  po_number           UQ "per tenant"
        uuid    vendor_id           FK
        uuid    outlet_id           FK
        string  status              "DRAFT|SENT|PARTIALLY_RECEIVED|RECEIVED|CANCELLED"
        decimal subtotal            "Decimal(12,3)"
        decimal tax_amount          "Decimal(12,3)"
        decimal total_amount        "Decimal(12,3)"
        string  notes
        date    expected_date
        uuid    created_by          FK "→ User"
        uuid    approved_by         FK "→ User nullable"
        ts      created_at
        ts      updated_at
    }

    PosPurchaseOrderItem {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    purchase_order_id   FK
        uuid    product_id          FK
        uuid    variant_id          FK   "nullable"
        decimal ordered_qty         "Decimal(12,3)"
        decimal received_qty        "Decimal(12,3)"
        decimal unit_cost           "Decimal(12,3)"
        decimal tax_amount          "Decimal(12,3)"
        decimal subtotal            "Decimal(12,3)"
    }

    %% ──────────────────────────────────────────────
    %% PROMOTIONS DOMAIN
    %% ──────────────────────────────────────────────

    PosPromotion {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name
        string  description
        string  type                "ITEM_DISCOUNT|BILL_DISCOUNT|BUY_X_GET_Y|QUANTITY_BREAK|COMBO"
        string  discount_type       "PERCENTAGE|FIXED_AMOUNT"
        decimal discount_value      "Decimal(12,3)"
        json    conditions          "{minQty, minAmount, applicableProducts, applicableCategories}"
        json    scope               "{outlets, customerGroups}"
        ts      starts_at
        ts      ends_at
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosPromotionUsage {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    promotion_id        FK
        uuid    sale_id             FK
        uuid    coupon_id           FK   "nullable"
        decimal discount_applied    "Decimal(12,3)"
        ts      created_at
    }

    PosCoupon {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    promotion_id        FK
        string  code                UQ "per tenant"
        int     max_redemptions     "nullable = unlimited"
        int     redemption_count
        int     per_customer_limit  "nullable"
        ts      starts_at
        ts      ends_at
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    %% ──────────────────────────────────────────────
    %% CONFIGURATION DOMAIN
    %% ──────────────────────────────────────────────

    PosSettings {
        uuid    id                  PK
        uuid    tenant_id           FK   UQ "One per tenant"
        string  vat_number
        string  vat_registration_type
        bool    tax_inclusive
        bool    allow_negative_stock
        bool    auto_print_receipt
        string  default_payment_method
        string  invoice_prefix
        int     invoice_next_number
        bool    loyalty_enabled
        decimal loyalty_points_per_unit "Decimal(8,3) points per 1 OMR"
        decimal loyalty_redemption_rate "Decimal(8,3) OMR per point"
        int     return_window_days
        string  receipt_header
        string  receipt_footer
        string  logo_url            "Cloudflare CDN URL"
        ts      updated_at
    }

    PosReceiptTemplate {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name
        string  paper_size          "A4|A5|THERMAL_58|THERMAL_80"
        json    layout              "Field positions, fonts, margins"
        bool    is_default
        ts      created_at
        ts      updated_at
    }

    %% ──────────────────────────────────────────────
    %% WORKFLOW DOMAIN
    %% ──────────────────────────────────────────────

    PosWorkflow {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name                UQ "per tenant"
        string  description
        bool    is_active
        ts      created_at
        ts      updated_at
    }

    PosWorkflowState {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    workflow_id         FK
        uuid    form_schema_id      FK   "nullable → PosFormSchema"
        string  name                UQ "per workflow"
        int     order_index
        bool    is_initial
        bool    is_final
    }

    PosWorkflowTransition {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    workflow_id         FK
        uuid    from_state_id       FK   "→ PosWorkflowState"
        uuid    to_state_id         FK   "→ PosWorkflowState"
        string  label               "e.g. Mark as Cleaned"
        string  required_permission "e.g. pos.order.advance"
        json    side_effects        "[{type: SEND_WHATSAPP, template: ...}]"
    }

    PosFormSchema {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  name
        json    schema              "JSON Schema definition of fields"
        json    ui_schema           "React JSON Schema Form UI config"
        ts      created_at
    }

    %% ──────────────────────────────────────────────
    %% SHARED — MESSAGING
    %% ──────────────────────────────────────────────

    MessagingLog {
        uuid    id                  PK
        uuid    tenant_id           FK
        string  channel             "WHATSAPP|EMAIL"
        string  recipient           "Phone or email"
        string  subject             "nullable for WhatsApp"
        string  template_name
        json    payload
        string  status              "QUEUED|SENT|DELIVERED|FAILED"
        string  external_msg_id     "WhatsApp/Resend message ID"
        string  error_message
        ts      sent_at
        ts      created_at
    }

    %% ──────────────────────────────────────────────
    %% AUDIT
    %% ──────────────────────────────────────────────

    AuditLog {
        uuid    id                  PK
        uuid    tenant_id           FK
        uuid    user_id             FK   "nullable"
        string  action              "pos.sale.create|pos.stock.adjust|..."
        string  entity_type         "PosSale|PosProduct|..."
        uuid    entity_id
        json    before_state
        json    after_state
        string  ip_address
        ts      created_at
    }

    %% ══════════════════════════════════════════════
    %% RELATIONSHIPS
    %% ══════════════════════════════════════════════

    %% Platform
    Tenant                  ||--o{ TenantSubscription       : "has"
    SubscriptionPlan        ||--o{ TenantSubscription       : "used by"
    Tenant                  ||--o{ TenantModule             : "has"
    Module                  ||--o{ TenantModule             : "enabled in"
    Tenant                  ||--o{ User                     : "has"
    Tenant                  ||--o{ Role                     : "defines"
    User                    ||--o{ UserRole                 : "has"
    Role                    ||--o{ UserRole                 : "assigned via"
    Role                    ||--o{ RolePermission           : "grants"
    Permission              ||--o{ RolePermission           : "granted via"
    Tenant                  ||--o{ Employee                 : "employs"
    User                    ||--o| Employee                 : "is"

    %% Catalog
    Tenant                  ||--o{ PosCategory              : "owns"
    PosCategory             ||--o{ PosCategory              : "parent of"
    Tenant                  ||--o{ PosTaxGroup              : "owns"
    Tenant                  ||--o{ PosTaxRate               : "owns"
    PosTaxGroup             ||--o{ PosTaxGroupRate          : "composed of"
    PosTaxRate              ||--o{ PosTaxGroupRate          : "used in"
    Tenant                  ||--o{ PosProduct               : "owns"
    PosCategory             ||--o{ PosProduct               : "contains"
    PosTaxGroup             ||--o{ PosProduct               : "applies to"
    PosProduct              ||--o{ PosVariant               : "has"
    PosProduct              ||--o{ PosBatch                 : "has"

    %% Outlets & Register
    Tenant                  ||--o{ PosOutlet                : "owns"
    PosOutlet               ||--o{ PosWarehouse             : "has"
    PosOutlet               ||--o{ PosRegister              : "has"
    PosRegister             ||--o{ PosSession               : "has"
    PosSession              ||--o{ PosCashMovement          : "records"
    User                    ||--o{ PosSession               : "opens"
    User                    ||--o{ PosCashMovement          : "performs"

    %% Inventory
    PosProduct              ||--o{ PosStock                 : "tracked in"
    PosVariant              ||--o{ PosStock                 : "tracked in"
    PosOutlet               ||--o{ PosStock                 : "holds"
    PosWarehouse            ||--o{ PosStock                 : "stores"
    PosProduct              ||--o{ PosStockAdjustment       : "adjusted in"
    PosOutlet               ||--o{ PosStockAdjustment       : "adjusted at"
    User                    ||--o{ PosStockAdjustment       : "performed by"
    Tenant                  ||--o{ PosStockTransfer         : "owns"
    PosOutlet               ||--o{ PosStockTransfer         : "source of"
    PosOutlet               ||--o{ PosStockTransfer         : "destination of"
    PosStockTransfer        ||--o{ PosStockTransferItem     : "contains"
    PosProduct              ||--o{ PosStockTransferItem     : "moved in"
    PosVariant              ||--o{ PosStockTransferItem     : "moved in"

    %% Customers
    Tenant                  ||--o{ CustomerGroup         : "defines"
    CustomerGroup        ||--o{ Customer              : "groups"
    Tenant                  ||--o{ Customer              : "owns"
    Customer             ||--o{ PosLoyaltyTransaction    : "has"
    Customer             ||--o{ PosCreditNote            : "holds"

    %% Sales Core
    Tenant                  ||--o{ PosSale                  : "owns"
    PosOutlet               ||--o{ PosSale                  : "processed at"
    PosRegister             ||--o{ PosSale                  : "rung on"
    PosSession              ||--o{ PosSale                  : "within"
    Customer             ||--o{ PosSale                  : "makes"
    User                    ||--o{ PosSale                  : "salesperson"
    PosWorkflow             ||--o{ PosSale                  : "governs"
    PosSale                 ||--o| PosSale                  : "returned via"
    PosSale                 ||--o{ PosSaleItem              : "contains"
    PosProduct              ||--o{ PosSaleItem              : "sold in"
    PosVariant              ||--o{ PosSaleItem              : "sold in"
    PosTaxGroup             ||--o{ PosSaleItem              : "taxed by"
    PosSale                 ||--o{ PosSalePayment           : "paid via"
    PosCreditNote           ||--o{ PosSalePayment           : "redeemed in"
    Customer             ||--o{ PosLoyaltyTransaction    : "earns/redeems"
    PosSale                 ||--o{ PosLoyaltyTransaction    : "triggers"
    PosSale                 ||--o{ PosSaleFieldData         : "captures"
    PosWorkflowState        ||--o{ PosSaleFieldData         : "captured at"

    %% Purchasing
    Tenant                  ||--o{ PosVendor                : "manages"
    PosVendor               ||--o{ PosPurchaseOrder         : "receives"
    PosOutlet               ||--o{ PosPurchaseOrder         : "orders for"
    User                    ||--o{ PosPurchaseOrder         : "created by"
    User                    ||--o{ PosPurchaseOrder         : "approved by"
    PosPurchaseOrder        ||--o{ PosPurchaseOrderItem     : "contains"
    PosProduct              ||--o{ PosPurchaseOrderItem     : "ordered in"
    PosVariant              ||--o{ PosPurchaseOrderItem     : "ordered in"

    %% Promotions
    Tenant                  ||--o{ PosPromotion             : "defines"
    PosPromotion            ||--o{ PosPromotionUsage        : "used in"
    PosSale                 ||--o{ PosPromotionUsage        : "applied to"
    PosPromotion            ||--o{ PosCoupon                : "unlocked by"
    PosCoupon               ||--o{ PosPromotionUsage        : "redeemed in"

    %% Staff scoping
    User                    ||--o{ PosEmployeeOutlet        : "assigned to"
    PosOutlet               ||--o{ PosEmployeeOutlet        : "staffed by"
    User                    ||--o| PosCashierPin            : "authenticates with"

    %% Configuration
    Tenant                  ||--|| PosSettings              : "configures"
    Tenant                  ||--o{ PosReceiptTemplate       : "defines"

    %% Workflows
    Tenant                  ||--o{ PosWorkflow              : "defines"
    PosWorkflow             ||--o{ PosSale                  : "governs"
    PosWorkflowState        ||--o{ PosSale                  : "current state of"
    PosWorkflow             ||--o{ PosWorkflowState         : "has"
    PosWorkflow             ||--o{ PosWorkflowTransition    : "has"
    PosWorkflowState        ||--o{ PosWorkflowTransition    : "from"
    PosWorkflowState        ||--o{ PosWorkflowTransition    : "to"
    PosFormSchema           ||--o{ PosWorkflowState         : "attached to"
    Tenant                  ||--o{ PosFormSchema            : "defines"

    %% Messaging & Audit
    Tenant                  ||--o{ MessagingLog             : "sends"
    Tenant                  ||--o{ AuditLog                 : "trails"
    User                    ||--o{ AuditLog                 : "performed by"
```

---

## Table Reference Index

### Platform Core

| Table | Primary Key | Description |
|---|---|---|
| `tenants` | `id` | Root entity — all POS data scoped here |
| `subscription_plans` | `id` | Pricing tiers (Free, Standard, Pro, Premium) |
| `tenant_subscriptions` | `id` | Tenant's active plan and billing period |
| `modules` | `id` | Feature modules (attendance, pos, etc.) |
| `tenant_modules` | `id` | Which modules are active per tenant |
| `users` | `id` | Authentication identity |
| `roles` | `id` | RBAC role definitions |
| `user_roles` | `id` | M:M — Users to Roles |
| `permissions` | `id` | Flat permission keys (`pos.sale.create`) — no CASL |
| `role_permissions` | `id` | M:M — Roles to Permissions |
| `employees` | `id` | Payroll/HR profile linked to User |

### Catalog Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_categories` | `id` | Hierarchical product categories (self-referential) |
| `pos_products` | `id` | Master product catalog |
| `pos_variants` | `id` | Size/color/type variants of a product |
| `pos_batches` | `id` | Expiry-tracked stock batches |
| `pos_tax_rates` | `id` | Individual VAT rate definitions |
| `pos_tax_groups` | `id` | Named bundles of tax rates |
| `pos_tax_group_rates` | `id` | M:M — Tax Groups to Tax Rates |

### Inventory Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_stock` | `id` | Current stock level per product/variant/outlet/warehouse |
| `pos_stock_adjustments` | `id` | Immutable log of all stock changes |
| `pos_stock_transfers` | `id` | Inter-outlet transfer order header |
| `pos_stock_transfer_items` | `id` | Line items within a transfer |
| `pos_warehouses` | `id` | Sub-location within an outlet |

### Register & Session Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_outlets` | `id` | Physical store/branch locations |
| `pos_registers` | `id` | Hardware register/counter in an outlet |
| `pos_sessions` | `id` | A cashier's shift — open to closed |
| `pos_cash_movements` | `id` | Petty cash in/out during a session |
| `pos_employee_outlets` | `id` | Restricts a user to specific outlets |
| `pos_cashier_pins` | `id` | Argon2-hashed PIN for cashier quick-switch |

### Customer Domain (platform-owned — not POS tables)

| Table | Primary Key | Description |
|---|---|---|
| `customers` | `id` | Customer profile (B2C and B2B) — **platform-owned**, see D4 |
| `customer_groups` | `id` | VIP, Wholesale, Walk-in tiers — **platform-owned** |
| `pos_loyalty_transactions` | `id` | Points ledger (earn/redeem/expire) |
| `pos_credit_notes` | `id` | Store credit issued on return |

### Sales / Core Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_sales` | `id` | Transaction header (the invoice) |
| `pos_sale_items` | `id` | Line items within a sale |
| `pos_sale_payments` | `id` | Payment split records (multi-tender) |
| `pos_sale_field_data` | `id` | Dynamic data captured per workflow state |

### Purchasing Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_vendors` | `id` | Supplier/vendor profiles |
| `pos_purchase_orders` | `id` | PO header to vendor |
| `pos_purchase_order_items` | `id` | PO line items |

### Promotions Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_promotions` | `id` | Discount/offer rule definitions |
| `pos_promotion_usages` | `id` | Audit log of applied promotions per sale |
| `pos_coupons` | `id` | Coupon codes unlocking a promotion, with usage limits |

### Configuration Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_settings` | `id` | Tenant-level POS configuration (1:1 with Tenant) |
| `pos_receipt_templates` | `id` | Multi-format receipt layouts (A4/A5/Thermal) |

### Workflow Domain

| Table | Primary Key | Description |
|---|---|---|
| `pos_workflows` | `id` | Named workflow definition (e.g., Laundry Flow) |
| `pos_workflow_states` | `id` | Individual steps within a workflow |
| `pos_workflow_transitions` | `id` | Valid state-to-state transitions with side effects |
| `pos_form_schemas` | `id` | JSON Schema definitions for dynamic data capture |

### Shared Modules

| Table | Primary Key | Description |
|---|---|---|
| `messaging_logs` | `id` | Delivery log for all WhatsApp and Resend emails |
| `audit_logs` | `id` | Immutable log of all system actions |

---

## Key Constraints & Business Rules

> [!IMPORTANT]
> **OMR Currency Precision**: All monetary columns use `Decimal(12,3)` to support 3 decimal places required for Omani Rial (Baisa). Tax rate columns use `Decimal(5,3)`.

> [!IMPORTANT]
> **Tenant Isolation**: Every entity (except platform core tables) includes `tenant_id` with Row-Level Security (RLS) enforced via Prisma Extensions. No cross-tenant data leakage is possible.

> [!NOTE]
> **Sale Snapshots**: `pos_sale_items` stores `product_name` and `sku` as string snapshots at the time of sale. This ensures historical invoices remain accurate even after product renames or deletions.

> [!NOTE]
> **Inventory Atomicity**: A `PosSale` creation atomically decrements `pos_stock.quantity` within a single ACID Prisma transaction to prevent race conditions on concurrent sales.

> [!NOTE]
> **Self-Referential Sale**: `pos_sales.original_sale_id` enables return transactions to reference the original invoice, maintaining a clean audit chain without duplicating data.

> [!NOTE]
> **Dynamic Workflows**: `pos_sale_field_data` is the bridge between a sale and the custom data captured at each workflow state. This allows the same `pos_sales` table to serve both a simple retail checkout and a complex multi-step laundry order.

> [!IMPORTANT]
> **Two status axes**: `pos_sales.status` is the *financial* lifecycle (`DRAFT`, `OPEN`, `COMPLETED`,
> `VOIDED`, `RETURNED`, `PARTIALLY_RETURNED`). `pos_sales.current_state_id` is the *operational* position
> within a tenant-defined workflow. A laundry order in cleaning is `status = OPEN` +
> `current_state = Cleaning`. Retail sales have `workflow_id = NULL` and go straight to `COMPLETED`.
> See `POS-FOUNDATION-DECISIONS.md` D7.3.

> [!WARNING]
> **`pos_stock` uniqueness cannot be a plain composite unique.** `variant_id` and `warehouse_id` are
> nullable, and PostgreSQL treats `NULL`s as distinct in unique indexes — a plain
> `UNIQUE(tenant_id, product_id, variant_id, outlet_id, warehouse_id)` would permit **duplicate stock rows**
> for any product without a variant or warehouse. Four partial unique indexes are used instead; see
> `POS-FOUNDATION-DECISIONS.md` D7.1. Matching queries must use `IS NOT DISTINCT FROM`, not `=`.

> [!NOTE]
> **Customer is platform-owned**: `customers` and `customer_groups` belong to the Customers platform
> context, not POS. POS references `customer_id` and updates spend statistics through that context's
> public contract. See D4.

---

## Partitioning — deferred

**No POS table is partitioned at launch** (see `POS-FOUNDATION-DECISIONS.md` D7.2).

Partitioning `pos_sales` by `created_at` is not implementable as originally specified: PostgreSQL requires
the partition key in every unique constraint, which would forbid the gapless
`UNIQUE(tenant_id, invoice_number)` that VAT compliance requires, and four child tables hold foreign keys
into `pos_sales`. The existing partitioned tables in this platform (`attendance_events`,
`field_location_pings`) are append-only with no inbound foreign keys — sales are neither.

If volume later demands it, these are the candidates, in order — all append-only with no inbound FKs:

| Table | Partition Strategy | Status |
|---|---|---|
| `pos_stock_adjustments` | Monthly by `created_at` | Deferred — safe to partition later |
| `pos_loyalty_transactions` | Monthly by `created_at` | Deferred — safe to partition later |
| `messaging_logs` | Monthly by `created_at` | Deferred |
| `audit_logs` | Monthly by `created_at` | Existing platform decision |
| `pos_sales` and children | — | **Not viable** without dropping the invoice-number constraint |
