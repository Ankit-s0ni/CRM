ALTER TABLE "outbox_events"
  ADD COLUMN "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lockedAt" TIMESTAMP(3),
  ADD COLUMN "lockedBy" TEXT,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "outbox_events_publishedAt_createdAt_idx";
CREATE INDEX "outbox_events_delivery_idx"
  ON "outbox_events" ("publishedAt", "deadLetteredAt", "availableAt", "createdAt");
