# Sprint 6 Implementation Plan

## Field Tracking, Offline Sync and Live Monitoring

**Status:** Not started  
**Depends on:** Sprint 5 trusted mobile identity and Sprint 4 aggregate  
**Primary references:** roadmap Phase 4; feature sections 3.3 and 4.3  
**Sprint exit:** A field employee can work through intermittent connectivity with exactly-once punch replay; HR sees live/stale location and deterministic daily route summaries with tracking gaps.

## 1. Included Scope

- Field tracking session lifecycle
- Batched mobile location ingestion with queue-backed bulk writes
- Offline punch queue and idempotent replay
- Clock-tamper/time-suspect handling and stale-sync alerts
- Redis presence model and SSE live updates
- Route summarization, stops, distance and gap detection
- H2/H3 live map/route playback and M16/M17 mobile flows

## 2. API Contract

### Field sessions and pings
- `POST /field-sessions/start`
- `POST /field-sessions/:id/stop`
- `GET /field-sessions/me/active`
- `POST /field-pings/batch`
- `GET /field/employees/live`
- `GET /field/employees/:employeeId/routes/:date`
- `GET /field/stream` using authenticated SSE

### Offline attendance
- `POST /attendance/sync`
- `GET /attendance/sync/:clientEventUuid`

Sync response classifies each item as accepted, duplicate, retryable rejection or permanent rejection and includes a regularization hint where appropriate.

## 3. Field Session Rules

- [ ] Only active field-enabled employees/devices can start sessions
- [ ] One active session per employee/device; start is idempotent
- [ ] Stop records end reason: checkout, manual, battery, stale or administrator
- [ ] Checkout auto-stops the active session through a domain-event handler
- [ ] Stale-session job closes abandoned sessions deterministically
- [ ] Ping validation covers coordinates, accuracy, speed, battery, mock flag, captured time and monotonic ordering
- [ ] Per-tenant/device rate limits return coded retry guidance

## 4. Offline Sync Rules

- [ ] `clientEventUuid` is globally unique for the tenant event stream
- [ ] Duplicate delivery returns original outcome without appending another event
- [ ] Validate device binding, integrity evidence age and maximum offline window
- [ ] Compare client/server clocks and mark `timeSuspect`; severe tamper rejects and alerts
- [ ] Replay calls the same verification and attendance aggregate paths as online punches
- [ ] Events are processed in client order under an attendance-day lock
- [ ] Partial batches preserve per-item outcomes and safe retry semantics

## 5. Ingestion and Route Processing

- [ ] API accepts bounded compressed batches and enqueues tenant-bearing jobs
- [ ] Worker bulk inserts partition-ready pings and updates Redis presence
- [ ] Route summarizer computes Haversine distance, stops/dwell and tracking gaps
- [ ] Simplified path is read-optimized while raw pings remain authoritative
- [ ] Retention job prunes pings after 90 days without deleting summaries/audit evidence
- [ ] SSE publishes presence/location deltas with reconnect cursor and authorization

## 6. Client and Web

- [ ] Flutter background tracking uses workmanager and battery-aware intervals
- [ ] Isar stores pending punches and ping batches with retry/backoff metadata
- [ ] M16 shows tracking session, permission and battery state
- [ ] M17 shows pending/failed/synced items and safe manual retry
- [ ] H2 renders live/stale/offline employees and geofence overlays
- [ ] H3 renders route, stops, gaps, punch markers and playback controls
- [ ] Map provider is abstracted and no unrestricted provider key ships to clients

## 7. Ordered Work Packages

- [ ] 6.0 Schema constraints, partitions, RLS and retention policy
- [ ] 6.1 Field session and ping ingestion APIs
- [ ] 6.2 Worker, Redis presence and authenticated SSE
- [ ] 6.3 Offline queue/sync idempotency and tamper handling
- [ ] 6.4 Route summarizer and H2/H3
- [ ] 6.5 M16/M17 and resilience hardening

## 8. Test Plan

- [ ] Duplicate replay creates one attendance event
- [ ] Offline ordered in/break/out events recompute correctly
- [ ] Expired window and clock tamper return permanent coded outcomes
- [ ] Worker retry does not duplicate pings or route summaries
- [ ] Session auto-stop and stale close are idempotent
- [ ] Tenant/device rate limits and oversized batches are rejected safely
- [ ] SSE cannot subscribe across tenants and resumes after disconnect
- [ ] Route fixtures validate distance, stops and gap rendering
- [ ] k6 targets for `/field-pings/batch`, `/attendance/sync` and SSE fan-out

## 9. Definition of Done

- [ ] Offline punch replay is exactly-once logically
- [ ] Field evidence remains tenant/device scoped and retention compliant
- [ ] Live board degrades safely when Redis/SSE is unavailable
- [ ] H2/H3 and M16/M17 run against real APIs
- [ ] Load, battery, retry, RLS, security and reconciliation gates pass

## 10. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 6.0 Schema, partitions and retention | Not started | |
| 6.1 Sessions and ping ingestion | Not started | |
| 6.2 Worker, presence and SSE | Not started | |
| 6.3 Offline sync and tamper handling | Not started | |
| 6.4 Route summaries and web maps | Not started | |
| 6.5 Mobile resilience/hardening | Not started | |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 11. Implementation Specification

### 11.1 Module and data flow

```text
mobile capture -> bounded API batch -> BullMQ ingestion
  -> partitioned pings -> Redis presence -> authenticated SSE
  -> route-summary job -> H2/H3 read models

Isar pending event -> /attendance/sync -> verification policy
  -> AttendanceDay aggregate -> per-item durable outcome
```

`field-tracking` owns sessions/pings/routes. `attendance-sync` orchestrates replay but delegates business transitions to Sprint 4 and trust checks to Sprint 5. Redis is disposable acceleration; PostgreSQL remains authoritative.

### 11.2 Permissions and channel security

| Action | Permission/scope |
|---|---|
| Start/stop own session, upload own pings/sync | active employee and active bound device |
| Live team list/SSE | `attendance.field.live.read`, department/manager scope |
| Route history | `attendance.field.routes.read`, scoped employee access |
| Retention/rebuild jobs | internal worker only |

SSE access token is validated at connection, tenant/permission scope is fixed for connection lifetime, heartbeat is <=30 seconds, reconnect uses a short cursor, and server closes sessions on token expiry or user/device disablement.

### 11.3 DTO contracts and limits

| DTO | Fields | Limits |
|---|---|---|
| `StartFieldSessionDto` | device ID, client start UUID | one active session; idempotency key required |
| `StopFieldSessionDto` | end reason | employee may use manual; system reasons internal |
| `PingDto` | client UUID, session, lat/lng, accuracy, speed, battery, capturedAt, mock flag | max accuracy 5000; speed 0-100 m/s; battery 0-100 |
| `PingBatchDto` | `items[]` | 1-100 pings, compressed body <=256 KiB, chronological |
| `SyncAttendanceItemDto` | client UUID, type, client time, device/integrity/location/selfie evidence | 1-50 events, bounded age by effective policy |
| Route query | employee/date | ISO date; max one day per detailed route request |

Batch response is ordered by client UUID and never fails the entire batch for a single invalid item. It returns `ACCEPTED`, `DUPLICATE`, `RETRYABLE` or `REJECTED` plus stable code and canonical server event ID when available.

### 11.4 Idempotency and ordering

- First durable result for a tenant/employee/client UUID wins.
- Duplicate payload with different semantic content returns `IDEMPOTENCY_PAYLOAD_MISMATCH`.
- Sync groups by attributed attendance day, sorts by client time then UUID, and locks each day independently.
- Partial transaction policy is explicit: each attendance day commits atomically; one day failure does not roll back unrelated days.
- Offline integrity evidence has issue/expiry checks; stale evidence is rejected even inside attendance offline window.
- Client clock skew thresholds produce normal, suspect or reject classifications and are stored with the event.

### 11.5 Error catalog

| Code | Status | Retry |
|---|---:|---|
| `FIELD_SESSION_ALREADY_ACTIVE` | 409 | no |
| `FIELD_SESSION_NOT_ACTIVE` | 409 | no |
| `FIELD_TRACKING_NOT_ALLOWED` | 403 | no |
| `PING_BATCH_TOO_LARGE` | 413 | split |
| `PING_RATE_LIMITED` | 429 | after header |
| `PING_SESSION_MISMATCH` | 422 | no |
| `IDEMPOTENCY_PAYLOAD_MISMATCH` | 409 | no |
| `OFFLINE_WINDOW_EXPIRED` | 422 | regularize |
| `OFFLINE_INTEGRITY_EXPIRED` | 422 | regularize |
| `CLOCK_TAMPER` | 422 | no/alert |
| `SYNC_DEPENDENCY_UNAVAILABLE` | 503 | yes |
| `ROUTE_NOT_READY` | 202 | poll |

### 11.6 Migration, database and infrastructure

- [ ] Unique ping client UUID per tenant/device or ingestion dedupe table
- [ ] Unique route summary per employee/date and summary algorithm version field
- [ ] Partial unique active field session per tenant/employee
- [ ] Partition and retention jobs tested across month boundaries
- [ ] Redis presence TTL is derived from tracking interval and never marks stale data live
- [ ] Queue job IDs use tenant/session/batch identity; retries are idempotent
- [ ] RLS covers session, ping and route tables with no-context fail closed
- [ ] Raw ping deletion retains aggregate/audit proof without personal path after policy expiry

### 11.7 Route algorithm contract

Reject impossible/outlier points using documented accuracy/speed rules without erasing raw evidence. Calculate distance with Haversine between accepted points. A stop requires configurable radius/dwell. A tracking gap begins when consecutive accepted pings exceed the expected interval tolerance. Store simplified ordered coordinates, stops, gap segments, totals, source count and algorithm version.

### 11.8 Stitch/mobile acceptance

- H2 exact Stitch map/sidebar/list states: live, stale, offline, selected employee, clusters and geofence toggle.
- H3 exact route/timeline/speed controls with gap and punch overlays.
- M16/M17 exact permission, battery, active, pending queue, offline and all-synced states.
- Map tests use deterministic provider fixtures and visual snapshots, not public network tiles in CI.
- Mobile background behavior is tested on Android/iOS supported versions, low-power mode, revoked permission, force close and reconnect.

### 11.9 Acceptance scenario

A fixed field day contains 240 pings, six stops, one 22-minute gap, one duplicate batch and four offline attendance events delivered twice. Expected result: one active-to-checkout session, deduplicated raw count, one versioned route summary, exactly-once attendance stream, correct gap/distance tolerance, live-to-stale presence transition and M17 empty success state.
