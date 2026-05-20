import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { ADMIN_HOME, isAdminRole } from "../lib/adminNav";

/** Blocks admin users from patient-facing routes (home, care, bookings, etc.). */
export function RequirePatient() {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (isAdminRole(role)) {
    return <Navigate to={ADMIN_HOME} replace />;
  }
  return <Outlet />;
}
