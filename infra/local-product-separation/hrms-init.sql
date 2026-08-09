CREATE ROLE hrms_runtime LOGIN PASSWORD 'local_hrms_runtime_only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE SCHEMA hrms_boundary AUTHORIZATION hrms_owner;

CREATE TABLE hrms_boundary.tenant_projections (
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

CREATE TABLE hrms_boundary.employees (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  employee_code text NOT NULL,
  display_name text NOT NULL,
  UNIQUE (tenant_id, employee_code)
);

CREATE TABLE hrms_boundary.attendance_logs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  employee_id uuid NOT NULL REFERENCES hrms_boundary.employees(id),
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEAVE')),
  UNIQUE (tenant_id, employee_id, attendance_date)
);

CREATE TABLE hrms_boundary.payroll_runs (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES hrms_boundary.tenant_projections(tenant_id),
  period text NOT NULL,
  currency char(3) NOT NULL,
  status text NOT NULL CHECK (status IN ('DRAFT', 'APPROVED', 'PAID')),
  UNIQUE (tenant_id, period)
);

GRANT CONNECT ON DATABASE hrms_local TO hrms_runtime;
GRANT USAGE ON SCHEMA hrms_boundary TO hrms_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA hrms_boundary TO hrms_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA hrms_boundary
  GRANT SELECT, INSERT, UPDATE ON TABLES TO hrms_runtime;
