ALTER TABLE field_ping_receipts
  ADD COLUMN payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE field_ping_receipts
  ALTER COLUMN payload DROP DEFAULT;
