# Sprint 5 Implementation Plan

## Mobile Trust, Verification Pipeline and Security Alerts

**Status:** Complete for local/MVP scope; production trust-provider certification is explicitly deferred to Sprint 6 work package 6.0
**Depends on:** Sprint 4 attendance aggregate and punch contracts
**Primary references:** roadmap Phase 3; `verification-pipeline.ts`; feature sections 3.5 and 4.1-4.2
**Sprint exit:** Registered mobile devices can submit online punches through integrity, location and face checks; every pass/fail attempt is forensicly logged and failures create actionable security alerts.

## 1. Included Scope

- Flutter application foundation and generated API client
- Device registration, approval, block and replacement chain
- Device-bound refresh tokens and platform integrity adapters
- Biometric consent and face enrollment with liveness
- Verification pipeline and safe machine-readable failures
- Mobile home, punch, breaks, history, day detail, profile and settings
- Alert rules/security alert lifecycle and H14
- HR employee device queue, employee detail, device decisions and biometric reset controls

## 2. API Contract

### Devices

- `POST /devices/register`
- `GET /devices`
- `GET /devices/me`
- `POST /devices/:id/approve`
- `POST /devices/:id/block`
- `POST /devices/:id/replace`

### Consent and enrollment

- `GET /biometric-consents/me`
- `POST /biometric-consents`
- `DELETE /biometric-consents/me`
- `POST /face-enrollments/presign`
- `POST /face-enrollments`
- `GET /face-enrollments/me/status`
- `GET /face-enrollments/:employeeId/status`
- `POST /face-enrollments/:employeeId/reset`

### Verified punches and security

- Extend Sprint 4 punch DTO with device, integrity, location, client time, app/OS and selfie evidence
- `GET /verification-logs`
- `GET|POST /alert-rules`
- `PATCH|DELETE /alert-rules/:id`
- `GET /security-alerts`
- `GET /security-alerts/:id`
- `POST /security-alerts/:id/acknowledge`
- `POST /security-alerts/:id/resolve`
- `POST /security-alerts/:id/dismiss`

## 3. Verification Pipeline

- [X] Ordered checks: device binding, app integrity/root, clock skew, location method, geofence/IP OR-rule, biometric consent, liveness and face match
- [X] Policy decides required/skipped checks for office, remote and field employees
- [X] Always persist verification log before returning pass or fail
- [X] Only a fully passed pipeline calls the Sprint 4 attendance aggregate
- [X] Enforce maximum face attempts and lockout window
- [X] Store private selfie keys; signed reads require forensic permission and short expiry
- [X] Client receives safe fields such as distance/accuracy/attempts remaining, never internal thresholds or provider payloads
- [X] Provider ports support production integrity/face/liveness gateways and deterministic test fakes
- [ ] Native production attestation, a selected face/liveness vendor and physical-device certification are deferred to Sprint 6 work package 6.0

## 4. Device and Consent Rules

- [X] One active primary device per employee
- [X] Approval/block/replace requires reason, actor and audit
- [X] Blocking a device revokes device-bound refresh sessions
- [X] Consent stores version, IP, UA and timestamp
- [X] Withdrawal removes biometric eligibility and routes to policy-approved GPS-only behavior
- [X] Face profile is HR-controlled/locked; employee cannot arbitrarily replace it

## 5. Flutter Implementation

- [X] Riverpod, go_router, OpenAPI-generated route contract, Dio, secure token storage and refresh interceptor
- [X] M1-M5 splash, login, registration, consent and enrollment
- [X] M6 home/today with resolved shift/location state
- [X] M7-M10 camera, verification, success and coded failure variants
- [X] M11 breaks; M12 history; M13 day detail
- [X] M19 profile; M20 permissions/device health
- [X] Camera/location/notification permissions use explicit rationale and degraded states
- [X] M1-M13 and M19-M20 screen classes and routes exist in the Flutter application
- [X] All mobile routes render without exceptions at 320x568, 390x844 and 430x932
- [X] Deterministic 390 px layout baselines cover the M1-M13/M19-M20 route inventory
- [X] Product decision preserves the existing charcoal/white palette and current typography; Stitch is the layout and state reference, not the color/font source

## 6. Security Alerts

- [X] Seed configurable rules for geofence, face, mock location, rooted device, clock tamper and device mismatch
- [X] Subscriber creates alerts from rejection events with cooldown and department scope
- [X] Evidence contains map point, distance, score category and selfie key under strict permissions
- [X] H14 supports filters, signed evidence, acknowledge/resolve/dismiss and block-device action
- [X] HR can review all employee registrations, approve/block/replace with a reason, open employee details and reset a locked face profile

## 7. Ordered Work Packages

- [X] 5.0 Flutter foundation and contracts
- [X] 5.1 Device trust and device-bound sessions
- [X] 5.2 Consent, enrollment and private evidence storage
- [X] 5.3 Verification pipeline and provider adapters
- [X] 5.4 Security rule evaluator, alert lifecycle and H14
- [X] 5.5 M1-M13/M19-M20 integration and hardening
- [X] 5.6 HR device and biometric management completion

## 8. Test Plan

- [X] Unit matrix for each check: pass, fail, skip and provider unavailable
- [X] Office geofence OR egress-IP; field GPS/accuracy mandatory
- [X] Face attempts, consent withdrawal, device replacement and refresh revocation
- [X] Safe-error snapshots prove no score, IP, token or provider payload leakage
- [X] E2E rejection creates verification log and open alert without attendance event
- [X] E2E pass creates verification log and attendance event atomically
- [X] Flutter widget states and mocked-provider flow on supported device matrix
- [X] Rooted/mock-GPS/wrong-face/two-km-away scenarios return documented codes
- [X] Browser E2E covers HR approve, block, replace, face reset and compact viewport behavior

## 9. Definition of Done

- [X] Every accepted online mobile punch attempt has durable forensic evidence
- [X] Attendance events are impossible on failed verification
- [X] Device/consent/face data is tenant-isolated and access audited
- [X] H14 and mobile flows are API-connected
- [X] Biometric DPA, retention and deletion checkpoint is documented
- [X] Security, build, test, RLS and mobile quality gates pass
- [ ] Production provider, DPA and physical-device certification gate is owned by Sprint 6 work package 6.0

## 10. Progress Tracker

| Work package                         | Status      | Evidence                                                                                                                                                                                |
| ------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.0 Flutter foundation and contracts | Complete | Riverpod/go_router/Dio, secure refresh storage/interceptor and OpenAPI-generated Flutter route contract; generation fails on required route drift |
| 5.1 Device trust and sessions        | Complete | Device registration/approval/block/replace/self-removal, one-primary constraint, device-bound JWT/refresh enforcement, audit and revocation e2e |
| 5.2 Consent and enrollment           | Complete | Versioned consent, private presign/upload, signed liveness proof, locked enrollment, withdrawal revocation and evidence deletion |
| 5.3 Verification pipeline            | Complete | Ordered fail-closed checks, safe errors, immutable forensic log, provider gateways/fakes and atomic Sprint 4 punch integration |
| 5.4 Security alerts and H14          | Complete | Six seeded rules, scoped cooldown evaluator, lifecycle API, audited 60-second evidence reads and API-connected H14 |
| 5.5 Mobile integration/hardening     | Complete | Live device pending/blocked/active gating, consent load/withdraw/resume, enrollment eligibility/status/capture resume, coded failure recovery and successful punch states pass functional widget coverage. All 20 routes pass layout, three-size, degraded-state, 200% text, semantics, tap-target and contrast gates. |
| 5.6 HR device/biometric management   | Complete | API-connected employee device queue and employee detail route; reason-gated approve/block/replace and face reset pass API and Playwright E2E |
| 6.0 Production trust certification   | Deferred | Native attestation, selected face/liveness and map providers, durable deletion worker, legal approval and physical-device certification are mandatory Sprint 6 scope |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

## 11. Implementation Specification

### 11.1 Bounded contexts and ports

```text
apps/api/src/modules/
├── device-trust/        # registry, approval, attestation, bound sessions
├── biometrics/          # consent, enrollment refs, evidence access
├── attendance/verification/
│   ├── domain/checks/   # device, integrity, location, face
│   ├── application/     # pipeline orchestration
│   └── infrastructure/  # provider adapters
└── security-alerts/     # rules, evaluator and lifecycle
apps/mobile/lib/features/
├── auth/ device/ consent/ enrollment/
├── attendance/ security/ profile/
```

Provider ports are `DeviceIntegrityProvider`, `FaceMatchProvider`, `PrivateEvidenceStorage` and `PushTokenRegistry`. Domain checks never import vendor SDKs. The verification orchestrator is the only assembly point for check order.

### 11.2 Permission matrix

| Resource/action                      | Permission/scope                                                |
| ------------------------------------ | --------------------------------------------------------------- |
| Register/view own device and consent | authenticated employee self                                     |
| List employee devices                | `attendance.devices.read` with manager/HR scope               |
| Approve/block/replace                | `attendance.devices.manage`                                   |
| Enroll own face                      | self plus active consent/policy; HR override separately audited |
| Verification logs                    | `attendance.verification.read` with forensic redaction policy |
| Alert rules                          | `attendance.alert-rules.manage`                               |
| Security alerts                      | `attendance.security-alerts.read/manage`                      |

### 11.3 DTO contracts

| DTO                       | Fields                                                                  | Validation/security                                                      |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `RegisterDeviceDto`     | UUID, platform, model, OS/app version, push token                       | UUID normalized; platform enum; push token write-only/redacted           |
| `DeviceDecisionDto`     | reason                                                                  | 5-500 chars; actor from JWT only                                         |
| `ReplaceDeviceDto`      | old/new IDs, reason                                                     | same employee/tenant; new pending; old active                            |
| `CreateConsentDto`      | policy version, accepted boolean                                        | version must equal current published text; IP/UA observed server-side    |
| `CompleteEnrollmentDto` | private object key, liveness proof token                                | tenant/employee object prefix; one-time proof; content metadata verified |
| `VerifiedPunchDto`      | type, device UUID, attestation token, client time, location, selfie key | bounded strings; coordinate/accuracy ranges; raw observed IP excluded    |
| `AlertDecisionDto`      | note                                                                    | lifecycle-specific, 1-1000 chars                                         |

Attestation tokens and selfie upload URLs are write-only and never echoed. Failure response is `{ code, message, details: { distanceMeters?, accuracyMeters?, attemptsRemaining?, regularizationAllowed? } }`.

### 11.4 Check matrix

| Work/policy           | Device  | Integrity | Location                                     | Face             |
| --------------------- | ------- | --------- | -------------------------------------------- | ---------------- |
| WEB source            | skipped | skipped   | server IP evidence only                      | skipped          |
| OFFICE mobile         | policy  | required  | assigned geofence OR observed egress IP      | policy + consent |
| FIELD mobile          | policy  | required  | GPS required, accuracy <= configured maximum | policy + consent |
| HYBRID inside office  | policy  | required  | office OR-rule                               | policy + consent |
| HYBRID outside office | policy  | required  | field GPS rules                              | policy + consent |

Checks short-circuit for response latency but persist completed results and terminal reason. Provider outage returns a retryable service code and never treats unavailable verification as passed.

### 11.5 Error catalog

| Code                                  | Status | Mobile action                            |
| ------------------------------------- | -----: | ---------------------------------------- |
| `DEVICE_NOT_REGISTERED`             |    422 | Open M3/contact HR                       |
| `DEVICE_PENDING_APPROVAL`           |    423 | Pending state                            |
| `DEVICE_BLOCKED`                    |    403 | Contact HR                               |
| `DEVICE_NOT_OWNED`                  |    403 | Security warning                         |
| `INTEGRITY_FAILED`                  |    422 | Retry/help                               |
| `ROOTED_DEVICE`                     |    422 | Unsupported device                       |
| `MOCK_LOCATION`                     |    422 | Disable mock apps                        |
| `GPS_ACCURACY_TOO_LOW`              |    422 | Improve signal/retry                     |
| `NO_OFFICE_ASSIGNED`                |    422 | Contact HR                               |
| `OUTSIDE_GEOFENCE`                  |    422 | M10 map/regularization                   |
| `CONSENT_MISSING`                   |    422 | Open M4                                  |
| `FACE_NOT_ENROLLED`                 |    422 | Open M5                                  |
| `LIVENESS_FAILED`                   |    422 | Camera guidance                          |
| `FACE_MISMATCH`                     |    422 | Attempts remaining                       |
| `FACE_ATTEMPTS_EXCEEDED`            |    429 | Wait/contact HR                          |
| `VERIFICATION_PROVIDER_UNAVAILABLE` |    503 | Retryable, no alert fraud classification |

### 11.6 Migration and evidence controls

- [X] Add explicit relations/check constraints missing from v4 schema where Prisma permits
- [X] One active primary device per employee partial unique index
- [X] Enrollment reference/version fields and replacement audit trail if absent
- [X] Verification logs and biometric consent history are append-only
- [X] Private evidence keys cannot be cross-tenant and signed reads are audited
- [X] Index logs/alerts by tenant, employee, status and time; partition creation included
- [X] Raw integrity JSON, observed IP and face score are excluded from general serializers/logs
- [X] Consent withdrawal/deletion workflow records legal audit without retaining deleted biometric material

### 11.7 Flutter architecture and state contract

- [X] Riverpod state separates permission, device, enrollment, verification and attendance state; widgets do not call Dio directly.
- [X] Secure storage contains refresh credentials and device identity; no selfie, face reference or provider token is deliberately persisted by the current client.
- [X] Camera flow compresses/validates image before private upload and clears temporary files after terminal outcome.
- [X] A shared application gate gives every M1-M13/M19-M20 route offline, provider unavailable, session expired and suspended-workspace states; capability and punch flows implement permission-denied recovery/degraded behavior.
- [X] Accessibility includes automated semantic-label, 48 px Android tap-target, WCAG text-contrast and 200% dynamic-text verification across the route inventory.

### 11.8 Design-reference acceptance

- [X] Treat Stitch as a visual and interaction reference, not an implementation contract; resolve inconsistencies in favor of this sprint specification, domain invariants, accessibility and tested user flows.
- [X] Archive full-resolution Stitch M1-M20 HTML/PNG references from project `765558164052647240`; retain the approved charcoal/white theme and current typography while using Stitch for useful layout/state guidance.
- [X] Implement the M10 outcomes as one code-driven failure component rather than separate duplicated screens.
- [X] Render the mobile route inventory at the 390 px reference and small/large test sizes without Flutter exceptions.
- [X] Preserve camera lifecycle and OS permission boundaries; native dialogs are not visually cloned.
- [X] H14 evidence thumbnails load only after authorization and signed URL retrieval.
- [X] Functional widget tests cover device pending/blocked/active, consent active/withdrawn, enrollment active/no-consent/capture, successful punch route and code-driven location/face/mock-GPS failure recovery.

### 11.9 Acceptance identities

Use four fixed employees: office-valid, field-valid, hybrid, and inactive. Use devices in pending/active/blocked/replaced states and provider fixtures for pass, wrong face, liveness fail, root, mock GPS, 2.1 km outside geofence and transient provider outage. The gate asserts exact code, persisted evidence, alert result, attendance-event count and mobile state for each row.

## 12. Current Implementation Audit (2026-07-17)

This audit separates a rendered screen from a completed Sprint 5 workflow. A screen is not considered API-complete when it uses local mode, fixture content, placeholder evidence or simulated timers.

### 12.1 Mobile screen coverage

| Screen                        | Current implementation                                                   | Verification evidence                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| M1 Splash                     | Branded route with session bootstrap and shared availability handling | Reference and deterministic route baseline archived |
| M2 Login                      | Validated tenant login, credential storage, refresh handling and password visibility semantics | Reference and deterministic route baseline archived |
| M3 Device registration        | Live device identity, registry state, registration and pending/blocked/replaced API handling | Functional pending, blocked and active continuation tests pass |
| M4 Biometric consent          | Current policy/consent loading, acceptance, withdrawal and GPS-only opt-out behavior | Functional active, withdrawn and re-consent tests pass |
| M5 Face enrollment            | Presign/upload/liveness completion, status loading and temporary-file cleanup | Functional enrolled, missing-consent and capture-ready tests pass |
| M6 Home/today                 | Live authenticated employee, shift, location and attendance summary | Reference and deterministic route baseline archived |
| M7 Punch camera               | Front-camera lifecycle, rationale, compression, GPS, integrity and private evidence submission | Reference and deterministic route baseline archived |
| M8 Verification               | API-driven verification progress and retryable provider outcome handling | Reference and deterministic route baseline archived |
| M9 Success                    | Server-confirmed attendance event and verification evidence | Route baseline and atomic pass e2e pass |
| M10 Failure                   | Safe code-driven failure component for documented API outcomes | Location, face-attempt and mock-GPS recovery tests pass |
| M11 Breaks                    | Live Sprint 4 break start/end repository and controller flow | Reference and deterministic route baseline archived |
| M12 History                   | Live month history with responsive calendar and API error/loading states | Reference and deterministic route baseline archived |
| M13 Day detail                | Live selected-day timeline and authorized evidence state | Reference and deterministic route baseline archived |
| M19 Profile                   | Live authenticated employee, organization assignment and settings route | Reference and deterministic route baseline archived |
| M20 Permissions/device health | OS capability inspection/recovery, device health and shared degraded/session states | Reference and deterministic route baseline archived |

### 12.2 Backend and web coverage

- [X] The initial Prisma migration contains `RegisteredDevice`, `BiometricConsent`, `AttendanceVerificationLog`, `AlertRule` and `SecurityAlert` data foundations.
- [X] Sprint 5 device-trust controllers/services, attestation provider and device-bound session enforcement are implemented.
- [X] Biometrics controllers/services, private evidence storage and face/liveness provider adapters are implemented.
- [X] The ordered verification pipeline is implemented and connected atomically to Sprint 4 attendance writes.
- [X] Security alert evaluation/lifecycle endpoints and H14 are implemented in the API/web application.
- [X] HR device queue and employee detail screens expose audited device decisions and safe biometric status/reset controls.
- [X] The exported OpenAPI contract and TypeScript contracts are regenerated; required Flutter routes are generated with a drift gate.

### 12.3 Verified evidence

- [X] `flutter analyze` passes with no issues on 2026-07-17.
- [X] `flutter test` passes 62 tests on 2026-07-17.
- [X] Tests cover centralized routes/contracts, feature structure, navigation behavior, English/Arabic tenant behavior, permission degradation, shared availability states and route rendering at three viewport sizes.
- [X] Tests cover provider decisions, tenant/RLS isolation, safe errors, atomic pass/fail persistence and device/session revocation.
- [X] Full-resolution Stitch HTML/PNG references and deterministic current-route screenshots are archived for M1-M13/M19-M20.
- [X] Functional state coverage replaces pixel-parity as the completion gate; archived Stitch/current-route images remain design evidence only.

### 12.4 Completion evidence (2026-07-17)

- Sprint 5 migrations through `20260717170000_sprint5_verification_log_partitions` are applied; Prisma reports 26 migrations with no pending migration.
- `pnpm security:check`, API build/typecheck/lint and web build/typecheck/lint pass. Web lint has five non-blocking pre-existing font/image optimization warnings.
- API unit gate: 28 suites and 186 tests passed, including a 13-row direct pass/fail/skip/provider-unavailable verification matrix and exact-IP/IPv4/IPv6 CIDR matching.
- Sprint 5 database e2e gate: 5 tests passed for device/session lifecycle, append-only consent/enrollment/deletion, office-CIDR/field-GPS verification, atomic pass/fail persistence, failure-code safety, alert lifecycle, partitioning and RLS/immutability.
- Flutter gate: `flutter analyze` passes and 62 tests pass, including 20 deterministic route-layout baselines, device/consent/enrollment/failure state workflows, compressed evidence validation, shared offline/provider/session/workspace states, permission degradation, and all required routes at 320x568, 390x844, 430x932, 200% system text scaling, labeled controls, Android tap targets and WCAG text contrast.
- `pnpm openapi:generate` regenerates `docs/openapi.json`, TypeScript contracts and required Flutter route constants with a drift failure gate.
- Sprint 5 Playwright gate: 10 tests pass. Five cover HR device approve/block/replace, biometric reset and compact layout; five cover H14 evidence authorization, device blocking, filtering, acknowledge, resolve and dismiss.
- H14 source is archived at `docs/stitch_raw/sprint-5/H14-security-violations.html`. Mobile M1-M20 source HTML and full-resolution PNG references from Stitch project `765558164052647240` are archived under `docs/stitch_raw/sprint-5/mobile/`.
- The current Flutter route baselines are archived under `apps/mobile/test/goldens/sprint5/`; layout tests cover all 20 routes at the 390 px reference viewport.
- Production launch is **not yet certified**. Native Play Integrity/App Attest integration, a selected face/liveness vendor, a real map provider, durable retryable biometric deletion, deployment proxy/IP validation, jurisdictional legal approval and physical-device testing are implementation/certification work explicitly carried into Sprint 6 work package 6.0.

### 12.5 Explicit Sprint 6 deferrals

- Implement native Android/iOS attestation and server-side receipt verification; the release mobile client currently fails closed because no production token SDK is selected.
- Select and integrate a production face/liveness provider; current development behavior uses deterministic fakes and the production API exposes only a generic HTTPS gateway contract.
- Select and integrate the map provider required by H2/H3; Sprint 5 captures coordinates but ships no map SDK.
- Add durable retry/dead-letter processing for biometric object deletion and prove storage-outage recovery.
- Validate the deployment load-balancer trust list and office IP/CIDR behavior without trusting arbitrary forwarded headers.
- Complete jurisdictional biometric/privacy approval and certification on supported physical Android/iOS devices.
- Continue visual refinement from Stitch/user review without allowing reference inconsistencies to override tested product behavior.

### 12.6 Completion result

1. All Sprint 5 API/domain work packages pass unit, database e2e, RLS, security, contract and build gates.
2. All Sprint 5 mobile routes and required functional states pass widget, responsive and accessibility gates.
3. Work packages 5.0-5.6 are complete for the local/MVP environment; Sprint 5 must not be represented as production-ready until Sprint 6 work package 6.0 passes.

### 12.7 Mobile layout audit (2026-07-17)

- The 20 approved Stitch mobile HTML/PNG references are mapped to deterministic Flutter route baselines at the 390 px reference viewport.
- The existing charcoal/white palette, typography and compact card language are an approved product decision and remain unchanged; Stitch supplies layout hierarchy and state coverage.
- Shared safe areas, scroll containers, card spacing and bottom navigation are consistent across the route inventory and pass compact, reference and large viewport checks.
- M10 was rebuilt from a sparse list tile into one code-driven failure layout with contextual location/face/device guidance, retry, optional regularization and an explicit safe error code.
- No Flutter overflow, unlabeled control, undersized Android target or automated text-contrast failure remains in the default route inventory.
- Stitch differences remain eligible for iterative design refinement but are not functional completion blockers.
