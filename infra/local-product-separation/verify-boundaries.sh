#!/bin/sh
set -eu

TENANT_ID='11111111-1111-4111-8111-111111111111'
USER_ID='22222222-2222-4222-8222-222222222222'
EMPLOYEE_ID='33333333-3333-4333-8333-333333333333'
ATTENDANCE_ID='44444444-4444-4444-8444-444444444444'
PAYROLL_ID='55555555-5555-4555-8555-555555555555'
EVENT_ID='66666666-6666-4666-8666-666666666666'

platform_owner() {
  PGPASSWORD="$PLATFORM_OWNER_PASSWORD" psql --set ON_ERROR_STOP=1 \
    --host platform-db --username platform_owner --dbname platform_local "$@"
}

platform_runtime() {
  PGPASSWORD="$PLATFORM_RUNTIME_PASSWORD" psql --set ON_ERROR_STOP=1 \
    --host platform-db --username platform_runtime --dbname platform_local "$@"
}

hrms_owner() {
  PGPASSWORD="$HRMS_OWNER_PASSWORD" psql --set ON_ERROR_STOP=1 \
    --host hrms-db --username hrms_owner --dbname hrms_local "$@"
}

hrms_runtime() {
  PGPASSWORD="$HRMS_RUNTIME_PASSWORD" psql --set ON_ERROR_STOP=1 \
    --host hrms-db --username hrms_runtime --dbname hrms_local "$@"
}

assert_value() {
  actual="$1"
  expected="$2"
  message="$3"
  if [ "$actual" != "$expected" ]; then
    echo "FAIL: $message (expected '$expected', received '$actual')" >&2
    exit 1
  fi
  echo "PASS: $message"
}

echo 'Preparing isolated, idempotent boundary-test schemas...'
platform_owner <<'SQL'
CREATE SCHEMA IF NOT EXISTS platform_boundary AUTHORIZATION platform_owner;

CREATE TABLE IF NOT EXISTS platform_boundary.tenants (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_boundary.users (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES platform_boundary.tenants(id),
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS platform_boundary.product_entitlements (
  tenant_id uuid NOT NULL REFERENCES platform_boundary.tenants(id),
  product_key text NOT NULL CHECK (product_key IN ('HRMS', 'MAIL', 'POS')),
  active boolean NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, product_key)
);

GRANT USAGE ON SCHEMA platform_boundary TO platform_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA platform_boundary TO platform_runtime;
SQL

hrms_owner <<'SQL'
CREATE SCHEMA IF NOT EXISTS hrms_boundary AUTHORIZATION hrms_owner;

CREATE TABLE IF NOT EXISTS hrms_boundary.tenant_projections (
  tenant_id uuid PRIMARY KEY,
  tenant_slug text NOT NULL,
  tenant_status text NOT NULL CHECK (tenant_status IN ('ACTIVE', 'SUSPENDED')),
  hrms_enabled boolean NOT NULL,
  entitlement_version integer NOT NULL CHECK (entitlement_version > 0),
  source_event_id uuid NOT NULL UNIQUE,
  contract_version text NOT NULL CHECK (contract_version = '1.0'),
  projected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hrms_boundary.employees (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  employee_code text NOT NULL,
  display_name text NOT NULL,
  UNIQUE (tenant_id, employee_code)
);

CREATE TABLE IF NOT EXISTS hrms_boundary.attendance_logs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  employee_id uuid NOT NULL REFERENCES hrms_boundary.employees(id),
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE')),
  UNIQUE (tenant_id, employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS hrms_boundary.payroll_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  period text NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'PAID')),
  UNIQUE (tenant_id, period)
);

GRANT USAGE ON SCHEMA hrms_boundary TO hrms_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA hrms_boundary TO hrms_runtime;
SQL

echo 'Creating an idempotent Platform tenant and HRMS entitlement fixture...'
platform_runtime <<SQL
INSERT INTO platform_boundary.tenants (id, slug, name, status)
VALUES ('$TENANT_ID', 'local-contract-acme', 'Local Contract Acme', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO platform_boundary.users (id, tenant_id, email, status)
VALUES ('$USER_ID', '$TENANT_ID', 'owner@local-contract.test', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO platform_boundary.product_entitlements
  (tenant_id, product_key, active, version, capabilities)
VALUES
  ('$TENANT_ID', 'HRMS', true, 1, '{"HRMS_ATTENDANCE":true,"HRMS_PAYROLL":true}')
ON CONFLICT (tenant_id, product_key) DO UPDATE
SET active = EXCLUDED.active,
    version = EXCLUDED.version,
    capabilities = EXCLUDED.capabilities,
    effective_at = now();
SQL

echo 'Projecting only the approved v1 Platform contract into HRMS...'
hrms_runtime <<SQL
INSERT INTO hrms_boundary.tenant_projections
  (tenant_id, tenant_slug, tenant_status, hrms_enabled, entitlement_version, source_event_id, contract_version, updated_at)
VALUES
  ('$TENANT_ID', 'local-contract-acme', 'ACTIVE', true, 1, '$EVENT_ID', '1.0', now())
ON CONFLICT (tenant_id) DO UPDATE
SET tenant_status = EXCLUDED.tenant_status,
    hrms_enabled = EXCLUDED.hrms_enabled,
    entitlement_version = EXCLUDED.entitlement_version,
    source_event_id = EXCLUDED.source_event_id,
    contract_version = EXCLUDED.contract_version,
    projected_at = now(),
    updated_at = now();

INSERT INTO hrms_boundary.employees (id, tenant_id, employee_code, display_name)
VALUES ('$EMPLOYEE_ID', '$TENANT_ID', 'LOCAL-001', 'Local Contract Employee')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

INSERT INTO hrms_boundary.attendance_logs
  (id, tenant_id, employee_id, attendance_date, status)
VALUES ('$ATTENDANCE_ID', '$TENANT_ID', '$EMPLOYEE_ID', DATE '2026-08-07', 'PRESENT')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

INSERT INTO hrms_boundary.payroll_runs
  (id, tenant_id, period, currency, status)
VALUES ('$PAYROLL_ID', '$TENANT_ID', '2026-08', 'OMR', 'DRAFT')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
SQL

platform_count="$(platform_runtime --tuples-only --no-align --command "SELECT count(*) FROM platform_boundary.tenants WHERE id = '$TENANT_ID'")"
assert_value "$platform_count" '1' 'Platform owns the tenant identity'

entitlement_count="$(platform_runtime --tuples-only --no-align --command "SELECT count(*) FROM platform_boundary.product_entitlements WHERE tenant_id = '$TENANT_ID' AND product_key = 'HRMS' AND active AND capabilities->>'HRMS_ATTENDANCE' = 'true' AND capabilities->>'HRMS_PAYROLL' = 'true'")"
assert_value "$entitlement_count" '1' 'Platform owns the effective HRMS entitlement'

projection_count="$(hrms_runtime --tuples-only --no-align --command "SELECT count(*) FROM hrms_boundary.tenant_projections WHERE tenant_id = '$TENANT_ID' AND contract_version = '1.0' AND hrms_enabled")"
assert_value "$projection_count" '1' 'HRMS stores the v1 tenant/entitlement projection'

attendance_count="$(hrms_runtime --tuples-only --no-align --command "SELECT count(*) FROM hrms_boundary.attendance_logs WHERE tenant_id = '$TENANT_ID' AND employee_id = '$EMPLOYEE_ID'")"
assert_value "$attendance_count" '1' 'Attendance data is tenant-scoped inside HRMS'

payroll_count="$(hrms_runtime --tuples-only --no-align --command "SELECT count(*) FROM hrms_boundary.payroll_runs WHERE tenant_id = '$TENANT_ID' AND currency = 'OMR'")"
assert_value "$payroll_count" '1' 'Payroll data is tenant-scoped inside HRMS'

platform_has_hrms="$(platform_owner --tuples-only --no-align --command "SELECT to_regclass('hrms_boundary.attendance_logs') IS NOT NULL")"
assert_value "$platform_has_hrms" 'f' 'Platform database has no HRMS attendance table'

hrms_has_platform="$(hrms_owner --tuples-only --no-align --command "SELECT to_regclass('platform_boundary.users') IS NOT NULL")"
assert_value "$hrms_has_platform" 'f' 'HRMS database has no Platform identity table'

if PGPASSWORD="$PLATFORM_RUNTIME_PASSWORD" psql --host hrms-db --username platform_runtime --dbname hrms_local --command 'SELECT 1' >/dev/null 2>&1; then
  echo 'FAIL: Platform runtime credential was accepted by HRMS' >&2
  exit 1
fi
echo 'PASS: HRMS rejects the Platform runtime credential'

if PGPASSWORD="$HRMS_RUNTIME_PASSWORD" psql --host platform-db --username hrms_runtime --dbname platform_local --command 'SELECT 1' >/dev/null 2>&1; then
  echo 'FAIL: HRMS runtime credential was accepted by Platform' >&2
  exit 1
fi
echo 'PASS: Platform rejects the HRMS runtime credential'

echo 'All local Platform/HRMS separation boundary checks passed.'
