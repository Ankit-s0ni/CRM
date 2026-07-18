# Sprint 7 Implementation Plan

## HR Operations, Notifications, Reports, Payroll Lock and Leave

**Status:** Complete
**Depends on:** Finalized attendance from Sprint 4 and event delivery from Sprint 2  
**Primary references:** roadmap Phase 5; feature sections 3.4, 3.6, 4.4-4.5, 5 and 6  
**Sprint exit:** HR completes the daily/monthly operational loop: correction or leave request, approval, recompute, notification, report generation and payroll lock.

## 1. Included Scope

- Employee regularization and HR approval workflow
- Manual exceptions completion and leave-generated exceptions
- Event-driven notification templates, preferences, inbox and FCM/email delivery
- Async reports and signed exports
- Payroll month lock and audited reopen
- Minimal leave policy, balances, requests and approval
- H11-H16, M14-M15/M18 and L1-L3

## 2. API Contract

### Regularization
- `GET|POST /regularizations`
- `GET /regularizations/:id`
- `POST /regularizations/:id/approve`
- `POST /regularizations/:id/reject`
- `POST /regularizations/:id/cancel`
- `POST /regularizations/attachments/presign`

Rules:
- [x] Enforce request window, ownership, evidence key, status transitions and unlocked date
- [x] Manager approval is limited to reporting chain; HR sees permitted departments
- [x] Approval appends attributed synthetic events and recomputes through the aggregate
- [x] Replay/duplicate commands are idempotent and preserve first terminal decision

### Notifications
- `GET /notifications`
- `GET /notifications/unread-count`
- `POST /notifications/:id/read`
- `POST /notifications/read-all`
- `GET|PUT /notification-preferences`

### Reports and payroll locks
- `POST /reports/muster`
- `POST /reports/payroll-export`
- `POST /reports/late-ot`
- `POST /reports/violations`
- `POST /reports/field-distance`
- `GET /reports`
- `GET /reports/:id`
- `GET /reports/:id/download`
- `POST /payroll-locks`
- `GET /payroll-locks`
- `POST /payroll-locks/:id/reopen`

### Leave
- `GET|POST /leave-policies`
- `PATCH /leave-policies/:id`
- `GET /leave-balances/me`
- `GET /leave-balances`
- `GET|POST /leave-requests`
- `GET /leave-requests/:id`
- `POST /leave-requests/:id/approve`
- `POST /leave-requests/:id/reject`
- `POST /leave-requests/:id/cancel`

## 3. Notification Engine

- [x] Seed templates by event key, channel and locale
- [x] Renderer validates required variables and escapes channel output
- [x] Dispatcher uses FCM/email ports, retry/backoff and dead-letter handling
- [x] Store delivery attempts, provider result, delivered/bounced state and device ID
- [x] Prune invalid FCM tokens after terminal provider response
- [x] Respect user preferences except mandatory security/transactional notices
- [x] Inbox supports severity, deep link, read state and expiry purge
- [x] No attendance service calls a provider directly; handlers consume outbox events

## 4. Reports and Lock Rules

- [x] Reports run asynchronously against a recorded filter/snapshot contract version
- [x] Exports use private object storage and short-lived signed downloads
- [x] Payroll export includes payable, overtime, late and loss-of-pay fields
- [x] Lock validates month finalization, stores actor/export and stamps covered logs
- [x] Locked dates reject punch, sync, exception, regularization and leave-driven mutations
- [x] Reopen requires reason, permission and immutable audit entry

## 5. Leave Rules

- [x] Calculate working days excluding effective weekly offs and holidays
- [x] Support half-day start/end and overlap validation
- [x] Validate balance and restore on cancellation/rejection where applicable
- [x] Approval emits `LeaveApproved`; subscriber creates attendance exception
- [x] Attendance recompute remains event-driven and transactionally recoverable
- [x] Coverage warnings are advisory; permission rules remain authoritative

## 6. Screens

- [x] H11 regularization queue and SLA aging
- [x] H12 decision detail and recompute preview
- [x] H13 exception management
- [x] H15 reports center and job/download states
- [x] H16 muster and payroll lock/reopen flow
- [x] M14 request correction; M15 request status
- [x] M18 inbox/deep links plus approval/sync/late notices
- [x] L1 balances, L2 apply, L3 approvals/coverage

## 7. Ordered Work Packages

- [x] 7.0 Regularization aggregate, APIs and H11-H13/M14-M15
- [x] 7.1 Notification templates, inbox, dispatcher and M18
- [x] 7.2 Report workers, storage and H15
- [x] 7.3 Payroll lock/reopen and H16
- [x] 7.4 Leave policies/balances/requests and L1-L3
- [x] 7.5 Full HR loop hardening and documentation

## 8. Test Plan

- [x] Regularization approval recomputes correctly and locked-day request fails
- [x] Manager cannot approve outside reporting chain
- [x] Event replay does not send duplicate notification logically
- [x] Preference suppression, locale fallback, retry/backoff and dead-token pruning
- [x] Report snapshot fixtures and payroll contract versioning
- [x] Lock/reopen/relock guard matrix across all mutation paths
- [x] Leave half day, overlaps, working-day calculation and balance restoration/races
- [x] Leave approval creates one exception and recomputes attendance
- [x] Playwright/Flutter integration for request-to-notify-to-lock flow

## 9. Definition of Done

- [x] Full HR daily/monthly loop passes end to end
- [x] Notifications are provider-decoupled and retry-safe
- [x] Reports are reproducible and downloads expire
- [x] Payroll locks guard every mutation route
- [x] Leave integrates only through domain events
- [x] Build, test, RLS, OpenAPI, worker recovery and UI gates pass

## 10. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 7.0 Regularization | Complete | `regularization/`, H11-H13/M14-M15 routes, reporting-chain and aggregate acceptance |
| 7.1 Notifications | Complete | `notifications/`, provider ports, templates, inbox, retry/dead-token acceptance |
| 7.2 Reports | Complete | `reporting/`, five CSV contracts, private signed storage and checksum acceptance |
| 7.3 Payroll lock | Complete | `payroll-lock/`, mutation guard, lock/reopen/relock history acceptance |
| 7.4 Minimal leave | Complete | `leave/`, L1-L3/mobile apply, balance restoration and event-driven exception acceptance |
| 7.5 Full-loop hardening | Complete | API/Web/Flutter suites, OpenAPI generation, responsive UI and Flutter Web build |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 11. Implementation Specification

### 11.1 Module layout and bounded contexts

```text
regularization/  # request aggregate and synthetic attendance commands
notifications/  # templates, preferences, inbox and delivery adapters
reporting/       # immutable report request contracts and workers
payroll-lock/    # month lock/reopen invariants
leave/           # policy, balances, requests and LeaveApproved event
```

No context directly mutates another context's tables. Regularization uses an attendance application port. Leave emits an event consumed into an exception. Notifications consume event contracts. Reporting reads versioned views/snapshots.

### 11.2 Permission matrix

| Resource | Employee | Manager | HR/Admin |
|---|---|---|---|
| Regularization | own create/read/cancel | report read/approve | tenant/department manage |
| Exceptions | own read where safe | report read | `attendance.exceptions.manage` |
| Notifications/preferences | own only | own only | own; templates are platform-managed |
| Reports | none by default | scoped if granted | `attendance.reports.generate/read` |
| Payroll locks | none | none | `attendance.payroll-lock.manage` |
| Leave | own balances/request/cancel | report approve | policy/balance/request manage |

### 11.3 DTO contracts

| DTO | Fields | Validation |
|---|---|---|
| `CreateRegularizationDto` | attendance date/log, requested in/out, reason, attachment key | request window; at least one changed time; chronological; key tenant-prefixed |
| `RegularizationDecisionDto` | decision comment | 1-1000 chars; approver from JWT |
| `NotificationPreferencesDto` | channel/event category toggles | mandatory events cannot be disabled |
| `CreateReportDto` | period/date range, filters, format | report-specific schema; max one year; format CSV/XLSX/PDF as supported |
| `CreatePayrollLockDto` | `period`, `exportId` | `YYYY-MM`; completed matching payroll export required |
| `ReopenPayrollLockDto` | reason | 10-1000 chars |
| `CreateLeavePolicyDto` | name/type/accrual schema | versioned accrual JSON; nonnegative limits |
| `CreateLeaveRequestDto` | policy, dates, half-day flags, reason | valid half-day combination; calculated total server-side |

### 11.4 State machines

- Regularization/leave: `PENDING -> APPROVED|REJECTED|CANCELLED`; only requester cancels pending; terminal states immutable.
- Payroll: `OPEN -> LOCKED -> REOPENED -> LOCKED`; every transition attributed; reopened period cannot hide prior lock history.
- Delivery: `PENDING -> SENT -> DELIVERED|FAILED|BOUNCED`; retries create attempt history rather than overwriting evidence.
- Security/in-app notification read state is independent from delivery status.

### 11.5 Error catalog

| Code | Status | Trigger |
|---|---:|---|
| `REGULARIZATION_WINDOW_EXPIRED` | 422 | Request older than tenant rule |
| `REGULARIZATION_ALREADY_DECIDED` | 409 | Terminal request mutation |
| `REGULARIZATION_NOT_AUTHORIZED` | 403 | Outside manager/department scope |
| `ATTENDANCE_DAY_LOCKED` | 423 | Correction/leave impacts locked date |
| `REPORT_FILTER_INVALID` | 422 | Unsupported period/filter combination |
| `REPORT_NOT_READY` | 202 | Download before completion |
| `REPORT_EXPIRED` | 410 | Export expired |
| `PAYROLL_EXPORT_REQUIRED` | 422 | Lock without valid completed export |
| `PAYROLL_PERIOD_ALREADY_LOCKED` | 409 | Duplicate lock |
| `LEAVE_BALANCE_INSUFFICIENT` | 409 | Insufficient balance |
| `LEAVE_REQUEST_OVERLAP` | 409 | Existing non-rejected overlap |
| `LEAVE_POLICY_NOT_FOUND` | 404 | Missing/foreign policy |

### 11.6 Notification event catalog

Minimum event keys: `attendance.checked_in`, `attendance.marked_late`, `attendance.missed_checkout`, `regularization.submitted`, `regularization.approved`, `regularization.rejected`, `security.violation`, `offline.sync_completed`, `quota.warning`, `billing.invoice_due`, `leave.submitted`, `leave.approved`, `leave.rejected`. Each event has a versioned payload schema, mandatory variables, default channels, deep link and deduplication key.

### 11.7 Report contracts

- Muster rows: employee identity plus day columns using stable P/A/HD/L/H/WO/OD codes and totals.
- Payroll v1 rows: employee code, period, payable days/minutes, overtime, late, loss-of-pay and lock reference.
- Late/OT, violations and field-distance exports use explicit column order and units.
- Store request JSON, contract version, source cutoff/finalization watermark and checksum with export metadata.
- Formula/CSV injection is escaped; signed URL expiry defaults to 15 minutes while export retention is policy-driven.

### 11.8 Migration and database corrections

- [x] Add foreign-key/relationship coverage where v4 IDs are currently scalar-only
- [x] Prevent overlapping pending/approved leave and duplicate regularization per day through transaction locks/index support
- [x] Append-only delivery attempts and payroll-lock history if current tables cannot preserve transitions
- [x] Report metadata adds filter JSON, format, contract version, checksum, failure code and object key
- [x] Notification dedupe key and delivery attempt uniqueness
- [x] Balance updates use row/advisory locks and ledger/audit evidence
- [x] RLS/isolation for all request, balance, notification, report and lock tables

### 11.9 Stitch acceptance

- Use H11-H16, M14-M15/M18 and L1-L3 Stitch screens as interaction/layout references while preserving the approved DeltCRM charcoal/white system and correcting reference inconsistencies.
- Decision/reopen/destructive actions require confirmation and retain typed comments.
- Report progress survives navigation and presents retry/expired states.
- Muster handles wide date grids with sticky identity columns and accessible keyboard scrolling.
- Mobile deep links open the exact request/day context after authentication refresh.
- Golden screenshots cover pending/approved/rejected/cancelled, empty inbox, report progress/failure/expiry and locked/reopened month.

### 11.10 Acceptance month

Use July 2026 with 25 employees and fixtures for two regularizations, OD/WFH, approved/rejected leave including half day, notification retries, all five report types and one payroll lock/reopen/relock. The final payroll export checksum and muster totals are fixed. Post-lock mutation attempts across punch, sync, exception, regularization and leave must all return `ATTENDANCE_DAY_LOCKED`.

## 12. Completion Evidence

- Database: `20260718120000_sprint7_operations_foundation`, `20260718121000_regularization_attribution` and `20260718122000_leave_exception_attribution`; forward migrations add relationships, exclusion/uniqueness controls, append-only histories and tenant RLS.
- API: 42 unit suites / 236 tests passed; Sprint 7 acceptance 3/3 passed, including reporting-chain denial, notification dedupe/dead-token pruning, approved/rejected leave, five reports, and punch/sync/exception/regularization/leave lock guards.
- Contract: OpenAPI and generated TypeScript/Flutter routes regenerated with 214 operations and no generator drift.
- Web: typecheck, ESLint and production build passed; Sprint 7 Playwright 3/3 passed, including a 390px responsive overflow check.
- Flutter: analyzer passed with no issues; 68 tests passed; Web release build passed with runtime API/workspace defines. Native Isar remains the durable mobile queue, while Flutter Web uses an isolated in-memory adapter only for browser testing.
- Provider boundary: FCM and email are HTTP gateway adapters configured through environment variables. Development fallback remains non-delivering; production provider URLs/tokens are deployment configuration, not source-controlled credentials.
- UI decision: Stitch is a reference, not a pixel-parity gate. Delivered screens use reusable Next.js/Flutter components and the approved DeltCRM visual system.
