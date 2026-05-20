import { apiFetch } from "./client";
import type { AppointmentRow } from "./types";

export async function createMockIntent(doctorId: string, scheduledAt: string) {
  return apiFetch<{ paymentRef: string; provider: string }>("/api/v1/payments/mock/intent", {
    method: "POST",
    body: JSON.stringify({ doctorId, scheduledAt }),
  });
}

export async function bookAppointment(input: {
  doctorId: string;
  scheduledAt: string;
  paymentRef: string;
  notes?: string;
}) {
  return apiFetch<{ appointment: AppointmentRow & { tokenNumber: number } }>("/api/v1/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchMyAppointments() {
  return apiFetch<{
    appointments: AppointmentRow[];
    total: number;
    page: number;
    pageSize: number;
  }>("/api/v1/appointments/mine");
}

export async function fetchMyAppointment(id: string) {
  return apiFetch<{
    appointment: AppointmentRow & {
      tokenNumber: number;
      departmentName: string;
      notes: string | null;
      scheduleNotice?: string | null;
      createdAt: string;
    };
  }>(`/api/v1/appointments/mine/${id}`);
}

export async function dismissAppointmentScheduleNotice(id: string) {
  return apiFetch<{ ok: boolean }>(`/api/v1/appointments/mine/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ dismissScheduleNotice: true }),
  });
}
