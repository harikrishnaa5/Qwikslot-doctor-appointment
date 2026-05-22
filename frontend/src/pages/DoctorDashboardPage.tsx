import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { Card, Skeleton } from "../components/ui";
import { CalendarDatePicker } from "../components/date-time";
import { doctorGetMe, doctorListAppointments, doctorUpdateAppointmentStatus } from "../api/doctor";
import { localTodayStr } from "../lib/dates";
import { formatAppointmentStatus } from "../lib/appointmentStatus";
import type { AppointmentStatus } from "../api/types";
import { toast } from "../lib/toast";

const STATUS_OPTIONS: AppointmentStatus[] = [
  "WAITING",
  "CHECKED_IN",
  "IN_PROGRESS",
  "SKIPPED",
  "COMPLETED",
  "CANCELLED",
];

const APPT_MENU_WIDTH = 144;
const APPT_MENU_HEIGHT = 240;
const APPT_MENU_GAP = 6;

export function DoctorDashboardPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(localTodayStr);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const profileQ = useQuery({
    queryKey: ["doctor-me"],
    queryFn: doctorGetMe,
  });

  const apptQ = useQuery({
    queryKey: ["doctor-appointments", date],
    queryFn: () => doctorListAppointments(date),
  });

  const patchStatus = useMutation({
    mutationFn: (p: { id: string; status: AppointmentStatus }) =>
      doctorUpdateAppointmentStatus(p.id, p.status),
    onSuccess: () => {
      toast.success("Status updated");
      setActionOpenId(null);
      setMenuPos(null);
      qc.invalidateQueries({ queryKey: ["doctor-appointments", date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!actionOpenId) return;
    const close = () => {
      setActionOpenId(null);
      setMenuPos(null);
    };
    const onDocClick = () => close();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [actionOpenId]);

  const getMenuPos = (rect: DOMRect) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(minX, vw - APPT_MENU_WIDTH - 8);
    const maxY = Math.max(minY, vh - APPT_MENU_HEIGHT - 8);
    const preferredLeft = rect.right - APPT_MENU_WIDTH;
    const left = Math.min(maxX, Math.max(minX, preferredLeft));
    const canOpenAbove = rect.top >= APPT_MENU_HEIGHT + APPT_MENU_GAP + minY;
    const canOpenBelow = vh - rect.bottom >= APPT_MENU_HEIGHT + APPT_MENU_GAP + minY;
    let top: number;
    if (canOpenAbove) top = rect.top - APPT_MENU_HEIGHT - APPT_MENU_GAP;
    else if (canOpenBelow) top = rect.bottom + APPT_MENU_GAP;
    else top = Math.min(maxY, Math.max(minY, rect.bottom + APPT_MENU_GAP));
    return { top, left };
  };

  const doctor = profileQ.data?.doctor;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Appointments</h1>
        {doctor && (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {doctor.name}
            {doctor.department?.name ? ` · ${doctor.department.name}` : ""}
          </p>
        )}
      </div>

      <Card>
        <CalendarDatePicker
          label="Filter by date"
          value={date}
          onChange={(v) => v && setDate(v)}
          className="max-w-sm"
        />
      </Card>

      <Card className="overflow-visible p-0">
        {apptQ.isLoading ? (
          <Skeleton className="h-44 w-full rounded-none" />
        ) : (
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40">
                <tr>
                  <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Token</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Patient</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apptQ.data?.appointments.map((a, idx) => (
                  <tr key={a.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-800 dark:text-teal-300">{a.token}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(a.scheduledAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      <p>{a.patient.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{a.patient.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {formatAppointmentStatus(a.status)}
                      </span>
                    </td>
                    <td className="relative px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300/90 bg-white text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                          aria-label="Update status"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            if (actionOpenId === a.id) {
                              setActionOpenId(null);
                              setMenuPos(null);
                              return;
                            }
                            setActionOpenId(a.id);
                            setMenuPos(getMenuPos(rect));
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!apptQ.data?.appointments.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No patients scheduled for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {actionOpenId && menuPos && (
        <div
          className="fixed z-[999] max-h-[50vh] w-36 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map((s) => {
            const current = apptQ.data?.appointments.find((x) => x.id === actionOpenId)?.status;
            return (
              <button
                key={s}
                type="button"
                disabled={patchStatus.isPending || current === s}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-800 transition hover:bg-slate-100 disabled:opacity-50 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => patchStatus.mutate({ id: actionOpenId, status: s })}
              >
                <span>{formatAppointmentStatus(s)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
