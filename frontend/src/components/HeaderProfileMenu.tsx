import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronDown, History, LogOut, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { doctorGetMe } from "../api/doctor";
import type { User } from "../api/types";
import { adminPath, isAdminRole } from "../lib/adminNav";
import { DoctorAvatar } from "./DoctorAvatar";

export function HeaderProfileMenu({
  user,
  themeMode,
  onToggleTheme,
  onLogout,
}: {
  user: User;
  themeMode: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
}) {
  const doctorProfileQ = useQuery({
    queryKey: ["doctor-me", "header"],
    queryFn: doctorGetMe,
    enabled: user.role === "DOCTOR",
    staleTime: 5 * 60_000,
  });

  const imageUrl = user.role === "DOCTOR" ? (doctorProfileQ.data?.doctor.imageUrl ?? null) : null;
  const displayEmail = user.email?.trim() || null;

  return (
    <Menu as="div" className="relative">
      <MenuButton
        type="button"
        className="flex max-w-[min(100%,16rem)] items-center gap-2.5 rounded-lg px-1 py-1 text-left transition hover:opacity-80"
        aria-label="Account menu"
      >
        <DoctorAvatar name={user.name} imageUrl={imageUrl} size="xs" shape="circle" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
          {displayEmail ? (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{displayEmail}</p>
          ) : null}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      </MenuButton>

      <MenuItems
        anchor="bottom end"
        className={clsx(
          "z-[60] mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg outline-none",
          "dark:border-slate-700 dark:bg-slate-900",
          "transition duration-150 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        )}
      >
        <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
          {displayEmail ? (
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{displayEmail}</p>
          ) : null}
        </div>

        {isAdminRole(user.role) ? (
          <MenuItem>
            <Link
              to={adminPath("conhist")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 data-[focus]:bg-slate-100 dark:text-slate-200 dark:data-[focus]:bg-slate-800"
            >
              <History className="h-4 w-4 shrink-0" aria-hidden />
              Consultation history
            </Link>
          </MenuItem>
        ) : null}

        <MenuItem>
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 data-[focus]:bg-slate-100 dark:text-slate-200 dark:data-[focus]:bg-slate-800"
          >
            {themeMode === "dark" ? (
              <Sun className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Moon className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {themeMode === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </MenuItem>

        <MenuItem>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-700 data-[focus]:bg-red-50 dark:text-red-300 dark:data-[focus]:bg-red-950/40"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Log out
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
