# Sprint 5 Implementation Plan

## Mobile Trust, Verification Pipeline and Security Alerts

**Status:** Not started  
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

- [ ] Ordered checks: device binding, app integrity/root, clock skew, location method, geofence/IP OR-rule, biometric consent, liveness and face match
- [ ] Policy decides required/skipped checks for office, remote and field employees
- [ ] Always persist verification log before returning pass or fail
- [ ] Only a fully passed pipeline calls the Sprint 4 attendance aggregate
- [ ] Enforce maximum face attempts and lockout window
- [ ] Store private selfie keys; signed reads require forensic permission and short expiry
- [ ] Client receives safe fields such as distance/accuracy/attempts remaining, never internal thresholds or provider payloads
- [ ] Provider ports support Rekognition/liveness and test fakes

## 4. Device and Consent Rules

- [ ] One active primary device per employee
- [ ] Approval/block/replace requires reason, actor and audit
- [ ] Blocking a device revokes device-bound refresh sessions
- [ ] Consent stores version, IP, UA and timestamp
- [ ] Withdrawal removes biometric eligibility and routes to policy-approved GPS-only behavior
- [ ] Face profile is HR-controlled/locked; employee cannot arbitrarily replace it

## 5. Flutter Implementation

- [ ] Riverpod, go_router, Dio client generation, secure token storage and refresh interceptor
- [ ] M1-M5 splash, login, registration, consent and enrollment
- [ ] M6 home/today with resolved shift/location state
- [ ] M7-M10 camera, verification, success and coded failure variants
- [ ] M11 breaks; M12 history; M13 day detail
- [ ] M19 profile; M20 permissions/device health
- [ ] Camera/location/notification permissions use explicit rationale and degraded states

## 6. Security Alerts

- [ ] Seed configurable rules for geofence, face, mock location, rooted device, clock tamper and device mismatch
- [ ] Subscriber creates alerts from rejection events with cooldown and department scope
- [ ] Evidence contains map point, distance, score category and selfie key under strict permissions
- [ ] H14 supports filters, signed evidence, acknowledge/resolve/dismiss and block-device action

## 7. Ordered Work Packages

- [ ] 5.0 Flutter foundation and contracts
- [ ] 5.1 Device trust and device-bound sessions
- [ ] 5.2 Consent, enrollment and private evidence storage
- [ ] 5.3 Verification pipeline and provider adapters
- [ ] 5.4 Security rule evaluator, alert lifecycle and H14
- [ ] 5.5 M1-M13/M19-M20 integration and hardening

## 8. Test Plan

- [ ] Unit matrix for each check: pass, fail, skip and provider unavailable
- [ ] Office geofence OR egress-IP; field GPS/accuracy mandatory
- [ ] Face attempts, consent withdrawal, device replacement and refresh revocation
- [ ] Safe-error snapshots prove no score, IP, token or provider payload leakage
- [ ] E2E rejection creates verification log and open alert without attendance event
- [ ] E2E pass creates verification log and attendance event atomically
- [ ] Flutter widget states and mocked-provider flow on supported device matrix
- [ ] Rooted/mock-GPS/wrong-face/two-km-away scenarios return documented codes

## 9. Definition of Done

- [ ] Every online mobile attempt has durable forensic evidence
- [ ] Attendance events are impossible on failed verification
- [ ] Device/consent/face data is tenant-isolated and access audited
- [ ] H14 and mobile flows are API-connected
- [ ] Biometric DPA, retention and deletion checkpoint is documented
- [ ] Security, build, test, RLS and mobile quality gates pass

## 10. Progress Tracker

| Work package | Status | Evidence |
|---|---|---|
| 5.0 Flutter foundation and contracts | Not started | |
| 5.1 Device trust and sessions | Not started | |
| 5.2 Consent and enrollment | Not started | |
| 5.3 Verification pipeline | Not started | |
| 5.4 Security alerts and H14 | Not started | |
| 5.5 Mobile integration/hardening | Not started | |

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

| Resource/action | Permission/scope |
|---|---|
| Register/view own device and consent | authenticated employee self |
| List employee devices | `attendance.devices.read` with manager/HR scope |
| Approve/block/replace | `attendance.devices.manage` |
| Enroll own face | self plus active consent/policy; HR override separately audited |
| Verification logs | `attendance.verification.read` with forensic redaction policy |
| Alert rules | `attendance.alert-rules.manage` |
| Security alerts | `attendance.security-alerts.read/manage` |

### 11.3 DTO contracts

| DTO | Fields | Validation/security |
|---|---|---|
| `RegisterDeviceDto` | UUID, platform, model, OS/app version, push token | UUID normalized; platform enum; push token write-only/redacted |
| `DeviceDecisionDto` | reason | 5-500 chars; actor from JWT only |
| `ReplaceDeviceDto` | old/new IDs, reason | same employee/tenant; new pending; old active |
| `CreateConsentDto` | policy version, accepted boolean | version must equal current published text; IP/UA observed server-side |
| `CompleteEnrollmentDto` | private object key, liveness proof token | tenant/employee object prefix; one-time proof; content metadata verified |
| `VerifiedPunchDto` | type, device UUID, attestation token, client time, location, selfie key | bounded strings; coordinate/accuracy ranges; raw observed IP excluded |
| `AlertDecisionDto` | note | lifecycle-specific, 1-1000 chars |

Attestation tokens and selfie upload URLs are write-only and never echoed. Failure response is `{ code, message, details: { distanceMeters?, accuracyMeters?, attemptsRemaining?, regularizationAllowed? } }`.

### 11.4 Check matrix

| Work/policy | Device | Integrity | Location | Face |
|---|---|---|---|---|
| WEB source | skipped | skipped | server IP evidence only | skipped |
| OFFICE mobile | policy | required | assigned geofence OR observed egress IP | policy + consent |
| FIELD mobile | policy | required | GPS required, accuracy <= configured maximum | policy + consent |
| HYBRID inside office | policy | required | office OR-rule | policy + consent |
| HYBRID outside office | policy | required | field GPS rules | policy + consent |

Checks short-circuit for response latency but persist completed results and terminal reason. Provider outage returns a retryable service code and never treats unavailable verification as passed.

### 11.5 Error catalog

| Code | Status | Mobile action |
|---|---:|---|
| `DEVICE_NOT_REGISTERED` | 422 | Open M3/contact HR |
| `DEVICE_PENDING_APPROVAL` | 423 | Pending state |
| `DEVICE_BLOCKED` | 403 | Contact HR |
| `DEVICE_NOT_OWNED` | 403 | Security warning |
| `INTEGRITY_FAILED` | 422 | Retry/help |
| `ROOTED_DEVICE` | 422 | Unsupported device |
| `MOCK_LOCATION` | 422 | Disable mock apps |
| `GPS_ACCURACY_TOO_LOW` | 422 | Improve signal/retry |
| `NO_OFFICE_ASSIGNED` | 422 | Contact HR |
| `OUTSIDE_GEOFENCE` | 422 | M10 map/regularization |
| `CONSENT_MISSING` | 422 | Open M4 |
| `FACE_NOT_ENROLLED` | 422 | Open M5 |
| `LIVENESS_FAILED` | 422 | Camera guidance |
| `FACE_MISMATCH` | 422 | Attempts remaining |
| `FACE_ATTEMPTS_EXCEEDED` | 429 | Wait/contact HR |
| `VERIFICATION_PROVIDER_UNAVAILABLE` | 503 | Retryable, no alert fraud classification |

### 11.6 Migration and evidence controls

- [ ] Add explicit relations/check constraints missing from v4 schema where Prisma permits
- [ ] One active primary device per employee partial unique index
- [ ] Enrollment reference/version fields and replacement audit trail if absent
- [ ] Verification logs and biometric consent history are append-only
- [ ] Private evidence keys cannot be cross-tenant and signed reads are audited
- [ ] Index logs/alerts by tenant, employee, status and time; partition creation included
- [ ] Raw integrity JSON, observed IP and face score are excluded from general serializers/logs
- [ ] Consent withdrawal/deletion workflow records legal audit without retaining deleted biometric material

### 11.7 Flutter architecture and state contract

- Riverpod state separates permission, device, enrollment, verification and attendance state; widgets do not call Dio directly.
- Secure storage contains refresh credentials only; no selfie, face reference or provider token persists longer than required.
- Camera flow compresses/validates image before private upload and clears temporary files after terminal outcome.
- Each M1-M13/M19-M20 screen implements loading, offline, permission denied, provider unavailable, session expired and suspended tenant states.
- Accessibility includes semantic labels, dynamic text, contrast and large touch targets.

### 11.8 Stitch acceptance

- Use exact Stitch M1-M13/M19-M20 and H14 assets/layouts; implement all shown M10 variants as one code-driven failure component.
- Match 390 px mobile reference and verify small/large supported devices without clipping.
- Preserve camera safe areas and OS permission boundaries; native dialogs are not visually cloned.
- H14 evidence thumbnails load only after authorization and signed URL retrieval.
- Golden screenshots cover every failure code, device pending/blocked, consent withdrawn, no enrollment and successful punch.

### 11.9 Acceptance identities

Use four fixed employees: office-valid, field-valid, hybrid, and inactive. Use devices in pending/active/blocked/replaced states and provider fixtures for pass, wrong face, liveness fail, root, mock GPS, 2.1 km outside geofence and transient provider outage. The gate asserts exact code, persisted evidence, alert result, attendance-event count and mobile state for each row.
