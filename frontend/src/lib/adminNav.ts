import type { LucideIcon } from "lucide-react";
import { DOCTOR_HOME } from "./doctorNav";
import { Building2, CalendarClock, ClipboardList, ListOrdered, Stethoscope, Shield, Users } from "lucide-react";

export type AdminTab = "dept" | "docs" | "avail" | "appt" | "queue" | "patients" | "staff";

export const ADMIN_SECTION_PATHS: Record<AdminTab, string> = {
  dept: "departments",
  docs: "doctors",
  avail: "availability",
  appt: "visits",
  queue: "queue",
  patients: "patients",
  staff: "staff",
};

const PATH_TO_TAB: Record<string, AdminTab> = Object.fromEntries(
  Object.entries(ADMIN_SECTION_PATHS).map(([tab, path]) => [path, tab as AdminTab])
);

export function adminPath(tab: AdminTab): string {
  return `/admin/${ADMIN_SECTION_PATHS[tab]}`;
}

export function tabFromSection(section: string | undefined): AdminTab | null {
  if (!section) return null;
  return PATH_TO_TAB[section] ?? null;
}

export function getAllowedAdminTabs(role: string | null | undefined): AdminTab[] {
  const tabs: AdminTab[] = ["dept", "docs", "avail", "appt", "queue"];
  if (role === "ADMIN" || role === "SUPER_ADMIN") tabs.push("patients");
  if (role === "SUPER_ADMIN") tabs.push("staff");
  return tabs;
}

export type AdminNavItem = {
  tab: AdminTab;
  to: string;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_META: Record<AdminTab, { label: string; icon: LucideIcon }> = {
  dept: { label: "Departments", icon: Building2 },
  docs: { label: "Doctors", icon: Stethoscope },
  avail: { label: "Availability", icon: CalendarClock },
  appt: { label: "Visits", icon: ClipboardList },
  queue: { label: "Queue", icon: ListOrdered },
  patients: { label: "Patients", icon: Users },
  staff: { label: "Admins", icon: Shield },
};

export function getAdminNavItems(role: string | null | undefined): AdminNavItem[] {
  return getAllowedAdminTabs(role).map((tab) => ({
    tab,
    to: adminPath(tab),
    label: ADMIN_NAV_META[tab].label,
    icon: ADMIN_NAV_META[tab].icon,
  }));
}

/** Mobile drawer (hamburger): departments, doctors, patients. */
export function getAdminMobileMenuTabs(role: string | null | undefined): AdminTab[] {
  const tabs: AdminTab[] = ["dept", "docs"];
  if (role === "ADMIN" || role === "SUPER_ADMIN") tabs.push("patients");
  return tabs;
}

/** Mobile bottom bar: availability, visits, queue (+ admins for super). */
export function getAdminMobileBottomTabs(role: string | null | undefined): AdminTab[] {
  const tabs: AdminTab[] = ["avail", "appt", "queue"];
  if (role === "SUPER_ADMIN") tabs.push("staff");
  return tabs;
}

export function getAdminMobileMenuItems(role: string | null | undefined): AdminNavItem[] {
  return getAdminMobileMenuTabs(role).map((tab) => ({
    tab,
    to: adminPath(tab),
    label: ADMIN_NAV_META[tab].label,
    icon: ADMIN_NAV_META[tab].icon,
  }));
}

export function getAdminMobileBottomItems(role: string | null | undefined): AdminNavItem[] {
  return getAdminMobileBottomTabs(role).map((tab) => ({
    tab,
    to: adminPath(tab),
    label: ADMIN_NAV_META[tab].label,
    icon: ADMIN_NAV_META[tab].icon,
  }));
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export const ADMIN_HOME = adminPath("dept");

export function adminLoginRedirect(role: string | undefined, from?: string): string {
  if (isAdminRole(role)) return ADMIN_HOME;
  if (role === "DOCTOR") return DOCTOR_HOME;
  return from ?? "/";
}
