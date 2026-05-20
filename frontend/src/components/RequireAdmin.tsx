import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

export function RequireAdmin() {
  const role = useAppSelector((s) => s.auth.user?.role);
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
