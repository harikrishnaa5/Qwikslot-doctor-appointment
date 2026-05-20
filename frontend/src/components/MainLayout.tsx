import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppShell } from "./AppShell";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleTheme } from "../store/slices/themeSlice";
import { clearCredentials } from "../store/slices/authSlice";
import { clearSelectedDoctorId } from "../lib/selectedDoctor";

const ADMIN_TAB_STORAGE_KEY = "admin_dashboard_tab";

export function MainLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const themeMode = useAppSelector((s) => s.theme.mode);
  const role = useAppSelector((s) => s.auth.user?.role ?? null);
  const isAuthenticated = useAppSelector((s) => Boolean(s.auth.user && s.auth.token));

  useEffect(() => {
    if (location.pathname !== "/doctors") {
      clearSelectedDoctorId();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) {
      window.localStorage.removeItem(ADMIN_TAB_STORAGE_KEY);
    }
  }, [location.pathname]);

  return (
    <AppShell
      themeMode={themeMode}
      role={role}
      isAuthenticated={isAuthenticated}
      onLogout={() => dispatch(clearCredentials())}
      onToggleTheme={() => {
        dispatch(toggleTheme());
      }}
    >
      <Outlet />
    </AppShell>
  );
}
