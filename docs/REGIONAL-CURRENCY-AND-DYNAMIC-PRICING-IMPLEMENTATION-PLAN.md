# Regional Currency and Dynamic Pricing Implementation Plan

## 1. Purpose

**Status:** Proposed  
**Primary users:** Platform Super Admin, tenant Business Admin, billing operations  
**Initial markets:** Oman, UAE, India, Saudi Arabia, Qatar  
**Exit outcome:** Every monetary value uses one shared formatting policy, each tenant receives the correct regional price book and billing currency, and historical billing records remain financially correct.

This plan fixes the current mix of the rupee symbol, hardcoded OMR, and legacy INR defaults. It does not perform currency conversion. A tenant is billed in one commercial currency selected from its onboarding market.

## 2. Current Implementation Findings

| Area | Current state | Gap |
|---|---|---|
| Web formatter | `apps/web/src/lib/billing-types.ts` manually maps INR to `₹` and other currencies to codes | Formatting is not locale-aware and is inconsistent |
| Platform dashboard | Uses the `IndianRupee` icon even when revenue is OMR/AED | Icon incorrectly implies INR |
| Tenant onboarding | Signup has no billing country or market | Currency cannot be selected reliably |
| Platform tenant creation | Captures timezone, but not billing country | Timezone is not a safe currency source |
| Tenant settings | Stores timezone and locale | No canonical commercial market/currency |
| Office locations | Store country and subdivision for holidays | Office country must not silently change subscription currency |
| Plans | One `SubscriptionPlan` row contains one price and currency | The same plan cannot have governed regional prices |
| Billing profile | Has a mutable currency field | It can diverge from the subscription plan |
| Money precision | OMR is treated as 3-decimal in code, while several database columns use `Decimal(...,2)` | OMR amounts can lose precision |
| Platform totals | Revenue is already grouped by currency in parts of the API | UI must preserve grouping and never add currencies together |
| Legacy fallbacks | Some services still default to INR; active schema/seed mostly default to OMR | Defaults can produce incorrect records |
| Mobile runtime | Mobile has `currencyCode` and `countryCode` concepts | Tenant runtime API does not yet expose a complete canonical commercial profile |

## 3. Product Decisions

### 3.1 One consistent display policy

- Use ISO currency codes on pricing, billing, subscription, invoice, payment, payroll, and platform revenue screens.
- Examples: `OMR 12.500`, `AED 12.00`, `INR 12.00`.
- Use the currency's ISO minor-unit precision. OMR uses 3 decimals; AED, INR, SAR, QAR, and USD use 2.
- Replace currency-specific decorative icons such as `IndianRupee` with a neutral `Banknote`, `Coins`, or `WalletCards` icon.
- Use locale-aware grouping and digit direction, but do not let the browser choose an ambiguous currency.
- The API returns amount plus ISO currency; it never returns a preformatted symbol string.

### 3.2 Explicit tenant commercial market

Add an explicit **Billing country/market** during:

- Public workspace signup
- Platform Super Admin tenant creation
- Tenant onboarding company profile

The selected market supplies defaults for currency, locale, timezone suggestions, and available plans. It is not inferred only from IP address, browser locale, timezone, or the first office pin.

Suggested initial mapping:

| Country | Market | Currency | Suggested locale | Precision |
|---|---|---|---|---:|
| OM | Oman | OMR | `en-OM` / `ar-OM` | 3 |
| AE | UAE | AED | `en-AE` / `ar-AE` | 2 |
| IN | India | INR | `en-IN` | 2 |
| SA | Saudi Arabia | SAR | `en-SA` / `ar-SA` | 2 |
| QA | Qatar | QAR | `en-QA` / `ar-QA` | 2 |

IP or timezone detection may preselect a country, but the user must confirm it.

### 3.3 Currency lifecycle

- Currency is editable while the tenant has only a trial and no issued invoice or successful payment.
- After the first financial document/payment, currency is locked.
- A later currency change requires a controlled subscription migration at a billing-period boundary.
- Existing invoices, payments, credits, exports, and snapshots never change currency.
- Offices in multiple countries continue using the tenant's commercial currency unless a future multi-entity billing feature is introduced.

### 3.4 Platform reporting

- Platform revenue stays grouped by currency.
- Do not show a single combined MRR across OMR, AED, and INR.
- A future consolidated reporting currency requires a dated FX-rate service and must be labelled as converted/estimated. It is outside this plan.

## 4. Target Data Model

### 4.1 Tenant commercial settings

Create a required one-to-one record during tenant provisioning:

```prisma
model TenantCommercialSettings {
  tenantId           String   @id
  billingCountryCode String   @db.Char(2)
  marketCode         String
  currencyCode       String   @db.Char(3)
  currencyLockedAt   DateTime?
  source              String   // SIGNUP, PLATFORM, MIGRATION, SUPPORT
  updatedBy           String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

Rules:

- Country and currency must be valid against a server-owned market registry.
- `TenantBillingProfile.currency` is removed after migration or becomes read-only derived data.
- Tenant settings continue to own timezone and locale, not billing currency.
- Office country remains an attendance/holiday location attribute.

### 4.2 Regional plan price book

Separate plan features from market pricing:

```prisma
model SubscriptionPlanPrice {
  id               String
  planId           String
  marketCode       String
  currencyCode     String
  billingPeriod    BillingPeriod
  unitAmountMinor  BigInt
  activeFrom       DateTime
  activeUntil      DateTime?
  isActive         Boolean
  createdBy        String
  createdAt        DateTime
  updatedAt        DateTime
}
```

Required constraints:

- One active price per plan, market, currency, and billing period for a given effective date.
- A tenant can select only prices available for its market.
- A subscription stores `planPriceId`.
- Subscription history and invoice `billingSnapshot` preserve the selected price, currency, market, and effective date.
- Price edits create a new version/effective period; they do not rewrite active invoices.

### 4.3 Canonical money storage

Use integer minor units for all new price/payment calculations:

- `unitAmountMinor`, `subtotalMinor`, `taxMinor`, `totalMinor`, and `amountDueMinor` use `BigInt`.
- Currency code is stored with every financial aggregate or inherited from an immutable parent document.
- API serialization exposes decimal strings, never JavaScript floating-point numbers.

Migration may retain legacy decimal columns temporarily for compatibility, but all writes must move to minor-unit fields before old columns are removed. This resolves the current OMR 3-decimal versus `Decimal(...,2)` mismatch.

## 5. API Changes

### 5.1 Public and tenant APIs

- `GET /markets`: supported countries, currencies, locales, timezone suggestions, and signup availability.
- `GET /plans?market=OM&billingPeriod=MONTHLY`: market-specific plan prices.
- `POST /auth/signup`: require `billingCountryCode`; server resolves market/currency.
- `GET /auth/me`: include commercial market, currency, locale, and money-format metadata.
- `GET /tenant-settings`: include read-only commercial settings.
- `PATCH /tenant-commercial-settings`: allow only pre-lock changes with confirmation and audit reason.

### 5.2 Platform APIs

- Extend tenant creation with `billingCountryCode`.
- Add price-book CRUD under `/platform/plans/:planId/prices`.
- Add impact preview before publishing a regional price.
- Add a controlled tenant market/currency correction endpoint for support.
- Add permissions `platform.markets.read`, `platform.markets.manage`, and `platform.prices.manage`.

### 5.3 Contract rules

Every money response follows:

```json
{
  "amount": "12.500",
  "amountMinor": "12500",
  "currency": "OMR"
}
```

Clients format `amount` with the resolved locale and currency. They must not infer currency from country, timezone, route, plan name, or icon.

## 6. Web and Mobile Implementation

### 6.1 Shared money utility

Replace manual `currencySymbols` logic with a single tested utility:

```ts
formatMoney({
  amount: "12.5",
  currency: "OMR",
  locale: "en-OM",
  display: "code",
});
```

The utility must:

- Use `Intl.NumberFormat`.
- Read currency precision from one ISO currency metadata map shared with backend validation.
- Support negative values and zero.
- Never parse or calculate with formatted strings.
- Provide accounting, compact, and input-safe variants where needed.

### 6.2 Required UI cleanup

Audit and replace monetary rendering in:

- Platform dashboard, plans, billing, tenant list, and tenant detail
- Tenant billing/subscription pages
- Payroll pages, payslips, reports, and exports
- Invoice PDF generation
- Mobile runtime and future payroll views
- Empty states, chart labels, tooltips, and test fixtures

The platform dashboard uses a neutral money icon and renders one revenue card/row per currency.

### 6.3 Onboarding

- Add a searchable billing-country selector before plan selection.
- Show the resolved currency and available regional price.
- Explain that office locations do not change billing currency.
- Require confirmation before completing onboarding.
- Platform-created tenants use the same market resolver as self-signup.

## 7. Migration and Rollout

### Phase 1: Inventory and formatting safety

- Add the shared ISO currency metadata and formatter.
- Remove `IndianRupee` from non-INR-specific UI.
- Replace hardcoded INR/OMR fallbacks with explicit required values.
- Add a CI rule preventing direct `₹`, `OMR `, `AED `, and ad hoc money formatting in application source.

### Phase 2: Tenant market foundation

- Add the market registry and `TenantCommercialSettings`.
- Backfill tenants using, in order: billing profile country, billing currency, active subscription currency, confirmed tenant/office country, then manual review.
- Do not silently infer conflicting records.
- Add onboarding and platform-creation country selection.

### Phase 3: Regional plan prices

- Add `SubscriptionPlanPrice` and platform price-book screens.
- Migrate current plan prices into market-specific records.
- Pin subscriptions to a price version.
- Update plan selection and change-plan flows.

### Phase 4: Money precision migration

- Add minor-unit columns.
- Dual-write and compare legacy/new values.
- Backfill and reconcile.
- Switch reads to minor units.
- Remove legacy decimal columns only after reconciliation reports pass.

### Phase 5: Full surface audit

- Update billing, invoice PDF, payroll, reports, exports, and mobile contracts.
- Update API/OpenAPI contracts and generated clients.
- Remove stale INR/OMR defaults from seeds and active tests.

## 8. Testing

- Unit tests for every supported currency precision and locale.
- Property tests for major/minor round trips and large values.
- API tests for market resolution and invalid market/currency combinations.
- Migration tests for OMR 3-decimal preservation.
- Subscription tests proving price versions and invoices are immutable.
- Playwright tests for Oman, UAE, and India tenants.
- Platform tests proving mixed currencies are grouped, not summed.
- PDF/export tests proving currency code and precision match the source invoice.
- Tenant-isolation and permission tests for market/price management.

## 9. Acceptance Criteria

- [ ] No rupee-specific icon appears for OMR/AED/mixed-currency revenue.
- [ ] Application source contains no direct currency-symbol formatting.
- [ ] A new tenant must confirm a billing country.
- [ ] The server assigns the market, currency, and eligible plan prices.
- [ ] Oman, UAE, and India tenants see the correct regional price and precision.
- [ ] Platform MRR is grouped by currency and never incorrectly combined.
- [ ] Currency cannot be casually changed after financial activity begins.
- [ ] Existing invoices and payments remain unchanged after price updates.
- [ ] OMR values retain all three decimal places in storage and output.
- [ ] Web, API, PDF/export, and mobile use the same currency contract.

## 10. Non-Goals

- Live foreign-exchange conversion
- One tenant billing multiple legal entities/currencies
- Automatic tax compliance for every country
- Cryptocurrency support
- Retroactive conversion of issued financial documents

