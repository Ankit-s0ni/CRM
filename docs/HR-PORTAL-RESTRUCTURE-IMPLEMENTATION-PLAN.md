# DeltCRM Tenant HR Portal Restructure Implementation Plan

> The authoritative implementation contract for this work is now
> `docs/Sprint list /SPRINT-7.5-IMPLEMENTATION.md`. This document remains the
> original product audit and working design rationale.

Status: In progress  
Scope: Complete tenant-facing web portal for Business Admin, HR, Manager, and Employee roles  
Product name: DeltCRM  
Reference implementation: Existing Next.js tenant portal, NestJS API, Flutter employee app, and Stitch screens

## 1. Objective

Reorganize the complete tenant HR portal into a coherent, production-ready product. Existing features must remain available, but related tasks must be grouped into understandable workspaces instead of appearing as unrelated sidebar links or isolated screens.

The portal must answer five questions for every user:

1. What needs my attention now?
2. Where do I manage an employee from start to exit?
3. Where do I operate and configure each subscribed module?
4. Where do I generate and retrieve reports?
5. Where do I configure company-wide settings, access, integrations, and billing?

## 2. Current-State Audit

### 2.1 What already works

- [x] Tenant authentication, tenant isolation, role permissions, and module guards.
- [x] Tenant branding and runtime module/capability configuration.
- [x] Employee directory, create/update, lifecycle actions, manager hierarchy, departments, designations, and CSV import.
- [x] Attendance dashboard, daily register, exceptions, regularization, devices, security, field operations, offices, policies, shifts, rosters, holidays, reports, and payroll locking.
- [x] Leave policies, balances, requests, approvals, and employee self-service APIs.
- [x] Users, invitations, roles, permission matrix, subscription, notifications, and onboarding.
- [x] Device trust, biometric consent/enrollment, face reset, and tenant audit persistence.
- [x] Responsive tenant shell and tested Attendance workspaces.

### 2.2 Problems to resolve

- [x] Reports is present in primary navigation and opens the existing report center.
- [ ] Employee work is split between Employees, Organization, Bulk Import, Devices, Attendance, Leave, and Access without a unified employee context.
- [ ] The employee profile only surfaces employment summary, devices, and biometrics; history, attendance, leave, assignments, policies, and audit context are not organized as one workspace.
- [ ] Modules only offers a complete Attendance workspace; Leave is partial and other enabled modules render placeholders.
- [ ] Settings only exposes Company, Users and Roles, and Billing, while many real settings are hidden under Attendance or unrelated routes.
- [ ] Policy configuration does not consistently explain scope, precedence, dependencies, or mobile-app impact.
- [ ] Dashboard is Attendance-heavy and does not aggregate onboarding, access, leave, device, security, and configuration actions.
- [x] Global search returns permission-filtered employees and portal destinations.
- [x] Tenant module navigation depends on all entitled modules instead of Attendance alone.
- [ ] Some completed functionality is documented in sprint files but is not discoverable from the product.
- [ ] There is no single route, permission, workflow, or ownership registry for the portal.

## 3. Target Information Architecture

The permanent primary navigation is:

| Area | Route | Purpose |
| --- | --- | --- |
| Dashboard | `/app` | Role-aware operational overview and pending work |
| Employees | `/app/employees` | Employee lifecycle and all employee-related operations |
| Modules | `/app/modules` | Subscribed product tools and their operational workspaces |
| Reports | `/app/reports` | Cross-module report center, exports, and downloads |
| Settings | `/app/settings` | Company, organization, access, module, policy, security, integration, and billing configuration |

Rules:

- [ ] Primary navigation contains product areas, not individual screens.
- [ ] Context navigation changes for the selected area and only shows authorized features.
- [ ] Module workspaces separate daily operation from policy/configuration.
- [ ] Settings links to configuration; it does not duplicate operational screens.
- [ ] Existing routes remain valid through canonical links or redirects.
- [ ] Every page includes a title, purpose, relevant help, permission-safe actions, and meaningful empty/error/loading states.

## 4. Route Map

### 4.1 Dashboard

- `/app` - Role-aware HR dashboard.
- `/app/notifications` - Notification center, linked from the header.

Dashboard action groups:

- Workforce: active, joining, on notice, terminated, missing manager/profile setup.
- Attendance: present, absent, late, field active, exceptions, regularizations.
- Leave: pending approvals and upcoming leave.
- Trust and security: pending devices, blocked devices, biometric enrollment, alerts.
- Setup: onboarding progress, missing offices/policies/shifts, module configuration health.
- Access: pending invitations and disabled users.

### 4.2 Employees

- `/app/employees` - Searchable directory and lifecycle filters.
- `/app/employees/new` - Guided employee creation.
- `/app/employees/:id` - Unified employee workspace.
- `/app/employees/:id/overview` - Employment and contact summary.
- `/app/employees/:id/attendance` - Register, exceptions, regularizations, shift and roster.
- `/app/employees/:id/leave` - Balances, requests, approvals, and history.
- `/app/employees/:id/access` - Linked user, roles, invitation, and account status.
- `/app/employees/:id/devices` - Device approval/block/replace and last activity.
- `/app/employees/:id/biometrics` - Consent, enrollment, eligibility, and reset.
- `/app/employees/:id/assignments` - Department, manager, office, shift, roster, and policy resolution.
- `/app/employees/:id/history` - Employment and tenant audit timeline.
- `/app/employees/import` - Employee CSV import and job history.
- `/app/employees/organization` - Departments, designations, and reporting hierarchy.

Compatibility:

- `/app/organization` remains valid and redirects to `/app/employees/organization`.
- `/app/imports/employees` remains valid and redirects to `/app/employees/import`.
- Attendance employee deep links remain valid and are linked from employee tabs.

### 4.3 Modules

- `/app/modules` - Entitled module catalog and setup/health status.
- `/app/modules/attendance` - Attendance operational overview.
- `/app/modules/attendance/daily` - Register and live board.
- `/app/modules/attendance/requests` - Exceptions and regularizations.
- `/app/modules/attendance/field` - Field operations and route monitoring.
- `/app/modules/attendance/security` - Devices, biometric trust, and alerts.
- `/app/modules/attendance/setup` - Offices, policies, shifts, rosters, holidays, and defaults.
- `/app/modules/attendance/reports` - Attendance report shortcut into report center.
- `/app/modules/leave` - Leave operational overview.
- `/app/modules/leave/requests` - Requests and approval queue.
- `/app/modules/leave/balances` - Employee balances.
- `/app/modules/leave/policies` - Versioned leave policy management.
- `/app/modules/payroll` - Payroll module overview when entitled.
- `/app/modules/mail` - Mail module overview when entitled.

Existing Attendance and Leave routes remain supported as canonical child screens until migration is complete.

### 4.4 Reports

- `/app/reports` - Report catalog and export job history.
- `/app/reports/attendance` - Muster, late/OT, violations, and field distance.
- `/app/reports/payroll` - Payroll export and lock state.
- `/app/reports/leave` - Leave usage and balance reports when implemented.

### 4.5 Settings

- `/app/settings` - Grouped settings home with configuration health.
- `/app/settings/company` - Legal/company details, branding, locale, timezone.
- `/app/settings/organization` - Departments, designations, offices, holidays.
- `/app/settings/access` - Users, invitations, roles, and permission matrix.
- `/app/settings/modules` - Entitlements, subscriptions, module state, and dependencies.
- `/app/settings/attendance` - Attendance defaults and runtime behavior.
- `/app/settings/attendance/policies` - Policy CRUD, assignment, precedence, and preview.
- `/app/settings/attendance/shifts` - Shift and roster defaults.
- `/app/settings/attendance/verification` - Location, selfie, biometric, device, and field tracking controls.
- `/app/settings/leave` - Leave policy configuration.
- `/app/settings/payroll` - Payroll configuration when entitled.
- `/app/settings/security` - Devices, biometrics, sessions, and security policy.
- `/app/settings/notifications` - Notification preferences and templates.
- `/app/settings/integrations` - External services and future API/webhook settings.
- `/app/settings/billing` - Plan, usage, invoices, and billing status.
- `/app/settings/audit` - Tenant audit log.

## 5. Role and Permission Matrix

| Capability | Business Admin | HR | Manager | Employee |
| --- | --- | --- | --- | --- |
| Tenant operational dashboard | Full | Full without owner billing | Team scope | Self scope |
| Employee directory | Full | Full | Reporting line | Self only |
| Employee lifecycle | Full | Full | No | No |
| Organization structure | Manage | Manage | Read | No |
| Users and roles | Manage | Assigned access permissions | No | No |
| Attendance operation | Full | Full | Team scope | Self scope |
| Attendance configuration | Full | Permission-based | No | No |
| Leave operation | Full | Full | Team approvals | Self requests |
| Leave policy management | Full | Permission-based | No | No |
| Reports | All entitled | Permission-based | Team reports | Self reports only |
| Module and subscription settings | Full | Read when allowed | No | No |
| Billing | Full | No by default | No | No |
| Audit and security | Full | Permission-based | Team-relevant alerts | Self devices/consent |

Implementation rules:

- [ ] Server/API permissions are authoritative; hidden UI is not a security boundary.
- [ ] Navigation is generated from permissions, entitlements, and runtime capabilities.
- [ ] Manager and self-scoped responses are enforced in repositories/services.
- [ ] Unauthorized pages show a useful access explanation and safe destination.
- [ ] Disabled/suspended modules preserve data and show entitlement status instead of broken links.

## 6. Core Workflow Maps

### 6.1 Add and activate an employee

Directory -> Add employee -> Employment details -> Organization assignment -> User invitation -> Office/shift/policy assignment -> Device/biometric readiness -> Active employee profile.

- [ ] Show progress and incomplete requirements on the employee profile.
- [ ] Allow optional account invitation for non-app employees.
- [ ] Reuse employee quota and lifecycle APIs.

### 6.2 Configure attendance

Modules -> Attendance -> Setup health -> Defaults -> Offices -> Policies -> Assignments -> Shifts/rosters -> Verification/device rules -> Preview effective mobile behavior -> Publish/test.

- [ ] Explain tenant default, department override, and employee override precedence.
- [ ] Show effective policy and why it applies.
- [ ] Show dependencies such as geofence requiring an office assignment.
- [ ] Preview required mobile permissions and visible punch controls.

### 6.3 Handle daily attendance

Dashboard alert -> Attendance daily/requests -> Employee/day detail -> Evidence -> Approve/reject/correct -> Audit result -> Return to filtered queue.

### 6.4 Configure and approve leave

Modules -> Leave -> Policies -> Balances -> Employee request -> Manager/HR approval -> Balance ledger -> Attendance exception.

### 6.5 Review employee trust

Dashboard pending device -> Employee -> Devices -> Approve/block/replace -> Biometrics -> Consent/enrollment status -> Attendance eligibility.

### 6.6 Generate a report

Reports -> Select module/report -> Filters and period -> Generate -> Job progress -> Download -> Related payroll lock if applicable.

## 7. Guided Policy Experience

Every policy editor must include:

- [ ] Plain-language purpose and examples.
- [ ] Scope selector: tenant default, department, or employee.
- [ ] Assignment count and affected employees.
- [ ] Precedence explanation and effective-policy preview.
- [ ] Validation for incompatible settings.
- [ ] Dependency checks for offices, shifts, device trust, biometrics, or module entitlement.
- [ ] Mobile impact summary: required permissions, visible controls, background behavior, and fallback behavior.
- [ ] Draft/change review before save when the change affects active employees.
- [ ] Audit attribution and updated timestamp.
- [ ] Safe empty states and a recommended baseline template.

## 8. API Contract Work

### 8.1 Reuse and compose existing APIs

- [x] Employees, lifecycle, history, organization, imports.
- [x] Attendance configuration and operations.
- [x] Devices, biometrics, security, and field tracking.
- [x] Leave policies, balances, and requests.
- [x] Reports and payroll locks.
- [x] Users, invitations, roles, permissions, settings, billing, notifications.

### 8.2 Add or extend APIs

- [ ] `GET /dashboard/hr-summary` composing role-scoped pending actions across modules.
- [x] `GET /employees/:id/workspace` composing profile readiness and permission-filtered module summaries.
- [ ] `GET /employees/:id/attendance-summary` with recent days, effective shift/policy, and request counts.
- [ ] `GET /employees/:id/leave-summary` with balances and recent requests.
- [ ] `GET /employees/:id/assignments` and atomic assignment update.
- [ ] `GET /employees/:id/audit` filtered from tenant audit logs.
- [ ] Employee document metadata/upload APIs only after retention and storage rules are approved.
- [ ] `GET /settings/health` returning grouped setup readiness and dependencies.
- [ ] `GET /modules/:key/health` returning entitlement, configuration, and runtime readiness.
- [ ] Leave report contracts if required for the first report-center release.

Contract requirements:

- [ ] Tenant isolation and role scope tests for every composed endpoint.
- [ ] Stable error codes and request IDs.
- [ ] Swagger examples and response DTOs.
- [ ] Pagination for lists and audit/history feeds.
- [ ] No confidential biometric material or signed object keys in generic employee responses.

## 9. Ordered Implementation Work Packages

### WP 1 - Architecture and navigation foundation

- [x] Create typed route/navigation registry.
- [x] Add Reports to primary navigation.
- [x] Make Modules visibility depend on entitled modules, not Attendance alone.
- [x] Build permission-aware context navigation for all five areas.
- [ ] Add breadcrumbs, page purpose, contextual help, and mobile navigation.
- [ ] Preserve legacy deep links and add tested redirects where routes move.

### WP 2 - Actionable HR dashboard

- [ ] Define role-scoped dashboard summary DTO/API.
- [ ] Add workforce, attendance, leave, device/security, access, and setup cards.
- [ ] Link every number to a prefiltered operational queue.
- [ ] Support loading, empty, partial-module, permission, and API-error states.

### WP 3 - Unified employee management

- [x] Add employee workspace tabs and readiness summary.
- [x] Integrate employment, organization, account, attendance, leave, assignments, devices, biometrics, and history summaries.
- [x] Move import and organization into Employee context navigation while preserving legacy routes.
- [ ] Add contextual lifecycle and invitation actions.
- [ ] Preserve manager/self scope in API and UI.

### WP 4 - Module center

- [ ] Build consistent module cards with entitlement, health, setup, and pending work.
- [ ] Keep Attendance workspace complete and integrate its existing navigation.
- [ ] Complete Leave overview, requests, balances, and policies.
- [ ] Add honest Payroll and Mail states based on actual entitlement and implementation.
- [ ] Never present a non-working control as available.

### WP 5 - Reports center

- [x] Add top-level report catalog and export history using the existing report implementation.
- [ ] Integrate existing Attendance and payroll report APIs.
- [ ] Add job status, retry guidance, expiry, and download handling.
- [ ] Enforce permission/module visibility.

### WP 6 - Complete settings center

- [x] Build grouped settings home for company, organization, access, modules, Attendance, Leave, notifications, and billing.
- [ ] Integrate company, organization, access, modules, Attendance, Leave, security, notifications, billing, and audit.
- [ ] Separate configuration links from daily operational links.
- [ ] Add setup health and dependency resolution links.

### WP 7 - Guided policy management

- [ ] Add policy scope and precedence visualization.
- [ ] Add assignment CRUD and effective-policy preview.
- [ ] Add impact/dependency validation and mobile behavior preview.
- [ ] Add policy audit and safe change confirmation.

### WP 8 - Search, guidance, and product consistency

- [ ] Implement permission-aware global search for employees, settings, and module destinations.
- [x] Add contextual help registry and workflow guidance for every major portal area and all Attendance features.
- [ ] Replace remaining IndigoHR/IndigoCRM labels with DeltCRM except historical raw design references.
- [ ] Standardize loading, empty, error, access-denied, disabled-module, and suspended-tenant states.

### WP 9 - Production verification

- [ ] API unit tests for composed services and policy resolution.
- [ ] API e2e tests for role scope, tenant isolation, module guards, lifecycle, and settings.
- [ ] Web tests for navigation, deep links, workflows, permissions, responsive layouts, and API failures.
- [ ] Flutter contract tests proving tenant policy dynamically controls employee-app features and required permissions.
- [ ] Accessibility checks for keyboard, focus, labels, dialogs, and contrast.
- [ ] Build, lint, typecheck, Swagger operation inventory, and migration verification.
- [ ] Update user guide, admin guide, route map, API documentation, and test evidence.

## 10. Definition of Done

The restructure is complete only when:

- [ ] A new HR user can find every authorized task from Dashboard, Employees, Modules, Reports, or Settings without knowing route names.
- [ ] Employee lifecycle and employee-related module information are accessible from one employee workspace.
- [ ] Business Admin and HR can understand, create, assign, and verify effective policies without reading technical documentation.
- [ ] Module screens reflect actual entitlements, permissions, configuration, and implementation status.
- [ ] Every dashboard metric links to actionable filtered data.
- [ ] Existing working routes and API integrations have no behavioral regressions.
- [ ] Tenant isolation, permission scope, and mobile runtime behavior are covered by automated tests.
- [ ] Desktop and mobile web layouts are visually verified.
- [ ] Product copy consistently says DeltCRM.
- [ ] Documentation and test evidence match the deployed behavior.

## 11. Evidence Log

Add implementation links, API operations, migrations, screenshots, and passing test commands here as each work package completes.

| Work package | Status | Evidence |
| --- | --- | --- |
| WP 1 Architecture and navigation | In progress | Typed registry, five primary areas, canonical grouped routes, permission/module filtering, typecheck, metadata tests added |
| WP 2 HR dashboard | In progress | HR operations title, role-aware Attendance board, Leave approvals, pending devices, security, correction and setup links use real filtered workflows |
| WP 3 Employee management | In progress | Composed `GET /employees/:id/workspace`, unified seven-tab web workspace, tenant-isolation e2e assertion, API/web typecheck and 11 organization unit tests |
| WP 4 Module center | In progress | Attendance workspace retained; Leave operations plus real versioned policy management added |
| WP 5 Reports center | In progress | Top-level `/app/reports` and Attendance report route reuse existing report jobs/downloads |
| WP 6 Settings center | In progress | Expanded permission/module-aware settings home and canonical grouped routes |
| WP 7 Guided policies | In progress | Attendance precedence, coverage, app impact and dependency warnings; Leave versioning/applicability guidance |
| WP 8 Search and guidance | In progress | Permission-aware employee/destination search, contextual header guides, DeltCRM HR portal user guide |
| WP 9 Verification | In progress | API lint/typecheck/build pass; web lint has 14 existing warnings and no errors; web typecheck/build pass with 64 routes; 11 organization unit tests pass; database/browser suites remain to run |
