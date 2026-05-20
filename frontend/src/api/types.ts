export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
};

export type Department = { id: string; name: string; description: string | null };

export type Doctor = {
  id: string;
  name: string;
  specialization: string | null;
  experience?: string | null;
  qualification?: string | null;
  imageUrl?: string | null;
  department: { id: string; name: string };
};

export type Slot = { start: string; end: string };

export type AppointmentRow = {
  id: string;
  doctorId: string;
  doctorName: string;
  sessionId?: string;
  sessionLabel?: string;
  scheduledAt: string;
  status: string;
  token: string;
  scheduleNotice?: string | null;
  session?: { id: string; label: string; startTime: string; endTime: string };
};
