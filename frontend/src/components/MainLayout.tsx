import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme } from "../store/slices/themeSlice";
import { logoutRequest } from "../api/auth";
import { getStoredRefreshToken } from "../api/client";
import { clearCredentials } from "../store/slices/authSlice";
import { clearSelectedDoctorId } from "../lib/selectedDoctor";

export function MainLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role ?? null;
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.user && s.auth.accessToken));

  useEffect(() => {
    if (location.pathname !== "/doctors") {
      clearSelectedDoctorId();
    }
  }, [location.pathname]);

  return (
    <AppShell
      themeMode={themeMode}
      role={role}
      user={user}
      isAuthenticated={isAuthenticated}
      onLogout={() => {
        const refresh = getStoredRefreshToken();
        if (refresh) void logoutRequest(refresh).catch(() => undefined);
        dispatch(clearCredentials());
      }}
      onToggleTheme={() => {
        dispatch(toggleTheme());
      }}
    >
      <Outlet />
    </AppShell>
  );
}
