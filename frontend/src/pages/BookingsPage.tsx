import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { dismissAppointmentScheduleNotice, fetchMyAppointments } from "../api/user";
import { formatSlotLabel } from "../lib/dates";
import { Button, Card, PageHeader, Skeleton } from "../components/ui";

export function BookingsPage() {
  const qc = useQueryClient();
  const toastedIds = useRef(new Set<string>());
  const q = useQuery({ queryKey: ["my-appointments"], queryFn: fetchMyAppointments });

  const dismissNotice = useMutation({
    mutationFn: (id: string) => dismissAppointmentScheduleNotice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!q.data?.appointments) return;
    for (const a of q.data.appointments) {
      if (a.scheduleNotice && !toastedIds.current.has(a.id)) {
        toastedIds.current.add(a.id);
        toast.warning("Schedule update: one of your visits may no longer match the clinic hours. See details below.", {
          duration: 10_000,
        });
      }
    }
  }, [q.data]);

  return (
    <div>
      <PageHeader title="My bookings" />
      <ul className="flex flex-col gap-3">
        {q.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-28 w-full" />
            </li>
          ))}
        {q.data?.appointments.map((a) => (
          <li key={a.id}>
            <Card>
              <div className="flex flex-col gap-1">
                {a.scheduleNotice ? (
                  <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100">
                    <p className="font-semibold">Schedule notice</p>
                    <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">{a.scheduleNotice}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 h-9 self-start px-3 text-xs text-amber-900 dark:text-amber-100"
                      disabled={dismissNotice.isPending}
                      onClick={() => dismissNotice.mutate(a.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
                <p className="font-semibold text-slate-900 dark:text-slate-50">{a.doctorName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{formatSlotLabel(a.scheduledAt)}</p>
                <p className="text-sm text-slate-500">
                  Token <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{a.token}</span>
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {a.status.replaceAll("_", " ")}
                </p>
                <Link
                  className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-400"
                  to="/token"
                  state={{ appointmentId: a.id, doctorId: a.doctorId }}
                >
                  Live queue →
                </Link>
              </div>
            </Card>
          </li>
        ))}
        {q.data && q.data.appointments.length === 0 && (
          <Card>
            <p className="text-sm text-slate-600 dark:text-slate-400">No appointments yet.</p>
            <Link className="mt-3 inline-block text-sm font-medium text-teal-700 dark:text-teal-400" to="/">
              Browse departments
            </Link>
          </Card>
        )}
      </ul>
    </div>
  );
}
