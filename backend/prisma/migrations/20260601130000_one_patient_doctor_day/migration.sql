-- One non-cancelled appointment per patient per doctor per calendar day.
CREATE UNIQUE INDEX "Appointment_userId_doctorId_date_active_key"
ON "Appointment"("userId", "doctorId", "date")
WHERE "status" <> 'CANCELLED';
