
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

## 5. Frontend Implementation

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

## 6. Backend and Contract Changes

- Extend onboarding progress to steps 1-6 while accepting existing step 1-4
  records.
- Expand `/onboarding/status` with explicit readiness:

```text
company, organization, office, workingDays, attendancePolicy, hrInvite
```

- Calculate readiness from authoritative records, not client-submitted flags.
- Validate all required readiness in `/onboarding/complete` within the tenant
  transaction before setting `onboardingCompletedAt`.
- Return `ONBOARDING_INCOMPLETE` with a `missingSteps` array when blocked.
- Reuse existing department, designation and office commands, validation,
  permissions, audit events and tenant isolation.
- Regenerate OpenAPI/contracts if response DTOs are formally typed.

No new organization or office tables are required.

## 7. Migration and Compatibility

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

## 8. Ordered Work Packages

### WP1 - Readiness contract and completion guard

- [ ] Add organization, office, working-day and policy readiness calculation.
- [ ] Extend the status response and stable error codes.
- [ ] Enforce readiness in the completion service.
- [ ] Add backward-compatible progress mapping.

**Exit criterion:** an incomplete tenant cannot finish onboarding through a
direct API request, while existing completed tenants remain unaffected.

### WP2 - Reusable organization step

- [ ] Extract organization editor logic without duplicating APIs.
- [ ] Embed department and designation creation in wizard step 2.
- [ ] Add empty, loading, validation and retry states.

**Exit criterion:** a new tenant can create the minimum organization structure,
continue, refresh and see the same saved records.

### WP3 - Reusable office step

- [ ] Extract office form and map into an embeddable editor.
- [ ] Add region/timezone detection and manual correction.
- [ ] Hide employee assignments during onboarding.
- [ ] Gate Continue on a valid persisted office.

**Exit criterion:** a new tenant can create a valid office and see it unchanged
on the full Office page after onboarding.

### WP4 - Six-step wizard and localization

- [ ] Update navigation, resume behavior and final review.
- [ ] Add English/Arabic catalog entries and RTL support.
- [ ] Add responsive and accessibility behavior.
- [ ] Update onboarding help and operational documentation.

**Exit criterion:** the complete six-step flow works without leaving the wizard
and gives clear recovery guidance for every failure.

### WP5 - Release hardening

- [ ] Run API, web, tenant-isolation and regression suites.
- [ ] Verify production build and forward-only deployment procedure.
- [ ] Add telemetry for step saves, failures and onboarding completion.

**Exit criterion:** all release gates pass without destructive production data
operations.

## 9. Test Plan

### Unit tests

- Organization readiness with zero/one department and designation.
- Office readiness for missing name, coordinates, timezone, country and invalid
  radii.
- Six-step progress normalization for new and legacy saved values.
- Earliest-incomplete-step resolution.
- Completion validation and stable `missingSteps` ordering.
- Existing completed-tenant bypass behavior.

### API and database tests

- New tenant status starts at company setup.
- Department without designation does not complete organization.
- Valid department plus designation completes organization.
- Invalid office payloads remain rejected by existing validation.
- Valid office completes office readiness.
- Direct `/onboarding/complete` fails while required steps are missing.
- Completion succeeds once every required foundation exists.
- Repeated completion is idempotent.
- Saved progress survives logout/login and API restart.
- Cross-tenant department, designation and office access is denied.
- Audit events are created for setup changes and completion.
- Existing completed tenant remains completed with no office or designation.

### Web end-to-end tests

- Complete all six steps as Business Admin.
- Back/Continue navigation preserves saved organization and office data.
- Refresh at every step resumes correctly.
- Organization step shows field-level errors and retry behavior.
- Map selection fills location, timezone and region; manual correction persists.
- Continue remains blocked until required persisted data exists.
- Optional HR invite can be submitted or skipped.
- Final completion redirects to the tenant dashboard/settings destination.
- Created records appear on full Organization and Office pages.
- English and Arabic flows render correctly in LTR and RTL.
- Keyboard navigation, labels, focus management and modal/map fallback work.

### Regression and release checks

- Existing Company, Organization, Office, Attendance Policy and Settings pages.
- Existing tenant login and completed-onboarding redirect behavior.
- Department/designation CRUD and office CRUD/assignment behavior.
- Web typecheck, lint, tests and production build.
- API typecheck, unit/integration tests and production build.
- OpenAPI generation and architecture checks where applicable.
- Production migration dry run confirms no destructive SQL or data reset.

## 10. Rollout and Observability

- Deploy backend compatibility and readiness responses before the six-step web
  wizard.
- Release behind an onboarding-flow feature flag if frontend/backend cannot be
  deployed atomically.
- Monitor status-load failures, per-step save failures, completion rejection
  reasons and onboarding abandonment by step.
- Rollback disables the new wizard UI; it must not roll back or delete valid
  organization/office records created during onboarding.

## 11. Definition of Done

- [ ] New tenants configure company, organization, office, working week and
  attendance policy inside onboarding.
- [ ] Organization and office setup reuse existing domain logic and APIs.
- [ ] Progress is resumable and authoritative readiness is server-calculated.
- [ ] Required setup cannot be bypassed through the completion endpoint.
- [ ] HR invitation remains optional.
- [ ] Existing completed tenants and all production data remain unchanged.
- [ ] Organization and office records are immediately available on their full
  management pages.
- [ ] English/Arabic, responsive and accessibility checks pass.
- [ ] Unit, API, E2E, tenant-isolation, regression and production-build gates
  pass.

## 12. Explicitly Deferred

- Employee creation or import inside tenant onboarding.
- Employee-to-office assignment before employees exist.
- Multiple-office bulk creation.
- Shift/roster creation beyond the existing attendance-default step.
- Custom tenant-defined onboarding steps.
