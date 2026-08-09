# Local Platform and HRMS Separation Rehearsal

## Purpose

This local-only Docker stack verifies the first physical boundary required by the multi-product plan:

- Platform owns tenants, users and product entitlements.
- HRMS owns organization, employee, Attendance, Leave and Payroll data.
- The immutable Platform `tenantId` is the tenant key in HRMS.
- HRMS receives only a versioned projection of Platform identity and entitlement state.
- Platform and HRMS have different databases, runtime credentials and storage volumes.

It does not move the current application schema or production data. The existing monolith remains authoritative until the extraction gates in `HRMS-DATA-EXTRACTION-READINESS.md` are approved.

## Local Topology

| Service | Address | Ownership |
|---|---|---|
| `platform-db` | `localhost:5441/platform_local` | Tenant identity, users and product entitlements |
| `hrms-db` | `localhost:5442/hrms_local` | Tenant projection, employees, Attendance and Payroll |
| `boundary-verifier` | one-shot container | Creates disposable fixtures and asserts the boundary |

The stack uses Compose project `deltcrm-product-separation` and dedicated volumes. It does not reuse `pgdata` from `docker-compose.yml`.

## Run Locally

```bash
pnpm separation:test
```

Expected final output:

```text
All local Platform/HRMS separation boundary checks passed.
```

To keep both databases running for inspection:

```bash
pnpm separation:up
```

To stop the containers without deleting their local volumes:

```bash
pnpm separation:down
```

### HTTP contract smoke

After starting the Platform API on `4011` and the extracted HRMS API on `4014`,
run the signed-token flow with a disposable local tenant administrator:

```bash
PLATFORM_TEST_EMAIL='admin@example.test' \
PLATFORM_TEST_PASSWORD='<local-test-password>' \
PLATFORM_TEST_WORKSPACE='acme' \
pnpm separation:http:test
```

The script does not print passwords or tokens. It verifies Platform and HRMS
health, RS256 JWKS publication, tenant login, short-lived HRMS token issuance,
token claims, invalid-token rejection, entitlement enforcement and tenant-scoped
HRMS integration context.

## Assertions Covered

1. Platform runtime can create an isolated tenant, user and HRMS entitlement.
2. HRMS runtime can consume a contract `1.0` tenant projection.
3. Attendance and Payroll records are scoped by the immutable tenant ID.
4. Platform has no HRMS attendance table.
5. HRMS has no Platform identity table.
6. Platform credentials are rejected by HRMS and HRMS credentials are rejected by Platform.
7. Re-running the verifier is idempotent.

## Application Separation Checkpoints

### Checkpoint 1: explicit API composition roots

**Status:** Implemented locally; not deployed

- `platform-main.ts` starts the Platform control plane on `PLATFORM_API_PORT` (default `4011`).
- `hrms-main.ts` starts the HRMS product API on `HRMS_API_PORT` (default `4012`).
- Both entrypoints use the same reviewed HTTP bootstrap for validation, logging, CORS, CSRF, OpenAPI and shutdown behavior.
- The Platform graph excludes Employee, Attendance and Payroll controllers.
- The HRMS graph includes Employee, Attendance and Payroll controllers and excludes login, Platform tenant-management and product-integration controllers.
- Nest dependency-graph compilation is tested for both roots.
- The existing `main.ts` monolith entrypoint remains available during the compatibility window.

Verification completed on 2026-08-07:

```text
API typecheck: passed
API architecture check: passed
API composition tests: 4 passed
API production build: passed
Platform dependency initialization: passed up to sandbox port binding
HRMS dependency initialization: passed up to sandbox Redis access
```

The final two local health checks remain pending because the execution sandbox denied local port and Redis network access. This is an environment restriction, not authorization to skip those checks before merge.

### Checkpoint 2: remove transitional in-process dependencies

**Status:** Implemented in extracted source; live runtime acceptance pending

- Extracted HRMS uses the Product Integration Contract client for authoritative
  Platform identity, entitlement and provisioning checks.
- HRMS verifies short-lived `hrms-api` tokens through Platform-published RS256
  keys rather than sharing a signing secret or Platform database.
- Focused contract, signing, lifecycle, guard and composition tests pass.
- The current extracted HRMS process must still pass the live HTTP smoke with its
  local S3/MinIO environment before this checkpoint is accepted.

### Checkpoint 3: separate Prisma schemas and runtime databases

**Status:** Implemented for local rehearsal; not approved for production

- Platform and HRMS run against dedicated disposable local databases with
  different runtime owners and credentials.
- HRMS has an independent product schema and migration history in the extracted
  repository.
- Keep the current production schema authoritative and unchanged.
- Complete the gates in `HRMS-DATA-EXTRACTION-READINESS.md` before any copy or cutover.

## What This Does Not Prove

- The extracted services and databases have not yet passed independent staging
  deployment, rollback and disaster-recovery acceptance.
- There is no production copy, cutover, deletion, reset, seed or migration.
- Gateway routing, product SSO, event delivery, shadow reads and rollback still require their planned implementation and acceptance evidence.

The next step is the full signed-token HTTP smoke, followed by gateway/browser
acceptance and staging migration reconciliation. No production migration or data
movement is authorized by this rehearsal.

## Verification Update: 2026-08-09

Completed locally without accessing or changing production:

- Dedicated Platform and HRMS PostgreSQL boundary fixtures passed, including
  ownership, tenant scoping, idempotency and cross-database credential rejection.
- Platform health and RS256 JWKS endpoints responded successfully.
- A real local tenant login issued a valid Platform session token.
- Platform issued a 15-minute `hrms-api` product token for an entitled tenant.
- Product-integration, lifecycle, signing, guard and composition tests passed:
  8 suites and 63 tests.
- API architecture self-test, API typecheck, API production build and web
  typecheck passed.
- Extracted HRMS source compiled, but its independent runtime still requires the
  documented local S3/MinIO environment before the final HTTP smoke can pass.
- The web production build reached external Google Font resolution and was
  blocked by restricted network access; it was not recorded as passed.

The old local HRMS container on `4013` is stale and does not expose the current
`/api/hrms/integration-context` endpoint. It must not be used as acceptance
evidence. Start the current extracted HRMS source on `4014`, then run
`pnpm separation:http:test`.

HRMS code must remain in the original CRM compatibility runtime until all of the
following are complete: gateway routing, browser SSO/deep-link acceptance,
staging data reconciliation, independent deployment and rollback evidence,
production tenant cutover, observation period and signed removal approval.
