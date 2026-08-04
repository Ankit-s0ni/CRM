# Platform Product Catalog and Plan Entitlements Implementation Plan

## 1. Purpose

**Status:** In progress  
**Delivery slot:** Sprint 8 remediation work package 8.1R  
**Primary users:** DeltCRM Super Admin, tenant Business Admin, tenant HR  
**Depends on:** Existing module registry, subscriptions, runtime configuration, tenant Attendance policies, audit/outbox infrastructure  
**Exit outcome:** DeltCRM presents one clear Attendance product for the MVP, optional Attendance add-ons and capabilities are no longer represented as unrelated CRM modules, and every commercial plan explicitly shows the products, features and limits it grants.

> **Updated product decision:** `docs/ATTENDANCE-LEAVE-SIMPLIFICATION-IMPLEMENTATION-PLAN.md` supersedes this document's classification of Leave as a future standalone product. Leave will be an included Attendance workflow; Payroll remains a future standalone product.

The current platform registry exposes implementation keys as if they were five independent products. This makes `REGULARIZATION`, `FIELD_TRACKING`, `LEAVE` and `PAYROLL` appear equally complete and independently purchasable even though the current product is Attendance-first. The implementation must separate the commercial catalog from tenant policy configuration without deleting working APIs or changing employee behavior unexpectedly.

## 2. Product Decisions

### 2.1 Terminology

| Term | Meaning | Example |
|---|---|---|
| Product module | A standalone product that can appear in the DeltCRM module catalog | Attendance |
| Add-on | An optional commercial extension that requires a parent product | Field Workforce Tracking |
| Capability | A feature included by a plan and configured inside a product | Regularization, selfie verification, payroll export |
| Plan | A priced bundle of products, add-ons, capabilities and usage limits | Starter Trial, Growth, Enterprise |
| Tenant entitlement | The maximum functionality the tenant is licensed to use | Attendance plus regularization |
| Tenant configuration | How HR configures entitled functionality | Selfie disabled for office staff |
| Employee effective policy | Final runtime rules resolved for one employee | Office geofence required, selfie not required |

### 2.2 MVP catalog

| Current registry item | Target classification | Platform treatment |
|---|---|---|
| `ATTENDANCE` | Product module | Visible and sellable |
| `FIELD_TRACKING` | Attendance add-on | Visible under Attendance; cannot be purchased without Attendance |
| `REGULARIZATION` | Attendance capability | Removed from the top-level module matrix |
| `LEAVE` | Legacy implementation key | Hidden/deprecated; Leave is included inside Attendance |
| `PAYROLL` | Future product module | `COMING_SOON`; full Payroll is not claimed as available |

Attendance payroll export and period locking remain available as the `ATTENDANCE_PAYROLL_EXPORT` capability. They must not imply that DeltCRM currently provides a complete payroll engine.

### 2.3 Entitlement versus policy rule

The platform plan defines what a tenant **may use**. Tenant HR defines what the tenant **does use**.

```text
Plan entitlement
  -> optional audited tenant override
    -> tenant enables/configures Attendance capability
      -> policy assignment resolves department/employee rules
        -> web/mobile runtime displays and enforces the effective policy
```

An HR administrator cannot enable a capability excluded by the subscription. A plan including selfie verification does not force every employee to submit a selfie; it only allows HR to configure that requirement. Employee, department and tenant policy precedence remains unchanged.

## 3. Initial Attendance Feature Catalog

The following stable keys form the selectable plan feature catalog. Labels and descriptions are customer-facing; internal permission names must not be shown.

| Feature key | Customer label | Type | HR configurable | Runtime effect |
|---|---|---|---|---|
| `ATTENDANCE_CORE` | Attendance check-in and check-out | Included core | Yes | Enables Attendance runtime |
| `ATTENDANCE_OFFICE_GEOFENCE` | Office location verification | Boolean | Yes | Allows office geofence policies |
| `ATTENDANCE_DEVICE_TRUST` | Registered device verification | Boolean | Yes | Allows device-required policies |
| `ATTENDANCE_SELFIE` | Selfie verification | Boolean | Yes | Allows selfie-required policies |
| `ATTENDANCE_SHIFTS_ROSTERS` | Shifts and rosters | Boolean | Yes | Enables shift/roster setup and resolution |
| `ATTENDANCE_REGULARIZATION` | Attendance correction requests | Boolean | Yes | Enables employee request and HR approval flows |
| `ATTENDANCE_LEAVE` | Leave policies and requests | Included core | Yes | Enables tenant-wide policies, balances, requests, and approvals |
| `ATTENDANCE_REPORTS_BASIC` | Attendance registers and basic reports | Included core | No | Enables register and standard reports |
| `ATTENDANCE_REPORTS_ADVANCED` | Advanced attendance reports | Boolean | No | Enables late/OT/violation reporting |
| `ATTENDANCE_PAYROLL_EXPORT` | Payroll-ready export and period lock | Boolean | Yes | Enables export, lock and reopen workflows |
| `ATTENDANCE_FIELD_TRACKING` | Field Workforce Tracking | Add-on capability | Yes | Enables field GPS, offline queue, live location and routes |

`ATTENDANCE_CORE`, `ATTENDANCE_REPORTS_BASIC`, and `ATTENDANCE_LEAVE` are automatically included whenever Attendance is selected. The UI must explain this rather than presenting checkboxes that can create an invalid plan.

## 4. Initial Plan Templates

Prices, currencies, employee limits and billing intervals remain editable by the Super Admin. The feature composition below is the default seed and can be changed through the validated plan editor.

| Feature | Starter Trial | Growth | Enterprise |
|---|:---:|:---:|:---:|
| Attendance core | Included | Included | Included |
| Basic reports/register | Included | Included | Included |
| Office geofence | Included | Included | Included |
| Device trust | Included | Included | Included |
| Shifts and rosters | Included | Included | Included |
| Regularization | Included | Included | Included |
| Selfie verification | Not included | Included | Included |
| Advanced reports | Not included | Included | Included |
| Payroll export and lock | Not included | Included | Included |
| Field Workforce Tracking | Not included | Optional | Included |
| Leave Management | Included | Included | Included |
| Full Payroll | Not available | Not available | Not available |

The plan list and tenant subscription views must show this matrix in plain language. “Optional” means the add-on may be enabled by an explicit subscription/tenant entitlement; it is not automatically granted by selecting Growth.

## 5. Required Data Model

### 5.1 Preserve and narrow the existing module model

Keep `Module` and `TenantModule`, but use them only for products and commercial add-ons.

Add to `Module`:

| Field | Rule |
|---|---|
| `kind` | `PRODUCT` or `ADD_ON` |
| `parentModuleId` | Required for `ADD_ON`; null for `PRODUCT` |
| `catalogOrder` | Stable nonnegative display order |
| `customerVisible` | Controls catalog visibility without deleting records |

`FIELD_TRACKING` becomes an `ADD_ON` whose parent is `ATTENDANCE`. The legacy `LEAVE` record becomes hidden/deprecated because Leave is included in Attendance. `PAYROLL` remains a `COMING_SOON` product and is not assignable to active plans.

### 5.2 Add capability models

```prisma
model ModuleCapability {
  id              String
  moduleId        String
  key             String
  name            String
  description     String?
  availability    ModuleAvailability
  isCore          Boolean
  configurable    Boolean
  dependencyKeys  String[]
  conflictKeys    String[]
  displayOrder    Int
}

model SubscriptionPlanCapability {
  planId          String
  capabilityId    String
  included        Boolean
  limitValue      Json?
}

model TenantCapabilityOverride {
  tenantId        String
  capabilityId    String
  mode            TenantOverrideMode // INHERIT, ENABLE, DISABLE
  limitValue      Json?
  reason          String
  startsAt        DateTime?
  endsAt          DateTime?
  changedBy       String
}
```

Required constraints:

- Capability key is globally unique and immutable after use.
- Capability dependencies are resolved transitively; every dependency must exist and be available.
- Capability dependency graphs must be acyclic and a capability cannot depend on or conflict with itself.
- A capability cannot simultaneously depend on and conflict with the same capability.
- Plan/capability and tenant/capability pairs are unique.
- Core capabilities cannot be disabled while their product is active.
- Add-on capability requires its parent product in the same effective entitlement.
- Overrides require an auditable reason and cannot enable `COMING_SOON` functionality.
- Time-bound overrides are evaluated in UTC and cannot have `endsAt <= startsAt`.
- Existing `TenantModule` records continue to materialize active product/add-on access during the migration.

### 5.3 Effective entitlement response

The server returns one normalized contract and becomes the only source of truth:

```json
{
  "plan": { "id": "...", "name": "Growth" },
  "products": [
    { "key": "ATTENDANCE", "source": "PLAN", "active": true }
  ],
  "addOns": [
    { "key": "FIELD_TRACKING", "source": "OVERRIDE", "active": false }
  ],
  "capabilities": [
    {
      "key": "ATTENDANCE_SELFIE",
      "included": true,
      "configured": false,
      "source": "PLAN"
    }
  ],
  "limits": { "employees": 500 }
}
```

The response distinguishes `included` from `configured`; clients must never infer licensing from the presence of a navigation item.

### 5.4 Capability dependency graph

The API, not the browser, owns dependency resolution. When a Super Admin selects a capability, the server computes its full transitive closure and automatically includes mandatory dependencies. When removing a dependency, the server either removes its dependants in the reviewed change set or rejects the request; it never save a partially valid plan.

| Capability | Mandatory dependencies |
|---|---|
| `ATTENDANCE_CORE` | None |
| `ATTENDANCE_REPORTS_BASIC` | `ATTENDANCE_CORE` |
| `ATTENDANCE_OFFICE_GEOFENCE` | `ATTENDANCE_CORE` |
| `ATTENDANCE_DEVICE_TRUST` | `ATTENDANCE_CORE` |
| `ATTENDANCE_SELFIE` | `ATTENDANCE_CORE` |
| `ATTENDANCE_SHIFTS_ROSTERS` | `ATTENDANCE_CORE` |
| `ATTENDANCE_REGULARIZATION` | `ATTENDANCE_CORE` |
| `ATTENDANCE_LEAVE` | `ATTENDANCE_CORE` |
| `ATTENDANCE_REPORTS_ADVANCED` | `ATTENDANCE_REPORTS_BASIC` |
| `ATTENDANCE_PAYROLL_EXPORT` | `ATTENDANCE_REPORTS_BASIC` |
| `ATTENDANCE_FIELD_TRACKING` | `ATTENDANCE_CORE` plus the `FIELD_TRACKING` add-on |

Dependencies describe technical/product prerequisites, not policy choices. For example, selfie verification requires Attendance core but does not force HR to require registered-device verification unless the selected attendance policy enables it.

## 6. Platform Admin Information Architecture

### 6.1 Products page: `/platform/modules`

Rename the visible concept from **Module Registry** to **Product Catalog**.

- Left column lists customer-facing products only.
- Attendance expands to show included capabilities and the Field Workforce Tracking add-on.
- Leave appears in Attendance's included feature list; Payroll appears under “Coming later.”
- The tenant matrix contains columns for `Attendance` and `Field Tracking add-on`, not every internal capability.
- Selecting a tenant opens an entitlement drawer showing plan source, overrides, effective dates and reasons.
- Direct toggles are replaced by `Manage entitlement` so accidental divergence from the plan is harder.
- Every override displays “Overrides [plan name]” and requires a reason.

### 6.2 Plans page: `/platform/plans`

Each plan card must show:

- Plan name and active/draft state
- Price, currency and billing interval
- Employee limit
- Included product modules
- Included capabilities grouped under each product
- Optional add-ons
- Number of subscribed tenants
- Last updated date

The plan editor becomes a guided three-step flow:

1. **Basics:** name, description, price, currency, interval and employee limit.
2. **Products and features:** select Attendance, review automatically included core features, select optional capabilities and add-ons.
3. **Review impact:** see a readable feature summary, dependency errors and affected tenant count before saving.

Automatically added dependencies are visibly marked as “Required by [feature]” and cannot be unchecked while a dependant remains selected. Removing a parent displays all features that will also be removed and requires confirmation in the review step.

Editing an in-use plan must show whether the change grants or removes access. Capability removal is never silently applied to active tenants; the Super Admin must choose a scheduled effective date or cancel the change.

### 6.3 Tenant detail: `/platform/tenants/:id`

The subscription tab shows:

- Current plan and billing state
- Products, add-ons and capabilities inherited from the plan
- Tenant-specific overrides with actor, reason and expiry
- Effective feature summary
- “Change plan” and “Manage overrides” as separate actions

This distinction prevents support staff from changing a plan when they only intend to grant a temporary feature.

## 7. API Contract

### 7.1 Catalog

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/platform/catalog` | Products, add-ons and capabilities grouped for admin UI |
| `GET` | `/platform/catalog/:moduleKey` | One product with capabilities and dependencies |
| `PATCH` | `/platform/modules/:id` | Maintain product/add-on metadata and availability |
| `POST` | `/platform/modules/:id/capabilities` | Create a capability before it is used |
| `PATCH` | `/platform/capabilities/:id` | Update customer label, description and availability |

The existing module-list route remains temporarily available for compatibility but is deprecated in generated documentation after the new catalog endpoint ships.

### 7.2 Plans

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/platform/plans` | List plans with grouped feature summaries |
| `POST` | `/platform/plans` | Create a draft/active plan and its capability bundle |
| `GET` | `/platform/plans/:id/impact` | Preview affected tenants before a plan update |
| `PATCH` | `/platform/plans/:id` | Update basics or schedule entitlement changes |

Plan writes accept `moduleKeys`, `addOnKeys` and `capabilityKeys` as separate arrays. The server adds core capabilities and validates dependencies. It never trusts the web client to produce a valid bundle.

### 7.3 Tenant entitlements

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/platform/tenants/:id/entitlements` | Return plan, overrides and effective access |
| `PUT` | `/platform/tenants/:id/entitlement-overrides` | Replace audited explicit overrides |
| `DELETE` | `/platform/tenants/:id/entitlement-overrides/:capabilityKey` | Return a capability to plan inheritance |
| `GET` | `/runtime-config` | Continue returning employee-safe effective runtime behavior |

The old `PUT /platform/tenants/:id/modules` route remains behind a compatibility adapter until all web and tests use the entitlement routes.

## 8. Permissions and Audit

| Action | Super Admin | Support |
|---|---|---|
| Read catalog/plans/effective entitlements | Yes | Yes |
| Create or edit plan | `platform.plans.manage` plus fresh MFA | No |
| Change product availability | `platform.modules.manage` plus fresh MFA | No |
| Add/remove tenant override | `platform.modules.manage` plus fresh MFA and reason | No by default |
| View tenant override history | Yes | Yes |

Required audit events:

- `platform.catalog.capability.created`
- `platform.catalog.item.updated`
- `platform.plan.entitlements.updated`
- `platform.tenant.entitlement.override.created`
- `platform.tenant.entitlement.override.removed`
- `tenant.runtime.entitlements.changed`

Plan and override mutations append outbox events in the same transaction and bump the tenant runtime configuration version for every affected tenant.

## 9. Migration and Compatibility

Migration must preserve existing tenant behavior before changing labels or screens.

1. Add catalog classification and capability tables without removing existing rows.
2. Seed Attendance capabilities idempotently.
3. Convert plan `REGULARIZATION` relations into `ATTENDANCE_REGULARIZATION` capability grants.
4. Convert active tenant `REGULARIZATION` records into equivalent capability overrides only when they differ from the plan.
5. Classify `FIELD_TRACKING` as the Attendance add-on and retain existing active assignments.
6. Convert current payroll export/lock access into `ATTENDANCE_PAYROLL_EXPORT`; do not grant a future full Payroll product.
7. Add `ATTENDANCE_LEAVE` to every Attendance plan and hide/deprecate the legacy `LEAVE` product record.
8. Preserve existing Leave policies, balances, requests, ledger entries, permissions, and routes while removing dependence on the legacy module assignment.
9. Deploy compatibility response adapters, migrate platform web usage, then deprecate raw module assignment.
10. Remove obsolete seeded relations only after before/after entitlement snapshots match for every tenant.

The migration command must produce a dry-run report containing each tenant's old keys, new products, new capabilities and any manual-review warning.

## 10. Business Invariants

- Attendance is the only generally available standalone MVP product.
- Field Tracking cannot resolve active unless Attendance is active.
- Regularization is never displayed as a standalone product.
- Payroll export does not activate or advertise full Payroll.
- `COMING_SOON` products cannot be added to active plans or tenant overrides.
- A plan cannot contain zero products.
- A plan cannot exclude Attendance core capabilities while Attendance is selected.
- A plan write is rejected unless the complete transitive dependency closure is present.
- Circular dependencies and unavailable dependencies are rejected when catalog metadata is created or updated.
- HR cannot configure a capability that is absent from effective tenant entitlements.
- Removing a capability invalidates new use immediately at its effective date but preserves historical records.
- Runtime configuration is fail-closed if entitlement resolution fails.
- Tenant overrides never mutate the underlying plan.
- Plan edits and tenant overrides are atomic, audited and cache-versioned.

## 11. Error Catalog

| Code | Status | Trigger |
|---|---:|---|
| `CATALOG_ITEM_NOT_FOUND` | 404 | Unknown product/add-on/capability |
| `CATALOG_ITEM_NOT_AVAILABLE` | 409 | `COMING_SOON` or deprecated item selected |
| `CAPABILITY_PARENT_REQUIRED` | 409 | Capability selected without parent product |
| `CAPABILITY_DEPENDENCY_REQUIRED` | 409 | A mandatory transitive dependency is missing |
| `CAPABILITY_DEPENDENCY_CYCLE` | 409 | Catalog update introduces a circular dependency |
| `CAPABILITY_CONFLICT` | 409 | Selected capabilities are mutually exclusive |
| `ADD_ON_PARENT_REQUIRED` | 409 | Field Tracking selected without Attendance |
| `CORE_CAPABILITY_REQUIRED` | 409 | Attempt to remove an Attendance core feature |
| `PLAN_ENTITLEMENT_INVALID` | 422 | Invalid product/capability composition |
| `PLAN_CHANGE_IMPACT_REQUIRED` | 409 | In-use removal submitted without reviewed impact/effective date |
| `TENANT_OVERRIDE_REASON_REQUIRED` | 422 | Override lacks an auditable reason |
| `TENANT_OVERRIDE_NOT_ALLOWED` | 409 | Override attempts to grant unavailable functionality |
| `ENTITLEMENT_RESOLUTION_FAILED` | 503 | Effective entitlement cannot be safely resolved |

## 12. Ordered Work Packages

### 8.1R.1 Catalog classification and contract freeze

- [x] Approve the MVP catalog and customer-facing labels in sections 2 and 3.
- [ ] Inventory every backend guard and frontend conditional using the five legacy keys.
- [ ] Freeze the normalized entitlement response and OpenAPI examples.
- [x] Record product decisions for Leave and full Payroll.

### 8.1R.2 Schema and safe migration

- [x] Add module classification, parent relation and capability tables.
- [x] Add constraints, indexes and platform-database access policy.
- [ ] Implement idempotent seeds and a dry-run migration report.
- [x] Migrate plans and tenant assignments without changing effective runtime behavior.
- [ ] Add forward recovery notes and verify migration on a production-shaped fixture.

### 8.1R.3 Entitlement resolver and APIs

- [x] Implement one resolver for plan inheritance, overrides, availability and dependencies.
- [x] Add catalog, plan-impact and tenant-entitlement endpoints.
- [ ] Add compatibility adapter for raw module APIs.
- [x] Integrate audit, outbox and runtime config version invalidation.
- [ ] Update OpenAPI and generated client types.

### 8.1R.4 Platform Product Catalog UX

- [x] Replace the five-column raw-key matrix with products and add-ons.
- [x] Group capabilities under Attendance.
- [x] Separate available and coming-soon products.
- [x] Add accessible entitlement drawer and override workflow.
- [ ] Cover loading, empty, error, forbidden and impact-warning states.

### 8.1R.5 Plan builder UX

- [x] Implement Basics, Features and Review steps.
- [x] Show plain-language included feature matrix on every plan card/detail.
- [x] Automatically include and lock core Attendance capabilities.
- [x] Explain dependencies and unavailable products inline.
- [x] Require impact preview for in-use plan reductions.

### 8.1R.6 Runtime and tenant regression

- [ ] Update tenant module navigation to consume product entitlements only.
- [x] Update Attendance settings to consume capability grants.
- [x] Verify mobile remains driven by effective HR policy within licensed capabilities.
- [x] Confirm location-only employees do not receive selfie or field requirements.
- [ ] Confirm historical attendance, regularization and payroll exports remain readable.

### 8.1R.7 Documentation and rollout

- [ ] Publish a Super Admin guide for creating plans and granting overrides.
- [ ] Add plan-feature definitions to the billing user guide.
- [ ] Add migration reconciliation evidence and known legacy overrides.
- [ ] Enable the redesigned catalog after shadow comparison passes.

## 13. Test Plan

### Unit

- [x] Core capabilities are automatically included with Attendance.
- [x] Transitive dependencies are automatically included and returned in the plan preview.
- [ ] Circular, missing, unavailable and conflicting dependencies are rejected.
- [ ] Removing a parent capability reports every affected dependant before commit.
- [x] Field Tracking without Attendance is rejected.
- [ ] Coming-soon products are rejected from active plans.
- [ ] Plan inheritance and `INHERIT`/`ENABLE`/`DISABLE` precedence resolve deterministically.
- [ ] Expired overrides return to plan behavior.
- [x] HR configuration cannot exceed the entitlement ceiling.

### Database and integration

- [x] Legacy plan/tenant fixtures produce identical effective Attendance behavior after migration.
- [ ] Migration and seed are idempotent.
- [ ] Concurrent plan updates do not produce partial capability bundles.
- [x] Every affected tenant receives one runtime version bump and an auditable event.
- [x] Cross-tenant entitlement access is impossible.

### API e2e

- [ ] Create each initial plan template and verify its feature summary.
- [x] Preview and schedule an in-use plan reduction.
- [ ] Grant and remove a temporary Field Tracking override.
- [ ] Reject Regularization as a top-level product assignment.
- [ ] Verify compatibility routes return equivalent effective access.
- [ ] Verify permission and fresh-MFA requirements.

### Platform web

- [x] Super Admin can understand a plan's included features without opening raw keys.
- [x] Plan editor prevents invalid product/capability combinations.
- [x] Product catalog shows only Attendance as generally available MVP product.
- [x] Tenant detail clearly distinguishes plan inheritance and overrides.
- [ ] Responsive, keyboard, focus, modal-scroll and error-layer behavior pass.

### Tenant web and mobile regression

- [x] Office location-only policy requests location but not selfie/background tracking.
- [ ] Selfie-enabled policy requests camera only at the required punch step.
- [x] Field Tracking appears only when add-on entitlement, tenant configuration and employee policy all allow it.
- [ ] Regularization navigation follows the capability grant.
- [ ] Payroll export/lock works without advertising a full Payroll product.

## 14. Acceptance Journey

1. Super Admin opens Products and sees Attendance with Leave included, Field Workforce Tracking as its optional add-on, and Payroll under Coming Later.
2. Super Admin creates a Growth plan, enters commercial details, selects Attendance capabilities and reviews a plain-language summary.
3. A tenant subscribes to Growth and inherits the exact feature set shown in the plan.
4. Super Admin grants that tenant a 30-day Field Tracking override with a reason; tenant detail shows plan versus override sources.
5. HR can configure entitled Attendance features but cannot enable an unavailable feature.
6. HR assigns an office location-only policy; the employee app requires geofence location and does not request selfie or background field tracking.
7. The override expires; Field Tracking disappears after runtime refresh while historical routes remain readable.
8. Audit records explain every plan and override transition without exposing cross-tenant data.

## 15. Definition of Done

- [x] Only actual products/add-ons appear in the platform module entitlement matrix.
- [x] Every active plan has a human-readable, validated feature definition.
- [x] Attendance capabilities are grouped under Attendance and enforced server-side.
- [x] Existing tenants retain equivalent effective functionality through migration.
- [x] Plan edits and tenant overrides are separate, safe and auditable workflows.
- [x] Tenant HR and employee runtime cannot exceed licensed capabilities.
- [ ] API, migration, unit, e2e, Playwright and mobile regression gates pass.
- [ ] Super Admin documentation explains how to create a plan and what every feature does.

## 16. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 8.1R.1 Catalog and contract | In progress | Attendance/Leave simplification is defined; Payroll remains future scope; legacy-key inventory and OpenAPI examples remain |
| 8.1R.2 Schema and migration | In progress | Capability schema, catalog migration, RLS migration and idempotent seed applied to `hrms_dev`; recovery notes remain |
| 8.1R.3 Resolver and APIs | In progress | Catalog resolver, plan impact and tenant entitlement APIs pass unit/e2e; OpenAPI export and compatibility audit remain |
| 8.1R.4 Product Catalog UX | Complete | Product/add-on catalog and tenant override workflow pass Sprint 8 Playwright at 1440px and 1024px |
| 8.1R.5 Plan builder UX | Complete | Three-step builder, dependency inclusion and guarded in-use impact preview pass API e2e and Playwright |
| 8.1R.6 Runtime regression | In progress | Capability-aware location, selfie, device, regularization and Field Tracking runtime pass focused unit/e2e; full historical regression remains |
| 8.1R.7 Documentation and rollout | Not started | Pending Super Admin guide, reconciliation notes and controlled rollout evidence |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.
