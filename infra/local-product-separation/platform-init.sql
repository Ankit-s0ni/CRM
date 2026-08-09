CREATE ROLE platform_runtime LOGIN PASSWORD 'local_platform_runtime_only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE SCHEMA platform_boundary AUTHORIZATION platform_owner;

CREATE TABLE platform_boundary.tenants (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform_boundary.users (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES platform_boundary.tenants(id),
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  UNIQUE (tenant_id, email)
);

CREATE TABLE platform_boundary.product_entitlements (
  tenant_id uuid NOT NULL REFERENCES platform_boundary.tenants(id),
  product_key text NOT NULL CHECK (product_key IN ('HRMS', 'MAIL', 'POS')),
  active boolean NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  effective_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, product_key)
);

GRANT CONNECT ON DATABASE platform_local TO platform_runtime;
GRANT USAGE ON SCHEMA platform_boundary TO platform_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA platform_boundary TO platform_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA platform_boundary
  GRANT SELECT, INSERT, UPDATE ON TABLES TO platform_runtime;
