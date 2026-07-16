# Sprint 3 Implementation Plan

## Tenant Admin Web and Attendance Configuration

**Status:** Complete
**Completed:** July 17, 2026
**Depends on:** Sprint 1 organization APIs and Sprint 2 platform/operational foundation  
**Primary references:** roadmap Phases 1 and 2.1; feature sections 2 and 3.1-3.2  
**Sprint exit:** A business administrator completes onboarding and organization setup in the web app; HR configures offices, policies, shifts, rosters and holidays; all configuration resolves deterministically and is tenant-isolated.

## 1. Included Scope

- Complete B1-B8 Next.js flows against Sprint 1 APIs
- Tenant settings, company logo and working/weekly-off configuration
- Office locations, circular geofences, IP allow-lists and employee assignments
- Attendance policies and employee > department > tenant-default assignments
- Shifts, rosters and tenant/office holidays
- B9 and H4-H8 configuration screens

## 2. Deferred

- Punch event creation and attendance calculation: Sprint 4
- Device, face and mobile integrity verification: Sprint 5
- Field location ingestion and offline replay: Sprint 6
- Billing profile payment operations: Sprint 8

## 3. Inherited Sprint 2 Foundation

- CI, generated-client drift checks and shared quality commands are mandatory gates.
- Outbox relay, worker tenant context, structured logging, audit attribution and health endpoints are reused rather than reimplemented.
- The platform owner provisions the tenant and Attendance module before B1 onboarding begins.

## 4. API Contract

### Tenant and company settings

- `GET /tenant-settings`
- `PATCH /tenant-settings`
- `POST /tenant-settings/logo/presign`
- `GET /onboarding/status`
- `POST /onboarding/complete`

Rules:
- [x] Validate IANA timezone names and store date/time behavior in tenant timezone
- [x] Weekly offs support weekday patterns and nth-weekday rules such as second/fourth Saturday
- [x] Logo objects use tenant-prefixed private keys and constrained content types/sizes
- [x] Onboarding completion is idempotent and audited

### Office locations

- `GET /offices`
- `POST /offices`
- `GET /offices/:id`
- `PATCH /offices/:id`
- `DELETE /offices/:id`
- `PUT /offices/:id/employees`
- `GET /offices/:id/employees`

Rules:
- [x] Validate latitude, longitude, radius, IANA timezone, egress IP/CIDR and advisory SSIDs
- [x] Employee assignments are same-tenant and atomically replaced
- [x] Delete is blocked when referenced by active assignments, holidays or attendance evidence
- [x] Distance calculations use a tested Haversine value object; polygon geofences remain future scope

### Attendance policies and assignments

- `GET /attendance-policies`
- `POST /attendance-policies`
- `GET /attendance-policies/:id`
- `PATCH /attendance-policies/:id`
- `DELETE /attendance-policies/:id`
- `PUT /attendance-policies/:id/assignments`
- `GET /attendance-policies/resolve?employeeId=:id&date=:date`

Rules:
- [x] Validate late, half-day, minimum-work, overtime, early-punch, verification, offline, face-attempt and break rules
- [x] Exactly one tenant-default assignment exists
- [x] Resolution order is employee, department, tenant default
- [x] Conflicting assignments at the same scope are rejected
- [x] Configuration changes apply prospectively and never mutate finalized snapshots

### Shifts, rosters and holidays

- `GET|POST /shifts`
- `GET|PATCH|DELETE /shifts/:id`
- `GET /rosters`
- `POST /rosters`
- `POST /rosters/bulk`
- `POST /rosters/imports/presign`
- `POST /rosters/imports`
- `GET /rosters/imports/:id`
- `DELETE /rosters/:id`
- `GET|POST /holidays`
- `PATCH|DELETE /holidays/:id`

Rules:
- [x] Derive overnight shifts from end time crossing start time
- [x] Shift resolution is dated roster, employee default, then policy/flexible fallback
- [x] Prevent overlapping roster assignments per employee/date
- [x] Bulk/CSV roster writes return row-level errors and are idempotent
- [x] Holidays may be tenant-wide or office-scoped; duplicate date/scope is rejected

## 5. Database and Security

- [x] Review v4 models and add missing constraints/indexes without duplicating existing schema
- [x] Add RLS policies and grants for every new configuration/import table
- [x] Add case-insensitive office/policy/shift uniqueness per tenant
- [x] Add exclusion or transactional overlap protection for rosters
- [x] Add permissions for settings, offices, policies, shifts, rosters and holidays
- [x] Seed default policy, shift and alert-ready settings for new and existing tenants
- [x] Audit all configuration mutations with old/new values
- [x] Emit outbox events for material configuration changes

## 6. Web Implementation

- [x] Establish authenticated app shell, permission-aware navigation and tenant module guards
- [x] B1 onboarding wizard with resumable progress
- [x] B2 company settings and weekly-off editor
- [x] B3-B8 organization, employees, imports, users and roles wired to Sprint 1 APIs
- [x] B9 master attendance/security defaults
- [x] H4 office/geofence editor using a map provider abstraction
- [x] H5 policy list/editor and assignment UI
- [x] H6 shifts management
- [x] H7 roster grid, bulk assignment and CSV import
- [x] H8 holiday calendar
- [x] Add responsive, loading, empty, validation, forbidden and suspended states

## 7. Ordered Work Packages

### 3.0 Tenant admin web
- [x] App shell and B1-B8 happy paths
- [x] Playwright onboarding-to-employee flow

### 3.1 Offices and tenant settings
- [x] APIs, constraints, permissions, audits and B2/H4 screens

### 3.2 Policies
- [x] CRUD, assignments, resolver cache/invalidation and B9/H5 screens

### 3.3 Shifts, rosters and holidays
- [x] APIs, import worker, resolvers and H6-H8 screens

### 3.4 Hardening
- [x] OpenAPI export, isolation matrix, performance checks and operator documentation

## 8. Test Plan

- [x] Unit: timezone/date rules, nth-weekday offs, Haversine, policy precedence, overnight shifts and shift fallback
- [x] Integration: uniqueness, roster overlap, assignment atomicity and cache invalidation
- [x] E2E: business admin onboarding; HR configuration; employee forbidden; tenant A/B isolation
- [x] Import: malformed roster, duplicate rows, unknown employees/shifts and retry idempotency
- [x] Web: B1-B9 and H4-H8 happy paths plus validation/403/suspension
- [x] Performance: resolve policy and shift without N+1 queries for 500 employees

## 9. Definition of Done

- [x] All Sprint 3 routes are documented and permission protected
- [x] Policy/shift resolution is deterministic and cached safely
- [x] B1-B9 and H4-H8 are API-connected, not mocked
- [x] No cross-tenant relationship IDs disclose or mutate data
- [x] Build, lint, unit, integration, e2e, RLS and Playwright suites pass
- [x] Roadmap Phase 1/2.1 items are updated only with evidence

## 10. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 3.0 Tenant admin web | Complete | B1-B9 routes, API-backed controls, and Playwright desktop/mobile/state coverage |
| 3.1 Offices and tenant settings | Complete | CRUD, assignment isolation, Haversine/rule tests, B2/H4, audit/outbox |
| 3.2 Policies | Complete | Deterministic precedence, Redis generation cache, invalidation race tests, B9/H5 |
| 3.3 Shifts, rosters and holidays | Complete | Resolver APIs, holiday-aware writes, 60-row import acceptance, H6-H8 |
| 3.4 Hardening | Complete | OpenAPI, clean 18-migration seed, RLS, 500-employee performance, runbook |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

### Completion evidence

- Clean database: all 18 migrations and the idempotent seed passed in a temporary PostgreSQL database; resulting fixture had 2 tenants, 2 offices, 4 policies, and 4 shifts.
- API quality: security check, lint, typecheck, OpenAPI, production build, 19 unit suites/39 tests, and 14 e2e suites/36 tests passed.
- Web quality: lint (0 errors, 5 pre-existing optimization warnings), typecheck, 30-route production build, and 28 Playwright tests passed.
- Visual contract: all B1-B9 and H4-H8 screens passed Stitch comparison at 1024 and 1440 widths plus 390px overflow safety.
- Acceptance: the roster fixture processed 60 rows as 56 accepted and 4 stable row errors; policy and shift bulk resolution handled 500 employees below the one-second gate.
- Operations: see [Sprint 3 Attendance Configuration Runbook](../SPRINT-3-ATTENDANCE-CONFIG-RUNBOOK.md).

## 11. Implementation Specification

### 11.1 Module layout

```text
apps/api/src/modules/
├── workspace-settings/     # tenant settings, onboarding and logo
├── attendance-config/      # offices, policies, shifts, rosters, holidays
│   ├── domain/             # geofence, policy and shift resolution rules
│   ├── application/        # commands, queries and import orchestration
│   ├── infrastructure/     # Prisma repositories, cache and CSV worker
│   └── presentation/       # controllers and DTOs
└── shared/events/          # consumes Sprint 2 relay and worker contracts
apps/web/src/features/
├── onboarding/ organization/ access/ employees/
└── attendance-config/
```

Controllers translate HTTP only. Resolver rules stay pure where possible. Repositories receive the caller transaction. Cache keys always include tenant ID and are invalidated only after commit.

### 11.2 Permission matrix

| Resource | Read | Create/update | Delete/assign |
|---|---|---|---|
| Tenant settings/onboarding | `workspace.settings.read` | `workspace.settings.update` | `workspace.settings.update` |
| Offices | `attendance.offices.read` | `attendance.offices.manage` | `attendance.offices.manage` |
| Policies | `attendance.policies.read` | `attendance.policies.manage` | `attendance.policies.manage` |
| Shifts | `attendance.shifts.read` | `attendance.shifts.manage` | `attendance.shifts.manage` |
| Rosters | `attendance.rosters.read` | `attendance.rosters.manage` | `attendance.rosters.manage` |
| Holidays | `attendance.holidays.read` | `attendance.holidays.manage` | `attendance.holidays.manage` |

Business Admin receives every key. HR Admin receives attendance configuration keys but not billing. Manager and Employee receive only configuration reads needed by their own schedule APIs, never unrestricted configuration lists.

### 11.3 DTO contracts

| DTO | Required fields | Validation |
|---|---|---|
| `UpdateTenantSettingsDto` | at least one setting | timezone IANA; times `HH:mm`; intervals 1-120; face threshold 0-100; weekly-off schema versioned |
| `CreateOfficeDto` | `officeName`, `latitude`, `longitude`, `radiusMeters` | name 2-100; lat/lng ranges; radius 25-10000; IP/CIDR normalized; timezone optional IANA |
| `AssignOfficeEmployeesDto` | `employeeIds`, optional `primaryEmployeeIds` | unique UUIDs; primary subset; all active/same tenant |
| `CreatePolicyDto` | `name` | minute fields 0-1440; min work <= overtime; face attempts 1-10; offline 0-168; typed break rules |
| `ReplacePolicyAssignmentsDto` | `assignments[]` | valid scope discriminator; exactly one target for department/employee; none for default |
| `CreateShiftDto` | `name`, `startTime`, `endTime` | `HH:mm`; unequal times; overnight derived server-side |
| `CreateRosterDto` | `employeeId`, `shiftId`, `rosterDate` | ISO date; same-tenant references; date within configured planning window |
| `BulkRosterDto` | `employeeIds`, `shiftId`, `startDate`, `endDate`, `weekdays?` | max 500 employees and 93 days per request |
| `CreateHolidayDto` | `holidayName`, `holidayDate` | ISO date; optional same-tenant office ID |

List endpoints use `{ data, pagination }`; resolvers use `{ data, resolution: { source, assignmentId } }`. Mutation responses return the canonical stored resource, never the submitted DTO.

### 11.4 Required migrations

- [x] Scope check: tenant default has no target; department/employee scopes have exactly their matching target
- [x] Partial unique indexes for one tenant default, one department policy and one employee policy
- [x] Partial unique index for one primary office per employee
- [x] Case-insensitive unique indexes for office, policy and shift names
- [x] Foreign-key or service/trigger protection preventing cross-tenant assignment references
- [x] Import-row persistence for roster jobs using the Sprint 1 idempotency pattern
- [x] Outbox delivery columns or companion delivery table: attempts, available-at, lease owner/expiry and last error
- [x] RLS/grants updated in the permanent table registry and tested with empty tenant context

### 11.5 Error catalog

| Code | Status | Trigger |
|---|---:|---|
| `INVALID_TIMEZONE` | 422 | Unknown IANA timezone |
| `WEEKLY_OFF_PATTERN_INVALID` | 422 | Invalid weekday/nth-weekday JSON |
| `OFFICE_NAME_EXISTS` | 409 | Case-insensitive tenant duplicate |
| `OFFICE_IN_USE` | 409 | Delete with assignments/holidays/evidence |
| `GEOFENCE_INVALID` | 422 | Invalid center/radius |
| `POLICY_NAME_EXISTS` | 409 | Duplicate policy |
| `POLICY_ASSIGNMENT_CONFLICT` | 409 | Duplicate same-scope target/default |
| `POLICY_RULES_INVALID` | 422 | Contradictory thresholds/break rules |
| `SHIFT_NAME_EXISTS` | 409 | Duplicate shift |
| `SHIFT_TIME_INVALID` | 422 | Equal/malformed start and end |
| `ROSTER_CONFLICT` | 409 | Employee/date already assigned |
| `ROSTER_HOLIDAY` | 409 | Employee/date is tenant-wide or primary-office holiday |
| `HOLIDAY_EXISTS` | 409 | Duplicate date and scope |
| `CONFIGURATION_NOT_FOUND` | 404 | Missing or foreign resource ID |

### 11.6 Stitch UI contract

- Stitch exports/screens are the visual source of truth; do not redesign from memory or generic components.
- Preserve exact desktop composition, spacing, typography, imagery, colors and state hierarchy while extracting reusable Next.js components.
- B1-B9 and H4-H8 require desktop 1440, laptop 1024 and mobile-safe 390 verification even when mobile is not the primary portal.
- Every screen must map visible controls to a documented API and permission; unsupported decorative controls are disabled with an implementation note, not silently faked.
- Required variants: initial loading, skeleton, empty, populated, inline validation, API error, 403, suspended workspace, unsaved changes and destructive confirmation.
- Use actual Stitch assets locally with provenance; do not hotlink expiring Stitch URLs.

### 11.7 Acceptance fixtures

- Tenant `Acme Logistics`, timezone `Asia/Kolkata`, second/fourth Saturday off
- Offices: Bengaluru HQ (100 m) and Mumbai Hub (150 m), each with distinct timezone/IP data
- Policies: Default Office, Field Staff and Night Shift with all precedence scopes represented
- Shifts: 09:00-18:00, 10:00-19:00 and overnight 22:00-06:00
- 25 employees across three departments, including hybrid/field users and primary/multiple office assignments
- One 60-row roster CSV containing exactly four errors: unknown employee, unknown shift, duplicate date and malformed date

The gate expects 56 imported roster rows, four stable row errors, identical retry results and exact Stitch-state screenshots at agreed breakpoints.
