# DeltCRM POS — User Flows & Journey Maps

> Complete documentation of every user-facing flow in the POS system.
> Covers all tenant roles: **Administrator**, **Store Manager**, **Cashier/Staff**.
> Currency: **OMR (Omani Rial)** — 3 decimal places throughout.

---

## Table of Contents

1. [Onboarding & First-Time Setup](#1-onboarding--first-time-setup)
2. [Daily Operations — Opening the Store](#2-daily-operations--opening-the-store)
3. [Billing & Checkout Flows](#3-billing--checkout-flows)
4. [Dynamic Workflow Flows (Service Businesses)](#4-dynamic-workflow-flows-service-businesses)
5. [Customer Management Flows](#5-customer-management-flows)
6. [Inventory Management Flows](#6-inventory-management-flows)
7. [Product & Catalog Management Flows](#7-product--catalog-management-flows)
8. [Returns, Refunds & Exchange Flows](#8-returns-refunds--exchange-flows)
9. [Payment Processing Flows](#9-payment-processing-flows)
10. [Discount & Promotion Flows](#10-discount--promotion-flows)
11. [Loyalty Program Flows](#11-loyalty-program-flows)
12. [Purchase Order & Vendor Flows](#12-purchase-order--vendor-flows)
13. [Multi-Store & Transfer Flows](#13-multi-store--transfer-flows)
14. [Receipt & Invoice Flows](#14-receipt--invoice-flows)
15. [Barcode Management Flows](#15-barcode-management-flows)
16. [Reports & Analytics Flows](#16-reports--analytics-flows)
17. [Employee & Role Management Flows](#17-employee--role-management-flows)
18. [Daily Operations — Closing the Store](#18-daily-operations--closing-the-store)
19. [Workflow Builder & Settings Flows](#19-workflow-builder--settings-flows)
20. [Notification & Alert Flows](#20-notification--alert-flows)
21. [Offline Mode Flows](#21-offline-mode-flows)
22. [Online Store & Omnichannel Flows](#22-online-store--omnichannel-flows)
23. [Platform Admin (Super Admin) Flows](#23-platform-admin-super-admin-flows)

---

## 1. Onboarding & First-Time Setup

**Actor**: Administrator (Tenant Owner)

### Flow 1.1 — Initial POS Module Activation

```
Login to DeltCRM Dashboard
    └── Navigate to Settings → Modules
        └── Locate "Point of Sale" module
            └── Click "Activate"
                └── System provisions POS database tables for tenant
                    └── Redirect to POS Setup Wizard
```

### Flow 1.2 — POS Setup Wizard

```
Step 1: Business Details
    ├── Enter Business Name, Address, Phone
    ├── Upload Business Logo (→ Sharp compression → Wasabi upload → Cloudflare CDN URL)
    ├── Enter VAT Number
    └── Select VAT Registration Type

Step 2: Tax Configuration
    ├── System pre-loads Oman VAT defaults (5% Standard, 0% Zero-Rated, Exempt)
    ├── Toggle Tax-Inclusive vs Tax-Exclusive pricing
    └── Create custom tax groups if needed

Step 3: First Outlet
    ├── Enter Outlet Name, Address, Phone
    └── System creates default outlet

Step 4: First Register
    ├── Enter Register Name (e.g., "Counter 1")
    └── Assign to outlet

Step 5: Payment Methods
    ├── Enable Cash (default ON)
    ├── Configure Thawani Pay (enter Secret Key, Publishable Key)
    └── Configure Amwal Pay (enter Merchant ID, Secure Hash Secret)

Step 6: Receipt Template
    ├── Select paper size (A4 / A5 / Thermal 58mm / Thermal 80mm)
    ├── Customize header text
    ├── Customize footer text (return policy, thank you message)
    └── Preview receipt

Step 7: Workflow Selection
    ├── Select business type:
    │   ├── "Retail / General" → Uses default Draft → Paid workflow
    │   ├── "Service Business (Laundry, Tailor)" → Guided custom workflow builder
    │   └── "Custom" → Opens full workflow builder
    └── Confirm and Finish Setup

    └── 🎉 POS Dashboard opens for the first time
```

### Flow 1.3 — Invite Team Members

```
Navigate to POS → Employees
    └── Click "Invite Employee"
        ├── Enter Name, Email, Phone
        ├── Select Role (Administrator / Store Manager / Cashier)
        ├── Assign to Outlet(s)
        ├── Set Employee PIN (4-6 digit numeric code for quick POS login)
        └── Click "Send Invite"
            └── System sends invitation email via Resend
                └── Employee receives link → Sets password → Ready to login
```

---

## 2. Daily Operations — Opening the Store

**Actor**: Cashier / Store Manager

### Flow 2.1 — Cashier Login & Session Opening

```
Cashier arrives at POS terminal
    └── Navigate to /pos/billing
        └── System detects no active session on this register
            └── "Open Session" screen appears
                ├── Select Register (if multiple)
                ├── Enter Employee PIN (or login credentials)
                ├── Count opening cash float
                ├── Enter Opening Float Amount (e.g., 50.000 OMR)
                └── Click "Open Session"
                    └── ✅ Register is now ACTIVE
                        └── Full-screen billing interface loads
                            └── Ready for first customer
```

### Flow 2.2 — Manager Opens Dashboard

```
Store Manager logs in
    └── Lands on /pos (POS Dashboard)
        ├── Reviews Today's Sales Summary widget (starts at 0.000 OMR)
        ├── Checks Low Stock Alerts panel
        │   └── If items below reorder point → Quick action: "Create PO"
        ├── Reviews Active Registers (sees which cashiers are online)
        └── Checks pending tasks:
            ├── Pending purchase orders awaiting approval
            ├── Stock transfers awaiting receipt
            └── Expiring promotions
```

---

## 3. Billing & Checkout Flows

**Actor**: Cashier

### Flow 3.1 — Standard Retail Sale (Walk-In Customer)

```
Customer approaches counter
    └── Cashier is on full-screen POS Billing UI (/pos/billing)

Adding Items to Cart:
    ├── Method A: Scan barcode with USB scanner
    │   └── Product auto-added to cart (quantity = 1, auto-increments on rescan)
    ├── Method B: Type in search bar (product name or SKU)
    │   └── Select from dropdown → Added to cart
    ├── Method C: Tap product tile from category grid
    │   └── Added to cart
    └── Method D: Quick Sale (no product entry)
        ├── Enter description: "Custom Item"
        ├── Enter price: 3.500 OMR
        └── Added to cart

Cart Operations:
    ├── Adjust quantity (+/- buttons or direct input)
    ├── Apply line-item discount (5% or 0.500 OMR off)
    ├── Add line-item note ("Gift wrap this item")
    ├── Override price (requires pos.sale.price.override permission)
    │   └── If cashier lacks permission → "Manager Override Required" modal
    │       └── Manager enters their PIN → Price override approved
    └── Remove item (swipe left or click X)

Order-Level Actions:
    ├── Apply bill-level discount (10% off entire order)
    ├── Attach Customer (search by phone → select profile)
    │   └── System shows loyalty points balance if customer found
    ├── Assign Salesperson (for commission tracking)
    └── Add order notes

Checkout:
    ├── Click "Pay" or press F12 (keyboard shortcut)
    ├── Payment modal opens showing:
    │   ├── Cart Summary (items, subtotal, discount, VAT, total)
    │   └── Total Due: 25.750 OMR
    ├── Select Payment Method:
    │   ├── Cash:
    │   │   ├── Enter amount tendered: 30.000 OMR
    │   │   └── System calculates change: 4.250 OMR
    │   ├── Card (Thawani Pay):
    │   │   ├── System creates Thawani payment session
    │   │   ├── Customer completes payment on terminal/redirect
    │   │   └── Webhook confirms → Transaction marked COMPLETED
    │   ├── Card (Amwal Pay):
    │   │   ├── System generates Amwal payment link
    │   │   ├── Customer scans QR / taps link
    │   │   └── Webhook confirms → Transaction marked COMPLETED
    │   └── Split Payment:
    │       ├── 10.000 OMR Cash + 15.750 OMR Thawani Pay
    │       └── Each payment recorded as separate PosSalePayment record
    ├── Click "Complete Sale"
    │   └── Backend atomic transaction:
    │       ├── Create PosSale record
    │       ├── Create PosSaleItem records (product name/SKU snapshotted)
    │       ├── Create PosSalePayment records
    │       ├── Decrement PosStock for each item
    │       ├── Award loyalty points (if customer attached and loyalty enabled)
    │       └── Generate invoice number (INV-00001)
    ├── Cash drawer opens automatically (if cash payment)
    ├── Receipt actions:
    │   ├── Auto-print thermal receipt (if auto-print is ON)
    │   ├── Send via WhatsApp (if customer has phone)
    │   ├── Send via Email (via Resend, if customer has email)
    │   └── Show QR code on screen (customer can scan)
    └── Register resets → Ready for next customer
```

### Flow 3.2 — Hold / Park Order & Recall

```
Cashier has items in cart but customer steps away
    └── Click "Hold Order" (or press F8)
        ├── Enter optional hold note: "Customer checking more items"
        └── Order saved as DRAFT status
            └── Cart clears → Ready for next customer

Later, customer returns:
    └── Click "Recall" (or press F9)
        └── List of all held orders appears:
            ├── Shows: Hold time, item count, total amount, note
            └── Click on the held order
                └── Cart repopulates with all original items
                    └── Continue checkout normally
```

### Flow 3.3 — Delivery / Pickup Order

```
Customer calls to place order for delivery
    └── Cashier clicks "Order Type" toggle → selects "Delivery"
        ├── Add items to cart normally
        ├── Attach or create customer
        ├── Enter delivery details:
        │   ├── Delivery address
        │   ├── Phone number
        │   ├── Preferred date/time
        │   └── Delivery notes
        ├── Process payment (or mark as "Due" for cash-on-delivery)
        └── Complete sale
            └── Order appears in /pos/orders with status and delivery info
```

---

## 4. Dynamic Workflow Flows (Service Businesses)

**Actor**: Cashier / Service Staff

### Flow 4.1 — Laundry Intake (Multi-Stage Workflow)

```
Customer brings clothes for laundry service
    └── Cashier is on POS Billing UI with "Laundry Intake" workflow active

STAGE 1: INTAKE (Initial State)
    ├── System shows dynamic "Intake Form" (configured by tenant via Form Builder):
    │   ├── Customer Search (phone number) → Attach existing or create new
    │   ├── Upload Photos:
    │   │   ├── Tap "Capture Photo" → Opens camera
    │   │   ├── Photo taken of each clothing item
    │   │   └── Photos compressed via Sharp → Uploaded to Wasabi → CDN URL stored
    │   ├── Garment Type: Dropdown (Shirt, Trouser, Suit, Saree, etc.)
    │   ├── Material: Dropdown (Cotton, Silk, Polyester, Wool, etc.)
    │   ├── Condition: Checkboxes (Stains, Tears, Missing Buttons)
    │   ├── Special Instructions: Text area
    │   └── Service Type: Dropdown (Wash & Iron, Dry Clean, Iron Only)
    ├── Dynamic Pricing Engine calculates price:
    │   ├── Base Price (by garment type): Shirt = 0.500 OMR
    │   ├── Material Modifier: Silk = +0.300 OMR
    │   ├── Stain Removal Fee: +0.200 OMR
    │   └── Total per item: 1.000 OMR
    ├── Repeat for each garment (adding each to the "cart")
    └── Click "Save Intake"
        ├── PosSale created with status = INTAKE (custom workflow state)
        ├── PosSaleFieldData stores all form answers and photo URLs
        ├── Print Intake Receipt (customer copy):
        │   ├── Lists all garments with photos
        │   ├── Estimated total: 5.500 OMR
        │   └── Expected pickup date
        └── Customer leaves with intake receipt

STAGE 2: CLEANING (Processing)
    └── Back-office staff navigates to /pos/orders
        ├── Filter by status: "Intake" → sees pending laundry orders
        ├── Click on order → View all garment details and photos
        ├── Click "Move to Cleaning"
        │   └── Workflow state changes: Intake → Cleaning
        │       └── WhatsApp message sent automatically:
        │           "Your laundry order #ORD-00012 is now being processed."
        └── Staff processes the garments

STAGE 3: READY FOR PICKUP
    └── Staff finishes cleaning
        └── Click "Mark as Ready"
            └── Workflow state changes: Cleaning → Ready
                └── WhatsApp message sent automatically:
                    "Your laundry is ready for pickup! Order #ORD-00012."

STAGE 4: DELIVERED & PAID (Final State)
    └── Customer arrives to collect
        └── Cashier searches order by number or customer phone
            ├── Reviews order details
            ├── Customer verifies items received
            ├── Finalize bill (any adjustments if needed)
            ├── Process payment (Cash / Thawani / Amwal)
            ├── Click "Complete & Deliver"
            │   └── Workflow state: Ready → Delivered & Paid
            │       ├── Inventory effects applied (if service items tracked)
            │       ├── Loyalty points awarded
            │       └── Final receipt generated
            └── Print/WhatsApp final bill with payment confirmation
```

### Flow 4.2 — Tailoring Intake (Another Workflow Example)

```
Customer visits tailor shop
    └── Workflow: "Tailoring"

INTAKE STATE:
    ├── Dynamic form:
    │   ├── Customer details (attach/create)
    │   ├── Garment type: Thobe, Abaya, Suit, Dress, etc.
    │   ├── Measurements: JSON form fields for bust, waist, length, sleeve, etc.
    │   ├── Fabric type: (Customer-provided vs. shop fabric)
    │   ├── Photo of reference design
    │   ├── Special instructions
    │   └── Estimated delivery date
    ├── Pricing: Base + fabric cost + complexity
    └── Advance payment collected → Mark as Intake Complete

CUTTING STATE → STITCHING STATE → FITTING STATE:
    ├── Each transition sends WhatsApp update
    └── Staff moves order through states from /pos/orders

READY STATE:
    ├── Customer notified
    ├── Customer arrives for fitting
    └── If alterations needed → moves back to STITCHING (allowed transition)

DELIVERED & PAID:
    └── Balance payment collected → Final bill printed
```

---

## 5. Customer Management Flows

**Actor**: Cashier / Store Manager

### Flow 5.1 — Create New Customer

```
Navigate to /pos/customers
    └── Click "Add Customer"
        ├── Enter Name (required)
        ├── Enter Phone (required, unique per tenant)
        ├── Enter Email (optional)
        ├── Enter Date of Birth, Gender
        ├── Enter Billing Address, Shipping Address
        ├── Enter VAT Number (for B2B customers)
        ├── Select Customer Group (VIP, Wholesale, Regular, etc.)
        ├── Upload Profile Photo (optional)
        ├── Fill Custom Fields (if tenant configured any)
        └── Click "Save Customer"
            └── ✅ Customer created with auto-generated code (e.g., CUST-00045)
```

### Flow 5.2 — Quick-Add Customer from POS Billing

```
During checkout, cashier wants to attach a customer:
    └── Click "Customer" button in cart panel
        └── Search by phone number
            ├── If found → Select customer → Attached to sale
            └── If not found → "Create New" button
                ├── Minimal form: Name + Phone
                ├── Click "Create & Attach"
                └── Customer created and attached to current sale
```

### Flow 5.3 — View Customer Profile & History

```
Navigate to /pos/customers → Click on a customer
    └── Customer Detail Page:
        ├── Profile Info: Name, phone, email, addresses, VAT number
        ├── Summary Cards:
        │   ├── Total Spend: 1,250.500 OMR
        │   ├── Visit Count: 23
        │   ├── Loyalty Points: 340
        │   ├── Active Credit Notes: 2 (15.000 OMR balance)
        │   └── Last Visit: 3 days ago
        ├── Purchase History Tab:
        │   └── Table of all past invoices (date, amount, items, payment method)
        ├── Loyalty Tab:
        │   └── Points ledger (earned, redeemed, expired, adjusted)
        ├── Credit Notes Tab:
        │   └── List of active/used/expired credit notes
        └── Actions:
            ├── Edit Profile
            ├── Manually Adjust Loyalty Points (with reason)
            ├── Issue Manual Credit Note
            └── Merge with Duplicate Customer
```

### Flow 5.4 — Bulk Import Customers

```
Navigate to /pos/customers → Click "Import"
    ├── Download CSV Template
    ├── Fill template (name, phone, email, group, etc.)
    ├── Upload CSV file
    ├── Preview: System shows imported data with validation:
    │   ├── ✅ Valid rows
    │   ├── ⚠️ Duplicate phone numbers (merge or skip)
    │   └── ❌ Invalid data (missing required fields)
    └── Click "Import"
        └── Customers created in bulk
```

---

## 6. Inventory Management Flows

**Actor**: Store Manager / Inventory Staff

### Flow 6.1 — View Stock Levels

```
Navigate to /pos/inventory
    └── Stock Overview Dashboard:
        ├── Summary Cards:
        │   ├── Total Products: 450
        │   ├── In Stock: 380
        │   ├── Low Stock: 42
        │   ├── Out of Stock: 28
        │   └── Total Stock Value: 12,450.000 OMR
        ├── Filters: Outlet, Category, Stock Status, Search
        └── Stock Table:
            ├── Product Name | SKU | Category | On Hand | Committed | Available | Cost | Value
            ├── Click any row → Product Stock Detail:
            │   ├── Stock by outlet/warehouse
            │   ├── Stock movement history (in/out over time)
            │   └── Batch details (if batch-tracked)
            └── Export to CSV/Excel
```

### Flow 6.2 — Manual Stock Adjustment

```
Navigate to /pos/inventory → Select Product → Click "Adjust Stock"
    └── Adjustment Form:
        ├── Select Outlet / Warehouse
        ├── Select Adjustment Type:
        │   ├── Damage / Broken
        │   ├── Theft / Shrinkage
        │   ├── Stocktake Correction
        │   ├── Gift / Promotional
        │   ├── Return to Vendor
        │   └── Other (custom reason)
        ├── Enter Quantity: +5 or -3
        ├── Enter Reason / Notes: "3 items damaged in transit"
        └── Click "Submit Adjustment"
            ├── PosStock updated immediately
            ├── PosStockAdjustment record created (immutable audit trail)
            └── ✅ "Stock adjusted successfully"
```

### Flow 6.3 — Physical Stock Count (Stocktake)

```
Navigate to /pos/inventory → Click "Stock Count"
    ├── Select Outlet
    ├── Select Category (or All Products)
    ├── System generates count sheet:
    │   └── Product | SKU | Expected Qty | Actual Qty (blank) | Difference
    ├── Staff counts items physically:
    │   ├── Scan barcode → Enter actual quantity
    │   └── Repeat for all items
    ├── Review Differences:
    │   ├── ✅ Matching items
    │   ├── ⚠️ Discrepancies (Expected: 20, Actual: 17 → -3)
    │   └── Summary: X items matched, Y have variance
    └── Click "Apply Adjustments"
        └── System creates stock adjustments for all discrepancies
            └── Reason: "Stocktake Correction"
```

### Flow 6.4 — Stock Transfer Between Outlets

```
Navigate to /pos/inventory/transfers → Click "New Transfer"
    ├── Select Source Outlet: "Main Store"
    ├── Select Destination Outlet: "Branch Store"
    ├── Add Items:
    │   ├── Search/scan products
    │   ├── Enter transfer quantity for each
    │   └── System validates: source has sufficient stock
    ├── Add Notes: "Monthly branch replenishment"
    └── Click "Create Transfer" → Status: DRAFT

Source Outlet Manager:
    └── Reviews transfer → Click "Ship"
        ├── Status: DRAFT → IN_TRANSIT
        └── Stock at source: Quantity moves to "committed"

Destination Outlet Manager:
    └── Receives notification → Navigate to /pos/inventory/transfers
        └── Click on transfer → "Receive Goods"
            ├── Verify quantities (scan barcodes)
            ├── Enter received quantities (may differ from sent)
            ├── Note discrepancies if any
            └── Click "Confirm Receipt"
                ├── Status: IN_TRANSIT → RECEIVED
                ├── Source stock decremented
                ├── Destination stock incremented
                └── Transfer history recorded
```

---

## 7. Product & Catalog Management Flows

**Actor**: Store Manager / Administrator

### Flow 7.1 — Add New Product

```
Navigate to /pos/products → Click "Add Product"
    └── Product Form:
        ├── Basic Info:
        │   ├── Name: "Organic Coffee Beans 250g"
        │   ├── SKU: Auto-generated or manual (e.g., "COF-ORG-250")
        │   ├── Barcode: Scan or enter manually (EAN-13)
        │   ├── Description: Rich text description
        │   ├── Brand: "Al Jabal Coffee"
        │   └── Unit of Measure: Select from list (PCS, KG, LTR, etc.)
        ├── Pricing:
        │   ├── Cost Price: 2.500 OMR
        │   ├── Selling Price: 4.500 OMR
        │   ├── MRP: 5.000 OMR (optional)
        │   └── Wholesale Price: 3.800 OMR (optional)
        ├── Tax:
        │   ├── Select Tax Group: "Standard VAT 5%"
        │   └── VAT Code (optional): for compliance
        ├── Category: Select from tree (Beverages > Coffee)
        ├── Images:
        │   ├── Upload product photos (drag & drop)
        │   └── Each image: → Sharp compress → Wasabi upload → Cloudflare CDN URL stored
        ├── Inventory:
        │   ├── Track Inventory: ON
        │   ├── Allow Negative Stock: OFF
        │   ├── Reorder Point: 10
        │   ├── Reorder Quantity: 50
        │   └── Initial Stock: Enter opening stock per outlet
        ├── Variants (if applicable):
        │   ├── Toggle "Has Variants": ON
        │   ├── Define attributes: Size (250g, 500g, 1kg)
        │   ├── System generates variant matrix:
        │   │   ├── COF-ORG-250 → 4.500 OMR
        │   │   ├── COF-ORG-500 → 8.000 OMR
        │   │   └── COF-ORG-1KG → 14.500 OMR
        │   └── Set individual SKUs, barcodes, prices per variant
        └── Click "Save Product"
            └── ✅ Product created and visible in POS billing grid
```

### Flow 7.2 — Bulk Import Products via CSV

```
Navigate to /pos/products → Click "Import"
    ├── Download CSV Template (with column headers)
    ├── Fill: Name, SKU, Barcode, Cost Price, Selling Price, Tax Group, Category, Stock
    ├── Upload CSV
    ├── Mapping: System auto-maps columns, user can adjust
    ├── Validation Preview:
    │   ├── ✅ 245 valid products
    │   ├── ⚠️ 12 duplicate SKUs (update existing? skip?)
    │   └── ❌ 3 rows with errors (missing name)
    └── Click "Import"
        └── Products created/updated in bulk
```

### Flow 7.3 — Manage Categories

```
Navigate to /pos/products → Categories tab
    └── Category Tree:
        ├── Beverages
        │   ├── Coffee
        │   ├── Tea
        │   └── Juices
        ├── Food
        │   ├── Snacks
        │   └── Meals
        └── Clothing
            ├── Men
            └── Women

    ├── Click "Add Category" → Enter name, parent category, image, sort order
    ├── Drag to reorder categories
    ├── Click category → Edit name, image
    └── Toggle Active/Inactive
```

---

## 8. Returns, Refunds & Exchange Flows

**Actor**: Cashier (with pos.sale.return permission)

### Flow 8.1 — Process a Return

```
Customer wants to return items
    └── Navigate to /pos/returns → Click "New Return"
        └── Find Original Invoice:
            ├── Search by invoice number (e.g., "INV-00234")
            ├── Search by customer name/phone
            └── Search by date range
        └── Original invoice found and displayed:
            ├── Invoice Date: 2026-07-20
            ├── Return Window: 7 days ← Within window ✅
            ├── Items:
            │   ├── ☑️ Product A — Qty: 2 — 3.000 OMR each
            │   ├── ☐ Product B — Qty: 1 — 5.500 OMR
            │   └── ☐ Product C — Qty: 3 — 1.200 OMR each
            └── Select items to return:
                ├── Check Product A → Return Qty: 1 (of 2 purchased)
                ├── Select Return Reason: "Defective"
                ├── Mark Condition: "Damaged" (will NOT be re-added to sellable stock)
                └── Click "Process Return"
                    ├── System calculates refund: 3.000 OMR
                    ├── Choose refund method:
                    │   ├── Cash Refund → Cash drawer opens, refund cash
                    │   ├── Original Payment Method → Refund to card/gateway
                    │   └── Store Credit → Generate Credit Note
                    │       └── PosCreditNote created: CN-00012, Balance: 3.000 OMR
                    ├── Stock update:
                    │   ├── If "Resellable" → Stock incremented
                    │   └── If "Damaged" → Stock NOT incremented (logged as damaged return)
                    ├── Loyalty points deducted (if earned on original sale)
                    ├── Return invoice generated (linked to original INV-00234)
                    └── Print/WhatsApp return receipt
```

### Flow 8.2 — Exchange Flow

```
Customer wants to exchange Product A for Product D
    └── Process return for Product A (as above) → Credit Note issued: 3.000 OMR
    └── Start new sale:
        ├── Add Product D to cart: 4.200 OMR
        ├── Apply Credit Note CN-00012 as payment: 3.000 OMR
        ├── Remaining due: 1.200 OMR → Pay via cash
        └── Complete sale
            ├── Credit Note balance: 0.000 OMR (FULLY_REDEEMED)
            └── New invoice generated
```

---

## 9. Payment Processing Flows

**Actor**: Cashier

### Flow 9.1 — Cash Payment with Denomination Entry

```
Total Due: 15.750 OMR
    └── Select "Cash"
        ├── Enter tendered amount: 20.000 OMR
        ├── System calculates change: 4.250 OMR
        ├── Optional: Record denomination breakdown:
        │   ├── 10 OMR × 2 = 20.000 OMR
        │   └── (For end-of-day cash reconciliation accuracy)
        └── Click "Complete"
            └── Cash drawer opens → Hand over 4.250 OMR change
```

### Flow 9.2 — Thawani Pay Digital Payment

```
Total Due: 25.300 OMR
    └── Select "Thawani Pay"
        ├── System calls POST /api/v1/checkout/session (Thawani API)
        │   └── Creates payment session with amount 25.300 OMR
        ├── QR code / payment link displayed to customer
        ├── Customer pays via Thawani app or card
        ├── Thawani sends webhook → Backend receives confirmation
        │   ├── Verifies payment amount and status
        │   └── Marks PosSalePayment as confirmed
        └── POS screen updates: "Payment Confirmed ✅"
            └── Receipt generated automatically
```

### Flow 9.3 — Split Payment (Multi-Tender)

```
Total Due: 50.000 OMR
    └── Customer wants to split: Cash + Card
        ├── Add Payment 1: Cash → 20.000 OMR
        │   └── Remaining: 30.000 OMR
        ├── Add Payment 2: Thawani Pay → 30.000 OMR
        │   └── Remaining: 0.000 OMR
        └── Click "Complete"
            ├── Two PosSalePayment records created
            ├── Cash drawer opens for cash portion
            └── Single receipt shows both payment methods
```

### Flow 9.4 — Credit Sale (Due Bill)

```
B2B customer wants to buy on credit
    └── Add items to cart → Attach B2B customer
        └── Checkout → Select "Due Bill / Credit Sale"
            ├── Full amount (100.000 OMR) recorded as outstanding
            └── Sale marked as COMPLETED with payment_method = DUE

Later, customer pays:
    └── Navigate to /pos/customers → Select customer → "Due Payments" tab
        └── Click "Collect Payment" on invoice INV-00456
            ├── Enter amount received: 50.000 OMR (partial)
            ├── Select method: Bank Transfer
            ├── Enter reference number
            └── Click "Record Payment"
                └── Outstanding balance: 50.000 OMR remaining
```

---

## 10. Discount & Promotion Flows

**Actor**: Store Manager (setup) / Cashier (application)

### Flow 10.1 — Create a Promotion

```
Navigate to /pos/promotions → Click "New Promotion"
    ├── Name: "Weekend Special"
    ├── Type: Bill Discount
    ├── Discount: 10% off entire bill
    ├── Conditions:
    │   ├── Minimum purchase: 20.000 OMR
    │   └── Applicable days: Saturday, Sunday
    ├── Scope:
    │   ├── All outlets (or select specific)
    │   └── All customer groups (or select specific)
    ├── Schedule:
    │   ├── Start: 2026-08-01
    │   └── End: 2026-08-31
    └── Click "Save & Activate"
```

### Flow 10.2 — Auto-Applied Promotion at POS

```
Saturday checkout, bill total is 35.000 OMR
    └── Promotion engine auto-detects "Weekend Special" applies:
        ├── Cart footer shows: "Weekend Special: -10% applied"
        ├── Discount: -3.500 OMR
        └── New total: 31.500 OMR (+ VAT)
```

### Flow 10.3 — Manual Discount by Cashier

```
Cashier applies ad-hoc discount:
    ├── Click "Discount" on item or bill level
    ├── Enter: 5% off
    ├── System checks cashier's max discount permission (e.g., max 5% allowed)
    │   ├── If within limit → Applied ✅
    │   └── If above limit → "Manager Approval Required"
    │       ├── Manager enters PIN on modal
    │       └── Override approved → Discount applied ✅
    └── Discount logged in audit trail (who, what, when)
```

### Flow 10.4 — Coupon Code Redemption

```
Customer provides coupon code
    └── Cashier clicks "Coupon" → Enters code: "SAVE20"
        ├── System validates:
        │   ├── Code exists ✅
        │   ├── Not expired ✅
        │   ├── Usage limit not reached ✅
        │   └── Conditions met (minimum spend, applicable products) ✅
        └── Discount applied: -20% on eligible items
            └── PosPromotionUsage record created
```

---

## 11. Loyalty Program Flows

**Actor**: Cashier / Customer

### Flow 11.1 — Earning Points

```
Customer (with profile attached) completes a 50.000 OMR purchase
    └── System calculates points:
        ├── Rate: 1 point per 10 OMR
        ├── Points earned: 5
        ├── Customer group multiplier (VIP = 2x): 10 points
        └── PosLoyaltyTransaction created (type: EARNED, points: +10)
    └── Receipt shows: "You earned 10 loyalty points! Balance: 340 points"
```

### Flow 11.2 — Redeeming Points at POS

```
During checkout:
    └── Cashier clicks "Loyalty Points" payment option
        ├── System shows: Customer has 340 points (= 340.000 OMR)
        ├── Cart total: 25.000 OMR
        ├── Max redemption: 50% of bill = 12.500 OMR = 12 points
        ├── Customer chooses to use 10 points (10.000 OMR)
        ├── Remaining: 15.000 OMR → Pay via Cash
        └── PosLoyaltyTransaction created (type: REDEEMED, points: -10)
            └── New balance: 330 points
```

---

## 12. Purchase Order & Vendor Flows

**Actor**: Store Manager / Administrator

### Flow 12.1 — Create Purchase Order

```
Navigate to /pos/purchase-orders → Click "New PO"
    ├── Select Vendor: "Al Amin Trading LLC"
    ├── Select Destination Outlet: "Main Store"
    ├── Add Items:
    │   ├── Search product → Enter order quantity and agreed cost price
    │   ├── Product A: 50 units @ 2.500 OMR = 125.000 OMR
    │   ├── Product B: 100 units @ 1.200 OMR = 120.000 OMR
    │   └── Product C: 25 units @ 8.000 OMR = 200.000 OMR
    ├── Subtotal: 445.000 OMR
    ├── VAT (5%): 22.250 OMR
    ├── Total: 467.250 OMR
    ├── Expected Delivery: 2026-08-05
    ├── Notes: "Delivery to back entrance"
    └── Click "Save as Draft"
        └── PO Status: DRAFT

Manager approves:
    └── Click "Approve & Send"
        ├── If PO exceeds threshold → Requires admin approval
        ├── PO status: DRAFT → SENT
        └── PO sent to vendor via Email (Resend) or Print
```

### Flow 12.2 — Receive Goods Against PO

```
Goods arrive from vendor
    └── Navigate to /pos/purchase-orders → Click on PO-00045
        └── Click "Receive Goods"
            ├── Scan items as they arrive:
            │   ├── Product A: Ordered 50 → Received 50 ✅
            │   ├── Product B: Ordered 100 → Received 85 ⚠️ (15 short)
            │   └── Product C: Ordered 25 → Received 25 ✅
            ├── For batch-tracked items:
            │   ├── Enter Batch Number
            │   └── Enter Expiry Date
            ├── Note discrepancies: "Product B: 15 units short-received"
            └── Click "Confirm Receipt"
                ├── PO status: SENT → PARTIALLY_RECEIVED (because of Product B)
                ├── PosStock incremented for received quantities
                ├── Average cost prices recalculated
                └── Vendor can ship remaining 15 units later
```

---

## 13. Multi-Store & Transfer Flows

**Actor**: Administrator / Store Manager

### Flow 13.1 — Create New Outlet

```
Navigate to /pos/settings → Outlets → Click "Add Outlet"
    ├── Name: "City Center Branch"
    ├── Address: "Mall of Muscat, Level 1, Unit 24"
    ├── Phone, Email
    ├── VAT Number (if different from main)
    └── Click "Create Outlet"
        ├── Outlet created with empty inventory
        ├── Default warehouse auto-created
        └── Can now assign registers and employees to this outlet
```

### Flow 13.2 — Head Office Centralized View

```
Administrator views /pos dashboard
    └── Store Performance Comparison widget:
        ├── Main Store: 2,450.000 OMR (today)
        ├── City Center Branch: 1,890.000 OMR (today)
        ├── Industrial Area Store: 980.000 OMR (today)
        └── Total: 5,320.000 OMR
    └── Click any store → drills down to that outlet's dashboard
```

---

## 14. Receipt & Invoice Flows

**Actor**: Cashier / Store Manager

### Flow 14.1 — Thermal Receipt (58mm / 80mm)

```
After completing sale:
    └── Auto-print triggers (if enabled)
        └── ESC/POS commands sent to thermal printer:
            ┌──────────────────────────┐
            │      [BUSINESS LOGO]     │
            │    Al Jabal Trading LLC  │
            │  Al Khuwair, Muscat      │
            │  VAT: OM1234567890       │
            │  Tel: +968 2412 3456     │
            ├──────────────────────────┤
            │  INV-00234               │
            │  Date: 26/07/2026 14:35  │
            │  Cashier: Ahmed          │
            │  Customer: Khalid Ali    │
            ├──────────────────────────┤
            │  Coffee 250g   x2       │
            │           2 × 4.500     │
            │                  9.000  │
            │  Tea Box       x1       │
            │           1 × 3.200     │
            │                  3.200  │
            ├──────────────────────────┤
            │  Subtotal:      12.200  │
            │  Discount:      -1.200  │
            │  VAT (5%):       0.550  │
            │  ────────────────────── │
            │  TOTAL:         11.550  │
            ├──────────────────────────┤
            │  Cash:          15.000  │
            │  Change:         3.450  │
            ├──────────────────────────┤
            │  Loyalty +3 pts (Bal:43)│
            ├──────────────────────────┤
            │  Thank you for your     │
            │  purchase! Returns      │
            │  within 7 days with     │
            │  receipt.               │
            │     [QR CODE]           │
            └──────────────────────────┘
```

### Flow 14.2 — A4 / A5 Tax Invoice

```
Navigate to /pos/orders → Click on invoice → Click "Print A4 Invoice"
    └── System generates formatted PDF:
        ├── Company letterhead (logo, name, address, VAT number)
        ├── "TAX INVOICE" header
        ├── Invoice number, date
        ├── Customer details (name, address, VAT number for B2B)
        ├── Items table (description, qty, rate, discount, tax, amount)
        ├── Tax summary table:
        │   ├── Taxable Amount: 100.000 OMR
        │   ├── VAT @ 5%: 5.000 OMR
        │   └── Total: 105.000 OMR
        ├── Payment details
        ├── Terms and conditions
        └── Options:
            ├── Print (browser print dialog)
            ├── Download PDF
            ├── Email via Resend
            └── Send via WhatsApp
```

### Flow 14.3 — Digital Receipt via WhatsApp

```
After sale completion:
    └── Click "Send WhatsApp" (or auto-triggered if configured)
        ├── System generates receipt PDF
        ├── Messaging Module sends via WhatsApp Business API:
        │   ├── Template: "receipt_delivery"
        │   ├── To: Customer's phone number
        │   ├── Body: "Thank you for your purchase! Here's your receipt for INV-00234."
        │   └── Attachment: Receipt PDF
        └── MessagingLog created (status: SENT)
            └── If delivery fails → Status: FAILED, error logged
```

---

## 15. Barcode Management Flows

**Actor**: Store Manager

### Flow 15.1 — Generate & Print Barcode Labels

```
Navigate to /pos/products → Select products → Click "Print Labels"
    ├── Select Label Template:
    │   ├── Standard (Product name + barcode + price)
    │   ├── Compact (barcode + price only)
    │   └── Detailed (name + barcode + price + SKU + variant info)
    ├── Select Paper Size: A4 sheet (30 labels per page) / Continuous roll
    ├── Set quantity per product:
    │   ├── Coffee 250g: 20 labels
    │   ├── Tea Box: 15 labels
    │   └── Sugar 1kg: 30 labels
    ├── Preview label layout
    └── Click "Print"
        └── Browser print dialog → Print to label printer
```

### Flow 15.2 — Barcode Scanning in Billing

```
Cashier scans barcode:
    └── USB scanner sends barcode string (e.g., "8901234567890")
        └── System looks up:
            ├── Match in pos_products.barcode → Product found → Added to cart ✅
            ├── Match in pos_variants.barcode → Variant found → Added to cart ✅
            └── No match → "Product not found" notification
                └── Option: "Create product with this barcode?"
```

---

## 16. Reports & Analytics Flows

**Actor**: Store Manager / Administrator

### Flow 16.1 — Daily Sales Report

```
Navigate to /pos/reports → Sales Summary
    ├── Select Date Range: Today
    ├── Select Outlet: All Outlets
    └── Report Displays:
        ├── Total Revenue: 3,250.750 OMR
        ├── Transactions: 67
        ├── Average Ticket: 48.519 OMR
        ├── Discounts Given: 145.000 OMR
        ├── Returns: 3 (85.500 OMR)
        ├── Net Revenue: 3,020.250 OMR
        ├── Breakdown by Payment Method (pie chart):
        │   ├── Cash: 1,500.000 OMR (49.6%)
        │   ├── Thawani Pay: 1,200.750 OMR (39.7%)
        │   └── Amwal Pay: 320.000 OMR (10.7%)
        ├── Sales by Hour (bar chart): Peak at 12-1 PM
        └── Actions:
            ├── Export: PDF / CSV / Excel
            ├── Schedule: Auto-email this report daily to [manager@store.com]
            └── Save as Dashboard Widget
```

### Flow 16.2 — VAT Report for Filing

```
Navigate to /pos/reports → Tax Report
    ├── Select Quarter: Q3 2026 (Jul-Sep)
    └── Report Displays:
        ├── Output VAT (Collected on Sales):
        │   ├── Standard Rate (5%): 4,560.250 OMR
        │   ├── Zero-Rated: 0.000 OMR
        │   └── Exempt: 0.000 OMR
        ├── Input VAT (Paid on Purchases):
        │   └── Standard Rate (5%): 2,890.000 OMR
        ├── Net VAT Payable: 1,670.250 OMR
        ├── Filing Deadline: 30 Oct 2026
        └── Export for Oman Tax Authority submission
```

### Flow 16.3 — Inventory Valuation Report

```
Navigate to /pos/reports → Inventory Valuation
    ├── Select Valuation Method: Weighted Average Cost
    ├── Select Outlet: Main Store
    └── Report:
        ├── Total SKUs: 450
        ├── Total Units in Stock: 12,340
        ├── Stock Value (at Cost): 45,600.000 OMR
        ├── Stock Value (at Retail): 72,300.000 OMR
        ├── Potential Margin: 26,700.000 OMR
        └── Breakdown by Category:
            ├── Beverages: 8,200.000 OMR (cost)
            ├── Food: 15,400.000 OMR (cost)
            └── Clothing: 22,000.000 OMR (cost)
```

---

## 17. Employee & Role Management Flows

**Actor**: Administrator

### Flow 17.1 — Create Custom Role

```
Navigate to /pos/settings → Roles → Click "New Role"
    ├── Role Name: "Senior Cashier"
    ├── Select Permissions:
    │   ├── ✅ pos.sale.create
    │   ├── ✅ pos.sale.discount (max 10%)
    │   ├── ✅ pos.sale.return
    │   ├── ❌ pos.sale.void
    │   ├── ✅ pos.customer.read
    │   ├── ✅ pos.customer.create
    │   ├── ✅ pos.inventory.read
    │   ├── ❌ pos.inventory.adjust
    │   ├── ❌ pos.report.financial
    │   └── ❌ pos.settings.manage
    └── Click "Save Role"
```

### Flow 17.2 — Cashier Quick-Switch (PIN Login)

```
Cashier A finishes shift, Cashier B takes over same register:
    └── Cashier A clicks "Switch User"
        └── Login screen shows PIN entry pad
            └── Cashier B enters 4-digit PIN: ****
                ├── System validates PIN → Cashier B authenticated
                ├── Previous session preserved (Cashier A's session still open if not closed)
                └── New session opened for Cashier B (if needed)
                    └── Enter opening float → Start billing
```

---

## 18. Daily Operations — Closing the Store

**Actor**: Cashier / Store Manager

### Flow 18.1 — Close Register Session

```
End of cashier's shift:
    └── Click "Close Session" (from POS billing screen menu)
        └── Cash Count Screen:
            ├── Count currency denominations:
            │   ├── 50 OMR notes: × 2 = 100.000
            │   ├── 20 OMR notes: × 5 = 100.000
            │   ├── 10 OMR notes: × 3 = 30.000
            │   ├── 5 OMR notes: × 4 = 20.000
            │   ├── 1 OMR notes: × 8 = 8.000
            │   ├── 500 Baisa: × 6 = 3.000
            │   ├── 100 Baisa: × 15 = 1.500
            │   └── 50 Baisa: × 10 = 0.500
            ├── Total Cash Counted: 263.000 OMR
            ├── System Expected: 265.750 OMR
            │   (Opening float + Cash sales - Cash refunds - Cash out + Cash in)
            ├── Discrepancy: -2.750 OMR (SHORT)
            ├── Enter closing notes: "Possible miscounted change on 2PM transaction"
            └── Click "Close Session"
                ├── PosSession status: OPEN → CLOSED
                └── Session summary printout:
                    ├── Session Duration: 8h 30m
                    ├── Total Sales: 45 transactions, 2,150.000 OMR
                    ├── By Payment Method:
                    │   ├── Cash: 1,200.000 OMR
                    │   ├── Thawani: 800.000 OMR
                    │   └── Amwal: 150.000 OMR
                    ├── Returns: 2 (65.000 OMR)
                    ├── Discounts: 95.000 OMR
                    ├── Cash In: 50.000 OMR (float addition)
                    ├── Cash Out: 0.000 OMR
                    ├── Expected Cash: 265.750 OMR
                    ├── Actual Cash: 263.000 OMR
                    └── Discrepancy: -2.750 OMR
```

### Flow 18.2 — End-of-Day (EOD) Summary

```
Store Manager reviews all sessions after closing:
    └── Navigate to /pos/reports → End of Day
        ├── All Sessions Summary:
        │   ├── Register 1 (Ahmed): Closed ✅ — Discrepancy: -2.750 OMR
        │   ├── Register 2 (Sara): Closed ✅ — Discrepancy: 0.000 OMR
        │   └── Register 3 (Omar): Closed ✅ — Discrepancy: +0.500 OMR
        ├── Combined Day Summary:
        │   ├── Total Revenue: 5,320.000 OMR
        │   ├── Total Transactions: 127
        │   ├── Total Returns: 5
        │   ├── Net Revenue: 5,120.000 OMR
        │   └── VAT Collected: 243.810 OMR
        └── Print EOD Report / Email to owner
```

---

## 19. Workflow Builder & Settings Flows

**Actor**: Administrator

### Flow 19.1 — Build Custom Workflow

```
Navigate to /pos/settings → Workflows → Click "New Workflow"
    ├── Name: "Laundry Service"
    ├── Description: "Order lifecycle for laundry/dry cleaning business"
    ├── Workflow Builder (visual drag-and-drop):
    │
    │   [INTAKE] ──→ [CLEANING] ──→ [READY] ──→ [DELIVERED & PAID]
    │      │                                          │
    │      └─── Form: "Garment Intake Form"           └─── Form: "Payment Form"
    │
    ├── State Configuration:
    │   ├── State 1: "Intake"
    │   │   ├── Is Initial: Yes
    │   │   ├── Is Final: No
    │   │   ├── Attached Form: "Garment Intake Form"
    │   │   └── Side Effects: None
    │   ├── State 2: "Cleaning"
    │   │   ├── Side Effects:
    │   │   │   └── Send WhatsApp: "Your order is being processed"
    │   │   └── Attached Form: None
    │   ├── State 3: "Ready"
    │   │   ├── Side Effects:
    │   │   │   └── Send WhatsApp: "Your order is ready for pickup!"
    │   │   └── Attached Form: None
    │   └── State 4: "Delivered & Paid"
    │       ├── Is Final: Yes
    │       └── Attached Form: "Payment Collection Form"
    ├── Transitions:
    │   ├── Intake → Cleaning (requires: pos.order.advance)
    │   ├── Cleaning → Ready (requires: pos.order.advance)
    │   ├── Ready → Delivered & Paid (requires: pos.sale.create)
    │   └── Ready → Cleaning (re-process, if quality issue)
    └── Click "Save & Activate"
```

### Flow 19.2 — Build Dynamic Form

```
Navigate to /pos/settings → Forms → Click "New Form"
    ├── Name: "Garment Intake Form"
    ├── Drag-and-drop form builder:
    │   ├── Field 1: Customer Phone (Text, required)
    │   ├── Field 2: Garment Type (Dropdown: Shirt, Trouser, Thobe, Abaya, Suit)
    │   ├── Field 3: Material (Dropdown: Cotton, Silk, Polyester, Wool)
    │   ├── Field 4: Condition Photos (Photo capture, multiple, required)
    │   ├── Field 5: Stain Removal Needed? (Checkbox)
    │   ├── Field 6: Stain Type (Dropdown, shown only if Field 5 = Yes)
    │   │   └── Conditional Logic: Show if "Stain Removal Needed" = true
    │   ├── Field 7: Special Instructions (Textarea)
    │   └── Field 8: Estimated Pickup Date (Date picker)
    ├── Pricing Rules (attached to form fields):
    │   ├── Base: Garment Type → Shirt = 0.500, Thobe = 0.800, Suit = 2.000
    │   ├── Modifier: Material → Silk = +0.300, Wool = +0.200
    │   └── Add-on: Stain Removal = +0.200
    └── Click "Save Form"
        └── Form now available to attach to workflow states
```

### Flow 19.3 — Configure Receipt Templates

```
Navigate to /pos/settings → Receipts
    ├── Select template to edit (or create new)
    ├── Settings:
    │   ├── Paper Size: Thermal 80mm / A4 / A5
    │   ├── Header:
    │   │   ├── Logo (Cloudflare CDN URL)
    │   │   ├── Business Name
    │   │   ├── Address lines
    │   │   ├── Phone
    │   │   └── VAT Number
    │   ├── Body: Auto-generated from sale data
    │   ├── Footer:
    │   │   ├── Line 1: "Thank you for shopping with us!"
    │   │   ├── Line 2: "Returns accepted within 7 days"
    │   │   └── Line 3: "Follow us @AlJabalTrading"
    │   └── Options:
    │       ├── Show QR code: Yes
    │       ├── Show loyalty balance: Yes
    │       └── Show barcode: Yes
    ├── Preview (live mock receipt)
    └── Click "Save" → Set as Default for this outlet
```

---

## 20. Notification & Alert Flows

**Actor**: System → Store Manager / Administrator

### Flow 20.1 — Low Stock Alert

```
System Background Worker (runs every hour):
    └── Checks pos_stock quantities against pos_products.reorder_point
        └── Product "Coffee 250g" → Stock: 8, Reorder Point: 10
            └── Trigger Low Stock Alert:
                ├── In-app notification (bell icon badge)
                ├── WhatsApp to Store Manager (if configured)
                ├── Email via Resend to admin
                └── Quick Action: "Create Purchase Order" button in notification
```

### Flow 20.2 — Void/Cancel Transaction Alert

```
Cashier voids a transaction:
    └── System triggers alert:
        ├── In-app notification to Store Manager
        ├── Email to admin
        └── Audit log entry:
            ├── Action: pos.sale.void
            ├── User: Ahmed (Cashier)
            ├── Entity: PosSale INV-00234
            ├── Amount: 45.000 OMR
            ├── Reason: "Customer cancelled"
            └── Timestamp: 2026-07-26 14:35:22
```

### Flow 20.3 — Daily Sales Summary

```
System Cron Job (runs at 11:00 PM daily):
    └── Generates daily summary for each outlet
        └── Sends via Email (Resend) and WhatsApp:
            ├── "📊 Daily Sales Summary — 26 Jul 2026"
            ├── "Total Sales: 5,320.000 OMR"
            ├── "Transactions: 127"
            ├── "Returns: 5 (245.000 OMR)"
            ├── "Net Revenue: 5,075.000 OMR"
            └── "Top Product: Coffee 250g (42 units)"
```

---

## 21. Offline Mode Flows

**Actor**: Cashier

### Flow 21.1 — Internet Drops During Billing

```
Internet connection lost during active session:
    └── System detects loss of connectivity
        ├── Status bar shows: 🔴 "OFFLINE MODE"
        ├── Product catalog: Available (cached in IndexedDB)
        ├── Customer list: Recently used customers available
        ├── Billing: Fully functional
        │   ├── Add items, apply discounts, create sales
        │   ├── Cash payments: ✅ Processed normally
        │   ├── Card/Gateway payments: ⚠️ Queued (cannot process online)
        │   └── Loyalty points: ⚠️ Balance may be stale
        └── Sales saved to IndexedDB sync queue

Internet restored:
    └── System detects connectivity
        ├── Status bar shows: 🟡 "SYNCING..." (with progress)
        ├── Background sync:
        │   ├── Uploads all queued sales to server
        │   ├── Uploads stock decrements
        │   ├── Processes queued card payments
        │   └── Syncs latest product catalog and prices
        ├── Conflict resolution:
        │   └── If stock went negative during offline → Flag for manager review
        └── Status bar shows: 🟢 "ONLINE" (all synced)
```

---

## 22. Online Store & Omnichannel Flows

**Actor**: Store Manager / Customer

### Flow 22.1 — Online Order from Storefront

```
Customer visits branded online store (shareable link):
    └── Browses product catalog (synced from POS)
        └── Adds items to cart → Proceeds to checkout
            ├── Enters delivery details
            ├── Pays via Thawani/Amwal online
            └── Order placed

Store receives notification:
    └── POS Dashboard: "🛒 New Online Order #ONL-00056"
        └── Store Manager clicks → View order details
            ├── Accept Order → Prepares items
            ├── Mark as "Ready for Pickup" or "Dispatched"
            └── Customer receives WhatsApp updates at each step
```

---

## 23. Platform Admin (Super Admin) Flows

**Actor**: DeltCRM Platform Operator (Super Admin)

### Flow 23.1 — Enable POS for a Tenant

```
Navigate to /platform/pos → Tenants
    └── Search tenant: "Al Jabal Trading LLC"
        └── Click "Enable POS Module"
            ├── Select Plan: Professional
            ├── Set limits: 3 outlets, 10 users, 3 registers
            └── Click "Activate"
                ├── TenantModule record created (module: pos, is_active: true)
                ├── POS tables provisioned for tenant
                └── Tenant admin sees POS in sidebar
```

### Flow 23.2 — Platform-Wide POS Dashboard

```
Navigate to /platform/pos
    └── Platform POS Overview:
        ├── Active POS Tenants: 45
        ├── Total Transactions (today): 3,456
        ├── Total Revenue (platform): 125,000.000 OMR
        ├── Active Registers: 89
        ├── Tenant Health:
        │   ├── 🟢 Healthy: 42 tenants
        │   ├── 🟡 Near limits: 2 tenants
        │   └── 🔴 Subscription expired: 1 tenant
        └── Feature Flag Management:
            ├── Toggle features ON/OFF globally
            └── A/B test new features
```

### Flow 23.3 — Manage POS Subscription Plans

```
Navigate to /platform/pos → Plans
    └── Edit "Professional" Plan:
        ├── Max Users: 10
        ├── Max Registers: 3
        ├── Max Outlets: 3
        ├── Features:
        │   ├── ✅ Loyalty Program
        │   ├── ✅ Session/Cash Tracking
        │   ├── ✅ Advanced Reports
        │   ├── ✅ API Access
        │   ├── ✅ Offline Mode
        │   └── ✅ Dynamic Workflows
        ├── Price: 25.000 OMR/month
        └── Click "Save"
```

---

## Summary — Complete Flow Index

| # | Flow | Primary Actor | Module |
|---|---|---|---|
| 1.1 | POS Module Activation | Admin | Onboarding |
| 1.2 | Setup Wizard | Admin | Onboarding |
| 1.3 | Invite Team Members | Admin | Employees |
| 2.1 | Open Register Session | Cashier | Register |
| 2.2 | Manager Dashboard Review | Manager | Dashboard |
| 3.1 | Standard Retail Sale | Cashier | Billing |
| 3.2 | Hold & Recall Order | Cashier | Billing |
| 3.3 | Delivery/Pickup Order | Cashier | Billing |
| 4.1 | Laundry Intake (Workflow) | Cashier | Workflows |
| 4.2 | Tailoring Intake (Workflow) | Cashier | Workflows |
| 5.1 | Create Customer | Manager | Customers |
| 5.2 | Quick-Add from POS | Cashier | Customers |
| 5.3 | View Customer Profile | Manager | Customers |
| 5.4 | Bulk Import Customers | Manager | Customers |
| 6.1 | View Stock Levels | Manager | Inventory |
| 6.2 | Manual Stock Adjustment | Manager | Inventory |
| 6.3 | Physical Stocktake | Manager | Inventory |
| 6.4 | Stock Transfer | Manager | Inventory |
| 7.1 | Add Product | Manager | Catalog |
| 7.2 | Bulk Import Products | Manager | Catalog |
| 7.3 | Manage Categories | Manager | Catalog |
| 8.1 | Process Return | Cashier | Returns |
| 8.2 | Exchange Flow | Cashier | Returns |
| 9.1 | Cash Payment | Cashier | Payments |
| 9.2 | Thawani Pay Payment | Cashier | Payments |
| 9.3 | Split Payment | Cashier | Payments |
| 9.4 | Credit Sale (Due Bill) | Cashier | Payments |
| 10.1 | Create Promotion | Manager | Promotions |
| 10.2 | Auto-Applied Promotion | System | Promotions |
| 10.3 | Manual Discount | Cashier | Promotions |
| 10.4 | Coupon Redemption | Cashier | Promotions |
| 11.1 | Earn Loyalty Points | System | Loyalty |
| 11.2 | Redeem Loyalty Points | Cashier | Loyalty |
| 12.1 | Create Purchase Order | Manager | Purchasing |
| 12.2 | Receive Goods Against PO | Manager | Purchasing |
| 13.1 | Create New Outlet | Admin | Multi-Store |
| 13.2 | Head Office View | Admin | Multi-Store |
| 14.1 | Thermal Receipt | Cashier | Receipts |
| 14.2 | A4/A5 Tax Invoice | Manager | Receipts |
| 14.3 | WhatsApp Receipt | System | Receipts |
| 15.1 | Print Barcode Labels | Manager | Barcodes |
| 15.2 | Barcode Scan in Billing | Cashier | Barcodes |
| 16.1 | Daily Sales Report | Manager | Reports |
| 16.2 | VAT Report for Filing | Admin | Reports |
| 16.3 | Inventory Valuation | Manager | Reports |
| 17.1 | Create Custom Role | Admin | Roles |
| 17.2 | Cashier PIN Switch | Cashier | Roles |
| 18.1 | Close Register Session | Cashier | Register |
| 18.2 | End-of-Day Summary | Manager | Register |
| 19.1 | Build Custom Workflow | Admin | Workflows |
| 19.2 | Build Dynamic Form | Admin | Forms |
| 19.3 | Configure Receipts | Admin | Receipts |
| 20.1 | Low Stock Alert | System | Notifications |
| 20.2 | Void Transaction Alert | System | Notifications |
| 20.3 | Daily Sales Summary | System | Notifications |
| 21.1 | Offline Billing | Cashier | Offline |
| 22.1 | Online Order Processing | Customer/Manager | Omnichannel |
| 23.1 | Enable POS for Tenant | Super Admin | Platform |
| 23.2 | Platform Dashboard | Super Admin | Platform |
| 23.3 | Manage Plans | Super Admin | Platform |
