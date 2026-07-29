# Employee Onboarding and Profile Expansion Implementation Plan

## 1. Purpose

Expand the existing DeltCRM Employee feature into a complete employee
onboarding and employee-record system without introducing a Candidate module.

The implementation must:

- keep Employee as the only workforce record;
- replace the current single-page Add Employee form with a resumable onboarding
  workflow;
- collect detailed personal, address, professional, education, experience,
  identity, document, organization, access, attendance, and payroll-readiness
  information;
- keep optional and sensitive fields from blocking basic employee creation;
- separate employee record creation, employment activation, and login access;
- preserve current employee directory, detail, document, history, attendance,
  leave, role, and import behavior;
- maintain tenant isolation, auditability, regional data support, and field-level
  privacy;
- avoid adding every new field directly to the `employees` table.

**Product decision:** DeltCRM will not add Candidates, recruitment stages, job
openings, interview workflows, or candidate-to-employee conversion in this
delivery. HR creates an Employee record directly and completes it through
onboarding.

## 2. Current-State Findings

### 2.1 Current employee data

The current `Employee` record contains:

- employee code;
- full name;
- phone;
- work type;
- status;
- date of birth;
- joining and exit dates;
- department;
- designation;
- manager;
- linked user account;
- default shift;
- biometric/face references;
- timestamps and relations to Attendance, Leave, documents, devices, and
  employment history.

The current system does not store:

- structured first, middle, and last names;
- personal email separately from official/login email;
- profile photograph separately from biometric evidence;
- present and permanent addresses;
- skills;
- source of hire;
- qualifications and education history;
- previous employment history;
- previous compensation and notice period;
- country-specific identifiers such as PAN, Aadhaar, UAN, passport, or
  residency numbers;
- onboarding progress or draft state.

### 2.2 Current creation behavior

`POST /employees` currently performs all of the following in one transaction:

1. validates employee, department, designation, and manager fields;
2. requires employee code, full name, official email, phone, date of birth,
   date of joining, department, and work type;
3. creates an active user account and Employee role;
4. generates a temporary password from employee name and phone;
5. marks the account email as verified;
6. creates the employee as `ACTIVE`;
7. creates the `JOINED` employment event;
8. provisions leave balances;
9. updates runtime configuration and subscription seat usage;
10. returns temporary credentials.

This makes it impossible to save an incomplete employee or complete onboarding
before giving system access.

### 2.3 Existing capabilities to preserve

- Server-side employee search, filtering, sorting, pagination, and quota data.
- Employee detail Overview, Assignments, Attendance, Leave, Account Access,
  Devices and Biometrics, Documents, and History.
- Department, designation, manager, office, shift, policy, and roster
  assignments.
- Private document upload, verification, signed download, deletion, and audit.
- Employee import with row-level validation and retry.
- Employment events and the consolidated employee History API.
- Separate `POST /employees/:id/account` support for employees without a user.
- Employee lifecycle termination and reactivation.
- Permission-aware self, manager, HR, and Business Admin access.

## 3. Target Employee Lifecycle

### 3.1 Employment status

Extend `EmployeeStatus` to:

```text
DRAFT
PRE_JOINING
ACTIVE
ON_NOTICE
TERMINATED
```

Rules:

- `DRAFT` means the employee record exists but onboarding is incomplete.
- `PRE_JOINING` means onboarding is complete and the employee has a future
  joining date.
- `ACTIVE` means the employee is eligible for normal attendance, leave, access,
  and payroll operations.
- `ON_NOTICE` and `TERMINATED` retain their current meanings.
- Draft employees do not consume an active subscription seat.
- Activating a draft begins seat usage.
- A scheduled worker promotes eligible `PRE_JOINING` employees to `ACTIVE` on
  the tenant-local joining date.
- Attendance and leave mutations reject `DRAFT` employees.

### 3.2 Onboarding status

Add a separate `EmployeeOnboardingStatus`:

```text
DRAFT
IN_PROGRESS
READY_TO_ACTIVATE
COMPLETED
```

This represents profile completion, not employment status.

Track:

- current step;
- completed steps;
- completion percentage;
- missing required fields;
- last saved at;
- completed at;
- completed by;
- activation at;
- activation by.

### 3.3 Separate actions

The target flow is:

```text
Create employee draft
  -> complete onboarding sections
  -> review missing requirements
  -> activate employment
  -> create login access when required
  -> assign or confirm Attendance, Leave, and Payroll setup
```

Employee activation and account creation are independent. An active employee
may exist without DeltCRM login access.

## 4. Employee Onboarding Experience

Replace the existing Add Employee page with a seven-step wizard.

### Step 1 - Personal details

- First name.
- Middle name, optional.
- Last name.
- Preferred/display name, optional.
- Personal email, optional.
- Phone with international country code.
- Date of birth, optional during draft.
- Profile photo, optional.
- Additional personal notes, optional and permission-restricted.

Draft requirement:

- first name;
- last name;
- at least one of personal email or phone.

The server assigns the next employee code when the draft is created. HR may
edit the code before activation.

### Step 2 - Address

Support `PRESENT` and `PERMANENT` addresses:

- address line 1;
- address line 2;
- city;
- country code;
- subdivision/state code;
- postal code;
- "same as present address."

Use ISO country and subdivision codes. Do not store country/state labels as the
authoritative values.

Addresses are optional by default. Tenant-configurable required fields are
deferred until after the fixed onboarding workflow is stable.

### Step 3 - Professional background

- Source of hire.
- Skills.
- Highest qualification, derived from education where available.
- Total experience, derived from experience rows where available.
- Previous/current employer.
- Previous job title.
- Previous compensation amount and ISO currency.
- Notice period in days.
- Additional professional notes.

The field described as "Current Salary" in the reference form means previous
compensation before joining DeltCRM's customer. It is not the employee's current
payroll salary. Current employment compensation belongs to the Payroll module.

Previous compensation is optional, encrypted or otherwise protected as
sensitive compensation data, and hidden from normal employee readers.

### Step 4 - Education and experience

Education supports multiple rows:

- institution/school name;
- degree or diploma;
- field of study;
- start date, optional;
- completion date, optional;
- currently studying;
- grade, optional;
- notes.

Experience supports multiple rows:

- occupation/job title;
- company;
- start date;
- end date;
- currently works here;
- location, optional;
- summary.

Experience rows must reject:

- end date before start date;
- multiple rows marked as current without an explicit warning/confirmation;
- impossible overlapping dates only when the tenant enables strict validation.

### Step 5 - Employment details

- Employee code.
- Official email, optional until account creation.
- Final/planned date of joining.
- Department.
- Designation/title.
- Primary office/location.
- Manager, optional.
- Work type.
- Default shift, optional.
- Attendance policy, optional direct override.
- Additional employment notes.

Activation requirements:

- employee code;
- first and last name;
- at least one personal contact method;
- joining date;
- department;
- designation;
- primary office;
- work type.

Official email is required only when login access is created.

### Step 6 - Identifiers and documents

Country-specific identifiers are optional unless a downstream compliance or
Payroll rule requires them:

- Aadhaar;
- PAN;
- UAN;
- passport;
- national ID;
- visa/residency number;
- other configured identifiers.

Documents reuse the existing private employee-document system:

- profile photo;
- offer letter;
- employment contract;
- identity document;
- address proof;
- education certificate;
- experience certificate;
- relieving letter;
- visa/residency document;
- policy acknowledgement;
- other.

Keep the current PDF, JPEG, PNG, and WebP support and 10 MB maximum. Do not
reduce the project limit to match another product's 5 MB limit.

### Step 7 - Access, assignments, and review

Display:

- onboarding completion;
- missing activation requirements;
- employee code and employment status;
- organization assignments;
- attendance setup readiness;
- leave provisioning status;
- payroll setup readiness;
- login access status.

Actions:

- Save draft.
- Save and continue.
- Back.
- Complete later.
- Activate employee.
- Create login access.
- Return to employee directory.

Do not combine activation and account creation into one mandatory button.

## 5. Data Model

### 5.1 Employee core changes

Add to `Employee`:

```text
firstName            String?
middleName           String?
lastName             String?
preferredName        String?
officialEmail        String?
onboardingStatus     EmployeeOnboardingStatus
onboardingStep       String?
onboardingCompletedAt DateTime?
onboardingCompletedBy String?
activatedAt          DateTime?
activatedBy          String?
```

Keep `fullName` for compatibility and search. For new and edited employees,
derive it from structured name fields unless a preferred display name is
explicitly selected.

Make draft-dependent employment fields nullable where required:

- date of joining;
- department;
- work type.

All activation-dependent services must narrow the employee to a validated
activated type before using these fields.

Add tenant-scoped uniqueness for non-null normalized `officialEmail`.

### 5.2 Employee personal profile

Create `EmployeePersonalProfile`:

```text
id
tenantId
employeeId
personalEmail
profilePhotoDocumentId
additionalNotes
createdAt
updatedAt
```

`masterSelfie` remains biometric attendance evidence and must never be reused
as the employee profile photograph.

### 5.3 Addresses

Create `EmployeeAddress`:

```text
id
tenantId
employeeId
addressType
addressLine1
addressLine2
city
countryCode
subdivisionCode
postalCode
createdAt
updatedAt
```

Use a tenant/employee/address-type unique constraint for the MVP.

### 5.4 Education and experience

Create:

- `EmployeeEducation`;
- `EmployeeExperience`.

Both tables are employee-owned, tenant-scoped, ordered, independently editable,
and audited.

Do not store repeated rows as JSON on `Employee`.

### 5.5 Skills and hire sources

Create:

- `Skill` as a tenant-level normalized lookup;
- `EmployeeSkill` as a many-to-many assignment;
- `HireSource` as a tenant-level configurable lookup.

Seed common hire sources, but allow HR to create and deactivate sources.

### 5.6 Professional background

Create `EmployeeProfessionalProfile`:

```text
id
tenantId
employeeId
hireSourceId
previousEmployer
previousTitle
previousCompensationMinor
previousCompensationCurrency
noticePeriodDays
additionalNotes
createdAt
updatedAt
```

Highest qualification and total experience are calculated projections and are
not independently editable when structured rows exist.

### 5.7 Country-specific identifiers

Create `EmployeeIdentifier`:

```text
id
tenantId
employeeId
countryCode
identifierType
encryptedValue
maskedValue
verificationStatus
issuedAt
expiresAt
createdBy
updatedBy
createdAt
updatedAt
```

Rules:

- never store identifier values in plaintext;
- never return the encrypted value to clients;
- show masked values by default;
- reveal full values only through a separately authorized and audited action if
  a valid business requirement exists;
- support region-specific types instead of adding PAN, Aadhaar, and UAN columns
  to `Employee`;
- avoid logging identifier request or response bodies.

## 6. Account and Activation Refactor

### 6.1 Draft creation

`POST /employees/drafts`:

- validates minimal personal information;
- reserves the next employee code;
- creates `EmployeeStatus.DRAFT`;
- creates `EmployeeOnboardingStatus.DRAFT`;
- does not create a user;
- does not create `JOINED`;
- does not provision leave;
- does not update active subscription seats;
- returns the employee ID and onboarding state.

### 6.2 Activation

`POST /employees/:id/activate`:

- locks the employee row;
- rejects an already activated employee idempotently;
- validates all activation requirements;
- validates department, designation, office, manager, shift, and policy
  relationships inside the tenant;
- checks subscription capacity;
- sets `PRE_JOINING` for a future joining date or `ACTIVE` otherwise;
- marks onboarding `COMPLETED`;
- creates exactly one `JOINED` employment event;
- provisions leave balances exactly once;
- updates subscription seat usage exactly once;
- refreshes runtime configuration;
- records a complete audit event and outbox event.

Activation must use an idempotency key or equivalent uniqueness guarantee.

### 6.3 Login access

Keep and improve `POST /employees/:id/account`:

- require a normalized official email;
- reject duplicate tenant email accounts;
- create the user and Employee role;
- link the user to the existing employee;
- return temporary credentials through the current no-email flow;
- record access creation in employee history;
- never activate employment automatically.

Remove account creation from the new onboarding draft endpoint.

Retain the current full `POST /employees` endpoint temporarily as a
compatibility/quick-create endpoint. Internally, it should call the same draft,
profile, activation, and optional account use cases rather than maintain a
second implementation.

## 7. API Plan

Add:

```http
POST   /employees/drafts
GET    /employees/:id/onboarding
PATCH  /employees/:id/personal
PUT    /employees/:id/addresses
PUT    /employees/:id/professional-profile
PUT    /employees/:id/education
PUT    /employees/:id/experience
PUT    /employees/:id/skills
PATCH  /employees/:id/employment
GET    /employees/:id/identifiers
POST   /employees/:id/identifiers
PATCH  /employees/:id/identifiers/:identifierId
DELETE /employees/:id/identifiers/:identifierId
POST   /employees/:id/activate
```

Requirements:

- use stable error codes for every validation and state conflict;
- return onboarding completion and missing-field information from the server;
- use replacement semantics for addresses/education/experience collections
  only with optimistic version checks;
- cap collection sizes;
- include idempotency for draft creation, activation, and document completion;
- regenerate OpenAPI, TypeScript contracts, and Flutter routes;
- do not expose sensitive fields in generic Employee list/detail responses.

## 8. Employee Directory

Retain the existing server-side pagination, search, sort, and filters.

Recommended columns:

- employee;
- employee code;
- official email;
- phone;
- primary office;
- department;
- designation;
- manager;
- joining date;
- work type;
- employment status;
- onboarding status.

Add filters:

- primary office;
- onboarding status;
- incomplete onboarding;
- pre-joining;
- missing official email;
- missing office;
- existing joining-soon and missing-manager filters.

Search should cover:

- structured and full names;
- employee code;
- official email;
- phone;
- office;
- department;
- designation.

Never display in the directory:

- Aadhaar, PAN, UAN, passport, or residency values;
- present/permanent address;
- previous compensation;
- private notes;
- document filenames;
- date of birth.

## 9. Employee Detail Information Architecture

Use these tabs:

1. Overview.
2. Personal.
3. Employment.
4. Organization and Assignments.
5. Address.
6. Education and Experience.
7. Documents.
8. Attendance.
9. Leave.
10. Payroll.
11. Account Access.
12. Devices and Biometrics.
13. History.

The Overview must show:

- employee code;
- status and onboarding status;
- profile photo;
- phone and official email;
- joining date;
- department and designation;
- office and manager;
- work type;
- onboarding progress;
- attendance state today;
- account-access state;
- concise setup-readiness items.

Do not place all editable fields on Overview. Each specialized tab owns its
fields and permissions.

## 10. Permissions and Privacy

Retain existing employee and document permissions. Add:

```text
organization.employee-personal.read
organization.employee-personal.manage
organization.employee-address.read
organization.employee-address.manage
organization.employee-background.read
organization.employee-background.manage
organization.employee-identifiers.read
organization.employee-identifiers.manage
organization.employee-compensation-sensitive.read
organization.employee-onboarding.activate
```

Default role behavior:

| Role | Default behavior |
| --- | --- |
| Business Admin | Full employee onboarding and sensitive-field management |
| HR Admin | Full onboarding, activation, documents, and identifiers |
| Manager | Reporting-line employee operational profile only; no identifiers or compensation |
| Employee | Own permitted profile fields; no administrative notes or protected identifier values |
| Platform Admin | No routine protected-field visibility; support access only through audited impersonation |

Security requirements:

- tenant-scope every new table and query;
- encrypt protected identifiers and previous compensation where applicable;
- mask protected values in API and UI;
- audit create, update, delete, reveal, download, activation, and access actions;
- redact sensitive request fields from API logs;
- use private signed URLs for profile photos and documents;
- apply retention rules to terminated employee records without breaking legal
  retention requirements.

## 11. Employee Import

Preserve the existing employee import and add a versioned expanded template.

Core import columns:

- employee code;
- first name;
- middle name;
- last name;
- official email;
- personal email;
- phone;
- date of birth;
- date of joining;
- work type;
- department;
- designation;
- manager employee code;
- primary office;
- onboarding/activation mode.

Do not add repeated education, experience, skills, documents, or protected
identifiers to the flat employee CSV in the first delivery.

Provide separate later import contracts for:

- education and experience;
- skills;
- identifiers;
- employee payroll profiles.

Import rules:

- support `DRAFT` and `ACTIVATE` row modes;
- do not create user accounts unless explicitly requested;
- return field-level row errors;
- keep retries idempotent;
- preserve the current quota and tenant-isolation behavior.

## 12. Migration and Compatibility

### 12.1 Forward-only schema migration

- Add new enums and employee profile tables.
- Add structured-name and official-email fields.
- Add nullable onboarding-dependent fields where required.
- Add indexes and tenant-scoped unique constraints.
- Add encryption metadata without storing plaintext.
- Update database row-level security policies for every new tenant table.
- Register Organization ownership in `TABLE-OWNERSHIP.md`.

### 12.2 Existing employee backfill

- Set existing valid employees to `onboardingStatus=COMPLETED`.
- Keep existing `fullName` unchanged.
- Do not automatically split names using whitespace.
- Backfill `officialEmail` from the linked user account.
- Set `activatedAt` from the best available existing event/creation evidence.
- Preserve existing employee codes, statuses, user links, leave balances,
  attendance records, documents, and history.
- Allow structured name fields to remain null for migrated employees until HR
  edits them.

### 12.3 Compatibility

- Keep existing employee response fields during the web/mobile migration.
- Keep `fullName` as a stable response property.
- Keep existing employee detail URLs.
- Keep current document endpoints.
- Keep current `POST /employees` until all clients use onboarding.
- Add a deprecation note only after the new web flow and imports are stable.

## 13. Ordered Work Packages

### WP1 - Schema and domain foundation

- [ ] Add employee and onboarding statuses.
- [ ] Add structured names and official email.
- [ ] Add personal, address, professional, education, experience, skill, and
      identifier models.
- [ ] Add table ownership, RLS, indexes, and migrations.
- [ ] Add backfill logic for existing employees.

**Exit criterion:** existing employees remain readable and new draft employees
can be stored without user, attendance, leave, or seat side effects.

### WP2 - Refactor creation, activation, and access

- [ ] Extract one employee draft creation use case.
- [ ] Extract one employee activation use case.
- [ ] Reuse the existing account-creation use case.
- [ ] Remove direct user creation from the new onboarding flow.
- [ ] Make activation idempotent and transactional.
- [ ] Update quota, seat sync, leave provisioning, and runtime refresh rules.
- [ ] Add pre-joining activation worker.
- [ ] Route legacy quick-create through the same use cases.

**Exit criterion:** HR can create, complete, activate, and optionally grant
access without duplicate side effects.

### WP3 - Onboarding APIs

- [ ] Add section-specific validated DTOs and endpoints.
- [ ] Add server-calculated completion and missing fields.
- [ ] Add collection limits and concurrency/version checks.
- [ ] Add stable state-conflict and validation error codes.
- [ ] Regenerate OpenAPI and client contracts.

**Exit criterion:** the complete onboarding workflow can be performed through
documented APIs.

### WP4 - Onboarding wizard

- [ ] Replace the current Add Employee form with the seven-step wizard.
- [ ] Add draft creation, autosave, manual save, navigation, and recovery.
- [ ] Add section validation and review summary.
- [ ] Add activation and separate account-access actions.
- [ ] Add responsive desktop/tablet behavior and accessible form semantics.

**Exit criterion:** HR can complete the employee flow without entering
non-required fields or losing saved progress.

### WP5 - Employee profile expansion

- [ ] Add Personal, Address, Education and Experience tabs.
- [ ] Expand Employment and Organization assignment screens.
- [ ] Add structured identifier management with masking.
- [ ] Add profile-photo support without reusing biometric selfies.
- [ ] Expand document categories.
- [ ] Update Overview with onboarding and setup readiness.

**Exit criterion:** every onboarded field is viewable/editable in the correct
permission-scoped employee profile area.

### WP6 - Directory and imports

- [ ] Add onboarding/pre-joining columns and filters.
- [ ] Add office and profile-completeness filters.
- [ ] Preserve pagination and useful table density.
- [ ] Add the expanded versioned employee import template.
- [ ] Support draft versus activate import modes.

**Exit criterion:** HR can find incomplete employees and onboard employees at
scale without exposing sensitive fields.

### WP7 - Security, audit, and hardening

- [ ] Add field-level permissions.
- [ ] Encrypt and mask identifiers and sensitive compensation.
- [ ] Add sensitive-read and mutation audit events.
- [ ] Add log redaction.
- [ ] Add tenant-isolation and cross-tenant denial coverage.
- [ ] Add idempotency, concurrency, and partial-failure tests.
- [ ] Add data-retention treatment for new tables.

**Exit criterion:** protected employee data is secure, attributable, and
tenant-isolated.

## 14. Test Plan

### Unit tests

- Structured name validation and full-name projection.
- ISO country/subdivision and address validation.
- Education and experience date validation.
- Experience and qualification projections.
- Identifier masking and encryption adapter behavior.
- Onboarding completion and missing-field calculation.
- Employment and onboarding state transitions.
- Activation idempotency.

### API and database tests

- Minimal draft creation.
- Draft section save and reload.
- Activation with complete and incomplete profiles.
- Future joining date produces `PRE_JOINING`.
- Joining-date worker activates the employee once.
- Account creation before and after activation.
- Duplicate employee code, official email, phone, and user account behavior.
- Leave provisioning and seat synchronization occur once.
- Manager, HR, Business Admin, and employee permission boundaries.
- Protected identifier read/manage denial.
- Cross-tenant access denial for every new resource.
- Existing employee migration compatibility.

### Web tests

- Complete seven-step onboarding.
- Save and resume a draft.
- Refresh/browser recovery during onboarding.
- Required versus optional field behavior.
- Address "same as present" behavior.
- Add/edit/remove education and experience rows.
- Upload and preview permitted employee documents.
- Activation confirmation and error recovery.
- Separate login-access creation.
- Directory onboarding filters and pagination.
- Employee detail tabs and permission-hidden fields.

### Regression checks

- Existing employee list and detail routes.
- Existing attendance, leave, device, document, and history tabs.
- Employee termination and reactivation.
- Employee import.
- Subscription quota and billing seat synchronization.
- Web and API typecheck, lint, tests, production builds, architecture check,
  OpenAPI export, and contract generation.

## 15. Definition of Done

- [ ] HR can create an employee with minimal information and save a draft.
- [ ] HR can complete all onboarding sections without creating a Candidate.
- [ ] Optional reference fields do not block employee creation or activation.
- [ ] Activation validates only the documented employment requirements.
- [ ] Draft employees do not receive login access, leave balances, attendance
      eligibility, or active seat usage.
- [ ] Activation provisions employment side effects exactly once.
- [ ] Login access is independently controlled.
- [ ] Employee details include personal, address, professional, education,
      experience, document, identifier, employment, and organization data.
- [ ] Employee directory remains concise, searchable, paginated, and free of
      sensitive fields.
- [ ] India-specific identifiers are supported without making them global
      fields or requirements.
- [ ] Protected values are encrypted, masked, permissioned, and audited.
- [ ] Existing employee records and product workflows remain compatible.
- [ ] Migrations, seed/demo data, API contracts, tests, and operational notes
      are delivered.

## 16. Explicitly Deferred

This implementation does not include:

- Candidate or applicant records.
- Job openings or recruitment pipelines.
- Interview scheduling or interview evaluations.
- Recruiter dashboards or source analytics.
- Offer approval workflows beyond private offer-letter storage.
- Tenant-configurable form builders.
- Employee self-service editing of all personal fields.
- Automated identity verification with government providers.
- Full background-check integrations.
- Payroll salary structures and salary calculation.
- Loans, benefits, expenses, or final-settlement automation.

These features require separate product decisions and must not expand the
Employee onboarding MVP.
