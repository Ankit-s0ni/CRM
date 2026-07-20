# DeltCRM Tenant HR Portal User Guide

## Architecture diagrams

- [Complete HR and employee Attendance user flow](files/attendance-user-flow-v1.puml)
- [HR configuration to employee punch sequence](files/attendance-sequence-v1.puml)

The PlantUML sources cover setup, policy precedence, employee runtime bootstrap,
location-only attendance, optional device/biometric/field branches, correction
handling, reporting, and payroll close.

## Portal structure

DeltCRM groups work into five permanent areas:

- **Dashboard** shows today’s workforce and authorized queues needing action.
- **Employees** contains the directory, organization, imports, and the complete employee workspace.
- **Modules** contains operational work for Attendance, Leave, and future entitled tools.
- **Reports** generates and stores module exports.
- **Settings** controls the company, organization, access, modules, policies, notifications, billing, and security behavior.

The navigation only shows areas allowed by both the tenant subscription and the signed-in user’s permissions. Direct API authorization remains authoritative.

## Recommended first-time setup

1. Open **Settings > Company** and confirm company identity, logo, timezone, locale, and working week.
2. Open **Settings > Organization** and create departments and designations.
3. Open **Settings > Users & roles** and invite HR users with least-privilege roles.
4. Open **Settings > Modules** and confirm which tools are entitled.
5. For Attendance, configure offices, a tenant-default policy, shifts, rosters, and holidays.
6. For Leave, create active policies and confirm opening balances.
7. Create or import employees, then review readiness from each employee workspace.
8. Test one employee mobile flow before rolling the configuration out broadly.

## Dashboard workflow

Use Dashboard at the start of an HR or manager work session.

- Workforce and Attendance metrics open filtered employee/register views.
- Pending regularizations open the pending correction queue.
- Security alerts open the unresolved security feed.
- Leave approvals open pending Leave requests.
- Device requests open registrations awaiting approval.
- Setup status links to the owning configuration area.

Users only see metrics for data and actions permitted by their role.

## Employee lifecycle

### Add an employee

1. Open **Employees > Directory > Add employee**.
2. Enter employment identity, department, designation, manager, work type, and joining date.
3. Open the new employee workspace and review **Employee readiness**.
4. Add office, shift/roster, and effective policy assignments as required.
5. Link or invite a user account only when mobile or web self-service is required.
6. Approve the registered device and verify biometric readiness only when the effective policy requires them.

### Manage an existing employee

The employee workspace contains:

- **Overview:** employment details, account state, and readiness.
- **Assignments:** office, shift, roster, and resolved Attendance policy.
- **Attendance:** recent calculated days and full register deep link.
- **Leave:** balances and recent requests.
- **Account access:** linked user and roles.
- **Devices & biometrics:** device approval/replacement and biometric state.
- **History:** employment events and administrative audit activity.

### Transfer, exit, and reactivate

- Update department, designation, manager, or work type from employee management; DeltCRM records lifecycle events.
- Termination requires an effective exit date and preserves historical Attendance, Leave, device, and audit evidence.
- Reactivation is quota-checked and records a new lifecycle event.

## Attendance policies

### Assignment precedence

DeltCRM resolves exactly one effective Attendance policy using this order:

1. Employee assignment.
2. Department assignment.
3. Tenant-default assignment.

Start with one tenant default. Add department rules only when a team genuinely behaves differently. Use direct employee overrides for approved exceptions.

### Common policy patterns

**Office location only**

- Location verification: Office geofence.
- Selfie: Disabled.
- Field tracking: Disabled.
- Assign an office to every affected employee.

**Office with selfie and trusted device**

- Location verification: Office geofence.
- Selfie: Required.
- Registered device: Required.
- Employees need office assignment, active biometric consent/enrollment, and an approved device.

**Field workforce**

- Location verification: Field GPS.
- Field tracking: Enabled.
- Hybrid tracking: Enable only if hybrid workers should also be tracked.
- The subscription and mobile background-location permission must support field tracking.

**Low-verification workflow**

- Location: None.
- Selfie: Disabled.
- Registered device: Optional.
- Use only after accepting the lower evidence and security level.

The policy editor previews employee-app behavior and warns about dependencies before saving.

## Shifts, rosters, weekly offs, and holidays

- A default shift is the fallback schedule for an employee.
- A dated roster overrides the default shift for that date.
- Tenant weekly offs provide the baseline; policies may override them.
- Holidays may be tenant-wide or office-specific.
- Gulf workweeks are supported through configurable Friday, Saturday, and Sunday patterns rather than a hard-coded weekend.

Configure these before relying on absence, lateness, overtime, or payroll calculations.

## Attendance daily operations

1. Open **Modules > Attendance > Today**.
2. Select date, department, office, and status filters.
3. Open an employee day to inspect punches and evidence.
4. Review exceptions and correction requests under **Requests**.
5. Approve or reject with a clear reason.
6. Review security/device queues before changing trusted evidence.
7. Generate reports and close payroll only after operational queues are resolved.

## Leave policies and approvals

### Configure a policy

1. Open **Settings > Leave** or **Modules > Leave > Policies and configuration**.
2. Create a policy with leave type, annual entitlement, and carry-forward limit.
3. DeltCRM creates opening balances for active employees.
4. Editing creates the next policy configuration version.
5. Deactivate a policy to prevent new requests while preserving balances, ledger entries, and history.

### Approve a request

1. Open the Dashboard Leave queue or **Modules > Leave > Approval queue**.
2. Verify employee, dates, entitlement, reason, and reporting scope.
3. Approve or reject with a meaningful comment.
4. Approval updates the balance ledger and Attendance integration.

## Devices and biometrics

- A new mobile registration remains pending until authorized HR approves it.
- Blocking stops trusted Attendance from that device and requires an auditable reason.
- Replacement moves trust to a new registration without deleting historical evidence.
- Biometric consent and enrollment are separate states.
- Reset biometric enrollment only with an authorized reason; the employee must enroll again.
- Do not enable selfie enforcement for employees who cannot complete consent and enrollment.

## Reports and payroll close

1. Open **Reports**.
2. Choose Muster, Payroll, Late/OT, Violations, or Field Distance.
3. Select the period and generate the export.
4. Wait for the asynchronous job to complete.
5. Download before the private signed link expires.
6. For payroll, lock the month against the completed immutable export.
7. Reopen only with an auditable business reason.

## Roles

- **Business Admin:** complete tenant operation, modules, subscription, billing, and access.
- **HR Admin:** employee and module operation/configuration without billing by default.
- **Manager:** reporting-line employees, team Attendance, Leave approvals, and permitted reports.
- **Employee:** self profile, self Attendance, Leave, notifications, devices, and mobile runtime behavior.

Custom roles should follow least privilege. If a user cannot see a page, review both module entitlement and role permissions.

## Troubleshooting

- **A module is missing:** verify subscription entitlement, tenant module state, and user permission.
- **An employee cannot punch:** review effective policy, office, shift/roster, device approval, consent/enrollment, and runtime configuration.
- **An employee is marked absent incorrectly:** verify timezone, weekly off, holiday, shift, roster, approved Leave, and exceptions.
- **A report cannot download:** confirm job completion and link expiry, then request a fresh signed link.
- **A direct route is forbidden:** the API permission is authoritative; assign the required role rather than bypassing the guard.
- **A workspace is unavailable:** contact the Business Admin or platform support for suspension, billing, or subdomain status.
