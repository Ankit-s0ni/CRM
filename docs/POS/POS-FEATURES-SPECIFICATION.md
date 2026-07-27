# DeltCRM POS — Complete Feature Specification

> A comprehensive catalog of every major and minor feature for the DeltCRM Point of Sale system, modeled after Zoho POS (Zakya).

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Dashboard &amp; Home](#2-dashboard--home)
3. [Billing &amp; Checkout (Register)](#3-billing--checkout-register)
4. [Inventory Management](#4-inventory-management)
5. [Product &amp; Catalog Management](#5-product--catalog-management)
6. [Customer Management](#6-customer-management)
7. [Loyalty &amp; Rewards Program](#7-loyalty--rewards-program)
8. [Discounts &amp; Promotions](#8-discounts--promotions)
9. [Returns, Refunds &amp; Exchanges](#9-returns-refunds--exchanges)
10. [Payment Processing](#10-payment-processing)
11. [Register &amp; Session Management](#11-register--session-management)
12. [Employee &amp; Role Management](#12-employee--role-management)
13. [Multi-Store &amp; Multi-Warehouse Management](#13-multi-store--multi-warehouse-management)
14. [Purchase Orders &amp; Vendor Management](#14-purchase-orders--vendor-management)
15. [Reports &amp; Analytics](#15-reports--analytics)
16. [Tax & VAT Compliance](#16-tax--vat-compliance)
17. [Hardware Integration](#17-hardware-integration)
18. [Offline Mode &amp; Sync](#18-offline-mode--sync)
19. [Receipt &amp; Invoice Customization](#19-receipt--invoice-customization)
20. [Barcode Management](#20-barcode-management)
21. [Online Store &amp; Omnichannel](#21-online-store--omnichannel)
22. [Notifications &amp; Alerts](#22-notifications--alerts)
23. [Settings &amp; Configuration](#23-settings--configuration)
24. [Platform Admin (Super Admin) Features](#24-platform-admin-super-admin-features)
25. [Integrations](#25-integrations)
26. [Mobile POS Features](#26-mobile-pos-features)
27. [Security &amp; Audit](#27-security--audit)

---

## 1. Product Overview

DeltCRM POS is a cloud-based, multi-tenant Point of Sale system designed with a **Dynamic Workflow Engine** to support any business type, from retail to service-oriented businesses like laundries or salons. It provides unified billing, inventory management, customer relationship management, and business analytics — all within the existing DeltCRM platform.

### Localization (Oman)
- **Currency**: Native support for Omani Rial (OMR) with mandatory 3-decimal place precision (e.g., 1.250 OMR) across all database records and UI displays.
- **Taxation**: Compliant with Oman VAT regulations (Standard 5%, Zero-Rated 0%, Exempt).
- **Payments**: Exclusive integration with local Omani payment gateways (Thawani Pay and Amwal Pay).

### Target Business Types

Thanks to the dynamic workflow engine and schema-driven UI, the POS supports diverse workflows:
- **Retail** (Grocery, Apparel, Electronics): Standard add-to-cart -> checkout workflow.
- **Service Businesses** (Laundry, Dry Cleaning, Tailors): Intake workflow (capture customer -> take photos -> input garment types -> calculate dynamic pricing -> print intake receipt -> collect payment on delivery).
- **Hospitality & Cafés**: Counter-service billing and order preparation stages.

### Platform Availability

| Platform               | Type              | Purpose                                         |
| ---------------------- | ----------------- | ----------------------------------------------- |
| Web (Back Office)      | Next.js Dashboard | Admin/manager configuration, reports, inventory, workflow builder |
| Web (Billing Terminal) | Next.js POS UI    | Dedicated billing register for desktops/tablets |
| Mobile (Flutter)       | Android & iOS     | Portable billing, intake forms, stock checks    |

---

## 1A. Dynamic Workflow Engine & Schema-Driven UI

### 1A.1 Configurable Order Workflows (State Machine)
- **Custom Stages**: Tenants can define custom order lifecycles (e.g., Retail: Draft -> Paid; Laundry: Intake -> Cleaning -> Ready -> Delivered & Paid).
- **State Transitions**: Define valid paths between states and the triggers required to move an order forward.
- **Side Effects**: Configure actions triggered on state changes (e.g., "Send WhatsApp message to customer when order moves to 'Ready'").

### 1A.2 Schema-Driven Dynamic Forms
- **Intake Form Builder**: Tenants can build custom UI forms for order intake using a drag-and-drop builder.
- **Field Types**: Text, numbers, dropdowns, checkboxes, photo capture (e.g., clothing condition), signature pads.
- **Conditional Logic**: Show/hide fields based on previous answers (e.g., if "Stain Removal" is Yes, show "Stain Type" dropdown).
- **Dynamic Pricing Engine**: Calculate line-item prices dynamically based on form inputs (e.g., Base Price + Material Modifier + Stain Removal Fee).

## 2. Dashboard & Home

### 2.1 Main Dashboard

- **Today's Sales Summary** — Total sales amount, number of transactions, average ticket size
- **Sales Trend Chart** — Line/bar chart showing sales over selectable periods (today, this week, this month, custom range)
- **Top Selling Items** — Ranked list of best-selling products by quantity or revenue
- **Low Stock Alerts** — Items below reorder threshold, with quick-action to create purchase orders
- **Recent Transactions** — Latest 10-20 sales with customer name, amount, payment method
- **Revenue Breakdown** — Pie chart by payment method (cash, card, UPI, etc.)
- **Active Registers** — Status of all registers (open/closed, current session cashier)
- **Store Performance Comparison** — Multi-store revenue comparison (for multi-outlet tenants)

### 2.2 Dashboard Widgets

- Configurable widget layout (drag-and-drop arrangement)
- Time-period selectors on each widget (today / 7 days / 30 days / custom)
- Quick-action buttons: Open Register, New Sale, Add Product, View Reports

### 2.3 Global Search

- Unified search bar across all modules
- Search products by name, SKU, barcode
- Search customers by name, phone, email
- Search invoices/orders by number
- Search employees by name

---

## 3. Billing & Checkout (Register)

### 3.1 Register Interface (POS Screen)

- **Full-screen billing mode** optimized for speed
- **Split-pane layout**: Product search/grid on left, cart/order on right
- **Product Grid View**: Category-organized touch-friendly tiles with images
- **Product List View**: Searchable table with SKU, name, price, stock
- **Quick-search bar** with barcode scan input focus
- **Category tabs/filters** for fast product navigation
- **Keyboard shortcuts** for power users (F-keys for common actions)

### 3.2 Cart / Order Management

- Add items by:
  - Barcode scanning (USB/Bluetooth scanner)
  - Product search (name, SKU)
  - Tapping product tiles
  - Manual entry (custom item with price)
- **Quantity adjustment** — increment/decrement buttons, direct quantity input
- **Price override** — change price per item (with permission check)
- **Line-item discount** — percentage or fixed amount per item
- **Line-item notes** — add notes/instructions per item
- **Remove item** from cart
- **Clear cart** — empty entire cart with confirmation
- **Hold/Park order** — save current cart for later recall
- **Recall held order** — list of all parked orders, select to resume
- **Customer assignment** — attach customer profile to the sale
- **Walk-in customer** — proceed without assigning customer

### 3.3 Order-Level Operations

- **Bill-level discount** — apply overall discount (% or fixed)
- **Bill-level notes** — add notes visible on receipt
- **Salesperson assignment** — attach staff member for commission tracking
- **Order type selection** — Walk-in / Delivery / Pickup
- **Delivery details** — address, phone, delivery date/time for delivery orders

### 3.4 Checkout Flow

1. Review cart items and totals
2. Apply any pending discounts/promotions
3. Select payment method(s)
4. Process payment (cash tendered, card swipe, UPI scan)
5. Print/email/WhatsApp receipt
6. Cash drawer opens (if cash payment)
7. Return to empty register for next customer

### 3.5 Quick Sale

- **Miscellaneous/Quick Sale item** — sell without a product entry (enter description + price)
- Useful for one-off items not in inventory

---

## 4. Inventory Management

### 4.1 Stock Tracking

- **Real-time stock levels** across all outlets and warehouses
- **Stock quantity by location** — per-outlet and per-warehouse view
- **Stock value** — calculated at cost price, selling price, or average cost
- **Stock aging** — items in stock sorted by how long unsold
- **Committed stock** — quantity reserved by pending orders
- **Available stock** — actual sellable quantity (on-hand minus committed)

### 4.2 Stock Adjustments

- **Manual adjustment** — increase or decrease stock with reason codes:
  - Damaged/Broken
  - Theft/Shrinkage
  - Stocktake Correction
  - Gift/Promotional
  - Returned to Vendor
  - Other (custom reason)
- **Adjustment history** — full audit trail of all adjustments with user, timestamp, reason
- **Bulk adjustment** — upload CSV for mass corrections

### 4.3 Stock Transfers

- **Inter-store transfer** — move stock between outlets
- **Store-to-warehouse transfer** — send stock back to warehouse
- **Warehouse-to-store transfer** — fulfill store replenishment
- **Transfer order workflow**:
  1. Create transfer order (source → destination)
  2. Pick and pack at source
  3. Mark as shipped/in-transit
  4. Receive at destination (with quantity verification)
  5. Auto-update stock at both locations
- **Transfer history** — complete log of all transfers
- **VAT on transfers** — apply appropriate VAT for stock transfers if applicable by local laws

### 4.4 Reorder Management

- **Reorder points** — set per product, trigger alerts when stock falls below threshold
- **Reorder quantity** — suggested purchase quantity
- **Auto-generate purchase order** — create PO directly from low-stock alert
- **Email notifications** — alert admins when items hit reorder point
- **Reorder report** — list of all items at or below reorder level

### 4.5 Inventory Valuation

- **FIFO** (First In, First Out) valuation
- **Weighted Average Cost** valuation
- **Inventory summary report** — total stock value across all locations
- **Item-wise valuation** — cost and retail value per product

---

## 5. Product & Catalog Management

### 5.1 Product Information

- **Basic fields**: Name, SKU, Barcode (EAN/UPC), Description, Brand, Unit of Measure
- **Pricing**: Cost price, Selling price (MRP), Wholesale price
- **Tax mapping**: Assign tax group (VAT slab) per product
- **Product images**: Upload multiple images per product (stored on Wasabi, compressed via Sharp, served via Cloudflare CDN)
- **Product status**: Active / Inactive / Discontinued

### 5.2 Product Variants

- **Variant attributes**: Size, Color, Material, Weight, or custom attributes
- **Variant matrix**: Auto-generate variant combinations
- **Per-variant pricing**: Different prices per variant
- **Per-variant stock**: Independent stock tracking per variant
- **Per-variant barcode**: Unique barcode per variant
- **Per-variant images**: Different image per variant

### 5.3 Product Categories & Hierarchies

- **Multi-level categories** — unlimited nesting depth (e.g., Clothing > Men > Shirts > Formal)
- **Category images** — display in POS product grid
- **Category-level discounts** — apply discount to all items in a category
- **Category-level tax** — default tax group per category

### 5.4 Item Groups & Bundles

- **Item Groups** — group related items (same product, different variants)
- **Bundles/Kits** — sell multiple items as a single unit at a bundle price
- **Bundle components** — define items and quantities in a bundle
- **Bundle pricing** — set price lower than sum of components
- **Auto-decrement** — reduce stock of component items when bundle is sold

### 5.5 Product Import/Export

- **CSV import** — bulk upload products with all fields
- **CSV export** — download product catalog
- **Import templates** — downloadable CSV template with column headers
- **Duplicate detection** — warn on duplicate SKU/barcode during import
- **Update via import** — modify existing products through re-import

### 5.6 Units of Measure

- **Predefined units**: Piece, Kg, Gram, Liter, Meter, Box, Pack, Dozen, etc.
- **Custom units**: Define custom UOM
- **Conversion rates**: Define conversions (e.g., 1 Box = 12 Pieces)
- **Sell by weight**: Support for weight-based items with scale integration

---

## 6. Customer Management

### 6.1 Customer Profiles

- **Basic info**: Name, Phone, Email, Date of Birth, Gender
- **Address**: Billing and shipping addresses
- **Tax info**: VAT Number (for B2B customers)
- **Custom fields**: User-defined fields for additional data
- **Customer code**: Auto-generated or manual unique identifier
- **Profile photo**: Optional customer photo

### 6.2 Customer Activity

- **Purchase history** — complete list of all past transactions
- **Total spend** — lifetime value of the customer
- **Visit frequency** — how often they purchase
- **Favorite products** — most-purchased items
- **Last visit date** — recency tracking
- **Outstanding balance** — pending dues for credit customers
- **Credit notes** — active store credits

### 6.3 Customer Groups

- **Group creation** — define customer groups (Wholesale, VIP, Corporate, Regular)
- **Group-level pricing** — assign different price lists per group
- **Group-level discounts** — automatic discounts for group members
- **Group-level loyalty rules** — different points multipliers per group

### 6.4 Customer Search & Quick-Add

- **Search by phone number** — instant lookup during billing
- **Search by name, email, customer code**
- **Quick-add customer** — create minimal profile (name + phone) from POS screen
- **Customer suggestions** — auto-suggest during billing based on phone input

### 6.5 Customer Import/Export

- **CSV import** — bulk upload customer database
- **CSV export** — download customer list
- **Duplicate merge** — merge duplicate customer records

---

## 7. Loyalty & Rewards Program

### 7.1 Points Configuration

- **Points earning rate** — define points per OMR spent (e.g., 1 point per 10 OMR)
- **Category-based earning** — different earning rates per product category
- **Minimum purchase threshold** — minimum bill amount to earn points
- **Points rounding** — round up, down, or nearest

### 7.2 Points Redemption

- **Redemption rate** — define monetary value per point (e.g., 1 point = 1 OMR)
- **Minimum points to redeem** — e.g., minimum 100 points
- **Maximum redemption per transaction** — cap on points used in a single sale (% or absolute)
- **Redemption at POS** — cashier can apply loyalty points during checkout
- **Points balance display** — show available points during billing

### 7.3 Program Management

- **Points expiry** — auto-expire points after configurable duration (e.g., 12 months)
- **Points history** — complete log of earned, redeemed, expired, adjusted points per customer
- **Points adjustment** — admin can manually add/deduct points with reason
- **Automatic reversal** — deduct points if the associated sale is returned/refunded
- **Loyalty tier system** — Bronze/Silver/Gold/Platinum based on spend thresholds (with different multipliers)

---

## 8. Discounts & Promotions

### 8.1 Discount Types

- **Percentage discount** — X% off on item or entire bill
- **Fixed amount discount** — X OMR off on item or entire bill
- **Buy X Get Y Free** — e.g., Buy 2 Get 1 Free
- **Quantity-based discount** — price breaks at volume thresholds (buy 5+, get 10% off)
- **Combo discount** — buy items A + B together for a special price

### 8.2 Promotion Scheduling

- **Start and end date** — time-bound promotions
- **Day-of-week rules** — promotions active only on specific days (e.g., Weekend Sale)
- **Time-of-day rules** — happy hour pricing (e.g., 2PM-5PM discount)
- **Auto-activation** — promotions auto-apply at POS when conditions are met

### 8.3 Promotion Scope

- **Store-specific promotions** — apply to select outlets only
- **Category-specific** — apply to all items in a category
- **Product-specific** — apply to specific products only
- **Customer-group-specific** — exclusive promotions for certain customer groups

### 8.4 Coupon Codes

- **Generate coupon codes** — unique or generic codes
- **Single-use / Multi-use** — control usage limits
- **Coupon value** — percentage or fixed discount
- **Coupon validity** — start/end date
- **Apply at POS** — cashier enters code during checkout
- **Coupon usage tracking** — report on code redemptions

### 8.5 Discount Permissions

- **Role-based discount limits** — restrict max discount percentage per role (e.g., cashier: max 5%, manager: max 20%)
- **Discount approval workflow** — require manager override for discounts above threshold
- **Discount audit log** — track who applied what discount, when

---

## 9. Returns, Refunds & Exchanges

### 9.1 Return Processing

- **Initiate return** — search original invoice by number, date, or customer
- **Partial return** — return selected items from an invoice
- **Full return** — return all items from an invoice
- **Return reason** — mandatory reason selection (Defective, Wrong Item, Customer Changed Mind, etc.)
- **Return condition** — mark items as Resellable or Damaged
- **Stock update** — auto-increment stock for resellable returns; exclude damaged items

### 9.2 Refund Options

- **Cash refund** — refund to cash
- **Original payment method** — refund to card/UPI used for purchase
- **Credit note / Store credit** — issue credit note linked to customer account
- **Refund amount** — auto-calculated or manually adjusted (for partial refunds)

### 9.3 Exchange Workflow

- Return original items → credit applied → customer selects new items → pay difference (if any)
- Price difference handling — customer pays extra or receives partial refund/credit

### 9.4 Credit Notes

- **Auto-generated** on return/refund
- **Linked to customer** — redeemable only by the same customer
- **Partial redemption** — use part of credit note, balance carries forward
- **Expiry** — optional expiry date on credit notes
- **Credit note history** — full log of creation and usage

### 9.5 Return Policies

- **Configurable return window** — define days within which returns are accepted (e.g., 7 days, 15 days, 30 days)
- **Category-level return rules** — some categories non-returnable (e.g., undergarments, perishables)
- **Receipt-required toggle** — require original receipt for returns

---

## 10. Payment Processing

### 10.1 Payment Methods Supported

- **Cash** — with change calculation and OMR denomination entry
- **Credit/Debit Card** — via integrated EDC terminals
- **Payment Gateways** — Integrated digital payments via Thawani Pay and Amwal Pay
- **Bank Transfer / NEFT / RTGS** — for large B2B transactions
- **Cheque** — record cheque details (number, bank, date)
- **Credit Note / Store Credit** — redeem existing credit notes
- **Loyalty Points** — pay with accumulated loyalty points
- **Custom payment methods** — configurable additional methods

### 10.2 Split Payments

- **Multi-tender transactions** — split bill across 2+ payment methods
- **Partial payment** — accept partial payment, record balance as due
- **Due bill / Credit sale** — sell on credit with payment due later
- **Due payment collection** — record subsequent payments against due bills

### 10.3 Payment Gateway Integration (Oman)

- **Thawani Pay**:
  - Secure integration via Secret/Publishable Keys.
  - Payment sessions for checkout redirects.
  - Webhook integration for real-time payment status updates.
- **Amwal Pay**:
  - Secure integration using `secureHashValue` for request authenticity.
  - Dynamic payment link generation (`/MerchantOrder/CreatePaymentLink`).
  - Webhook support for transaction confirmation.

### 10.4 Cash Management

- **Cash denominations** — record denominations during cash counts
- **Cash in/Cash out** — record non-sale cash movements (petty cash, vendor payments, float additions)
- **Expected vs actual cash** — auto-calculate discrepancy at shift end
- **Cash excess/shortage reporting**

---

## 11. Register & Session Management

### 11.1 Register Configuration

- **Create registers** — name, assign to outlet
- **Map register to device** — one register per device at a time
- **Register limits** — maximum registers per plan/subscription
- **Register status** — Active / Inactive

### 11.2 Session Workflow

1. **Open Session** — cashier opens shift, enters opening float (cash amount)
2. **Active Session** — all billing happens within the session context
3. **Cash In/Out** — record non-sale cash movements during session
4. **Close Session** — count cash, enter closing amount with denominations
5. **Session Reconciliation** — system shows expected vs actual, highlights discrepancy

### 11.3 Session Reports

- **Session summary** — total sales, by payment method, discounts given, returns processed
- **Cash movement log** — all cash in/out during the session
- **Salesperson performance** — if multiple staff billed during session
- **Print session report** — end-of-day settlement receipt

### 11.4 Multi-Register Support

- **Multiple registers per outlet** — support multiple billing counters
- **Independent sessions** — each register has its own session
- **Consolidated reporting** — aggregate across all registers

---

## 12. Employee & Role Management

### 12.1 Default Roles

| Role                    | Access Level                                             |
| ----------------------- | -------------------------------------------------------- |
| **Administrator** | Full unrestricted access to all features                 |
| **Store Manager** | Inventory, purchase orders, reports, moderate POS access |
| **Cashier/Staff** | POS billing, limited inventory view, no config access    |

### 12.2 Custom Roles

- **Create custom roles** with granular permissions:
  - **Inventory**: View / Create / Edit / Delete items
  - **Sales/POS**: Process sales / Apply discounts / Process returns / Void transactions
  - **Customers**: View / Create / Edit / Delete customers
  - **Reports**: View / Export / Schedule reports
  - **Settings**: View / Modify settings
  - **Purchase Orders**: Create / Approve / Receive
  - **Registers**: Open/Close sessions
  - **Employees**: Manage users

### 12.3 Employee Management

- **Add employees** — invite via email
- **Assign roles** — one role per employee (or multiple roles)
- **Assign outlets** — restrict employee access to specific stores
- **Employee PIN** — quick login to POS via numeric PIN (for register switching)
- **Activity log** — track all actions performed by each employee
- **Salesperson tracking** — assign salesperson to each transaction for commission tracking

### 12.4 Commission Tracking

- **Commission rules** — percentage or fixed amount per sale
- **Per-product commission** — different rates per product/category
- **Commission reports** — by employee, by period

---

## 13. Multi-Store & Multi-Warehouse Management

### 13.1 Store/Outlet Management

- **Create outlets** — name, address, phone, email, VAT Number
- **Outlet-specific settings** — tax config, receipt template, currency
- **Outlet-specific inventory** — independent stock per outlet
- **Outlet-specific pricing** — different price lists per location (optional)
- **Outlet-specific promotions** — promotions scoped to specific stores
- **Outlet dashboard** — per-store sales and performance metrics

### 13.2 Warehouse Management

- **Create warehouses** — name, address, assign to outlets
- **Warehouse stock** — independent stock tracking
- **Warehouse transfers** — move goods between warehouses and outlets
- **Warehouse as fulfillment center** — for online orders

### 13.3 Centralized Control

- **Head office view** — aggregate dashboard across all outlets
- **Centralized catalog** — single product catalog shared across all stores
- **Centralized pricing** — global price changes propagate to all outlets
- **Centralized promotions** — global promotions applied across all stores
- **Per-outlet override** — ability to override pricing/promotions at outlet level

---

## 14. Purchase Orders & Vendor Management

### 14.1 Vendor Management

- **Vendor profiles** — name, company, contact info, VAT details, bank details
- **Vendor catalog** — which products each vendor supplies
- **Vendor pricing** — vendor-specific cost prices
- **Vendor payment tracking** — track payments due and paid
- **Vendor import/export** — CSV import of vendor list

### 14.2 Purchase Order Workflow

1. **Create PO** — select vendor, add items with quantities and agreed prices
2. **Send PO to vendor** — email or print PO
3. **Receive goods** — record items received (full or partial receipt)
4. **Quality check** — mark items as accepted or rejected
5. **Convert to purchase bill** — finalize and record cost in books
6. **Payment recording** — track payment against the purchase bill

### 14.3 Purchase Order Features

- **Auto-generate PO** — from reorder alerts
- **PO status tracking** — Draft / Sent / Partially Received / Received / Cancelled
- **PO history** — complete log per vendor
- **Multi-vendor PO** — separate POs when reordering from multiple vendors
- **PO approval workflow** — require manager approval for POs above threshold

### 14.4 Goods Receipt

- **Barcode-based receiving** — scan items as they arrive
- **Quantity discrepancy handling** — note short-received or over-received items
- **Batch/Serial assignment** — assign batch numbers or serial numbers on receipt
- **Expiry date recording** — capture expiry dates during goods receipt

---

## 15. Reports & Analytics

### 15.1 Sales Reports

- **Sales Summary** — total sales by period (daily, weekly, monthly, custom)
- **Sales by Item** — revenue and quantity per product
- **Sales by Category** — revenue per product category
- **Sales by Customer** — revenue per customer (top customers)
- **Sales by Salesperson** — performance per employee
- **Sales by Payment Method** — breakdown by cash, card, UPI, etc.
- **Sales by Hour** — peak hours analysis
- **Sales by Day of Week** — busiest day analysis
- **Sales by Outlet** — multi-store comparison

### 15.2 Inventory Reports

- **Stock Summary** — current stock levels across all items
- **Stock Valuation** — total inventory value (at cost / at retail)
- **Stock Movement** — items received, sold, transferred, adjusted over a period
- **Stock Aging** — items sitting unsold for extended periods
- **Low Stock Report** — items below reorder point
- **Dead Stock Report** — items with zero sales over a configurable period
- **Serial/Batch Tracking Report** — status and location of serialized/batched items

### 15.3 Financial Reports

- **Revenue Report** — gross revenue, net revenue after discounts and returns
- **Profit & Loss** — product-level and overall margin analysis
- **Tax Report** — VAT collected, by tax slab, by period
- **Receivables Report** — outstanding customer dues
- **Payables Report** — outstanding vendor dues
- **Expense Report** — track operating expenses

### 15.4 Customer Reports

- **Customer Summary** — total customers, new vs returning
- **Customer Purchase History** — detailed per-customer report
- **Customer Retention** — repeat purchase rate
- **Loyalty Points Report** — points earned, redeemed, expired across customers
- **Credit Note Report** — outstanding credit notes

### 15.5 Employee Reports

- **Employee Sales Summary** — revenue per employee
- **Commission Report** — earned commissions
- **Session/Shift Report** — shift-wise sales and cash movements
- **Activity Log** — chronological action log per employee

### 15.6 Report Features

- **Filters** — date range, outlet, category, customer, employee
- **Export** — PDF, CSV, Excel
- **Schedule reports** — auto-send via email (daily, weekly, monthly)
- **Custom reports** — build reports with selected columns and filters
- **Report dashboards** — save reports as dashboard widgets

---

## 16. Tax & VAT Compliance (Oman)

### 16.1 VAT Configuration

- **VAT Registration Number** — register tenant's Oman VAT ID
- **Tax Rates** — Predefined Oman VAT rates:
  - Standard Rate (5%)
  - Zero-Rated (0% - e.g., essential food, medical equipment)
  - Exempt (No VAT - e.g., residential rent, financial services)
- **Tax-inclusive / Tax-exclusive pricing** — toggle per product or global setting
- **Reverse Charge Mechanism** — support for reverse charge on imported services

### 16.2 Tax Calculation

- **Auto-calculate** — system computes tax based on product tax group and transaction type
- **Tax on discounted price** — calculate tax after discount application
- **Precision** — Tax amounts computed accurately to 3 decimal places (OMR)

### 16.3 Tax Reports

- **VAT Return Summary** — data required for quarterly Oman VAT filings
- **Input/Output VAT matching** — track VAT paid on purchases vs VAT collected on sales
- **Tax Payment Tracker** — track VAT payment deadlines (within 30 days of quarter end)

---

## 17. Hardware Integration

### 17.1 Barcode Scanners

- **USB wired scanners** — plug-and-play, standard HID keyboard emulation
- **Bluetooth wireless scanners** — for mobile POS
- **Camera-based scanning** — use device camera for barcode scanning (mobile app)
- **Supported formats**: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR Code

### 17.2 Receipt Printers

- **Thermal receipt printers** — 58mm and 80mm paper width
- **USB connection** — direct print from desktop
- **Bluetooth printers** — print from mobile devices
- **Network/WiFi printers** — shared printers across registers
- **Print templates** — customizable receipt layouts

### 17.3 Cash Drawers

- **Auto-open** — triggered on cash payment completion
- **Printer-connected** — cash drawer opens via receipt printer kick command
- **USB-connected** — direct connection to POS terminal

### 17.4 Customer-Facing Displays

- **Pole displays** — show item name and price during scanning
- **Secondary screen display** — show total, items, promotional content
- **Digital signage** — display promotions on customer-facing screen

### 17.5 Weighing Scales

- **Digital scale integration** — for items sold by weight
- **Auto-populate weight** — weight from scale auto-fills quantity in POS
- **Weight-embedded barcodes** — support for barcodes that encode weight

### 17.6 EDC Terminals

- **Pine Labs** — integrated card payment terminal
- **PayTM EDC** — PayTM soundbox and EDC
- **Generic terminals** — manual entry of transaction reference number

---

## 18. Offline Mode & Sync

### 18.1 Offline Capabilities

- **Offline billing** — create sales when internet is down
- **Offline product catalog** — locally cached product database
- **Offline customer lookup** — search recently used customers
- **Offline payment recording** — record cash/card payments
- **Offline returns** — process returns offline

### 18.2 Sync Mechanism

- **Auto-sync on reconnect** — all offline transactions sync automatically when internet returns
- **Manual sync trigger** — force sync from settings
- **Sync status indicator** — visual indicator showing sync state (synced / pending / syncing)
- **Conflict resolution** — handle inventory conflicts (e.g., item sold in offline when stock was already 0)
- **Sync queue** — pending transactions queued in order

### 18.3 Offline Limitations

- Credit card processing requires connectivity (queued for retry)
- Loyalty points balance may be stale
- Real-time inventory across outlets not available

---

## 19. Receipt & Invoice Customization

### 19.1 Receipt Template

- **Logo upload** — business logo on receipt header (served via Cloudflare CDN)
- **Business name & details** — name, address, phone, VAT Number
- **Receipt fields**: Invoice number, date/time, cashier name, customer name
- **Item details**: Product name, SKU, quantity, unit price, discount, tax, subtotal
- **Totals section**: Subtotal, discount total, tax breakup (VAT), grand total
- **Payment details**: Payment method, amount tendered, change returned
- **Custom footer**: Thank you message, return policy, promotional text
- **Loyalty points**: Points earned / redeemed / balance

### 19.2 Invoice Format & Paper Sizes

- **Format customization** — resize and customize layout to fit all types of paper sizes.
- **A4 invoice** — standard full-page invoice for B2B customers with full VAT details
- **A5 invoice** — compact invoice format for efficient printing
- **Thermal paper rolls [5.4]** — optimized for electronic point-of-sale (POS) receipt printers (58mm/80mm)
- **Tax invoice** — compliant with Oman VAT invoice rules
- **Delivery challan** — for stock transfers
- **Quotation/Estimate** — for prospective customers

### 19.3 Digital Receipts

- **WhatsApp receipt** — send receipt link or PDF automatically via WhatsApp (Messaging Module)
- **Email receipt** — send PDF receipt to customer email
- **QR code receipt** — scan to view digital receipt

---

## 20. Barcode Management

### 20.1 Barcode Generation

- **Auto-generate barcodes** — create barcode for products without one
- **Barcode formats**: EAN-13, EAN-8, UPC-A, Code 128, Code 39
- **QR Code generation** — for products or payment
- **Batch barcode generation** — generate barcodes for all products at once

### 20.2 Barcode Label Printing

- **Label templates** — predefined templates for common label sizes
- **Custom label design** — configurable layout with:
  - Product name
  - Barcode image
  - Price (MRP, selling price)
  - SKU
  - Size/Color variant info
  - Batch/Expiry info
- **Paper sizes**: A4 sheet labels, A7, A8, continuous roll, custom
- **Bulk printing** — print labels for multiple products at once
- **Print quantity** — specify number of labels per product

### 20.3 Barcode Scanning in Operations

- **POS billing** — scan to add items to cart
- **Inventory receiving** — scan to record goods receipt
- **Stock count** — scan for physical inventory audits
- **Stock transfers** — scan to pick items for transfer

---

## 21. Online Store & Omnichannel

### 21.1 Online Store (Mobile Store)

- **Branded storefront** — tenant-branded online ordering page
- **Shareable link** — distribute via WhatsApp, social media
- **Product catalog sync** — auto-sync from POS product catalog
- **Online ordering** — customers place orders for pickup or delivery
- **Order notifications** — notify store of new online orders
- **Order management** — accept, prepare, and fulfill online orders

### 21.2 Omnichannel Inventory

- **Unified inventory** — single stock pool for online and in-store
- **Channel-specific stock** — reserve stock for specific channels
- **Real-time sync** — stock updates reflect across all channels instantly

### 21.3 E-Commerce Integration

- **Shopify sync** — sync products, orders, and inventory with Shopify store
- **Custom website** — API-based integration with any e-commerce platform

---

## 22. Notifications & Alerts

### 22.1 Inventory Alerts

- Low stock warning (at reorder point)
- Out of stock alert
- Expiry approaching alert (for batch-tracked items)
- Stock transfer received notification

### 22.2 Sales Alerts

- Daily sales summary notification
- Large transaction alert
- Void/cancel transaction alert
- Return/refund processed alert

### 22.3 System Alerts

- Offline mode activated/deactivated
- Sync failure notification
- Subscription expiry warning
- New employee login alert

### 22.4 Delivery Channels

- In-app notifications (bell icon)
- Email notifications
- WhatsApp notifications (configurable via Messaging Module)
- Push notifications (mobile app)

---

## 23. Settings & Configuration

### 23.1 Business Settings

- Business name, address, logo, phone, email
- VAT Number, Commercial Registration numbers
- Financial year start month
- Default currency
- Language preference (multilingual support)

### 23.2 POS Settings

- Default receipt template
- Auto-print receipt (on/off)
- Allow negative stock selling (on/off)
- Default payment method
- Quick-sale item configuration
- Keyboard shortcut mapping

### 23.3 Inventory Settings

- Stock tracking method (FIFO / Weighted Average)
- Low stock threshold defaults
- Allow selling below cost price (on/off)
- Auto-generate SKU (on/off)
- Barcode format preference

### 23.4 Tax Settings

- VAT registration type
- VAT Number
- Default tax preference (inclusive/exclusive)
- Tax rate definitions
- Tax group definitions
- Exemption configurations

### 23.5 Payment Settings

- Enabled payment methods
- Payment gateway credentials
- UPI merchant ID
- EDC terminal mapping
- Partial payment policy (allow/disallow)

### 23.6 Customer Settings

- Mandatory fields for customer creation
- Customer code format
- Loyalty program toggle
- Loyalty earning and redemption rates
- Default customer group

### 23.7 Notification Settings

- Toggle per alert type
- Email recipients for each alert category
- WhatsApp notification toggle

---

## 24. Platform Admin (Super Admin) Features

> These features are accessible at `/platform/pos` and are used by DeltCRM platform operators to manage POS across tenants.

### 24.1 POS Module Management

- **Enable/Disable POS module** per tenant
- **POS subscription plans** — define POS-specific plan tiers (Free, Standard, Professional, Premium)
- **Feature gating** — control which features are available per plan
- **Usage limits** — set limits per plan (registers, users, transactions, outlets)

### 24.2 POS Plan Configuration

| Feature                | Free | Standard  | Professional | Premium   |
| ---------------------- | ---- | --------- | ------------ | --------- |
| Users                  | 1    | 3         | 10           | 15        |
| Registers              | 1    | 1         | 3            | 5         |
| POS Transactions/month | 50   | Unlimited | Unlimited    | Unlimited |
| Outlets                | 1    | 1         | 3            | 10        |
| Loyalty Program        | ❌   | ❌        | ✅           | ✅        |
| Session/Cash Tracking  | ❌   | ❌        | ✅           | ✅        |
| Advanced Reports       | ❌   | ✅        | ✅           | ✅        |
| API Access             | ❌   | ❌        | ✅           | ✅        |

### 24.3 Tenant POS Dashboard (Platform View)

- Active POS tenants count
- Total transactions across platform
- Revenue metrics (if billing is managed)
- Tenant POS subscription status
- POS module health/uptime

### 24.4 Global Configuration

- Default tax templates
- Default receipt templates
- Payment gateway global settings
- Hardware compatibility list
- Feature flag management for POS features

---

## 25. Integrations

### 25.1 Internal Integrations (DeltCRM)

- **Attendance Module** — POS cashier sessions linked to attendance records
- **Employee Module** — shared employee database
- **Tenant/Billing Module** — POS subscription as part of tenant billing

### 25.2 Accounting Integration

- **Zoho Books / Tally** — sync sales, purchases, expenses
- **Auto journal entries** — sales and purchase transactions auto-posted
- **Tax filing data export** — export VAT data for filing

### 25.3 Payment Integrations

- Razorpay, Pine Labs, PhonePe, PayTM (as listed in Section 10.3)

### 25.4 E-Commerce Integration

- Shopify, WooCommerce, Zoho Commerce

### 25.5 Communication

- WhatsApp Business API (Messaging Module) — digital receipts, order updates, promotional messages
- Email (Resend) — receipt delivery, reports

### 25.6 API

- **REST API** — full CRUD for products, customers, orders, inventory
- **Webhook support** — event-based callbacks (new sale, stock change, etc.)
- **API key management** — generate and manage API keys per tenant
- **Rate limiting** — per-plan API rate limits

---

## 26. Mobile POS Features

### 26.1 Mobile Billing

- Full POS register functionality on mobile
- Touch-optimized product grid
- Camera barcode scanning
- Bluetooth printer support
- Offline billing

### 26.2 Mobile Inventory

- Stock check by scanning barcode
- Physical stock count via mobile
- Goods receiving (scan and count)
- Stock transfer initiation

### 26.3 Mobile Management

- View sales reports on the go
- Approve purchase orders
- Customer lookup
- Low stock alerts via push notification

### 26.4 Line-Busting

- Staff uses phone/tablet to bill customers on the floor
- Reduce checkout queue during peak hours
- Pay at counter or on device (if integrated payment)

---

## 27. Security & Audit

### 27.1 Access Security

- Role-based access control (RBAC) at every level
- PIN-based register login for quick cashier switching
- Session timeout configuration
- IP-based access restriction (back office)

### 27.2 Audit Trail

- **Transaction log** — every sale, return, void with timestamp and user
- **Inventory audit log** — every stock change with reason and user
- **Price change log** — track all price modifications
- **Discount log** — all discounts applied with user and reason
- **Settings change log** — all configuration changes
- **Login/logout log** — all user sessions

### 27.3 Data Security

- Tenant data isolation (RLS)
- Encrypted storage for sensitive data (payment info, VAT Number)
- HTTPS-only API communication
- Regular backup procedures

### 27.4 Compliance

- VAT-compliant invoicing
- Digital receipt archival
- Financial data retention policies
- FSSAI number display (for food businesses)

---

## Appendix A: Feature Priority Matrix

| Priority          | Feature Area                                                         | Sprint Target |
| ----------------- | -------------------------------------------------------------------- | ------------- |
| P0 (Must Have)    | Product catalog, basic billing, cart, cash payment, receipt printing | Sprint 1      |
| P0 (Must Have)    | Inventory tracking, stock levels, basic reports                      | Sprint 1      |
| P0 (Must Have)    | VAT compliance, tax calculation                                      | Sprint 1      |
| P0 (Must Have)    | Customer management, basic profiles                                  | Sprint 2      |
| P0 (Must Have)    | Register & session management                                        | Sprint 2      |
| P1 (Should Have)  | Multi-payment methods (card, UPI)                                    | Sprint 2      |
| P1 (Should Have)  | Returns, refunds, credit notes                                       | Sprint 2      |
| P1 (Should Have)  | Employee roles & permissions                                         | Sprint 3      |
| P1 (Should Have)  | Discounts & promotions                                               | Sprint 3      |
| P1 (Should Have)  | Barcode management                                                   | Sprint 3      |
| P2 (Nice to Have) | Loyalty program                                                      | Sprint 4      |
| P2 (Nice to Have) | Multi-store management                                               | Sprint 4      |
| P2 (Nice to Have) | Purchase orders & vendors                                            | Sprint 4      |
| P2 (Nice to Have) | Advanced reports & analytics                                         | Sprint 5      |
| P2 (Nice to Have) | Offline mode                                                         | Sprint 5      |
| P3 (Future)       | Online store / Omnichannel                                           | Sprint 6+     |
| P3 (Future)       | Mobile POS                                                           | Sprint 6+     |
| P3 (Future)       | Weighing scale integration                                           | Sprint 6+     |
| P3 (Future)       | Customer-facing display                                              | Sprint 6+     |

---

## Appendix B: Glossary

| Term            | Definition                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| **POS**   | Point of Sale — the location/system where a retail transaction takes place |
| **SKU**   | Stock Keeping Unit — unique product identifier                             |
| **EAN**   | European Article Number — barcode standard (EAN-13)                        |
| **UPC**   | Universal Product Code — barcode standard (UPC-A)                          |
| **VAT Number** | Value Added Tax Identification Number                                      |
| **EDC**   | Electronic Data Capture — card payment terminal                            |
| **KOT**   | Kitchen Order Ticket — order ticket sent to kitchen                        |
| **KDS**   | Kitchen Display System — digital display in kitchen                        |
| **MRP**   | Maximum Retail Price                                                        |
| **UOM**   | Unit of Measure                                                             |
| **FIFO**  | First In, First Out — inventory valuation method                           |
| **RLS**   | Row-Level Security — database isolation mechanism                          |
| **EOD**   | End of Day — daily closing/settlement process                              |
