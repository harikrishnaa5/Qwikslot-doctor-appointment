import type { AppointmentStatus, SessionStatus } from "@prisma/client";
import type { SessionPhase } from "../../lib/session-window.js";

export type QueueSnapshot = {
  sessionId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  /** False until consultation starts (BOOKED patients are not in the live queue yet). */
  queueStarted: boolean;
  /** Where the current time sits relative to this session's availability window. */
  sessionPhase: SessionPhase;
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
  appointments: QueueAppointmentRow[];
  /** All non-cancelled session appointments (includes BOOKED before queue opens). */
  sessionAppointments: QueueAppointmentRow[];
};

export type QueueAppointmentRow = {
  id: string;
  token: string;
  tokenNumber: number;
  status: AppointmentStatus;
  scheduledAt: string;
  createdAt: string;
  patientName: string;
  checkedInAt: string | null;
};
