\set ON_ERROR_STOP on

SELECT parent.relname AS parent_table, child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname IN (
  'attendance_events',
  'attendance_verification_logs',
  'field_location_pings'
)
ORDER BY parent.relname, child.relname;

SELECT 'expired_notifications' AS item, COUNT(*) AS pending_rows
FROM notifications WHERE "expiresAt" < NOW()
UNION ALL
SELECT 'expired_verification_tokens', COUNT(*)
FROM verification_tokens WHERE "expiresAt" < NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'expired_integrity_challenges', COUNT(*)
FROM device_integrity_challenges WHERE "expiresAt" < NOW() - INTERVAL '7 days'
UNION ALL
SELECT 'field_pings_over_90_days', COUNT(*)
FROM field_location_pings WHERE "capturedAt" < NOW() - INTERVAL '90 days';
