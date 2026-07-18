# Attendance HR Portal Restructure Plan

## 1. Objective

Turn the current Attendance module from a collection of equal-weight screens
into a practical HR workspace organized around daily work. Preserve every
implemented feature, permission boundary and deep link while reducing the number
of choices an HR user must understand at once.

Every feature entry point and every complex policy/control will include an
accessible information (`i`) action explaining:

- what the feature does;
- when HR should use it;
- the shortest safe workflow;
- who can access or change it;
- what employee, payroll, security or mobile-app behavior it affects.

**Status:** Proposed plan, implementation not started  
**Primary surface:** Tenant HR/Business Admin web portal  
**Current module home:** `/app/modules/attendance`  
**Design direction:** Preserve the existing DeltCRM charcoal, white and indigo
visual system. Stitch remains a reference, not a source of truth.

## 2. Current-State Findings

The top-level tenant navigation is already moving in the right direction:
`Dashboard`, `Employees`, `Modules`, and `Settings`. Attendance is correctly
inside `Modules`, and route visibility is permission-based.

The problem begins inside Attendance:

- Thirteen feature destinations appear as similarly important cards.
- Daily actions, one-time setup, security investigation and month-end work are
  mixed on the same long page.
- Closely related screens are separate destinations: Shifts/Rosters,
  Offices/Holidays, Exceptions/Regularizations and Reports/Payroll Close.
- There is no persistent Attendance-level navigation after leaving the hub.
- HR must repeatedly return to the module home to discover another screen.
- The global help icon has no contextual behavior.
- Feature cards provide one descriptive sentence, but not usage steps, effects,
  permissions, dependencies or examples.
- Advanced features such as field tracking, biometrics and payroll close can be
  shown with the same weight as the daily register even when rarely used.

No API or feature removal is required. This is primarily an information
architecture, routing shell and contextual-guidance change.

## 3. Navigation Principles

1. Organize by HR job, not by database resource or implementation module.
2. Keep the most frequent daily work one click from the Attendance module.
3. Combine related screens with tabs; preserve the existing route as the tab URL.
4. Keep setup separate from daily operations.
5. Show features only when the user has permission and the tenant has the
   required module/capability.
6. Surface urgent work as counts and queues instead of making HR search for it.
7. Preserve deep links, browser back/forward behavior and bookmarkable URLs.
8. Help must be contextual, keyboard accessible and useful on touch devices.
9. Destructive or payroll-impacting actions must explain impact before execution.
10. The employee mobile app remains driven by tenant runtime capabilities; this
    restructure must not make the web navigation authoritative for mobile policy.

## 4. Proposed Information Architecture

### 4.1 Tenant sidebar

Keep the existing four primary entries:

| Entry | Purpose |
|---|---|
| Dashboard | Cross-module business summary and urgent work |
| Employees | Directory, employee details, organization and imports |
| Modules | Attendance, Leave and future product modules |
| Settings | Company, users/roles, billing and workspace-level settings |

Do not add every Attendance screen back into the tenant sidebar.

### 4.2 Attendance workspace navigation

Once the user enters Attendance, replace the generic `All modules / Attendance /
Leave` strip with a persistent Attendance workspace navigation:

| Navigation item | Primary user question | Route |
|---|---|---|
| Overview | What needs attention today? | `/app/modules/attendance` |
| Today | Who is present, late, absent or incomplete? | `/app/attendance/register` |
| Requests | What needs review or approval? | `/app/attendance/requests` |
| Field | Where are active field teams? | `/app/attendance/field` |
| Reports | What can I export or close for payroll? | `/app/attendance/reports` |
| Setup | How should attendance work for this company? | `/app/attendance/setup` |

Desktop behavior: a compact horizontal sub-navigation below the main header.

Tablet/mobile web behavior: horizontally scrollable tabs with the active item
always scrolled into view. `Setup` opens a grouped index rather than a large
nested hover menu.

### 4.3 Conditional items

- `Field` appears only when `FIELD_TRACKING` is entitled and runtime policy makes
  it relevant to at least one employee, or when an authorized administrator can
  configure the capability.
- `Reports` appears only with report-read/generate or payroll-lock permission.
- `Setup` appears only when the user has at least one Attendance configuration,
  policy, schedule, device or security permission.
- Managers see only their scoped `Today`, `Requests` and `Field` destinations.
- Employees do not receive the HR Attendance workspace in the tenant web portal.
- A Business Admin may see an unavailable capability card inside Setup with the
  commercial reason and next step. HR users should not see purchase controls.

## 5. Screen Structure

### 5.1 Attendance Overview

The module home becomes an operational dashboard, not a directory of every page.

Required sections:

- Date and office/department scope controls.
- Today summary: Present, Absent, Late, Missing checkout and On leave.
- Needs attention queue: pending corrections, pending OD/WFH, unapproved devices,
  high-severity security alerts and stale field sessions.
- Quick actions: Open register, Review requests, Generate report and Add policy,
  filtered by permission.
- Setup health: policy assignment coverage, unpublished roster, missing office
  geofence, device/biometric readiness and mobile capability state.
- Month-end readiness: report status and payroll lock state, shown only to users
  with the corresponding permission.

Each metric links to a pre-filtered destination rather than a generic page.

### 5.2 Today

Use the existing Attendance Register as the primary screen.

Tabs or views:

| View | Purpose |
|---|---|
| Register | Employee-by-employee attendance status |
| Exceptions | Late, missing punch, absence and verification exception filters |

Employee attendance detail remains a child route at
`/app/attendance/register/:employeeId` and includes breadcrumbs back to the
preserved filter/date state.

### 5.3 Requests

Combine the two approval queues into one workspace:

| Tab | Existing source | Preserved route |
|---|---|---|
| OD & WFH | Attendance exceptions | `/app/attendance/exceptions` |
| Corrections | Regularization requests | `/app/attendance/regularizations` |

The canonical entry `/app/attendance/requests` redirects to the first tab the
user can access. Existing URLs remain valid and render inside the shared Requests
shell. Each tab shows a pending count and remembers its filter.

Correction detail remains `/app/attendance/regularizations/:id`. Decision screens
must explain the original evidence, requested change, recomputation effect and
payroll-lock consequence before approval.

### 5.4 Field

Keep live field monitoring and employee route history together:

- Live team status and map.
- Stale/offline/permission-denied states.
- Employee route history as a child view.
- Clear privacy and retention information.
- A visible indication of the tenant policy that enabled tracking.

Hide this workspace when field tracking is unavailable. Do not request or imply
background location for office-only policies.

### 5.5 Reports

Combine reporting and payroll finalization:

| Tab | Existing source | Preserved route |
|---|---|---|
| Reports center | Muster, payroll, late/OT, violations, distance | `/app/attendance/reports` |
| Payroll close | Lock/reopen and immutable history | `/app/attendance/payroll` |

The Payroll Close tab is permission-gated. It must show the completed export it
will lock, the affected period and the consequences for corrections/leave before
the confirmation action.

### 5.6 Setup

Replace six or more equal feature cards with four guided setup groups:

| Setup group | Tabs/features | Existing routes |
|---|---|---|
| Rules & verification | Attendance defaults, employee app behavior, policies | `/app/settings/attendance`, `/app/modules/attendance/capabilities`, `/app/attendance/policies` |
| Work schedule | Shifts, rosters | `/app/attendance/shifts`, `/app/attendance/rosters` |
| Workplaces & calendar | Offices/geofences, holidays | `/app/attendance/offices`, `/app/attendance/holidays` |
| Trust & devices | Employee devices, security feed | `/app/attendance/devices`, `/app/attendance/security` |

Canonical setup landing route: `/app/attendance/setup`.

Setup landing cards show configuration health and the next useful action, for
example `3 policies, 14 employees unassigned` rather than only a description.

## 6. Current-to-Proposed Route Map

| Current route | Proposed location | Migration action |
|---|---|---|
| `/app/modules/attendance` | Attendance Overview | Replace card directory with operational overview |
| `/app/attendance/register` | Today / Register | Keep route |
| `/app/attendance/register/:employeeId` | Today / Employee detail | Keep route and add breadcrumb/filter return |
| `/app/attendance/exceptions` | Requests / OD & WFH | Keep route inside Requests shell |
| `/app/attendance/regularizations` | Requests / Corrections | Keep route inside Requests shell |
| `/app/attendance/regularizations/:id` | Requests / Correction decision | Keep route |
| `/app/attendance/field` | Field / Live | Keep route, entitlement-gate navigation |
| `/app/attendance/field/:employeeId/route` | Field / Route history | Keep route |
| `/app/attendance/reports` | Reports / Reports center | Keep route |
| `/app/attendance/payroll` | Reports / Payroll close | Keep route inside Reports shell |
| `/app/settings/attendance` | Setup / Rules / Defaults | Keep route; change surrounding context to Attendance Setup |
| `/app/modules/attendance/capabilities` | Setup / Rules / App behavior | Keep route |
| `/app/attendance/policies` | Setup / Rules / Policies | Keep route |
| `/app/attendance/shifts` | Setup / Work schedule / Shifts | Keep route |
| `/app/attendance/rosters` | Setup / Work schedule / Rosters | Keep route |
| `/app/attendance/offices` | Setup / Workplaces / Offices | Keep route |
| `/app/attendance/holidays` | Setup / Workplaces / Holidays | Keep route |
| `/app/attendance/devices` | Setup / Trust / Devices | Keep route |
| `/app/attendance/security` | Setup / Trust / Security | Keep route |

New canonical routes do not replace existing URLs immediately. They provide
entry points and redirect to the first permitted child. This avoids broken
bookmarks, notification deep links and test contracts.

## 7. Information (`i`) Help System

### 7.1 Interaction pattern

Create one reusable `FeatureInfo` component.

Desktop:

- Click or keyboard activation opens a popover anchored to the `i` button.
- Escape closes it and focus returns to the trigger.
- Hover may show the one-line summary, but all content must be available by click.

Mobile/tablet:

- The same trigger opens a bottom sheet or centered dialog with a close action.
- No help content may depend on hover.

Accessibility:

- Use a real `button`, not a decorative icon.
- Use `aria-label="About Attendance register"` or the relevant feature name.
- Associate the title and description with the dialog/popover.
- Meet 44x44 touch target, visible focus and contrast requirements.
- Stop propagation when the icon appears inside a clickable card so opening help
  does not navigate.

### 7.2 Required help content

Every feature-level help entry contains:

| Field | Example |
|---|---|
| Name | Attendance corrections |
| Summary | Fix an employee day after a missing or incorrect punch |
| Use when | The employee submitted a regularization request |
| How to use | Open request, compare evidence, enter comment, approve/reject |
| Effect | Recomputes the attendance day unless payroll is locked |
| Access | HR Admin or attendance regularization manager |
| Dependencies | Attendance enabled; unlocked payroll period |
| Related | Attendance register, Payroll close |

### 7.3 Placement rules

Add an `i` action to:

- every Attendance workspace navigation destination;
- every Setup group and feature card;
- every page title;
- complex metrics/statuses such as stale field session, payroll lock, liveness,
  device trust, geofence, roster publication and policy assignment;
- every policy control that changes employee permissions or punch verification;
- destructive, privacy-sensitive or payroll-impacting actions.

Do not place an icon beside obvious controls such as Search, Back, Cancel or a
standard date picker. The goal is complete feature guidance, not visual clutter.

### 7.4 Central help registry

Do not hardcode long help text independently in each screen. Create a typed
registry, for example:

```text
apps/web/src/content/attendance-help.ts
apps/web/src/components/help/feature-info.tsx
apps/web/src/components/help/feature-help-drawer.tsx
```

Suggested type:

```ts
type AttendanceHelpEntry = {
  key: AttendanceHelpKey;
  title: string;
  summary: string;
  useWhen: string;
  steps: readonly string[];
  effect?: string;
  permission?: string;
  dependencies?: readonly string[];
  related?: readonly { label: string; href: string }[];
};
```

The global header help icon opens the entry for the current route using the same
registry. If the route has no exact entry, it opens Attendance Overview help.

### 7.5 Initial help catalog

The first implementation must include entries for:

- Attendance Overview
- Attendance Register
- Employee Attendance Detail
- OD & WFH Requests
- Attendance Corrections
- Field Operations
- Field Route History
- Reports Center
- Payroll Close
- Attendance Defaults
- Employee App Behavior
- Attendance Policies
- Shifts
- Rosters
- Offices and Geofences
- Holidays
- Employee Devices
- Security Feed
- Selfie/Face Verification
- Location Verification
- Background Field Tracking
- Weekly-off Rules
- Payroll Lock

## 8. Permission and Entitlement Model

Navigation visibility must continue to use the server-returned permission set.
Do not duplicate role-name assumptions in UI components.

| Area | Minimum permission examples |
|---|---|
| Today | `attendance.records.read` |
| Requests / OD & WFH | `attendance.exceptions.read` |
| Requests / Corrections | `attendance.regularizations.manage` |
| Field | `attendance.field.live.read` or `attendance.field.routes.read` |
| Reports center | `attendance.reports.read` or `attendance.reports.generate` |
| Payroll close | `attendance.payroll-lock.manage` |
| Setup / Rules | corresponding config/policy read or manage permission |
| Setup / Schedule | shift/roster read or manage permission |
| Setup / Workplaces | office/holiday read or manage permission |
| Setup / Trust | device/security read or manage permission |

The route guard/API remains authoritative. Hidden navigation is not security.
Direct access without permission must still return a consistent forbidden state.

Entitlements and capabilities are separate from permissions:

- Attendance module entitlement decides whether the workspace exists.
- Field Tracking entitlement and tenant runtime policy decide Field visibility.
- Selfie/face capability decides whether biometric controls and mobile prompts
  are relevant.
- Location-only office policies must not show selfie requirements.
- Office-only policies must not show background tracking controls.

## 9. Reusable Components

Implement the restructure with reusable components rather than page-specific
navigation markup:

- `AttendanceWorkspaceNav`
- `AttendanceBreadcrumbs`
- `AttendanceOverview`
- `AttendanceTaskCard`
- `AttendanceSetupIndex`
- `AttendanceSectionTabs`
- `FeatureInfo`
- `FeatureHelpDrawer`
- `SetupHealthBadge`
- `AttentionQueue`
- `PermissionAwareLink`
- `CapabilityGate`

All route metadata should come from one typed attendance navigation definition so
labels, active state, permissions, entitlements, breadcrumbs and help keys do not
drift.

## 10. Implementation Work Packages

### Work Package A - Navigation foundation

- [ ] Create typed Attendance route/navigation metadata.
- [ ] Add Attendance workspace context detection to `TenantShell`.
- [ ] Replace generic module tabs with persistent Attendance navigation.
- [ ] Add canonical `/requests` and `/setup` entry routes.
- [ ] Preserve every existing route and deep link.
- [ ] Add permission and capability filtering tests.

### Work Package B - Contextual help

- [ ] Build accessible `FeatureInfo` popover/dialog behavior.
- [ ] Build the typed Attendance help registry.
- [ ] Make the global header help button route-aware and functional.
- [ ] Add help to all feature cards, page titles and complex controls listed in
  the initial catalog.
- [ ] Add keyboard, focus, Escape, touch and card-click isolation tests.
- [ ] Verify help content never exposes internal-only permission or sensitive
  employee data.

### Work Package C - Operational overview

- [ ] Replace the current 13-card module directory with Attendance Overview.
- [ ] Connect current dashboard/register/request/security/field summary APIs.
- [ ] Add pre-filtered metric links and attention counts.
- [ ] Add setup health and month-end readiness.
- [ ] Define loading, empty, partial-permission and API-error states.

### Work Package D - Group related workflows

- [ ] Add shared Requests shell around exceptions and regularizations.
- [ ] Add shared Reports shell around reports and payroll close.
- [ ] Add Setup index and grouped tabs around existing configuration screens.
- [ ] Preserve URL state for date, filters, active tab and return navigation.
- [ ] Add breadcrumbs to employee, correction and route detail screens.

### Work Package E - Dynamic capability behavior

- [ ] Use tenant runtime/entitlement data for Field and biometric visibility.
- [ ] Verify office-only, field, biometric and attendance-disabled tenant variants.
- [ ] Show Business Admin enablement guidance without exposing purchase controls
  to HR/Manager roles.
- [ ] Keep mobile runtime behavior unchanged and API-authoritative.

### Work Package F - Polish and release

- [ ] Responsive verification at 1440, 1024, 768 and 390 widths.
- [ ] No horizontal overflow except intentional wide attendance tables.
- [ ] Screen-reader labels and logical tab/focus order.
- [ ] Visual regression screenshots for each workspace and help state.
- [ ] Full permission matrix and direct-route denial tests.
- [ ] Update HR user guide and route documentation.

## 11. Test Plan

### Unit/component tests

- Route metadata selects the correct active workspace and breadcrumb.
- Permission filtering never shows an unauthorized entry.
- Entitlement filtering hides Field/biometric features in irrelevant tenants.
- `FeatureInfo` opens by mouse, Enter and Space; Escape restores focus.
- `FeatureInfo` inside a card does not trigger navigation.
- Every declared Attendance feature has a help registry entry.
- Every help registry related link points to a declared route.

### Playwright acceptance

- HR opens Modules > Attendance and sees operational priorities, not 13 equal
  cards.
- HR reaches Register, Requests, Reports and Setup without returning to module
  home.
- Requests tabs preserve filters and correction deep links.
- Reports/Payroll tabs enforce permissions and locked-period messaging.
- Office-only tenant has no Field workspace or background-location guidance.
- Field tenant sees Field and can open route history.
- Location-only tenant does not see selfie/face controls.
- Business Admin and HR Admin receive different billing/commercial guidance.
- Manager receives scoped operations without configuration screens.
- Global help opens the correct content on every Attendance route.
- All feature `i` actions work at desktop and mobile widths.
- Existing notification/deep links still open their original detail route.

### API/regression checks

- No API contract changes are required for the first navigation release.
- Existing Attendance, Sprint 6 dynamic runtime and Sprint 7 full-loop e2e suites
  remain green.
- Any new overview aggregation endpoint must enforce tenant isolation and scope;
  do not make multiple unrestricted client-side requests to simulate authority.
- Existing route guards remain authoritative after visual navigation is hidden.

## 12. Definition of Done

- [ ] HR can explain where to go for daily review, requests, field work, reports
  and setup after seeing only the Attendance navigation.
- [ ] No existing Attendance feature or deep link is lost.
- [ ] No role sees an unauthorized or irrelevant feature entry.
- [ ] Every feature and complex policy has useful accessible `i` guidance.
- [ ] The global help button is contextual and functional.
- [ ] Daily work is available in one click; setup is separated from operations.
- [ ] Requests, reports/payroll and setup pairs are coherently grouped.
- [ ] Desktop, tablet and mobile-web navigation pass accessibility and overflow
  checks.
- [ ] Existing API, web and dynamic mobile-runtime regression suites pass.
- [ ] HR documentation matches the implemented navigation and help content.

## 13. Recommended Implementation Order

1. Navigation metadata and `FeatureInfo` foundation.
2. Persistent Attendance workspace navigation.
3. Requests, Reports and Setup shells using existing screens.
4. Operational Overview with real summary data.
5. Dynamic Field/biometric/permission variants.
6. Full help catalog, visual polish and acceptance testing.

This order improves usability early without rewriting working Attendance feature
screens or changing API contracts prematurely.
