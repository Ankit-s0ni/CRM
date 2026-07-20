# Sprint 7.5 Implementation Plan

## Complete Tenant HR Portal Reconstruction

**Status:** In progress; the core HR portal reconstruction is implemented and regression-tested, while the guided-policy, Mail, OpenAPI, Flutter, and complete accessibility gates remain  
**Depends on:** Sprints 1, 3, 4, 5, 6.5, and 7  
**Must complete before:** Sprint 8 General Availability exit gate  
**Primary references:** `FEATURE-LIST.md`, `PROJECT-ROADMAP.md`, `SPRINT-6.5-IMPLEMENTATION.md`, `SPRINT-7-IMPLEMENTATION.md`, `HR-PORTAL-RESTRUCTURE-IMPLEMENTATION-PLAN.md`, `ATTENDANCE-HR-PORTAL-RESTRUCTURE-PLAN.md`, the current API/OpenAPI contract, and Stitch tenant-portal references  
**Sprint exit:** A Business Admin, HR Admin, or Manager can find and complete every authorized HR workflow through Dashboard, Employees, Modules, Reports, or Settings. Related work is no longer scattered across the main navigation, every visible action uses a real API, and direct routes remain tenant-, entitlement-, and permission-safe.

## 1. Why This Sprint Is 7.5

This is a product reconstruction sprint, not a new isolated module. It consumes the
organization, attendance, device trust, dynamic tenant runtime, leave, reporting,
payroll, notification, and audit foundations delivered by earlier sprints.

It is placed after Sprint 7 because the complete HR workflows must already exist
before they can be reorganized. It must gate Sprint 8 because General Availability
cannot be claimed while the tenant portal is difficult to understand, contains
disconnected workflows, or exposes controls that do not work.

## 2. Product Decisions

- [x] The product name is **DeltCRM**. IndigoHR and IndigoCRM may remain only in archived raw design references and historical evidence.
- [x] The permanent tenant-portal navigation contains only **Dashboard**, **Employees**, **Modules**, **Reports**, and **Settings**.
- [x] Navigation represents HR jobs and product areas, not database resources or individual screens.
- [x] Existing working URLs remain valid. Canonical grouped routes may redirect to or compose existing screens without breaking bookmarks, notification links, or tests.
- [x] The API is the authorization authority. Hiding a link is never treated as an access-control boundary.
- [x] Stitch is a layout and interaction reference, not the functional specification. Domain rules, accessibility, responsive behavior, and tested workflows override flawed references.
- [x] Public authentication uses DeltCRM branding. Authenticated portal surfaces use the tenant name and optional tenant logo without replacing the DeltCRM product identity.
- [x] A module appears only when the tenant is entitled and the user has a relevant permission. Commercially unavailable modules must not look usable.
- [x] A visible button must either perform a real, persisted operation or be removed. Placeholder actions and static success states are forbidden.
- [x] Settings owns configuration. Module workspaces own daily operations. Employee-specific operations belong in the employee workspace.

## 3. Scope

### Included

- Complete tenant-facing web portal for Business Admin, HR Admin, Manager, and permitted employee/self routes
- Five-area information architecture and permission-aware contextual navigation
- Actionable cross-module HR dashboard
- Unified employee lifecycle and employee-detail workspace
- Entitlement-aware module center for Attendance, Leave, Payroll, Mail, and future modules
- Consolidated report center and export history
- Complete settings center with configuration health and guided next actions
- Guided Attendance and Leave policy creation, assignment, precedence, dependency, and impact explanation
- Contextual help, empty states, error states, access explanations, and administrator guidance
- Missing composed API contracts required by the reconstructed workflows
- Tenant isolation, manager scope, module entitlement, role permission, deep-link, accessibility, and responsive verification
- DeltCRM terminology and visual consistency across active tenant-portal source

### Excluded

- Reimplementing stable domain engines solely to change navigation
- Introducing a full Mail business module when only an external mail service exists
- Adding a payroll calculation engine; Payroll in this sprint covers the implemented export and period-lock capabilities
- Replacing Flutter employee-app functionality already governed by Sprint 6.5 runtime configuration
- Platform Super Admin portal reconstruction
- Provider procurement, production credentials, or mobile store release work owned by Sprint 8
- Destructive removal of compatibility routes before measured usage and notification-link migration

## 4. Current-State Baseline

### Foundation available for reuse

- Tenant authentication, workspace availability, tenant context, RLS, roles, permissions, and module entitlements
- Employee directory, creation, updates, lifecycle transitions, hierarchy, import, quota, documents, devices, biometrics, and audit records
- Attendance register, requests, regularization, field tracking, security, configuration, policies, offices, shifts, rosters, holidays, reports, and payroll locks
- Leave policies, balances, requests, approvals, and employee self-service
- Report generation, export jobs, downloads, expiration, and payroll export
- Notification center and per-user notification preferences
- Tenant branding, onboarding, billing, subscriptions, and module runtime configuration
- Existing responsive shell and reusable tenant-page primitives

### Problems this sprint must close

- Employee work is split across unrelated navigation destinations.
- Configuration and daily operations are mixed together.
- The dashboard does not consistently represent all authorized HR action queues.
- Some employee details and lifecycle actions are not available from one employee context.
- Module cards do not consistently communicate entitlement, readiness, dependencies, or implemented capability.
- Settings categories are incomplete and configuration health is not consolidated.
- Policy assignment, precedence, dependencies, and mobile impact are not consistently understandable.
- Some metrics or cards lead to generic pages instead of pre-filtered work.
- Loading, empty, error, forbidden, unavailable-module, and suspended-workspace behavior is inconsistent.
- Portal terminology and remaining active Indigo labels require a final source audit.

## 5. Target Information Architecture

| Primary area | Canonical route  | User question                                                  |
| ------------ | ---------------- | -------------------------------------------------------------- |
| Dashboard    | `/app`           | What needs my attention now?                                   |
| Employees    | `/app/employees` | How do I manage a person from onboarding to exit?              |
| Modules      | `/app/modules`   | How do I operate or configure an entitled product tool?        |
| Reports      | `/app/reports`   | What evidence, export, or period result do I need?             |
| Settings     | `/app/settings`  | How should this workspace, its access, and its modules behave? |

### Navigation rules

- Primary navigation never grows when a new policy, report, or API resource is added.
- Context navigation is generated from the signed-in user's server-returned permissions and tenant module entitlements.
- The active context remains visible on desktop and becomes an accessible drawer or scrollable tab set on smaller screens.
- Breadcrumbs preserve the originating filter, date, employee, module, and queue where practical.
- Unauthorized destinations are omitted from navigation; a direct unauthorized request receives a coded API denial and a safe web explanation.
- Legacy routes render in the new context or redirect to the first authorized canonical child.
- Notification links and shared deep links must continue to resolve after navigation changes.

## 6. Route Inventory and Compatibility Contract

### 6.1 Dashboard

| Route                | Purpose                                              | Required scope                                       |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `/app`               | Permission-filtered HR summary and actionable queues | Business Admin/HR full scope; Manager reporting line |
| `/app/notifications` | Current user's operational notifications             | Authenticated user                                   |

Every dashboard number must link to a filtered route using validated query fields,
not an unfiltered landing page.

### 6.2 Employees

| Route                               | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| `/app/employees`                    | Directory, lifecycle and readiness filters        |
| `/app/employees/new`                | Guided employee creation                          |
| `/app/employees/:id`                | Unified employee overview                         |
| `/app/employees/:id?tab=employment` | Employment, organization and lifecycle            |
| `/app/employees/:id?tab=attendance` | Attendance summary and assignments                |
| `/app/employees/:id?tab=leave`      | Leave balances, requests and history              |
| `/app/employees/:id?tab=account`    | Linked account, invitation, roles and status      |
| `/app/employees/:id?tab=devices`    | Device approval, replacement and block actions    |
| `/app/employees/:id?tab=biometrics` | Consent, enrollment, reset and eligibility        |
| `/app/employees/:id?tab=documents`  | Retained employee documents                       |
| `/app/employees/:id?tab=history`    | Employment and audit timeline                     |
| `/app/employees/import`             | CSV import, validation, job history and retry     |
| `/app/employees/organization`       | Departments, designations and reporting structure |

Compatibility routes:

- `/app/organization` remains valid and enters Employees / Organization.
- `/app/imports/employees` remains valid and enters Employees / Import.
- `/app/attendance/register/:employeeId` remains valid and links back to the employee Attendance tab.

### 6.3 Modules

| Module        | Canonical workspace       | Required child areas                                                                                |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| Attendance    | `/app/modules/attendance` | Overview, Today, Requests, Field, Reports, Setup                                                    |
| Leave         | `/app/modules/leave`      | Overview, Requests, Balances, Policies                                                              |
| Payroll       | `/app/modules/payroll`    | Export readiness, completed exports, period locks                                                   |
| Mail          | `/app/modules/mail`       | Only real implemented service health and configuration; otherwise unavailable, not simulated        |
| Future module | `/app/modules/:key`       | Entitlement, dependency, health, operations and settings entry points supplied by a module manifest |

Existing `/app/attendance/*` operational and setup routes remain supported and are
rendered inside the Attendance workspace context.

### 6.4 Reports

| Route                     | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `/app/reports`            | Entitled report catalog, generated jobs and downloads          |
| `/app/reports/attendance` | Muster, late/OT, violation and field-distance reports          |
| `/app/reports/payroll`    | Payroll exports and related period close state                 |
| `/app/reports/leave`      | Leave reports only after a real report contract is implemented |

### 6.5 Settings

| Route                                   | Configuration ownership                                                   |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `/app/settings`                         | Grouped configuration health and next actions                             |
| `/app/settings/company`                 | Company identity, DeltCRM/tenant branding, locale and timezone            |
| `/app/settings/organization`            | Departments, designations, offices and holidays                           |
| `/app/settings/access`                  | Users, invitations, roles and permission matrix                           |
| `/app/settings/modules`                 | Entitlements, dependencies, conflicts and module readiness                |
| `/app/settings/attendance`              | Attendance defaults and guided setup entry                                |
| `/app/settings/attendance/policies`     | Policy rules, assignment and effective-policy preview                     |
| `/app/settings/attendance/shifts`       | Shifts and roster defaults                                                |
| `/app/settings/attendance/verification` | Location, selfie, face, device and field controls                         |
| `/app/settings/leave`                   | Leave policy and approval configuration                                   |
| `/app/settings/payroll`                 | Implemented payroll export/lock configuration only                        |
| `/app/settings/security`                | Device, biometric, session and security controls                          |
| `/app/settings/notifications`           | Real per-user preferences and implemented tenant notification controls    |
| `/app/settings/integrations`            | Real provider diagnostics/configuration only; no fake connection controls |
| `/app/settings/billing`                 | Plan, seat usage, invoices, payment methods and status                    |
| `/app/settings/audit`                   | Tenant audit records and filters                                          |

## 7. Bounded Contexts and Ownership

```text
attendance-dashboard/       # permission-filtered cross-module HR summary
organization/               # employee identity, lifecycle, hierarchy, documents
access/                     # invitations, linked accounts, users, roles, permissions
workspace/                  # module entitlement and configuration health projection
workspace-settings/         # tenant profile, branding, locale and onboarding
attendance-config/          # offices, policies, assignments, shifts, rosters, holidays
attendance/                 # daily attendance operations and employee history
leave/                      # policy, balance, request and approval state
device-trust/               # registration, approval, block and replacement
biometrics/                 # consent, enrollment, reset and eligibility
security-alerts/            # rules, alerts, evidence and resolution
reporting/                  # report jobs, exports, expiration and downloads
payroll-lock/               # immutable period close/reopen workflow
notifications/              # inbox and preference persistence
tenant-audit/               # tenant-scoped audit read model
web/tenant-navigation       # five-area and context route manifest
web/employee-workspace      # employee-centric composition; no domain ownership
web/workspace-hubs          # module, report and settings discovery
web/contextual-help         # route-aware user guidance
```

Ownership rules:

- Composition services may read multiple bounded contexts but must not duplicate their mutation rules.
- Employee workspace writes call the owning domain endpoint; one broad "save employee workspace" endpoint is forbidden.
- Dashboard queries are read models and cannot become an alternative mutation path.
- Module health reads configuration but cannot grant an entitlement.
- Settings links to the owning configuration screen instead of cloning forms.
- Audit entries are written in the same transaction as important mutations whenever the owning domain supports transactional audit/outbox.

## 8. Role, Permission, and Entitlement Matrix

| Capability               | Business Admin                               | HR Admin                      | Manager                                       | Employee                              |
| ------------------------ | -------------------------------------------- | ----------------------------- | --------------------------------------------- | ------------------------------------- |
| HR dashboard             | Full tenant                                  | Full permitted tenant data    | Reporting chain                               | Self portal only                      |
| Employee directory       | `organization.employees.read`                | Same                          | `organization.employees.reports.read`, scoped | Self only                             |
| Create/update/lifecycle  | Assigned create/update/lifecycle permissions | Assigned permissions          | No                                            | No                                    |
| Organization             | Manage                                       | Assigned read/manage          | Read only if granted                          | No                                    |
| Account invitation/roles | Identity permissions                         | Assigned identity permissions | No                                            | No                                    |
| Attendance daily work    | Full permitted scope                         | Full permitted scope          | Reporting chain                               | Self API                              |
| Attendance setup         | Assigned config permissions                  | Assigned config permissions   | No by default                                 | No                                    |
| Leave approvals          | Full if entitled                             | `leave.approve`               | Reporting chain with `leave.approve`          | `leave.self`                          |
| Leave policies           | `leave.manage`                               | `leave.manage`                | No                                            | No                                    |
| Devices/biometrics       | Assigned trust permissions                   | Assigned trust permissions    | Read only if granted/scoped                   | Self registration/consent             |
| Security                 | Assigned alert permissions                   | Assigned alert permissions    | Team-relevant alerts only                     | Self trust state only                 |
| Reports                  | Entitled report permissions                  | Assigned report permissions   | Scoped reports                                | Self only when explicitly implemented |
| Modules                  | `workspace.modules.read`                     | Read if granted               | Relevant entitled modules                     | Mobile runtime projection             |
| Billing                  | Billing permissions                          | No by default                 | No                                            | No                                    |
| Audit                    | `workspace.audit.read`                       | If granted                    | No by default                                 | No                                    |

Enforcement invariants:

- JWT tenant, `x-tenant-id`, request context, and resource tenant must agree.
- Cross-tenant resource IDs return `404`, not existence-revealing `403` responses.
- Manager scope is calculated from the persisted reporting hierarchy and applied before counts, pagination, exports, and detail reads.
- Module entitlement is checked for list, detail, generation, mutation, download, and historical-resource access.
- A permission-safe response omits unauthorized metric groups; the client does not receive hidden counts.
- Suspended or unavailable workspaces fail before tenant data is returned.

## 9. API and DTO Contract

Existing response envelopes remain backward compatible. New composed endpoints use
`{ "data": ... }`, coded errors, request IDs, validated query DTOs, and OpenAPI
examples.

### 9.1 HR dashboard summary

`GET /dashboard/hr-summary`

Permissions: any of `dashboard.admin.read`, `organization.employees.read`, or
`organization.employees.reports.read`. Returned groups require their own read
permissions.

Response projection:

```json
{
  "data": {
    "workforce": {
      "active": 142,
      "onNotice": 3,
      "terminated": 12,
      "missingManager": 4,
      "joiningSoon": 6
    },
    "attention": {
      "pendingLeave": 5,
      "pendingDevices": 2,
      "openSecurityAlerts": 1,
      "pendingRegularizations": 3
    },
    "setup": {
      "offices": 2,
      "attendancePolicies": 3,
      "shifts": 4,
      "policyAssignments": 138
    },
    "access": {
      "activeUsers": 133,
      "unavailableUsers": 2,
      "pendingInvitations": 7
    },
    "subscription": { "usedSeats": 142, "seatLimit": 200 },
    "modules": ["ATTENDANCE", "LEAVE", "PAYROLL"],
    "updatedAt": "2026-07-19T10:00:00.000Z"
  }
}
```

- Unauthorized groups are `null` or absent according to the frozen OpenAPI DTO; they are never populated and hidden only in CSS.
- Employee-derived counts use the same accessible employee ID scope.
- Dashboard links use validated filters such as `quickFilter=JOINING_SOON` and `quickFilter=MISSING_MANAGER`.

### 9.2 Unified employee workspace

`GET /employees/:id/workspace`

Permissions: full employee read, reporting-chain read, or self read as applicable.

Required response groups:

- `employee`: identity, employment status, contact, dates, work type, department, designation, manager, and primary office
- `readiness`: account, organization, attendance policy, shift/roster, office, device, biometric, and document indicators
- `account`: linked user summary and pending invitation state when authorized
- `attendance`: recent status, effective policy/shift, pending correction count, and links when authorized
- `leave`: balances and recent request summary when the Leave module and permission are present
- `devices`: counts and latest trusted-device state when authorized
- `biometrics`: consent, enrollment, and attendance eligibility without biometric templates
- `documents`: metadata counts only; download remains separately authorized
- `history`: recent lifecycle/audit events with a paginated full-history link

The composed response must not leak biometric templates, face evidence object keys,
password/token state, unrelated user roles, or inaccessible module data.

### 9.3 Employee lifecycle and linked account

Existing operations retained:

- `PATCH /employees/:id`
- `POST /employees/:id/terminate`
- `POST /employees/:id/reactivate`
- `GET /employees/:id/history`
- `POST /users/invitations` with optional tenant-scoped `employeeId`
- `POST /auth/invitations/accept`

Lifecycle rules:

- Termination requires effective date and auditable reason.
- Reactivation rechecks plan quota and does not silently restore old device trust.
- A pending invitation may target only one unlinked employee in the same tenant.
- Invitation acceptance links the new user and employee atomically.
- Concurrent acceptance or an already-linked employee rolls back without creating an orphan account.

### 9.4 Employee documents

- `GET /employees/:employeeId/documents`
- `POST /employees/:employeeId/documents/presign`
- `POST /employees/:employeeId/documents`
- `GET /employees/:employeeId/documents/:documentId/download`
- `DELETE /employees/:employeeId/documents/:documentId`

Validation:

- Category is a known enum; display name and MIME type are length-limited.
- Upload keys are tenant/employee scoped and cannot be supplied as arbitrary object paths.
- File size, extension, MIME type, retention, and malware/provider result are validated before metadata commit.
- List responses expose metadata, never private object-store credentials.

### 9.5 Module catalog and health

- `GET /workspace/modules`
- `GET /workspace/modules/:key/health`

Health status: `READY`, `NEEDS_SETUP`, or `BLOCKED`.

Required fields: module key/name/description/icon/availability, activation date,
dependency keys, conflict keys, missing dependencies, configuration counters, and
issues containing stable code, severity, plain-language message, and authorized
action route.

- Missing entitlement returns `MODULE_NOT_ENTITLED`.
- Health is calculated from persisted domain state, not a web checklist.
- Payroll history and downloads remain inaccessible after Payroll entitlement is removed.

### 9.6 Settings health

Required contract: `GET /workspace/settings/health`.

Permission: `workspace.settings.read`; each category is additionally filtered by
its domain permission and module entitlement.

```json
{
  "data": {
    "categories": [
      {
        "key": "ATTENDANCE",
        "status": "NEEDS_SETUP",
        "completed": 3,
        "total": 5,
        "issues": [
          {
            "code": "EMPLOYEES_WITHOUT_POLICY",
            "severity": "RECOMMENDED",
            "count": 14,
            "actionHref": "/app/settings/attendance/policies"
          }
        ]
      }
    ],
    "updatedAt": "2026-07-19T10:00:00.000Z"
  }
}
```

Categories: Company, Organization, Access, Modules, Attendance, Leave, Payroll,
Security, Notifications, Integrations, Billing, and Audit. Unsupported categories
must be omitted or explicitly marked `NOT_AVAILABLE`; they must not return fake
completion.

### 9.7 Notification preferences

Retain the real contracts:

- `GET /notification-preferences`
- `PUT /notification-preferences`

The Settings screen must describe these as current-user preferences unless a
separate tenant-template contract is implemented. It must not imply organization-
wide template management from a per-user endpoint.

### 9.8 Tenant audit

The tenant audit list must support validated pagination and filters for actor,
action, entity type, entity ID, request ID, and date range. Results are tenant
scoped, sensitive before/after values are scrubbed, and employee history may link
to the same authoritative audit source.

## 10. Business Invariants and State Transitions

### Employee lifecycle

```text
Planned/active -> On notice -> Terminated
Terminated -> Active (explicit reactivation, quota check, audit)
```

- A terminated employee cannot punch, begin field tracking, consume a new device approval, or receive active-seat behavior.
- Transfer changes are effective-dated and cannot create cross-tenant department, designation, manager, office, shift, roster, or policy references.
- The employee profile always displays current lifecycle state and next valid actions.

### Module lifecycle

```text
Not entitled -> Entitled/needs setup -> Ready
Ready -> Needs setup (configuration drift)
Any entitled state -> Blocked (missing dependency/conflict)
Entitled -> Not entitled (data retained, operations denied)
```

### Policy lifecycle

```text
Create draft input -> Validate scope/dependencies -> Review impact -> Persist/publish
Published -> Edit as a new auditable change/version where the domain supports versioning
Published -> Inactive only when effective resolution remains deterministic
```

Policy resolution order is explicit and deterministic:

1. Valid employee override
2. Valid department assignment
3. Tenant default

Conflicting assignments at the same priority fail validation. Effective-policy
preview and runtime behavior must use the same server resolver.

### Report lifecycle

```text
Queued -> Processing -> Completed -> Expired
Queued/Processing -> Failed -> Retry as a new auditable job
Completed payroll export -> Period lock -> Reopen with reason and audit
```

## 11. Data, Migration, and RLS Decisions

- Navigation and route grouping require no database table.
- Composed dashboard, employee workspace, module health, and settings health are read models over authoritative tenant tables.
- Employee document metadata uses the dedicated forward-only employee-document migration and private object storage.
- New policy assignment or version tables are introduced only if the current schema cannot represent the required scope/precedence safely.
- Every new tenant-owned table includes `tenantId`, foreign keys, deterministic indexes, RLS enable/force policy, tenant grants, and no-context fail-closed tests.
- Cross-context reads execute inside one `forTenant()` boundary or use explicitly safe projections; no client-provided tenant ID determines scope.
- Migrations include deterministic backfill, seeded-fixture verification, forward recovery notes, and no destructive column removal in this sprint.
- Dashboard counts and subscription usage use the commercial seat source of truth defined by the billing/quota contract.

Required indexes to verify, not blindly duplicate:

- Employee tenant/status/manager/joining-date filters
- Pending invitation tenant/employee/status lookup
- Attendance date/employee and request status/employee queues
- Device and security status/employee queues
- Audit tenant/entity/date pagination
- Report tenant/type/status/created date
- Policy assignment tenant/scope/target uniqueness

## 12. Stable Error Catalog

| Code                              | HTTP    | Meaning                                                       |
| --------------------------------- | ------- | ------------------------------------------------------------- |
| `TENANT_CONTEXT_REQUIRED`         | 400/401 | Trusted tenant context is absent                              |
| `WORKSPACE_NOT_FOUND`             | 404     | Workspace cannot be resolved                                  |
| `TENANT_SUSPENDED`                | 403     | Tenant is suspended                                           |
| `MODULE_NOT_ENTITLED`             | 403     | Tenant cannot use the requested commercial module             |
| `MODULE_DEPENDENCY_MISSING`       | 409     | Required module dependency is unavailable                     |
| `PERMISSION_DENIED`               | 403     | User lacks required persisted permission                      |
| `EMPLOYEE_NOT_FOUND`              | 404     | Employee is absent or outside tenant/scope                    |
| `EMPLOYEE_QUOTA_EXCEEDED`         | 409     | Create/reactivate exceeds the commercial seat limit           |
| `EMPLOYEE_ALREADY_LINKED`         | 409     | Employee already has a user account                           |
| `EMPLOYEE_INVITATION_PENDING`     | 409     | An active invitation already targets the employee             |
| `INVALID_LIFECYCLE_TRANSITION`    | 409     | Requested employee transition is not valid                    |
| `POLICY_SCOPE_CONFLICT`           | 409     | Same-priority assignment is ambiguous                         |
| `POLICY_DEPENDENCY_MISSING`       | 422     | Required office/shift/module/provider setup is absent         |
| `DOCUMENT_TYPE_NOT_ALLOWED`       | 422     | Document type or MIME is rejected                             |
| `DOCUMENT_TOO_LARGE`              | 413     | Upload exceeds configured limit                               |
| `REPORT_NOT_AVAILABLE`            | 404/410 | Report is unavailable, expired, or no longer entitled         |
| `MODULE_RESOURCE_NOT_FOUND`       | 404     | Requested module-owned resource does not exist in this tenant |
| `SETTINGS_CATEGORY_NOT_AVAILABLE` | 404     | No implemented configuration exists for the category          |

Error responses include `code`, safe `message`, `requestId`, and field details when
validation fails. Secrets, tokens, object keys, biometric material, and cross-tenant
identifiers are excluded.

## 13. Web, Design, and Guidance Contract

- Preserve the charcoal, white, and indigo DeltCRM visual language.
- Use one page-header, panel, status, table, form, dialog, loading, empty, error, and forbidden pattern.
- Desktop supports persistent context navigation; tablet and mobile use accessible compact navigation without horizontal page overflow.
- Tables provide a responsive card/list alternative where columns cannot remain readable.
- Every major area and complex control has an information action explaining purpose, permission, dependencies, safe workflow, and employee/mobile impact.
- Empty states state why the page is empty and offer the next authorized action.
- Destructive and broad-impact changes use a review step, affected count, effective date, consequences, and auditable reason.
- Forms preserve user input on recoverable errors and focus the first invalid field.
- Loading skeletons preserve layout; partial dashboard failure does not fabricate zero values.
- DeltCRM and tenant branding rules from Sprint 6.5 remain authoritative.

## 14. Ordered Work Packages

### 7.5.0 Contract and current-state audit

- [x] Inventory active tenant routes, APIs, permissions, entitlements, and existing workflows.
- [x] Freeze the five-area information architecture.
- [x] Create the canonical route map and compatibility rules.
- [x] Create this detailed Sprint 7.5 implementation contract.
- [ ] Export the current OpenAPI operation inventory and map every visible action to an operation.
- [ ] Record intentional Stitch differences and unresolved product decisions.

**Gate:** No screen moves until its route, permission, API owner, compatibility behavior, and empty/error states are documented.

### 7.5.1 Navigation, shell, search, and help

- [x] Create typed primary/context navigation metadata.
- [x] Restrict the permanent sidebar to Dashboard, Employees, Modules, Reports, and Settings.
- [x] Add permission- and entitlement-aware contextual navigation.
- [x] Add permission-aware employee/destination search.
- [x] Add reusable contextual help and route guidance.
- [ ] Complete breadcrumbs, filter return state, compact/mobile navigation, and deep-link regression coverage.
- [ ] Standardize forbidden, suspended, unavailable-module, loading, empty, and API-error layouts.

### 7.5.2 Actionable HR dashboard

- [x] Implement the server-authoritative `GET /dashboard/hr-summary` read model.
- [x] Apply Business Admin/HR full scope and Manager reporting-chain scope.
- [x] Return only permission-authorized queue groups.
- [x] Add workforce, Attendance, Leave, device, security, access, setup, and quota cards.
- [ ] Verify every metric route opens the exact pre-filtered queue and preserves scope.
- [ ] Add joining-soon, incomplete-onboarding, and setup-health workflow acceptance coverage.
- [ ] Verify partial-module, no-data, forbidden-group, and API-failure states.

### 7.5.3 Unified employee workspace

- [x] Implement a composed employee workspace read endpoint.
- [x] Add employee overview, employment, Attendance, Leave, account, device, biometric, documents, and history contexts.
- [x] Add edit/transfer, terminate, reactivate, and employee-linked invitation actions.
- [x] Add private employee document metadata/upload/download/delete flows.
- [x] Move organization and import discovery under Employees while preserving legacy routes.
- [x] Publish the canonical CSV schema/template and show required columns, examples, file preparation steps, and row-level errors in the import workflow.
- [x] Complete effective assignment details for office, shift, roster, Attendance policy, and Leave policy.
- [x] Add employee-specific Attendance/Leave history pagination and return links.
- [ ] Verify manager/self scope and action omission in API and web.
- [ ] Verify lifecycle state transitions, quota denial, invitation concurrency, and audit history end to end.

### 7.5.4 Module center

- [x] Load the module catalog from tenant entitlements.
- [x] Add module health with dependencies, configuration counters, issues, and action links.
- [x] Preserve the complete Attendance workspace.
- [x] Provide real Leave policies/operations and a real Payroll export/lock workspace.
- [ ] Complete Leave overview, balances, requests, and policy navigation as one workspace.
- [ ] Add a manifest-driven route/health contract for future modules.
- [ ] Implement Mail only to the extent supported by real service APIs; otherwise show an honest unavailable state.
- [ ] Verify entitlement removal blocks list/detail/generate/download routes without deleting historical data.

### 7.5.5 Reports center

- [x] Add top-level report discovery and reuse real report jobs/downloads.
- [x] Guard Payroll report creation, listing, detail, and download by entitlement.
- [x] Consolidate filters, queued/processing/completed/failed/expired states, retry guidance, and downloads.
- [x] Link Attendance and Payroll operations back to source periods and lock state.
- [ ] Add Leave report routes only after real API implementation.
- [ ] Verify report permission, manager scope, tenant isolation, expiration, and module removal.

### 7.5.6 Complete settings center

- [x] Add grouped Company, Organization, Access, Modules, Attendance, Leave, Payroll, Billing, and Audit entry points.
- [x] Implement `/workspace/settings/health` and category readiness cards.
- [x] Add a Security settings entry point using real device, verification, biometric, and alert-rule workflows.
- [x] Complete Notification settings using real preference APIs and accurate current-user scope labels.
- [x] Complete Integrations only with real provider diagnostics/configuration; remove fake connection controls.
- [ ] Ensure each setting has one owner and operational screens only link back to it.
- [ ] Add dependency-resolution links and permission-safe unavailable states.

### 7.5.7 Guided policy and assignment management

- [x] Surface Attendance policy precedence, assignment coverage, dependencies, and mobile impact guidance.
- [x] Surface Leave policy version/applicability guidance.
- [ ] Add a guided create/edit flow: purpose -> scope -> rules -> assignments -> impact -> review.
- [ ] Show tenant, department, and employee assignment counts and the effective winner.
- [ ] Validate duplicate priority, missing office/shift/module/provider, and contradictory verification rules.
- [ ] Preview employee web/mobile capabilities and required permissions using the server resolver.
- [ ] Require review and audit attribution for active-employee-impacting changes.
- [ ] Add safe templates for office location-only, office face verification, field, hybrid, Gulf weekend, and leave baselines.

### 7.5.8 Product consistency and responsive hardening

- [x] Remove active-source IndigoHR/IndigoCRM labels and document archived-reference exceptions.
- [ ] Normalize terminology for employee, user, module, policy, assignment, approval, and setting.
- [ ] Verify desktop, tablet, and mobile-web layout for all five areas and critical dialogs.
- [ ] Verify keyboard navigation, focus return, touch targets, labels, headings, contrast, and reduced motion.
- [ ] Verify all forms and actions have loading, success, validation, API-error, and retry behavior.

### 7.5.9 Documentation and production verification

- [x] Update the DeltCRM HR portal user guide with role-based workflows.
- [ ] Publish the final route map, role/permission matrix, API action map, and administrator setup sequence.
- [ ] Run migration, seed, lint, typecheck, build, unit, integration, RLS, API e2e, Playwright, accessibility, and responsive gates.
- [ ] Export Swagger and prove no visible workflow references a missing operation.
- [ ] Capture representative Stitch/reference and implementation screenshots with documented differences.
- [ ] Record known limitations with owner and target sprint; no silent placeholder remains.

## 15. Test Plan

### Unit tests

- Dashboard employee-scope resolution and unauthorized group omission
- Employee workspace composition and sensitive-field exclusion
- Lifecycle transitions, quota checks, invitation linking, and concurrent acceptance
- Module health dependency/conflict/configuration calculations
- Policy precedence, assignment conflict, dependency, and effective-preview resolution
- Settings health category status and permission filtering
- Report entitlement and historical-resource denial
- Navigation manifest permission/entitlement filtering

### Database and RLS integration tests

- Tenant A cannot list, count, read, mutate, download, or infer tenant B resources
- No tenant context fails closed for every new tenant-owned table/query
- Manager reporting scope applies to counts, pagination, detail, export, and queues
- Employee document metadata/object keys remain tenant/employee scoped
- Invitation acceptance links account and employee atomically
- Audit/outbox records commit with the owning mutation and roll back on failure
- Required indexes are exercised by representative query plans

### HTTP e2e tests

- Business Admin completes employee create -> assign -> invite -> trust -> terminate/reactivate journey
- HR completes Attendance policy create -> assign -> preview -> daily operation journey
- Manager sees and acts only on reporting-line Attendance/Leave queues
- Removed module entitlement blocks all operational and historical report access
- Every dashboard deep link produces the expected filtered result
- Direct unauthorized routes return coded errors independently of navigation visibility
- Suspended tenant and unavailable workspace behavior is consistent
- Settings categories expose only real, permitted configuration

### Playwright tests

- Five-item navigation and context navigation for Business Admin, HR, and Manager
- Employee directory -> profile tabs -> lifecycle/account/device/document workflows
- Module catalog -> Attendance/Leave/Payroll operational and setup paths
- Report generation/status/download/expired/error states
- Settings health -> category -> dependency resolution -> return path
- Legacy route and notification deep-link compatibility
- Loading, empty, validation, partial failure, forbidden, unavailable-module, and suspended states
- Desktop, tablet, and mobile-web screenshots at deterministic viewports
- Keyboard-only and automated accessibility checks for critical workflows

### Flutter contract regression

- DeltCRM public brand and tenant brand after login
- Entitled modules and employee policy determine visible features
- Location, selfie, biometric, device, and field permissions match effective policy preview
- Logout and tenant change clear tenant branding, config, navigation, and queued private state

### Quality commands

The final evidence log records exact repository commands and results for:

- API lint, typecheck, build, unit, integration, e2e, and OpenAPI export
- Web lint, typecheck, production build, Playwright, accessibility, and visual tests
- Prisma migration status, seed, RLS/isolation suite, and query-plan checks
- Flutter analyze, unit/widget/contract tests, and web/mobile smoke test

## 16. Deterministic Acceptance Fixtures

| Fixture                                 | Purpose                                                       |
| --------------------------------------- | ------------------------------------------------------------- |
| Acme Business Admin                     | Full tenant access, billing, settings, lifecycle, and modules |
| Acme HR Admin                           | HR operations without owner-only billing controls             |
| Acme Manager A                          | Reporting chain A only                                        |
| Acme Manager B                          | Separate reporting chain used to prove scope isolation        |
| Acme Office Employee                    | Location-only policy, trusted device, no face requirement     |
| Acme Field Employee                     | Field policy, device/biometric readiness and route data       |
| Acme Joining Employee                   | Future joining date and incomplete onboarding                 |
| Acme Terminated Employee                | Lifecycle/read-only history and reactivation tests            |
| Globex Admin/Employee                   | Tenant B isolation controls                                   |
| Suspended tenant                        | Workspace-unavailable behavior                                |
| Tenant without Payroll                  | Commercial entitlement denial                                 |
| Tenant with incomplete Attendance setup | Settings/module health and next-action tests                  |

Fixtures must use deterministic dates relative to a frozen test clock, stable IDs or
lookup keys, and documented credentials stored only in local test/seed configuration.

## 17. Stitch and Visual Acceptance

- Archive the relevant Stitch screen ID, HTML/screenshot, viewport, and assets before implementing a screen family.
- Preserve useful hierarchy and interaction intent, not generated markup or inconsistent dimensions.
- Compare representative Dashboard, Employee, Module, Reports, and Settings screens at reference and supported responsive viewports.
- Document intentional differences caused by domain correctness, accessibility, responsive behavior, real data states, or DeltCRM branding.
- Pixel identity is not the exit gate. Workflow completeness, clarity, consistency, and tested behavior are.

## 18. Sprint Definition of Done

- [x] The only permanent main-navigation areas are Dashboard, Employees, Modules, Reports, and Settings.
- [ ] A new HR user can find every authorized task without knowing internal routes or API names.
- [x] Every employee-related operation is discoverable from the directory or unified employee workspace.
- [ ] Every entitled implemented module has a coherent operational and configuration workspace.
- [ ] Policies explain scope, precedence, assignments, dependencies, impact, and effective behavior.
- [ ] Every dashboard metric opens the correct permission-safe filtered workflow.
- [x] Settings contains all real company, organization, access, module, Attendance, Leave, Payroll, security, notification, integration, billing, and audit configuration.
- [ ] No visible button, count, status, integration, or module capability is static or simulated.
- [ ] Existing routes, bookmarks, notifications, API behavior, and deep links remain compatible.
- [ ] API permissions, module entitlements, manager scope, tenant isolation, and suspended behavior are authoritative and tested.
- [x] DeltCRM terminology and charcoal/white/indigo visual language are consistent across active source.
- [ ] Desktop, tablet, and mobile web pass visual, responsive, keyboard, and accessibility verification.
- [ ] Flutter runtime behavior remains aligned with the tenant and effective policy preview.
- [ ] OpenAPI, user/admin documentation, route map, permission matrix, screenshots, and test evidence match deployed behavior.
- [ ] Sprint 8 GA cannot be marked complete until every Sprint 7.5 item is complete or an explicit approved deferral identifies owner, risk, and target release.

## 19. Progress Tracker

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.
Completion requires implementation links and passing verification evidence; code
presence or a narrow typecheck alone is not sufficient.

| Work package                       | Status      | Current evidence / remaining gate                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.5.0 Contract and audit           | In progress | Current route/API audit, reconstruction plan, and this sprint contract exist; OpenAPI action map and Stitch decision log remain                                                                                                                                                                                                       |
| 7.5.1 Navigation/shell/search/help | In progress | Typed five-area navigation, contextual links, search, and help exist; responsive/deep-link/state verification remains                                                                                                                                                                                                                 |
| 7.5.2 HR dashboard                 | In progress | Authoritative HR summary and manager scope implemented with focused unit coverage; full deep-link/API/browser matrix remains                                                                                                                                                                                                          |
| 7.5.3 Employee workspace           | In progress | Composed workspace, lifecycle/account actions, documents, devices, biometrics, history, effective office/shift/roster/Attendance/Leave assignment details, a focused one-policy employee override/inheritance workflow, paginated employee Leave history, Attendance return links, a backend-owned CSV import schema/template with row errors, a three-step onboarding guide, post-create setup routing, and an actionable readiness checklist are integrated; scope/lifecycle e2e gates remain |
| 7.5.4 Module center                | In progress | Entitlement catalog, health, Attendance, Leave, and Payroll foundations exist; future-module/Mail behavior and full entitlement regression remain                                                                                                                                                                                     |
| 7.5.5 Reports center               | In progress | Top-level catalog, Payroll entitlement filtering, status filters, retry/expiry guidance, downloads, and source workflow links exist; manager-scope and tenant-isolation verification remain                                                                                                                                           |
| 7.5.6 Settings center              | In progress | Settings follows four ordered setup groups; permission-filtered readiness, safe integration diagnostics, Security, current-user Notification settings, and plain-language role capabilities with employee/manager presets are linked; ownership/unavailable-state verification remains                                                |
| 7.5.7 Guided policies              | In progress | Attendance/Leave guidance and policy foundations exist; employee-specific Attendance selection is atomic and tested, while guided creation review, impact preview, templates, and department/default assignment coverage remain                                                                                                       |
| 7.5.8 Consistency/responsive       | In progress | Active application source no longer contains IndigoHR/IndigoCRM product labels; the full 89-test Playwright suite covers desktop, tablet/compact, and 390px critical workflows without failures; complete keyboard/accessibility verification remains                                                                                     |
| 7.5.9 Documentation/verification   | In progress | Role-based DeltCRM user guide exists; API/web lint and typecheck, API/web production builds, 53 API unit suites (263 tests), 22 API e2e suites (80 tests), and 89 Playwright tests pass; Flutter, OpenAPI action-map, automated accessibility, migration-status, and final screenshot gates remain                                          |

## 20. Completion Evidence Log

### July 19, 2026 - Employee onboarding and role-access usability

- Added a three-step onboarding guide to the employee directory and explained the remaining setup sequence on the create form.
- Employee creation now opens the created employee workspace instead of returning HR to the directory.
- Replaced the passive readiness list with an actionable employee setup checklist covering account, manager, workplace, shift/roster, effective Attendance policy, and trusted device.
- Replaced raw permission keys as the primary role-editor labels with plain-language capabilities and explanations; technical keys remain available through an explicit advanced toggle.
- Added safe employee self-service and team-manager starting presets for custom roles, while built-in roles remain protected and clearly explained.
- Verification: targeted web ESLint and TypeScript passed; the Next.js production build passed with all 71 routes; the focused Sprint 3 role-screen Playwright contract passed 2/2 at 1024px and 1440px.

### July 19, 2026 - Employee detail resilience and Organization maintenance

- Decoupled the core employee workspace from optional biometric status so a disabled or unavailable Attendance/biometric entitlement no longer blanks the complete employee profile.
- Added parent selection, child creation, inline rename, hierarchy movement, and safe deletion controls for departments using the existing guarded Organization APIs.
- Added inline rename and safe deletion controls for designations; the designation list API now returns authoritative assigned-employee counts.
- API conflict messages now explain when employees or child departments must be reassigned before deletion.
- Employee placement updates now submit changed fields only, so unchanged legacy phone values do not block department, designation, manager, work-type, or name changes; newly edited phone values still require E.164 format and field-level validation messages are shown.
- Verification: API/web TypeScript and targeted ESLint passed; API and web production builds passed; live employee workspace returned HTTP 200 while the optional biometric endpoint returned the reproduced HTTP 403; live designation data returned `employeeCount: 25`; focused Playwright regressions passed 2/2.

### July 19, 2026 - Settings, employee assignments, reports, and brand pass

- Added `GET /workspace/settings/health` with permission-filtered persisted configuration counters and actionable readiness issues.
- Added `GET /workspace/integrations` with deployment-provider readiness only; credentials, URLs, and tokens are never returned.
- Added ordered Settings readiness cards and real Integration diagnostics; Security and current-user Notification settings continue to reuse their existing APIs.
- Expanded employee assignment visibility for offices, shifts, rosters, effective Attendance policy precedence, and assigned versioned Leave policies.
- Added employee-filtered paginated Leave history and safe return links; full Attendance history continues through the employee register route.
- Added entitlement-aware report types, status filtering, failed-job regeneration, expiry handling, downloads, and links to source Attendance/payroll workflows.
- Removed remaining active-source IndigoHR/IndigoCRM product labels; archived Stitch/raw evidence remains intentionally unchanged.
- Verification: API and web typecheck passed; ESLint passed with zero errors (14 existing warnings); API production build passed; web production build passed with 71 routes; 53 API unit suites passed with 263 tests; 22 API e2e suites passed with 80 tests against PostgreSQL, Redis, and MinIO; the complete Playwright suite passed 89/89 serially across HR, Attendance, platform, billing, responsive, and visual contracts.

### July 19, 2026 - Full browser regression stabilization

- Updated legacy Sprint 3 dashboard expectations to the canonical **HR operations** workspace without weakening queue or responsive assertions.
- Added deterministic Attendance module-entitlement fixtures to Sprint 4 tests so direct routes exercise the real module guard rather than an unavailable fallback.
- Updated Sprint 5 employee-device tests for the unified employee workspace and its **Devices & biometrics** context.
- Added deterministic employee workspace and shift API fixtures; selectors now use exact semantic controls and no longer collide with global search.
- Verification: the previously failing Sprint 3-5 subset passed 27/27 after correction, followed by the complete Playwright run passing 89/89 in 1.9 minutes with one worker.

### July 19, 2026 - Attendance user-flow documentation

- Added `docs/files/attendance-user-flow-v1.puml` for the complete HR configuration, employee onboarding, dynamic policy, daily Attendance, correction, reporting, and payroll-close journey.
- Added `docs/files/attendance-sequence-v1.puml` for the detailed service interaction from policy publication through location-only check-in/check-out and failure handling.
- Linked both PlantUML sources from the role-based DeltCRM HR portal user guide.
- Corrected multiline sequence-message syntax and validated both sources with PlantUML `1.2022.14 -checkonly`, matching the renderer used by the project documentation preview.

### July 19, 2026 - Employee policy assignment and mobile policy enforcement

- Replaced the employee workspace's generic policy redirect with a focused selector that shows every predefined Attendance policy and an explicit **Use inherited policy** option.
- Added `PUT /attendance-policies/employees/:employeeId`; the tenant-scoped transaction validates the employee and selected policy, removes previous direct overrides, creates at most one replacement, records an audit event, increments runtime configuration, and invalidates policy cache.
- Employee assignment failures now show the API's actionable validation message instead of a generic background error, and saving returns HR to the same employee's Assignments tab.
- Corrected the checked-in Flutter development profile to use the seeded Acme API with `LOCAL_MODE=false`; the previous profile bypassed `/mobile/runtime-config` and always used a hard-coded selfie-required demo policy.
- Mobile onboarding, direct biometric routes, punch entry, and punch retry now treat effective `selfieMode=DISABLED` as authoritative, so a location-only employee never receives biometric consent, face enrollment, or secure-camera capture.
- Corrected device onboarding to trust only the exact installation UUID bound into the login JWT. The mobile current-device request now sends `x-device-uuid`, unmatched installations show their own identity and registration action, pending devices expose **Check approval status**, and runtime no longer borrows another active device record owned by the employee.
- Renamed the HR biometric summary from the misleading **Attendance eligible** label to **Face verification ready**; face enrollment is not a prerequisite when the effective policy disables selfies.
- Verification: API/web TypeScript and targeted ESLint passed; API and web production builds passed; the focused policy Playwright test passed 1/1; the Attendance API e2e run passed 4 suites and 15 tests; Flutter analysis passed and focused runtime/router tests passed 8/8 across three viewport sizes, 200% text, and accessibility. The full Flutter run passed 69 functional tests and exposed one unrelated M12 Attendance History golden variance of 0.15% (517 pixels), which remains a visual-baseline follow-up rather than being silently regenerated.
- Exact-device regression verification: the runtime-config unit suite passed 4/4 and focused Flutter device/runtime/route coverage passed 14/14. A live seeded login bound to device `019f7016-aed9-7242-bb2b-c0a90f87506e` returned `deviceRegistrationComplete=true`; a different installation UUID returned no bound device and `deviceRegistrationComplete=false`.

### Explicit remaining Sprint 7.5 gates

- Guided Attendance/Leave policy creation, assignment impact preview, safe templates, and active-employee review are not complete.
- Mail remains intentionally limited until a real provider-facing business-module contract exists; no simulated connection controls were added.
- Full OpenAPI visible-action mapping, manager/self and entitlement-removal matrices, automated accessibility, Flutter contract regression, and final screenshot/decision evidence remain open.
- These items keep Sprint 7.5 status **In progress** and prevent a false General Availability completion claim.

When a work package becomes complete, record:

- Implementation files and migration names
- OpenAPI operations and generated-client drift result
- Unit/integration/e2e/RLS/Playwright/Flutter test commands and totals
- Role, tenant, module, error, empty, and responsive states exercised
- Reference and implementation screenshots
- Performance/query-plan evidence for dashboard and large employee/report lists
- Known limitations or approved deferrals

Do not change the sprint status to `Complete` until Section 18 is proven item by
item against the current implementation and evidence.
