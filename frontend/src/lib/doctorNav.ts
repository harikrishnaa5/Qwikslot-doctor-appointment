import type { LucideIcon } from "lucide-react";
import { CalendarDays, User } from "lucide-react";

export type DoctorNavItem = { to: string; label: string; icon: LucideIcon };

export const DOCTOR_APPOINTMENTS_PATH = "/doctor/appointments";
export const DOCTOR_PROFILE_PATH = "/doctor/profile";
export const DOCTOR_HOME = DOCTOR_APPOINTMENTS_PATH;

export const DOCTOR_NAV_ITEMS: DoctorNavItem[] = [
  { to: DOCTOR_APPOINTMENTS_PATH, label: "Appointments", icon: CalendarDays },
  { to: DOCTOR_PROFILE_PATH, label: "Profile", icon: User },
];

export function isDoctorRole(role: string | null | undefined): boolean {
  return role === "DOCTOR";
}
