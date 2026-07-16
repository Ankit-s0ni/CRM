# The Five Implementation Files — What They Are & How They Connect

This document is a roadmap through the five concrete artifacts that operationalize the architectural review. Together they form the **data model, tenancy safety layer, and core domain logic** of your attendance platform.

---

## File 1: `erd-v2.puml` — The Corrected Entity Relationship Diagram

**What it is:**
A PlantUML source file that renders as a visual database schema diagram, reorganized from your original v1 (which was grouped by portal/UI) into six **bounded contexts** (business domains). Every entity, attribute, relationship, and cardinality shown here maps to Prisma model or raw SQL.

**Why it exists:**
Your v1 ERD was organized by *delivery mechanism* (Super Admin portal, Business Admin portal, etc.), which is a UI concern. The corrected v2 groups by *business domain*: Platform/Tenancy, Identity & Access, Organization, Attendance, Leave, Notifications. This mental model carries forward into your NestJS module structure (each bounded context becomes a NestJS module), team ownership, and the dependency graph.

**Key changes from v1 (all tagged inline):**
- **`[NEW]` Entities** (13 major ones added):
  - `Roles / Permissions / Role_Permissions / User_Roles` — replaces the hardcoded `Users.role` enum with a configurable RBAC system.
  - `Employee_Office_Assignments` — the missing link closing the geofence security gap (who is authorized to punch where).
  - `Policy_Assignments` — expresses the resolution chain: policy attached at employee > department > tenant-default level.
  - `Tenant_Subscriptions` — plan history, seat count, dunning state (plan_id removed from Tenants).
  - `Payment_Transactions` — one invoice, many payment attempts (fail → retry → success).
  - `Modules` — master registry replaces the hard-coded module_name enum.
  - `Impersonation_Sessions` — first-class audit of "Login As" (super-admin feature).
  - `Biometric_Consents` — GDPR Art. 9 / DPDP compliance: explicit consent records for face enrollment.
  - `Field_Tracking_Sessions` + `Field_Route_Summaries` — aggregates for route playback; raw pings partitioned + pruned.
  - `Notification_Templates / Notification_Preferences / Notification_Deliveries` — a real notification engine, not just an inbox.
  - `TenantAuditLog` — tenant-scoped audit trail (geo/policy/approval mutations).
  - `ReportExport` — async job tracking for muster/payroll exports.
  - `Tenant_Audit_Logs` (platform-level), `Employment_Events` (employee history).

- **`[FIX]` Relationships** (7 structural errors corrected):
  - `Office_Locations` was orphaned (belonged to no employee); now linked via `Employee_Office_Assignments`.
  - `Attendance_Events ||--|| Verification_Logs` was 1:1 (wrong; a verification can FAIL with no event created). Now correctly `|o--o|` (verification logs are the superset, include all attempts).
  - `Attendance_Exceptions ||--o{ Attendance_Logs` had a backwards FK. Now correctly materialized at finalization time via `resolved_exception_id` set by the day-finalization job.
  - `Users ||--|| Employees` was too strict (no room for admin-users or employees pre-provisioning). Now `|o--o|` (0..1).
  - `approved_by` columns on Leave_Requests, RegularizationRequests, and Attendance_Exceptions now all FK to `Users` (documented).
  - `Tenant_Holidays` optionally scoped to `Office_Locations` for regional holidays.
  - Policy now reachable by employee/department *and* tenant-level default, not just via shift.

- **`[CHG]` Attributes** (4 semantic changes):
  - `Shifts` adds `is_overnight` boolean and removes `grace_period_minutes` (lateness rules live on policy only, single source of truth).
  - `Office_Locations` adds `timezone` (for attendance-date attribution in multi-city tenants) and `egress_ips` (server-observed, not client SSID).
  - `Tenant_Settings` adds `weekly_offs` JSON (e.g., `["SAT","SUN"]`) for muster distinction of Absent vs. Weekly Off.
  - `Employees` adds: `status`, `date_of_joining`, `date_of_exit`, `designation_id`, `default_shift_id`, `faceEmbeddingRef`, `faceEnrolledAt`.
  - `Attendance_Logs` adds: `break_minutes`, `applied_policy_snapshot` (frozen policy values at finalization, so recompute never changes historical payroll), `resolved_exception_id`, `finalized_at`, `locked_at` (payroll lock).
  - `Attendance_Events` adds: `client_event_uuid` (idempotency for offline sync), `source` (MOBILE/WEB/KIOSK/REGULARIZED), `time_suspect` (clock-tamper heuristic).
  - `Attendance_Verification_Logs` adds: `observed_ip` (server IP), `integrity_verdict` JSON (Play Integrity / App Attest), `failure_reasons` JSON (e.g., `["OUTSIDE_GEOFENCE"]`).

- **`[DEL]` Removed concepts:**
  - `Users.role` enum → Roles tables (enum only remains as a seed value).
  - `Shifts.grace_period_minutes` and `Shifts.attendance_policy_id` FK → policy attached elsewhere.
  - `Attendance_Exceptions` hard FK to logs → materialized on finalization.

**How to use this file:**
1. Render it in PlantUML (VS Code extension, or paste into http://www.plantuml.com/plantuml/uml/).
2. Cross-reference every entity with the Prisma schema below.
3. Walk it with your product/business team — the changes are real decisions, and the tags make them visible for negotiation.
4. Keep it as your single source of truth; update it *before* writing migrations, not after.

**Relationship to the architecture review:**
This diagram is the **concrete manifestation** of the Phase 1 analysis (§1.1–1.3). Every tag documents a gap, security issue, or business rule that was missing from v1. The diagram is the "translation" of the review into data terms.

---

## File 2: `schema.prisma` — The Prisma ORM Schema

**What it is:**
A Prisma schema file (the source of truth for your data model from the application's perspective). It defines all 50+ models, their fields, relationships, and constraints. This is the file you run `npx prisma migrate dev` against to generate migrations.

**Why it exists:**
Prisma translates this declarative schema into:
1. Database migrations (auto-generated as `.sql` files in `prisma/migrations/`).
2. A generated TypeScript client (`@prisma/client`) with full type safety for queries.
3. Enforced field types, nullability, and FK integrity at the ORM layer.

It's **one source of truth** so your backend code, mobile types (via code-gen), and DB schema never drift apart.

**Key design patterns baked into this schema:**

### 1. **Tenant-scoped everything**
Every table that carries multi-tenant data includes:
- `tenantId: String @db.Uuid` — references back to the `Tenant` root.
- Composite unique/index: `@@unique([tenantId, entityKey])` — e.g., `employee_code` is unique *per tenant*, not globally.
- This prevents tenant A from accidentally seeing tenant B's data if app code has a bug.

```prisma
@@unique([tenantId, employeeCode])
@@unique([tenantId, email])
@@index([tenantId, status])
```

### 2. **UUID v7 primary keys**
```prisma
id: String @id @default(uuid(7)) @db.Uuid
```
UUID v7 is **time-ordered** (vs v4 random), which makes indexing efficient and log reading chronological. Prisma recently added `uuid(7)` support; if on an older version, generate in application code (`randomUUID()`) or use a trigger.

### 3. **Createdby/updatedAt on every model**
```prisma
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```
These are non-negotiable for audit trails, sync cursors, and debugging.

### 4. **Composite foreign keys on high-risk tables**
For example, `Employee → Department`:
```prisma
department   Department    @relation(fields: [deptId], references: [id])
```
In raw SQL this should be:
```sql
FOREIGN KEY (tenant_id, dept_id) REFERENCES departments(tenant_id, id)
```
This means a bug in app code *physically cannot* point an employee at another tenant's department — the database itself rejects it. Prisma doesn't model composite FKs perfectly, so this is documented in raw migration SQL (see file 3).

### 5. **Declarative many-to-many (no explicit join table)**
```prisma
roles    UserRole[]
users    UserRole[]
// resolves to: User -< UserRole >- Role via the join table Prisma creates
```

### 6. **Optional relationships for flexible schemas**
```prisma
manager      Employee?     @relation("ManagerChain", fields: [managerId], references: [id])
user         User?         @relation(fields: [userId], references: [id])  // 0..1
designation  Designation?  @relation(fields: [designationId], references: [id])
```
The `?` allows NULL, so an employee can exist without an enrollment/manager assignment, and a user record can exist without an employee proxy.

### 7. **High-volume tables declared but DDL owned by raw SQL**
```prisma
/// PARTITIONED by month on eventTime (raw SQL migration owns DDL).
model AttendanceEvent { ... }
```
Prisma can't manage partitions, so these tables are **declared** here (for type safety + migrations) but their actual partitioning is created in file 3 (raw SQL). The app sees them as unified; the DB handles partitioning transparently.

### 8. **Computed columns never written by app**
```prisma
totalWorkMinutes      Int               @default(0)
lateMinutes           Int               @default(0)
appliedPolicySnapshot Json?
```
These are **denormalized for read performance** but must NEVER be hand-edited — only the `AttendanceCalculator` domain service recomputes them atomically with the event stream (see file 5). A Prisma middleware could enforce this, but the real guard is in the domain service code.

### 9. **Outbox table for event durability**
```prisma
model OutboxEvent {
  publishedAt DateTime?  // NULL while unpublished
}
```
Domain events persist in the same transaction as the aggregate; a background job publishes them to the message queue. If the job crashes, the unpublished rows are still there on restart. This is **the seam that makes "domain events" real** (not just logging that vanishes).

### 10. **Biometric data handling**
```prisma
masterSelfie   String?        // private bucket key; serve via signed URL
faceEmbeddingRef String?      // biometric vault reference — never the vector inline
```
The selfie is never stored inline (privacy, PII on replicas); it's a reference to secure object storage. The embedding vector is equally sensitive; it lives in a separate vault, not in the main database.

**Structure of the schema:**
```
enums (TenantStatus, WorkType, etc.)
 ↓
PLATFORM / TENANCY
  ├─ Tenant
  ├─ TenantSettings
  ├─ TenantSubscriptions
  └─ Payment_Transactions
 ↓
IDENTITY & ACCESS
  ├─ User
  ├─ Role / Permission / UserRole / RolePermission
  └─ RefreshToken
 ↓
ORGANIZATION
  ├─ Department
  ├─ Designation
  ├─ Employee
  └─ Employment_Events
 ↓
ATTENDANCE (the core slice shown; leave/notif tables omitted for brevity)
  ├─ Config: OfficeLocation, AttendancePolicy, Shift, EmployeeShiftRoster, TenantHoliday
  ├─ Runtime: RegisteredDevice, AttendanceLog, AttendanceEvent, VerificationLog, Exception, RegularizationRequest
  ├─ Field: FieldTrackingSession, FieldLocationPing, FieldRouteSummary
  └─ Compliance: BiometricConsent, TenantAuditLog
 ↓
OUTBOX (event durability)
```

**How to use this file:**
1. Copy it into `prisma/schema.prisma` in your NestJS app.
2. Ensure `DATABASE_URL` in `.env` points to your Postgres instance.
3. Run `npx prisma migrate dev --name init` to create the first migration.
4. Run file 3's raw SQL as a second migration: `npx prisma migrate dev --name rls_and_partitions --create-only`, then paste the SQL.
5. Read the Prisma docs on [relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations), [enums](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#enums), and [composite unique indexes](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes#composite-indexes) for the syntax.

**Relationship to the architecture review:**
The schema operationalizes the data model from Phase 1. Every field that appears in the review (policy snapshot, lock timestamp, consent record, outbox event) is here, and the tenant-scoping is wired in at this level so it's not a runtime option — it's structural.

---

## File 3: `rls-and-partitions.sql` — Row-Level Security & Partitioning

**What it is:**
Raw SQL that runs *after* `prisma migrate` completes (as its own migration). It implements four things Prisma cannot express:

1. **Row-Level Security (RLS)** — the database-layer tenant isolation policy.
2. **Monthly partitioning** — splits high-volume tables into monthly chunks.
3. **Partial unique indexes** — e.g., "exactly one primary device per employee".
4. **Append-only grants** — revokes UPDATE/DELETE on audit logs for the app role.

**Why it exists:**
Prisma is an ORM; it maps rows to objects and objects to rows. It's excellent for application logic but has no language for database policies, partitioning, or fine-grained permissions. These are **defense-in-depth** layers that protect data integrity at the database level, not just the app.

**Key sections:**

### 1. **RLS Policy Loop**
```sql
DO $$
DECLARE
  tenant_tables text[] := ARRAY[
    'tenants', 'users', 'employees', ... 
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    ALTER TABLE t ENABLE ROW LEVEL SECURITY;
    ALTER TABLE t FORCE ROW LEVEL SECURITY;  -- FORCE: even table owner bound
    CREATE POLICY tenant_isolation ON t
      USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
  END LOOP;
END $$;
```

**What this does:**
- Every INSERT/SELECT/UPDATE on a tenant-scoped table checks: is `tenant_id = current_setting('app.tenant_id')`?
- If the setting is NULL (no request context), the predicate is NULL, and **zero rows** pass — fail closed.
- `FORCE ROW LEVEL SECURITY` means even `BYPASSRLS` admins are bound, except explicitly connected as the `app_admin` role (used only for super-admin portal, migrations).

This is layer 3 of tenant isolation (layers 1–2 are: request middleware verifying subdomain, and Prisma's active tenant filter). If any one layer fails, the others still hold.

### 2. **Partitioning (AttendanceEvent example)**
```sql
ALTER TABLE attendance_events RENAME TO attendance_events_old;

CREATE TABLE attendance_events (
  LIKE attendance_events_old INCLUDING DEFAULTS
) PARTITION BY RANGE (event_time);

CREATE TABLE attendance_events_2026_07
  PARTITION OF attendance_events
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
-- ... repeat for each month
```

**Why partitioning matters:**
At scale, `attendance_events` is ~110M rows/year (§1.7). A query like `SELECT * FROM attendance_events WHERE tenant_id = $1 AND employee_id = $2 AND event_time > now() - interval '30 days'` scans months of unrelated data if it's one giant table.

Partitioning lets Postgres:
- **Prune partitions** (only scan July 2026, not Jan 2020).
- **Parallelize scans** across partitions.
- **Drop old partitions** directly (not `DELETE`, which is slow — just `DROP TABLE`).

A scheduled job (BullMQ) creates new partitions monthly:
```sql
CREATE TABLE IF NOT EXISTS attendance_events_2026_08
  PARTITION OF attendance_events
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

### 3. **Partial Unique Indexes**
```sql
CREATE UNIQUE INDEX rd_one_primary_per_employee
  ON registered_devices (tenant_id, employee_id)
  WHERE is_primary = true AND status = 'ACTIVE';
```

This enforces: **only one active primary device per employee**. The `WHERE` clause makes the unique index **partial** — it only applies to rows matching the predicate. This means:
- An employee can have multiple inactive devices (blocked, replaced).
- But only one is `is_primary = true AND status = ACTIVE`.
- If the app tries to insert a second one, Postgres rejects it: `UNIQUE violation`.

Prisma can't declare this (it only knows `@unique` on full columns), so it lives in raw SQL and is **the enforcement mechanism** for the application invariant.

### 4. **Append-only Audit**
```sql
REVOKE UPDATE, DELETE ON tenant_audit_logs FROM app_user;
```

The app role can SELECT and INSERT, but not UPDATE or DELETE. So audit logs are truly append-only — a developer cannot accidentally (`UPDATE log SET action = '...'`) or intentionally corrupt them.

(For super-admin logs, use the `app_admin` role in migrations only.)

### 5. **CI Gate (pseudocode)**
```sql
BEGIN; SET LOCAL app.tenant_id = '<tenant A>';
SELECT count(*) FROM employees WHERE tenant_id = '<tenant B>';
-- MUST return 0. If >0, RLS is broken; fail the build.
```

This test **must run in your CI** and must be permanent. It's the one integration test that validates the entire tenancy model, and it runs in seconds.

**How to use this file:**
1. In your NestJS app, create `prisma/migrations/<timestamp>_rls_and_partitions/migration.sql`.
2. Paste the entire SQL into it.
3. Run `npx prisma migrate deploy`.
4. Verify: connect as `app_user` and try to query across tenants — you should get 0 rows.

**Relationship to the architecture review:**
This file operationalizes §1.5 (multi-tenancy) and §1.7 (scalability). The RLS is the third defense-in-depth layer; the partitioning is the query optimization; the partial uniques are the database-level invariant enforcement.

---

## File 4: `tenancy.extension.ts` — Request Context & Prisma Tenancy Integration

**What it is:**
A NestJS service + middleware that:
1. Resolves the subdomain from the request hostname.
2. Loads the tenant and suspends-status checks.
3. Stores the tenant ID in **AsyncLocalStorage** (Node.js request-scoped memory).
4. Extends Prisma to automatically issue `SET LOCAL app.tenant_id` on every transaction.

**Why it exists:**
Postgres RLS policies are powerful, but they only work if every query *sets* the `app.tenant_id` GUC (Grand Unified Configuration variable). This middleware ensures that setting is automatic and consistent across every request/job, so the policy is never bypassed.

**Key pieces:**

### 1. **RequestContext interface**
```typescript
interface RequestContext {
  tenantId: string;
  userId?: string;
  roles: string[];
  requestId: string;
}
```

This carries the request's tenant + user metadata. It's stored in `AsyncLocalStorage`, which means:
- Every `await` inside that request can access it via `currentContext()`.
- Child promises (jobs, inter-service calls) don't see it unless explicitly passed.
- At the end of the request, it's garbage-collected (no risk of cross-request leakage).

### 2. **TenancyMiddleware**
```typescript
async use(req: Request, res: Response, next: NextFunction) {
  const subdomain = req.hostname.split('.')[0];
  const tenant = await this.tenants.bySubdomain(subdomain);
  if (!tenant) throw new UnauthorizedException('Unknown workspace');
  if (tenant.status === 'SUSPENDED') throw new ForbiddenException('Suspended');
  
  const ctx = { tenantId: tenant.id, requestId: ... };
  requestContext.run(ctx, () => next());
}
```

**Execution model:**
- Request arrives for `acme.yourhrms.com`.
- Middleware extracts `acme`, queries `tenants` for subdomain = `acme`.
- If suspended, returns 403 immediately (enforcement point for §1.5.5).
- Seeds the `RequestContext` and runs the rest of the middleware chain *inside* that context.

**Caching:** `this.tenants.bySubdomain()` must use Redis (TTL 5 min) so subdomain lookups don't hammer the DB on every request.

### 3. **PrismaService.forTenant()**
```typescript
forTenant<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts?: { tenantId?: string }
): Promise<T> {
  const tenantId = opts?.tenantId ?? currentContext().tenantId;
  return this.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
```

**What this does:**
- Opens a transaction.
- Issues `SET LOCAL app.tenant_id = '<uuid>'` (parameterized, injection-proof).
- Runs your queries inside the transaction (they see the GUC set).
- Commits or rolls back.

**Crucially:** the `LOCAL` keyword means the setting is scoped to *this transaction only*. When the transaction ends, the setting is reset. So a pooled connection that runs 100 requests can never leak tenant context.

### 4. **Repository pattern example**
```typescript
async saveWithEvents(
  tx: Prisma.TransactionClient,
  log: AttendanceLog,
  events: AttendanceEvent[],
  domainEvents: { eventKey: string; payload: any }[],
) {
  await tx.attendanceLog.upsert({ ... });
  if (events.length) await tx.attendanceEvent.createMany({ data: events });
  if (domainEvents.length) {
    await tx.outboxEvent.createMany({
      data: domainEvents.map(e => ({
        tenantId: log.tenantId,
        eventKey: e.eventKey,
        payload: e.payload,
      })),
    });
  }
}
```

**The pattern:**
- Services call `prisma.forTenant(async (tx) => { repo.saveWithEvents(tx, ...) })`.
- Repositories accept the transaction and use it: `tx.attendanceLog.upsert()`.
- No repository ever opens its own transaction or manages tenancy — it's the caller's responsibility.
- This keeps repositories thin and focused; tenancy is a cross-cutting concern handled at the middleware layer.

### 5. **Background jobs (BullMQ)**
```typescript
// Job payload
{ tenantId: '...', ... }

// Job processor
export const finalizeDay = async (job) => {
  const { tenantId } = job.data;
  await runWithContext({ tenantId, requestId: job.id }, async () => {
    // All DB queries here see RLS applied to this tenant
    const days = await prisma.forTenant(tx => tx.attendanceLog.findMany(...));
  });
};
```

Each job payload carries `tenantId`. The processor re-establishes the same context before querying. This means RLS holds in background jobs too — the database never trusts the job to be tenant-aware; it enforces it.

**How to use this file:**
1. Copy it into `src/shared/tenancy/tenancy.extension.ts` (or similar).
2. Register the middleware in your NestJS app module:
   ```typescript
   app.use(TenancyMiddleware);
   ```
3. Inject `PrismaService` into every service that touches tenant data.
4. Every data access goes through `prisma.forTenant()`.
5. Repositories never open transactions; they accept a `tx` parameter.

**Relationship to the architecture review:**
This file operationalizes §3.4 (multi-tenant implementation, the concrete mechanics). The `AsyncLocalStorage + forTenant + RLS policy loop` together form the three-layer defense that makes the phrase "shared-schema multi-tenancy" real, not aspirational.

---

## File 5: `verification-pipeline.ts` — The Verification Pipeline & Check-In Use-Case

**What it is:**
The core domain logic for the check-in flow. It implements:
1. **Domain value objects** (`GeoPoint`, `Geofence`, `FailureReason` enum).
2. **Verification checks** (4 classes: device, integrity, location, face) implementing a common interface.
3. **The verification pipeline** (orchestrates checks, short-circuits on fail, assembles results).
4. **The check-in service** (NestJS service; the use-case/orchestrator).

This file alone demonstrates the design from Phase 4 in runnable code.

**Why it exists:**
The check-in flow is the **core of your product**. It must be:
- **Testable:** every check is a pure class; mock the providers, assert outputs.
- **Extensible:** adding PIN or NFC beacon = one new check class + a policy flag; no existing code changes.
- **Observable:** every attempt (pass or fail) is logged; the logs feed security alerts.
- **Correct:** business rules (employee inactive, device blocked) are enforced before expensive provider calls.

**Key design patterns:**

### 1. **Domain value objects**
```typescript
export class Geofence {
  contains(p: GeoPoint): { inside: boolean; distanceM: number }
}
```

`Geofence` encapsulates the distance calculation. It's a pure function with state (center, radius). The mobile app sends `{lat, lng}`, and the server computes whether it's inside the office perimeter — the mobile never decides.

### 2. **Ports (interfaces for external dependencies)**
```typescript
export interface FaceMatchProvider {
  compare(enrolledRef: string, selfieKey: string): Promise<{ score: number; livenessOk: boolean }>;
}
```

The service doesn't import `AWSRekognition` or `InsightFace`. It depends on the interface. At runtime, a Nest provider injects the AWS adapter; in tests, a mock that always returns `{ score: 95, livenessOk: true }` is injected. This is the **Dependency Inversion Principle** — you depend on abstractions, not concrete implementations.

### 3. **Verification check interface**
```typescript
export interface VerificationCheck {
  readonly name: string;
  evaluate(ctx: VerificationContext): Promise<CheckResult>;
}
```

Every check is a class that:
- Takes a context (employee, policy, request, settings).
- Returns a result (passed: yes/no, reasons: FailureReason[], evidence: raw data).
- Does *not* throw; all outcomes are values.

### 4. **The four checks (in order)**

**DeviceCheck:**
```typescript
if (!ctx.policy.requireRegisteredDevice || ctx.request.source === 'WEB') {
  return pass(name, { skipped: true });
}
const device = await this.devices.findActive(...);
if (!device || device.employeeId !== employee.id) {
  return fail(name, ['DEVICE_NOT_OWNED'], { deviceId: device.id });
}
return pass(name, { deviceId: device.id });
```
- Runs first (cheapest — local DB lookup).
- Short-circuits if device is missing or not bound to the punching employee.
- Returns early if web-based punch (device registration not required).

**IntegrityCheck:**
```typescript
const v = await this.integrity.verify(token, platform); // Play Integrity API
if (!v.genuineDevice) reasons.push('INTEGRITY_FAILED');
if (v.rooted) reasons.push('ROOTED_DEVICE');
if (v.mockLocation) reasons.push('MOCK_LOCATION');
```
- Calls a provider (AWS, Google, Apple) to verify the device's attestation.
- Detects rooted/jailbroken devices, mock-location spoofing.
- Cached-away-from-untrusted-client checks — the device itself cannot pass this test.

**LocationCheck:**
```typescript
// OFFICE employees: geofence OR office IP (literal OR from your spec)
const ipMatch = assigned.find(o => o.egressIps.includes(ctx.request.observedIp));
if (ipMatch) return pass(..., { via: 'OFFICE_IP' });

// If not IP-matched, try geofence
const r = geofence.contains(clientLocation);
if (r.inside) return pass(..., { via: 'GEOFENCE' });
return fail(..., ['OUTSIDE_GEOFENCE'], { distanceM: r.distanceM });

// FIELD employees: GPS required
if (!clientLocation) return fail(..., ['GPS_ACCURACY_TOO_LOW']);
if (clientLocation.accuracyM > 100) return fail(..., ['GPS_ACCURACY_TOO_LOW']);
return pass(..., { gpsValid: true });
```
- Strategy by work_type (OFFICE vs FIELD) — different rules per employee class.
- Server computes distance; the "2 km outside the job site" alert is real evidence, not user-provided data.
- Office IP is the trusted source (server-observed, not client-reported); geofence is the fallback.

**FaceCheck:**
```typescript
if (!ctx.policy.requireFaceMatch) return pass(..., { skipped: true });
if (!consent) return fail(..., ['CONSENT_MISSING']);
const { score, livenessOk } = await this.faces.compare(enrolledRef, selfieKey);
if (!livenessOk) return fail(..., ['LIVENESS_FAILED']);
if (score < threshold) return fail(..., ['FACE_MISMATCH'], { score });
return pass(..., { score });
```
- Consent-gated (revoked consent → routed to GPS-only policy automatically, but failing here is a config gap).
- Server-side face matching (the selfie and enrollment are object-storage keys; the provider handles the comparison).
- Liveness detection (blink required; no photos held up to the camera).

### 5. **Pipeline orchestration**
```typescript
async run(ctx: VerificationContext): Promise<VerificationVerdict> {
  const chain = this.chainFor(ctx); // assemble based on policy + work_type
  const results = [];
  for (const check of chain) {
    const r = await check.evaluate(ctx);
    results.push(r);
    if (!r.passed) break;  // short-circuit; still log the partial trail
  }
  return { passed: results.every(r => r.passed), results, reasons: results.flatMap(r => r.reasons) };
}
```

**Key: short-circuit behavior**
- If device check fails, do not call face-match provider (save cost, time).
- But still log the attempt (the `VerificationLog` row includes all passed+failed checks up to the failure point).
- The caller decides how to handle: throw (employee sees "device not registered"), or retry from a different device.

### 6. **The check-in service (orchestrator)**
```typescript
@Injectable()
export class CheckInService {
  async checkIn(cmd: CheckInCommand): Promise<CheckInResultDto> {
    const ctx = { tenantId, employee, policy, settings, request };
    const verdict = await this.pipeline.run(ctx);

    // 1. Always log (even failures)
    const verificationLogId = await this.verificationLogs.write(ctx, verdict);

    // 2. Failure → no attendance event
    if (!verdict.passed) {
      await this.emitOutbox('attendance.check_in_rejected', { ... });
      throw new UnprocessableEntityException({
        code: verdict.reasons[0],  // e.g., OUTSIDE_GEOFENCE
        details: publicDetails(verdict),  // only safe evidence, e.g., { distanceM: 2140 }
      });
    }

    // 3. Success → append through aggregate, recompute, emit atomically
    return this.prisma.forTenant(async (tx) => {
      const day = await this.days.loadOrCreateForUpdate(tx, employee.id, date); // row lock
      day.appendEvent({ type: 'CHECKIN', verificationLogId, ... });
      day.recompute(this.calculator, shift, policy);
      await this.days.saveWithEvents(tx, day, [/* domain events */]);
      return day.toTimelineDto();
    });
  }
}
```

**The flow:**
1. Resolve context (policy, settings, employee).
2. Run the pipeline.
3. *Always* write a verification log (yes, even if it fails — this is the security-alert feed).
4. If failed, emit an event, return a machine-readable code.
5. If passed, append through the aggregate (the `AttendanceDay`), which enforces invariants (no double-check-in), recomputes aggregates (total minutes), and emits domain events (which trigger notifications, live-board updates, audit logs).
6. All mutations happen atomically in a transaction with RLS applied.

### 7. **Evidence sanitization**
```typescript
function publicDetails(v: VerificationVerdict): Record<string, unknown> {
  const d = v.results.at(-1)?.evidence ?? {};
  const allow = ['distanceM', 'nearestOfficeId', 'accuracyM'];
  return Object.fromEntries(Object.entries(d).filter(([k]) => allow.includes(k)));
}
```

The verification logs store *everything* (faceMatchScore, IP address, integrity verdict). The response to the mobile app only gets *safe* evidence:
- `distanceM: 2140` (safe; user can see it on a map).
- `nearestOfficeId`, `accuracyM` (contextual; helps the employee self-troubleshoot).

Never:
- Raw integrity verdicts (security info).
- Face match scores (privacy; you don't expose biometric comparison data).
- Actual IP addresses (privacy).

**How to use this file:**
1. Copy the check classes into `src/modules/attendance/domain/verification/checks/`.
2. Copy the pipeline into `src/modules/attendance/domain/verification/pipeline.ts`.
3. Copy the service into `src/modules/attendance/application/services/check-in.service.ts`.
4. Implement the adapter classes (FaceMatchProvider, DeviceRegistry, etc.) in `src/modules/attendance/infrastructure/`.
5. Wire them up in the attendance module's dependency injection: `providers: [DeviceCheck, IntegrityCheck, ..., CheckInService]`.
6. Write tests for each check independently; use mocks for providers.

**Relationship to the architecture review:**
This file is the direct implementation of §4.1–4.5 (Attendance Module Design). Every design decision from Phase 4 is visible in code: OCP (new checks = new classes), DIP (ports for external deps), domain events (emitted on every punch), evidence trails (logs store everything, responses are sanitized).

---

## How the Five Files Connect

```
                        erd-v2.puml
                       (visual spec)
                            ↓
                      schema.prisma
                    (app-layer model)
                            ↓
                   rls-and-partitions.sql
               (database-layer enforcement)
                            ↓
              tenancy.extension.ts + middlware
        (request context → RLS enforcement wire)
                            ↓
         verification-pipeline.ts + check-in-service
      (domain logic, uses the DB via Prisma + tenancy)
```

**Flow of a check-in request:**

1. **Request arrives** for `acme.yourhrms.com/api/v1/attendance/check-in`.
2. **TenancyMiddleware** (file 4) resolves subdomain, seeds `RequestContext` with tenant ID.
3. **CheckInService** (file 5) is called; it invokes `VerificationPipeline.run()`.
4. **Pipeline runs checks** (file 5) in order; each check may query the DB via Prisma.
5. **Prisma.forTenant()** (file 4) wraps each query in a transaction that issues `SET LOCAL app.tenant_id`.
6. **Postgres RLS** (file 3) silently filters: only rows where `tenant_id = current_setting('app.tenant_id')` are visible.
7. **Checks evaluate** (file 5): device loaded (RLS filters to this tenant's devices), policy loaded (RLS filters to this tenant's policies), etc.
8. **On success**, an `AttendanceLog` row is created/updated and `AttendanceEvent` rows are appended, all in one transaction (file 3's partitioning slices by month).
9. **Outbox events** are persisted in the same transaction; a background job publishes them to BullMQ.
10. **Response** is sent to the mobile app with machine-readable codes + safe evidence (file 5's `publicDetails`).

**Every layer trusts no other layer:**
- The middleware verifies the subdomain; the policy can still fail closed.
- The policy trusts no app code; it enforces tenant isolation in the database.
- The domain logic trusts no caller; it validates invariants in the aggregate.
- The tests verify every check independently; integration tests verify the RLS is tight.

---

## File relationships at a glance

| File | Type | Audience | Depends on | Used by |
|------|------|----------|-----------|---------|
| **erd-v2.puml** | Visual spec | Product, architects | (none) | All other files |
| **schema.prisma** | ORM schema | Backend, frontend codegen | erd-v2 | Migrations, app code |
| **rls-and-partitions.sql** | Raw SQL migration | DBAs, backend | schema.prisma | `prisma migrate` |
| **tenancy.extension.ts** | NestJS middleware/service | Backend engineers | schema.prisma | Every service/controller |
| **verification-pipeline.ts** | Domain + application logic | Backend engineers | tenancy.extension.ts, schema.prisma | Attendance module, tests |

---

## Next steps

With these five files, you have:
- ✅ A corrected data model (ERD).
- ✅ An ORM schema that operationalizes it.
- ✅ Tenant isolation at the database level (RLS) and query level (partitioning).
- ✅ Request-context wiring (middleware → RLS).
- ✅ Core domain logic for the check-in pipeline, with extensibility and observability baked in.

The next two implementations, for completeness, are:

1. **`attendance-calculator.ts`** — the pure function that computes `total_work_minutes`, `late_minutes`, `overtime_minutes` from a set of events, a shift, a policy, and exceptions. This is the "single point of truth" that all reports and payroll depend on; it's 80% test cases (night shifts, half-days, holidays, DST transitions, clock tampering).

2. **`attendance-day.aggregate.ts`** — the `AttendanceDay` aggregate root that owns the events, enforces invariants (no double check-in without checkout), recomputes aggregates, and emits domain events. It's the seam between the infrastructure (database) and the domain logic (calculator).

Want those next, or do you want to start using these five to build out a working prototype?
