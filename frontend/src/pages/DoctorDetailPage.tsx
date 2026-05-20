import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { fetchDoctor, fetchSlots } from "../api/public";
import { localTodayStr, formatSlotLabel } from "../lib/dates";
import { Card, Button, Skeleton } from "../components/ui";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { useAppSelector } from "../store/hooks";
import { CalendarDatePicker } from "../components/date-time";
import { getSelectedDoctorId } from "../lib/selectedDoctor";

export function DoctorDetailPage() {
  const doctorId = getSelectedDoctorId();
  const today = localTodayStr();
  const [date, setDate] = useState<string | null>(today);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const nav = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const docQ = useQuery({
    queryKey: ["doctor", doctorId],
    queryFn: () => fetchDoctor(doctorId!),
    enabled: Boolean(doctorId),
  });

  const slotsQ = useQuery({
    queryKey: ["slots", doctorId, date],
    queryFn: () => fetchSlots(doctorId!, date!),
    enabled: Boolean(doctorId && date),
  });

  const visibleSlots = useMemo(() => {
    if (!slotsQ.data) return [];
    const nowMs = Date.now();
    return slotsQ.data.filter((s) => new Date(s.start).getTime() > nowMs);
  }, [slotsQ.data]);

  useEffect(() => {
    if (!selectedStart) return;
    if (!visibleSlots.some((s) => s.start === selectedStart)) {
      setSelectedStart(null);
    }
  }, [visibleSlots, selectedStart]);

  const doctorName = docQ.data?.name;

  if (!doctorId) {
    return (
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-300">Select a doctor from a department to view availability.</p>
      </Card>
    );
  }

  return (
    <div className="pb-4">
      {docQ.isLoading && <Skeleton className="mb-4 h-24 w-full rounded-2xl" />}
      {docQ.data && (
        <div className="mb-6 flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
          <DoctorAvatar name={docQ.data.name} imageUrl={docQ.data.imageUrl} size="lg" className="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{docQ.data.name}</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {docQ.data.department.name}
              {docQ.data.specialization ? ` · ${docQ.data.specialization}` : ""}
            </p>
            {docQ.data.experience && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{docQ.data.experience}</p>
            )}
            {docQ.data.qualification && (
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {docQ.data.qualification}
              </p>
            )}
          </div>
        </div>
      )}

      <CalendarDatePicker
        label="Date"
        value={date}
        minDateIso={today}
        onChange={(next) => {
          setDate(next);
          setSelectedStart(null);
        }}
        className="mb-3"
      />

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Available slots
      </h2>
      {slotsQ.isLoading && <Skeleton className="h-40 w-full" />}
      {!date && <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Choose a date to view available slots.</p>}
      <ul className="mb-24 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleSlots.map((s) => {
          const active = selectedStart === s.start;
          return (
            <li key={s.start}>
              <button
                type="button"
                onClick={() => {
                  if (new Date(s.start).getTime() <= Date.now()) {
                    toast.error("This time has already passed. Choose a later slot.");
                    return;
                  }
                  setSelectedStart(s.start);
                }}
                className={`flex min-h-11 w-full items-center justify-center rounded-xl border px-2 py-2 text-sm font-semibold transition shadow-sm ${
                  active
                    ? "border-teal-600 bg-teal-50 text-teal-900 shadow-md shadow-teal-900/10 ring-2 ring-teal-500/30 dark:border-teal-500 dark:bg-teal-950/55 dark:text-teal-100 dark:shadow-teal-950/30 dark:ring-teal-400/25"
                    : "border-slate-200/90 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700"
                }`}
              >
                {formatSlotLabel(s.start)}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="fixed bottom-[4.5rem] left-0 right-0 z-30 px-4 pb-[env(safe-area-inset-bottom)] md:static md:px-0 md:pb-0">
        <Button
          className="w-full shadow-lg md:max-w-xs"
          disabled={!selectedStart || !doctorId}
          onClick={() => {
            if (!selectedStart || !doctorId) return;
            if (!user) {
              nav("/login", { state: { from: "/doctors" } });
              return;
            }
            nav("/booking/confirm", {
              state: { doctorId, scheduledAt: selectedStart, doctorName },
            });
          }}
        >
          {user ? "Continue to payment" : "Sign in to book"}
        </Button>
      </div>
    </div>
  );
}
