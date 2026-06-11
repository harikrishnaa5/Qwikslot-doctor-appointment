import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { CalendarDays, Home, LayoutGrid, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { ConfirmModal } from "./ui";
import { HeaderProfileMenu } from "./HeaderProfileMenu";
import { Logo } from "./Logo";
import type { User } from "../api/types";
import { ScrollToTopButton } from "./ScrollToTopButton";
import {
  ADMIN_HOME,
  getAdminMobileBottomItems,
  getAdminMobileMenuItems,
  getAdminNavItems,
  isAdminRole,
  type AdminNavItem,
} from "../lib/adminNav";
import { DOCTOR_HOME, DOCTOR_NAV_ITEMS, isDoctorRole, type DoctorNavItem } from "../lib/doctorNav";

type PatientNavItem = { to: string; label: string; icon: typeof Home; end?: boolean };

const patientItems: PatientNavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/browse", label: "Book now", icon: LayoutGrid },
  { to: "/bookings", label: "My bookings", icon: CalendarDays },
];

function NavItemLink({
  item,
  layout,
  onNavigate,
}: {
  item: AdminNavItem | PatientNavItem | DoctorNavItem;
  layout: "bottom" | "drawer";
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      end={"end" in item ? item.end : true}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          layout === "bottom" &&
            "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-medium md:flex-row md:gap-2 md:px-4 md:text-sm",
          layout === "drawer" &&
            "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-medium transition",
          isActive
            ? layout === "bottom"
              ? "text-teal-700 dark:text-teal-400"
              : "bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-100"
            : layout === "bottom"
              ? "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" aria-hidden />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function AppShell({
  children,
  onToggleTheme,
  themeMode,
  role,
  user,
  isAuthenticated,
  onLogout,
}: {
  children: ReactNode;
  onToggleTheme: () => void;
  themeMode: "light" | "dark";
  role: string | null;
  user: User | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  const loc = useLocation();
  const nav = useNavigate();
  const hideNav =
    loc.pathname === "/login" ||
    loc.pathname === "/register" ||
    loc.pathname === "/admin/login" ||
    loc.pathname === "/doctor/login";
  const adminView = isAdminRole(role);
  const doctorView = isDoctorRole(role);
  const logoTo = adminView ? ADMIN_HOME : doctorView ? DOCTOR_HOME : "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const adminDesktopItems = adminView ? getAdminNavItems(role) : [];
  const adminMobileMenuItems = adminView ? getAdminMobileMenuItems(role) : [];
  const adminMobileBottomItems = adminView ? getAdminMobileBottomItems(role) : [];

  useEffect(() => {
    setMenuOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const themeButton = (
    <button
      type="button"
      onClick={onToggleTheme}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300/90 bg-white text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800"
      aria-label="Toggle theme"
    >
      {themeMode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );

  const requestLogout = () => {
    setMenuOpen(false);
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    onLogout();
    nav(isAdminRole(role) ? "/admin/login" : isDoctorRole(role) ? "/doctor/login" : "/login");
  };

  const logoutButton = (
    <button
      type="button"
      onClick={requestLogout}
      className="min-h-11 rounded-xl border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800 dark:hover:text-teal-100"
    >
      Log out
    </button>
  );

  const signInLink = (
    <Link
      to="/login"
      className="flex min-h-11 items-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-700 hover:shadow-lg dark:bg-teal-500 dark:shadow-teal-950/40 dark:hover:bg-teal-400"
    >
      Sign in
    </Link>
  );

  const desktopHeaderActions = (
    <div className="ml-auto flex shrink-0 items-center">
      {isAuthenticated && user ? (
        <HeaderProfileMenu
          user={user}
          themeMode={themeMode}
          onToggleTheme={onToggleTheme}
          onLogout={requestLogout}
        />
      ) : (
        signInLink
      )}
    </div>
  );

  const primaryNavDesktop = !hideNav ? (
    <nav className="hidden pt-2 md:block" aria-label="Primary">
      <ul className="flex flex-wrap justify-start gap-2">
        {adminView ? (
          adminDesktopItems.map((item) => (
            <li key={`desktop-${item.to}`} className="flex-none">
              <NavItemLink item={item} layout="bottom" />
            </li>
          ))
        ) : doctorView ? (
          DOCTOR_NAV_ITEMS.map((item) => (
            <li key={`desktop-${item.to}`} className="flex-none">
              <NavItemLink item={item} layout="bottom" />
            </li>
          ))
        ) : (
          patientItems.map((item) => (
            <li key={item.to} className="flex-none">
              <NavItemLink item={item} layout="bottom" />
            </li>
          ))
        )}
      </ul>
    </nav>
  ) : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-24 sm:max-w-3xl md:max-w-5xl md:px-5 md:pb-8">
      <div className="sticky top-0 z-50 -mx-4 bg-white/95 px-4 pt-4 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 sm:-mx-5 sm:px-5 dark:bg-slate-950/95 dark:supports-[backdrop-filter]:bg-slate-950/90 md:-mx-5">
        <header className="relative mb-0 pb-3">
        {/* Mobile: theme (left) · logo (center) · menu or auth (right) */}
        <div className="flex min-h-11 items-center gap-2 md:hidden">
          {themeButton}
          <div className="flex min-w-0 flex-1 justify-center">
            <Logo size="md" className="min-w-0" to={logoTo} />
          </div>
          {adminView ? (
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300/90 bg-white text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : isAuthenticated ? (
            logoutButton
          ) : (
            signInLink
          )}
        </div>

        {/* md+: logo (left) · profile (right end) */}
        <div className="hidden min-h-11 w-full items-center gap-3 md:flex">
          <Logo size="md" className="min-w-0 shrink-0" to={logoTo} />
          {desktopHeaderActions}
        </div>


        {adminView && (
          <>
            <button
              type="button"
              aria-label="Close menu backdrop"
              className={clsx(
                "fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out md:hidden",
                menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              )}
              onClick={() => setMenuOpen(false)}
            />
            <aside
              id="admin-mobile-menu"
              className={clsx(
                "fixed inset-y-0 right-0 z-50 flex w-[min(100%,18rem)] flex-col border-l border-slate-200/90 bg-white shadow-2xl transition-transform duration-300 ease-out motion-reduce:transition-none md:hidden dark:border-slate-700 dark:bg-slate-900",
                menuOpen ? "translate-x-0" : "translate-x-full"
              )}
              aria-hidden={!menuOpen}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Menu</p>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Admin menu">
                {adminMobileMenuItems.map((item) => (
                  <NavItemLink
                    key={item.to}
                    item={item}
                    layout="drawer"
                    onNavigate={() => setMenuOpen(false)}
                  />
                ))}
              </nav>
              {isAuthenticated && (
                <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={requestLogout}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                    Log out
                  </button>
                </div>
              )}
            </aside>
          </>
        )}
        </header>
        {primaryNavDesktop}
      </div>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-2 sm:max-w-3xl">
            {adminView
              ? adminMobileBottomItems.map((item) => (
                  <li key={item.to} className="flex-1">
                    <NavItemLink item={item} layout="bottom" />
                  </li>
                ))
              : doctorView
                ? DOCTOR_NAV_ITEMS.map((item) => (
                    <li key={item.to} className="flex-1">
                      <NavItemLink item={item} layout="bottom" />
                    </li>
                  ))
                : patientItems.map((item) => (
                    <li key={item.to} className="flex-1">
                      <NavItemLink item={item} layout="bottom" />
                    </li>
                  ))}
          </ul>
        </nav>
      )}

      <main className="flex-1 pt-4">{children}</main>

      <ScrollToTopButton aboveBottomNav={!hideNav} />

      <ConfirmModal
        open={logoutConfirmOpen}
        variant="logout"
        icon={LogOut}
        title="Log out"
        description="Are you sure you want to log out?"
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
