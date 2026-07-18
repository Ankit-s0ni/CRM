# Sprint 6 Implementation Plan

## Field Tracking, Offline Sync and Live Monitoring

**Status:** In progress
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
- Production trust-provider completion carried from Sprint 5

## 2. Production Trust Provider Completion (Deferred from Sprint 5)

This work package is a release prerequisite, not optional cleanup. Sprint 5 proves the local/MVP workflow with deterministic adapters; Sprint 6 must replace those boundaries with selected, production-tested services.

- [ ] Record provider decisions, regions, data residency, retention, cost and failure policy for maps, native device attestation and face/liveness
- [ ] Android client obtains nonce-bound Play Integrity evidence and the API verifies it server-side with replay protection
- [ ] iOS client obtains App Attest/DeviceCheck evidence and the API verifies it server-side with replay protection
- [ ] Selected face/liveness provider processes private evidence server-side; clients cannot submit their own verdict or score
- [ ] OpenStreetMap provider renders H2/H3/M16 real tiles, geofences and routes with required attribution and a production-compliant tile-usage policy
- [ ] Production object storage uses encryption, private networking, lifecycle controls and retryable deletion with dead-letter visibility
- [ ] Reverse-proxy allowlists are configured per environment; office exact-IP, CIDR and spoofed-forwarded-header cases pass deployment tests
- [ ] Biometric DPA, consent text, regional transfer, deletion SLA and incident process receive legal/security approval
- [ ] Supported physical Android/iOS devices pass registration, attestation, enrollment, online punch and provider-outage certification

### 2.1 Required provider acceptance evidence

| Boundary          | Required evidence                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Android integrity | Valid/tampered/rooted/replayed receipt fixtures plus one physical-device pass and fail run                     |
| iOS integrity     | Valid/tampered/replayed assertion fixtures plus one physical-device pass and fail run                          |
| Face/liveness     | Match, mismatch, presentation attack, provider timeout and deletion tests without raw provider payload leakage |
| Maps              | Restricted-key configuration, deterministic CI adapter and real-device H2/H3 smoke test                        |
| Office network    | Direct/proxied IPv4, IPv6/CIDR and forged-forwarded-header tests                                               |
| Private evidence  | Storage outage, retry, dead-letter, recovery and deletion-SLA proof                                            |

## 3. API Contract

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

## 4. Field Session Rules

- [X] Only active field-enabled employees/devices can start sessions
- [X] One active session per employee/device; start is idempotent
- [X] Stop records end reason: checkout, manual, battery, stale or administrator
- [X] Checkout auto-stops the active session through a domain-event handler
- [X] Stale-session job closes abandoned sessions deterministically
- [X] Ping validation covers coordinates, accuracy, speed, battery, mock flag, captured time and monotonic ordering
- [X] Per-tenant/device rate limits return coded retry guidance

## 5. Offline Sync Rules

- [X] `clientEventUuid` is globally unique for the tenant event stream
- [X] Duplicate delivery returns original outcome without appending another event
- [X] Validate device binding, integrity evidence age and maximum offline window
- [X] Compare client/server clocks and mark `timeSuspect`; severe tamper rejects and alerts
- [X] Replay calls the same verification and attendance aggregate paths as online punches
- [X] Events are processed in client order under an attendance-day lock
- [X] Partial batches preserve per-item outcomes and safe retry semantics

## 6. Ingestion and Route Processing

- [X] API accepts bounded compressed batches and enqueues tenant-bearing jobs
- [X] Worker bulk inserts partition-ready pings and updates Redis presence
- [X] Route summarizer computes Haversine distance, stops/dwell and tracking gaps
- [X] Simplified path is read-optimized while raw pings remain authoritative
- [X] Retention job prunes pings after 90 days without deleting summaries/audit evidence
- [X] SSE publishes presence/location deltas with reconnect cursor and authorization

## 7. Client and Web

- [X] Flutter background tracking uses workmanager and battery-aware intervals
- [X] Isar stores pending punches and ping batches with retry/backoff metadata
- [X] M16 shows tracking session, permission and battery state
- [X] M17 shows pending/failed/synced items and safe manual retry
- [X] H2 renders live/stale/offline employees and geofence overlays
- [X] H3 renders route, stops, gaps, punch markers and playback controls
- [X] Map provider is abstracted and no unrestricted provider key ships to clients

## 8. Ordered Work Packages

- [ ] 6.0 Production trust providers, privacy and physical-device certification
- [X] 6.1 Schema constraints, partitions, RLS and retention policy
- [X] 6.2 Field session and ping ingestion APIs
- [X] 6.3 Worker, Redis presence and authenticated SSE
- [X] 6.4 Offline queue/sync idempotency and tamper handling
- [X] 6.5 Route summarizer and H2/H3
- [X] 6.6 M16/M17 and resilience hardening

## 9. Test Plan

- [X] Duplicate replay creates one attendance event
- [X] Offline ordered in/break/out events recompute correctly
- [X] Expired window and clock tamper return permanent coded outcomes
- [X] Worker retry does not duplicate pings or route summaries
- [X] Session auto-stop and stale close are idempotent
- [X] Tenant/device rate limits and oversized batches are rejected safely
- [X] SSE cannot subscribe across tenants and resumes after disconnect
- [X] Route fixtures validate distance, stops and gap rendering
- [X] k6 targets for `/field-pings/batch`, `/attendance/sync` and SSE fan-out
- [ ] Production provider contract, outage, replay, spoofing, deletion-recovery and physical-device certification matrix passes

## 10. Definition of Done

- [X] Offline punch replay is exactly-once logically
- [X] Field evidence remains tenant/device scoped and retention compliant
- [X] Live board degrades safely when Redis/SSE is unavailable
- [X] H2/H3 and M16/M17 run against real APIs
- [ ] Load, battery, retry, RLS, security and reconciliation gates pass
- [ ] Sprint 5 production deferrals in work package 6.0 are implemented, independently evidenced and no longer use development fakes

## 11. Progress Tracker

| Work package                         | Status      | Evidence                                                     |
| ------------------------------------ | ----------- | ------------------------------------------------------------ |
| 6.0 Production trust certification   | In progress | Native Android/iOS bridges compile; one-time challenge/replay controls, Google map adapter, durable evidence deletion and provider record implemented. Production startup rejects placeholder secrets, insecure/default private evidence storage and enabled integrity enforcement without a real gateway. Face-match policies are locked behind an explicit production biometric flag; enabled use requires server-side HTTPS liveness and face-match gateways. Vendor gateway, Gulf face/liveness selection, deployment credentials, legal approval and physical-device certification remain |
| 6.1 Schema, partitions and retention | Complete | Four Sprint 6 migrations applied; partition boundary, retention, anonymization and RLS tests pass |
| 6.2 Sessions and ping ingestion      | Complete | Session lifecycle, bounded 100-ping batches, receipts, idempotency and coded rate/body limits pass database e2e |
| 6.3 Worker, presence and SSE         | Complete | Idempotent worker retry, Redis-backed presence, tenant/manager SSE scope, cursor reconnect and connection expiry tests pass |
| 6.4 Offline sync and tamper handling | Complete | Isar queue, ordered day locks, global idempotency, per-item outcomes, clock/integrity expiry and duplicate replay pass |
| 6.5 Route summaries and web maps     | Complete | 240-ping/six-stop/22-minute-gap fixture and H2/H3 production build pass; deterministic CI fallback plus OpenStreetMap Leaflet web and flutter_map mobile adapters available |
| 6.6 Mobile resilience/hardening      | Complete | Workmanager, battery-aware tracking, secure token/evidence cleanup, bounded backoff, M16/M17 goldens and 66 Flutter tests pass |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 12. Implementation Specification

### 12.1 Module and data flow

```text
mobile capture -> bounded API batch -> BullMQ ingestion
  -> partitioned pings -> Redis presence -> authenticated SSE
  -> route-summary job -> H2/H3 read models

Isar pending event -> /attendance/sync -> verification policy
  -> AttendanceDay aggregate -> per-item durable outcome
```

`field-tracking` owns sessions/pings/routes. `attendance-sync` orchestrates replay but delegates business transitions to Sprint 4 and trust checks to Sprint 5. Redis is disposable acceleration; PostgreSQL remains authoritative.

### 12.2 Permissions and channel security

| Action                                        | Permission/scope                                         |
| --------------------------------------------- | -------------------------------------------------------- |
| Start/stop own session, upload own pings/sync | active employee and active bound device                  |
| Live team list/SSE                            | `attendance.field.live.read`, department/manager scope |
| Route history                                 | `attendance.field.routes.read`, scoped employee access |
| Retention/rebuild jobs                        | internal worker only                                     |

SSE access token is validated at connection, tenant/permission scope is fixed for connection lifetime, heartbeat is <=30 seconds, reconnect uses a short cursor, and server closes sessions on token expiry or user/device disablement.

### 12.3 DTO contracts and limits

| DTO                       | Fields                                                                         | Limits                                                |
| ------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `StartFieldSessionDto`  | device ID, client start UUID                                                   | one active session; idempotency key required          |
| `StopFieldSessionDto`   | end reason                                                                     | employee may use manual; system reasons internal      |
| `PingDto`               | client UUID, session, lat/lng, accuracy, speed, battery, capturedAt, mock flag | max accuracy 5000; speed 0-100 m/s; battery 0-100     |
| `PingBatchDto`          | `items[]`                                                                    | 1-100 pings, compressed body <=256 KiB, chronological |
| `SyncAttendanceItemDto` | client UUID, type, client time, device/integrity/location/selfie evidence      | 1-50 events, bounded age by effective policy          |
| Route query               | employee/date                                                                  | ISO date; max one day per detailed route request      |

Batch response is ordered by client UUID and never fails the entire batch for a single invalid item. It returns `ACCEPTED`, `DUPLICATE`, `RETRYABLE` or `REJECTED` plus stable code and canonical server event ID when available.

### 12.4 Idempotency and ordering

- First durable result for a tenant/employee/client UUID wins.
- Duplicate payload with different semantic content returns `IDEMPOTENCY_PAYLOAD_MISMATCH`.
- Sync groups by attributed attendance day, sorts by client time then UUID, and locks each day independently.
- Partial transaction policy is explicit: each attendance day commits atomically; one day failure does not roll back unrelated days.
- Offline integrity evidence has issue/expiry checks; stale evidence is rejected even inside attendance offline window.
- Client clock skew thresholds produce normal, suspect or reject classifications and are stored with the event.

### 12.5 Error catalog

| Code                             | Status | Retry        |
| -------------------------------- | -----: | ------------ |
| `FIELD_SESSION_ALREADY_ACTIVE` |    409 | no           |
| `FIELD_SESSION_NOT_ACTIVE`     |    409 | no           |
| `FIELD_TRACKING_NOT_ALLOWED`   |    403 | no           |
| `PING_BATCH_TOO_LARGE`         |    413 | split        |
| `PING_RATE_LIMITED`            |    429 | after header |
| `PING_SESSION_MISMATCH`        |    422 | no           |
| `IDEMPOTENCY_PAYLOAD_MISMATCH` |    409 | no           |
| `OFFLINE_WINDOW_EXPIRED`       |    422 | regularize   |
| `OFFLINE_INTEGRITY_EXPIRED`    |    422 | regularize   |
| `CLOCK_TAMPER`                 |    422 | no/alert     |
| `SYNC_DEPENDENCY_UNAVAILABLE`  |    503 | yes          |
| `ROUTE_NOT_READY`              |    202 | poll         |

### 12.6 Migration, database and infrastructure

- [X] Unique ping client UUID per tenant/device or ingestion dedupe table
- [X] Unique route summary per employee/date and summary algorithm version field
- [X] Partial unique active field session per tenant/employee
- [X] Partition and retention jobs tested across month boundaries
- [X] Redis presence TTL is derived from tracking interval and never marks stale data live
- [X] Queue job IDs use tenant/session/batch identity; retries are idempotent
- [X] RLS covers session, ping and route tables with no-context fail closed
- [X] Raw ping deletion retains aggregate/audit proof without personal path after policy expiry

### 12.7 Route algorithm contract

Reject impossible/outlier points using documented accuracy/speed rules without erasing raw evidence. Calculate distance with Haversine between accepted points. A stop requires configurable radius/dwell. A tracking gap begins when consecutive accepted pings exceed the expected interval tolerance. Store simplified ordered coordinates, stops, gap segments, totals, source count and algorithm version.

### 12.8 Stitch/mobile acceptance

- H2 exact Stitch map/sidebar/list states: live, stale, offline, selected employee, clusters and geofence toggle.
- H3 exact route/timeline/speed controls with gap and punch overlays.
- M16/M17 exact permission, battery, active, pending queue, offline and all-synced states.
- Map tests use deterministic provider fixtures and visual snapshots, not public network tiles in CI.
- Mobile background behavior is tested on Android/iOS supported versions, low-power mode, revoked permission, force close and reconnect.

### 12.9 Acceptance scenario

A fixed field day contains 240 pings, six stops, one 22-minute gap, one duplicate batch and four offline attendance events delivered twice. Expected result: one active-to-checkout session, deduplicated raw count, one versioned route summary, exactly-once attendance stream, correct gap/distance tolerance, live-to-stale presence transition and M17 empty success state.
