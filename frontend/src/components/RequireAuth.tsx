import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

export function RequireAuth() {
  const user = useAppSelector((s) => s.auth.user);
  const token = useAppSelector((s) => s.auth.token);
  const loc = useLocation();

  if (!user || !token) {
    const loginPath = loc.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
