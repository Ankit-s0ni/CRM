# HRMS Mobile Ownership and API Migration Implementation Plan

**Status:** Local source migration and real-stack iOS verification complete; publication, generated-response DTO, protected-release, physical-device, staging, and rollout gates remain blocked
**Audit date:** 2026-08-11
**Decision owner:** Platform and HRMS engineering
**Canonical mobile owner:** `deltcrm-hrms`
**Canonical mobile path:** `deltcrm-hrms/apps/mobile`
**Transitional duplicate:** `CRM/apps/mobile`

## 1. Executive decision

The Flutter application is an HRMS employee application. Its screens, offline
attendance queue, device trust, biometric enrollment, field tracking, leave,
regularization, and attendance behavior are HRMS product concerns. The
canonical application will therefore remain in `deltcrm-hrms/apps/mobile`.

The `CRM/apps/mobile` copy must eventually be removed from Platform, but it must
not be deleted before HRMS owns and proves all of the following:

- source, tests, generated API client, and build scripts
- Android and iOS application identity and signing
- CI validation and release artifacts
- environment configuration and gateway connectivity
- Platform login and HRMS product-token exchange
- foreground, background, offline, logout, and tenant-switch behavior
- rollback to the last known-good HRMS mobile release

This audit found that the two `lib` trees are currently byte-for-byte identical.
That makes consolidation safe in principle, but the HRMS repository does not yet
have the complete API, authentication, CI, and live integration coverage needed
to delete the Platform copy safely.

## 2. Scope and non-goals

This plan covers:

- ownership consolidation of the duplicate Flutter application
- migration from legacy flat HRMS URLs to `/api/hrms/v1/*`
- use of Platform identity plus an HRMS product token
- separated Platform and HRMS API clients inside Flutter
- completion of missing mobile-facing HRMS endpoints
- generated Dart contracts, offline/background behavior, testing, deployment,
  and removal of the Platform copy

This document does not authorize deleting either mobile directory, changing
production signing, publishing an app-store build, or modifying production data.
Those actions require their phase exit gates below.

## 3. Audit method and evidence

The audit compared both mobile source trees and inspected:

- Flutter routes, repositories, authentication, token storage, tenant runtime,
  offline queues, background workers, tests, and release configuration
- the separated HRMS NestJS composition root, active controllers, guards,
  Prisma schema, and OpenAPI input used by the Flutter route generator
- Platform product-token issuance and the documented gateway topology
- both repositories' GitHub workflows and current ownership documentation

Primary evidence:

- `CRM/apps/mobile/lib` and `deltcrm-hrms/apps/mobile/lib` have no source diff.
- `deltcrm-hrms/apps/mobile/lib/core/network/api_routes.dart` still contains
  legacy flat product routes.
- `deltcrm-hrms/apps/mobile/lib/core/network/api_service.dart` has one Dio
  client and one access token for both Platform and HRMS calls.
- `deltcrm-hrms/apps/mobile/lib/core/config/app_config.dart` defaults to port
  `4001`, while the documented unified local gateway is port `4080`.
- `deltcrm-hrms/scripts/generate-flutter-api-routes.mjs` validates flat routes
  against the old `deltcrm-hrms/docs/openapi.json` and generates route strings
  only; it does not generate a typed separated-product client.
- `deltcrm-hrms/apps/api/src/composition/hrms-boundary-api.module.ts` exposes
  only migrated HRMS modules.
- the active self-attendance controller currently exposes only
  `GET /api/hrms/v1/attendance/me/today` and
  `POST /api/hrms/v1/attendance/me/punch`.
- Platform exposes `POST /product-integration/token`.
- the HRMS `HrmsProductTokenGuard` requires an HRMS product token and rejects a
  missing, invalid, stale, cross-tenant, inactive, or non-entitled identity.
- no Flutter integration-test suite or mobile GitHub workflow was found in the
  HRMS repository.
- 53 direct `test(...)`/`testWidgets(...)` declarations were found in the
  mobile test directory. Parameterized tests may execute more cases, but these
  tests do not exercise a real Platform-to-gateway-to-HRMS flow.

## 4. Current-state findings

### 4.1 P0: the app sends the wrong token to separated HRMS

The mobile app logs in through Platform and retains the Platform access token.
It never calls `POST /product-integration/token` with the HRMS audience. All
requests are sent through one `ApiService` with that one token.

The separated HRMS API does not accept the Platform session token. It requires
the short-lived HRMS product token. Prefixing the current URLs without changing
the token architecture would therefore turn route failures into
`401 PRODUCT_TOKEN_REQUIRED` failures.

### 4.2 P0: many mobile APIs are not exposed by the separated HRMS runtime

The HRMS Prisma schema contains the product-owned data models, including
`AttendanceVerificationLog`, `AttendanceJobRun`, `FieldLocationPing`,
`FieldPingReceipt`, `FieldRouteSummary`, `AttendanceSyncReceipt`,
`DeviceIntegrityChallenge`, `BiometricConsent`, and `FaceEnrollment`.

However, the separated composition does not currently expose most of the
mobile-facing self-service controllers that use these models. The old OpenAPI
file still lists the monolith endpoints, which makes the generator appear green
even though the independently bootable HRMS runtime cannot serve them.

### 4.3 P0: background tasks create an unauthenticated client

The Workmanager callbacks create a fresh `ApiService(TokenStore(storage))` and
immediately replay attendance or field pings. They do not restore the workspace,
refresh the Platform session, or obtain an HRMS product token. Background work
can therefore fail even when foreground login works.

### 4.4 P0: duplicate application ownership

The same HRMS application exists under both Platform and HRMS. Continuing to
edit or release both copies creates silent drift and makes it unclear which
repository owns incidents, signing, CI, and app-store releases.

### 4.5 P1: route generator validates a stale topology

The generated Dart file and its generator use legacy paths such as
`/attendance/punches`, `/devices/register`, and `/leave-requests`. The generator
reads the monolith OpenAPI document rather than the separated Platform and HRMS
specifications. It also generates only constants, so request and response shape
drift is not caught.

There is already generator drift: the generated Dart file contains routes such
as mobile login and password change that are not represented consistently by
the generator's route table.

### 4.6 P1: request and response shapes have drifted

The new HRMS punch endpoint accepts a small idempotent event DTO. The Flutter
client currently sends device, integrity, geolocation, evidence, and app-version
fields expected by the old monolith endpoint and expects a different response
with verification details.

The new `today` endpoint returns the employee attendance log, while Flutter
expects a richer home payload containing shift, policy, workplace, timeline,
open action, work overview, and holiday information. These contracts must be
designed explicitly; a URL replacement is insufficient.

### 4.7 P1: offline records are not identity-scoped

`PendingAttendanceRecord`, `PendingFieldPingBatch`, and `LocalFieldSession` do
not contain tenant, user, membership, or employee ownership fields. Their unique
keys are global in the local database. Logout currently clears runtime data,
but crash recovery, a background isolate, or workspace/account switching can
still create cross-session ambiguity.

Integrity secrets are keyed only by event ID. They also need explicit ownership
and lifecycle cleanup.

### 4.8 P1: local and production base-URL policy is ambiguous

The app defaults to Android-emulator port `4001`; a development JSON file uses
`127.0.0.1:4001`; documentation configures `adb reverse` for `4001`; and a
production file points at a direct API domain. The target architecture requires
one public gateway origin, with Platform and HRMS selected by path and token,
not direct mobile knowledge of internal service ports.

### 4.9 P1: CI and real-flow coverage are missing

Existing unit, widget, golden, repository, and offline tests remain valuable.
They are not useless. The problem is that some architecture tests explicitly
assert the legacy flat routes, and mocked network tests cannot prove gateway
routing, product-token exchange, audience validation, or active HRMS endpoint
availability.

The HRMS repository needs mobile CI and a real integration-test lane before it
can be the sole source and release owner.

### 4.10 P2: supported client platforms need a decision

The Flutter device payload can describe web and desktop clients, while the
separated HRMS device DTO currently permits Android and iOS. Confirm whether
this application is mobile-only. If it is, reject unsupported targets at build
and runtime. If Flutter web/desktop is supported, add those platforms to the
contract and define their device-trust behavior.

## 5. Target architecture

```text
HRMS Flutter app
  |
  |-- PlatformApiClient -- Platform session token
  |      |-- /auth/mobile-login
  |      |-- /auth/refresh
  |      |-- /auth/logout
  |      |-- /auth/change-password
  |      |-- /auth/me
  |      |-- /product-integration/token { audience: "hrms-api" }
  |      `-- /notifications/*
  |
  `-- HrmsApiClient -- short-lived HRMS product token
         `-- /api/hrms/v1/*

Both clients -> public gateway origin -> Platform API or HRMS API
```

The two clients may share transport utilities, request IDs, logging, and
availability handling, but they must not share an authorization-token slot.

### 5.1 Foreground login and request flow

1. Resolve and persist the workspace using Platform.
2. Call Platform mobile login.
3. Store the rotating Platform refresh credential in secure storage and keep
   the Platform access token in memory.
4. Call Platform `POST /product-integration/token` with audience `hrms-api`.
5. Keep the short-lived HRMS product token in memory with its expiry and
   entitlement version.
6. Call `/api/hrms/v1/*` with the HRMS product token.
7. Call Platform-owned endpoints with the Platform token.
8. On an expired or stale HRMS token, perform a single-flight product-token
   exchange and retry the idempotent request once.
9. If the Platform session also expired, single-flight refresh it first, then
   exchange the product token, then retry once.
10. Fail closed on tenant suspension, inactive identity, removed HRMS
    entitlement, blocked device, or repeated authorization failure.

### 5.2 Background flow

Every headless task must run this bootstrap before network work:

1. load the workspace and identity scope from secure storage
2. refresh the Platform session using the device identity
3. request a fresh HRMS product token
4. open only the queue belonging to that tenant, user, membership, and employee
5. replay bounded batches with idempotency keys
6. persist outcome receipts and schedule retry only for retryable failures
7. erase or quarantine work when identity/entitlement validation fails

The product token should not be persisted longer than necessary. Background
workers should mint a fresh token after restoring the Platform session.

## 6. API ownership and migration inventory

Legend:

- **Available:** present in the separated runtime now
- **Missing:** model may exist, but the required mobile controller/contract is
  not exposed by the separated runtime
- **Platform:** remains Platform-owned and must use the Platform client/token

### 6.1 Platform control-plane endpoints

| Mobile capability | Current route | Target route | Status | Required action |
|---|---|---|---|---|
| Workspace mobile login | `/auth/mobile-login` | same | Platform | Keep; generate Platform Dart contract |
| Session refresh | `/auth/refresh` | same | Platform | Keep rotating refresh flow |
| Logout | `/auth/logout` | same | Platform | Revoke session, cancel workers, purge scoped data |
| Change password | `/auth/change-password` | same | Platform | Keep on Platform client |
| Current identity | `/auth/me` | same | Platform | Keep on Platform client |
| HRMS token exchange | not called | `/product-integration/token` | Available | Add audience `hrms-api` flow |
| Notifications | `/notifications/*` | same unless Platform versions it | Platform | Keep on Platform client |

### 6.2 HRMS device and runtime endpoints

| Mobile capability | Legacy route | Target route | Status | Required action |
|---|---|---|---|---|
| Runtime config | `/mobile/runtime-config` | `/api/hrms/v1/mobile/runtime-config` | Missing | Add self runtime response and cache policy |
| Register device | `/devices/register` | `/api/hrms/v1/devices/register` | Available | Migrate route and validate DTO |
| Current device | `/devices/me` | `/api/hrms/v1/devices/me` | Available | Migrate route |
| Unregister device | `DELETE /devices/me` | `DELETE /api/hrms/v1/devices/me` | Available | Always send required device UUID/header |
| Admin device actions | `/devices/:id/*` | `/api/hrms/v1/devices/:id/*` | Available | Do not expose in employee UI unless entitled |
| Employee profile | `/employees/me` | `/api/hrms/v1/employees/me` | Missing | Add self-profile projection |
| HRMS preferences | `/employees/me/preferences` | `/api/hrms/v1/employees/me/preferences` | Missing | Define HRMS-only preference ownership |

Global locale and notification preferences should remain Platform-owned. HRMS
preferences should contain only product behavior such as attendance reminders
or HRMS display defaults.

### 6.3 HRMS attendance endpoints

| Mobile capability | Legacy route | Target route | Status | Required action |
|---|---|---|---|---|
| Today | `/attendance/me/today` | `/api/hrms/v1/attendance/me/today` | Available, shape incomplete | Agree rich mobile response or compose typed calls |
| Punch | `/attendance/punches` | `/api/hrms/v1/attendance/me/punch` | Available, shape differs | Finalize evidence/integrity DTO and response |
| Break start/end | `/attendance/break-start`, `/attendance/break-end` | `/api/hrms/v1/attendance/me/punch` | Available via event type | Remove special flat endpoints |
| History | `/attendance/me/history` | `/api/hrms/v1/attendance/me/history` | Missing | Add paged/month self history |
| Day detail | `/attendance/me/day` | `/api/hrms/v1/attendance/me/day` | Missing | Add date-scoped self detail |
| Evidence presign | `/attendance/punch-evidence/presign` | `/api/hrms/v1/attendance/evidence/presign` | Missing | Add short-lived object upload contract |
| Integrity challenge | `/attendance/integrity/challenges` | `/api/hrms/v1/attendance/integrity/challenges` | Missing | Add nonce, expiry, device binding, one-time use |
| Offline sync | `/attendance/sync` | `/api/hrms/v1/attendance/sync` | Missing | Add bounded batch and per-item outcomes |
| Sync receipt | `/attendance/sync/:uuid` | `/api/hrms/v1/attendance/sync/:uuid` | Missing | Expose idempotent receipt lookup |
| Verification log | `/verification-logs` | `/api/hrms/v1/attendance/verification-logs/me` | Missing | Add self-scoped projection; never accept employee ID from client |

The punch and sync contracts must preserve `clientEventUuid` idempotency and
return deterministic statuses such as accepted, duplicate, rejected,
regularization-required, or retryable. Partial batch success must not cause
already-accepted events to be replayed as new events.

### 6.4 HRMS biometric endpoints

| Mobile capability | Legacy route | Target route | Status | Required action |
|---|---|---|---|---|
| Read own consent | `/biometric-consents/me` | `/api/hrms/v1/biometric-consents/me` | Missing | Add self endpoint |
| Grant consent | `/biometric-consents` | `POST /api/hrms/v1/biometric-consents/me` | Missing | Record immutable consent evidence |
| Withdraw consent | `DELETE /biometric-consents/me` | same under `/api/hrms/v1` | Missing | Revoke future use and apply retention policy |
| Enrollment presign | `/face-enrollments/presign` | `/api/hrms/v1/face-enrollments/me/presign` | Missing | Add self-scoped presign |
| Complete enrollment | `/face-enrollments` | `POST /api/hrms/v1/face-enrollments/me` | Missing | Bind uploaded evidence to challenge/device |
| Enrollment status | `/face-enrollments/me/status` | `/api/hrms/v1/face-enrollments/me/status` | Missing | Add self status |

Admin employee enrollment status already exists under a separated HRMS route.
It is not a substitute for the self-service mobile endpoints.

### 6.5 HRMS leave and regularization endpoints

| Mobile capability | Legacy route | Target route | Status | Required action |
|---|---|---|---|---|
| Leave policies | `/leave-policies` | `/api/hrms/v1/leave/policies` | Available | Migrate and filter by self eligibility |
| Own leave balances | `/leave-balances/me` | `/api/hrms/v1/leave/balances/me` | Available | Migrate and validate response |
| List/create requests | `/leave-requests` | `/api/hrms/v1/leave/requests` | Available | Migrate and enforce self scope |
| Cancel request | `/leave-requests/:id/cancel` | `/api/hrms/v1/leave/requests/:id/cancel` | Available | Migrate and validate state machine |
| Create regularization | `/regularizations` | `POST /api/hrms/v1/regularizations` | Missing self action | Add self create permission and service |
| Own regularizations | `/regularizations/me` | `/api/hrms/v1/regularizations/me` | Missing | Add self list |
| Cancel regularization | `/regularizations/:id/cancel` | `/api/hrms/v1/regularizations/:id/cancel` | Missing | Add self cancel state transition |

Existing separated regularization endpoints are administrative operations; they
must not be reused for employee self-service without separate permissions and
ownership checks.

### 6.6 HRMS field-tracking endpoints

| Mobile capability | Legacy route | Target route | Status | Required action |
|---|---|---|---|---|
| Start session | `/field-sessions/start` | `POST /api/hrms/v1/field-sessions` | Missing | Add client UUID idempotency and device binding |
| Active session | `/field-sessions/me/active` | `/api/hrms/v1/field-sessions/me/active` | Missing | Add self query |
| Stop session | `/field-sessions/:id/stop` | `/api/hrms/v1/field-sessions/:id/stop` | Missing | Enforce session owner and terminal state |
| Upload pings | `/field-pings/batch` | `/api/hrms/v1/field-pings/batch` | Missing | Add bounded idempotent batches and receipts |

The existing HRMS schema supplies the tracking and receipt models, but the
separated runtime still needs the mobile-facing application services and
controllers.

## 7. Contract strategy for Flutter

The published `@mariya-abdul/deltcrm-product-contracts` package is a TypeScript
package. Flutter cannot import it directly. Mobile must consume language-neutral
artifacts produced from the same release:

- Platform OpenAPI for login, refresh, identity, token exchange, and
  notifications
- HRMS OpenAPI for `/api/hrms/v1/*`
- JSON product manifest and permission/capability catalog
- machine-readable error-code catalog
- contract version and source commit/hash embedded in generated Dart output

Replace the route-only script with a reproducible Dart generator that creates:

- typed request and response models
- separate `PlatformApiClient` and `HrmsApiClient`
- route and method definitions
- nullable/required field validation
- enums and error payloads
- serialization tests and a generated-file drift check

The generator must fail CI if the active separated runtime OpenAPI does not
contain a mobile endpoint. The checked-in old monolith OpenAPI must not be used
as proof that an endpoint exists.

## 8. Required mobile design changes

### 8.1 Session coordinator

Create a `MobileSessionCoordinator` responsible for:

- workspace resolution
- Platform access/refresh session lifecycle
- HRMS product-token exchange and expiry
- single-flight refresh and exchange
- entitlement/version invalidation
- logout, worker cancellation, and scoped data purge

Repositories must receive the correct typed client instead of a generic client
that can call any path.

### 8.2 Offline data ownership

Add these required fields to every queued record and integrity secret:

- `tenantId`
- `userId`
- `membershipId`
- `employeeId`
- `deviceUuid`
- contract/payload version

All reads, retries, deletes, and uniqueness constraints must include the owner
scope. Introduce an Isar schema migration. Legacy unscoped records must be
quarantined or purged safely; they must never be guessed into the current user.

### 8.3 Error behavior

Map stable server codes to explicit actions:

- `PRODUCT_TOKEN_REQUIRED`, invalid/expired token: exchange token and retry once
- `STALE_PRODUCT_TOKEN`: refresh entitlements through a new token and retry once
- `PRODUCT_NOT_ENTITLED`: stop HRMS work, cancel workers, show product disabled
- suspended/inactive identity: clear session and require Platform login
- blocked/replaced device: stop attendance/tracking and require re-registration
- validation/permission error: do not retry automatically
- network/5xx: retain scoped queue item with bounded exponential backoff

### 8.4 Observability and security

- propagate request and correlation IDs through gateway, Platform, and HRMS
- redact access tokens, refresh tokens, product tokens, biometrics, coordinates,
  presigned URLs, and integrity evidence from logs
- use TLS outside local development
- store refresh credentials only in Keychain/Keystore-backed secure storage
- keep product tokens in memory and mint them on background bootstrap
- bind integrity challenges and uploads to tenant, employee, device, request,
  expiry, and one-time nonce
- record audit evidence for consent, enrollment, punches, regularizations, and
  device state changes

## 9. Implementation phases

### Phase 0: freeze and status correction

- [x] Declare `deltcrm-hrms/apps/mobile` canonical in both repository READMEs and
  CODEOWNERS.
- [x] Put `CRM/apps/mobile` into read-only transitional mode.
- [x] Add a temporary parity check that fails if the two source trees diverge.
- [x] Mark mobile migration incomplete in separation checklists; schema
  ownership is complete, but separated mobile API exposure is not.
- [x] Capture current Android/iOS signing, store listing, versioning, and release
  owner without copying secrets into documentation.

**Exit gate:** every mobile change is made in HRMS first, and release ownership
is documented.

**Phase 0 evidence:**

- canonical and transitional ownership notices exist in both repository and
  mobile READMEs;
- both CODEOWNERS files route mobile changes to HRMS/security reviewers;
- `pnpm mobile:parity:check` passes from both repositories against 277 source
  and configuration files;
- the non-secret signing/store/release baseline is recorded in
  `deltcrm-hrms/docs/plans/multi-product-platform/HRMS-MOBILE-OWNERSHIP-AND-RELEASE-BASELINE.md`;
- store-account custodians and protected signed-build evidence remain Phase 5
  release gates and are not represented as complete.

### Phase 1: define and publish mobile contracts

**Progress note (2026-08-11):** the Platform mobile control-plane subset is now
generated from the active Platform composition and validates ten required
identity, token-exchange, and notification operations. The HRMS OpenAPI exporter now boots the
separated `HrmsBoundaryApiModule` with non-secret test storage configuration.
The regenerated `deltcrm-hrms/docs/openapi.json` identifies itself as
`DeltCRM HRMS API` and contains the active separated route surface rather than
the stale monolith document. This intentionally exposes the remaining mobile
contract gap: the separated attendance self-service surface currently contains
only `today` and `punch`. The route-only Flutter generator has not been treated
as migrated; the remaining Phase 1 checkboxes stay open until payload DTOs,
error/batch semantics, capability vocabulary, and typed Dart clients are complete.

The target HRMS mobile surface is now recorded as a machine-readable contract
at `deltcrm-hrms/docs/contracts/mobile/hrms-mobile-self-service-surface.v1.json`.
`pnpm mobile:contract:audit` compares its 35 method/path operations with the
active separated OpenAPI. The strict `pnpm mobile:contract:check` release gate
now passes at 35/35. The generated Dart artifacts embed both active contract
hashes and their drift gate passes. Response schemas are not yet sufficiently
typed in Nest OpenAPI for every repository to eliminate all dynamic response
maps, so that narrower Phase 3 item remains open.

- [x] Define the Platform mobile control-plane OpenAPI subset.
- [x] Define all HRMS self-service endpoints listed in Section 6.
- [x] Resolve today/punch payload drift with versioned DTOs.
- [x] Define idempotency, batch receipt, error, pagination, date/timezone, and
  upload contracts.
- [ ] Add or verify required HRMS permissions and capabilities in the published
  product contract.
- [ ] Generate complete typed Dart request/response clients for every mobile
  operation; separate generated client classes and active-spec drift checks are
  present, but several response edges remain dynamic because their Nest OpenAPI
  responses do not yet declare schemas.

**Exit gate:** client generation succeeds only from the active Platform and
separated HRMS specifications, with no legacy flat HRMS route allowlist.

### Phase 2: complete separated HRMS mobile APIs

Implement vertical slices in this order:

1. runtime config, self profile, preferences, and device lifecycle
2. attendance today, history, day detail, online punch, and break event types
3. evidence presign, integrity challenge, verification log, consent, and face
   enrollment
4. leave and employee regularization
5. attendance offline sync and receipt lookup
6. field session lifecycle and ping batches

For every endpoint:

- [x] use `HrmsProductTokenGuard`
- [x] require the narrowest HRMS permission
- [x] derive tenant/user/membership from token claims
- [x] resolve employee server-side; do not trust a client employee ID
- [x] enforce tenant isolation in repository queries
- [ ] add unit, service, guard, controller, and OpenAPI contract tests
- [ ] add request ID, audit, idempotency, and stable error codes

**Exit gate:** every active Flutter HRMS repository has a real separated HRMS
endpoint and contract test.

### Phase 3: migrate Flutter authentication and networking

- [x] Add `PlatformApiClient`, `HrmsApiClient`, and session coordinator.
- [x] Add product-token exchange and single-flight renewal.
- [x] Route notifications and identity calls to Platform.
- [x] Route all HRMS product calls to `/api/hrms/v1/*`.
- [ ] Replace hand-written dynamic maps with generated DTOs at network edges.
- [x] Point local Android/iOS builds at the gateway on `4080` using the correct
  emulator, simulator, or `adb reverse` address.
- [x] Remove direct internal-service ports from distributable configurations.

**Exit gate:** static analysis finds no legacy flat HRMS URL and no generic
single-token client used for both authorities.

### Phase 4: migrate background and offline behavior

- [x] Add headless session bootstrap.
- [x] Scope and migrate queues and integrity secrets.
- [x] Replay bounded batches with server receipts.
- [ ] Test crash, duplicate, out-of-order, expired token, tenant switch, logout,
  revoked entitlement, and blocked-device paths.
- [x] Ensure logout cancels workers and removes all identity-scoped data.

**Exit gate:** background attendance and tracking succeed through the gateway
after the foreground process has been killed, without cross-tenant data access.

### Phase 5: HRMS mobile CI and release ownership

- [x] Add format, analyze, unit/widget, golden, generated-contract drift, and
  architecture jobs.
- [ ] Add Android emulator integration tests through the real local stack.
- [ ] Add iOS simulator integration tests on a macOS runner.
- [ ] Build signed artifacts only from protected HRMS release workflows.
- [ ] Store signing credentials and package-registry tokens in repository or
  deployment secrets, never in source.
- [ ] Record artifact checksums, contract version, backend compatibility, and
  rollback release for every build.

**Exit gate:** HRMS CI independently produces and validates the application
without reading files from the Platform repository.

### Phase 6: local and staging end-to-end verification

Run the real topology:

```text
Flutter -> gateway :4080
             |-> Platform API
             `-> HRMS API
```

Required scenarios:

- [x] workspace selection and Platform mobile login
- [x] HRMS product-token exchange and audience verification
- [ ] device registration and replacement/block behavior
- [x] home/profile/runtime loading
- [x] online check-in, break, check-out, history, and day detail
- [ ] offline punch, app kill, reconnect, replay, and duplicate replay
- [ ] biometric consent/enrollment and evidence upload failure/retry
- [x] leave and regularization lifecycle
- [ ] field tracking in foreground and background
- [x] Platform notifications while HRMS APIs use the product token
- [ ] token expiry, stale entitlement, removed HRMS product, tenant suspension,
  membership revocation, logout, and tenant/account switch
- [ ] Android physical device/emulator and iOS physical device/simulator

**Exit gate:** Playwright web tests, Flutter integration tests, Platform tests,
HRMS tests, gateway smoke tests, and published-contract compatibility tests all
pass against the same release candidates.

### Phase 7: remove the Platform copy

Only after Phases 0-6 pass:

- [ ] tag or archive the last parity commit for traceability
- [ ] remove `CRM/apps/mobile`
- [ ] remove Platform mobile build/release scripts and dependencies
- [ ] retain only Platform-owned contract artifacts and integration docs
- [ ] add a Platform architecture test that rejects reintroduction of HRMS
  mobile source
- [ ] update all docs, CODEOWNERS, CI paths, and developer bootstrap commands

**Exit gate:** Platform builds and deploys with no HRMS mobile source, while the
HRMS repository independently builds, tests, and releases the same application.

### Phase 8: staged deployment and rollback

- [ ] deploy compatible Platform and HRMS APIs before releasing the migrated app
- [ ] verify JWKS, issuer, audience, gateway paths, CORS where applicable,
  object-storage presigns, and internal entitlement lookups
- [ ] release to internal testers, then a small production cohort
- [ ] monitor auth exchange failures, 401/403 codes, queue age, sync duplicate
  rate, punch latency, field batch failures, and crash-free sessions
- [ ] expand rollout only after the observation window passes
- [ ] retain the previous app version and compatible backend window for rollback

**Exit gate:** the rollout completes without legacy HRMS route traffic and with
an exercised rollback procedure.

## 10. Test strategy

### Tests to retain

- UI widget and golden tests
- domain and repository behavior tests
- secure-storage and local queue unit tests
- accessibility and localization tests
- release-configuration checks

### Tests to replace or update

- route assertions that require flat HRMS URLs
- mock responses based on the old monolith payloads
- tests that assume one access token can call both Platform and HRMS
- tests that open an unscoped global queue

### New mandatory tests

- no-legacy-route static test over all Dart source and config files
- active OpenAPI-to-generated-Dart drift test
- Platform session and HRMS product-token state-machine tests
- concurrent 401 single-flight tests
- issuer, audience, expiry, tenant, membership, entitlement, and permission tests
- background-isolate authentication tests
- tenant/account queue isolation and local schema migration tests
- idempotency and partial-batch receipt tests
- full gateway integration tests with real Platform and HRMS services
- Android and iOS end-to-end smoke tests

The existing test count is not a release gate by itself. Coverage must be tied
to current topology, contracts, security boundaries, and real runtime behavior.

## 11. Definition of done

The mobile migration is complete only when all of the following are true:

- one canonical Flutter source exists under `deltcrm-hrms`
- Platform contains no HRMS mobile business source
- every HRMS request uses `/api/hrms/v1/*` and an HRMS product token
- every Platform request uses the Platform client and session token
- no active code, test, configuration, or documentation requires a legacy flat
  HRMS endpoint
- foreground and background flows restore the correct tenant identity safely
- offline data is tenant/user/membership/employee/device scoped
- generated Dart contracts come from active versioned runtime specifications
- HRMS independently builds, tests, signs, releases, observes, and rolls back
  Android and iOS applications
- local, CI, staging, and production-compatible smoke tests pass through the
  public gateway
- entitlement removal, tenant suspension, inactive identity, blocked device,
  token expiry, logout, and tenant switch all fail closed

## 12. Current readiness conclusion

The separated mobile client implementation is now locally buildable and its
unit, widget, golden, architecture, OpenAPI-surface, contract-drift, route,
tenant-isolation and release-configuration gates pass. Android debug and iOS
simulator builds also pass. The active HRMS specification exposes all 35 planned
mobile operations. Platform and HRMS tokens are separated in foreground and
background execution, and no active mobile API/configuration path uses a legacy
flat HRMS URL or internal service port.

The migration is **still not authorized for production release or Platform-copy
removal**. A real local Platform-to-gateway-to-HRMS run now passes, but the
following exit evidence remains incomplete:

- publish product-contract `1.1.0` and install that exact immutable release in
  Platform and HRMS; local GitHub Packages authentication currently returns
  `401` because `NODE_AUTH_TOKEN` is unavailable;
- add explicit response DTO schemas to every mobile OpenAPI operation and use
  the resulting generated models at all Flutter network boundaries;
- complete the full failure-path matrix for background kill/replay, entitlement
  revocation, device replacement, tenant switching and provider outages;
- produce protected signed artifacts, checksums, compatibility/rollback
  metadata, physical Android/iOS evidence, staging results, provider/legal
  certification and rollout observation evidence.

Until those gates pass, retain `CRM/apps/mobile` as the synchronized read-only
copy and keep production biometric/integrity enforcement disabled.

## 13. Implementation evidence (2026-08-11)

- Active separated HRMS OpenAPI mobile surface: **35/35**.
- HRMS API: lint and typecheck pass; 45 suites / 213 tests pass with five suites
  and 14 environment-dependent tests skipped; production compilation passes.
- Flutter: analyze passes; all 94 unit/widget/golden/repository/offline
  executions pass.
- Contract package `1.1.0` source: validation, generated-client, typecheck,
  build, backward compatibility and package artifact checks pass.
- Platform product integration: six suites / 52 tests pass; Platform typecheck
  passes.
- Native artifacts: Android debug APK and unsigned iOS simulator build pass.
- Canonical/transitional parity: 254 files pass after excluding generated golden
  failure diagnostics; HRMS remains the only editable/release source.
- The credentialed iPhone 17 Pro simulator integration test passes through the
  public gateway on `:4080` against current Platform and HRMS processes with
  isolated databases. It proves Platform login, HRMS token exchange, audience
  rejection, device registration, runtime/profile/preferences, biometric
  consent, signed private-object upload and face enrollment, attendance
  check-in/break/check-out/history/day, offline receipt/idempotency,
  regularization, leave, field-session/ping lifecycle, Platform notifications,
  logout, and repeat-run behavior.
- The real run exposed and fixed two server defects: the admin biometric route
  captured `/face-enrollments/me/status`, and duplicate regularization for an
  attendance day escaped as an internal error. The routes are now unambiguous
  and duplicate submissions return stable
  `409 REGULARIZATION_ALREADY_EXISTS` semantics.
- Android debug APK and unsigned iOS simulator application builds pass from the
  canonical HRMS source after the real-stack fixes.
