import type { AppointmentStatus, SessionStatus } from "@prisma/client";

export type QueueSnapshot = {
  sessionId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  session: {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    status: SessionStatus;
    tokenCounter: number;
    currentToken: number;
    currentTokenDisplay: string | null;
    avgMinutesPerPatient: number;
  };
  current: {
    token: string;
    tokenNumber: number;
    appointmentId: string | null;
  } | null;
  nextWaiting: {
    token: string;
    tokenNumber: number;
    appointmentId: string;
  } | null;
  remainingPatients: number;
  estimatedWaitMinutes: number;
  patient: {
    appointmentId: string;
    token: string;
    tokenNumber: number;
    status: AppointmentStatus;
    patientsAhead: number;
    estimatedWaitMinutes: number;
  } | null;
  appointments: {
    id: string;
    token: string;
    tokenNumber: number;
    status: AppointmentStatus;
    scheduledAt: string;
    patientName: string;
    checkedInAt: string | null;
  }[];
};
