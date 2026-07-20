# DeltCRM Attendance HR Portal Guide

## Purpose

The Attendance workspace organizes HR work by task instead of exposing every
configuration screen in the tenant sidebar. The tenant sidebar remains focused
on `Dashboard`, `Employees`, `Modules`, and `Settings`. Open `Modules`, then
`Attendance`, to enter the Attendance workspace.

All screens continue to use their original URLs. Saved links, notification deep
links, browser Back/Forward, and filtered URLs remain valid.

## Workspace navigation

| Entry    | Use it for                                                           | URL                        |
| -------- | -------------------------------------------------------------------- | -------------------------- |
| Overview | Today's status, urgent queues, setup health, and month-end readiness | `/app/modules/attendance`  |
| Today    | Employee-by-employee register and attendance evidence                | `/app/attendance/register` |
| Requests | OD/WFH exceptions and attendance corrections                         | `/app/attendance/requests` |
| Field    | Live field presence and employee route history                       | `/app/attendance/field`    |
| Reports  | Attendance exports and payroll close                                 | `/app/attendance/reports`  |
| Setup    | Rules, schedules, workplaces, devices, and security                  | `/app/attendance/setup`    |

On smaller screens, the workspace navigation scrolls horizontally. This is
intentional; the page itself should not overflow horizontally except for wide
data tables that provide their own scroll area.

## Daily workflow

1. Open **Overview** and choose the operational date, department, or office.
2. Select Present, Absent, Late, Missing checkout, or On leave to open the
   register with the same scope and exact filter.
3. Use **Needs attention** to open pending corrections, OD/WFH records,
   unapproved devices, critical security alerts, or stale field sessions.
4. Use **Requests** to review employee-submitted changes. Compare evidence and
   record an auditable comment before approving or rejecting a correction.
5. Use **Reports** at month end. Generate and validate the payroll export before
   opening Payroll close.

Register, request, device, security, and field filters are stored in the URL.
They can be bookmarked and remain intact when a detail screen returns to its
parent workflow.

## Setup groups

| Group                 | Included screens                                     |
| --------------------- | ---------------------------------------------------- |
| Rules & verification  | Attendance defaults, employee app behavior, policies |
| Work schedule         | Shifts and roster assignments                        |
| Workplaces & calendar | Offices/geofences and holidays                       |
| Trust & devices       | Employee devices and security feed                   |

Roster assignments become effective when saved; the current roster model does
not have a separate draft or publish state. Setup health therefore reports
upcoming roster coverage rather than an unpublished count.

## Role and capability visibility

The web application uses the permissions returned by the API. Role names are
descriptive only and are not used as a client-side security shortcut.

| User           | Typical Attendance visibility                                                                 |
| -------------- | --------------------------------------------------------------------------------------------- |
| Business Admin | Permitted operations and setup; subscription guidance when a capability is not entitled       |
| HR Admin       | Permitted operations and setup without commercial purchase controls                           |
| Manager        | Scoped Today, Requests, and Field areas only when granted                                     |
| Employee       | No HR Attendance workspace; employee attendance remains in the mobile/self-service experience |

The Attendance module entitlement controls whether the workspace exists. Field
Tracking appears only when entitled and enabled for relevant policy behavior, or
through administrator setup guidance. Office-only policies do not expose
background tracking. Location-only policies do not expose selfie requirements.
Direct URLs are still checked by the route guard and API; hiding a navigation
entry is not the security boundary.

## Employee app behavior

The web navigation does not control the employee app. After login, the mobile
app loads the tenant runtime configuration from the API and displays only the
features required by the employee's effective policy. Office-only employees do
not receive field tracking or background-location prompts. Camera, face,
location, and device-trust behavior is requested only when the effective tenant
policy requires it.

## Contextual help

Every Attendance destination and complex control has an information button.
Open it by click, touch, Enter, or Space; press Escape to close it and return
focus to the trigger. The header help button automatically uses the current
Attendance route. Help explains when to use the feature, the safe workflow,
access expectations, dependencies, and employee/payroll/security effects.

## Payroll close safety

Payroll close requires a completed payroll export for the selected period.
Locking a period stops attendance corrections, OD/WFH changes, leave integration,
and other mutations that would change payroll inputs. Reopening requires an
auditable reason and retains immutable history. Do not lock a month until the
period, export checksum, and affected employees have been reviewed.

## Troubleshooting

- **Attendance is unavailable:** the module is not enabled for the workspace.
- **Attendance access denied:** the signed-in user lacks permission for that
  direct route; request the minimum required access from a workspace admin.
- **A summary is unavailable:** the overview keeps permitted data visible and
  labels optional API failures instead of estimating values.
- **Field is hidden:** verify entitlement, runtime capability, effective employee
  policy, and field permissions.
- **A correction cannot be approved:** check whether the payroll period is
  locked and review the server-provided error.
