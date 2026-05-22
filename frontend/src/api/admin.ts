import { apiFetch } from "./client";

export type AdminDepartment = {
  id: string;
  name: string;
  description: string | null;
  _count?: { doctors: number };
};

export type AdminDoctor = {
  id: string;
  name: string;
  departmentId: string;
  specialization: string | null;
  experience: string | null;
  qualification: string | null;
  imageUrl: string | null;
  active: boolean;
  department: { id: string; name: string };
  user?: { id: string; email: string } | null;
};

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
};

export async function adminListDepartments(params: URLSearchParams) {
  return apiFetch<{ departments: AdminDepartment[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/departments?${params.toString()}`
  );
}

export async function adminCreateDepartment(body: { name: string; description?: string }) {
  return apiFetch<{ department: AdminDepartment }>("/api/v1/admin/departments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminUpdateDepartment(id: string, body: { name?: string; description?: string }) {
  return apiFetch<{ department: AdminDepartment }>(`/api/v1/admin/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function adminDeleteDepartment(id: string) {
  return apiFetch<void>(`/api/v1/admin/departments/${id}`, { method: "DELETE" });
}

export async function adminListDoctors(params: URLSearchParams) {
  return apiFetch<{ doctors: AdminDoctor[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/doctors?${params.toString()}`
  );
}

export async function adminUploadDoctorPhoto(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<{ imageUrl: string }>("/api/v1/admin/uploads/doctor-photo", {
    method: "POST",
    body,
  });
}

export async function adminCreateDoctor(body: {
  departmentId: string;
  name: string;
  email: string;
  password: string;
  specialization?: string;
  experience?: string;
  qualification?: string;
  imageUrl?: string;
}) {
  return apiFetch<{ doctor: AdminDoctor }>("/api/v1/admin/doctors", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminUpdateDoctor(
  id: string,
  body: Partial<{
    departmentId: string;
    name: string;
    email: string;
    password: string;
    specialization: string;
    experience: string;
    qualification: string;
    imageUrl: string;
    active: boolean;
  }>
) {
  return apiFetch<{ doctor: AdminDoctor }>(`/api/v1/admin/doctors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function adminDeleteDoctor(id: string) {
  return apiFetch<{ doctor: AdminDoctor }>(`/api/v1/admin/doctors/${id}`, { method: "DELETE" });
}

export async function adminListRegisteredUsers(params: URLSearchParams) {
  return apiFetch<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/users?${params.toString()}`
  );
}

export type AdminAvailabilityRow = {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

export async function adminSetAvailability(body: {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return apiFetch<{ availability: unknown }>("/api/v1/admin/availability", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function adminPatchAvailability(
  id: string,
  body: { startTime?: string; endTime?: string }
) {
  return apiFetch<{ availability: AdminAvailabilityRow }>(
    `/api/v1/admin/availability/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function adminDeleteAvailability(id: string) {
  return apiFetch<void>(`/api/v1/admin/availability/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function adminListDoctorAvailabilities(doctorId: string, params: URLSearchParams) {
  return apiFetch<{ availabilities: AdminAvailabilityRow[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/doctors/${encodeURIComponent(doctorId)}/availability?${params.toString()}`
  );
}

export async function adminListAppointments(params: URLSearchParams) {
  return apiFetch<{
    appointments: {
      id: string;
      doctorId: string;
      doctorName: string;
      departmentId: string;
      departmentName: string;
      patient: { name: string; email: string };
      scheduledAt: string;
      status: string;
      token: string;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/api/v1/admin/appointments?${params.toString()}`);
}

export async function adminPatchAppointmentStatus(id: string, status: string) {
  return apiFetch<{ appointment: unknown }>(`/api/v1/admin/appointments/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function adminAdvanceQueue(doctorId: string, date?: string) {
  const q = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiFetch<{ advanced: boolean; token?: string; message?: string }>(
    `/api/v1/admin/doctors/${doctorId}/queue/next${q}`,
    { method: "POST" }
  );
}

export async function superListAdmins(params: URLSearchParams) {
  return apiFetch<{ users: AdminUserRow[]; total: number; page: number; pageSize: number }>(
    `/api/v1/admin/super/admins?${params.toString()}`
  );
}

export async function superCreateUser(body: {
  email: string;
  password: string;
  name: string;
  role: "ADMIN" | "USER";
}) {
  return apiFetch<{ user: AdminUserRow }>("/api/v1/admin/super/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function superPatchUser(id: string, body: { name?: string; role?: string }) {
  return apiFetch<{ user: AdminUserRow }>(`/api/v1/admin/super/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function superDeleteUser(id: string) {
  return apiFetch<void>(`/api/v1/admin/super/users/${id}`, { method: "DELETE" });
}
