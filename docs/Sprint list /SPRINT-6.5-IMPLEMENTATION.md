# Sprint 6.5 Implementation Plan

## Dynamic Tenant Runtime, Attendance Capability Configuration and DeltCRM Brand System

**Status:** Complete  
**Depends on:** Sprint 3 attendance configuration, Sprint 5 trusted mobile attendance, and Sprint 6 field tracking foundations  
**Must complete before:** Sprint 7 regularization, notifications, reports, payroll lock and leave  
**Primary references:** `FEATURE-LIST.md`, `PROJECT-ROADMAP.md`, `SPRINT-3-IMPLEMENTATION.md`, `SPRINT-5-IMPLEMENTATION.md`, `SPRINT-6-IMPLEMENTATION.md`, and Stitch web/mobile references  
**Sprint exit:** An employee app is configured by the authenticated employee's tenant entitlement and effective attendance policy. Public login presents DeltCRM branding; after authentication, the app uses the tenant name/logo and exposes only allowed modules, permissions, onboarding tasks, and attendance verification steps.

## 1. Product Decisions

- [x] **Product brand:** all public product surfaces use `DeltCRM`, not IndigoHR or IndigoCRM.
- [x] **Tenant brand after authentication:** authenticated web and mobile experiences display the resolved tenant name and optional tenant logo. A tenant cannot supply the public product brand.
- [x] **Server authority:** hiding a mobile/web feature is a usability behavior only. The API remains the authority for tenant entitlement, employee eligibility, policy and security checks.
- [x] **Configuration hierarchy:** platform entitlement -> tenant configuration -> effective attendance policy -> employee work type and status. A lower level may restrict, but cannot enable a capability the level above has not granted.
- [x] **Office-only attendance:** HR can require office location/geofence while disabling selfie/face verification and field tracking.
- [x] **Field attendance:** field tracking is available only when the platform has entitled the tenant to `FIELD_TRACKING`, the tenant has enabled it, and the employee's work type/policy permits it.
- [x] **No feature leakage:** an employee must never see or retain another tenant's logo, policy, cached data, navigation, queued work or local session after logout or tenant change.
- [x] **Release identifiers:** Android/iOS bundle identifiers, signing identities and integrity-provider registrations are not renamed in this sprint. They require a separately approved release migration because they affect installed apps, Play Integrity/App Attest and provider allow-lists.

## 2. Scope

### Included

- Authenticated employee runtime bootstrap API and typed client contract
- Tenant logo/name, locale/timezone and DeltCRM product-brand composition
- Tenant entitlement-aware module and capability resolution
- Attendance policy capability expansion for location, selfie/face, registered-device and field-tracking behavior
- HR configuration screens that configure only capabilities already entitled by the platform
- Dynamic Flutter onboarding, navigation, permissions, attendance capture and background tracking gates
- Runtime configuration refresh, cache isolation, audit/outbox and tenant A/B tests
- Web shell branding correction for active runtime surfaces

### Excluded

- Adding a new commercial module or changing platform billing/entitlement operations
- Notification delivery, regularization, leave, payroll lock and reports from Sprint 7
- A public tenant-branded login page. The unauthenticated login surface deliberately remains DeltCRM branded.
- Changing mobile package IDs, store listings, signing certificates or production provider registrations
- Replacing archived Stitch HTML/reference files. Only runtime UI source is renamed.

## 3. Target Experience

### 3.1 Employee lifecycle

1. The app launches with DeltCRM branding and has no tenant-specific cached UI visible.
2. The employee signs in through the normal tenant/workspace resolution flow.
3. After token issuance, the app calls the authenticated runtime bootstrap endpoint.
4. The bootstrap returns the tenant identity, employee eligibility, enabled modules, effective policy capabilities, required onboarding tasks and monotonically increasing configuration version.
5. The router sends the employee only to required tasks: device registration, location permission, biometric consent or face enrollment only when the effective policy requires each task.
6. The home screen and navigation render only enabled capabilities. A policy change is applied on next foreground refresh, token refresh or a server rejection; disabled field tracking is stopped safely.
7. Logout clears the session and all tenant-scoped runtime configuration before the DeltCRM login screen appears.

### 3.2 Required configuration examples

| Tenant scenario | Required configuration | Employee experience |
|---|---|---|
| Office staff, location only | `ATTENDANCE` active; office-geofence location mode; selfie disabled; field tracking disabled | Location permission and office punch; no camera, biometric consent, enrollment or field tab |
| Office staff, face plus location | `ATTENDANCE` active; office-geofence; face required; registered device as selected | Required device/consent/face onboarding; camera plus office location punch |
| Field team | `ATTENDANCE` and `FIELD_TRACKING` active; field GPS mode; field tracking enabled; employee is `FIELD` or permitted `HYBRID` | Field attendance and tracking controls; background location only after permission and active field session |
| Attendance not entitled | `ATTENDANCE` inactive at platform level | No attendance routes or controls; direct API call returns module access denial |
| Tenant disables field tracking later | Platform entitlement may remain active; tenant capability disabled | Tracking stops at the next refresh/command response; historical audit evidence remains, no new pings are captured |

## 4. Bounded Contexts and Ownership

```text
runtime-config/             # authenticated employee bootstrap and versioning
attendance-config/          # policy capability model and effective-policy projection
workspace/                  # tenant identity, active module read model and tenant settings
field-tracking/             # server enforcement and safe tracking-session termination
access/                     # permissions and module entitlement guards
mobile/core/tenant/         # persisted runtime config, refresh and cache lifecycle
mobile/core/router/         # capability-aware route guards and onboarding redirects
web/tenant/                 # DeltCRM public brand and authenticated tenant shell branding
```

Ownership rules:

- `platform/modules` remains the only context that grants or removes a commercial tenant module entitlement.
- HR/business-admin users configure attendance capabilities only within active tenant module entitlements.
- `attendance-config` resolves policy precedence and publishes a safe projection; the mobile client must not reconstruct policy from separate endpoints.
- `runtime-config` reads the authoritative projection and does not write policy or entitlement records.
- `field-tracking` enforces the active capability independently of the mobile client's navigation state.

## 5. Capability Model and Invariants

### 5.1 Configuration hierarchy

```text
Platform module entitlement
  -> Tenant attendance capability configuration
    -> Tenant/department/employee effective attendance policy
      -> Employee work type, active status and assigned offices
        -> Runtime bootstrap projection
```

- A module disabled by platform or suspended tenant is never represented as usable.
- A field capability requires active `FIELD_TRACKING`, `fieldTrackingEnabled`, eligible work type and active employee status.
- `OFFICE` employees cannot start field tracking. `FIELD` employees may use it when policy allows. `HYBRID` eligibility is explicitly policy-controlled, not assumed.
- `locationMode=OFFICE_GEOFENCE` requires location and applies assigned-office/geofence checks. `locationMode=NONE` never requests location for attendance. `locationMode=FIELD_GPS` requires current GPS evidence for the relevant punch/tracking action.
- `selfieMode=DISABLED` means no biometric consent, enrollment, camera capture or face-match requirement is shown or requested for attendance.
- `selfieMode=REQUIRED` is accepted only when production biometric enforcement configuration and providers are valid; otherwise policy save fails closed.
- Registered-device and integrity controls remain independent security decisions. Disabling face verification does not silently disable device/integrity protections.
- Only active employees with a resolved tenant context receive a bootstrap. Suspended tenants, terminated employees and unavailable workspaces fail before tenant data is returned.

### 5.2 New policy vocabulary

| Field | Values | Meaning |
|---|---|---|
| `locationMode` | `NONE`, `OFFICE_GEOFENCE`, `FIELD_GPS` | Attendance location evidence required for an employee/punch type |
| `selfieMode` | `DISABLED`, `REQUIRED` | Whether verified selfie/face capture is required |
| `fieldTrackingEnabled` | boolean | Allows qualifying employees to start/continue field tracking |
| `allowHybridFieldTracking` | boolean | Allows `HYBRID` employees to use field tracking |
| `runtimeConfigVersion` | positive integer | Tenant-scoped version invalidating cached runtime configuration |

The existing boolean fields are migrated safely and remain backward-compatible during the transition:

- `requireGeofence=true` maps to `OFFICE_GEOFENCE` unless an explicitly configured field policy applies.
- `requireFaceMatch=true` maps to `REQUIRED`; `false` maps to `DISABLED`.
- Existing `requireRegisteredDevice`, `allowBiometricOptOut`, face-attempt and offline limits remain explicit in the projection.
- A database migration must backfill each existing policy deterministically before the old fields are removed in a later compatibility cleanup.

## 6. API Contract

### 6.1 Authenticated employee runtime bootstrap

`GET /mobile/runtime-config`

Authentication: employee bearer token and resolved tenant context only. No tenant ID accepted in the body or trusted from a mutable client field.

Permission: authenticated active employee with `attendance.records.self.read` or the minimal dedicated `mobile.runtime.read` permission introduced by this sprint.

Response `200`:

```json
{
  "data": {
    "configVersion": 42,
    "product": {
      "name": "DeltCRM",
      "logoUrl": null
    },
    "tenant": {
      "id": "uuid",
      "name": "Acme Logistics",
      "logoUrl": "https://signed-or-public-safe-logo-url",
      "timezone": "Asia/Dubai",
      "locale": "en-AE"
    },
    "employee": {
      "id": "uuid",
      "displayName": "Employee Name",
      "workType": "OFFICE",
      "status": "ACTIVE"
    },
    "modules": {
      "attendance": { "enabled": true },
      "fieldTracking": { "enabled": false },
      "regularization": { "enabled": false }
    },
    "attendance": {
      "canPunch": true,
      "locationMode": "OFFICE_GEOFENCE",
      "selfieMode": "DISABLED",
      "registeredDeviceRequired": true,
      "integrityRequired": true,
      "maxOfflineSyncHours": 48
    },
    "fieldTracking": {
      "enabled": false,
      "intervalMinutes": null
    },
    "onboarding": {
      "deviceRegistrationRequired": true,
      "locationPermissionRequired": true,
      "biometricConsentRequired": false,
      "faceEnrollmentRequired": false
    }
  }
}
```

Response headers:

- `Cache-Control: no-store`
- `ETag` based on tenant runtime configuration version and employee policy assignment version when safe to expose

The server returns `304` only when authentication and tenant eligibility are still revalidated. The client must never use a cached configuration after logout.

### 6.2 Attendance configuration extensions

Existing tenant/admin attendance-policy routes are extended; their final path names must follow the current controller rather than creating a parallel policy API.

`POST|PATCH /attendance-config/policies` adds:

```json
{
  "locationMode": "OFFICE_GEOFENCE",
  "selfieMode": "DISABLED",
  "fieldTrackingEnabled": false,
  "allowHybridFieldTracking": false
}
```

Validation:

- `FIELD_GPS` and `fieldTrackingEnabled=true` require the tenant's active `FIELD_TRACKING` entitlement.
- `selfieMode=REQUIRED` requires valid biometric production gates when environment is production.
- `OFFICE_GEOFENCE` requires at least one assigned/available office for affected employees before the policy can be activated.
- `fieldTrackingEnabled=true` requires a valid interval within the existing 1-120 minute tenant settings range.
- Tenant/default, department and employee assignment precedence remains explicit and auditable.

### 6.3 Tenant capability configuration

`GET /workspace/attendance-capabilities`  
`PATCH /workspace/attendance-capabilities`

Read permission: `attendance.config.read`. Write permission: `attendance.config.manage`.

The PATCH DTO accepts only tenant-level switches allowed by active platform entitlements. It does not activate a commercial module. Every successful change:

- increments `runtimeConfigVersion` atomically;
- writes an attributed audit event;
- writes an outbox event, for example `tenant.runtime-config.changed.v1`;
- causes later bootstrap/command validation to use the new configuration.

### 6.4 Enforcement contract changes

- Punch/verification endpoints resolve `locationMode` and `selfieMode` from the effective policy rather than treating current booleans as the primary source.
- Field-session start, ping and replay endpoints resolve the same runtime capability server-side and reject disabled/unauthorized tracking.
- Existing `GET /workspace/modules` remains the web shell's administrative read model. It is not a replacement for `/mobile/runtime-config`.

## 7. Permission Matrix

| Action | Employee | Manager | HR/Admin | Platform owner |
|---|---|---|---|---|
| Read own runtime configuration | `mobile.runtime.read` | own only | own only | no tenant impersonation required |
| Read attendance capability configuration | own projection only | scoped read | `attendance.config.read` | entitlement read |
| Change tenant capability configuration | no | no unless explicitly granted | `attendance.config.manage` | no direct tenant-policy mutation |
| Enable/disable commercial module entitlement | no | no | no | platform module management only |
| Start/ping/stop field tracking | only effective-enabled self | no | no | no |
| View tenant runtime change audit | no | scoped if granted | `audit.read` / config scope | platform audit scope |

Permission and entitlement checks run on every protected API operation. A stale client that shows a previous feature must receive an authoritative denial, never a cross-tenant or policy detail leak.

## 8. Data Model, Migration and RLS

### 8.1 Schema changes

- [x] Add `LocationMode` and `SelfieMode` Prisma enums.
- [x] Add `locationMode`, `selfieMode`, `fieldTrackingEnabled` and `allowHybridFieldTracking` to `AttendancePolicy`.
- [x] Add `runtimeConfigVersion` to `TenantSettings`, default `1`, and increment it inside all configuration/assignment transactions that can affect employee runtime behavior.
- [x] Add `locale` to `TenantSettings` only if absent from the existing tenant/workspace read model; default conservatively and validate BCP 47 format.
- [x] Use existing employee/policy `updatedAt` metadata with the tenant version to produce deterministic bootstrap ETags.
- [x] Preserve `companyLogo`/`companyLogoKey` with one authoritative safe-logo resolver. The bootstrap response returns a signed URL only after tenant ownership validation.

### 8.2 Migration rules

- [x] Write a forward-only migration and a backfill that maps current boolean policy behavior exactly.
- [x] Deploy read compatibility first: resolver understands old and new fields while backfill is verified.
- [x] Switch writers and runtime projection to new fields only after seeded migration verification.
- [x] Retain legacy booleans for one compatibility release; remove them only in a separately reviewed cleanup migration.
- [x] Retain the existing effective-assignment indexes; no duplicate index was added without query-plan evidence.

### 8.3 Isolation and safety

- [x] Every new/changed tenant query uses `forTenant()` and receives RLS policies/grants where required.
- [x] Bootstrap has no caller-controlled tenant identifier; JWT/context tenant must match any header/context assertion.
- [x] Cross-tenant IDs return `404`, not policy or branding metadata.
- [x] Tenant runtime cache keys include tenant ID, employee ID and configuration version; logout deletes the entire scoped cache.
- [x] Logo handling validates content type/size, uses object storage keys rather than arbitrary URLs, and prevents an untrusted image URL from being injected into a client response.

## 9. Error Catalog

| Code | Status | Meaning |
|---|---:|---|
| `RUNTIME_CONFIG_UNAVAILABLE` | 503 | Runtime configuration cannot be resolved safely |
| `RUNTIME_CONFIG_STALE` | 409 | Client action uses a stale configuration version when version pinning is required |
| `TENANT_SUSPENDED` | 403 | Tenant is suspended/unavailable |
| `EMPLOYEE_NOT_ACTIVE` | 403 | Employee is terminated/inactive or cannot use attendance |
| `MODULE_ACCESS_DENIED` | 403 | Tenant is not entitled to the requested module |
| `CAPABILITY_NOT_ENABLED` | 403 | Tenant/policy disables the requested feature |
| `FIELD_TRACKING_NOT_ELIGIBLE` | 403 | Work type/policy does not permit field tracking |
| `ONBOARDING_REQUIRED` | 409 | Required device, location, consent or enrollment task remains incomplete |
| `OFFICE_CONFIGURATION_REQUIRED` | 422 | Office-geofence policy cannot be activated without suitable office configuration |
| `BIOMETRIC_PROVIDER_UNAVAILABLE` | 422/503 | Required selfie policy cannot be saved/enforced safely |
| `TENANT_LOGO_INVALID` | 422 | Logo reference fails safety/type/ownership validation |

## 10. Web and Flutter Implementation

### 10.1 Web: HR/business-admin

- [x] Keep the simplified information architecture: Dashboard, Employees, Modules and Settings.
- [x] Add an Attendance capability page below `Modules -> Attendance`, not a new top-level sidebar item.
- [x] Present clear controls/status for attendance availability, office location, selfie/face verification, registered devices, integrity baseline and field tracking.
- [x] Show a locked explanatory state where a capability is not commercially entitled; platform entitlement remains outside tenant administration.
- [x] Show employee/department policy precedence and impact preview before an HR user saves a change.
- [x] Add tenant logo management under Settings/Organization with image validation and preview.
- [x] Replace active runtime `IndigoHR`/`IndigoCRM` product labels with `DeltCRM`; do not rewrite archived `docs/stitch_raw` references.

### 10.2 Flutter: runtime config and navigation

- [x] Replace hard-coded `TenantConfig` module/policy defaults with a `TenantRuntimeRepository` backed by `/mobile/runtime-config`.
- [x] Fetch configuration immediately after authentication, refresh when app resumes and token refreshes, and refresh after an authoritative module/capability denial.
- [x] Make bootstrap an explicit router state: `unauthenticated -> loadingRuntimeConfig -> requiredOnboarding -> home`.
- [x] Guard every feature route with runtime capabilities; a manually entered deep link receives a clear forbidden/unavailable state rather than rendering feature UI.
- [x] Build navigation/home cards from enabled runtime modules rather than constants.
- [x] Request location only when location mode requires it. Request camera/biometric consent/enrollment only when selfie mode requires it.
- [x] Use location-only punch capture when `selfieMode=DISABLED`; use verified capture only when `selfieMode=REQUIRED`.
- [x] Start and continue background tracking only with an enabled field capability and active field session. When disabled, stop scheduling, preserve existing auditable queue behavior and show a truthful status.
- [x] Clear secure storage, configuration cache, queued tenant-bound UI state and branding on logout, token invalidation and tenant switch.

### 10.3 Branding rules

| Surface | Brand shown |
|---|---|
| Mobile launch, login, password recovery and unauthenticated errors | DeltCRM |
| Web public signup/login/verification/reset | DeltCRM |
| Authenticated employee app header/profile | Tenant logo/name, with DeltCRM available in product/about context |
| Authenticated HR shell | Tenant logo/name; DeltCRM remains the platform product identity |
| Platform owner console | DeltCRM Platform Administration |

## 11. Ordered Work Packages

### 6.5.0 Contract and design freeze

- [x] Record the product decisions in this plan and map existing Stitch references to web/mobile routes and required states.
- [x] Confirm exact policy field semantics with product/security, including whether `HYBRID` can start field tracking.
- [x] Define production biometric gating and logo/object-storage ownership rules.
- [x] Produce a configuration matrix for office-only, face/location, field and disabled attendance tenants.

**Gate:** API contract, error codes, migration mapping and route/state map approved before schema work.

### 6.5.1 Data model and effective-policy resolver

- [x] Add enums/fields, migration/backfill, RLS and seed fixtures.
- [x] Extend effective policy resolution without changing existing behavior unexpectedly.
- [x] Add version increment utilities called by policy, assignment, tenant capability and relevant tenant-settings writes.
- [x] Emit audit/outbox events transactionally.

**Gate:** migration passes on a seeded database and policy precedence tests prove exact old/new compatibility.

### 6.5.2 Runtime bootstrap and server enforcement

- [x] Implement `/mobile/runtime-config` with strict tenant/employee guards and a minimal safe response.
- [x] Implement entitlement-aware workspace attendance capability routes.
- [x] Update punch, verification and field tracking authorization to consume the resolved capability projection server-side.
- [x] Export OpenAPI and generated client changes.

**Gate:** tenant A/B isolation, suspended tenant, inactive employee and stale-config e2e tests pass.

### 6.5.3 HR capability and tenant-brand administration

- [x] Build the Attendance configuration page within the existing Modules information architecture.
- [x] Build tenant logo/name management and capability entitlement-lock states.
- [x] Implement loading, validation, conflict, forbidden and policy-impact states.
- [x] Replace active web product labels with DeltCRM.

**Gate:** Playwright validates HR configuration changes and an employee runtime response changes only for the correct tenant/policy scope.

### 6.5.4 Flutter dynamic runtime

- [x] Implement repository, typed model, secure cache/version handling and refresh lifecycle.
- [x] Implement dynamic router, onboarding and navigation gates.
- [x] Implement location-only versus verified-selfie punch capture behavior.
- [x] Implement field tracking/background execution gating and safe stop behavior.
- [x] Apply DeltCRM public branding and tenant branding after bootstrap.

**Gate:** Flutter integration tests pass for all four configuration examples without compiling tenant-specific app variants.

### 6.5.5 Hardening and release evidence

- [x] Execute the final tenant A/B API/RLS and web e2e post-hardening reruns; exact results are recorded in Section 17.
- [x] Execute the final post-fix Flutter analyze/test rerun in an environment with SDK cache execution access.
- [x] Document cache/privacy handling, logo validation, legacy policy migration and known production provider dependencies.
- [x] Update OpenAPI/generated contracts, implementation index, feature matrix and production-provider runbook.

**Gate:** no direct API route can bypass a hidden capability; all runtime states are documented and tested.

## 12. Test Plan

### API and database

- [x] Unit test policy backfill, precedence and capability resolver for tenant default, department and employee overrides.
- [x] Unit test runtime projection never exposes raw face templates, sensitive office metadata, other employee data or arbitrary storage URLs.
- [x] Integration test tenant entitlement plus tenant configuration plus policy/work-type combinations.
- [x] E2E test office location-only punch skips face verification but enforces office location.
- [x] E2E test face-and-location policy requires expected onboarding and verification gates.
- [x] E2E test field tracking rejects `OFFICE`, permits eligible `FIELD`, and treats `HYBRID` according to explicit policy.
- [x] E2E test disabling field tracking stops new ping/session commands server-side while retaining prior evidence.
- [x] Add coverage for suspended tenant, inactive employee, missing office, invalid logo and biometric production-provider failure.
- [x] RLS/fail-closed tests prove tenant A cannot read or cache tenant B's brand/configuration.

### Web

- [x] Add Playwright HR scenario for the consolidated path and location-only policy payload; API e2e confirms the employee runtime projection.
- [x] Add Playwright entitlement-lock scenario: field controls cannot be enabled without active `FIELD_TRACKING` entitlement.
- [x] Add visual checks for DeltCRM public authentication, tenant-branded authenticated shell, mobile-width admin settings, validation/error/suspended states.
- [x] Accessibility: labelled controls, keyboard operability, error announcement and logo alternative text.

### Flutter

- [x] Unit tests for runtime JSON parsing, cache scoping, version refresh and logout clearing.
- [x] Router/widget tests for DeltCRM unauthenticated branding and tenant brand after bootstrap.
- [x] Widget/integration fixtures for location-only, face-plus-location, field-enabled and attendance-disabled tenants.
- [x] Permission behavior confirms camera/biometric/location requests are not made for disabled capabilities.
- [x] Background tracking behavior confirms a changed capability stops scheduling and no new field-ping command is sent.
- [x] Golden screenshots cover runtime/onboarding/feature states and tenant fallback across 20 screens.

## 13. Stitch Acceptance

- [x] Use Stitch screens as layout/reference inputs only; product rules in this plan and tested behavior are authoritative.
- [x] Map relevant mobile login, permission/onboarding, home, attendance and field-map references to `M2-M6`, `M16-M17` routes/states.
- [x] Map business-admin attendance configuration to the existing `B`/`H` shell rather than adding a scattered navigation tab.
- [x] Preserve the current charcoal/white visual language unless an intentional DeltCRM brand token change is approved.
- [x] Maintain reference and implementation baselines for desktop/mobile and loading, validation, forbidden, suspended and offline states.

## 14. Deterministic Acceptance Fixtures

Create four tenants, each with isolated users, offices and policies:

| Fixture | Modules/policy | Expected result |
|---|---|---|
| `dubai-office` | Attendance; office-geofence; no selfie; no field tracking | Location-only onboarding/punch and no field UI |
| `doha-secure` | Attendance; office-geofence; face required; device required | Device, consent/enrollment and verified punch flow |
| `riyadh-field` | Attendance + field tracking; field GPS; field enabled | Eligible field employee can track; office employee cannot |
| `paused-attendance` | Attendance entitlement inactive or tenant suspended | Bootstrap/feature access denied without tenant data leak |

For every fixture, use fixed IDs, dates, location coordinates and policy version values. The acceptance run records runtime response snapshots, route visibility, permission prompts, attempted bypass API responses and logout cache cleanup.

## 15. Definition of Done

- [x] DeltCRM is the public product brand on active web/mobile authentication surfaces.
- [x] Authenticated apps use the correct tenant name/logo with a safe fallback.
- [x] Runtime config is fetched, versioned, refreshed and cleared securely.
- [x] Attendance, selfie, location, device and field tracking behavior are dynamically derived from entitlement plus effective policy.
- [x] HR can configure allowed capabilities in the consolidated Modules/Attendance area without gaining platform entitlement powers.
- [x] API authorization rejects every disabled capability regardless of client UI state.
- [x] Database migration/backfill, OpenAPI, RLS, audit/outbox, unit, integration, e2e, Playwright, Flutter and visual checks pass.
- [x] Archived design reference artifacts remain untouched; runtime UI changes and deliberate design corrections are documented.

## 16. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 6.5.0 Contract and design freeze | Complete | Sections 1-7 and 13-15 define the approved hierarchy, matrix, routes and brand rules. |
| 6.5.1 Data model and effective-policy resolver | Complete | `20260718110000_sprint65_dynamic_runtime`, Prisma schema/backfill, resolver/version unit coverage. |
| 6.5.2 Runtime bootstrap and server enforcement | Complete | `runtime-config/`, attendance/field enforcement, generated OpenAPI and Sprint 6.5 tenant A/B e2e. |
| 6.5.3 HR capability and tenant-brand administration | Complete | Modules/Attendance capability route, policy impact editor, Settings logo/locale, tenant shell branding, Playwright contract. |
| 6.5.4 Flutter dynamic runtime | Complete | Runtime repository/model, secure scoped cache, dynamic router/navigation/permissions/punch/tracking, 20 golden baselines. |
| 6.5.5 Hardening and release evidence | Complete | API e2e, Playwright, Flutter analysis, all 68 Flutter tests, accessibility checks and 20 golden baselines pass. |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`. A status can move to `Complete` only with linked migration, contract, test and visual evidence.

## 17. Validation Evidence

Validated on July 18, 2026:

- API migration `20260718110000_sprint65_dynamic_runtime` applied to the seeded local PostgreSQL database before the final sandbox restriction.
- API OpenAPI export and generated TypeScript/Flutter route contracts completed with no drift.
- API lint, typecheck and production build pass; all `40` unit suites and `227` tests pass.
- Sprint 6 field-sync e2e passed `7/7`; Sprint 6.5 runtime e2e passes `5/5` for ETag, isolation, entitlement, safe-stop and suspended-workspace behavior.
- Web lint and typecheck pass; Next.js webpack production build compiles all `39` routes, including `/app/modules/attendance/capabilities`.
- `e2e/sprint65-dynamic-runtime.spec.ts` passes `3/3`, covering consolidated navigation, location-only policy, entitlement lock, tenant branding and mobile-width overflow.
- Flutter formatting is clean, analysis reports no issues, and all `68/68` tests pass. The run includes tenant runtime/cache cleanup, dynamic navigation and permissions, offline sync, responsive route rendering, 200 percent text scaling, automated accessibility checks and all 20 golden baselines.
- Known production provider setup remains documented in `SPRINT-6-PRODUCTION-PROVIDERS.md`; production biometric and integrity paths fail closed when adapters are unavailable.
