# Payroll Phase 1 Acceptance Report

## A. Final decision

**PHASE 1 PARTIALLY IMPLEMENTED. NOT READY FOR PHASE 2.**

Payroll Phase 1 has a substantial backend and a usable foundation workspace. The golden two-tenant API scenario passes, protected payroll data is encrypted/masked in the tested paths, CQRS dispatch is present at controller boundaries, and the Payroll-specific backend/unit/e2e tests are green.

The strict acceptance decision is still **not ready** because generated Payroll DTO contracts are empty, full browser CRUD workflow coverage is missing, the administration service remains too broad for strict SOLID acceptance, and repo-level architecture/security/lint gates still fail on existing non-payroll issues.

No Phase 2 payroll execution features were implemented in this pass.

## B. Scope audited

Phase 1 scope audited:

- Payroll settings
- Pay calendars and calendar versions
- Pay groups and employee assignments
- Pay components and component versions
- Salary structures and structure versions
- Employee payroll profiles
- Employee compensation versioning
- Effective payroll policy matrix
- Payment and statutory details metadata
- Approval policies
- Accounting mappings
- Payroll audit history
- Payroll foundation frontend entry points
- API contracts, migrations, RLS/grants, tenant isolation, permissions, encryption, audit/outbox safety

Out of scope and not implemented:

- Payroll runs
- Attendance snapshot import
- Salary calculation engine
- Statutory formula calculation
- Payslips
- Bank export files
- Accounting journals
- Payroll payment execution

## C. Backend hierarchy

Payroll lives under:

- `apps/api/src/products/payroll`
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations`
- `apps/web/src/features/products/payroll`
- `apps/web/src/app/app/modules/payroll`
- `docs/openapi.json`
- `packages/contracts/src/generated.ts`

Backend layout:

| Layer | Main files | Status |
|---|---|---|
| Product module | `apps/api/src/products/payroll/payroll-product.module.ts` | PASS |
| Controllers | `presentation/controllers/payroll-foundation.controller.ts`, `presentation/controllers/payroll-administration.controller.ts` | PASS |
| Commands/queries | `application/commands`, `application/queries` | PASS |
| Handlers | `application/handlers` | PASS |
| Services | `application/services` | PARTIAL |
| Ports | `application/ports` | PARTIAL |
| Repository | `infrastructure/repositories/prisma-payroll-foundation.repository.ts` | PASS |
| Encryption adapter | `infrastructure/crypto/aes-gcm-protected-payroll-data-cipher.ts` | PASS |

Controllers do not manage Payroll directly through an employee object. They accept authenticated tenant/user context, check PAYROLL entitlement and route permissions, then dispatch CQRS commands/queries. Employee payroll data is referenced by employee ID, but Payroll state is managed by Payroll-specific tables and services.

## D. Fixes made in this final pass

- Added retirement of previously active pay component versions before activating a new component version.
- Added retirement of previously active salary structure versions before activating a new salary structure version.
- Added advisory locks around component, structure, calendar, and accounting-mapping activation/mutation paths.
- Added a DB-backed golden two-tenant Payroll Phase 1 e2e scenario.
- Regenerated OpenAPI, TypeScript contracts, and Flutter route metadata.
- Re-ran Prisma format/generate/validate/status and Payroll backend suites.

Changed implementation files:

- `apps/api/src/products/payroll/application/handlers/payroll-foundation.command-handlers.ts`
- `apps/api/src/products/payroll/application/ports/payroll-foundation.repository.ts`
- `apps/api/src/products/payroll/application/services/payroll-administration.service.ts`
- `apps/api/src/products/payroll/infrastructure/repositories/prisma-payroll-foundation.repository.ts`
- `apps/api/test/payroll-prompt2-safety.e2e-spec.ts`
- `docs/openapi.json`
- `packages/contracts/src/generated.ts`

## E. Golden scenario result

**PASS.**

Covered by `apps/api/test/payroll-prompt2-safety.e2e-spec.ts`.

The scenario creates two tenants and verifies:

- Tenant A can configure Oman/OMR monthly settings.
- Tenant A can create a 26th-to-25th payroll calendar and activate versions.
- Tenant A can create a pay group.
- Organization and pay-group policy versions resolve with source and version evidence.
- Basic, housing, and deduction components can be versioned and activated.
- Salary structure version can include component versions with OMR minor-unit amounts.
- Employee payroll profile and compensation versions persist integer minor units.
- Payment/statutory details return masked data only.
- Approval policy and accounting mappings can be configured.
- Audit/history endpoints are readable.
- Protected plaintext does not appear in response bodies, audit payloads, outbox payloads, database dumps, or captured logger entries.
- Tenant B cannot read or reference Tenant A payroll data.
- Tenant B can reuse the same component code independently.
- Future component and salary structure activation leaves only one active version.
- Old activated structure versions reject mutation.
- Current/future compensation date queries resolve the correct version.
- No payroll lock/run records are created.

## F. Acceptance matrix

| # | Category | Status | Evidence | Remaining gap |
|---:|---|---|---|---|
| 1 | Product boundary | PASS | `apps/api/src/products/payroll` | None found |
| 2 | Module registration | PASS | Payroll module builds | None found |
| 3 | PAYROLL entitlement | PASS | Controller decorators and e2e | None found |
| 4 | Route permissions | PASS | Metadata tests and e2e 401/403 | More browser-negative tests useful |
| 5 | Controller CQRS dispatch | PASS | Controllers use `CommandBus`/`QueryBus` | None found |
| 6 | Direct Prisma in controllers | PASS | No controller Prisma access found | None found |
| 7 | Command/query inventory | PASS | Foundation and admin commands/queries exist | None found |
| 8 | SOLID boundaries | PARTIAL | Cipher/repository ports exist | `PayrollAdministrationService` is too broad |
| 9 | Settings | PASS | Unit/e2e golden scenario | None found |
| 10 | Settings optimistic concurrency | PASS | Unit/e2e concurrency coverage | None found |
| 11 | Calendars | PASS | Golden scenario | No dedicated calendar-history endpoint |
| 12 | Calendar versions | PASS | Golden scenario | Immutability is mostly app-level |
| 13 | Pay groups | PASS | Golden scenario | None found |
| 14 | Pay-group assignment | PASS | Golden scenario | None found |
| 15 | Components | PASS | Golden scenario | None found |
| 16 | Component versions | PASS | Golden scenario and one-active fix | DB constraint could be stronger |
| 17 | Salary structures | PASS | Golden scenario | None found |
| 18 | Structure versions | PASS | Golden scenario and one-active fix | DB constraint could be stronger |
| 19 | Structure components | PASS | Golden scenario | None found |
| 20 | Employee payroll profile | PASS | Golden scenario | None found |
| 21 | Employee compensation | PASS | Golden scenario | None found |
| 22 | Compensation history | PASS | Golden scenario | None found |
| 23 | Effective policy matrix | PARTIAL | Golden scenario and resolver tests | Salary-structure source and country defaults incomplete |
| 24 | Policy versions | PASS | Golden scenario | Future scheduling is limited |
| 25 | Policy JSON validation | PARTIAL | DTO object validation | Business schema validation incomplete |
| 26 | Protected payment details | PASS | Golden scenario and cipher tests | None found in tested paths |
| 27 | Protected statutory details | PASS | Golden scenario and cipher tests | None found in tested paths |
| 28 | Encryption adapter | PASS | AES-GCM tests | None found |
| 29 | Masked responses | PASS | Golden scenario | None found |
| 30 | Plaintext absence | PASS | Golden scenario DB/audit/outbox/log scan | None found in tested paths |
| 31 | Approval policies | PASS | Golden scenario | Workflow execution is Phase 2/out of scope |
| 32 | Accounting mappings | PASS | Golden scenario | Journal generation is Phase 2/out of scope |
| 33 | Audit history | PASS | Golden scenario | None found |
| 34 | Outbox behavior | PASS | Rollback and plaintext tests | None found |
| 35 | Transaction rollback | PASS | DB-backed failure injection e2e | None found |
| 36 | Tenant isolation | PASS | Two-tenant e2e | None found |
| 37 | Cross-tenant references | PASS | Golden scenario | None found |
| 38 | Tenant-scoped uniqueness | PASS | Golden scenario same code in Tenant B | None found |
| 39 | Advisory locking | PASS | Added for key activation paths | More DB constraints still desirable |
| 40 | RLS/grants migration | PASS | Migration present and migrate status passes | Fresh DB apply not run |
| 41 | Prisma schema | PASS | `prisma validate`, format, generate | None found |
| 42 | Migrations status | PASS | `prisma migrate status` | None found |
| 43 | Fresh migration diff | PASS | Prisma diff script generated | Diff output not applied to temp DB |
| 44 | OpenAPI export | PASS | `pnpm openapi:generate` | DTO schemas still empty |
| 45 | TypeScript contracts | FAIL | `packages/contracts/src/generated.ts` generated | Payroll DTOs are `Record<string, never>` |
| 46 | Flutter route metadata | PASS | OpenAPI generation script ran | Payload contract usefulness limited by DTO gap |
| 47 | API build | PASS | `pnpm --filter api build` | None found |
| 48 | API typecheck | PASS | `pnpm --filter api typecheck` | None found |
| 49 | Payroll unit tests | PASS | 5 suites, 30 tests | None found |
| 50 | Payroll e2e safety tests | PASS | 1 suite, 6 tests | None found |
| 51 | Web typecheck | PASS | `pnpm --filter web typecheck` | None found |
| 52 | Web build | PASS | `pnpm --filter web build` | Next lockfile/root warning only |
| 53 | Payroll frontend lint | PASS | Targeted eslint on Payroll files | None found |
| 54 | Full web lint | FAIL | Full lint fails | Existing non-payroll lint errors |
| 55 | Payroll frontend e2e | PARTIAL | Metadata tests pass | Full browser CRUD workflow tests missing |
| 56 | Architecture/security gates | FAIL | Commands run | Existing non-payroll architecture issues and stale security script path |

## G. CQRS inventory

Foundation commands:

- Create/update payroll settings
- Create/update pay group
- Assign/remove employee from pay group
- Create pay component
- Create pay component version
- Activate pay component version
- Create salary structure
- Create salary structure version
- Add/remove salary structure version component
- Activate salary structure version
- Create/update employee payroll profile
- Create/end employee compensation version

Administration commands:

- Create/update payroll calendar
- Create calendar version
- Activate/deactivate calendar
- Create/update payroll policy
- Create/activate payroll policy version
- Upsert payment details
- Update protected-detail status
- Upsert statutory details
- Create/update approval policy
- Create/activate approval policy version
- Create/update accounting mapping

Queries:

- Settings
- Pay groups
- Component lists and versions
- Salary structures and versions
- Employee payroll profile
- Employee compensation and compensation history
- Effective policy matrix
- Calendars and calendar versions
- Payroll policies and versions
- Masked payment/statutory details
- Approval policies and versions
- Accounting mappings
- Payroll audit history

## H. SOLID violations and exact files

Strict SOLID acceptance remains partial because these files still mix too much responsibility:

- `apps/api/src/products/payroll/application/services/payroll-administration.service.ts`: broad service handles calendars, policies, payment/statutory details, approval policies, accounting mappings, audit, encryption, audit/outbox writes, and validation.
- `apps/api/src/products/payroll/application/handlers/payroll-administration.command-handlers.ts`: handlers are thin CQRS wrappers over the broad service instead of focused use-case handlers with focused ports.
- `apps/api/src/products/payroll/application/dto/payroll-administration.dto.ts`: business-critical JSON fields are validated mainly as objects, not full typed runtime schemas.
- `apps/api/src/products/payroll/application/dto/payroll-foundation.dto.ts`: generated OpenAPI schemas are empty, indicating DTO metadata is insufficient for strict contracts.
- `apps/api/src/products/payroll/application/services/effective-payroll-policy.resolver.ts`: hierarchy support is incomplete for salary-structure source and country defaults.

## I. API and contract result

Routes exist for all major Payroll Phase 1 backend areas:

- `/payroll/settings`
- `/payroll/pay-groups`
- `/payroll/components`
- `/payroll/salary-structures`
- `/payroll/employees/{employeeId}/profile`
- `/payroll/employees/{employeeId}/compensation`
- `/payroll/employees/{employeeId}/compensation/history`
- `/payroll/policy-matrix/effective`
- `/payroll/calendars`
- `/payroll/policies`
- `/payroll/employees/{employeeId}/payment-details`
- `/payroll/employees/{employeeId}/statutory-details`
- `/payroll/approval-policies`
- `/payroll/accounting-mappings`
- `/payroll/audit`

OpenAPI generation passes, but the generated TypeScript contract still contains empty Payroll DTO schemas:

- `CreatePayrollSettingsDto: Record<string, never>`
- `UpdatePayrollSettingsDto: Record<string, never>`
- `CreatePayGroupDto: Record<string, never>`
- `CreatePayComponentDto: Record<string, never>`
- `CreateSalaryStructureDto: Record<string, never>`
- `CreateEmployeePayrollProfileDto: Record<string, never>`
- `CreateEmployeeCompensationVersionDto: Record<string, never>`
- `CreatePayrollCalendarDto: Record<string, never>`
- `CreatePayrollPolicyDto: Record<string, never>`
- `UpsertEmployeePaymentDetailDto: Record<string, never>`
- `UpsertEmployeeStatutoryDetailDto: Record<string, never>`
- `CreatePayrollApprovalPolicyDto: Record<string, never>`
- `CreatePayrollAccountingMappingDto: Record<string, never>`

This is a strict Phase 1 blocker because frontend/mobile consumers cannot rely on typed generated payloads.

## J. Frontend result

Frontend routes:

- `apps/web/src/app/app/modules/payroll/page.tsx`
- `apps/web/src/app/app/modules/payroll/foundation/page.tsx`
- `apps/web/src/app/app/settings/payroll/page.tsx`
- `apps/web/src/features/products/payroll/payroll-foundation-workspace.tsx`

Status:

- Payroll module page exists.
- Payroll foundation workspace exists.
- Permission-aware Payroll tabs exist.
- Targeted Payroll frontend lint passes.
- Web typecheck and production build pass.
- Metadata e2e tests pass.

Remaining frontend gap:

- Full browser interaction tests for create/update/activate/mask/history workflows are missing. Current frontend e2e coverage checks tab/navigation/permission metadata only.

## K. Database and migration result

Status:

- Prisma schema validates.
- Prisma format passes.
- Prisma client generation passes.
- Migration status reports schema up to date.
- RLS/grants migration exists: `apps/api/prisma/migrations/20260727033000_payroll_phase1_rls_grants/migration.sql`.
- Fresh Prisma diff SQL generation works with current Prisma 7 syntax.

Remaining database hardening:

- Some one-active-version and immutability invariants are enforced in application code, not fully by database constraints.
- Fresh migration apply into a disposable database was not run; only validate/status/diff were run.

## L. Architecture and security gates

`pnpm architecture:check` fails on existing non-payroll domain imports:

- `apps/api/src/platform/organization/domain/employee.repository.interface.ts`
- `apps/api/src/products/attendance/configuration/holidays/domain/holiday.repository.interface.ts`
- `apps/api/src/products/attendance/configuration/offices/domain/office.repository.interface.ts`
- `apps/api/src/products/attendance/configuration/policies/domain/policy.repository.interface.ts`
- `apps/api/src/products/attendance/configuration/rosters/domain/roster.repository.interface.ts`
- `apps/api/src/products/attendance/configuration/shifts/domain/shift.repository.interface.ts`

`pnpm security:check` fails before scanning because `scripts/security-check.mjs` references stale path `apps/api/src/modules/platform`. Current platform code is under `apps/api/src/platform`.

These are repo-level blockers, not newly introduced Payroll failures.

## M. Commands run

| Command | Result |
|---|---|
| `pnpm --filter api exec prettier --write ...` | PASS |
| `pnpm --filter api exec eslint ...payroll files...` | PASS |
| `pnpm --filter api typecheck` | PASS |
| `pnpm --filter api test -- payroll --runInBand` | PASS, 5 suites / 30 tests |
| `pnpm --filter api test:e2e -- payroll-prompt2-safety.e2e-spec.ts --runInBand` | PASS, 1 suite / 6 tests |
| `pnpm --filter api exec prisma validate` | PASS |
| `pnpm --filter api exec prisma migrate status` | PASS |
| `pnpm --filter api exec prisma format` | PASS |
| `pnpm --filter api exec prisma generate` | PASS |
| `pnpm --filter api exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` | PASS |
| `pnpm openapi:generate` | PASS |
| `pnpm --filter api build` | PASS |
| `pnpm --filter web typecheck` | PASS |
| `pnpm --filter web exec eslint ...payroll files...` | PASS |
| `$env:PLAYWRIGHT_MOCK_API='true'; pnpm --filter web test:e2e -- payroll-foundation-metadata.spec.ts` | PASS, 3 tests |
| `pnpm --filter web build` | PASS |
| `pnpm --filter web lint` | FAIL, existing non-payroll lint errors |
| `pnpm architecture:check` | FAIL, existing non-payroll architecture errors |
| `pnpm security:check` | FAIL, stale script path |

## N. Remaining blockers before Phase 2

Must fix before Phase 2:

- Add `@ApiProperty`/schema metadata or equivalent so generated Payroll DTO contracts are not `Record<string, never>`.
- Split `PayrollAdministrationService` into focused services/ports or focused command handlers.
- Add full browser workflow e2e coverage for Payroll foundation create/update/activate/history/protected-data flows.
- Add typed runtime schemas for policy/calendar/business JSON payloads.
- Finish policy hierarchy for salary-structure source and country defaults.
- Fix repo-level architecture gate or formally baseline existing non-payroll violations.
- Fix `scripts/security-check.mjs` stale platform path and decide the expected modern platform database boundary.

Should fix soon:

- Add database-level constraints for active-version uniqueness where PostgreSQL partial indexes fit.
- Add dedicated calendar-history endpoint if UI/API consumers need a stable history surface.
- Add disposable-database fresh migration apply check.

## O. Final readiness

**Do not start Phase 2 yet.**

Payroll Phase 1 is functionally close and the backend golden path is now tested, but strict Phase 1 acceptance is blocked by contract generation, full browser workflow coverage, SOLID decomposition, and repo-level gates.
