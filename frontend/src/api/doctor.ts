import { apiFetch } from "./client";
import type { AppointmentStatus } from "./types";

export type DoctorProfile = {
  id: string;
  name: string;
  specialization: string | null;
  experience: string | null;
  qualification: string | null;
  imageUrl: string | null;
  department: { id: string; name: string };
  email: string | null;
};

export type DoctorAppointmentRow = {
  id: string;
  patient: { id: string; name: string; email: string };
  scheduledAt: string;
  status: AppointmentStatus;
  token: string;
};

export async function doctorGetMe() {
  return apiFetch<{ doctor: DoctorProfile }>("/api/v1/doctor/me");
}

export async function doctorListAppointments(date: string) {
  const params = new URLSearchParams({ date });
  return apiFetch<{ date: string; appointments: DoctorAppointmentRow[] }>(
    `/api/v1/doctor/appointments?${params.toString()}`
  );
}

export async function doctorUpdateAppointmentStatus(id: string, status: AppointmentStatus) {
  return apiFetch<{ appointment: { id: string; status: AppointmentStatus; token: string } }>(
    `/api/v1/doctor/appointments/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

export async function doctorUpdateProfile(body: {
  name?: string;
  specialization?: string;
  experience?: string;
  qualification?: string;
  imageUrl?: string;
  email?: string;
  password?: string;
}) {
  return apiFetch<{ doctor: DoctorProfile }>("/api/v1/doctor/profile", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function doctorUploadPhoto(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<{ imageUrl: string }>("/api/v1/doctor/uploads/photo", {
    method: "POST",
    body,
  });
}
