import { apiFetch } from "./client";

export type QueueSnapshot = {
  sessionId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  queueStarted: boolean;
  sessionPhase?: "before_day" | "before_start" | "active" | "after_end";
  session: {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    status: string;
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
    status: string;
    patientsAhead: number;
    estimatedWaitMinutes: number;
  } | null;
  appointments: QueueAppointmentRow[];
  sessionAppointments: QueueAppointmentRow[];
};

export type QueueAppointmentRow = {
  id: string;
  token: string;
  tokenNumber: number;
  status: string;
  scheduledAt: string;
  createdAt: string;
  patientName: string;
  checkedInAt: string | null;
};

export type DoctorSessionRow = {
  id: string;
  doctorId: string;
  date: string;
  label: string;
  startTime: string;
  endTime: string;
  status: string;
  tokenCounter: number;
  currentToken: number;
  avgMinutesPerPatient: number;
  appointmentCount: number;
  openedAt: string | null;
  closedAt: string | null;
};

export async function fetchSessionQueue(sessionId: string, appointmentId?: string) {
  const q = appointmentId ? `?appointmentId=${encodeURIComponent(appointmentId)}` : "";
  const r = await apiFetch<{ queue: QueueSnapshot }>(`/api/v1/queue/sessions/${sessionId}${q}`, {
    token: null,
  });
  return r.queue;
}

export async function fetchDoctorQueue(
  doctorId: string,
  opts?: { date?: string; sessionId?: string; appointmentId?: string }
) {
  const params = new URLSearchParams();
  if (opts?.date) params.set("date", opts.date);
  if (opts?.sessionId) params.set("sessionId", opts.sessionId);
  if (opts?.appointmentId) params.set("appointmentId", opts.appointmentId);
  const q = params.toString() ? `?${params}` : "";
  const r = await apiFetch<{ queue: QueueSnapshot }>(`/api/v1/doctors/${doctorId}/queue${q}`, {
    token: null,
  });
  return r.queue;
}

export async function adminListSessions(doctorId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<{ sessions: DoctorSessionRow[] }>(
    `/api/v1/admin/doctors/${doctorId}/sessions${q}`
  );
}

export async function adminStartConsultation(sessionId: string) {
  return apiFetch<{ session: DoctorSessionRow }>(
    `/api/v1/admin/sessions/${sessionId}/start`,
    { method: "POST" }
  );
}

export async function adminSessionNext(sessionId: string) {
  return apiFetch<{ advanced: boolean; token?: string; message?: string }>(
    `/api/v1/admin/sessions/${sessionId}/next`,
    { method: "POST" }
  );
}

export async function adminSessionSkip(sessionId: string, appointmentId?: string) {
  return apiFetch<{ appointment: { id: string; status: string; token: string } }>(
    `/api/v1/admin/sessions/${sessionId}/skip`,
    {
      method: "POST",
      body: JSON.stringify(appointmentId ? { appointmentId } : {}),
    }
  );
}

export async function adminAppointmentCheckIn(appointmentId: string) {
  return apiFetch<{ appointment: unknown }>(
    `/api/v1/admin/appointments/${appointmentId}/check-in`,
    { method: "POST" }
  );
}

export async function adminAppointmentComplete(appointmentId: string) {
  return apiFetch<{ appointment: unknown }>(
    `/api/v1/admin/appointments/${appointmentId}/complete`,
    { method: "POST" }
  );
}
