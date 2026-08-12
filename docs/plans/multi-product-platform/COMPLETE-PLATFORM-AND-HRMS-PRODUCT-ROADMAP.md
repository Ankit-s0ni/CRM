# Complete Delsia Platform and HRMS Product Roadmap

**Status:** Consolidated audit and planning baseline
**Prepared:** 2026-08-11
**Scope:** Delsia Platform, separated DeltCRM HRMS API/web/mobile, shared product contracts, gateway, migration, operations, and reusable onboarding for future products such as Mail and POS
**Not included:** Building the internal business functionality of Mail or POS themselves

## 1. Purpose

This document is the single planning view for work still required before:

1. DeltCRM HRMS is a complete, production-ready product;
2. field employee attendance and face-verified attendance work end to end;
3. HRMS plans, prices, add-ons, permissions, and employee limits are enforced;
4. Platform and HRMS are independently deployable and operationally safe;
5. a future product such as Mail or POS can integrate through contracts and configuration without adding product-specific logic throughout Platform.

This roadmap consolidates existing separation, mobile, plan/pricing, deployment, and product-integration plans. It does not add their checkbox totals together because many items overlap.

## 2. Honest current position

The project is not starting from zero. There is substantial schema, API, UI, payroll, attendance, contract, gateway, and test work. However, several areas described as complete in older checklists are only structurally present or were tested against the old monolith boundary.

The current state is best described as:

| Area | Current position |
|---|---|
| Platform identity and tenant foundation | Substantial implementation; full separated-flow acceptance remains |
| Platform product integration | HRMS-specific implementation exists; generic multi-product registry is incomplete |
| Gateway and local routing | Working foundation; complete deep-link, outage, and production routing evidence remains |
| HRMS API and schema | Broad foundation exists; some web flows and many mobile/self-service APIs remain incomplete |
| HRMS web | Many pages exist; data loading, legacy paths, capabilities, and complete acceptance remain |
| Payroll | Large engine/API surface exists; commercial gating, jurisdiction approval, full regression, and migration remain |
| HRMS mobile | Rich UI and local logic exist; separated authentication/API migration has not started |
| Field employee attendance | Models, mobile UI, and some admin UI exist; separated session/ping APIs and validated full flow are missing |
| Face attendance | Models and UI scaffolding exist; consent, enrollment, liveness/matching, evidence, and full flow are incomplete |
| Plans and pricing | Catalog/UI foundation exists; canonical model, enforcement, usage, billing semantics, and tests are incomplete |
| Data separation/cutover | Local separation foundation exists; production migration, reconciliation, rollback, and cutover remain |
| Production operations | Partial scripts/containers exist; independent CI/CD, observability, backup/restore, security, and release evidence remain |

Existing document counts illustrate the remaining scope but are not additive:

- Platform/HRMS corrective plan: 113 unchecked items;
- HRMS separation master checklist: 63 unchecked items;
- HRMS mobile migration plan: 60 unchecked items;
- plans/pricing release gates: 14 unchecked items.

## 3. Product-completion definition

“Complete” for this roadmap means more than pages loading locally. A feature is complete only when it has:

- an approved product rule and owner;
- versioned API/event/claim contracts;
- server-side tenant, capability, permission, and resource-scope enforcement;
- complete web and/or mobile experience;
- data migration and backward-compatibility behavior where required;
- unit, integration, contract, E2E, security, and relevant load tests;
- logs, metrics, alerts, audit history, backup, and recovery behavior;
- deployment, rollback, documentation, and support ownership.

## 4. Architecture decisions required before implementation

These decisions block multiple workstreams and should be closed in the first two weeks.

| ID | Decision | Recommended answer | Owner |
|---|---|---|---|
| DEC-01 | Commercial product boundary | HRMS is one product; attendance, leave, payroll, field tracking, face attendance, and reports are HRMS capabilities | Product + architecture |
| DEC-02 | Plan structure | Feature edition and employee capacity are separate axes | Product + finance |
| DEC-03 | Capacity model | Start with fixed 50/100/200/custom employee packages | Product + finance |
| DEC-04 | Billable employee definition | Count active, invited/onboarding, and future starters; approve suspended/archived behavior | Product + finance + HRMS |
| DEC-05 | Tenant authorization | Tenant HRMS admin assigns roles inside capabilities purchased through Platform | Product + security |
| DEC-06 | Subscription states | Define active, trial, past-due grace, suspended, canceled, and no-subscription behavior | Product + finance + security |
| DEC-07 | Face technology | Prefer an evaluated liveness/face provider for v1; do not invent an unaudited matching engine | Product + security + legal |
| DEC-08 | Biometric jurisdictions | Define launch countries, consent, retention, deletion, residency, and employee alternatives | Legal + security + product |
| DEC-09 | Field privacy | Define tracking hours, consent/notice, precision, retention, manager access, and employee transparency | Legal + HRMS product |
| DEC-10 | Mobile scope | Android and iOS only for v1 unless Flutter web/desktop support is explicitly funded | Product |
| DEC-11 | Payroll scope | Approve launch jurisdictions and statutory outputs; avoid claiming global payroll | Product + payroll specialists |
| DEC-12 | Production migration | Approve pilot tenants, observation period, rollback window, and source retention | Engineering + DBA + operations |

## 5. Master backlog

Legend:

- **P0:** required for safe product operation or blocks most other work;
- **P1:** required for production-ready v1;
- **P2:** maturity, scale, or later enterprise completeness;
- **Partial:** useful implementation exists but the vertical flow is not complete;
- **Missing:** no adequate implementation was found at the target separated boundary;
- **Validation:** implementation may exist but production-grade evidence is missing.

Effort is in engineering person-weeks and includes implementation plus direct automated tests. Cross-team acceptance, observation windows, and external approvals affect calendar time separately. Do not total every row mechanically: shared contract, authorization, test, and operations work appears in multiple feature dependencies, and the calendar forecast in Section 7 removes that overlap.

### 5.1 Product, architecture, and delivery governance

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| GOV-01 | P0 | Missing | Approve the decisions in Section 4 and record ADRs | 1–2 | None |
| GOV-02 | P0 | Partial | Replace contradictory roadmap status claims with one evidence-backed delivery board | 1 | GOV-01 |
| GOV-03 | P0 | Partial | Finalize Platform/HRMS/contract/mobile/data ownership and CODEOWNERS | 1 | GOV-01 |
| GOV-04 | P0 | Missing | Define severity, release, rollback, and production approval process | 1–2 | GOV-03 |
| GOV-05 | P1 | Missing | Define product analytics and success measures for signup, activation, attendance, payroll, upgrades, and churn | 1 | GOV-01 |
| GOV-06 | P1 | Missing | Create traceability from every roadmap item to acceptance evidence | 1 | GOV-02 |

### 5.2 Shared product contract and compatibility

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| CON-01 | P0 | Partial | Publish canonical product, capability, permission, subscription-state, limit, and error vocabulary | 2–3 | GOV-01 |
| CON-02 | P0 | Partial | Expand HRMS capabilities for field, face, devices, geofence, shifts, regularization, reports, and payroll export | 1–2 | CON-01 |
| CON-03 | P0 | Partial | Define typed effective-entitlement and limit contracts | 1–2 | CON-01 |
| CON-04 | P0 | Partial | Configure private package authentication in local, CI, and deployment environments | 1 | None |
| CON-05 | P0 | Missing | Add current↔previous producer/consumer compatibility tests and breaking-change gates | 2 | CON-01 |
| CON-06 | P1 | Missing | Generate typed TypeScript and Dart clients from active Platform/HRMS specifications | 3–4 | CON-01 |
| CON-07 | P1 | Partial | Remove vendored/workspace contract copies after published-package parity passes | 1–2 | CON-04, CON-05 |
| CON-08 | P1 | Missing | Add signed release metadata, compatibility range, changelog, and deprecation policy | 1 | CON-05 |

### 5.3 Reusable Platform product control plane

The current Platform integration service explicitly rejects products other than HRMS. Mail and POS exist in contract types but have empty capability/permission registries. These items remove that HRMS hard-coding.

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| PLT-01 | P0 | Partial | Replace hard-coded HRMS manifest selection with a validated, data-driven product registry | 3–4 | CON-01 |
| PLT-02 | P0 | Partial | Make audience, routes, health endpoints, capabilities, permissions, localization, and lifecycle metadata manifest-driven | 3–4 | PLT-01 |
| PLT-03 | P0 | Partial | Implement generic tenant product provisioning, suspension, reactivation, and deletion workflows | 3–5 | PLT-01 |
| PLT-04 | P0 | Partial | Implement one generic effective-entitlement resolver for every product | 3–4 | CON-03, PLT-01 |
| PLT-05 | P0 | Partial | Enforce subscription state uniformly during navigation, token issuance, and product access | 2–3 | PLT-04 |
| PLT-06 | P0 | Partial | Finish service authentication, credential rotation, product identity, replay protection, and least privilege | 2–3 | PLT-01 |
| PLT-07 | P0 | Partial | Complete outbox delivery, retry policy, dead-letter visibility, replay, and idempotent lifecycle consumers | 3–4 | PLT-03 |
| PLT-08 | P1 | Partial | Make navigation and product launch generic rather than HRMS-specific | 2–3 | PLT-02, PLT-04 |
| PLT-09 | P1 | Partial | Add controlled unauthorized, subscription-required, unavailable, maintenance, and provisioning pages for any product | 2 | PLT-08 |
| PLT-10 | P1 | Missing | Implement product registration/version/health administration UI | 3–4 | PLT-01, PLT-03 |
| PLT-11 | P1 | Partial | Complete tenant/company, locale, timezone, currency, branding, and domain contracts exposed to products | 3–4 | CON-01 |
| PLT-12 | P1 | Partial | Complete central audit and support views for product lifecycle and access decisions | 2–3 | PLT-03, PLT-07 |
| PLT-13 | P1 | Missing | Add generic product usage ingestion and reconciliation APIs/events | 3–4 | CON-03, PLT-04 |
| PLT-14 | P1 | Missing | Create product developer credentials, sandbox tenant, webhook/event subscriptions, and secret rotation flow | 3–5 | PLT-06, PLT-07 |
| PLT-15 | P2 | Missing | Product marketplace/catalog discovery, trial activation, add-on purchase, and self-service uninstall | 4–6 | Plans/pricing, PLT-03 |

### 5.4 Plans, pricing, billing, and commercial enforcement

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| BIL-01 | P0 | Conflicting | Migrate to one HRMS product and canonical capability catalog | 3–4 | GOV-01, CON-02 |
| BIL-02 | P0 | Missing | Model feature edition separately from 50/100/200/custom capacity | 2–3 | DEC-02, DEC-03 |
| BIL-03 | P0 | Partial | Add explicit `FLAT_TIER`, `PER_SEAT`, `BASE_PLUS_SEAT`, and `CUSTOM` pricing semantics | 2–3 | BIL-02 |
| BIL-04 | P0 | Partial | Resolve subscription + add-ons + bounded overrides into effective capabilities and limits | 3–4 | PLT-04, BIL-01 |
| BIL-05 | P0 | Missing | Prevent raw module toggles from bypassing the commercial resolver | 1–2 | BIL-04 |
| BIL-06 | P0 | Missing | Implement atomic HRMS employee capacity enforcement for create/import/reactivation/status changes | 3–5 | BIL-04, HRM-authorization |
| BIL-07 | P0 | Missing | Report actual billable employee usage from HRMS to Platform idempotently | 2–3 | PLT-13, BIL-06 |
| BIL-08 | P0 | Partial | Block invalid downgrades and define upgrade/downgrade/proration behavior | 2–3 | BIL-02, BIL-07 |
| BIL-09 | P1 | Partial | Complete plan editor for editions, capacities, add-ons, limits, dependencies, prices, and impact preview | 3–4 | BIL-01–BIL-04 |
| BIL-10 | P1 | Partial | Complete tenant billing UI, usage display, invoices, upgrade prompts, and payment state | 3–5 | BIL-07, BIL-08 |
| BIL-11 | P1 | Partial | Harden payment-provider webhooks, idempotency, dunning, refunds, taxes, invoice numbering, and reconciliation | 4–7 | BIL-03 |
| BIL-12 | P1 | Missing | Add entitlement change propagation targets, cache invalidation, and active-session revocation | 2–3 | BIL-04, PLT-07 |
| BIL-13 | P1 | Missing | Migrate existing tenant subscriptions and grandfathered access with dry-run comparison | 3–5 | BIL-01–BIL-08 |
| BIL-14 | P1 | Missing | Full capability, price, subscription, limit, concurrency, and direct-API E2E suite | 3–4 | BIL-04–BIL-12 |

### 5.5 Platform authentication, authorization, and tenant administration

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| IAM-01 | P0 | Partial | Prove browser SSO from Platform to HRMS with refresh, logout, revocation, and no token leakage | 2–3 | CON-01, PLT-05 |
| IAM-02 | P0 | Partial | Complete mobile login, rotating refresh, HRMS product-token exchange, and device-bound behavior | 3–4 | CON-06 |
| IAM-03 | P0 | Partial | Enforce tenant isolation and inactive/suspended identities in API, files, jobs, and events | 3–5 | PLT-05 |
| IAM-04 | P0 | Partial | Let tenant admins define and assign HRMS roles while preventing grants beyond purchased capabilities | 3–4 | BIL-04, CON-02 |
| IAM-05 | P1 | Partial | Invitation, verification, password reset, account recovery, MFA, and session-management acceptance | 2–4 | IAM-01 |
| IAM-06 | P1 | Missing | Key rotation, previous-key overlap, emergency revocation, clock-skew, and replay tests | 2–3 | PLT-06 |
| IAM-07 | P2 | Missing | Enterprise SSO/SAML/OIDC and SCIM provisioning if required commercially | 6–10 | IAM-01, product decision |

### 5.6 HRMS core product completion

Existing HRMS pages and APIs are foundations, not proof that every lifecycle is complete.

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| HRM-01 | P0 | Partial | Complete employee create/read/update/status/reactivate/terminate lifecycle APIs and UI | 3–5 | IAM-03 |
| HRM-02 | P0 | Partial | Complete bulk import validation, preview, idempotency, partial failure, capacity, and audit | 3–4 | HRM-01, BIL-06 |
| HRM-03 | P0 | Partial | Complete departments, designations, offices, managers, assignments, effective dates, and integrity checks | 3–4 | IAM-03 |
| HRM-04 | P0 | Missing | Add HRMS endpoint capability guard and classify every controller route | 3–5 | CON-02, BIL-04 |
| HRM-05 | P0 | Partial | Remove remaining legacy flat web API URLs and add a CI architecture check | 2–3 | HRM-04 |
| HRM-06 | P1 | Partial | Complete onboarding/setup readiness and guided tenant activation | 2–4 | HRM-03 |
| HRM-07 | P1 | Partial | Complete employee document upload/download/delete, retention, antivirus, and authorization | 2–4 | IAM-03 |
| HRM-08 | P1 | Partial | Complete audit history, employee history, notifications, and stable empty/error states | 2–3 | PLT-12 |
| HRM-09 | P1 | Partial | Complete organization, employee, attendance, leave, field, security, and payroll reporting/export flows | 4–6 | Related domains |
| HRM-10 | P1 | Validation | Validate English/Arabic, LTR/RTL, timezone, locale, currency, themes, desktop, tablet, and accessibility | 3–5 | HRMS web stable |
| HRM-11 | P1 | Partial | Finish file/object-storage ownership, presigned access, malware handling, backup, and migration | 3–5 | OPS-03 |
| HRM-12 | P2 | Missing | Configurable workflow/approval engine for future HR processes instead of one-off approvals | 5–8 | IAM-04 |

### 5.7 Attendance, leave, and workforce operations

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| ATT-01 | P0 | Partial | Stabilize self check-in/out, breaks, idempotency, day calculation, timezone, and overnight shifts | 3–5 | HRM-04 |
| ATT-02 | P0 | Partial | Complete attendance admin dashboard/register/month/day APIs and remove loading errors | 2–4 | ATT-01 |
| ATT-03 | P1 | Partial | Complete policies, assignments, shifts, rosters, holidays, office geofence, and schedule resolution | 4–6 | HRM-03 |
| ATT-04 | P1 | Partial | Complete regularization/correction request, approval, cancellation, evidence, and audit | 3–4 | ATT-01 |
| ATT-05 | P1 | Partial | Complete leave policies, accrual/balance rules, requests, approvals, cancellation, and attendance integration | 4–6 | ATT-03 |
| ATT-06 | P1 | Partial | Complete registered-device trust, replacement/blocking, integrity challenges, and security alerts | 3–5 | IAM-02 |
| ATT-07 | P1 | Partial | Basic/advanced attendance reports, exports, payroll inputs, and calculation regression | 3–5 | ATT-01–ATT-05 |
| ATT-08 | P1 | Missing | Full browser/mobile E2E matrix for office, field, face, offline, correction, leave, and payroll handoff | 3–5 | Field and face workstreams |

### 5.8 Field employee attendance management

Current code contains field tracking schema, mobile screens, background-location logic, live-board UI, and load scripts. The separated HRMS runtime still lacks the complete employee session and ping ingestion surface, and commercial entitlement is not correctly enforced.

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| FLD-01 | P0 | Missing | Approve privacy, consent/notice, working-hours, precision, retention, and manager-scope rules | 1–2 | DEC-09 |
| FLD-02 | P0 | Partial | Define field capability, permissions, policy assignment, and work-type eligibility | 2 | CON-02, HRM-04 |
| FLD-03 | P0 | Missing | Implement idempotent field session start/active/stop APIs | 2–3 | FLD-01, FLD-02 |
| FLD-04 | P0 | Missing | Implement bounded field ping batch ingestion, receipts, replay, ordering, and deduplication | 3–4 | FLD-03 |
| FLD-05 | P0 | Partial | Complete foreground/background/offline mobile capture through product-token bootstrap | 4–6 | MOB-02, FLD-04 |
| FLD-06 | P1 | Partial | Complete location integrity, mock-location detection policy, accuracy/age validation, and device binding | 3–5 | ATT-06, FLD-04 |
| FLD-07 | P1 | Partial | Complete manager live board, stale/offline state, route detail, filters, and tenant scope | 3–4 | FLD-04 |
| FLD-08 | P1 | Partial | Generate privacy-safe route summaries, distance calculations, exceptions, and reports | 3–5 | FLD-04 |
| FLD-09 | P1 | Missing | Retention/deletion jobs, employee transparency, export, and audit access | 2–3 | FLD-01, OPS-03 |
| FLD-10 | P1 | Missing | Battery, intermittent-network, background-kill, duplicate, scale, and abuse testing | 3–4 | FLD-05–FLD-09 |

### 5.9 Face detection/verification attendance management

For attendance, simple “face detection” is insufficient. The production feature needs consent, secure enrollment, liveness, identity matching, policy decisions, evidence handling, fallback/manual review, and privacy controls.

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| FAC-01 | P0 | Missing | Approve provider/build choice, launch jurisdictions, employee alternative, retention, and deletion policy | 2–3 | DEC-07, DEC-08 |
| FAC-02 | P0 | Partial | Define face capability, permissions, attendance policy modes, thresholds, retry, and lockout rules | 2–3 | CON-02, FAC-01 |
| FAC-03 | P0 | Missing | Implement employee consent grant/read/withdraw with immutable evidence | 2–3 | FAC-01 |
| FAC-04 | P0 | Missing | Implement self enrollment presign, capture, challenge, completion, status, reset, and re-enrollment APIs | 3–5 | FAC-03 |
| FAC-05 | P0 | Missing | Integrate evaluated liveness and face matching provider/engine with signed result verification | 4–7 | FAC-01, FAC-04 |
| FAC-06 | P0 | Partial | Integrate face evidence and decision into online/offline punch without trusting the client verdict | 4–6 | FAC-05, ATT-01 |
| FAC-07 | P1 | Partial | Complete mobile capture quality guidance, liveness UX, retry, accessibility, and low-connectivity behavior | 3–5 | FAC-04–FAC-06 |
| FAC-08 | P1 | Partial | Complete admin enrollment status, reset, exceptions, manual review, security events, and audit | 3–4 | FAC-05 |
| FAC-09 | P1 | Missing | Encrypt templates/evidence, isolate storage, rotate keys, enforce retention/deletion, and redact logs | 3–5 | FAC-01, OPS-03 |
| FAC-10 | P1 | Missing | Spoof, replay, printed-photo/video, threshold, demographic-quality, privacy, load, and failure tests | 4–7 | FAC-05–FAC-09 |

If an in-house liveness and face-recognition engine is required, add approximately **20–35 person-weeks plus model evaluation, specialist staffing, and a longer legal/security review**. The estimate above assumes a third-party or already validated engine.

### 5.10 Payroll completion and validation

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| PAY-01 | P0 | Partial | Enforce payroll commercial capability separately from payroll user permission | 1–2 | HRM-04, BIL-04 |
| PAY-02 | P0 | Validation | Approve and validate country rule packs, statutory formulas, rounding, calendars, and effective dating | 4–8 | DEC-11 |
| PAY-03 | P1 | Partial | Complete setup, components, structures, compensation, payment/statutory details, and pay groups UX | 4–6 | PAY-02 |
| PAY-04 | P1 | Partial | Complete preparation, attendance/leave inputs, validation issues, calculation, review, approval, finalize, lock/reopen | 4–7 | PAY-02, ATT-07 |
| PAY-05 | P1 | Partial | Complete payslips, bank files, accounting journals, statutory outputs, reports, object storage, and access | 4–7 | PAY-04, HRM-11 |
| PAY-06 | P1 | Missing | Golden payroll calculations, financial control totals, immutable snapshots, concurrency, and migration parity | 4–6 | PAY-02–PAY-05 |
| PAY-07 | P1 | Missing | Payroll production approvals, support/runbook, correction/reversal, and incident recovery | 2–4 | PAY-06, OPS-04 |

### 5.11 HRMS mobile ownership and API migration

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| MOB-01 | P0 | Missing | Declare `deltcrm-hrms/apps/mobile` canonical, freeze duplicate, add parity check, record signing/release ownership | 1–2 | GOV-03 |
| MOB-02 | P0 | Missing | Split Platform and HRMS API clients; implement Platform refresh plus HRMS product-token exchange | 3–5 | IAM-02, CON-06 |
| MOB-03 | P0 | Missing | Add separated runtime config, self profile/preferences, history/day, evidence, integrity, sync, biometric, regularization, and field APIs | 8–12 | HRMS domain work |
| MOB-04 | P0 | Partial | Replace every flat HRMS route with `/api/hrms/v1/*` and generated typed DTOs | 3–5 | MOB-02, MOB-03 |
| MOB-05 | P0 | Missing | Scope offline queues/secrets by tenant/user/membership/employee/device and migrate local storage | 3–5 | MOB-02 |
| MOB-06 | P0 | Missing | Headless session bootstrap, worker cancellation, bounded replay, receipts, and entitlement/device failure behavior | 4–6 | MOB-02, MOB-05 |
| MOB-07 | P1 | Missing | Android emulator/device and iOS simulator/device real-stack integration suite | 3–5 | MOB-03–MOB-06 |
| MOB-08 | P1 | Missing | HRMS-owned mobile CI, protected signing, artifact metadata, store rollout, crash/analytics, and rollback | 3–5 | MOB-07 |
| MOB-09 | P1 | Missing | Remove `CRM/apps/mobile` and Platform mobile release code after parity and rollback gates | 1–2 | MOB-08 |

### 5.12 Data separation, migration, and monolith retirement

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| DAT-01 | P0 | Partial | Finish Platform runtime compilation solely against Platform-owned schema/client | 2–4 | Existing separation work |
| DAT-02 | P0 | Partial | Finalize all HRMS schema ownership, including payroll, mixed tables, files, IDs, and indexes | 3–5 | GOV-03 |
| DAT-03 | P0 | Missing | Tenant-scoped resumable snapshot exporter/importer with migration ledger and dry-run | 4–7 | DAT-02 |
| DAT-04 | P0 | Missing | Watermark/change replay or approved final-delta strategy | 3–5 | DAT-03, PLT-07 |
| DAT-05 | P0 | Missing | Row count, checksum, orphan, attendance, leave, payroll, document, and query-plan reconciliation | 4–6 | DAT-03 |
| DAT-06 | P0 | Missing | Migrate HRMS files to HRMS-owned storage and reconcile object inventory/checksums | 2–4 | HRM-11, DAT-03 |
| DAT-07 | P0 | Missing | Rehearse per-tenant cutover and routing rollback without deleting either source | 3–5 | DAT-03–DAT-06 |
| DAT-08 | P1 | Missing | Pilot and batch production migration with observation and explicit stop conditions | 3–5 plus observation | DAT-07, release gates |
| DAT-09 | P2 | Missing | Disable and later remove legacy HRMS code/jobs/UI from Platform after rollback window | 3–6 | DAT-08 |
| DAT-10 | P2 | Missing | Separate approved retention project for eventual legacy HRMS table removal | 2–4 | DAT-09, retention approval |

### 5.13 Gateway, deployment, observability, security, and operations

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| OPS-01 | P0 | Partial | Production gateway routes for localized product web paths, API paths, deep links, headers, limits, and controlled outages | 3–4 | PLT-02 |
| OPS-02 | P0 | Partial | Independent Platform/HRMS images, non-root runtime, health/readiness, immutable configuration, and secret injection | 3–4 | DAT-01, DAT-02 |
| OPS-03 | P0 | Partial | Independent database/object backups, encrypted retention, restore drills, RPO/RTO, and evidence | 3–5 | OPS-02 |
| OPS-04 | P0 | Missing | Structured logs, traces, metrics, dashboards, alerts, SLOs, and cross-service correlation | 4–6 | OPS-01, OPS-02 |
| OPS-05 | P0 | Partial | Independent CI/CD with migration checks, contract gates, security scanning, staging, approvals, and rollback | 4–6 | CON-05, OPS-02 |
| OPS-06 | P0 | Missing | Tenant isolation, IDOR, token misuse, replay, privilege escalation, dependency, and secret security testing | 4–6 | IAM and capability work |
| OPS-07 | P1 | Missing | Load/capacity tests for auth, token exchange, gateway, employee directory, attendance, pings, reports, and payroll | 3–5 | Stable flows |
| OPS-08 | P1 | Missing | Failure/chaos tests for Platform, HRMS, Redis, queue, storage, mail, event duplication/order, and recovery | 3–5 | OPS-04 |
| OPS-09 | P1 | Missing | Runbooks for outage, token/key incident, migration, replay, restore, tenant rollback, payroll, field, and biometric incidents | 2–3 | OPS-03–OPS-08 |
| OPS-10 | P1 | Missing | Staging rehearsal using the exact production artifacts and anonymized production-like data | 2–4 | All P0 gates |
| OPS-11 | P2 | Missing | Autoscaling, multi-zone resilience, cost controls, long-term archiving, and disaster recovery site if required | 5–10 | Production load profile |

### 5.14 New-product onboarding kit for Mail, POS, and future products

The goal is not zero Platform work for every product. The goal is that Platform receives a manifest/configuration and performs a standard review, instead of adding product-specific authorization and billing code.

| ID | Priority | Status | Pending outcome | Effort | Depends on |
|---|---:|---|---|---:|---|
| KIT-01 | P0 | Missing | Versioned product manifest schema with routes, audience, capabilities, permissions, limits, health, localization, and lifecycle support | 2–3 | PLT-01, CON-01 |
| KIT-02 | P0 | Missing | Product repository starter/template with API/web, token guard, capability guard, health, OpenAPI, events, Docker, and CI | 4–6 | KIT-01 |
| KIT-03 | P0 | Missing | Reusable Platform SDK/client for token validation, entitlement retrieval, events, usage, tenant context, and standard errors | 3–5 | PLT-04, PLT-06, PLT-07, PLT-13 |
| KIT-04 | P0 | Missing | Automated conformance suite covering tenant isolation, wrong audience, entitlement denial, lifecycle idempotency, usage, and health | 3–4 | KIT-02, KIT-03 |
| KIT-05 | P1 | Missing | CLI/workflow to register a manifest, seed catalog, configure gateway, generate credentials, and create sandbox tenant | 3–5 | PLT-10, PLT-14, KIT-01 |
| KIT-06 | P1 | Missing | Standard product navigation cards, unavailable states, billing add-ons, audit, and support integration | 2–3 | PLT-08–PLT-12 |
| KIT-07 | P1 | Missing | Developer guide with a reference sample product and local compose integration | 3–4 | KIT-02–KIT-05 |
| KIT-08 | P1 | Missing | Onboard a tiny reference/demo product without changing Platform business code | 2–3 | KIT-01–KIT-07 |
| KIT-09 | P1 | Missing | Use Mail as the first real conformance customer; record every Platform change required | Product-dependent | KIT-08 |
| KIT-10 | P1 | Missing | Use POS as the second conformance customer; Platform changes should be configuration/generalization only | Product-dependent | KIT-09 |

**Reusable-platform exit test:** a new sample product can be registered, provisioned, priced, opened, authorized, suspended, metered, observed, and removed using published contracts and standard configuration, with no product-name conditional added to Platform services.

## 6. Recommended delivery sequence

### Wave 0 — Decisions and safety baseline (weeks 1–2)

- close Section 4 decisions;
- select canonical roadmap and evidence process;
- freeze duplicate mobile ownership and conflicting catalog keys;
- add failing P0 security/capacity/mobile contract tests;
- approve staffing and release scope.

### Wave 1 — One vocabulary and safe Platform boundary (weeks 2–7)

- canonical contracts and product catalog;
- generic registry foundation;
- subscription status and entitlement resolver;
- HRMS capability guard;
- browser SSO and tenant-isolation closure;
- published-package compatibility gates.

### Wave 2 — HRMS stabilization and mobile API foundation (weeks 5–13)

- employee/org lifecycle and imports;
- legacy web API cleanup;
- attendance/leave/device stabilization;
- missing mobile self-service APIs;
- Platform/HRMS mobile token architecture;
- offline identity scoping.

### Wave 3 — Plans, pricing, usage, and tenant authorization (weeks 8–17)

- edition + capacity + add-ons;
- employee capacity enforcement;
- HRMS usage events and Platform reconciliation;
- role administration bounded by entitlements;
- plan/billing UI and upgrade/downgrade behavior;
- existing subscription migration dry-run.

### Wave 4 — Field and face attendance (weeks 11–24)

Field and face teams can work in parallel after contracts, capability guards, and mobile authentication are stable.

- field sessions, pings, mobile background behavior, manager board, privacy and reports;
- biometric consent/enrollment, provider integration, punch verification, storage, admin review, and security tests.

### Wave 5 — Payroll, reporting, and product polish (weeks 14–27)

- jurisdiction validation and golden calculations;
- payroll E2E, outputs, corrections, and operations;
- complete reporting/export/audit;
- localization, accessibility, responsive behavior, and controlled error states.

### Wave 6 — Generic onboarding kit and reference product (weeks 16–28)

- repository template, SDK, registration workflow, conformance suite, developer guide;
- integrate a reference product without Platform conditionals;
- use lessons to harden the Mail/POS onboarding standard.

### Wave 7 — Migration and production hardening (weeks 22–36)

- data and object migration tooling;
- reconciliation and rollback rehearsal;
- observability, security, load, failure, backup/restore, and release evidence;
- staging rehearsal, pilot tenant, batch rollout, observation.

### Wave 8 — Retirement and maturity (after observation)

- remove duplicate mobile copy;
- close monolith compatibility window;
- remove legacy HRMS runtime code from Platform;
- later retention-approved database cleanup;
- enterprise SSO, advanced resilience, or additional jurisdiction work as separately funded scope.

## 7. Time estimate

### 7.1 Assumptions

The calendar estimate assumes a stable team of approximately:

- 2 Platform backend engineers;
- 2 HRMS backend/domain engineers;
- 1 web engineer;
- 1 Flutter engineer;
- 1 QA automation engineer;
- 1 DevOps/SRE engineer shared with security/DBA;
- active product owner plus payroll, security, and legal specialists when required.

It also assumes:

- a third-party or already validated face/liveness engine;
- no full rewrite of existing HRMS/payroll foundations;
- product decisions are made within days, not months;
- environments and package credentials are available;
- Mail and POS internal feature development is outside this estimate.

### 7.2 Calendar ranges

| Milestone | Recommended team | Small 3–4 person team | Solo developer |
|---|---:|---:|---:|
| Reliable local integrated beta: Platform + gateway + HRMS core web | 8–12 weeks | 16–24 weeks | 8–12 months |
| Production-ready HRMS core, mobile basics, plans/capacity, and payroll launch scope | 20–28 weeks | 36–52 weeks | 18–28 months |
| Add complete field and provider-backed face attendance | 26–36 weeks total | 48–68 weeks total | 26–38 months total |
| Add reusable product onboarding kit and production migration/hardening | **36–48 weeks total** | **60–84 weeks total** | **32–48 months total** |

The practical planning number for the requested complete Platform + HRMS v1 is therefore:

> **Approximately 9–12 months with a focused 7–9 person cross-functional team.**

A credible first production release can be smaller and reached in approximately **5–7 months** by launching core HRMS, office attendance, leave, approved payroll scope, basic mobile, and plans/capacity first, then releasing field and face attendance in controlled later waves.

If Delsia builds its own face/liveness engine, supports many payroll jurisdictions at launch, or includes complete Mail and POS business functionality, the schedule must be extended.

### 7.3 Confidence

This is a roadmap-level estimate with approximately **±30% uncertainty**. After Wave 0 and two weeks of endpoint-by-endpoint backlog refinement, the team should replace it with sprint estimates based on:

- approved commercial and jurisdiction scope;
- the chosen biometric provider;
- actual production data volume and quality;
- current test/build health;
- team availability and skills;
- whether payments/tax/invoicing require additional countries/providers.

## 8. Critical path

The fastest safe order is:

```text
Decisions
  → canonical contracts/catalog
  → generic entitlement resolver
  → HRMS capability enforcement
  → mobile product-token architecture
  → missing self-service APIs
  → employee capacity and usage
  → field/face complete flows
  → migration + security + operational evidence
  → production rollout
```

The following activities must not be used to bypass that path:

- redesigning pages without fixing their APIs;
- hiding a feature in UI without server enforcement;
- renaming legacy URLs without changing authentication and DTO contracts;
- treating schema/models as proof that a feature works;
- treating old monolith tests as separated-runtime evidence;
- deleting the duplicate mobile or monolith HRMS copy before rollback gates;
- launching face verification without legal/privacy/security approval.

## 9. First three sprints

Assuming two-week sprints:

### Sprint 1

- approve DEC-01 through DEC-12;
- establish this roadmap as the master status source;
- freeze duplicate mobile and catalog drift;
- publish canonical capability/limit/error draft;
- create route-to-capability inventory;
- add regression tests demonstrating payroll-without-entitlement and employee-capacity gaps;
- baseline local full-stack startup and failures.

### Sprint 2

- implement generic product registry foundation;
- implement HRMS capability guard on payroll and field endpoints first;
- define edition/capacity schema migration;
- define separated mobile OpenAPI surface;
- implement dual mobile client/session coordinator skeleton;
- implement runtime/self-profile/history endpoint slices;
- add tenant-isolation contract tests.

### Sprint 3

- expand capability guard to every HRMS route;
- implement employee capacity lock/counter and create/import boundary tests;
- implement field session and ping contracts/services;
- implement biometric consent/enrollment contract and provider spike;
- generate typed Dart clients;
- establish CI contract compatibility and real-stack smoke lane.

## 10. Release tracks

To avoid waiting for every enterprise feature before learning from users, use controlled tracks.

### Release A — Core HRMS

- organization and employees;
- office attendance, shifts, rosters, holidays;
- leave and regularization;
- basic reports/documents;
- approved payroll jurisdiction;
- Platform SSO, tenant roles, Silver/Gold/Platinum capabilities;
- 50/100/200 employee limits;
- basic employee mobile check-in/out.

### Release B — Field workforce

- field policies and employees;
- session/ping ingestion;
- background/offline tracking;
- live manager board and route summaries;
- privacy/retention controls;
- field capability/add-on billing.

### Release C — Face-verified attendance

- consent and alternatives;
- enrollment and reset;
- provider-backed liveness/matching;
- punch decision and fallback/manual review;
- security, storage, deletion, and audit evidence;
- face capability/add-on billing.

### Release D — Platform ecosystem readiness

- generic manifest registry and SDK;
- product template and conformance suite;
- developer sandbox and registration workflow;
- reference product onboarding;
- Mail and POS integration trials.

## 11. Final acceptance checklist

The complete-product milestone is achieved only when:

- [ ] Platform contains no HRMS-specific conditional in generic product onboarding paths.
- [ ] HRMS capabilities and limits are resolved by Platform and enforced by HRMS server-side.
- [ ] Tenant admins manage their employees' roles without being able to grant unpurchased functionality.
- [ ] Employee 51/101/201 is rejected atomically until the capacity is upgraded.
- [ ] Browser and mobile use Platform authentication and correct product tokens.
- [ ] No active web or mobile request uses a legacy flat HRMS API path.
- [ ] Office, field, and face attendance pass real-device online/offline E2E tests.
- [ ] Face attendance passes privacy, liveness, spoof, retention, and deletion gates.
- [ ] Payroll passes approved jurisdiction calculations and financial reconciliation.
- [ ] Platform and HRMS deploy, scale, back up, restore, and roll back independently.
- [ ] Production data migration is idempotent, reconciled, pilot-tested, and reversible during the rollback window.
- [ ] A reference product integrates using the template/SDK/conformance suite without Platform business-code changes.
- [ ] Staging evidence is approved by product, engineering, QA, security, DBA, operations, and relevant legal/payroll owners.

## 12. Source plans retained for detailed execution

This roadmap summarizes and prioritizes the following detailed plans; it does not delete them:

- `PLATFORM-HRMS-SEPARATION-CORRECTIVE-IMPLEMENTATION-PLAN.md`
- `HRMS-MOBILE-OWNERSHIP-AND-API-MIGRATION-IMPLEMENTATION-PLAN.md`
- `HRMS-PLANS-PRICING-AND-ENTITLEMENT-CORRECTIVE-IMPLEMENTATION-PLAN.md`
- `PRODUCT-INTEGRATION-AND-DEPLOYMENT-GUIDE.md`
- `PLATFORM-MODULE-AND-PLAN-CATALOG-IMPLEMENTATION-PLAN.md` (historical taxonomy only)
- `deltcrm-hrms/docs/plans/multi-product-platform/HRMS-SEPARATION-MASTER-CHECKLIST.md`
- `deltcrm-hrms/docs/MULTI-PRODUCT-PLATFORM-INTEGRATION-IMPLEMENTATION-PLAN.md`

Where those documents conflict, the decisions in Sections 4 and 5 of this roadmap and the newer corrective plans take precedence after product-owner approval.
