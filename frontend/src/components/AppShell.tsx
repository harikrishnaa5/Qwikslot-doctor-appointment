import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Moon, Sun, Home, LayoutGrid, CalendarDays, Shield } from "lucide-react";
import { Logo } from "./Logo";

type NavItem = { to: string; label: string; icon: typeof Home; end?: boolean; roles?: string[] };

const items: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/browse", label: "Care", icon: LayoutGrid },
  { to: "/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/admin", label: "Admin", icon: Shield, roles: ["ADMIN", "SUPER_ADMIN"] },
];

export function AppShell({
  children,
  onToggleTheme,
  themeMode,
  role,
  isAuthenticated,
  onLogout,
}: {
  children: ReactNode;
  onToggleTheme: () => void;
  themeMode: "light" | "dark";
  role: string | null;
  isAuthenticated: boolean;
  onLogout: () => void;
}) {
  const loc = useLocation();
  const nav = useNavigate();
  const hideNav = loc.pathname === "/login" || loc.pathname === "/register";

  const visible = items.filter((i) => !i.roles || (role && i.roles.includes(role)));

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-24 pt-4 sm:max-w-3xl md:max-w-5xl md:px-5 md:pb-8">
      <header className="mb-4 flex min-h-11 items-center justify-between gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/80">
        <Logo size="md" className="min-w-0 shrink" />
        <div className="flex shrink-0 items-center gap-2">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                onLogout();
                nav("/");
              }}
              className="min-h-11 rounded-xl border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/80 hover:text-teal-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800 dark:hover:text-teal-100"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className="flex min-h-11 items-center rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white shadow-md shadow-teal-900/20 transition hover:bg-teal-700 hover:shadow-lg dark:bg-teal-500 dark:shadow-teal-950/40 dark:hover:bg-teal-400"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300/90 bg-white text-slate-800 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {themeMode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 md:relative md:mb-5 md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-0"
          aria-label="Primary"
        >
          <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-2 sm:max-w-3xl md:mx-0 md:max-w-none md:justify-start md:gap-2 md:px-0">
            {visible.map((item) => (
              <li key={item.to} className="flex-1 md:flex-none">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    clsx(
                      "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-xs font-medium md:flex-row md:gap-2 md:px-4 md:text-sm",
                      isActive
                        ? "text-teal-700 dark:text-teal-400"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
