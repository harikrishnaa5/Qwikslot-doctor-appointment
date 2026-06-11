import { apiFetch } from "./client";
import type { Department, Doctor, Slot } from "./types";
import { fetchDoctorQueue, type QueueSnapshot } from "./queue";

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
    `/api/v1/doctors/${doctorId}/slots?date=${encodeURIComponent(date)}`
  );
  return r.slots;
}

/** @deprecated Prefer fetchDoctorQueue from ./queue */
export async function fetchQueue(doctorId: string, date?: string): Promise<QueueSnapshot> {
  return fetchDoctorQueue(doctorId, { date });
}

export type { QueueSnapshot };
