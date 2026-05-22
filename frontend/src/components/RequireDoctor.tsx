import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { DOCTOR_HOME, isDoctorRole } from "../lib/doctorNav";
import { ADMIN_HOME, isAdminRole } from "../lib/adminNav";

export function RequireDoctor() {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (isAdminRole(role)) return <Navigate to={ADMIN_HOME} replace />;
  if (!isDoctorRole(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
