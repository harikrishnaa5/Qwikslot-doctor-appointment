import { apiFetch } from "./client";
import type { Department, Doctor, Slot } from "./types";

export async function fetchDepartments() {
  const r = await apiFetch<{ departments: Department[] }>("/api/v1/departments", { token: null });
  return r.departments;
}

export async function fetchDoctors(departmentId?: string) {
  const q = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : "";
  const r = await apiFetch<{ doctors: Doctor[] }>(`/api/v1/doctors${q}`, { token: null });
  return r.doctors;
}

export async function fetchDoctor(id: string) {
  const r = await apiFetch<{ doctor: Doctor }>(`/api/v1/doctors/${id}`, { token: null });
  return r.doctor;
}

export async function fetchSlots(doctorId: string, date: string) {
  const r = await apiFetch<{ date: string; slots: Slot[] }>(
    `/api/v1/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`,
    { token: null }
  );
  return r.slots;
}

export async function fetchQueue(doctorId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<{
    doctorId: string;
    date: string;
    current: { token: string; appointmentId: string } | null;
    nextWaiting: { token: string; appointmentId: string } | null;
    appointments: {
      id: string;
      token: string;
      tokenNumber: number;
      status: string;
      scheduledAt: string;
      patientName: string;
    }[];
  }>(`/api/v1/doctors/${doctorId}/queue${q}`, { token: null });
}
