# Tenant URL-Based Localization Corrective Implementation Plan

## 1. Objective

Replace the current client-state localization implementation with a predictable,
URL-based tenant experience:

- English tenant routes use `/en/...`.
- Arabic tenant routes use `/ar/...`.
- Tenant users see only an `English | العربية` switch.
- The tenant's region decides which Arabic catalog is used internally:
  - Oman tenant: `/ar/...` resolves `ar-OM`.
  - UAE tenant: `/ar/...` resolves `ar-AE`.
  - Other Arabic tenant: `/ar/...` resolves `ar`.
- The URL is the source of truth for language.
- The server renders the correct `lang` and `dir` before hydration.
- Currency, timezone, dates, and regional settings remain tenant properties and
  do not change when the user switches language.

This plan applies first to the tenant application. Platform administration can
continue using its existing non-localized routes until a separate platform
localization phase is approved.

### Approved architecture

Use the following implementation as the project standard:

- Next.js App Router with a top-level `[lang]` segment for tenant routes.
- `next-intl` for request configuration, messages, ICU formatting, typed
  navigation, and client/server translation APIs.
- Multiple root layouts through route groups:
  - `[lang]/layout.tsx` owns localized tenant HTML.
  - `(public-platform)/layout.tsx` owns login, signup, and platform HTML.
- Next.js `proxy.ts` only for lightweight missing-prefix and legacy redirects.
- The URL is the language source of truth.
- Tenant region remains the source of truth for the internal Arabic pack,
  currency, timezone, and other regional behavior.
- The existing database translation governance remains the source of messages;
  `next-intl` consumes the resolved message object and does not replace the
  platform localization database.

Do not build another custom locale router or use a client effect to establish
the active language.

## 2. Problems in the Current Implementation

The current implementation has several architectural problems:

1. Tenant routes are all under `/app/...`; language is not represented in the
   URL.
2. `LocalizationProvider` chooses language after client hydration using auth
   state, cookies, local storage, and API data.
3. Changing language mutates `document.lang` and `document.dir` after rendering.
4. The tenant UI exposes technical locale values such as `ar-OM` and `ar-AE`.
5. Locale refresh can temporarily unmount and remount the complete tenant shell.
6. Navigation, search, redirects, attendance route checks, and breadcrumbs
   contain many hardcoded `/app/...` paths.
7. Login always redirects to `/app/onboarding`, regardless of the tenant's
   default language or the requested URL.
8. Regional language, user-facing language, and currency formatting are coupled
   too closely in the client.
9. Browser cookies can override policy in ways that are not visible in the URL.

## 3. Target Behavior

### Tenant routes

| Experience | Route example |
| --- | --- |
| English dashboard | `/en/app` |
| Arabic dashboard | `/ar/app` |
| English employees | `/en/app/employees` |
| Arabic employees | `/ar/app/employees` |
| English onboarding | `/en/app/onboarding` |
| Arabic attendance register | `/ar/app/attendance/register` |

### Language switch

- Display a compact two-option control: `English | العربية`.
- Do not show `ar`, `ar-OM`, or `ar-AE` to tenant users.
- Switching language preserves:
  - the current application path;
  - dynamic route parameters;
  - query parameters;
  - filters and pagination in the URL;
  - the tenant subdomain.
- Example:
  - `/en/app/employees?page=2&status=ACTIVE`
  - becomes `/ar/app/employees?page=2&status=ACTIVE`.

### URL resolution

- `/en/...` always means English and LTR.
- `/ar/...` always means Arabic and RTL.
- `/app/...` is a legacy route and redirects to the resolved language.
- An unsupported prefix such as `/fr/app` returns not found or redirects to the
  tenant default according to one documented rule.

### Internal Arabic resolution

The public URL uses only `ar`. The backend catalog request resolves the actual
catalog using the tenant policy:

```text
/ar URL
  -> tenant regionalLocale
  -> ar-OM, ar-AE, or ar
  -> standard ar fallback
  -> English default message fallback
```

Tenant users never select a regional locale directly.

## 4. Responsibilities

### Platform administrator

- Maintains global English and Arabic translation catalogs.
- Publishes regional Arabic overlays such as Oman and UAE.
- Controls whether tenant terminology overrides are allowed.
- Can inspect which regional catalog is assigned to each tenant.

### Tenant business administrator

- Enables either:
  - English only;
  - Arabic only; or
  - English and Arabic.
- Chooses the tenant default language using only `English` or `Arabic`.
- May manage approved tenant terminology overrides if platform policy permits.
- Does not manually choose `ar-OM` or `ar-AE`; that comes from tenant region.

### Tenant user

- Sees a simple English/Arabic switch only when both languages are enabled.
- Cannot select or see internal regional locale codes.
- Uses URL-based language navigation.

## 5. Data and API Corrections

Keep the existing locale catalog, translation key, regional pack, and override
tables. Correct their runtime contract instead of deleting them.

### Policy response

Expose user-facing language data separately from internal regional resolution:

```json
{
  "defaultLanguage": "en",
  "enabledLanguages": ["en", "ar"],
  "allowUserPreference": true,
  "regionalArabicLocale": "ar-OM",
  "catalogVersion": 3
}
```

### Required rules

- `defaultLanguage` accepts only `en` or `ar`.
- `enabledLanguages` contains only `en` and/or `ar`.
- At least one language must be enabled.
- The default language must be enabled.
- `regionalArabicLocale` is system-resolved from the tenant's operating region.
- Currency remains an ISO currency such as `OMR`, `AED`, or `INR` and is not
  inferred from the route language.

### Catalog endpoint

The tenant web app requests:

```http
GET /localization/catalog?language=ar&namespaces=...
```

The API resolves `language=ar` to the tenant's internal regional Arabic locale.
The response should include both values for observability:

```json
{
  "language": "ar",
  "resolvedLocale": "ar-OM",
  "direction": "rtl",
  "version": 3,
  "messages": {}
}
```

### Migration

Add a forward-only Prisma migration that:

- converts current `defaultLocale` values to `en` or `ar`;
- converts enabled regional locales into the public `ar` language;
- preserves `regionalLocale`;
- removes duplicate values;
- adds constraints for the new public language contract.

Do not reset tenant, payroll, attendance, or translation data.

## 6. Next.js Route Architecture

Use multiple root layouts and create a locale segment for tenant routes:

```text
src/app/
  [lang]/
    layout.tsx
    app/
      layout.tsx
      page.tsx
      employees/
      attendance/
      modules/
      reports/
      settings/
  (public-platform)/
    layout.tsx
    page.tsx
    login/
    signup/
    platform/
    workspace-unavailable/
```

`[lang]` accepts only `en` and `ar`.

### Locale layout

`src/app/[lang]/layout.tsx` is the localized root layout and must:

- validate `params.lang`;
- render `<html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>`;
- load the request configuration through `next-intl`;
- provide the resolved catalog through `NextIntlClientProvider` only where
  Client Components require messages;
- avoid changing `document.lang` or `document.dir` in a client effect.

`src/app/(public-platform)/layout.tsx` is the non-localized root layout for
login, signup, workspace resolution, and platform administration. It renders
English HTML until those areas receive their own approved localization scope.

Moving between the public/platform root and the localized tenant root may cause
a full document navigation. This is acceptable for login-to-app and
logout-to-login transitions and is preferable to post-hydration HTML mutation.

### Proxy responsibilities

Create `src/proxy.ts` for routing only. It may:

- detect a missing language prefix on legacy `/app/...` requests;
- read a non-sensitive `deltcrm-language=en|ar` preference cookie;
- redirect to `/en/app/...` or `/ar/app/...`;
- preserve path and query parameters;
- skip `_next`, API, static assets, login, signup, and platform routes.

Proxy must not:

- call the tenant database or API;
- load translation catalogs;
- perform full session authorization;
- decide currency or regional Arabic;
- rewrite already-prefixed routes.

Tenant policy validation happens in the localized application bootstrap, not in
Proxy.

### Request configuration

Add:

```text
src/i18n/routing.ts
src/i18n/request.ts
src/i18n/navigation.ts
```

- `routing.ts` defines only public languages `en` and `ar`.
- `request.ts` validates the route language, resolves the tenant from the host,
  requests the correct tenant catalog, and returns messages to `next-intl`.
- `navigation.ts` exports locale-aware `Link`, `redirect`, `usePathname`, and
  `useRouter` wrappers.

If server-side catalog loading cannot use the existing protected endpoint,
provide a narrowly scoped tenant localization bootstrap endpoint identified by
the verified workspace subdomain. It may expose only published locale policy
and published messages; it must expose no user, employee, billing, or security
data.

## 7. Locale-Aware Navigation

Use `next-intl` navigation APIs as the single routing layer. Add a small CRM
adapter only for application-specific path definitions:

```text
src/i18n/navigation.ts
src/lib/tenant-routes.ts
```

It should provide or wrap:

- `isPublicLanguage(value)`
- `getLanguageFromPathname(pathname)`
- `stripLanguagePrefix(pathname)`
- `replaceLanguage(pathname, nextLanguage)`
- `tenantLoginDestination(language, next?)`

Do not manually concatenate `/${lang}` throughout feature components.

Then replace hardcoded tenant links in:

- tenant primary and context navigation;
- attendance navigation and breadcrumbs;
- portal search;
- tenant dashboard cards and queues;
- employee links;
- settings links;
- onboarding actions;
- server redirects;
- login/logout and unauthorized redirects.

Platform routes (`/platform/...`) and public routes (`/login`, `/signup`) must
not receive a tenant language prefix unless separately approved.

## 8. Login and Authentication Flow

### Login

- Resolve the tenant from the subdomain as today.
- Resolve the destination language in this order:
  1. valid language in a safe `next` path;
  2. saved preference if enabled by tenant policy;
  3. tenant default language.
- Redirect successful login to `/{lang}/app/onboarding` or the preserved safe
  `next` route.

### Protected route behavior

- Unauthenticated request to `/ar/app/employees` redirects to:
  `/login?next=%2Far%2Fapp%2Femployees`.
- After login, return to the original Arabic route.
- Refresh-token and `/auth/me` behavior must not change the URL language.
- A user cannot open a language disabled by the tenant. Redirect to the tenant
  default language while preserving the remaining path and query.

### Legacy links

- `/app/...` redirects to `/{resolvedLang}/app/...`.
- Existing bookmarks, emails, and internal links continue to work.
- Compatibility redirects remain for at least one release cycle.

## 9. Tenant Language Settings UI

Replace technical locale controls with:

### Available languages

- Checkbox: English
- Checkbox: Arabic
- Validation: at least one must remain selected.

### Default language

- English
- Arabic

### User language switching

- Toggle: Allow users to switch language.
- This is enabled only when both languages are available.

### Regional information

Show read-only operational information:

```text
Arabic region: Oman
Translation pack: Arabic (Oman)
Resolved from: Primary office country
```

Regional pack changes should happen through office/tenant region management,
not through the tenant user's header toggle.

## 10. Runtime Localization Provider

Remove the custom provider as the owner of language selection. Use
`next-intl` request configuration and `NextIntlClientProvider`.

The runtime must:

- receive `language`, `resolvedLocale`, `direction`, `currency`, and initial
  messages from the server layout;
- use the URL language as immutable state for that render;
- use `useTranslations`, `getTranslations`, `useFormatter`, and server
  equivalents from `next-intl`;
- use ICU message syntax for plurals, interpolation, and rich messages;
- cache published catalogs by tenant, language, and catalog version as an
  optimization only;
- never select the active language from local storage;
- never mutate `document.lang` or `document.dir`;
- never unmount the complete shell while refreshing a catalog;
- retain English fallback text when a key is missing.

The language switch uses locale-aware route navigation. It must not call a
client `setLocale` function.

## 11. Delivery Phases

### Phase 0: Freeze and regression baseline

- Pause further localization UI expansion.
- Record all existing `/app` routes and redirects.
- Add tests for current login, onboarding, employees, attendance, settings, and
  dynamic detail routes.
- Capture current tenant policy and translation data before migration.

### Phase 1: Public language contract

- Change DTOs and API responses from public locale codes to `en/ar`.
- Keep regional locale internal.
- Add the forward-only data migration and constraints.
- Update `/auth/me` localization metadata.
- Add API tests for Oman, UAE, English-only, Arabic-only, and bilingual tenants.

### Phase 2: Locale route foundation

- Install and configure `next-intl`.
- Split localized tenant and non-localized public/platform root layouts.
- Add `[lang]` tenant route structure.
- Add locale validation and locale-aware server layout.
- Implement `i18n/request.ts` and initial server catalog loading.
- Add lightweight `proxy.ts` routing.
- Add legacy `/app` compatibility redirects.
- Verify initial HTML `lang` and `dir`.

### Phase 3: Navigation migration

- Introduce shared locale routing helpers.
- Migrate tenant shell, navigation, portal search, dashboard, and attendance.
- Migrate all server redirects and dynamic detail return links.
- Add a CI check that prevents new hardcoded tenant `/app` links outside the
  routing helper.

### Phase 4: Authentication and onboarding

- Make login preserve and restore localized `next` paths.
- Redirect new tenants to their configured default language.
- Ensure onboarding remains on the selected language.
- Verify tenant subdomain behavior in local and production environments.

### Phase 5: Tenant settings simplification

- Replace technical locale selectors with English/Arabic controls.
- Show regional Arabic resolution as read-only.
- Remove `setLocale` from tenant settings and header.
- Implement the route-preserving header language switch.

### Phase 6: Cleanup

- Remove client-side locale cookie as the source of truth.
- Remove post-render `document.lang` and `document.dir` mutations.
- Remove public exposure of regional locale codes.
- Remove obsolete localization state and compatibility code after the agreed
  deprecation period.

## 12. Test Plan

### Unit tests

- URL prefix parsing and replacement.
- Query-string preservation.
- Dynamic path preservation.
- Public language to regional locale resolution.
- Disabled-language fallback.
- Currency independence from language.

### API integration tests

- English catalog for every tenant region.
- `/ar` catalog resolving to `ar-OM`, `ar-AE`, and generic `ar`.
- Translation fallback order.
- Tenant override precedence.
- Policy validation and permissions.

### End-to-end tests

- Login to an English URL.
- Login to an Arabic URL.
- Switch English to Arabic on the same page.
- Switch Arabic to English on a filtered/paginated page.
- Refresh a localized route.
- Open a localized dynamic employee route directly.
- Use browser back/forward after switching.
- Open a legacy `/app` bookmark.
- Verify RTL layout at desktop and mobile sizes.
- Verify no hydration, `removeChild`, or console runtime errors.
- Verify tenant subdomain is preserved.

## 13. Acceptance Criteria

The corrective work is complete only when:

- Tenant URLs use `/en/app/...` or `/ar/app/...`.
- The tenant header shows only `English | العربية`.
- Regional locale codes are hidden from tenant users.
- Switching language preserves the complete route and query.
- English is LTR and Arabic is RTL in the initial server response.
- Tenant routing and formatting use `next-intl`; no custom client locale router
  remains.
- Arabic automatically uses the tenant's regional pack.
- Currency and timezone remain stable across language changes.
- Old `/app/...` links redirect safely.
- Login and onboarding land on the correct localized tenant route.
- All tenant navigation is locale-aware.
- Direct refresh and deep links work.
- Production build, typecheck, API tests, and localization E2E tests pass.
- No DOM reconciliation or hydration errors occur.

## 14. Rollout and Rollback

### Rollout

1. Deploy backward-compatible API changes.
2. Apply the Prisma migration.
3. Deploy locale routes and legacy redirects.
4. Enable the new language switch for internal test tenants.
5. Validate Oman and UAE tenants.
6. Enable for all tenants after monitoring login and route errors.

### Monitoring

Track:

- redirects from legacy `/app` routes;
- unsupported or disabled language requests;
- localization catalog failures;
- missing translation keys;
- hydration and client runtime errors;
- login redirect loops;
- regional catalog resolution by tenant.

### Rollback

- Keep legacy `/app` routes functional during rollout.
- Feature-flag the localized route switch.
- If a critical route issue occurs, redirect localized routes back to `/app`
  while retaining the new policy data.
- Do not reverse or delete translated content during rollback.

## 15. Explicit Non-Goals

- Localizing the platform super-admin interface in this corrective phase.
- Adding more languages beyond English and Arabic.
- Allowing users to choose `ar-OM` or `ar-AE`.
- Changing tenant currency when language changes.
- Translating user-entered business data.
- Replacing the translation governance and review workflow that already exists.
