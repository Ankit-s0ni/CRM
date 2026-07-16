# PROJECT ROADMAP v2 — Multi-Tenant HRMS Attendance Platform
### Complete API-first build plan (Phases 0–6) · aligned to ERD v4 / schema.prisma v4 / FEATURE-LIST.md
**Legend:** ☐ task · **[DB] [API] [WEB] [APP] [TEST] [DOC]** · Complexity S≈days M≈1–2wk L≈2–4wk · Screen IDs from STITCH-SCREEN-PROMPTS.md
**DoD every task:** merged · unit tests pass · lint/typecheck clean · reviewed · OpenAPI annotated (API tasks).

## Detailed Sprint Plans

- [Sprint index](../SPRINTS-IMPLEMENTATION-INDEX.md)
- [Sprint 1: Organization and Administration](<../Sprint list /SPRINT-1-IMPLEMENTATION.md>)
- [Sprint 2: Platform Owner Core and Operational Foundation](<../Sprint list /SPRINT-2-IMPLEMENTATION.md>)
- [Sprint 3: Admin Web and Attendance Configuration](<../Sprint list /SPRINT-3-IMPLEMENTATION.md>)
- [Sprint 4: Attendance Core and Web Runtime](<../Sprint list /SPRINT-4-IMPLEMENTATION.md>)
- [Sprint 5: Mobile Trust and Verification](<../Sprint list /SPRINT-5-IMPLEMENTATION.md>)
- [Sprint 6: Field Tracking and Offline Sync](<../Sprint list /SPRINT-6-IMPLEMENTATION.md>)
- [Sprint 7: HR Operations, Notifications, Reports and Leave](<../Sprint list /SPRINT-7-IMPLEMENTATION.md>)
- [Sprint 8: Billing, Revenue Operations and GA](<../Sprint list /SPRINT-8-IMPLEMENTATION.md>)

The phase headings below group product capabilities, not strict delivery order. Core Phase 6.2 platform-owner capabilities are intentionally pulled into Sprint 2 because tenant provisioning, module control, support, audit and health are prerequisites for subsequent tenant-module delivery. Billing-dependent platform capabilities remain in Sprint 8.

---

# PHASE 0 — Foundations (L)
**Exit:** two seeded tenants isolated via RLS (CI-gated), subdomain login works, outbox relays events.

## 0.1 Monorepo & tooling
- [ ] pnpm workspace + turbo.json; `nest new api`, `create-next-app web`, `flutter create mobile` (all --skip-git under one repo)
- [ ] ESLint+Prettier+boundaries plugin, husky/lint-staged, conventional commits
- [ ] docker-compose: postgres16, redis7, minio, mailpit · `packages/contracts` scaffold (enums/zod/OpenAPI → TS + dart-dio clients)
- [ ] CI: lint → typecheck → unit → integration(Testcontainers) → build
- [ ] **[DOC]** ADR-0001 tooling · setup README

## 0.2 Database & tenancy
- [x] **[DB]** schema.prisma v4 → `migrate dev --name init`
- [x] **[DB]** rls-and-partitions.sql migration (v4 table list — includes leave_*, employment_events, import_jobs, alert/notification tables), partitions ×4, partial uniques, append-only audit grants
- [x] **[DB]** `app_user`(no BYPASSRLS)/`app_admin` roles; dual connection strings
- [x] **[API]** shared/tenancy (ALS context, workspace middleware + suspension check, `forTenant()` SET LOCAL) and shared HTTP/error kernel
- [x] **[API]** Seed: 2 tenants, settings, billing profiles, system roles, permission catalog, default Alert_Rules per tenant, notification templates (en)
- [x] **[TEST]** 🔒 RLS isolation suite (PERMANENT GATE) incl. new v4 tables; fail-closed (no tenant_id set ⇒ 0 rows)

## 0.3 Identity & access
## 0.3 Identity & access
- [x] **[API]** argon2id · login (email **or phone**) · access JWT + rotating refresh w/ family reuse-detection & revoked_reason · lockout via failed_login_count/locked_until · login_attempts w/ UA+failure_reason
- [x] **[API]** `Verification_Tokens`: PASSWORD_RESET + EMAIL_VERIFY + USER_INVITE flows (hash-stored, single-use, expiring)
- [x] **[API]** RBAC seed + CASL factory + `@Authorize()` + manager-chain ABAC helper
- [x] **[WEB]** A1 login · A4 forgot/reset · A5 suspended page · session handling
- [ ] **[TEST]** auth e2e: rotation, reuse→family revoke, lockout, token single-use

## 0.4 Events, jobs, observability
- [ ] **[API]** Outbox table+relay→BullMQ · `@OnDomainEvent` · worker entrypoint · jobs carry tenantId + `runWithContext`
- [ ] **[API]** pino (request_id/tenant_id/user_id, redaction list) · exception filters (DomainError→coded 4xx) · /healthz · Sentry+OTel
- [ ] **[API]** Audit writer (tenant + system) capturing ip/UA/entity_type/entity_id via interceptor
- [ ] **[TEST]** outbox crash-recovery; worker RLS context

---

# PHASE 1 — Organization & Admin (M)
**Exit:** tenant fully staffed via CSV (150 rows, 4 errors reported); HR role sees no billing.

- [x] **[API]** Departments tree (cycle-safe) · Designations · Employees CRUD (code autosuggest, phone, lifecycle, manager cycle-check, joining/exit rules) · employment_events on changes
- [x] **[API]** Quota enforcement under advisory lock; emits QUOTA_THRESHOLD events at 95/100%
- [x] **[API]** CSV import: presigned upload → import_jobs → BullMQ worker validation → persistent row errors; idempotent retry
- [x] **[API]** Invite users (Verification_Tokens.USER_INVITE + payload role_ids) · tenant roles CRUD · permission matrix endpoint
- [x] **[WEB]** B1 wizard (logo→MinIO, tz, weekly offs incl. 2nd/4th Sat) · B2 settings · B3 org builder · B4 list+quota banner · B5 form (+device card placeholder) · B6 import wizard · B7 users&roles · B8 role editor
- [ ] **[WEB]** A2/A3 self-serve signup+verify (TENANT_SIGNUP tokens) — or explicitly deferred to P6 (decide ☐)
- [x] **[TEST]** import edges (dupes, cross-tenant manager ref, quota race) · permission-matrix e2e
- [x] **[DOC]** import template + roles guide

---

# PHASE 2 — Attendance Core, web-first (L) ⭐ calculator phase
**Exit:** month incl. night shift + holiday + half-day yields correct muster.

## 2.1 Config domain
- [x] **[API]** Policies CRUD (all v4 fields incl. max_face_attempts, weekly_offs override, break_rules) · Policy_Assignments + cached PolicyResolver (emp>dept>default)
- [x] **[API]** Shifts (is_overnight auto) + ShiftResolver (roster>default>flexible) · Rosters single/bulk/CSV (holiday-skip) · Holidays (office-scoped) · Office_Locations + employee assignments

## 2.2 Calculator & aggregate
- [ ] **[API]** VOs (GeoPoint/Geofence/TimeWindow/WorkMinutes) · DateAttributor (overnight rule, office-tz > tenant-tz)
- [ ] **[API]** AttendanceDay aggregate: invariants, pairing, recompute; writes **applied_shift_id** + policy/shift snapshot; rejects when locked
- [ ] **[API]** Pure AttendanceCalculator: precedence ladder (punch > exception > holiday > weekly-off[policy override aware] > absent)
- [ ] **[TEST]** 🎯 60+ table-driven cases: grace bounds, half-day, min-work, OT, multi-pairs, unpaired, paid/unpaid breaks, overnight both dates, tz shifts, holiday+punch=ON_DUTY, leave overlap, no-roster fallback, mid-month join/exit, policy weekly-off override

## 2.3 Punch flow + lifecycle
- [ ] **[API]** Web punches (source=WEB, records ip/UA) check-in/out/break; row-lock; saveWithEvents+outbox
- [ ] **[API]** Reads: me/today · list w/ filters · per-employee month · Exceptions CRUD (overlap query)
- [ ] **[API]** Jobs: finalizeDay (per-tenant tz cron, snapshot, AttendanceDayFinalized) · absenteeSweep (uses Tenant_Settings.absentee_alert_time) · monthly partition creator
- [ ] **[TEST]** concurrent-punch serialization · finalize idempotency

## 2.4 Web HR portal
- [ ] **[WEB]** H5 policies · H6 shifts · H7 roster planner · H8 holidays · H4 geofence editor · H9 register (verif icons, lock icons) · H10 employee detail (calendar+timeline) · H13 exceptions · web self-service punch
- [ ] **[TEST]** Playwright config→punch→register flow · **[DOC]** status-computation explainer

---

# PHASE 3 — Mobile + Verification Pipeline (L, the crux)
**Exit:** wrong-face / 2-km-away / mock-GPS all rejected with correct codes AND appear as Security_Alerts in H14.

## 3.1 Verification backend
- [ ] **[API]** Pipeline per verification-pipeline.ts, upgraded to v4 log columns: attempt lat/lng/accuracy, matched_office_id, distance_from_geofence_m, location_method, liveness_ok, selfie_key, clock_skew_seconds, is_rooted, app/os_version
- [ ] **[API]** Adapters: Rekognition CompareFaces (+liveness) · Play Integrity + App Attest server verify · private selfie bucket (presigned up, signed read)
- [ ] **[API]** Devices: register (PENDING/auto), approve/block w/ attribution+reason, replace chain, one-primary; device-bound refresh
- [ ] **[API]** Biometric consent (record incl. IP/UA proof; withdraw → GPS-only policy + admin notify) · face enrollment (embedding ref, enrolled_by, lock)
- [ ] **[API]** CheckInService: ALWAYS write verification log → fail: emit CheckInRejected + coded 422 w/ sanitized details → pass: aggregate path; max_face_attempts lockout window
- [ ] **[TEST]** check-matrix (each check × pass/fail/skip × work_type) · evidence-sanitization (no score/IP leak) · staged spoofs

## 3.2 Flutter foundation & punch flow
- [ ] **[APP]** Riverpod codegen · go_router · dart-dio client from contracts · secure storage + refresh interceptor · Isar (PendingPunch, caches) · flavors · Sentry · FCM token registration
- [ ] **[APP]** M1–M5 (splash/login/device-reg/consent/enrollment w/ ML Kit blink liveness)
- [ ] **[APP]** M6 home (local geofence pre-check pill) · M7 camera → M8 verifying → M9 success · M10 four failure states from codes (distance mini-map, retry counter, mock-GPS help, contact-HR)
- [ ] **[APP]** M11 breaks · M12 history · M13 day detail · M19 profile · M20 settings/permissions (battery-opt fix)
- [ ] **[TEST]** widget states · mocked-provider integration · device matrix incl. rooted rejection

## 3.3 Alerts engine v1 + HR security surface
- [ ] **[API]** Alert_Rules CRUD + defaults · rule-evaluator subscriber: CheckInRejected/absenteeSweep → `Security_Alerts` (severity, details JSON w/ map point) honoring cooldown + dept scope
- [ ] **[API]** Security_Alerts lifecycle endpoints (ack/resolve/dismiss w/ note)
- [ ] **[WEB]** H14 violations feed (from Security_Alerts, ack/resolve actions, map thumbnails, block-device) · device mgmt in B5 · alert-rules settings screen
- [ ] **[TEST]** e2e: geofence fail on device → OPEN alert card → acknowledge
- [ ] **[DOC]** ⚖️ biometric DPA note (consent versions, retention, deletion) — legal checkpoint

---

# PHASE 4 — Field Tracking + Offline Sync (L)
**Exit:** airplane-mode punch replays once (idempotent); route playback shows stops + a tracking gap.

- [ ] **[API]** Field sessions (device_id, end_reason) start/stop; auto-stop on checkout/stale
- [ ] **[API]** Batch ping ingestion → queue → bulk insert (accuracy/speed/is_mock); per-tenant rate limits; mock-ping → alert rule
- [ ] **[API]** Sync endpoint: client_event_uuid idempotency, clock-skew heuristic → time_suspect + CLOCK_TAMPER alert, max_offline_sync_hours rejection→regularization hint; OfflinePunchSynced event
- [ ] **[API]** Route summarizer job (simplified path, distance, tracking_gap_minutes) + 90-day ping pruning · Redis presence hash + SSE gateway
- [ ] **[APP]** workmanager background pings (battery-tiered) · Isar offline queue + replay w/ backoff · M16 tracking status · M17 sync queue (+success state) · sync-confirmation push
- [ ] **[WEB]** H1 live board (SSE) · H2 live field map · H3 route playback
- [ ] **[TEST]** duplicate-delivery replay · clock-changed device · k6 on /pings & /sync · gap rendering

---

# PHASE 5 — Regularization, Notifications, Reports, Leave-min (M)
**Exit:** full HR daily loop: request → approve → recompute → notify → month locked → payroll CSV.

## 5.1 Regularization
- [ ] **[API]** Submit (window rule, attachment_key, not-locked check) · approve/reject (synthetic REGULARIZED_* events w/ created_by → recompute → RegularizationApproved) · cancel
- [ ] **[WEB]** H11 queue (SLA aging, bulk) · H12 detail (diff + recompute preview) · **[APP]** M14 form · M15 my requests
- [ ] **[TEST]** recompute correctness post-approval · locked-day rejection

## 5.2 Notification engine
- [ ] **[API]** Templates seed (all event_keys: checked_in, marked_late, regularization.*, security.violation, sync.completed, quota.warning, billing.invoice_due, leave.*) · preferences API · renderer+dispatcher (FCM/SES ports) w/ retries, DELIVERED/BOUNCED, dead-token pruning via delivery.device_id
- [ ] **[API]** In-app inbox API (unread counts, read_at, deep-link action_url, expiry purge job)
- [ ] **[APP]** M18 inbox + deep links · client-scheduled shift-end reminder & geofence nudge honoring tenant settings
- [ ] **[TEST]** preference suppression · retry/backoff · template locale fallback

## 5.3 Reports & payroll lock
- [ ] **[API]** Async report jobs → Report_Exports (expiring signed links): Muster, Payroll (contract v1), Late/OT, Violations, Field-distance
- [ ] **[API]** Payroll_Lock_Periods: lock month (stamps logs.payroll_lock_id+locked_at/by, links export) · audited reopen (reason) · guards on punch/regularize/exception
- [ ] **[WEB]** H15 reports center · H16 muster (export-locks-month flow, lock badge)
- [ ] **[TEST]** export snapshot (payroll contract) · lock/reopen guard matrix

## 5.4 Leave minimal
- [ ] **[API]** Policies+balances · requests w/ half-day flags + total_days calc (weekly-off/holiday aware) · approve→LeaveApproved→exception subscriber · balance deduction/restore
- [ ] **[WEB]** L3 approvals (coverage strip) · **[APP]** L1 balances · L2 apply
- [ ] **[TEST]** half-day → HALF_DAY attendance status · overlap warnings

---

# PHASE 6 — Billing, Platform Ops, Hardening → GA (M/L)
**Exit:** self-serve tenant signs up, pays, gets invoiced with GST; failed card → dunning → auto-suspend; pen-test findings closed.

## 6.1 Billing
- [ ] **[API]** Plans CRUD · subscriptions lifecycle · seat sync from employee count
- [ ] **[API]** Gateway adapters (Razorpay primary, Stripe port) · webhook idempotency · Payment_Transactions per attempt
- [ ] **[API]** Invoice generation job: sequential invoice_number, GST from billing profile, totals, PDF render → pdf_url
- [ ] **[API]** Dunning job: REMINDED→GRACE→SUSPEND_PENDING→suspend (+System_Alerts, tenant emails)
- [ ] **[WEB]** B10 tenant billing (profile w/ GSTIN, method, invoices) · S5/S6 plans · S7/S8 invoices+dunning
- [ ] **[TEST]** webhook replay idempotency · suspension enforcement e2e (tokens rejected)

## 6.2 Platform ops
- [ ] **[API]** platform module on app_admin conn: tenants CRUD/suspend, S4 manual onboarding (temp password invite), module toggles w/ API guards, System_Alerts feed+rules, impersonation (scoped token, expiry, banner, double-attributed audit) · platform MFA
- [ ] **[WEB]** S1 dashboard · S2/S3 tenants · S9 modules · S10 global audit · S11 health · impersonation banner
- [ ] **[WEB]** A2/A3 self-serve signup GA (if deferred from P1)

## 6.3 Hardening & GA
- [ ] **[TEST]** load: punch burst, /sync, /pings, live-board fan-out (k6 targets documented)
- [ ] Security review + external pen test; fix criticals ☐ highs ☐
- [ ] **[DB]** backup/PITR drill · partition automation verified · retention jobs (pings 90d, notifications 90d, tokens)
- [ ] Runbooks: on-call, dunning, impersonation policy, data-deletion (biometrics) · status page/alert routing
- [ ] Store submissions (Play/App Store incl. background-location justifications) · force-upgrade gate via app_version
- [ ] **[DOC]** API reference publish · admin/HR/employee guides · DPA/security whitepaper for enterprise questionnaires

---

## Cross-phase tracks (continuous)
- [ ] Contracts pipeline: OpenAPI → TS + dart clients regenerated in CI on schema change
- [ ] Every new tenant table → RLS array + isolation test (checklist in PR template)
- [ ] Weekly triage of DLQ + Sentry · perf budget on p95 punch latency (<800ms excl. face provider)

## Sequencing notes
- P0→P2 strictly ordered; P3 mobile UI can start against mocks once P3.1 contracts merge.
- P4 backend and P5.2 notifications parallelize across two devs; P6 billing can start any time after P0 (only tenant/module tables needed).
- Sellable milestones: end-P2 (web-punch SMB), end-P3 (flagship demo), end-P5 (full ops), end-P6 (GA self-serve).
