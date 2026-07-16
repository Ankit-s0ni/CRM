# Sprint 1 Implementation Plan

## Organization and Administration

**Status:** Complete  
**Delivery approach:** API and automated tests first; web screens start only after the API contract is stable  
**Primary references:** `docs/files/PROJECT-ROADMAP.md`, `docs/files/FEATURE-LIST.md`, `apps/api/prisma/schema.prisma`  
**Sprint exit:** A tenant can build its organization manually or import 150 employees with row-level errors, manage user access safely, and enforce employee quota without cross-tenant access.

---

## 1. Scope

Sprint 1 delivers the Organization and Administration bounded contexts required before attendance configuration can begin.

### Included

- Department hierarchy and designations
- Employee directory, reporting chain, and employment lifecycle
- Employee quota calculation and enforcement
- CSV employee import with row-level validation and idempotent retry
- Tenant users, invitations, roles, permissions, and permission matrix
- Audit/outbox records for important organization and access-control changes
- OpenAPI documentation and automated tests
- Import template and role/permission documentation

### Deferred

- Web screens B1-B8
- Attendance policies, offices, shifts, rosters, and holidays
- Mobile device registration and biometric enrollment
- Payroll and billing-management screens
- General notification delivery UI
- Other CRM modules such as mail service

---

## 2. Foundation Already Available

- [x] PostgreSQL schema and Prisma client
- [x] Tenant-aware Prisma transactions using RLS context
- [x] Workspace resolution and suspended-workspace handling
- [x] JWT access tokens and rotating refresh tokens
- [x] `GET /auth/me`
- [x] `POST /auth/logout`
- [x] `GET /workspace/status`
- [x] `GET /workspace/modules`
- [x] Attendance module activation during tenant signup
- [x] Basic CASL authorization scaffolding
- [x] Auth and RLS e2e test suites

These items are prerequisites, not evidence that Sprint 1 itself is complete.

---

## 3. Required Decisions and Schema Corrections

Complete this section before implementing controllers.

### 3.1 API conventions

- [x] Keep routes unversioned during Sprint 1 to preserve current web/auth compatibility; coordinate `/api/v1` as a later migration
- [x] Add a global validation pipe with whitelist, transformation, and unknown-field rejection
- [x] Replace `any` request bodies in new endpoints with typed DTO classes
- [x] Standardize list responses as `{ data, pagination }`
- [x] Standardize machine-readable errors as `{ statusCode, code, message, details? }`
- [x] Add request ID propagation to API errors; audit records will consume the same request header
- [x] Use ISO `YYYY-MM-DD` for date-only API input
- [x] Store phone numbers in E.164 format

### 3.2 Organization constraints

- [x] Add a database constraint that prevents duplicate root department names per tenant
- [x] Compare department and designation names case-insensitively
- [x] Enforce employee-code uniqueness case-insensitively with a database expression index
- [x] Prevent cross-tenant department parents at service level and in integration tests
- [x] Prevent cross-tenant employee managers at service level and in integration tests
- [x] Enforce employee phone uniqueness per tenant when present
- [x] Count only `ACTIVE` and `ON_NOTICE` employees toward quota

Recommended root department constraint:

```sql
CREATE UNIQUE INDEX departments_root_name_uq
ON departments ("tenantId", lower(name))
WHERE "parentDeptId" IS NULL;
```

### 3.3 Subscription and quota source

The effective employee quota will be:

```text
min(active subscription seatCount, subscription plan maxEmployees)
```

- [x] Ensure signup and seed paths create one current trial or active subscription per tenant
- [x] Seed a default trial plan for local and test tenants
- [x] Define behavior when no valid subscription exists; reject employee creation with `SUBSCRIPTION_REQUIRED`
- [x] Use a PostgreSQL transaction-level advisory lock keyed by tenant ID for quota checks
- [x] Emit `organization.quota.threshold_reached` through `OutboxEvent` at 95% and 100%
- [x] Do not use `SecurityAlert` for quota warnings because its current schema requires an employee and does not support a quota alert type
- [x] Make threshold emission idempotent within the current quota/subscription period

### 3.4 Import infrastructure

- [x] Configure MinIO/S3-compatible private bucket for import files
- [x] Configure Redis and BullMQ worker execution
- [x] Ensure worker jobs restore `tenantId` using `TenantJobContextRunner`
- [x] Persist quota events transactionally in the outbox; relay delivery is deferred and documented
- [x] Define signed upload URL expiry as 15 minutes; automated file retention is deferred and documented
- [x] Enforce CSV size and MIME limits; stricter extension and row-count limits are deferred and documented

---

## 4. Module Structure

Use bounded contexts without over-splitting simple operations.

```text
apps/api/src/modules/
├── organization/
│   ├── dto/
│   ├── organization.controller.ts
│   ├── departments.service.ts
│   ├── designations.service.ts
│   ├── employees.service.ts
│   ├── employee-lifecycle.service.ts
│   ├── employee-quota.service.ts
│   ├── employee-imports.service.ts
│   ├── employee-imports.processor.ts
│   └── organization.module.ts
└── identity/
    ├── access.controller.ts
    ├── access.service.ts
    ├── roles.service.ts
    ├── invitations.service.ts
    └── dto/
```

Rules:

- Controllers validate and translate HTTP requests only.
- Services own transaction boundaries and business rules.
- All tenant data uses `PrismaService.forTenant()`.
- `forAdmin()` is forbidden in organization and tenant-access endpoints.
- Cross-tenant IDs must return `404`, not reveal that another tenant owns the record.
- Multi-write operations must run in one tenant-scoped transaction.
- Important mutations append an audit or outbox record in the same transaction.

---

## 5. API Contract

All protected routes require:

```http
Authorization: Bearer <access-token>
x-tenant-id: <tenant-uuid>
```

The JWT tenant must match the tenant header through `JwtTenantGuard`.

### 5.1 Departments

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/departments` | `organization.departments.read` | Flat list or tree using `view=tree` |
| `POST` | `/departments` | `organization.departments.create` | Create a root or child department |
| `GET` | `/departments/:id` | `organization.departments.read` | Department details and counts |
| `PATCH` | `/departments/:id` | `organization.departments.update` | Rename or move a department |
| `DELETE` | `/departments/:id` | `organization.departments.delete` | Delete only when empty and childless |

Department rules:

- [x] Name is trimmed, required, and bounded in length
- [x] Parent must belong to the same tenant
- [x] Department cannot parent itself
- [x] Moving a department cannot create a descendant cycle
- [x] Duplicate sibling and root names are rejected
- [x] Delete returns `DEPARTMENT_NOT_EMPTY` when employees or children exist
- [x] Tree reads avoid N+1 queries and enforce a maximum depth of 20 levels

### 5.2 Designations

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/designations` | `organization.designations.read` | List and search designations |
| `POST` | `/designations` | `organization.designations.create` | Create a designation |
| `GET` | `/designations/:id` | `organization.designations.read` | Get designation details |
| `PATCH` | `/designations/:id` | `organization.designations.update` | Rename designation |
| `DELETE` | `/designations/:id` | `organization.designations.delete` | Delete an unused designation |

Designation rules:

- [x] Name is unique per tenant, case-insensitively
- [x] Delete is blocked while assigned to an employee
- [x] Search is paginated and normalized

### 5.3 Employees

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/employees` | `organization.employees.read` | Paginated directory with filters |
| `POST` | `/employees` | `organization.employees.create` | Create an employee under quota lock |
| `GET` | `/employees/next-code` | `organization.employees.read` | Suggest the next employee code |
| `GET` | `/employees/quota` | `organization.employees.read` | Current usage, limit, and threshold |
| `GET` | `/employees/:id` | `organization.employees.read` | Employee profile and relationships |
| `PATCH` | `/employees/:id` | `organization.employees.update` | Update profile, department, manager, or designation |
| `POST` | `/employees/:id/terminate` | `organization.employees.lifecycle` | Set exit date and terminate employee |
| `POST` | `/employees/:id/reactivate` | `organization.employees.lifecycle` | Reactivate a terminated employee under quota lock |
| `GET` | `/employees/:id/history` | `organization.employees.read` | Employment event timeline |

Employee list filters:

- `search`
- `status`
- `workType`
- `departmentId`
- `designationId`
- `managerId`
- `page`
- `limit`
- `sort`

Employee rules:

- [x] Employee code is normalized and unique per tenant
- [x] Next-code suggestion is advisory; create still enforces uniqueness
- [x] Department is required and belongs to the tenant
- [x] Designation and manager are optional and tenant-scoped
- [x] Employee cannot manage themselves
- [x] Manager assignment cannot create a reporting cycle
- [x] Joining date cannot be after exit date
- [x] Termination requires an exit date and writes an `EXITED` event
- [x] Reactivation clears exit date and writes a `JOINED` event with reactivation metadata
- [x] Department transfer writes a `TRANSFERRED` event
- [x] Designation change writes a `PROMOTED` event when appropriate
- [x] Employee creation writes the initial `JOINED` event atomically
- [x] Hard delete is not exposed for employees
- [x] Quota check and employee write occur under the same advisory lock

Expected employee list response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 0,
    "totalPages": 0
  },
  "quota": {
    "used": 0,
    "limit": 50,
    "percentage": 0
  }
}
```

### 5.4 Employee Imports

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `POST` | `/employee-imports/presign` | `organization.imports.create` | Generate private upload URL |
| `POST` | `/employee-imports` | `organization.imports.create` | Register uploaded file and queue validation |
| `GET` | `/employee-imports` | `organization.imports.read` | List import jobs |
| `GET` | `/employee-imports/:id` | `organization.imports.read` | Poll progress and row summary |
| `GET` | `/employee-imports/:id/errors` | `organization.imports.read` | Download or return row-level errors |
| `POST` | `/employee-imports/:id/retry` | `organization.imports.create` | Idempotently retry failed valid rows |

Initial CSV columns:

```text
employee_code,full_name,phone,work_type,department,designation,manager_employee_code,date_of_joining
```

Import behavior:

- [x] Validate the header before queuing row processing
- [x] Normalize every row using the same validators as manual employee creation
- [x] Resolve departments and designations within the current tenant only
- [x] Resolve manager references by employee code, including rows in the same file
- [x] Detect duplicate codes within the file and against the database
- [x] Validate manager cycles after references are resolved
- [x] Reserve quota under lock before committing valid rows
- [x] Process in bounded batches without one transaction for the entire file
- [x] Store safe row errors without passwords, tokens, or internal stack traces
- [x] Retrying the same job cannot create duplicate employees
- [x] Report `totalRows`, `successRows`, `errorRows`, and `rowErrors`
- [x] A 150-row fixture with 4 invalid rows finishes as 146 successful and 4 failed

Recommended idempotency key:

```text
tenantId + importJobId + normalized employeeCode
```

### 5.5 Users and Invitations

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/users` | `identity.users.read` | List tenant users and assigned roles |
| `POST` | `/users/invitations` | `identity.users.invite` | Invite a user with role IDs |
| `POST` | `/users/invitations/resend` | `identity.users.invite` | Revoke old token and resend invitation |
| `POST` | `/auth/invitations/accept` | Public token flow | Accept invitation and set password |
| `PATCH` | `/users/:id/roles` | `identity.users.roles.update` | Replace tenant role assignments |
| `PATCH` | `/users/:id/status` | `identity.users.status.update` | Enable, disable, or lock access |

Invitation rules:

- [x] Use hash-stored, expiring, single-use `USER_INVITE` tokens
- [x] Token payload contains tenant ID, inviter ID, and validated role IDs
- [x] Do not create an active user until invitation acceptance
- [x] Acceptance creates the user and role assignments atomically
- [x] Invitation email cannot already belong to a tenant user
- [x] Resend consumes or invalidates all older pending invitation tokens
- [x] Role IDs in token payload must still exist when accepted
- [x] Disabling a user revokes all active refresh tokens
- [x] Last active business administrator cannot disable themselves or lose the admin role
- [x] API responses never expose whether an email belongs to another tenant

### 5.6 Roles and Permissions

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/permissions` | `identity.roles.read` | Permission catalog grouped by module |
| `GET` | `/roles` | `identity.roles.read` | List system and tenant roles |
| `POST` | `/roles` | `identity.roles.create` | Create custom tenant role |
| `GET` | `/roles/:id` | `identity.roles.read` | Role with permission matrix |
| `PATCH` | `/roles/:id` | `identity.roles.update` | Rename custom role |
| `PUT` | `/roles/:id/permissions` | `identity.roles.update` | Replace role permission set |
| `DELETE` | `/roles/:id` | `identity.roles.delete` | Delete unassigned custom role |
| `GET` | `/roles/permission-matrix` | `identity.roles.read` | Matrix for role editor |

Required initial roles:

- `BUSINESS_ADMIN`
- `HR_ADMIN`
- `MANAGER`
- `EMPLOYEE`

Required permission groups:

- Organization: departments, designations, employees, imports
- Identity: users, invitations, roles
- Workspace: settings and modules
- Billing: subscription, invoices, payment methods
- Attendance placeholders: config, records, approvals, reports

RBAC rules:

- [x] Permissions are seeded by stable keys, not display names
- [x] Authorization uses persisted role permissions instead of hard-coded role names
- [x] Tenant roles can only reference catalog permissions
- [x] System roles cannot be renamed or deleted
- [x] Assigned roles cannot be deleted
- [x] `HR_ADMIN` has organization and attendance administration but no billing permissions
- [x] `MANAGER` employee access is limited to their reporting chain
- [x] Permission changes take effect without requiring a new deployment
- [x] Permission matrix e2e verifies allowed and denied routes

---

## 6. Error Codes

| Code | HTTP | Meaning |
|---|---:|---|
| `VALIDATION_FAILED` | 400 | Request failed DTO validation |
| `DEPARTMENT_NOT_FOUND` | 404 | Department is absent in this tenant |
| `DEPARTMENT_CYCLE` | 409 | Parent move creates a cycle |
| `DEPARTMENT_MAX_DEPTH` | 409 | Parent move exceeds 20 hierarchy levels |
| `DEPARTMENT_NOT_EMPTY` | 409 | Department has children or employees |
| `DESIGNATION_IN_USE` | 409 | Designation is assigned |
| `EMPLOYEE_NOT_FOUND` | 404 | Employee is absent in this tenant |
| `EMPLOYEE_CODE_TAKEN` | 409 | Employee code already exists |
| `MANAGER_CYCLE` | 409 | Manager assignment creates a cycle |
| `INVALID_EMPLOYMENT_DATES` | 422 | Joining and exit dates conflict |
| `EMPLOYEE_QUOTA_REACHED` | 409 | Effective employee quota is full |
| `SUBSCRIPTION_REQUIRED` | 403 | Tenant has no valid subscription |
| `IMPORT_FILE_INVALID` | 422 | CSV header, type, or size is invalid |
| `IMPORT_ALREADY_PROCESSING` | 409 | Duplicate import execution attempted |
| `INVITATION_INVALID` | 401 | Invitation is invalid, expired, or used |
| `ROLE_IN_USE` | 409 | Role is assigned to users |
| `LAST_ADMIN_REQUIRED` | 409 | Mutation would remove the last administrator |
| `FORBIDDEN` | 403 | Authenticated user lacks permission |

---

## 7. Ordered Implementation Checklist

### Work Package 1.0: Sprint Foundation

- [x] Record API versioning decision
- [x] Add validation pipe and common error response
- [x] Add typed current-user decorator
- [x] Protect new routes with persisted permission-key checks instead of hard-coded role names
- [x] Seed permission catalog and four initial tenant roles
- [x] Ensure new tenant signup creates default settings and trial subscription
- [x] Add minimum outbox writer and worker tenant-context support
- [x] Add schema migration for organization uniqueness constraints
- [x] Add test factories for tenant, subscription, user, role, department, and employee
- [x] Verify build, lint, unit tests, and RLS suite

**Gate:** No organization endpoint begins until tenant context, authorization, validation, and quota source are testable.

### Work Package 1.1: Departments and Designations

- [x] Create `OrganizationModule`
- [x] Implement department DTOs, service, and controller
- [x] Implement cycle-safe create and move operations
- [x] Implement flat and tree reads
- [x] Implement protected delete behavior
- [x] Implement designation DTOs, service, and controller
- [x] Add OpenAPI annotations and examples
- [x] Add unit tests for tree building, cycle detection, and maximum depth
- [x] Add e2e tests for CRUD, duplicates, cross-tenant IDs, and permissions

**Gate:** A tenant can build and safely modify an isolated organization tree.

### Work Package 1.2: Employees and Lifecycle

- [x] Implement employee DTOs, pagination, filters, and sorting
- [x] Implement next-code suggestion
- [x] Implement employee create under advisory quota lock
- [x] Write initial `JOINED` event atomically
- [x] Implement profile and relationship updates
- [x] Implement manager cycle detection
- [x] Write transfer and promotion employment events
- [x] Implement terminate and reactivate commands
- [x] Implement employee history endpoint
- [x] Implement quota usage endpoint
- [x] Emit idempotent 95% and 100% quota events
- [x] Add OpenAPI annotations and examples
- [x] Add unit tests for lifecycle and manager graph rules
- [x] Add integration tests for quota races and transactional rollback
- [x] Add e2e tests for filters, permissions, and cross-tenant isolation

**Gate:** Manual employee staffing is complete and concurrency-safe.

### Work Package 1.3: Tenant Access Control

- [x] Seed stable permission keys
- [x] Implement permission catalog and matrix endpoints
- [x] Implement tenant role CRUD
- [x] Implement role permission replacement transaction
- [x] Implement tenant user list
- [x] Implement user role and status updates
- [x] Protect last active business administrator
- [x] Implement invitation create, resend, and acceptance
- [x] Revoke refresh tokens when users are disabled
- [x] Replace hard-coded authorization decisions with database permissions
- [x] Add HR-without-billing e2e test
- [x] Add last-admin and role-deletion tests
- [x] Add invitation single-use and expiry tests

**Gate:** Business administrators can delegate organization administration without exposing billing.

### Work Package 1.4: Employee CSV Import

- [x] Create import bucket configuration
- [x] Implement presigned upload endpoint
- [x] Implement import job registration and queueing
- [x] Implement CSV header and row parser
- [x] Reuse manual employee validators and services
- [x] Implement same-file manager reference resolution
- [x] Implement row-level error storage
- [x] Implement bounded batch writes under quota enforcement
- [x] Implement status and error endpoints
- [x] Implement idempotent retry
- [x] Add 150-row acceptance fixture with exactly 4 errors
- [x] Add duplicate, cross-tenant manager, malformed date, and quota-race tests
- [x] Add worker crash/retry test

**Gate:** Importing the acceptance fixture results in 146 employees and 4 actionable row errors without duplicates.

### Work Package 1.5: Hardening and Documentation

- [x] Add audit entries for employee lifecycle, role, permission, and user status changes
- [x] Confirm sensitive data is absent from logs and error details
- [x] Confirm every endpoint has Swagger request/response schemas
- [x] Export and review OpenAPI specification
- [x] Run full API lint, typecheck, unit, integration, e2e, RLS, and build checks
- [x] Run tenant A versus tenant B isolation matrix for every new resource
- [x] Add employee CSV template
- [x] Add role and permission guide
- [x] Update `PROJECT-ROADMAP.md` checkboxes only after gates pass
- [x] Record deferred work and known limitations

**Gate:** Sprint definition of done and exit criteria are satisfied.

---

## 8. Test Plan

### Unit tests

- [x] Department descendant-cycle detection
- [x] Department tree construction
- [x] Manager-chain cycle detection
- [x] Employee date and lifecycle rules
- [x] Effective quota calculation
- [x] Employee-code normalization
- [x] Employee-code suggestion
- [x] CSV normalization and row validation
- [x] Permission matrix mapping

### Database integration tests

- [x] Root and sibling department uniqueness
- [x] Employee code uniqueness
- [x] Employee plus employment-event atomicity
- [x] Concurrent employee creation at quota boundary
- [x] RLS fail-closed with no tenant context
- [x] Tenant A cannot read or mutate Tenant B organization records
- [x] Import retry does not duplicate employees
- [x] Outbox write is atomic with the triggering mutation

### HTTP e2e tests

- [x] Business administrator completes department, designation, and employee flow
- [x] HR administrator manages employees but receives `403` for billing
- [x] Manager reads only their reporting chain
- [x] Employee cannot access organization administration routes
- [x] Invitation accept, replay, expiry, and resend behavior
- [x] Disabled user refresh token is rejected
- [x] Suspended workspace cannot use Sprint 1 routes
- [x] CSV acceptance fixture returns 146 successes and 4 row errors

### Quality commands

```bash
pnpm --dir apps/api build
pnpm --dir apps/api exec jest --runInBand
pnpm --dir apps/api exec jest --config ./test/jest-e2e.json --runInBand
pnpm --dir apps/api exec eslint "src/**/*.ts" "test/**/*.ts"
```

---

## 9. Sprint Definition of Done

Sprint 1 is complete only when every item below is checked.

- [x] All Work Package gates pass
- [x] Every tenant endpoint is tenant-scoped and permission-protected
- [x] No organization service uses the admin database connection
- [x] Department and manager cycles are rejected
- [x] Employee lifecycle changes create immutable history records
- [x] Quota remains correct under concurrent requests
- [x] 95% and 100% quota events are emitted once per threshold period
- [x] User invitation tokens are expiring, hash-stored, and single-use
- [x] HR role cannot access billing permissions or endpoints
- [x] 150-row CSV acceptance import produces 146 successes and 4 errors
- [x] Import retry produces no duplicate employees
- [x] Tenant isolation matrix and append-only audit checks pass
- [x] OpenAPI documentation is complete
- [x] Build, lint, typecheck, unit, integration, and e2e suites pass
- [x] Import template and role guide are present
- [x] Roadmap is updated with evidence-backed completion status

---

## 10. Progress Tracker

| Work Package | Status | Evidence |
|---|---|---|
| 1.0 Sprint Foundation | Complete | Validation/error contract, persisted permission guard, tenant provisioning, outbox/job context, migration, test factories, build, targeted lint, unit, auth e2e, and RLS e2e passed on July 16, 2026 |
| 1.1 Departments and Designations | Complete | OrganizationModule, department CRUD/tree/move/delete, designation CRUD/search/delete, Swagger responses, 20-level depth enforcement, and tree/cycle unit rules passed build, targeted lint, 3 unit tests, and e2e coverage for duplicates, permissions, protected deletes, and cross-tenant relationship IDs on July 16, 2026 |
| 1.2 Employees and Lifecycle | Complete | Employee CRUD/directory, next-code, quota locking, lifecycle/history events, threshold outbox events, manager-cycle protection, and tenant relationship validation passed build, targeted lint, 3 unit tests, and 4 employee e2e tests including a concurrent quota race on July 16, 2026 |
| 1.3 Tenant Access Control | Complete | Permission catalog/matrix, custom role CRUD, atomic permission replacement, user role/status management, last-admin protection, refresh revocation, manager reporting scope, billing denial, and atomic invitation acceptance passed two applied migrations, build, targeted lint, 10 unit tests, and 5 access-control e2e tests within a 15-test regression run on July 16, 2026 |
| 1.4 Employee CSV Import | Complete | Private MinIO presigning/storage, BullMQ/Redis worker execution, persistent idempotent import rows, strict CSV parsing, same-file manager resolution, tenant relationship isolation, 50-row quota-locked batches, safe row errors, retry recovery, and the committed 150-row fixture passed migration, build, targeted lint, 2 parser unit tests, 3 import acceptance e2e tests, and 1 real infrastructure e2e test within a 19-test regression run on July 16, 2026 |
| 1.5 Hardening and Documentation | Complete | Transactional scrubbed audit records, append-only database privileges, request-ID correlation, full OpenAPI export, tenant isolation/security matrix, CSV template, role guide, and known-limitations record passed migration, build, zero-warning lint, 12 unit suites/18 tests, and 8 e2e suites/22 tests on July 16, 2026 |

Allowed statuses: `Not started`, `In progress`, `Blocked`, `Complete`.

When a work package becomes complete, add links to its implementation files, migration, OpenAPI routes, and passing test output in the Evidence column.
