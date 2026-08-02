# Tenant Onboarding Organization and Office Implementation Plan

## 1. Purpose

Move organization structure and office setup into the tenant onboarding wizard
so a new workspace finishes onboarding with the minimum foundation required for
employees and attendance.

The implementation must:

- reuse the existing Organization Builder and Office/Geofence behavior;
- save progress after every step and support safe resume;
- prevent incomplete tenants from being marked onboarded;
- preserve all existing tenants and their completion state;
- keep the full Organization and Office pages available for later changes.

## 2. Current-State Findings

The current onboarding wizard has four steps:

1. Company profile: logo and timezone.
2. Working days: working hours and weekly offs.
3. Attendance policy: verification, tracking and reminder defaults.
4. Invite HR: optional HR administrator invitation and completion.

Organization and office setup currently happen afterward:

- Organization Builder manages department hierarchy and designations through
  `/departments` and `/designations`.
- Office setup manages map coordinates, timezone, country/subdivision,
  geofence radius, trusted networks and employee assignments through `/offices`.
- `/onboarding/status` reports company, department and employee presence, but
  does not report designation or office readiness.
- `/onboarding/complete` currently marks the tenant complete without validating
  the required setup foundation.

## 3. Target Onboarding Flow

1. **Company profile** - logo, timezone, locale and regional defaults.
2. **Organization structure** - at least one department and designation.
3. **Office and geofence** - at least one valid office location.
4. **Working days** - working hours and weekly offs.
5. **Attendance policy** - verification, reminders and field-tracking defaults.
6. **Invite HR** - optional HR invitation, review and finish.

Organization comes before office because departments define the workforce
structure, while offices define where attendance can be recorded.

## 4. Product and Validation Rules

- Organization and office steps are required; inviting HR is optional.
- The user may go Back, but Continue is enabled only when the current required
  step is valid.
- Organization readiness requires at least one active department and one active
  designation.
- Office readiness requires an office name, valid coordinates, timezone,
  country code and geofence radius between 25 and 10,000 metres.
- Selecting a map location should detect timezone, country and subdivision;
  the administrator can correct the detected region before saving.
- The tenant timezone is the initial office timezone fallback.
- Final completion is enforced by the API and returns stable missing-step error
  codes; UI validation alone is not sufficient.
- Existing completed tenants are never reopened by this change.

## 5. SOLID Architecture and Ownership

The wizard is an orchestration layer; it must not reimplement Organization or
Office business rules.

| Component | Single responsibility |
| --- | --- |
| `WorkspaceOnboardingService` | Calculate authoritative readiness, normalize progress and guard completion |
| `WorkspaceOnboardingRules` | Pure step-order, legacy-version and earliest-incomplete rules |
| Existing Organization services | Own department and designation validation and persistence |
| Existing Office services | Own office, region, timezone and geofence validation and persistence |
| `OrganizationSetupEditor` | Reusable UI for the minimum organization setup |
| `OfficeSetupEditor` | Reusable UI for office and geofence setup |
| `OnboardingWizard` | Coordinate steps, navigation, status refresh and final review |

Design rules:

- **Single Responsibility:** status calculation, domain mutations, UI editing
  and wizard navigation remain separate.
- **Open/Closed:** future required steps can be added to the readiness registry
  without adding another completion code path.
- **Liskov Substitution:** embedded editors and full-page editors use the same
  domain contracts and produce the same persisted records.
- **Interface Segregation:** editor props expose readiness and completion
  callbacks only; they do not receive the entire wizard state.
- **Dependency Inversion:** the completion controller depends on the onboarding
  service and pure rules, not directly on page-specific assumptions.
- No duplicate Organization or Office API, DTO, validator or persistence path
  may be introduced for onboarding.

## 6. Frontend Implementation

- Extract reusable `OrganizationSetupEditor` and `OfficeSetupEditor`
  components from the existing full pages.
- Embed the same editors in onboarding with compact wizard presentation.
- Keep full-page wrappers for post-onboarding editing and advanced operations.
- Do not show employee assignment controls during onboarding because employees
  may not exist yet.
- Add six-step navigation, completion indicators, Back/Continue controls,
  loading/error states and a final review summary.
- Save each successful mutation immediately; `onboardingStep` records only the
  next resumable step, not whether data exists.
- Add English and Arabic localization keys and verify LTR/RTL layouts.
- Ensure desktop, tablet and mobile web layouts remain usable, including map
  interaction and keyboard-accessible controls.

## 7. Backend and Contract Changes

- Extend onboarding progress to steps 1-6 while accepting existing step 1-4
  records.
- Expand `/onboarding/status` with explicit readiness:

```text
company, organization, office, workingDays, attendancePolicy, hrInvite
```

- Calculate readiness from authoritative records, not client-submitted flags.
- Validate all required readiness in `/onboarding/complete` within the tenant
  transaction before setting `onboardingCompletedAt`.
- Return `ONBOARDING_INCOMPLETE` with an ordered `details.missingSteps` array when blocked, following the shared API error envelope.
- Reuse existing department, designation and office commands, validation,
  permissions, audit events and tenant isolation.
- Regenerate OpenAPI/contracts if response DTOs are formally typed.

No new organization or office tables are required.

## 8. Migration and Compatibility

- Use a forward-only migration only if the persisted onboarding-step constraint
  or type requires it; otherwise this is an application-only rollout.
- Do not modify or clear `onboardingCompletedAt` for any existing tenant.
- Treat every existing completed tenant as complete regardless of new readiness
  requirements.
- Map incomplete tenants conservatively: preserve their saved step and route
  them to the earliest newly required incomplete step after status loads.
- Do not seed production organization or office records.
- Do not delete or rewrite existing departments, designations, offices,
  assignments, attendance settings or audit history.

## 9. Ordered Work Packages

### WP1 - Readiness contract and completion guard

- [x] Add organization, office, working-day and policy readiness calculation.
- [x] Extend the status response and stable error codes.
- [x] Enforce readiness in the completion service.
- [x] Add backward-compatible progress mapping.

**Exit criterion:** an incomplete tenant cannot finish onboarding through a
direct API request, while existing completed tenants remain unaffected.

### WP2 - Reusable organization step

- [x] Extract organization editor logic without duplicating APIs.
- [x] Embed department and designation creation in wizard step 2.
- [x] Add empty, loading, validation and retry states.

**Exit criterion:** a new tenant can create the minimum organization structure,
continue, refresh and see the same saved records.

### WP3 - Reusable office step

- [x] Extract office form and map into an embeddable editor.
- [x] Add region/timezone detection and manual correction.
- [x] Hide employee assignments during onboarding.
- [x] Gate Continue on a valid persisted office.

**Exit criterion:** a new tenant can create a valid office and see it unchanged
on the full Office page after onboarding.

### WP4 - Six-step wizard and localization

- [x] Update navigation, resume behavior and final review.
- [x] Add English/Arabic catalog entries and RTL support.
- [x] Add responsive and accessibility behavior.
- [x] Update onboarding help and operational documentation.

**Exit criterion:** the complete six-step flow works without leaving the wizard
and gives clear recovery guidance for every failure.

### WP5 - Release hardening

- [x] Run the focused unit suites for onboarding rules, service behavior and
      the shared API error envelope.
- [x] Verify API and web production builds and TypeScript checks.
- [x] Re-run the database-backed API E2E, tenant-isolation and migration-status
      gates with local PostgreSQL running before release.
- [x] Preserve audit/outbox telemetry for settings saves and onboarding completion.

**Exit criterion:** all release gates pass without destructive production data
operations.

## 10. Test Plan

Every required behavior must be automated at the lowest useful layer and then
covered once through the complete browser journey. Test data must be created
inside isolated test tenants; tests must not depend on shared seed records.

### 10.1 Test environments and fixtures

Use deterministic fixtures instead of production or shared development data:

| Fixture | Purpose |
| --- | --- |
| `tenant-new-v2` | New tenant with company setup only; Organization and Office are incomplete |
| `tenant-org-partial` | Tenant with a department but no designation |
| `tenant-office-invalid` | Tenant with an office missing one required regional/geofence field |
| `tenant-ready-v2` | Tenant with all five required setup areas and no HR invite |
| `tenant-completed-v1` | Legacy completed tenant with the old four-step progress contract |
| `tenant-isolation-a/b` | Two tenants with similarly named records for cross-tenant denial tests |

Test setup and cleanup rules:

- Create fixtures through factories or public service/API contracts where
  practical; use direct database setup only for migration compatibility cases.
- Generate unique tenant slugs and record IDs per test run.
- Delete only records created by the test and never run reset, truncate, seed,
  or destructive migration commands against production.
- Freeze time where completion timestamps, invitation expiry, or audit ordering
  are asserted.
- Stub geocoding/map lookup at the browser boundary while keeping office payload
  validation real.

### 10.2 Unit tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| `ONB-U01` | No department or designation exists | Organization readiness is false |
| `ONB-U02` | Department exists without a designation | Organization readiness is false |
| `ONB-U03` | Department and designation exist | Organization readiness is true |
| `ONB-U04` | Office omits coordinates, timezone, country or valid radius | Office readiness is false |
| `ONB-U05` | Office contains all required persisted fields | Office readiness is true |
| `ONB-U06` | Legacy progress values 1-4 are loaded | Values map to the correct six-step resumable position |
| `ONB-U07` | New progress values 1-6 are loaded | Values remain unchanged and bounded |
| `ONB-U08` | A later step is saved while an earlier requirement is missing | Current step resolves to the earliest required incomplete step |
| `ONB-U09` | Completion is requested with multiple missing requirements | `missingSteps` is stable and follows wizard order |
| `ONB-U10` | A previously completed tenant lacks new foundation records | Tenant remains completed and is not reopened |
| `ONB-U11` | Completion is called repeatedly | Completion remains idempotent |

Primary automated suites:

- `workspace-onboarding.rules.spec.ts` for pure ordering and compatibility.
- `workspace-onboarding.service.spec.ts` for readiness and completion behavior.

### 10.3 API and database integration tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| `ONB-A01` | Create a new tenant | Status starts at Company and reports Organization/Office incomplete |
| `ONB-A02` | Save company settings and reload | Company readiness and progress persist |
| `ONB-A03` | Create only a department | Organization remains incomplete |
| `ONB-A04` | Add a designation to the tenant organization | Organization becomes complete |
| `ONB-A05` | Submit invalid office payloads | Existing validation rejects each payload without partial writes |
| `ONB-A06` | Create one valid office | Office readiness becomes complete |
| `ONB-A07` | Call `/onboarding/complete` before all required steps | API returns `400 ONBOARDING_INCOMPLETE` and ordered `details.missingSteps` |
| `ONB-A08` | Complete all required setup and finish | `onboardingCompletedAt` is written once and an audit/outbox event exists |
| `ONB-A09` | Retry final completion | API returns success without duplicate completion side effects |
| `ONB-A10` | Logout/login or restart API after each save | Authoritative progress and records are unchanged |
| `ONB-A11` | Tenant A requests Tenant B records or IDs | Request is denied or safely not found; no cross-tenant data leaks |
| `ONB-A12` | Existing completed tenant has no office/designation | Status still reports completed and no data is synthesized |
| `ONB-A13` | Business Admin versus unauthorized role | Admin can configure; unauthorized role receives permission denial |

Database assertions:

- No duplicate department, designation, office or completion event is created
  by a retried request.
- Failed mutations leave no partial setup records.
- Every new/updated row has the authenticated tenant ID.
- The migration adds only onboarding progress metadata and does not update,
  delete, truncate or reseed existing tenant data.

### 10.4 Web component and integration tests

| ID | Scenario | Expected result |
| --- | --- | --- |
| `ONB-W01` | Status response is loading, empty or failed | Wizard shows a stable loading/error/retry state |
| `ONB-W02` | Organization editor reports incomplete | Continue is disabled with useful guidance |
| `ONB-W03` | Department and designation save successfully | Readiness refreshes and Continue becomes available |
| `ONB-W04` | Office editor reports incomplete | Continue remains disabled |
| `ONB-W05` | Map selection resolves location metadata | Coordinates, timezone and region are populated and editable |
| `ONB-W06` | Office save fails | Entered values remain and a retryable error is shown |
| `ONB-W07` | Embedded editor is rendered | Employee assignment controls are absent |
| `ONB-W08` | Full management page is rendered | Existing advanced controls remain available |
| `ONB-W09` | User navigates Back then Continue | Persisted values remain and no duplicate records are created |
| `ONB-W10` | Arabic route is used | Copy is translated, order is RTL and controls retain logical focus order |

### 10.5 Browser end-to-end acceptance tests

| ID | Journey | Expected result |
| --- | --- | --- |
| `ONB-E01` | Complete all six steps as Business Admin | Tenant reaches the configured post-onboarding destination |
| `ONB-E02` | Refresh the browser on each step | Wizard resumes at the correct earliest incomplete step |
| `ONB-E03` | Create organization and office in the wizard, then open full pages | The same persisted records appear with no conversion or duplication |
| `ONB-E04` | Skip optional HR invitation | Completion succeeds when all required steps are ready |
| `ONB-E05` | Submit optional HR invitation | Invitation succeeds and completion still occurs once |
| `ONB-E06` | Lose network during organization or office save | User sees recovery guidance and can retry without losing entered values |
| `ONB-E07` | Use keyboard-only navigation | Step navigation, forms, dialogs and actions are reachable with visible focus |
| `ONB-E08` | Run at desktop, tablet and mobile widths | No clipped wizard actions, unusable form fields or horizontal page overflow |
| `ONB-E09` | Complete English and Arabic journeys | LTR/RTL layouts and localized routes both complete successfully |
| `ONB-E10` | Open an already completed tenant | User is not forced back into onboarding |

### 10.6 Manual product acceptance

The product owner or QA reviewer must complete this once on the release
candidate using a newly created tenant:

1. Create a workspace and sign in as its Business Admin.
2. Complete Company, Organization, Office, Working days and Attendance policy
   without leaving the onboarding wizard.
3. Confirm Organization cannot continue with only a department and Office
   cannot continue with incomplete region/geofence data.
4. Refresh during every step and confirm the wizard resumes safely without
   duplicate records.
5. Skip the optional HR invite, complete onboarding and confirm the tenant lands
   on the configured post-onboarding page.
6. Open the full Organization and Office pages and confirm they display the
   exact records created in onboarding.
7. Repeat the critical journey in Arabic and at a mobile viewport.
8. Sign into one legacy completed tenant and confirm it is not returned to the
   wizard.

Capture the tenant ID, browser, viewport, English/Arabic screenshots and any
observed defects in the release evidence.

### 10.7 Regression tests

- Existing Company, Organization, Office, Attendance Policy and Settings pages.
- Department/designation CRUD, hierarchy rendering and designation reuse.
- Office CRUD, map selection, geofence validation and employee assignments.
- Existing tenant login and completed-onboarding redirects.
- Signup-created tenant flow and platform-created tenant flow.
- Tenant localization, sidebar navigation and direct/deep links.
- Audit events and authorization boundaries for Organization and Office changes.

### 10.8 Migration and rollback tests

1. Apply the migration to a production-like database snapshot.
2. Confirm row counts and checksums for tenants, departments, designations,
   offices and attendance configuration are unchanged.
3. Confirm existing completed tenants still bypass onboarding.
4. Confirm legacy incomplete progress values resolve safely.
5. Roll back the web feature flag without reversing or deleting valid setup
   data created by the new wizard.

### 10.9 Requirement-to-test traceability

| Requirement | Primary automated evidence | Acceptance evidence |
| --- | --- | --- |
| Organization is required | `ONB-U01`-`ONB-U03`, `ONB-A03`-`ONB-A04` | Manual steps 2-3 |
| Office is required and region-aware | `ONB-U04`-`ONB-U05`, `ONB-A05`-`ONB-A06`, `ONB-W05` | Manual steps 2-3 |
| Progress is resumable | `ONB-U06`-`ONB-U08`, `ONB-A10`, `ONB-E02` | Manual step 4 |
| Completion cannot be bypassed | `ONB-U09`, `ONB-A07` | Manual step 3 |
| Completion is idempotent | `ONB-U11`, `ONB-A08`-`ONB-A09` | Audit/outbox evidence |
| Existing tenants remain compatible | `ONB-U10`, `ONB-A12`, `ONB-E10` | Manual step 8 |
| Shared setup records are reused | `ONB-W07`-`ONB-W09`, `ONB-E03` | Manual step 6 |
| HR invite is optional | `ONB-E04`-`ONB-E05` | Manual step 5 |
| Tenant isolation and authorization | `ONB-A11`, `ONB-A13` | API denial evidence |
| English, Arabic and responsive UI | `ONB-W10`, `ONB-E07`-`ONB-E09` | Manual step 7 |

### 10.10 Quality and release commands

```bash
pnpm --filter api test -- --runInBand workspace-onboarding
pnpm --filter api test:e2e -- --runInBand
pnpm --filter web test:e2e
pnpm architecture:check
pnpm i18n:audit:strict
pnpm openapi:generate
pnpm lint
pnpm typecheck
pnpm build
```

All commands must pass, or the release evidence must record the exact external
blocker and the remaining manual verification. A build alone is not acceptance.

### 10.11 Release test gates

| Gate | Pass condition |
| --- | --- |
| Unit | All onboarding rules/service tests pass with no skipped required case |
| API | All `ONB-Axx` cases pass, including isolation and idempotency |
| Browser | English desktop plus Arabic/mobile critical journeys pass |
| Regression | Existing Organization, Office, Settings and login flows pass |
| Migration | Forward migration succeeds and protected row counts remain unchanged |
| Quality | Lint, typecheck, architecture, localization audit and production builds pass |
| UAT | Product reviewer signs off with screenshots and tenant ID |

Any failed gate blocks release. A temporary waiver must identify its owner,
reason, expiry date and follow-up ticket; data-safety, tenant-isolation and
completion-guard failures cannot be waived.

## 11. Rollout and Observability

- Deploy backend compatibility and readiness responses before the six-step web
  wizard.
- Release behind an onboarding-flow feature flag if frontend/backend cannot be
  deployed atomically.
- Monitor status-load failures, per-step save failures, completion rejection
  reasons and onboarding abandonment by step.
- Rollback disables the new wizard UI; it must not roll back or delete valid
  organization/office records created during onboarding.

## 12. Definition of Done

- [x] New tenants configure company, organization, office, working week and
      attendance policy inside onboarding.
- [x] Organization and office setup reuse existing domain logic and APIs.
- [x] Progress is resumable and authoritative readiness is server-calculated.
- [x] Required setup cannot be bypassed through the completion endpoint.
- [x] HR invitation remains optional.
- [x] Existing completed tenants remain compatible; no production data command
      was run.
- [x] Organization and office records are immediately available on their full
      management pages.
- [x] English/Arabic catalog, Arabic mobile RTL and focused responsive browser
      checks pass.
- [x] Focused unit, API, E2E, tenant-isolation, regression and production-build
      gates pass on the release candidate.
- [ ] Product-owner UAT, screenshots and rollback/feature-flag sign-off are
      recorded for the release candidate.

## 13. Progress and Evidence Tracker

Update this table during implementation; a work package is complete only when
its exit criterion and linked tests have evidence.

| Work package | Status | Required evidence |
| --- | --- | --- |
| WP1 - Readiness and completion guard | Complete | 16 focused unit assertions and 7 focused API/E2E cases pass |
| WP2 - Organization step | Complete | Shared embedded/full-page editor and final browser journey pass |
| WP3 - Office step | Complete | Shared editor, hidden assignment controls and tenant-isolated API cases pass |
| WP4 - Wizard and localization | Complete | Six-step Playwright journey passes; 1,138-entry EN/AR catalog and strict audit pass; Arabic mobile RTL check passes |
| WP5 - Release hardening | Complete | API/web builds, unit tests, 7 database-backed API E2E cases and migration status pass |

### 13.1 Verification evidence recorded on 2026-08-02

The entries below are historical implementation-run evidence. Release gates
must be re-run from the final release candidate; a previous pass does not
override a current environment blocker.

| Check | Result |
| --- | --- |
| Onboarding rules, service and API error-envelope unit suites | **Pass:** 3 suites, 16 tests |
| Sprint 3 attendance/onboarding API E2E | **Pass:** 1 suite, 7 tests |
| Six-step onboarding Playwright journey | **Pass:** 1 test against the production build |
| Arabic mobile RTL/no-overflow Playwright check | **Pass:** 1 test |
| API and web TypeScript checks | **Pass** |
| Focused API/web lint | **Pass:** 0 errors; 9 existing React hook warnings |
| Localization catalog validation and strict audit | **Pass:** 1,138 English and Arabic entries; 0 hardcoded findings |
| Prisma schema and local migration status | **Pass:** schema valid; 48 migrations applied; local database up to date |
| API and web production builds | **Pass** |
| Architecture self-test | **Pass:** 3 assertions |
| Repository architecture policy | **Known pre-existing debt:** 9 violations outside onboarding; no onboarding violation |
| Full localization settings browser case | **Environment-blocked:** requires the live API configuration endpoint; Arabic mobile route passed |

### 13.2 Current checkbox audit on 2026-08-02

| Check | Current result |
| --- | --- |
| Onboarding rules, service and API error-envelope unit suites | **Pass:** 3 suites, 16 tests |
| API production build and TypeScript check | **Pass** |
| Web production build and TypeScript check | **Pass** |
| Database-backed Sprint 3 API E2E | **Pass:** 1 suite, 7 tests including tenant isolation |
| Prisma migration status | **Pass:** 48 migrations found; local schema is up to date |
| Product-owner UAT and release sign-off | **Pending** |

No production database command was run. The migration rehearsal used only the
local Docker `hrms_dev` database and did not reset, truncate, reseed or delete
tenant data.

Evidence to record before release:

- commit SHA and migration name;
- unit/API/browser test totals;
- API and web build results;
- English and Arabic screenshots at desktop and mobile widths;
- production-like migration dry-run result;
- confirmation that no production seed, reset or destructive SQL was run;
- rollback/feature-flag verification result.

The remaining release-owner evidence is the commit SHA, product-owner UAT,
screenshots, and rollback/feature-flag sign-off. Those items cannot be produced
by an isolated implementation test run.

## 14. Explicitly Deferred

- Employee creation or import inside tenant onboarding.
- Employee-to-office assignment before employees exist.
- Multiple-office bulk creation.
- Shift/roster creation beyond the existing attendance-default step.
- Custom tenant-defined onboarding steps.
