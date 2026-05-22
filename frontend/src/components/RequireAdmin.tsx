import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { ADMIN_HOME, isAdminRole } from "../lib/adminNav";
import { DOCTOR_HOME, isDoctorRole } from "../lib/doctorNav";

export function RequireAdmin() {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (isDoctorRole(role)) return <Navigate to={DOCTOR_HOME} replace />;
  if (!isAdminRole(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
