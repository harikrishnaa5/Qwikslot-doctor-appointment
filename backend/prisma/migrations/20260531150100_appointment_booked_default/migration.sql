-- Default new appointments to BOOKED until consultation starts.
ALTER TABLE "Appointment" ALTER COLUMN "status" SET DEFAULT 'BOOKED';
