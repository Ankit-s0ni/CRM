\set ON_ERROR_STOP on

DO $$
DECLARE
  parent_name text;
  ranged_count integer;
  default_count integer;
BEGIN
  FOREACH parent_name IN ARRAY ARRAY[
    'attendance_events',
    'attendance_verification_logs',
    'field_location_pings'
  ] LOOP
    IF to_regclass(parent_name) IS NULL THEN
      RAISE EXCEPTION 'Required partition parent % is missing', parent_name;
    END IF;

    SELECT
      COUNT(*) FILTER (WHERE pg_get_expr(child.relpartbound, child.oid) <> 'DEFAULT'),
      COUNT(*) FILTER (WHERE pg_get_expr(child.relpartbound, child.oid) = 'DEFAULT')
    INTO ranged_count, default_count
    FROM pg_inherits inheritance
    JOIN pg_class parent ON parent.oid = inheritance.inhparent
    JOIN pg_class child ON child.oid = inheritance.inhrelid
    WHERE parent.relname = parent_name;

    IF ranged_count < 3 OR default_count <> 1 THEN
      RAISE EXCEPTION
        '% requires at least three ranged partitions and exactly one default; found % and %',
        parent_name, ranged_count, default_count;
    END IF;
  END LOOP;
END $$;

BEGIN;

CREATE TEMP TABLE partition_boundary_probe (
  id integer GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL
) PARTITION BY RANGE (occurred_at);

CREATE TEMP TABLE partition_boundary_probe_2026_07
  PARTITION OF partition_boundary_probe
  FOR VALUES FROM ('2026-07-01T00:00:00Z') TO ('2026-08-01T00:00:00Z');
CREATE TEMP TABLE partition_boundary_probe_2026_08
  PARTITION OF partition_boundary_probe
  FOR VALUES FROM ('2026-08-01T00:00:00Z') TO ('2026-09-01T00:00:00Z');
CREATE TEMP TABLE partition_boundary_probe_default
  PARTITION OF partition_boundary_probe DEFAULT;

INSERT INTO partition_boundary_probe (occurred_at) VALUES
  ('2026-07-01T00:00:00Z'),
  ('2026-07-31T23:59:59.999999Z'),
  ('2026-08-01T00:00:00Z'),
  ('2026-08-31T23:59:59.999999Z'),
  ('2026-09-01T00:00:00Z');

DO $$
DECLARE
  july_count integer;
  august_count integer;
  fallback_count integer;
BEGIN
  SELECT COUNT(*) INTO july_count FROM partition_boundary_probe_2026_07;
  SELECT COUNT(*) INTO august_count FROM partition_boundary_probe_2026_08;
  SELECT COUNT(*) INTO fallback_count FROM partition_boundary_probe_default;

  IF july_count <> 2 OR august_count <> 2 OR fallback_count <> 1 THEN
    RAISE EXCEPTION
      'Partition boundary routing failed: july=%, august=%, default=%',
      july_count, august_count, fallback_count;
  END IF;
END $$;

ROLLBACK;

SELECT 'PASS' AS partition_catalog_and_boundary_result;
