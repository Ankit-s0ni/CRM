# Sprint 4 Implementation Plan

## Attendance Core, Calculator and Web Runtime

**Status:** Not started  
**Depends on:** Sprint 3 configuration resolvers and Sprint 2 outbox relay  
**Primary references:** roadmap Phase 2.2-2.4; feature sections 3.2, 3.4 and 3.6  
**Sprint exit:** Web punches and scheduled finalization produce deterministic daily/monthly attendance, including overnight shifts, holidays, weekly offs, breaks and exceptions.

## 1. Included Scope

- Attendance domain value objects and `AttendanceDay` aggregate
- Pure calculator and immutable applied policy/shift snapshots
- Web check-in, checkout and break flow
- Today, history, register, employee month and day timeline reads
- Manual attendance exceptions required by calculator precedence
- Tenant-timezone finalization and absentee jobs
- H1 basic live board, H9 register and H10 employee detail

## 2. API Contract

### Punch commands
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `POST /attendance/break-start`
- `POST /attendance/break-end`

Command rules:
- [ ] Resolve authenticated user to active employee
- [ ] Lock attendance day/event stream before validating transition
- [ ] Reject double in/out, break without open attendance, nested breaks and locked dates
- [ ] Source is `WEB`; capture server time, IP, user agent and request ID
- [ ] Append event, recompute log and outbox events in one transaction

### Reads
- `GET /attendance/me/today`
- `GET /attendance/me/history`
- `GET /attendance/register`
- `GET /attendance/employees/:employeeId/month`
- `GET /attendance/register/:employeeId/day`

Read rules:
- [ ] Enforce self, manager reporting-chain and HR/admin scopes
- [ ] Paginate/filter register by date, status, department, office, shift and exception
- [ ] Return computed summaries and evidence-safe event timelines
- [ ] Do not expose raw forensic fields reserved for security permissions

### Exceptions
- `GET|POST /attendance-exceptions`
- `GET|PATCH|DELETE /attendance-exceptions/:id`
- Types include OD and WFH; leave-generated exceptions arrive in Sprint 7

## 3. Domain Rules

- [ ] Implement `GeoPoint`, `TimeWindow`, `WorkMinutes` and date-only/timezone-safe values
- [ ] Attribute overnight punches to the shift start date using office timezone, then tenant timezone fallback
- [ ] Pair in/out and break events deterministically; flag unpaired streams
- [ ] Compute worked, break, late, early, overtime and payable minutes
- [ ] Apply precedence: punch, exception, holiday, policy weekly off, absent
- [ ] Holiday plus valid punch becomes `ON_DUTY`
- [ ] Respect joining/exit dates and roster/default shift fallback
- [ ] Snapshot effective policy and shift on finalization
- [ ] Recompute only through the aggregate; never hand-edit denormalized log totals
- [ ] Locked payroll dates reject event/exception changes

## 4. Jobs and Events

- [ ] `finalizeDay` runs per tenant timezone and is idempotent
- [ ] `absenteeSweep` uses tenant grace/alert time and emits events, not direct notifications
- [ ] Monthly partition creation runs ahead of boundary
- [ ] Events include check-in/out, break, day finalized, late marked and absentee detected
- [ ] Job retries restore tenant context and use stable idempotency keys

## 5. Web Implementation

- [ ] Web self-service punch card with server-confirmed state
- [ ] H1 live board using initial polling/event adapter; field map remains Sprint 6
- [ ] H9 attendance register with filters, status/lock/verification indicators
- [ ] H10 month calendar, totals and selected-day timeline
- [ ] Exception create/edit flow with overlap warnings
- [ ] Permission-scoped navigation and evidence redaction

## 6. Ordered Work Packages

### 4.0 Domain kernel
- [ ] Value objects, date attribution, event pairing and aggregate invariants

### 4.1 Calculator
- [ ] Pure calculator plus 60+ table-driven cases

### 4.2 Punch lifecycle
- [ ] Commands, locks, transactions, events and safe errors

### 4.3 Reads and exceptions
- [ ] Today/history/register/month/day and exception CRUD

### 4.4 Finalization
- [ ] Timezone jobs, absentee sweep, partitions and idempotency

### 4.5 Web and hardening
- [ ] H1/H9/H10, OpenAPI, performance and isolation

## 7. Test Matrix

- [ ] Grace bounds, half day, minimum work and overtime
- [ ] Multiple pairs, paid/unpaid breaks and missing checkout
- [ ] Overnight events on both calendar dates and timezone boundaries
- [ ] Holiday punch, weekly-off override, leave-ready exception and no-roster fallback
- [ ] Mid-month join/exit and policy/shift changes without historical drift
- [ ] Concurrent punch serialization and duplicate request idempotency
- [ ] Finalization retry and outbox atomicity
- [ ] Self/manager/HR authorization and tenant A/B isolation
- [ ] Playwright web punch to H9/H10 visibility

## 8. Definition of Done

- [ ] Calculator golden matrix passes with no database dependency
- [ ] Every event mutation recomputes atomically and emits outbox records
- [ ] Finalized snapshots remain stable after configuration edits
- [ ] Concurrent commands cannot create invalid event streams
- [ ] H1/H9/H10 use real APIs and permission-safe evidence
- [ ] Build, lint, test, RLS, OpenAPI and performance gates pass

## 9. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 4.0 Domain kernel | Not started | |
| 4.1 Calculator | Not started | |
| 4.2 Punch lifecycle | Not started | |
| 4.3 Reads and exceptions | Not started | |
| 4.4 Finalization | Not started | |
| 4.5 Web and hardening | Not started | |

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

| Route group | Permission/scope |
|---|---|
| `/attendance/me/*` and web punch | authenticated employee self scope |
| Register/month/day reads | `attendance.records.read`, manager ABAC when restricted |
| Exception read | `attendance.exceptions.read` |
| Exception mutation | `attendance.exceptions.manage` |
| Finalization/recompute jobs | internal worker identity only |

### 10.3 DTO and response contracts

| DTO/query | Fields and limits |
|---|---|
| `WebPunchDto` | optional `requestId`; no client event time/location; server observes IP/UA |
| `AttendanceHistoryQueryDto` | `month=YYYY-MM` or date range <= 366 days |
| `AttendanceRegisterQueryDto` | ISO date range <= 93 days, employee/department/office/status filters, page 1+, limit <=100 |
| `CreateExceptionDto` | employee, enum type, start/end ISO dates, reason <=500 |
| `UpdateExceptionDto` | reason/type/date fields; terminal/locked checks rerun |

Today response includes resolved shift, policy summary, location eligibility, open action, ordered timeline and live work/break totals. Register rows include status, first/last punch, work/late/OT/break minutes, shift, lock and safe verification summary. Day detail includes event source/offline/time-suspect flags but excludes raw IP, face score and integrity payload.

### 10.4 Calculator specification

- Input is immutable: employee dates/work type, attendance date, effective shift/policy snapshots, holiday/weekly-off/exception and ordered events.
- Normalize events by `(eventTime, createdAt, id)`; duplicate semantic transitions are invalid rather than silently discarded.
- Work minutes are sums of closed check-in/out intervals minus unpaid closed breaks; paid breaks remain work according to snapshot rules.
- Open logs remain `PRESENT_OPEN`; finalization decides `PRESENT`/`HALF_DAY` after threshold and precedence evaluation.
- Late/early values compare attributed event times to shift bounds; overtime begins only after configured work threshold.
- No floating local dates: date-only and timezone conversion use a single approved date library and DST tests.

### 10.5 Error catalog

| Code | Status | Trigger |
|---|---:|---|
| `EMPLOYEE_PROFILE_REQUIRED` | 403 | User has no active employee |
| `ATTENDANCE_ALREADY_OPEN` | 409 | Check-in while open |
| `ATTENDANCE_NOT_OPEN` | 409 | Checkout/break without open day |
| `BREAK_ALREADY_OPEN` | 409 | Nested break start |
| `BREAK_NOT_OPEN` | 409 | Break end without start |
| `ATTENDANCE_DAY_LOCKED` | 423 | Payroll-locked date |
| `PUNCH_OUTSIDE_ALLOWED_WINDOW` | 422 | Policy/shift window violation |
| `ATTENDANCE_EVENT_CONFLICT` | 409 | Concurrent invalid transition |
| `EXCEPTION_OVERLAP` | 409 | Overlapping employee exception |
| `ATTENDANCE_NOT_FOUND` | 404 | Missing/foreign record |

### 10.6 Migration and database rules

- [ ] Preserve unique tenant/employee/date log and tenant/employee/client UUID event constraints
- [ ] Add indexes supporting tenant/date/status register and employee/date timelines
- [ ] Attendance events become application-append-only; app role cannot update/delete
- [ ] Calculator-owned totals cannot be mutated through public repositories/controllers
- [ ] Partition management is verified for event/log dates at month boundaries
- [ ] Job idempotency state prevents duplicate finalization and absentee events

### 10.7 Stitch acceptance

- H1, H9 and H10 use the exact Stitch visual compositions and assets, integrated into the Sprint 3 tenant shell.
- Web punch UI is added only where Stitch inventory permits; it must not alter H1/H9/H10 hierarchy.
- Live status transitions update without full-page reload and remain keyboard/screen-reader accessible.
- Timeline icons visibly distinguish WEB, MOBILE, OFFLINE and REGULARIZED sources.
- Screenshot tests cover 1440/1024 widths, populated/empty/loading/error/403/locked states.

### 10.8 Golden acceptance calendar

Create a fixed July 2026 tenant fixture covering: regular day, grace boundary, half day, overtime, paid/unpaid breaks, overnight shift, office holiday with punch, weekly-off override, OD/WFH exception, no roster fallback, joining/exit boundary and missing checkout. Expected status/minutes/snapshot JSON is versioned as a golden fixture. Any calculator change must update it through explicit review, never snapshot auto-acceptance.
