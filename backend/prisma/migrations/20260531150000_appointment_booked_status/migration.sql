-- Add BOOKED status (must be committed before use as column default).
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'BOOKED';
