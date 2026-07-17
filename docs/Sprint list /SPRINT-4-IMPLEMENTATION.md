# Sprint 4 Implementation Plan

## Attendance Core, Calculator and Web Runtime

**Status:** Complete
**Depends on:** Sprint 3 configuration resolvers and Sprint 2 outbox relay
**Primary references:** roadmap Phase 2.2-2.4; feature sections 2.0, 3.0, 3.2, 3.4 and 3.6; `TENANT-DASHBOARD-ROLE-MODEL.md`
**Sprint exit:** Web punches and scheduled finalization produce deterministic daily/monthly attendance, including overnight shifts, holidays, weekly offs, breaks and exceptions. `/app` renders the shared H1 dashboard for Business Admin and HR Admin with permission-gated additions.

## 1. Included Scope

- Attendance domain value objects and `AttendanceDay` aggregate
- Pure calculator and immutable applied policy/shift snapshots
- Web check-in, checkout and break flow
- Today, history, register, employee month and day timeline reads
- Manual attendance exceptions required by calculator precedence
- Tenant-timezone finalization and absentee jobs
- H1 shared Business Admin/HR Admin live board, H9 register and H10 employee detail
- Auth-session hydration of persisted roles/permissions for dashboard and navigation decisions

## 2. API Contract

### Punch commands

- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `POST /attendance/break-start`
- `POST /attendance/break-end`

Command rules:

- [X] Resolve authenticated user to active employee
- [X] Lock attendance day/event stream before validating transition
- [X] Reject double in/out, break without open attendance, nested breaks and locked dates
- [X] Source is `WEB`; capture server time, IP, user agent and request ID
- [X] Append event, recompute log and outbox events in one transaction

### Reads

- `GET /attendance/dashboard`
- `GET /attendance/me/today`
- `GET /attendance/me/history`
- `GET /attendance/register`
- `GET /attendance/employees/:employeeId/month`
- `GET /attendance/register/:employeeId/day`

Read rules:

- [X] Dashboard returns tenant-local date/timezone, six KPI counts, cursor-paginated employee status cards, attention counts and `updatedAt`
- [X] Dashboard derives values from attendance logs/events and active employee scope; never infer or fabricate attendance from configured employees alone
- [X] Enforce self, manager reporting-chain and HR/admin scopes
- [X] Paginate/filter register by date, status, department, office, shift and exception
- [X] Return computed summaries and evidence-safe event timelines
- [X] Do not expose raw forensic fields reserved for security permissions

### Exceptions

- `GET|POST /attendance-exceptions`
- `GET|PATCH|DELETE /attendance-exceptions/:id`
- Types include OD and WFH; leave-generated exceptions arrive in Sprint 7

## 3. Domain Rules

- [X] Implement `GeoPoint`, `TimeWindow`, `WorkMinutes` and date-only/timezone-safe values
- [X] Attribute overnight punches to the shift start date using office timezone, then tenant timezone fallback
- [X] Pair in/out and break events deterministically; flag unpaired streams
- [X] Compute worked, break, late, early, overtime and payable minutes
- [X] Apply precedence: punch, exception, holiday, policy weekly off, absent
- [X] Holiday plus valid punch becomes `ON_DUTY`
- [X] Respect joining/exit dates and roster/default shift fallback
- [X] Snapshot effective policy and shift on finalization
- [X] Recompute only through the aggregate; never hand-edit denormalized log totals
- [X] Locked payroll dates reject event/exception changes

## 4. Jobs and Events

- [X] `finalizeDay` runs per tenant timezone and is idempotent
- [X] `absenteeSweep` uses tenant grace/alert time and emits events, not direct notifications
- [X] Monthly partition creation runs ahead of boundary
- [X] Events include check-in/out, break, day finalized, late marked and absentee detected
- [X] Job retries restore tenant context and use stable idempotency keys

## 5. Web Implementation

- [X] Web self-service punch card with server-confirmed state
- [X] Replace the `/app` employee redirect with H1 as the canonical completed-onboarding landing page
- [X] H1 shared Business Admin/HR Admin live board using initial polling/event adapter; field map remains Sprint 6
- [X] Hydrate roles and permissions from `/auth/me`; use permissions for widgets, actions and deep links
- [X] Business Admin additions: employee quota, setup/configuration health, users/roles attention and enabled modules
- [X] HR Admin receives the shared board without billing; Sprint 8 adds billing cards only for billing-read permissions
- [X] H9 attendance register with filters, status/lock/verification indicators
- [X] H10 month calendar, totals and selected-day timeline
- [X] Exception create/edit flow with overlap warnings
- [X] Permission-scoped navigation and evidence redaction

## 6. Ordered Work Packages

### 4.0 Domain kernel

- [X] Value objects, date attribution, event pairing and aggregate invariants

### 4.1 Calculator

- [X] Pure calculator plus 60+ table-driven cases

### 4.2 Punch lifecycle

- [X] Commands, locks, transactions, events and safe errors

### 4.3 Reads and exceptions

- [X] Today/history/register/month/day and exception CRUD

### 4.4 Finalization

- [X] Timezone jobs, absentee sweep, partitions and idempotency

### 4.5 Web and hardening

- [X] Shared role-aware H1/H9/H10, auth permission hydration, OpenAPI, performance and isolation

## 7. Test Matrix

- [X] Grace bounds, half day, minimum work and overtime
- [X] Multiple pairs, paid/unpaid breaks and missing checkout
- [X] Overnight events on both calendar dates and timezone boundaries
- [X] Holiday punch, weekly-off override, leave-ready exception and no-roster fallback
- [X] Mid-month join/exit and policy/shift changes without historical drift
- [X] Concurrent punch serialization and duplicate request idempotency
- [X] Finalization retry and outbox atomicity
- [X] Self/manager/HR authorization and tenant A/B isolation
- [X] Business Admin/HR Admin dashboard widget matrix and proof that HR causes no owner-only requests; custom roles remain part of Sprint 4 hardening
- [X] Dashboard KPI denominator includes only active, in-scope employees for the tenant-local date
- [X] Playwright web punch to H9/H10 visibility

## 8. Definition of Done

- [X] Calculator golden matrix passes with no database dependency
- [X] Every event mutation recomputes atomically and emits outbox records
- [X] Finalized snapshots remain stable after configuration edits
- [X] Concurrent commands cannot create invalid event streams
- [X] `/app` renders H1 for completed onboarding instead of redirecting to Employees
- [X] H1/H9/H10 use real APIs and permission-safe evidence
- [X] Business Admin and HR Admin share one dashboard implementation; additions are permission-gated
- [X] Build, lint, test, RLS, OpenAPI and performance gates pass

## 9. Progress Tracker

| Work package             | Status   | Evidence                                                                                                                                                                                                                             |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.0 Domain kernel        | Complete | Value objects, aggregate, date attribution and deterministic event pairing are covered by the 158-test API unit suite on July 17, 2026.                                                                                              |
| 4.1 Calculator           | Complete | 86 calculator cases plus the versioned July 2026 golden fixture pass without a database dependency.                                                                                                                                  |
| 4.2 Punch lifecycle      | Complete | Real PostgreSQL acceptance proves atomic WEB check-in/break/checkout, request replay, concurrent conflict serialization, safe evidence, audit and outbox writes.                                                                     |
| 4.3 Reads and exceptions | Complete | Today/history/register/month/day and full OD/WFH CRUD pass for self, manager, HR, Business Admin and custom read-only roles with tenant A/B isolation and payroll locks.                                                             |
| 4.4 Finalization         | Complete | Finalization and absentee retries are idempotent; job state, future November/December partitions and fail-closed RLS/append-only evidence are verified against PostgreSQL.                                                           |
| 4.5 Web and hardening    | Complete | H1/H9/H10/H13 are API-connected and permission-scoped; 9 Playwright tests pass at 2560/1440/1024/390 px with archived Stitch comparisons, state coverage and stale-data warning. API/web lint, typecheck and production builds pass. |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 10. Implementation Specification

### 10.1 Module layout and transaction boundary

```text
attendance/
├── domain/
│   ├── attendance-day.aggregate.ts
│   ├── attendance-calculator.ts
│   ├── date-attributor.ts
│   └── value-objects/
├── application/
│   ├── commands/ queries/ jobs/ ports/
├── infrastructure/
│   ├── prisma-attendance.repository.ts
│   └── bullmq-attendance.scheduler.ts
└── presentation/
    ├── attendance.controller.ts
    └── dto/
```

One command transaction locks/creates `AttendanceLog`, reads ordered events and effective config, validates the aggregate, appends the event, recomputes the log and appends outbox/audit records. Provider/network calls must occur before the database lock or through an idempotent orchestration step.

### 10.2 Permissions

| Route group                        | Permission/scope                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `/attendance/dashboard`          | `attendance.records.read`; employee rows obey manager/reporting scope when that scope is added |
| `/attendance/me/*` and web punch | authenticated employee self scope                                                                |
| Register/month/day reads           | `attendance.records.read`, manager ABAC when restricted                                        |
| Exception read                     | `attendance.exceptions.read`                                                                   |
| Exception mutation                 | `attendance.exceptions.manage`                                                                 |
| Finalization/recompute jobs        | internal worker identity only                                                                    |

### 10.3 DTO and response contracts

| DTO/query                       | Fields and limits                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `AttendanceDashboardQueryDto` | optional tenant-local ISO date, department UUID, repeatable status, search <=100, cursor, limit <=100 |
| `WebPunchDto`                 | optional`requestId`; no client event time/location; server observes IP/UA                           |
| `AttendanceHistoryQueryDto`   | `month=YYYY-MM` or date range <= 366 days                                                           |
| `AttendanceRegisterQueryDto`  | ISO date range <= 93 days, employee/department/office/status filters, page 1+, limit <=100            |
| `CreateExceptionDto`          | employee, enum type, start/end ISO dates, reason <=500                                                |
| `UpdateExceptionDto`          | reason/type/date fields; terminal/locked checks rerun                                                 |

Today response includes resolved shift, policy summary, location eligibility, open action, ordered timeline and live work/break totals. Register rows include status, first/last punch, work/late/OT/break minutes, shift, lock and safe verification summary. Day detail includes event source/offline/time-suspect flags but excludes raw IP, face score and integrity payload.

### 10.4 Calculator specification

- Input is immutable: employee dates/work type, attendance date, effective shift/policy snapshots, holiday/weekly-off/exception and ordered events.
- Normalize events by `(eventTime, createdAt, id)`; duplicate semantic transitions are invalid rather than silently discarded.
- Work minutes are sums of closed check-in/out intervals minus unpaid closed breaks; paid breaks remain work according to snapshot rules.
- Open logs remain `PRESENT_OPEN`; finalization decides `PRESENT`/`HALF_DAY` after threshold and precedence evaluation.
- Late/early values compare attributed event times to shift bounds; overtime begins only after configured work threshold.
- No floating local dates: date-only and timezone conversion use a single approved date library and DST tests.

### 10.5 Error catalog

| Code                             | Status | Trigger                         |
| -------------------------------- | -----: | ------------------------------- |
| `EMPLOYEE_PROFILE_REQUIRED`    |    403 | User has no active employee     |
| `ATTENDANCE_ALREADY_OPEN`      |    409 | Check-in while open             |
| `ATTENDANCE_NOT_OPEN`          |    409 | Checkout/break without open day |
| `BREAK_ALREADY_OPEN`           |    409 | Nested break start              |
| `BREAK_NOT_OPEN`               |    409 | Break end without start         |
| `ATTENDANCE_DAY_LOCKED`        |    423 | Payroll-locked date             |
| `PUNCH_OUTSIDE_ALLOWED_WINDOW` |    422 | Policy/shift window violation   |
| `ATTENDANCE_EVENT_CONFLICT`    |    409 | Concurrent invalid transition   |
| `EXCEPTION_OVERLAP`            |    409 | Overlapping employee exception  |
| `ATTENDANCE_NOT_FOUND`         |    404 | Missing/foreign record          |

### 10.6 Migration and database rules

- [X] Preserve unique tenant/employee/date log and tenant/employee/client UUID event constraints
- [X] Add indexes supporting tenant/date/status register and employee/date timelines
- [X] Attendance events become application-append-only; app role cannot update/delete
- [X] Calculator-owned totals cannot be mutated through public repositories/controllers
- [X] Partition management is verified for event/log dates at month boundaries
- [X] Job idempotency state prevents duplicate finalization and absentee events

### 10.7 Stitch acceptance

- H1 uses Stitch screen `5291fecb1e7e42bd8d4a59d9c55d0d0d` as the shared Business Admin/HR Admin composition; H9 and H10 use their exact Stitch compositions and assets, integrated into the Sprint 3 tenant shell.
- Business-only additions must extend H1 without changing the operational KPI/grid/Needs Attention hierarchy; HR snapshots contain no billing cards.
- Web punch UI is added only where Stitch inventory permits; it must not alter H1/H9/H10 hierarchy.
- Live status transitions update without full-page reload and remain keyboard/screen-reader accessible.
- Timeline icons visibly distinguish WEB, MOBILE, OFFLINE and REGULARIZED sources.
- Screenshot tests cover 2560 Stitch reference, 1440/1024/mobile widths, Business Admin and HR Admin variants, and populated/empty/loading/error/403/stale states.

### 10.8 Golden acceptance calendar

Create a fixed July 2026 tenant fixture covering: regular day, grace boundary, half day, overtime, paid/unpaid breaks, overnight shift, office holiday with punch, weekly-off override, OD/WFH exception, no roster fallback, joining/exit boundary and missing checkout. Expected status/minutes/snapshot JSON is versioned as a golden fixture. Any calculator change must update it through explicit review, never snapshot auto-acceptance.

Implemented at `apps/api/src/modules/attendance/domain/fixtures/july-2026-golden.json`; its explicit-result test passes without database access.

## 11. Completion Evidence

- Migration `20260717130000_sprint4_attendance_runtime` applies after forward recovery from the unsupported local `uuidv7()` default; Prisma reports all 20 migrations current on seeded `hrms_dev`.
- `docs/openapi.json` is regenerated and contains the 12 Sprint 4 attendance runtime/exception path groups.
- API unit gate: 25 suites, 158 tests passed. Database gate: Sprint 4 runtime, dashboard and generic RLS suites total 16 tests passed.
- A 500-row attendance fixture returns its capped 100-row page in 46-49 ms, below the 1.5 second interactive budget.
- Web gate: 9 Sprint 4 Playwright tests pass, including H9/H10/H13 at 2560, 1440, 1024 and 390 px, populated/loading/empty/error/stale states, overlap validation and punch transitions.
- Archived Stitch sources and screenshots live under `docs/stitch_raw/sprint-4` and `apps/web/public/stitch/sprint-4`.
- API and web typecheck/build pass; API lint passes and web lint has five pre-existing font/image optimization warnings with zero errors.
