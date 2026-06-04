-- CHECKED_IN replaces IN_PROGRESS (patient with doctor uses CHECKED_IN + session currentToken).
UPDATE "Appointment" SET "status" = 'CHECKED_IN' WHERE "status" = 'IN_PROGRESS';

CREATE TYPE "AppointmentStatus_new" AS ENUM (
  'BOOKED',
  'WAITING',
  'CHECKED_IN',
  'SKIPPED',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "Appointment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Appointment"
  ALTER COLUMN "status" TYPE "AppointmentStatus_new"
  USING ("status"::text::"AppointmentStatus_new");
DROP TYPE "AppointmentStatus";
ALTER TYPE "AppointmentStatus_new" RENAME TO "AppointmentStatus";
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'BOOKED';
