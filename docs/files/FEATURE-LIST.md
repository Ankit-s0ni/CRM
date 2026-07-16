# FEATURE LIST — Multi-Tenant HRMS Attendance Platform (v4)
Every feature mapped to its **ERD v4 entities** and **screen IDs** (STITCH-SCREEN-PROMPTS.md). ✅ = MVP scope · 🔜 = post-MVP within v1.x · 🔮 = future module hook.

---

## 1. Platform / Super Admin (Portal 1)

**1.1 Tenant lifecycle**
- ✅ Manual tenant creation with temp password + credential handover — `Tenants`, `Verification_Tokens(USER_INVITE)` — S4
- ✅ Subdomain provisioning + global uniqueness — `Tenants.subdomain` — S4
- 🔜 Self-serve signup with email verification & auto workspace spin-up — `Verification_Tokens(TENANT_SIGNUP, EMAIL_VERIFY)` — A2, A3
- ✅ Suspend / reactivate with reason; suspension enforced at auth layer — `Tenants.suspended_*` — S3, A5
- 🔜 Churn/deletion scheduling with biometric-data purge — retention jobs — S3 danger zone

**1.2 Plans, billing & payments**
- ✅ Plan tiers with per-user pricing, currency, seat limits, module bundles — `Subscription_Plans`, `Modules` — S5, S6
- ✅ Subscriptions with trial, period, seat count, plan history — `Tenant_Subscriptions` — S3
- ✅ Invoices with invoice number, GST tax, totals, PDF — `Tenant_Invoices`, `Tenant_Billing_Profiles` — S7, S8
- ✅ Gateway charging (Razorpay/Stripe) with per-attempt transaction log — `Payment_Transactions` — S8
- ✅ Dunning: reminders → grace → auto-suspend — `dunning_state`, jobs — S7 dunning panel
- ✅ Quota enforcement (95% warn / 100% block) — `AlertRule(QUOTA_THRESHOLD)` — B4 banner

**1.3 Modules & feature flags**
- ✅ Module registry + per-tenant toggles, guard-enforced at API — `Modules`, `Tenant_Modules` — S9

**1.4 Support & compliance**
- ✅ Impersonation ("Login As") with reason, expiry, banner, double-attributed audit — `Impersonation_Sessions` — S3 banner
- ✅ Global audit log with old→new diff, IP, UA, request ID — `System_Audit_Logs` — S10
- ✅ Platform alerts: gateway down, queue lag, push failures, new subscription/upgrade — `System_Alerts` — S1, S11
- ✅ Platform staff MFA (mandatory) — `Platform_Users.mfa_*`

---

## 2. Business Admin (Portal 2)

**2.1 Company setup**
- ✅ Onboarding wizard: logo (reflected in employee app), timezone, working days — `Tenants`, `Tenant_Settings` — B1, B2
- ✅ Weekly-off patterns incl. 2nd/4th Saturday — `Tenant_Settings.weekly_offs` (+ per-policy override) — B2
- ✅ Billing profile: legal name, GSTIN, billing email — `Tenant_Billing_Profiles` — B10

**2.2 Org structure**
- ✅ Department tree (nested) + designations — `Departments`, `Designations` — B3
- ✅ Employees: code, work type, manager chain, joining/exit, lifecycle status — `Employees`, `Employment_Events` — B4, B5
- ✅ Bulk CSV import with row-level error report, idempotent re-run — `Import_Jobs` — B6

**2.3 Access control**
- ✅ User invites via tokenized email — `Verification_Tokens(USER_INVITE)` — B7
- ✅ RBAC: system + custom tenant roles, permission matrix; HR role blocked from billing — `Roles/Permissions/User_Roles/Role_Permissions` — B7, B8
- ✅ Manager-scope ABAC (approve only own reports)

**2.4 Master verification policy**
- ✅ Biometric master toggle + strictness slider (face_match_threshold) — `Tenant_Settings` — B9
- ✅ Device-binding requirement, geofence requirement defaults — `Attendance_Policies` — B9
- ✅ Subscription visibility: plan, usage, payment method, invoice downloads, quota warnings — B10

---

## 3. HR Portal (Portal 3)

**3.1 Geo-security config**
- ✅ Geofence drawing: pin + radius per office, per-office timezone — `Office_Locations` — H4
- ✅ Office IP allow-list (server-observed egress IPs; SSID advisory only) — `Office_Locations.egress_ips/wifi_ssids` — H4
- ✅ Employee↔office assignment (who may punch where) — `Employee_Office_Assignments` — H4/B5
- ✅ Field tracking rules: interval, per-department enablement — `Tenant_Settings`, policy — H portal config

**3.2 Attendance configuration**
- ✅ Policies: late/half-day/min-work/OT thresholds, early in/out, verification toggles, offline window, max face attempts, break rules — `Attendance_Policies` — H5
- ✅ Policy assignment: employee > department > tenant default — `Policy_Assignments` — H5
- ✅ Shifts incl. overnight (22:00–06:00) with date-attribution rule — `Shifts` — H6
- ✅ Roster planner: weekly grid, bulk assign, CSV, default-shift fallback — `Employee_Shift_Rosters` — H7
- ✅ Holidays: tenant-wide + office-scoped — `Tenant_Holidays` — H8

**3.3 Live monitoring**
- ✅ Real-time board: Present/Late/Absent/On-field/On-break, Redis+SSE — derived + `Attendance_Events` — H1
- ✅ Live field map: pins, staleness, battery, speed/idle — `Field_Location_Pings` — H2
- ✅ Route playback with stops, dwell, tracking gaps — `Field_Route_Summaries` — H3

**3.4 Approvals & exceptions**
- ✅ Regularization queue: approve/reject/comment, attachment evidence, SLA aging; approval appends synthetic events + recompute — `Regularization_Requests` — H11, H12, M14
- ✅ Manual exceptions (OD/WFH) + auto from Leave — `Attendance_Exceptions` — H13
- ✅ Late-penalty accumulation view — computed from `Attendance_Logs.late_minutes` — H9

**3.5 Security & alerts (v4 engine)**
- ✅ Configurable alert rules: absentee-after-grace (time), late arrival, missed checkout, geofence/face/mock/device/clock-tamper, quota, stale offline sync — with channels, recipient roles/users, dept scope, cooldown — `Alert_Rules` — HR settings
- ✅ Security alert feed with lifecycle OPEN→ACK→RESOLVED/DISMISSED, evidence (distance, score, selfie key, map point) — `Security_Alerts` — H14
- ✅ "Checked in 2 km outside site" alerts with attempt coordinates + distance — `Attendance_Verification_Logs.attempt_*` — H14

**3.6 Reporting & payroll handoff**
- ✅ Muster roll (P/A/HD/L/H/WO/OD grid) — `Attendance_Logs` — H16
- ✅ Payroll export (versioned contract: payable/OT/late/LOP) — `Report_Exports` — H15
- ✅ Month-level payroll lock with attribution + audited reopen — `Payroll_Lock_Periods` — H16
- ✅ Late/OT report, violations report, field-distance report; async generation, signed expiring links — `Report_Exports` — H15
- ✅ Tenant audit log (entity-level history) — `Tenant_Audit_Logs` — H portal

---

## 4. Employee App (Portal 4 — Flutter)

**4.1 Auth & device trust**
- ✅ Email/phone + password login; lockout after failed attempts — `Users` — M2
- ✅ Device registration & binding (one primary, HR approve/block/replace chain, device-bound refresh tokens) — `Registered_Devices`, `Refresh_Tokens` — M3
- ✅ Biometric consent with IP/UA proof, versioning, withdrawal → GPS-only fallback — `Biometric_Consents` — M4
- ✅ Face enrollment with liveness; locked profile photo (HR-set, employee cannot change) — `Employees.face_*` — M5, M19

**4.2 Punch engine**
- ✅ Check-in/out with server-side pipeline: device → integrity (Play Integrity/App Attest) → location → face — `Attendance_Verification_Logs` — M6–M9
- ✅ Liveness selfie (blink), threshold from tenant settings, max-attempt lockout — M7
- ✅ Office OR-rule: geofence pass OR office egress-IP match; field: GPS+accuracy mandatory — `location_method` — M6
- ✅ Machine-readable failures with safe evidence (distance, accuracy): OUTSIDE_GEOFENCE, FACE_MISMATCH, MOCK_LOCATION, DEVICE_NOT_REGISTERED, ROOTED_DEVICE, CLOCK_TAMPER — M10
- ✅ Breaks (start/end, policy paid/unpaid) — `Attendance_Events(BREAK_*)` — M11
- ✅ Every attempt (pass/fail) logged with full forensics: coords, IP, UA, app/OS version, clock skew, integrity verdict — `Attendance_Verification_Logs`

**4.3 Field & offline**
- ✅ Background pings (interval per tenant), battery-tiered, per-ping mock flag, speed — `Field_Location_Pings`, `Field_Tracking_Sessions` — M16
- ✅ Session lifecycle with end reason (checkout/manual/battery/stale) — M16
- ✅ Offline queue (Isar): client UUID idempotency, replay on reconnect, retry/backoff, clock-tamper heuristic (`time_suspect`), max offline window — M17
- ✅ Battery-optimization detection + fix deep-link — M20

**4.4 Self-service**
- ✅ Today timeline with live worked-hours counter — M6
- ✅ Month history calendar + day detail with evidence — M12, M13
- ✅ Regularization request (reason, attachment, 7-day window, no locked days) + status tracking — M14, M15
- ✅ Profile, settings, permissions health — M19, M20

**4.5 Notifications (mobile)**
- ✅ Push via FCM with delivery tracking + dead-token pruning — `Notification_Deliveries.device_id` — M18
- ✅ Geofence-enter check-in nudge (client-side, toggle in settings) — `Tenant_Settings.checkin_reminder_enabled` — M18
- ✅ Shift-end checkout reminder (client-scheduled, N minutes) — `checkout_reminder_minutes` — M18
- ✅ Approval updates, late-marked notice, offline-sync confirmation — `Notifications` (event_key, deep link action_url) — M18

---

## 5. Notification & Alert Engine (cross-cutting)
- ✅ Templates per event_key × channel × locale — `Notification_Templates`
- ✅ Per-user channel preferences — `Notification_Preferences`
- ✅ In-app inbox with severity, deep links, read state, expiry — `Notifications` — M18, H feed
- ✅ Delivery pipeline: retries, error capture, DELIVERED/BOUNCED states — `Notification_Deliveries`
- ✅ Event-driven: subscribes to domain events via outbox; zero coupling into attendance code — `Outbox_Events`

## 6. Leave (v1-minimal, own bounded context)
- ✅ Policies with accrual JSON; balances — `Leave_Policies`, `Leave_Balances` — L1
- ✅ Requests with half-day start/end, computed working days, approval + comments — `Leave_Requests` — L2, L3
- ✅ Approved leave → attendance exception via `LeaveApproved` event (no direct coupling)

## 7. Future hooks (designed-for, not built)
- 🔮 Payroll consumes `AttendanceDayFinalized` + export contract; 🔮 tenant webhooks (outbox relay adapter); 🔮 kiosk/NFC punch (new PunchSource + pipeline check); 🔮 PostGIS polygon geofences; 🔮 analytics warehouse from event stream; 🔮 API keys for tenant integrations.
