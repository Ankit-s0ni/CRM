# Tenant Dashboard English and Arabic Localization Implementation Plan

## 1. Purpose

**Status:** Implemented and technically verified  
**Initial scope:** Tenant web dashboard and shared tenant shell  
**Initial locales:** `en`, `ar`, `ar-OM`, `ar-AE`  
**Primary administrators:** Platform Super Admin/Localization Manager; tenant Business Admin for tenant policy  
**Exit outcome:** A tenant can run its dashboard in English or the correct regional Arabic pack, with RTL layout and audited administration from the platform panel.

Arabic regionalization is not implemented as unrelated full translations. `ar` is the reviewed Modern Standard Arabic base; `ar-OM` and `ar-AE` override terminology where business, government, payroll, attendance, or local usage differs.

## 2. Current Implementation Findings

| Area | Current state | Gap |
|---|---|---|
| Tenant setting | `TenantSettings.locale` exists | It stores a value but does not translate the web UI |
| Settings UI | Offers English, `en-AE`, `ar-AE`, and `ar-SA` | `ar-OM` is missing and options are hardcoded |
| Root layout | Hardcoded `<html lang="en">` | No dynamic language or text direction |
| Frontend | No localization provider/catalog library | Dashboard and shell strings are inline English |
| RTL | Layout uses many physical left/right classes | Arabic layout is not supported |
| Auth store | Does not retain locale/country/currency | Shell cannot resolve localization after login |
| `/auth/me` | Does not return tenant locale policy | Locale must be fetched separately or added |
| Mobile runtime | Already carries a locale concept | Web and mobile do not share catalog/version policy |
| Notifications | Templates already support a locale with English fallback | Useful pattern, but not a UI localization system |
| Platform panel | No localization navigation or permissions | No catalog authoring, review, publishing, or tenant override workflow |

## 3. Localization Decisions

### 3.1 Locale hierarchy

Resolve translations in this order:

```text
tenant override
  -> regional pack (ar-OM or ar-AE)
    -> language pack (ar)
      -> source English (en)
```

Locale selection resolves in this order:

```text
user preference, when enabled
  -> tenant default locale
    -> tenant market suggested locale
      -> en
```

Phase 1 allows the Business Admin to set the tenant default. User-level language switching can be enabled later without changing the catalog model.

### 3.2 Administrative ownership

- Platform localization administrators own base and regional locale packs.
- Tenant Business Admin selects the default locale and enabled languages.
- Tenant-specific wording overrides are optional, permission-controlled, reviewed, and audited.
- HR Admin can read localization settings but does not publish global/regional translations.
- Employees cannot edit catalogs.

### 3.3 Content boundaries

Translate:

- Navigation, headings, labels, buttons, filters, statuses, help text
- Empty/loading/error/forbidden states
- Accessibility labels and confirmation messages
- Date, time, number, and currency presentation

Do not translate:

- Employee/company/department/office names
- User-entered notes
- Audit payloads and identifiers
- API error codes or internal logs

API errors expose stable codes. The client maps known codes to localized messages and uses a localized generic fallback.

## 4. Target Data Model

### 4.1 Locale and translation catalog

```prisma
model LocalePack {
  id             String
  locale         String
  parentLocale   String?
  displayName    String
  direction      String   // LTR or RTL
  status         String   // DRAFT, REVIEW, PUBLISHED, ARCHIVED
  version        Int
  publishedAt    DateTime?
  publishedBy    String?
  createdAt      DateTime
  updatedAt      DateTime
}

model LocalizationKey {
  id                String
  key               String   @unique
  namespace         String
  defaultMessage    String
  description       String?
  placeholderSchema Json
  isTenantEditable  Boolean
  createdAt         DateTime
  updatedAt         DateTime
}

model LocaleTranslation {
  localePackId String
  keyId        String
  value        String
  status       String
  reviewedBy   String?
  reviewedAt   DateTime?
}
```

Catalog keys are stable and semantic, for example:

```text
tenant.shell.navigation.dashboard
tenant.dashboard.header.title
tenant.dashboard.filter.clockedIn
tenant.dashboard.queue.pendingRegularizations
common.action.retry
```

Renaming English text does not rename a key.

### 4.2 Tenant locale policy

Add:

```prisma
model TenantLocalePolicy {
  tenantId             String   @id
  defaultLocale        String
  regionalLocale       String
  enabledLocales       String[]
  allowUserPreference  Boolean
  allowTenantOverrides Boolean
  catalogVersion       Int
  updatedBy            String?
  updatedAt            DateTime
}

model TenantTranslationOverride {
  id          String
  tenantId    String
  locale      String
  keyId       String
  value       String
  status      String
  reason      String
  version     Int
  publishedBy String?
  publishedAt DateTime?
}
```

Rules:

- `regionalLocale` must match the tenant market unless a Platform Admin records an override reason.
- A tenant may override only keys marked `isTenantEditable`.
- Placeholders in an override must exactly match the source schema.
- Published versions are immutable; edits create drafts/new versions.
- Every publish, rollback, and tenant override writes to `SystemAuditLog`.

## 5. Platform Admin Localization Dashboard

Add `/platform/localization` to the platform shell.

### 5.1 Locale packs

- List `en`, `ar`, `ar-OM`, and `ar-AE`.
- Show direction, parent pack, version, status, coverage, missing keys, and last publisher.
- Create a regional pack only from an approved parent locale.
- Preview a pack with sample tenant/dashboard data.

### 5.2 Translation editor

- Search/filter by namespace, key, status, missing value, and modified date.
- Show source English, base Arabic, regional value, description, and placeholders together.
- Validate ICU-style variables/plural forms before save.
- Prohibit raw HTML; allow only explicitly supported rich-text tokens.
- Support draft, submit for review, publish, archive, and rollback.
- Import/export JSON or CSV with a dry-run validation report.

### 5.3 Coverage and release safety

- Dashboard coverage by locale and namespace.
- Block publishing when required tenant-dashboard keys are missing or placeholders are invalid.
- Warn, but permit fallback, for optional future-module namespaces.
- Show a before/after diff and affected tenant count before publishing.
- Keep previous published versions available for immediate rollback.

### 5.4 Tenant localization control

Add a Localization tab to platform tenant detail:

- View tenant market and resolved regional pack.
- Set allowed languages and default locale.
- Enable/disable tenant wording overrides.
- Preview the tenant dashboard in each enabled locale.
- Inspect tenant overrides and their audit history.

Platform permissions:

- `platform.localization.read`
- `platform.localization.translate`
- `platform.localization.review`
- `platform.localization.publish`
- `platform.localization.tenants.manage`

## 6. Tenant Admin Controls

Add `/app/settings/localization` or extend Company settings.

Business Admin can:

- Select English or the tenant's regional Arabic as default.
- Enable both languages if user choice is allowed.
- Preview dashboard direction and terminology.
- Manage approved tenant-editable terms when enabled by platform policy.

Add tenant permissions:

- `workspace.localization.read`
- `workspace.localization.manage`
- `workspace.localization.overrides.manage`

HR Admin receives read access by default. Business Admin receives all three. Existing `workspace.settings.update` is not sufficient for publishing terminology overrides.

## 7. Runtime and API Design

### 7.1 Runtime context

Extend `/auth/me` and mobile runtime responses with:

```json
{
  "localization": {
    "locale": "ar-OM",
    "language": "ar",
    "direction": "rtl",
    "enabledLocales": ["en", "ar-OM"],
    "catalogVersion": 12
  }
}
```

Endpoints:

- `GET /localization/catalog?locale=ar-OM&namespaces=common,tenant-shell,tenant-dashboard`
- `GET /tenant-localization-policy`
- `PATCH /tenant-localization-policy`
- `GET/POST/PATCH /tenant-localization-overrides`
- Platform CRUD/review/publish endpoints under `/platform/localization`

Catalog responses use ETag/version caching. Published catalogs may be cached by locale/version; tenant overrides are tenant-scoped and must never enter a shared cache key without tenant ID.

### 7.2 Frontend framework

- Introduce one App Router-compatible message provider for web localization.
- Keep existing routes; do not add `/en/app` or `/ar/app` prefixes to tenant URLs.
- Bootstrap locale from authenticated tenant context and a signed/validated locale cookie to avoid a visible English-to-Arabic flash.
- Set `<html lang>` and `<html dir>` before interactive content renders.
- Store only the selected locale client-side; the server remains authoritative for allowed locales and catalog version.

### 7.3 Formatting

Use locale-aware utilities for:

- Date and time
- Relative time
- Numbers and percentages
- Currency using the tenant's canonical billing currency
- Pluralization and count messages

Do not use `toLocaleString(undefined)` or hardcoded `"en"` in localized tenant surfaces.

## 8. Tenant Dashboard First Release

The first localized slice includes:

- `apps/web/src/shared/layouts/tenant-shell.tsx`
- `apps/web/src/lib/tenant-navigation.ts`
- `apps/web/src/shared/components/portal-search.tsx`
- `apps/web/src/shared/layouts/tenant-dashboard.tsx`
- Shared loading/error/empty state components used by the dashboard
- Dashboard-linked help content and accessibility labels

Required namespaces:

- `common`
- `tenant-shell`
- `tenant-navigation`
- `tenant-dashboard`
- `attendance-status`
- `errors`

The release is incomplete if the central dashboard is Arabic while the sidebar, header, filters, status labels, errors, or dialogs remain English.

## 9. RTL and Visual Requirements

- Replace physical layout assumptions (`left`, `right`, `ml`, `mr`, `pl`, `pr`) with logical equivalents or direction-aware variants in the localized shell/dashboard.
- Mirror sidebar placement, arrows, breadcrumb chevrons, pagination, drawers, and directional animations.
- Do not mirror logos, clocks, media controls, maps, or universally directional data unless required.
- Use an Arabic-capable font such as Noto Sans Arabic alongside the existing Latin font.
- Preserve mixed Arabic/English identifiers, emails, phone numbers, employee codes, and currency codes using proper bidirectional isolation.
- Verify tables, charts, badges, truncation, tooltips, and mobile navigation in RTL.

## 10. Delivery Phases

### Phase 1: Foundation

- Add locale registry, catalog schema, permissions, audits, and publishing workflow.
- Extend tenant/auth runtime contracts.
- Add frontend provider, locale bootstrap, fallback chain, and formatting utilities.
- Seed `en`, `ar`, `ar-OM`, and `ar-AE`.

### Phase 2: Tenant shell and dashboard

- Extract all shell/dashboard strings into stable keys.
- Implement RTL and Arabic typography.
- Translate and professionally review all required keys.
- Add Business Admin language controls and preview.

### Phase 3: Platform localization dashboard

- Deliver catalog editor, coverage, review, publishing, import/export, preview, and rollback.
- Add tenant locale-policy management and override inspection.

### Phase 4: Tenant overrides

- Enable only approved terminology keys.
- Add draft/review/publish workflow and tenant audit history.
- Add cache invalidation by tenant/locale/catalog version.

### Phase 5: Expand CRM coverage

Recommended order:

1. Employees and organization
2. Attendance and leave
3. Payroll
4. Reports and exports
5. Settings, billing, and notifications
6. Mobile employee application

Each namespace must meet coverage and RTL gates before it is marked localized.

## 11. Translation Governance

- Arabic must be reviewed by qualified Oman/UAE business-language reviewers.
- Machine translation may create a draft but can never auto-publish.
- Regional packs contain only genuine regional differences; shared strings inherit from `ar`.
- Legal, payroll, tax, and employment terms require domain review.
- Product keys, permissions, enum values, and API codes are never exposed as translated labels.
- Changes include translator/reviewer identity, reason, version, timestamp, and affected tenants.

## 12. Testing

- Unit tests for locale fallback and placeholder validation.
- API tests for permissions, drafts, publishing, rollback, and tenant isolation.
- Tests proving `ar-OM -> ar -> en` and `ar-AE -> ar -> en` fallback.
- Playwright coverage for English LTR and Oman/UAE Arabic RTL dashboard sessions.
- Visual regression at desktop, tablet, and mobile widths.
- Accessibility tests for `lang`, `dir`, focus order, labels, and screen-reader names.
- Tests for mixed-direction email, phone, employee code, and currency content.
- Cache tests proving a tenant override cannot leak to another tenant.
- CI check preventing new hardcoded user-facing strings in completed namespaces.

## 13. Acceptance Criteria

- [x] Business Admin can select English or the tenant's approved Arabic locale.
- [x] Oman resolves to `ar-OM`; UAE resolves to `ar-AE`.
- [x] Tenant shell and dashboard contain no untranslated required UI strings.
- [x] Arabic renders RTL before the dashboard becomes visible.
- [x] Dates, numbers, and currency follow the resolved locale and tenant currency.
- [x] Platform Admin can edit, review, preview, publish, and roll back locale packs.
- [x] Regional packs inherit from base Arabic instead of duplicating every message.
- [x] Tenant overrides are restricted, versioned, audited, and tenant-isolated.
- [x] English fallback prevents broken or blank UI.
- [x] Dashboard passes responsive, visual, and accessibility checks in LTR and RTL.

## 14. Non-Goals

- Translating user-entered employee/company data
- Automatic dialect generation
- Publishing unreviewed machine translations
- Localizing every CRM module in the first release
- Locale-specific URLs
- Currency conversion or country-specific tax implementation
