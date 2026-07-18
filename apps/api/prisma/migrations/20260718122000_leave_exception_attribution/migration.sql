ALTER TABLE "attendance_exceptions"
  ADD COLUMN "leaveRequestId" UUID,
  ADD COLUMN "halfDayStart" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "halfDayEnd" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "attendance_exceptions_leaveRequestId_key"
  ON "attendance_exceptions" ("leaveRequestId")
  WHERE "leaveRequestId" IS NOT NULL;

ALTER TABLE "attendance_exceptions"
  ADD CONSTRAINT "attendance_exceptions_leaveRequestId_fkey"
  FOREIGN KEY ("leaveRequestId") REFERENCES "leave_requests"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
