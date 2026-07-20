# Attendance Leave Simplification Implementation Plan

## 1. Purpose

**Status:** Implementation complete; infrastructure-backed acceptance pending  
**Delivery slot:** Sprint 7.5 remediation, before Sprint 8 GA  
**Product decision:** Leave is an included Attendance workflow, not a separate DeltCRM product module.  
**Exit outcome:** HR defines simple tenant-wide leave policies, every active employee receives the applicable balances, employees request leave, HR or the reporting manager decides it, and approved leave updates Attendance.

This plan replaces the earlier decision that treated `LEAVE` as a standalone `COMING_SOON` product. It deliberately reuses the existing Leave implementation and removes conflicting entitlement and navigation behavior.

## 2. Simple MVP Workflow

```text
Attendance enabled for tenant
  -> HR creates one or more active leave policies
  -> DeltCRM gives each active employee a balance for each policy
  -> Employee sees Leave in web/mobile and submits a request
  -> HR or reporting manager approves or rejects
  -> Approved request creates an Attendance leave exception
  -> Attendance shows ON_LEAVE or HALF_DAY
  -> Rejected/cancelled request restores the reserved balance
```

There is no separate Leave purchase, tenant module toggle, department policy assignment, priority resolver, or standalone Leave subscription for the MVP.

## 3. Existing Implementation to Keep

- [x] `LeavePolicy`, `LeaveBalance`, `LeaveBalanceLedger`, and `LeaveRequest` tables.
- [x] Tenant-isolated Leave policy, balance, request, approval, rejection, and cancellation APIs.
- [x] Annual entitlement, carry-forward metadata, active/inactive policy state, and policy version field.
- [x] Working-day calculation using weekly offs, holidays, half days, and employee Attendance context.
- [x] Balance reservation on request and idempotent restoration on rejection/cancellation.
- [x] Reporting-chain approval scope and HR/Admin management permissions.
- [x] `leave.approved` outbox event and idempotent Attendance exception processor.
- [x] HR web screens for policies, balances, requests, and approvals.
- [x] Employee web/mobile screens for balances, requests, application, and cancellation.
- [x] Employee detail Leave summary and request history.

## 4. Explicitly Deferred

The MVP will not add:

- Department-specific or employee-specific Leave policy assignment.
- A second policy precedence engine.
- Automated monthly accrual jobs.
- Automated year-end carry-forward or encashment.
- Sandwich-leave rules, probation rules, comp-off, or complex country rule engines.
- A standalone Leave commercial product or add-on.
- Dedicated Leave analytics beyond balances and request lists.

These can be added later only after a verified customer requirement.

## 5. Product and Entitlement Corrections

### 5.1 Commercial catalog

- [x] Add `ATTENDANCE_LEAVE` to the Attendance feature list as an included core feature.
- [x] Include it automatically in every plan containing Attendance.
- [x] Remove Leave from the platform's “Coming later” product list.
- [x] Mark the legacy `LEAVE` module record `DEPRECATED` and `customerVisible=false`.
- [x] Preserve existing `TenantModule(LEAVE)` rows for migration history, but stop using them for authorization or runtime decisions.
- [x] Remove standalone Leave toggles from tenant entitlement screens.

### 5.2 API authorization

- [x] Change the Leave controller module requirement from `LEAVE` to `ATTENDANCE`.
- [x] Keep the existing permissions:
  - `leave.self`: own balances, requests, and cancellation.
  - `leave.approve`: reporting-line approvals.
  - `leave.manage`: tenant-wide policy, balance, request, and approval management.
- [x] Do not introduce a separate Leave capability guard.
- [ ] Return `ATTENDANCE_MODULE_REQUIRED` only when Attendance itself is unavailable.

### 5.3 Runtime contract

The mobile/web runtime must return:

```json
{
  "modules": {
    "attendance": { "enabled": true }
  },
  "attendance": {
    "leave": {
      "enabled": true,
      "policyCount": 2,
      "canRequest": true
    }
  }
}
```

Rules:

- [x] HR Leave setup is visible whenever Attendance is enabled and the user has `leave.manage`.
- [x] Employee Leave navigation is visible when Attendance is enabled, at least one policy is active, and the user has `leave.self`.
- [x] `canRequest=false` when no active policy exists; inactive employee profiles are rejected by the runtime endpoint.
- [x] Remove runtime dependence on `moduleKeys.has('LEAVE')`.
- [x] Keep a temporary parser fallback for the old `modules.leave.enabled` response during mobile rollout.

## 6. Policy and Balance Rules

### 6.1 Tenant-wide policies

- [x] HR creates a policy with name, leave type, annual entitlement, carry-forward limit, and active state.
- [x] Every policy applies to all active employees in the tenant.
- [x] Creating a policy creates an opening balance and ledger credit for every active employee in one transaction.
- [x] Deactivating a policy blocks new requests but preserves balances, ledger entries, and request history.
- [x] Editing policy details must not change existing employee balances automatically.
- [x] UI wording must say “Edit policy”; it must not claim immutable historical versioning that the current schema does not provide.

### 6.2 Current and future employees

- [x] Extract a shared `provisionEmployeeLeaveBalances(tx, tenantId, employeeId)` service.
- [x] Call it after manual employee creation, successful CSV import, and employee reactivation. Invitation linkage reuses an already-created employee record and lazy repair remains the safety net.
- [x] Keep request-time lazy balance creation as a recovery fallback.
- [x] `GET /leave-balances/me` repairs missing balances before returning data.
- [x] Provisioning is idempotent through the existing tenant/employee/policy uniqueness constraint.

### 6.3 Simple HR balance management

- [x] Add `POST /leave-balances/:id/adjust` for HR/Admin.
- [x] Request fields: `days` (signed decimal) and `reason` (required).
- [x] Reject an adjustment that would produce a negative balance.
- [x] Record every adjustment in `LeaveBalanceLedger` with actor, reason, balance after, and idempotency key.
- [x] Add an “Adjust balance” action to the HR balance screen.
- [x] Do not add bulk accrual or year-end automation in this implementation.

## 7. Request and Approval Rules

- [ ] Employee selects an active policy, date range, optional half-day, and reason.
- [ ] Server calculates chargeable working days; clients only preview the result.
- [ ] Request creation reserves the balance and rejects overlaps or insufficient balance.
- [ ] HR/Admin can decide any tenant request; managers can decide only reporting-line requests.
- [ ] Approval retains the reserved debit and emits `leave.approved`.
- [ ] Rejection or employee cancellation restores the balance once.
- [ ] Terminal requests cannot be decided again, except an idempotent replay of the same decision.
- [ ] Approved Leave creates exactly one Attendance exception and recomputes each affected day.
- [ ] Locked Attendance periods reject new or changed Leave requests affecting locked dates.

## 8. Web Information Architecture

### 8.1 Attendance workspace

Use one operational path:

```text
Modules -> Attendance -> Leave
```

Attendance Leave navigation contains:

- `Overview`: policy readiness, employees on leave, and pending approvals.
- `Requests`: all scoped requests and status filters.
- `Approvals`: pending manager/HR queue.
- `Balances`: employee balances and HR adjustments.
- `Policies`: create, edit, activate, and deactivate tenant-wide policies.

### 8.2 Settings

Use one configuration path:

```text
Settings -> Attendance -> Leave policies
```

- [x] Remove Leave as a separate top-level module card.
- [x] Remove Leave as a separate settings category.
- [x] Keep existing URLs as redirects so bookmarks and notification links continue working.
- [x] Preserve employee detail `Leave` tab for the selected employee's balances and history.
- [x] Use existing components instead of creating duplicate screens.

Canonical routes:

| Purpose | Route |
|---|---|
| Leave overview | `/app/attendance/leave` |
| Requests | `/app/attendance/leave/requests` |
| Approvals | `/app/attendance/leave/approvals` |
| Balances | `/app/attendance/leave/balances` |
| Policies | `/app/attendance/setup/leave` |

## 9. Mobile Behavior

- [x] Show Leave within the employee app only when the runtime says `attendance.leave.enabled=true`.
- [ ] Display policy balances, active/upcoming requests, and request history.
- [ ] Allow apply and cancel using the existing Leave repository.
- [x] Do not request camera, face, location, or field-tracking permissions for Leave.
- [ ] Refresh balances and requests after submit/cancel and after app resume.
- [ ] Show a clear “Leave is not configured by HR” state instead of an API error.
- [ ] Preserve tenant branding and the authenticated session.

## 10. Migration and Compatibility

- [x] Add a forward-only migration for the `ATTENDANCE_LEAVE` catalog capability and legacy module classification.
- [x] Do not delete Leave tables, requests, balances, ledger entries, or legacy tenant-module assignments.
- [x] Update seed data so Attendance tenants receive Leave permissions and a simple sample policy, not a standalone Leave module entitlement.
- [x] Regenerate OpenAPI for the balance-adjustment endpoint.
- [x] Update the platform catalog plan to state that Leave is included in Attendance.
- [ ] Update Sprint 7 documentation to clarify “minimal Leave inside Attendance.”

## 11. Ordered Work Packages

### WP 1 - Correct product classification

- [x] Migration and seed changes.
- [x] Catalog and plan feature display.
- [x] Legacy `LEAVE` module hidden/deprecated.

### WP 2 - Restore API access

- [x] Replace the Leave module guard with Attendance guard.
- [x] Update runtime configuration.
- [x] Export the updated OpenAPI contract.
- [ ] Re-run current Sprint 7 database acceptance when PostgreSQL is reachable.

### WP 3 - Reliable employee balances

- [x] Shared balance provisioner.
- [x] Manual/import/reactivation hooks with invitation-safe lazy repair.
- [x] Lazy repair in employee balance reads.
- [x] HR adjustment endpoint and ledger evidence.

### WP 4 - Consolidate web screens

- [x] Attendance Leave navigation and canonical routes.
- [x] Reuse policies, balances, request, approval, and employee Leave views.
- [x] Redirect legacy routes.
- [x] Remove duplicate standalone Leave entries.

### WP 5 - Align mobile runtime

- [x] Parse the Attendance Leave runtime contract.
- [x] Gate navigation and actions dynamically.
- [x] Reuse existing loading, empty, error, submit, and cancel states.
- [ ] Execute the Flutter resume-refresh acceptance test on an unrestricted runner.

### WP 6 - End-to-end verification

- [ ] Complete API database e2e, web production build, and Flutter execution gates.
- [x] Update this plan with current test totals and evidence.

## 12. Acceptance Tests

### API

- [ ] Attendance-enabled tenant can use Leave without an active legacy `LEAVE` module row.
- [ ] Tenant without Attendance receives `ATTENDANCE_MODULE_REQUIRED`.
- [ ] Creating a policy provisions all active employees exactly once.
- [ ] Creating/importing/reactivating an employee provisions every active policy exactly once.
- [ ] Employee can see balances, request full/half-day Leave, and cancel pending Leave.
- [ ] Manager cannot approve outside the reporting chain.
- [ ] HR can approve/reject and adjust a balance with audit/ledger evidence.
- [ ] Approved Leave produces one Attendance exception and correct `ON_LEAVE`/`HALF_DAY` status.
- [ ] Tenant A cannot read or mutate Tenant B policy, balance, request, or ledger data.

### Web

- [ ] HR completes policy -> balance -> request -> approval from the Attendance workspace.
- [ ] Legacy Leave links redirect to the canonical Attendance Leave screen.
- [ ] Employee detail Leave tab shows real balances and history.
- [ ] No standalone Leave product toggle appears in Platform Modules.
- [ ] Empty, loading, validation, forbidden, and API-error states are usable on desktop and mobile widths.

### Flutter

- [ ] Leave is hidden when no active policy exists.
- [ ] Leave appears when HR creates an active policy without requiring app reinstall/login.
- [ ] Employee can view balances, apply, see status, and cancel.
- [ ] Leave never triggers Attendance camera/location/device permission flows.
- [ ] Session and tenant branding survive restart.

## 13. Definition of Done

- [ ] Leave is presented only as part of Attendance.
- [ ] No valid Leave request returns `MODULE_ACCESS_DENIED` because `LEAVE` is `COMING_SOON`.
- [ ] HR can configure policies and manage balances/requests from one clear workspace.
- [ ] Every active employee receives every active tenant Leave policy.
- [ ] Employee web/mobile behavior follows the server runtime dynamically.
- [ ] Approved Leave changes Attendance correctly and idempotently.
- [ ] Existing data and deep links remain intact.
- [ ] All acceptance and quality gates pass with evidence recorded below.

## 14. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| WP 1 Product classification | Complete | Forward migration, seed, catalog expectation, and hidden legacy module implemented |
| WP 2 API/runtime access | Complete | Leave guard uses Attendance; runtime exposes `attendance.leave`; API build and runtime unit tests pass |
| WP 3 Employee balances | Complete | Shared idempotent provisioner, lifecycle hooks, lazy repair, adjustment API/UI, and ledger evidence implemented |
| WP 4 Web consolidation | Complete | Canonical Attendance Leave routes, internal links, legacy redirects, and duplicate navigation removal implemented |
| WP 5 Mobile alignment | Complete | Attendance capability parser plus legacy fallback and focused Flutter test added |
| WP 6 Verification | In progress | API/web typecheck pass; API build and 6 focused tests pass; OpenAPI exported. DB e2e, web production build, and Flutter execution blocked by sandbox infrastructure |

### Verification evidence (July 19, 2026)

- API typecheck: passed.
- API production build: passed.
- API focused unit tests: 2 suites, 6 tests passed.
- API targeted lint: passed with no warnings or errors.
- Web typecheck: passed.
- Web targeted lint: passed with six pre-existing React hook warnings and no errors.
- OpenAPI export: passed; `/leave-balances/{id}/adjust` is documented.
- `git diff --check`: passed.
- Pending infrastructure verification: apply migration/seed and run API e2e against PostgreSQL on `5433`; execute Flutter tests after SDK cache access is available; rerun Next production build where Turbopack may bind its internal process port.
