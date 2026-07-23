# Employee Documents and History Implementation Plan

## 1. Objective

Make employee document upload reliable in local, staging, and production environments, and make the employee **History** tab a complete, understandable, append-only timeline of important employee activity.

The implementation must:

- preserve tenant isolation and permission checks;
- keep documents private;
- record who performed each sensitive action and when;
- avoid direct coupling between Organization and Attendance internals;
- follow SOLID principles without adding unnecessary abstraction;
- provide actionable errors instead of a single generic upload message;
- include automated tests against a real S3-compatible object store.

## Delivery Status (July 23, 2026)

The employee Documents and History MVP is complete. Local development uses
MinIO and production uses the same S3-compatible adapter with AWS S3
configuration.

### Completed

- [x] Added a narrow `EmployeeDocumentStorage` domain contract and injected an
  S3-compatible adapter rather than coupling the application service to AWS SDK
  commands.
- [x] Configured persistent local MinIO storage, idempotent private-bucket
  creation, localhost CORS, and browser-reachable presigned URLs.
- [x] Added production validation for private-bucket, endpoint, credential, and
  HTTPS configuration.
- [x] Added private presigned upload, server-side object verification, list,
  short-lived download, and delete operations.
- [x] Enforced PDF, JPEG, PNG, and WebP content types, a 10 MB limit, generated
  object keys, owner prefixes, tenant isolation, and document permissions.
- [x] Added stage-specific upload feedback and working Documents controls in
  the employee profile.
- [x] Audited document creation, access, and deletion without exposing object
  keys, signed URLs, tokens, or file content.
- [x] Added a tenant-safe, permission-aware, filtered and cursor-paginated
  employee History API.
- [x] Added actor identity, request ID, impersonation context, categories,
  human-readable titles, and sanitized before/after changes to History.
- [x] Standardized employee-root audit recording for implemented employee,
  attendance, leave, trust, access, placement, policy, and document workflows.
- [x] Replaced the employee History UI with live category filters and
  pagination.
- [x] Added repeatable unit, API acceptance, browser, and real MinIO contract
  tests.

### Verified

| Check | Result |
| --- | --- |
| API and web type checks | Passed |
| API and web production builds | Passed |
| Focused lint | Passed |
| Storage and audit unit tests | 2 suites, 7 tests passed |
| Organization API acceptance | 1 suite, 5 tests passed |
| HR browser upload/history regression | 1 test passed |
| Real MinIO presign/CORS/PUT/HEAD/GET/delete contract | 1 test passed |
| Tenant isolation and permission denial paths | Passed |

Run the real local object-store contract with:

```bash
RUN_MINIO_INTEGRATION=true pnpm --filter api test -- --runInBand \
  src/platform/organization/infrastructure/s3-employee-document-storage.minio.spec.ts
```

### Production Configuration

| Environment | Storage |
| --- | --- |
| Local development | MinIO at `S3_ENDPOINT` and `S3_PUBLIC_ENDPOINT`, with `S3_FORCE_PATH_STYLE=true` |
| Production | AWS S3 HTTPS endpoint, private bucket, AWS credentials, and `S3_FORCE_PATH_STYLE=false` |

AWS S3 is supported by the same adapter but requires a deployment smoke test
with the production bucket, IAM policy, endpoint, and web-origin CORS before
release. No production credentials are stored in the repository.

### Deferred Hardening

These are not required for the working MVP and remain explicitly open:

- upload-completion idempotency and abandoned-upload cleanup;
- outbox-backed object deletion after database commit;
- document retention and legal-hold policy;
- migration/backfill of incomplete historical activity from older releases;
- antivirus scanning and document versioning;
- a live deployed HR portal and AWS S3 smoke test.

Repository-wide quality remains a separate Sprint 9 concern: the architecture
guard currently reports six legacy domain repository interfaces that import
Prisma/framework types, and full lint also includes unrelated findings in the
ongoing CQRS attendance refactor. All files changed by this delivery pass
focused lint, type checking, and production builds; this work does not add a
new cross-product dependency.

The detailed work packages below remain the source backlog. Items in the
deferred list must not be treated as completed merely because the MVP path
passes.

## 2. Current-State Findings

### 2.1 Document upload

The existing browser flow is:

1. `POST /employees/:employeeId/documents/presign`
2. browser `PUT` to the returned object-store URL
3. `POST /employees/:employeeId/documents`
4. refresh the document list

The API already validates employee access, MIME type, size, object ownership, and tenant scope. API end-to-end tests also cover metadata registration, listing, download authorization, deletion, and tenant isolation.

The remaining reliability gaps are:

- the web UI reports the same generic message for failures at all three upload stages;
- the test storage adapter does not perform a real browser `PUT`, so current tests do not validate object-store networking or CORS;
- local MinIO setup does not bootstrap the private bucket and browser CORS policy;
- `.env.example` documents `S3_BUCKET`, while private employee documents use `S3_PRIVATE_BUCKET`;
- a presigned URL may use an object-store endpoint that is reachable by the API container but not by the user's browser;
- readiness checks do not prove that the configured private bucket exists and can be used;
- document downloads are not currently recorded as sensitive access events;
- deleting the object before committing the database/audit update can leave inconsistent state after a partial failure.

### 2.2 Employee History

The employee profile currently embeds:

- up to 20 employment events;
- up to 20 audit rows whose `entityId` is the employee ID.

This is not a complete employee history because:

- it is not paginated;
- it does not show the actor's useful identity;
- before/after changes are not returned to the UI;
- audit entity types are not consistently cased;
- several Attendance-related actions store the employee ID only inside audit metadata instead of using the employee as the related entity;
- document access is not included;
- ordinary reads and sensitive reads are not distinguished;
- the UI uses generic titles and cannot filter activity categories;
- lifecycle events and audit events can represent the same action without a clear de-duplication rule.

## 3. Target Architecture

### 3.1 Ownership boundaries

```text
src/
├── platform/
│   └── organization/
│       └── employee-documents/
│           ├── application/
│           ├── domain/
│           ├── infrastructure/
│           └── presentation/
├── products/
│   └── attendance/
│       └── ...
└── shared/
    ├── audit/
    ├── storage/
    └── database/
```

Employee document metadata belongs to Platform/Organization. Binary storage remains shared infrastructure. Attendance must not be imported into the employee document feature.

Employee History is a platform query over standardized employment and audit records. Product modules record employee-related activity through the shared audit contract; they do not expose their repositories to Organization.

### 3.2 Minimal SOLID components

| Component | Responsibility |
| --- | --- |
| `EmployeeDocumentService` | Orchestrate presign, completion, listing, download, and deletion use cases |
| `EmployeeDocumentStorage` | Small interface for private employee-document object operations |
| `S3EmployeeDocumentStorage` | S3/MinIO implementation of the storage interface |
| `InMemoryEmployeeDocumentStorage` | Test implementation with the same behavioral contract |
| `EmployeeHistoryQueryService` | Query, normalize, de-duplicate, filter, and paginate employee timeline events |
| `EmployeeActivityRecorder` | Record standardized employee-related audit activity safely |
| `EmployeeHistoryPresenter` | Map internal events to a stable API response without exposing sensitive audit data |

This applies:

- **Single Responsibility:** storage transport, use-case orchestration, audit recording, and history presentation remain separate.
- **Open/Closed:** another storage provider or history source can be added through a contract instead of rewriting controllers.
- **Liskov Substitution:** S3 and in-memory storage implementations must pass the same contract tests.
- **Interface Segregation:** the document feature depends only on private document operations, not the existing multi-purpose storage service.
- **Dependency Inversion:** application services depend on storage and audit contracts, not AWS SDK commands.

## 4. Work Packages

## WP1. Reproduce and expose the failing upload stage

- [ ] Reproduce the production upload with browser Network logging.
- [ ] Record the status and response for presign, object `PUT`, and completion separately.
- [ ] Confirm whether the returned upload host is reachable from the browser.
- [ ] Confirm the deployed bucket exists.
- [ ] Confirm object-store CORS permits the deployed HR portal origin and `PUT`, `GET`, and `HEAD`.
- [ ] Preserve and display API `requestId` values for support diagnostics.
- [ ] Replace the generic catch block with stage-specific errors:
  - could not prepare upload;
  - object storage rejected or could not receive the file;
  - upload succeeded but could not be registered;
  - document list could not be refreshed.

**Exit criterion:** the exact failing stage is visible to developers and users receive a useful recovery action.

## WP2. Make private object storage deployable

- [ ] Standardize configuration on `S3_PRIVATE_BUCKET`.
- [ ] Add the required private-storage variables to `.env.example`.
- [ ] Support separate internal and browser-reachable object-store endpoints when required:
  - `S3_ENDPOINT` for API operations;
  - `S3_PUBLIC_ENDPOINT` for browser presigned URLs.
- [ ] Add a MinIO initialization service that creates the private bucket idempotently.
- [ ] Apply explicit CORS rules for configured web origins.
- [ ] Add persistent local MinIO storage.
- [ ] Strengthen readiness checks with `HeadBucket` and a safe private-bucket probe.
- [ ] Fail startup/readiness with a clear message when the private bucket is missing or unusable.
- [ ] Document local, Docker, staging, and production storage setup.

**Exit criterion:** a browser can upload and download a private test object in every supported environment.

## WP3. Refactor the document use cases

- [ ] Introduce `EmployeeDocumentStorage` under a shared storage contract.
- [ ] Move employee-document S3 details into `S3EmployeeDocumentStorage`.
- [ ] Keep the controller limited to authentication, validation, and response mapping.
- [ ] Keep tenant, employee, and permission checks in the application service.
- [ ] Use an explicit upload lifecycle:
  1. initiate upload;
  2. upload object;
  3. complete and verify upload;
  4. persist metadata and audit success.
- [ ] Make completion idempotent so a retried request cannot create duplicate documents.
- [ ] Verify content type, size, tenant ownership, and employee ownership server-side.
- [ ] Ensure object keys are generated only by the server and never exposed in list responses.
- [ ] Add orphan-object cleanup for uploads that are never completed.
- [ ] Change deletion to a failure-safe workflow:
  1. commit document deletion state and audit record;
  2. enqueue object deletion through the outbox;
  3. retry storage deletion safely;
  4. dead-letter and alert persistent failures.
- [ ] Define retention behavior for deleted employee documents.

**Exit criterion:** retries and partial storage/database failures do not create duplicate metadata or silently inconsistent records.

## WP4. Complete document security and audit coverage

- [ ] Record successful upload completion.
- [ ] Record document download/access.
- [ ] Record document deletion.
- [ ] Include actor user ID, employee ID, document ID, document type, request ID, IP, and user agent where appropriate.
- [ ] Never store object keys, signed URLs, file contents, credentials, or tokens in audit values.
- [ ] Keep document access audit separate from ordinary employee profile reads to avoid noisy history.
- [ ] Confirm HR roles need explicit document read/manage permissions.
- [ ] Confirm cross-tenant document identifiers always return a safe not-found response.

**Exit criterion:** every sensitive document operation is attributable without exposing document secrets.

## WP5. Introduce a complete employee History API

Create:

```http
GET /employees/:employeeId/history?cursor=&limit=25&category=
```

Return a stable response:

```json
{
  "items": [
    {
      "id": "event-id",
      "occurredAt": "2026-07-23T10:30:00.000Z",
      "category": "DOCUMENT",
      "action": "employee.document.downloaded",
      "title": "Employment contract downloaded",
      "actor": {
        "userId": "user-id",
        "displayName": "HR Admin",
        "email": "hr@example.com"
      },
      "changes": [],
      "requestId": "request-id"
    }
  ],
  "nextCursor": null
}
```

- [ ] Add cursor pagination and a bounded page size.
- [ ] Resolve actor display name and email without exposing unrelated user data.
- [ ] Return sanitized before/after fields for meaningful changes.
- [ ] Normalize `entityType` to `Employee`.
- [ ] Require employee-related audit events to set `entityId` to the employee ID.
- [ ] Use request/correlation IDs to de-duplicate lifecycle events represented in both event tables.
- [ ] Support categories:
  - lifecycle;
  - profile and placement;
  - account and access;
  - office, schedule, roster, and policy;
  - attendance;
  - leave and regularization;
  - device and biometrics;
  - documents;
  - security.
- [ ] Keep the existing employment event table as the effective-dated source for joins, transfers, promotions, and exits.
- [ ] Use the append-only tenant audit log for administrative and security actions.

**Exit criterion:** the API can return the complete employee timeline in deterministic order without loading product repositories directly.

## WP6. Standardize activity recording across modules

- [ ] Add `EmployeeActivityRecorder` to the shared audit boundary.
- [ ] Define a small employee-activity input contract.
- [ ] Update relevant platform and product use cases to record the employee as the related entity.
- [ ] Cover this event matrix:

| Area | Required events |
| --- | --- |
| Employee lifecycle | created, updated, transferred, promoted, terminated, reactivated |
| Account access | login created, activated, disabled, password reset by admin |
| Placement | department, designation, manager, work type, office changed |
| Schedule | shift assigned, roster assigned or changed |
| Policy | attendance or leave policy assigned, overridden, or removed |
| Attendance | manual correction, approval, rejection, payroll lock impact |
| Leave | requested, approved, rejected, cancelled |
| Regularization | requested, approved, rejected, cancelled |
| Device | registered, approved, blocked, replaced |
| Biometrics | consent changed, enrolled, reset |
| Documents | uploaded, downloaded, deleted |
| Security | high-risk administrative action or impersonated action |

- [ ] Preserve old and new values only for safe business fields.
- [ ] Record impersonation context.
- [ ] Add lint or architecture tests preventing products from importing another product's internals.

**Exit criterion:** important employee actions appear in History regardless of which module performed them.

## WP7. Improve the web document experience

- [ ] Show selected filename, type, and size before upload.
- [ ] Explain why the upload button is disabled.
- [ ] Show upload progress and current stage.
- [ ] Support retry after an expired URL or transient object-store failure.
- [ ] Clear completed input state and refresh both Documents and History.
- [ ] Display server validation messages for unsupported type and size.
- [ ] Add loading, empty, success, and failure states.
- [ ] Preserve keyboard navigation and accessible labels.
- [ ] Confirm download and delete actions are hidden or disabled without permission.

**Exit criterion:** HR can understand, retry, and complete the upload without opening developer tools.

## WP8. Improve the employee History experience

- [ ] Fetch History through the dedicated paginated endpoint.
- [ ] Display actor, time, category, action summary, and safe changes.
- [ ] Add category filters and “Load more”.
- [ ] Use human-readable titles instead of technical action keys.
- [ ] Link a history item to its relevant employee tab when safe.
- [ ] Refresh the timeline after profile, assignment, account, device, biometric, policy, leave, attendance, and document changes.
- [ ] Show a clear empty state rather than treating no activity as an error.

**Exit criterion:** HR can answer what changed, who changed it, and when from the employee profile.

## WP9. Migration and compatibility

- [ ] Add upload lifecycle/idempotency fields through a Prisma migration if required by WP3.
- [ ] Normalize existing employee audit `entityType` casing.
- [ ] Backfill employee entity references only where the employee ID can be identified safely.
- [ ] Do not invent historical actor or change information that was never recorded.
- [ ] Keep existing document records readable during deployment.
- [ ] Add temporary compatibility mapping for older audit actions.
- [ ] Remove compatibility code after the defined migration window.

**Exit criterion:** existing documents remain accessible and existing useful history remains visible after deployment.

## WP10. Automated verification

### Unit tests

- [ ] Document service orchestration and permission behavior.
- [ ] Upload completion idempotency.
- [ ] Storage failure and retry behavior.
- [ ] History normalization, ordering, filtering, sanitization, and de-duplication.
- [ ] Human-readable history presentation.

### Contract tests

- [ ] Run the same storage contract against in-memory and S3/MinIO adapters.
- [ ] Cover presign, put, head/verify, get, and delete.

### API end-to-end tests

- [ ] Successful document lifecycle and audit trail.
- [ ] Invalid MIME type and oversized file.
- [ ] Cross-tenant and insufficient-permission access.
- [ ] Expired or duplicate completion.
- [ ] Download audit.
- [ ] Paginated employee History with representative cross-module activity.

### Browser end-to-end tests

- [ ] Upload a real file through a presigned MinIO URL.
- [ ] Verify browser CORS behavior.
- [ ] Verify progress, error, retry, list refresh, download, and delete.
- [ ] Verify History updates after document actions.

### Failure tests

- [ ] Object store unavailable before presign.
- [ ] Object store unavailable during upload.
- [ ] Database failure after object upload.
- [ ] Object deletion retry and dead-letter behavior.
- [ ] Missing bucket and invalid public endpoint readiness failures.

**Exit criterion:** the full browser-to-object-store-to-database flow passes against real MinIO and the existing API regression suite remains green.

## 5. Implementation Order

1. WP1: reproduce and identify the production failure.
2. WP2: correct object-store deployment and readiness.
3. WP3 and WP4: refactor and secure the document workflow.
4. WP5 and WP6: build the unified employee History contract and event coverage.
5. WP7 and WP8: complete the HR portal experience.
6. WP9: migrate existing data safely.
7. WP10: run complete automated and production smoke verification.

Do not start the broad History UI before the audit contract and employee entity-reference rules are stable.

## 6. Definition of Done

- [ ] PDF, JPEG, PNG, and WebP employee documents up to 10 MB upload successfully.
- [ ] Upload works from both localhost and the deployed HR portal.
- [ ] The browser never receives an internal-only object-store hostname.
- [ ] Private objects cannot be read without an authorized short-lived URL.
- [ ] Upload, download, and delete actions are audited.
- [ ] Partial failures are recoverable and do not produce duplicate records.
- [ ] The employee History tab is paginated and shows actor, time, category, action, and safe changes.
- [ ] All defined employee event categories are covered.
- [ ] No password, token, signed URL, object key, biometric template, or file content appears in audit history.
- [ ] Tenant-isolation, permission, storage-contract, API e2e, and browser e2e tests pass.
- [ ] Deployment documentation includes required object-store bucket, endpoint, CORS, and readiness configuration.

## 7. Out of Scope

- document OCR;
- document e-signature workflows;
- public document sharing;
- full document version comparison;
- antivirus vendor selection beyond adding a future scan-status extension point;
- rebuilding all audit history that was not recorded by older versions.
