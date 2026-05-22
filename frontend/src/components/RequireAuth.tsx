import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

export function RequireAuth() {
  const user = useAppSelector((s) => s.auth.user);
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const loc = useLocation();

  if (!user || !accessToken) {
    const loginPath = loc.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
