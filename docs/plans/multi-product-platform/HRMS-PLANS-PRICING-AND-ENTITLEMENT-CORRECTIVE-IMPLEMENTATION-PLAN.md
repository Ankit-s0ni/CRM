# HRMS Plans, Pricing, and Entitlement Corrective Implementation Plan

**Status:** Audit complete; corrective implementation pending
**Prepared:** 2026-08-11
**Scope:** DeltCRM Platform, separated HRMS API/web/mobile clients, and the shared product contract
**Primary decision:** HRMS is the product. Attendance, leave, payroll, field tracking, reports, and similar areas are commercial capabilities inside HRMS, not independent Platform products.

## 1. Executive conclusion

The current implementation is **partially built but not ready to be treated as reliable plan enforcement**.

The Platform already has useful foundations:

- plan CRUD and a plan-management UI;
- product/module and capability catalog tables;
- plan-to-capability assignments;
- tenant subscriptions and tenant capability overrides;
- entitlement and product-token endpoints;
- dependency validation and runtime version invalidation.

However, the complete commercial control loop is not implemented consistently:

- the codebase contains conflicting definitions of whether HRMS, Attendance, Leave, Payroll, and Field Tracking are products, modules, add-ons, or capabilities;
- the product token exposes only a small, coarse capability set;
- the separated HRMS API checks user permissions but does not generally check the purchased capability for each endpoint;
- payroll and other restricted features can therefore remain callable when the plan does not include them, if the user has the corresponding role permission;
- the employee limit is not enforced when HRMS creates, imports, or reactivates an employee;
- Platform `seatCount`, actual HRMS employee usage, and `maxEmployees` do not have one defined pricing meaning;
- fine-grained capability limits are present in the database model but are not editable, resolved, transported, or enforced end to end;
- Platform and HRMS seed paths create different catalogs and assignments;
- some existing acceptance documents describe the old monolith guard and should not be considered proof for the separated HRMS runtime.

The correct authorization equation must be:

```text
ALLOW = active subscription
    AND HRMS product enabled
    AND requested HRMS capability included in the effective plan
    AND signed-in user has the required tenant permission
    AND the resource is inside the user's business scope
    AND the applicable usage limit has not been exceeded
```

No one layer replaces another:

- **Platform** owns products, editions, prices, subscription state, commercial capabilities, limits, and exceptional overrides.
- **Tenant HRMS admin** assigns roles and permissions to employees within the capabilities purchased by that tenant.
- **HRMS** owns HR business rules, actual usage, resource scope, and server-side enforcement.
- **The shared contract** defines stable claim, capability, limit, error, and event shapes. It does not make authorization decisions by itself.

## 2. Audit scope and evidence

This audit reviewed the following current implementation areas.

| Area | Principal evidence |
|---|---|
| Platform subscription/catalog schema | `CRM/apps/api/prisma/schema.prisma` |
| Platform seed catalogs | `CRM/apps/api/prisma/seed.js`, `CRM/apps/api/prisma/platform-seed.js` |
| Catalog migrations | `CRM/apps/api/prisma/migrations/20260719150000_product_catalog_capabilities`, `20260719160000_attendance_leave_simplification`, `20260805120000_enable_payroll_product_catalog` |
| Platform plan administration | `CRM/apps/api/src/platform/control-plane/billing/platform-billing.service.ts`, `catalog-policy.ts` |
| Platform billing/subscription changes | `CRM/apps/api/src/platform/billing/application/billing.service.ts` |
| Entitlement/token generation | `CRM/apps/api/src/platform/product-integration/product-integration.service.ts` |
| Plan UI | `CRM/apps/web/src/features/platform/platform-billing-views.tsx` |
| Shared HRMS contract | `CRM/packages/product-contracts/src/hrms.ts` and the published contract repository |
| Separated HRMS token and permission checks | `deltcrm-hrms/apps/api/src/products/hrms/hrms-product-token.guard.ts`, `hrms-permissions.guard.ts` |
| HRMS runtime feature settings | `deltcrm-hrms/apps/api/src/products/hrms/configuration/runtime/hrms-runtime-settings.service.ts` |
| HRMS employee creation | `deltcrm-hrms/apps/api/src/products/hrms/organization-write/prisma-hrms-organization-write.repository.ts` |
| HRMS web navigation | `deltcrm-hrms/apps/web/src/shared/layouts/tenant-shell.tsx`, `tenant-navigation.ts`, `attendance-navigation.ts` |

This is a source audit. It does not claim that the corrective items below have already been implemented.

## 3. Current implementation scorecard

| Requirement | Current state | Result |
|---|---|---|
| Platform can create and edit plans | Implemented | Keep and refine |
| Plan can select products/modules and capabilities | Partially implemented | Taxonomy must be corrected |
| Capability dependencies are validated | Implemented in Platform catalog policy | Keep |
| Tenant subscription references a plan | Implemented | Keep |
| Plan change updates tenant assignments | Partial; module assignments are materialized | Replace unsafe raw toggles with resolved entitlements |
| Platform returns effective HRMS entitlements | Partial; only coarse claims and employee max | Expand |
| Product token carries HRMS capability claims | Partial | Version contract and add complete capability vocabulary |
| HRMS API rejects an unpurchased capability | Missing for most endpoints | P0 |
| Payroll is blocked when plan excludes payroll | Not reliably enforced in separated HRMS | P0 |
| Field tracking requires purchased field capability | Incorrectly inferred from tenant setting | P0 |
| Employee limit is enforced atomically | Missing | P0 |
| Bulk import and reactivation respect employee limit | Missing | P0 |
| HRMS reports actual usage to Platform | Missing | P1 |
| Tenant admin can assign HRMS roles | Existing permission model present | Retain, constrained by entitlements |
| Subscription cancellation/suspension blocks access consistently | Partial; only suspended is explicitly rejected in HRMS guard | P0 |
| Pricing meaning is unambiguous | Missing; per-user, seat count, and max employees are conflated | P0 product decision |
| Capability-specific limits work end to end | Schema only | P1 |
| Platform and HRMS UI hide unavailable features | Partial | Complete after API enforcement |
| One canonical seed/catalog exists | Missing | P0 migration risk |
| Automated tests prove entitlement denial | Insufficient for separated runtime | P0 release gate |

## 4. Detailed findings

### F-01 — Conflicting product taxonomy (P0)

The repositories currently describe the same concepts differently:

- one seed treats Attendance and Payroll as products and Field Tracking as an add-on;
- the Platform-only seed creates HRMS and also marks Attendance, Payroll, and Leave as products beneath HRMS;
- migrations preserve older Attendance-centric assumptions;
- product token logic presents HRMS as the product and maps only a few coarse HRMS capabilities;
- the earlier module/catalog plan explicitly records that its old boundary was superseded.

This makes plan behavior dependent on which seed or historical data created a tenant.

**Required correction:** define only `HRMS` as the top-level product. Represent sellable HRMS functionality through HRMS capabilities and limit grants. Deprecate old Attendance/Payroll/Leave product assignments after migrating subscriptions.

### F-02 — Permissions can bypass commercial capability intent (P0)

The separated HRMS controllers are protected by product-token validation and permission checks. There is no general endpoint capability guard equivalent to `@RequireHrmsCapabilities(...)`.

A user can receive payroll permissions from a role even when the tenant's plan does not contain payroll. Because payroll endpoints check those permissions but not `HRMS_PAYROLL`, the plan boundary is not reliably enforced.

**Required correction:** every commercial feature endpoint must require both its capability and its permission. Capability denial must happen server-side before the use case executes.

### F-03 — Tenant configuration is being treated as entitlement (P0)

HRMS runtime settings currently derive field tracking from attendance entitlement plus `fieldTrackingEnabled`. A tenant setting may configure a purchased feature, but it must never create the right to use that feature.

The correct relationship is:

```text
fieldTrackingAvailable = entitlement.has(HRMS_FIELD_TRACKING)
fieldTrackingEnabled   = fieldTrackingAvailable AND tenantSetting.fieldTrackingEnabled
```

Apply the same rule to biometric/selfie enforcement, device trust, geofence, advanced reports, payroll export, and future optional functionality.

### F-04 — Employee capacity is not enforced (P0)

The HRMS employee creation repository creates the record without reading a plan limit or reserving capacity. There is no authoritative, concurrency-safe check for create, bulk import, or reactivation.

Consequently, a tenant on a 200-employee package is not guaranteed to be blocked from creating employee 201.

**Required correction:** HRMS must enforce the effective employee limit transactionally using actual billable employee usage. Platform owns the purchased limit; HRMS owns the count and enforcement.

### F-05 — Pricing fields express different commercial models at once (P0 decision)

The current model contains:

- `pricePerUser` on a plan;
- `seatCount` on a tenant subscription;
- `maxEmployees` on a plan.

Billing calculates price from `pricePerUser × seatCount`, while UI and plan examples present `maxEmployees` as package capacity. Seeds also populate seat counts in different ways. This makes it unclear whether a 200-employee plan is a fixed package, 200 purchased seats, or only a technical maximum.

**Required correction:** store an explicit pricing model and separate purchased capacity from observed usage.

### F-06 — Generic limits are modeled but dormant (P1)

Capability and override records have `limitValue`, but plan DTOs, override operations, entitlement resolution, and HRMS enforcement do not complete the flow.

**Required correction:** introduce typed limit keys and values in the contract and make the Platform resolver the only source of effective commercial limits.

### F-07 — Subscription status is not a complete access policy (P0)

Platform entitlement generation relies substantially on active tenant-module rows. Product-token issuance does not enforce a complete subscription status policy, and HRMS explicitly rejects only a suspended subscription.

**Required correction:** define access for `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, and `NONE`, including any grace period. Product-token issuance and HRMS validation must use the same policy.

### F-08 — Tenant modules can become an unsafe second source of truth (P1)

Plan changes materialize tenant module rows, while administrative module operations may also enable them independently. Unless overrides are explicit, authorized, time-bound, and audited, this allows effective access to diverge from the subscription.

**Required correction:** compute access from subscription plus explicit entitlement overrides. Treat materialized rows as a cache/projection, not commercial truth.

### F-09 — Platform does not receive authoritative HRMS usage (P1)

Platform stores a subscription seat count but does not receive a reliable actual billable employee count from separated HRMS. Platform must not query the HRMS database directly.

**Required correction:** HRMS publishes idempotent usage events/snapshots; Platform stores the latest usage for billing UI, upgrade prompts, downgrade validation, and reconciliation.

### F-10 — Existing test evidence covers the wrong boundary (P0 release risk)

Some prior acceptance evidence refers to the old CRM monolith module guard. The separated HRMS does not use that database-coupled guard. Passing legacy tests does not prove that separated payroll, attendance add-ons, employee limits, or subscription states are protected.

**Required correction:** add black-box contract and E2E tests against the separated Platform → gateway → HRMS path. Mark old monolith evidence as historical after replacement evidence is published.

## 5. Canonical commercial model

### 5.1 Separate product, features, roles, and configuration

```text
DeltCRM Platform
└── Product: HRMS
    ├── Edition: Silver / Gold / Platinum
    ├── Capacity: 50 / 100 / 200 / Custom employees
    ├── Capabilities purchased by the tenant
    ├── Limits purchased by the tenant
    └── Tenant HRMS admin
        ├── assigns roles and permissions to employees
        └── configures enabled purchased features
```

The four concepts must remain separate:

| Concept | Example | Owner |
|---|---|---|
| Product | HRMS | Platform operator |
| Commercial capability | Payroll, field tracking, leave | Platform plan catalog |
| Tenant permission | Approve leave, run payroll, read employee reports | Tenant HRMS admin |
| Runtime configuration | Require selfie, enable geofence for an office | Tenant HRMS admin, only if entitled |

### 5.2 Recommended two-axis plan design

Do not encode both features and employee quantity into an ambiguous `maxEmployees` field.

- **Edition** controls functionality: Silver, Gold, Platinum.
- **Capacity tier** controls employee quantity: 50, 100, 200, Custom.
- **SKU/price** represents a supported combination, for example `HRMS-SILVER-50` or `HRMS-GOLD-200`.

This permits a customer to increase from 50 to 100 employees without silently receiving payroll, and to upgrade from Silver to Gold without changing capacity unless requested.

### 5.3 Proposed capability vocabulary

The final names must be versioned in `@mariya-abdul/deltcrm-product-contracts`.

| Contract key | Protects |
|---|---|
| `HRMS_CORE` | Product shell and common tenant context |
| `HRMS_ORGANIZATION` | Departments, designations, offices, organization settings |
| `HRMS_EMPLOYEE_DIRECTORY` | Employee profiles, assignments, lifecycle operations |
| `HRMS_DOCUMENTS` | Employee document workflows |
| `HRMS_ATTENDANCE_CORE` | Punching, attendance days, basic attendance operations |
| `HRMS_LEAVE_MANAGEMENT` | Leave types, balances, requests, approvals |
| `HRMS_SHIFTS_ROSTERS` | Shifts, rosters, assignments |
| `HRMS_OFFICE_GEOFENCE` | Office boundaries and geofence validation |
| `HRMS_DEVICE_TRUST` | Device registration and trust controls |
| `HRMS_BIOMETRIC_SELFIE` | Selfie/biometric attendance verification |
| `HRMS_REGULARIZATION` | Attendance correction/regularization workflows |
| `HRMS_REPORTS_BASIC` | Standard HRMS reports |
| `HRMS_REPORTS_ADVANCED` | Advanced analytics/exports |
| `HRMS_FIELD_TRACKING` | Field worker location and route tracking |
| `HRMS_PAYROLL_CORE` | Payroll configuration, calculation, runs, payslips |
| `HRMS_PAYROLL_EXPORT` | Payroll/accounting export integration |

Do not keep both `HRMS_ATTENDANCE` and `ATTENDANCE_CORE` as competing canonical keys. Add aliases only during a bounded migration period.

### 5.4 Illustrative edition matrix

This is a proposed default for implementation design, not a final sales decision.

| Capability | Silver | Gold | Platinum |
|---|:---:|:---:|:---:|
| Core, organization, employee directory | Yes | Yes | Yes |
| Documents | Yes | Yes | Yes |
| Attendance core | Yes | Yes | Yes |
| Leave management | Yes | Yes | Yes |
| Basic reports | Yes | Yes | Yes |
| Shifts and rosters | No | Yes | Yes |
| Geofence | No | Yes | Yes |
| Device trust | No | Yes | Yes |
| Biometric/selfie | No | Yes | Yes |
| Regularization | No | Yes | Yes |
| Advanced reports | No | Yes | Yes |
| Field tracking | No | Optional add-on | Yes |
| Payroll core | No | Optional add-on | Yes |
| Payroll export | No | No | Yes |

Platform operators define this matrix. A tenant HRMS admin cannot grant a capability absent from the tenant's effective entitlement.

## 6. Pricing and capacity decision

### 6.1 Recommended initial model

For the requested 50/100/200 plans, implement **fixed tier packages** first:

```text
price = recurring price of selected edition + capacity SKU + priced add-ons
hard employee limit = selected capacity (50, 100, 200, or custom)
actual usage = count of billable employees in HRMS
```

Add an explicit enum rather than inferring behavior:

```text
PricingModel = FLAT_TIER | PER_SEAT | BASE_PLUS_SEAT | CUSTOM
```

If per-seat billing is introduced later, `purchasedSeatCount` becomes the limit and `unitPrice` becomes meaningful. Do not use one `seatCount` field for both purchased quantity and actual employee usage.

### 6.2 Required capacity terms

Define these separately:

- `purchasedCapacity`: the contractual employee limit;
- `billableUsage`: current HRMS employee count under the agreed status policy;
- `peakUsage`: optional billing-period high-water mark;
- `catalogMaximum`: maximum capacity the SKU supports;
- `requestedCapacity`: pending upgrade/downgrade quantity.

The business must decide which employee statuses count. Recommended starting rule:

- count `ACTIVE`, `INVITED`, `ONBOARDING`, and future-dated starters;
- do not count `TERMINATED` after the effective termination date;
- explicitly decide how long suspended or archived employees consume capacity.

## 7. Target entitlement and authorization flow

```text
Platform operator defines HRMS catalog, editions, capacities, prices
        ↓
Tenant subscribes to an edition + capacity + optional add-ons
        ↓
Platform entitlement resolver combines:
  subscription + plan grants + paid add-ons + approved overrides + status policy
        ↓
Platform issues a short-lived signed product token and exposes effective limits
        ↓
Gateway routes the request to HRMS
        ↓
HRMS validates token, tenant, audience, issuer, expiry, and entitlement version
        ↓
HRMS capability guard checks purchased feature
        ↓
HRMS permission guard checks the user's tenant role
        ↓
HRMS use case checks resource scope and usage limit
        ↓
HRMS executes operation and publishes usage/audit event
```

### 7.1 Token and entitlement transport

Version the contract so HRMS receives:

- product key and tenant identity;
- subscription access state;
- complete canonical capability keys;
- entitlement version;
- stable permission keys;
- typed limits or a reference/version allowing HRMS to retrieve them safely.

Employee capacity can change at any time. For limit-changing writes, HRMS must use an entitlement value with sufficiently fresh version validation and fail closed when the Platform decision cannot be validated. A stale UI cache must never authorize employee 201.

### 7.2 Server-side capability enforcement

Add an HRMS decorator and guard, for example:

```ts
@RequireHrmsCapabilities('HRMS_PAYROLL_CORE')
@RequireHrmsPermissions('payroll.runs.create')
```

The capability guard must run before the permission guard or use a combined policy evaluator. Return stable errors:

- `PRODUCT_NOT_ENTITLED`
- `CAPABILITY_NOT_ENTITLED`
- `SUBSCRIPTION_INACTIVE`
- `ENTITLEMENT_STALE`
- `PRODUCT_LIMIT_EXCEEDED`

Use `403` for absent commercial access, `409` for a capacity conflict where the client can upgrade/retry, and the existing authentication response for invalid tokens.

### 7.3 UI behavior

The web and mobile clients should consume an HRMS navigation/configuration response produced from the same effective entitlement vocabulary:

- hide or label unavailable modules;
- show an upgrade action to tenant billing administrators;
- show a simple access explanation to ordinary employees;
- never rely on UI hiding as enforcement;
- invalidate navigation and cached pages when entitlement version changes.

## 8. Endpoint enforcement matrix

Create an inventory from every HRMS controller before implementation is considered complete. At minimum:

| API family | Required capability | Additional enforcement |
|---|---|---|
| Organization settings | `HRMS_ORGANIZATION` | Existing organization permissions |
| Employee list/detail/create/update/import/reactivate | `HRMS_EMPLOYEE_DIRECTORY` | Employee permissions; capacity check for usage-increasing writes |
| Employee documents | `HRMS_DOCUMENTS` | Document permissions and employee scope |
| Attendance punch/day/overview | `HRMS_ATTENDANCE_CORE` | Self/reporting scope |
| Leave types/balances/requests/approvals | `HRMS_LEAVE_MANAGEMENT` | Leave permissions and reporting scope |
| Shifts/rosters | `HRMS_SHIFTS_ROSTERS` | Shift/roster permissions |
| Office geofence | `HRMS_OFFICE_GEOFENCE` | Attendance configuration permission |
| Devices/trust | `HRMS_DEVICE_TRUST` | Device permission and self/admin scope |
| Selfie/biometric verification | `HRMS_BIOMETRIC_SELFIE` | Privacy/configuration policy |
| Regularization/corrections | `HRMS_REGULARIZATION` | Submit/approve permissions |
| Standard reports | `HRMS_REPORTS_BASIC` | Report permissions and scope |
| Advanced reports/exports | `HRMS_REPORTS_ADVANCED` | Export permission and audit |
| Field locations/routes | `HRMS_FIELD_TRACKING` | Field permissions, consent, retention policy |
| Payroll configuration/runs/payslips | `HRMS_PAYROLL_CORE` | Payroll permissions and employee scope |
| Payroll export | `HRMS_PAYROLL_EXPORT` | Export permission and audit |

Every route must be classified. An unclassified route fails the release gate.

## 9. Atomic employee-limit enforcement

### 9.1 Operations that consume capacity

Enforce the limit for every operation that can increase billable usage:

- create employee;
- accept/import employee rows;
- reactivate an employee;
- change an employee from a non-billable to billable status;
- complete an invite if invitations are not counted earlier;
- data migration or administrative repair commands.

### 9.2 Required algorithm

Within one HRMS database transaction:

1. validate the fresh effective `HRMS_EMPLOYEES` limit;
2. take a tenant-scoped advisory lock or lock a tenant usage-counter row;
3. calculate/read current billable usage;
4. reserve the requested increment;
5. reject if `usage + increment > purchasedCapacity`;
6. write employees and update the counter;
7. commit;
8. publish an idempotent usage event through the outbox.

Bulk import must reserve capacity for the accepted batch, not perform an unsafe per-row precheck. Decide and document whether imports are all-or-nothing or partially accepted with row-level errors.

### 9.3 Usage synchronization

HRMS should publish events such as:

```text
hrms.usage.employee.changed.v1
```

The event should contain tenant, metric key, current value, occurred-at time, entitlement version, and an idempotency/event ID. Platform stores a usage snapshot and periodically reconciles it with an HRMS-provided signed/internal snapshot endpoint or replayable event stream.

Platform must not query HRMS tables directly.

## 10. Data and contract changes

### 10.1 Minimum-change catalog migration

Reuse the current catalog structure initially, but normalize it:

- retain one `Module(kind=PRODUCT, key=HRMS)`;
- attach all HRMS commercial capabilities to HRMS;
- remove Attendance, Leave, and Payroll as independent product assignments after migration;
- represent optional paid features through capability grants/add-on SKU records;
- keep plan modules limited to `HRMS` and use plan capabilities for the feature bundle;
- make tenant module rows a projection of effective product access, not an independent entitlement source.

### 10.2 Required new/changed concepts

Introduce or clarify:

- plan/edition stable code separate from display name;
- `PricingModel`;
- capacity tier/SKU;
- typed plan limits, for example `HRMS_EMPLOYEES`;
- explicit paid add-on subscription lines;
- effective entitlement projection/version;
- usage snapshot and event receipt/idempotency record;
- override type, reason, approver, start, expiry, and audit link;
- subscription access-state policy and grace-period timestamps.

### 10.3 Contract release

Publish a backward-compatible transition version first, then a breaking cleanup only after all consumers migrate.

The shared package must define:

- canonical HRMS capability constants;
- limit metric constants and typed values;
- subscription access states;
- product-token claims;
- effective entitlement response;
- stable authorization/limit error codes;
- usage event envelopes;
- compatibility aliases with removal dates.

Both Platform and HRMS CI must install the published version rather than workspace-linking an unpublished contract during release evidence generation.

## 11. Corrective implementation phases

### Phase 0 — Freeze and safety tests

**Goal:** prevent more catalog drift before migration.

- freeze new module/capability keys without architecture approval;
- mark old catalog/acceptance documents as historical where they describe monolith enforcement;
- snapshot current plans, tenant subscriptions, module assignments, overrides, and employee counts;
- add failing black-box tests proving the current payroll and capacity gaps;
- decide subscription status/grace-period policy;
- approve billable employee status policy and pricing model.

**Exit gate:** signed decision record and reproducible failing tests for every P0 gap.

### Phase 1 — Canonical contract and catalog

**Goal:** make every service use the same vocabulary.

- approve the HRMS capability list;
- extend the shared contract with capabilities, limits, errors, and usage events;
- update Platform catalog validation and DTOs to accept typed limits;
- create one idempotent canonical seed;
- remove conflicting seed definitions;
- add catalog invariant tests: exactly one HRMS product, unique keys, valid dependencies, no capability cycles.

**Exit gate:** Platform, HRMS API, HRMS web, and HRMS mobile compile against one published contract version.

### Phase 2 — Subscription, pricing, and entitlement resolver

**Goal:** make Platform the single commercial source of truth.

- implement edition + capacity + add-on SKUs;
- separate purchased capacity, actual usage, and catalog maximum;
- implement the subscription access-state policy;
- resolve capabilities and limits from subscription, add-ons, and bounded overrides;
- include complete entitlements in product-token/entitlement transport;
- prohibit raw module toggles from bypassing the resolver;
- increment entitlement version and publish invalidation events for every relevant change.

**Exit gate:** entitlement snapshot tests cover every edition/capacity/add-on/status combination.

### Phase 3 — HRMS server enforcement

**Goal:** enforce commercial capabilities at the API boundary.

- implement capability metadata/decorator and guard;
- attach validated effective entitlement context to the request;
- classify every controller route against the enforcement matrix;
- enforce payroll, field tracking, attendance options, reports, leave, documents, and future capabilities;
- change runtime settings so configuration can only narrow an entitlement;
- return stable errors and audit denied privileged operations.

**Exit gate:** direct API calls to every unavailable capability are denied even when the user has its role permission.

### Phase 4 — Employee capacity and usage

**Goal:** prevent employee 201 on a 200-employee subscription.

- add tenant usage counter/locking strategy;
- enforce create, import, reactivation, and billable status transitions;
- emit usage events via HRMS outbox;
- add Platform usage snapshots and reconciliation;
- block invalid downgrades and show required remediation;
- implement near-limit warnings at configurable thresholds.

**Exit gate:** concurrent create/import tests cannot exceed capacity, and Platform usage reconciles with HRMS.

### Phase 5 — Platform and tenant administration UI

**Goal:** make the commercial model understandable and operable.

- update plan editor to manage edition capabilities, capacities, prices, and add-ons;
- show dependency/conflict validation and effective bundle preview;
- show actual usage versus purchased capacity;
- provide upgrade/downgrade impact previews;
- show override reason/expiry and audit history;
- allow tenant HRMS admins to assign permissions only within entitled feature areas;
- show upgrade prompts without exposing Platform-only controls to ordinary employees.

**Exit gate:** a Platform operator can publish Silver without payroll, and a tenant admin can manage employee roles without being able to enable payroll.

### Phase 6 — Data migration and cutover

**Goal:** migrate existing tenants without accidental feature loss or gain.

- inventory current module/capability combinations per tenant;
- map legacy Attendance/Leave/Payroll/Field rows to HRMS capability grants;
- create explicit temporary overrides for grandfathered access;
- map existing subscriptions to edition/capacity SKUs;
- initialize HRMS usage counters from actual billable employees;
- run dry-run comparison of legacy access versus new resolved access;
- require review for every difference;
- dual-read/compare briefly, then switch to canonical resolver;
- remove compatibility aliases and legacy seed paths only after rollback window.

**Exit gate:** zero unexplained entitlement differences and a tested rollback procedure.

### Phase 7 — Full-flow verification and deployment readiness

**Goal:** produce evidence for the real separated deployment path.

- run Platform, gateway, HRMS API, HRMS web, and required infrastructure locally;
- test using the published contract package;
- exercise purchase/change-plan/token/HRMS-access flows through the gateway;
- run the same contract and E2E suites in CI;
- load-test entitlement validation and employee-limit contention;
- publish new acceptance evidence with logs, versions, and screenshots;
- perform staged rollout with denial/entitlement/usage metrics and alerts.

**Exit gate:** all release gates in section 13 pass in staging with the same artifacts intended for production.

## 12. Required automated tests

### 12.1 Platform unit/integration tests

- catalog dependency/conflict resolution;
- core capability auto-inclusion;
- edition and capacity SKU pricing;
- subscription status access matrix;
- add-on and override resolution/expiry;
- entitlement version increment and cache invalidation;
- downgrade rejection when usage exceeds target capacity;
- duplicate/replayed usage-event idempotency.

### 12.2 HRMS API tests

- capability absent + permission present = denied;
- capability present + permission absent = denied;
- both present + valid scope = allowed;
- tenant setting cannot enable an absent capability;
- payroll endpoints reject Silver when payroll is absent;
- field endpoints reject absent field tracking;
- employee 50/100/200 boundary tests;
- concurrent creates at the final available slot;
- bulk import greater than remaining capacity;
- reactivation/status transition at capacity;
- stale entitlement version and Platform-unavailable behavior;
- suspended/canceled/no-subscription behavior.

### 12.3 Web and mobile tests

- navigation is generated from effective capabilities;
- direct URL still receives a server denial;
- upgrade prompt visibility follows billing permissions;
- role UI cannot grant access to an unpurchased feature;
- entitlement invalidation updates the session safely;
- mobile attendance/punch flows use the same capability and permission model.

### 12.4 Full E2E scenarios

1. Create Silver-50 tenant; create employee 50; reject employee 51; upgrade to 100; create employee 51.
2. Give a user payroll permission on Silver; direct payroll API and URL remain denied.
3. Add Payroll add-on; refresh entitlement; payroll becomes available without changing unrelated roles.
4. Remove Payroll; active session loses access after entitlement invalidation.
5. Enable field tracking setting without entitlement; feature stays unavailable.
6. Purchase field add-on, enable tenant setting, and confirm allowed field-user scope.
7. Attempt downgrade below actual usage; Platform blocks and explains required employee reduction.
8. Suspend/cancel subscription; token issuance and existing-session access follow the approved policy.
9. Expire a temporary override; access is removed and audited.
10. Reconcile HRMS usage snapshot after event delay/replay without double counting.

## 13. Production release gates

The plan/pricing system is not production-ready until all of these are true:

- [ ] One canonical HRMS product and capability catalog exists.
- [ ] Conflicting seeds and legacy product assignments are migrated.
- [ ] Pricing model and billable employee definition are approved.
- [ ] Published contract contains all capability and limit keys used by both services.
- [ ] Every HRMS route has a declared capability or an explicit documented exemption.
- [ ] Payroll is denied on plans without payroll, regardless of role permission.
- [ ] Tenant settings cannot create commercial entitlement.
- [ ] Employee creation/import/reactivation cannot exceed capacity under concurrency.
- [ ] Subscription status is enforced consistently at token issuance and HRMS access.
- [ ] Platform receives and reconciles HRMS usage without database coupling.
- [ ] Tenant role administration remains tenant-controlled but bounded by subscription.
- [ ] Local and CI E2E tests run through Platform, gateway, and separated HRMS.
- [ ] New acceptance evidence replaces monolith-only claims.
- [ ] Audit logs, metrics, alerts, migration rollback, and support runbook are ready.

## 14. Recommended delivery order

Do not begin by redesigning pricing cards. Close authorization bypasses and establish one vocabulary first.

1. Approve taxonomy, pricing model, billable status, and subscription access policy.
2. Publish the expanded contract and canonical catalog migration.
3. Implement Platform effective entitlement resolution.
4. Add HRMS server capability guards and classify all routes.
5. Implement atomic employee-limit enforcement and usage reporting.
6. Update Platform/HRMS web and mobile UI.
7. Migrate tenant data and replace old acceptance evidence.

## 15. Final readiness assessment

The system has a viable Platform foundation, so this does not require rebuilding billing from zero. The largest missing piece is **enforcement across the separated service boundary**.

Today, a Silver-like plan can be represented visually, but the code does not yet prove that excluded payroll, field, biometric, reporting, or capacity operations are consistently denied inside HRMS. The correct target is:

- Platform decides what the tenant bought;
- tenant HRMS admin decides which employees may use what was bought;
- HRMS enforces both decisions and its own resource rules;
- HRMS reports actual usage back to Platform;
- shared contracts keep every service and client on the same vocabulary.

Until the P0 findings and release gates above are complete, plans and pricing should be described as **catalog and UI implemented, commercial enforcement incomplete**.
