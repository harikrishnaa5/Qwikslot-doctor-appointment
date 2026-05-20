import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "../lib/toast";
import { dismissAppointmentScheduleNotice, fetchMyAppointments } from "../api/user";
import type { AppointmentRow } from "../api/types";
import { formatAppointmentStatus } from "../lib/appointmentStatus";
import { formatSlotLabel } from "../lib/dates";
import { Button, Card, PageHeader, Skeleton } from "../components/ui";

const ACTIVE_STATUSES = new Set(["WAITING", "IN_PROGRESS"]);

function AppointmentCard({
  appointment: a,
  showLiveQueue,
  onDismissNotice,
  dismissPending,
}: {
  appointment: AppointmentRow;
  showLiveQueue: boolean;
  onDismissNotice: (id: string) => void;
  dismissPending: boolean;
}) {
  return (
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
              disabled={dismissPending}
              onClick={() => onDismissNotice(a.id)}
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
        <p className="text-xs font-medium text-slate-500">{formatAppointmentStatus(a.status)}</p>
        {showLiveQueue && ACTIVE_STATUSES.has(a.status) ? (
          <Link
            className="mt-2 text-sm font-medium text-teal-700 dark:text-teal-400"
            to="/token"
            state={{ appointmentId: a.id, doctorId: a.doctorId }}
          >
            Live queue →
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

export function BookingsPage() {
  const qc = useQueryClient();
  const toastedIds = useRef(new Set<string>());
  const q = useQuery({
    queryKey: ["my-appointments"],
    queryFn: fetchMyAppointments,
    retry: 1,
  });

  const appointments = q.data?.appointments ?? [];

  const dismissNotice = useMutation({
    mutationFn: (id: string) => dismissAppointmentScheduleNotice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { upcoming, history } = useMemo(() => {
    const up = appointments
      .filter((a) => ACTIVE_STATUSES.has(a.status))
      .sort((x, y) => new Date(x.scheduledAt).getTime() - new Date(y.scheduledAt).getTime());
    const past = appointments
      .filter((a) => !ACTIVE_STATUSES.has(a.status))
      .sort((x, y) => new Date(y.scheduledAt).getTime() - new Date(x.scheduledAt).getTime());
    return { upcoming: up, history: past };
  }, [appointments]);

  useEffect(() => {
    if (q.isError) {
      toast.error(q.error instanceof Error ? q.error.message : "Could not load bookings");
    }
  }, [q.isError, q.error]);

  useEffect(() => {
    if (!appointments.length) return;
    for (const a of appointments) {
      if (a.scheduleNotice && !toastedIds.current.has(a.id)) {
        toastedIds.current.add(a.id);
        toast.warning("Schedule update: one of your visits may no longer match the clinic hours. See details below.", {
          duration: 10_000,
        });
      }
    }
  }, [appointments]);

  const dismissPending = dismissNotice.isPending;
  const total = appointments.length;
  const showSections = !q.isPending;

  return (
    <div>
      <PageHeader title="My bookings" />

      {!showSections && (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-28 w-full" />
            </li>
          ))}
        </ul>
      )}

      {showSections && (
        <div className="flex flex-col gap-8">
          {q.isError ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/40">
              <p className="text-sm text-amber-950 dark:text-amber-100">
                Could not load your bookings. Showing an empty list — try again or contact the clinic.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-9 px-3 text-xs"
                onClick={() => q.refetch()}
              >
                Retry
              </Button>
            </Card>
          ) : null}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Current & upcoming
            </h2>
            {upcoming.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {upcoming.map((a) => (
                  <li key={a.id}>
                    <AppointmentCard
                      appointment={a}
                      showLiveQueue
                      onDismissNotice={(id) => dismissNotice.mutate(id)}
                      dismissPending={dismissPending}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <p className="text-sm text-slate-600 dark:text-slate-400">No current booking.</p>
                {total === 0 ? (
                  <Link
                    className="mt-3 inline-block text-sm font-medium text-teal-700 dark:text-teal-400"
                    to="/browse"
                  >
                    Browse departments →
                  </Link>
                ) : null}
              </Card>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              History
            </h2>
            {history.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {history.map((a) => (
                  <li key={a.id}>
                    <AppointmentCard
                      appointment={a}
                      showLiveQueue={false}
                      onDismissNotice={(id) => dismissNotice.mutate(id)}
                      dismissPending={dismissPending}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <p className="text-sm text-slate-600 dark:text-slate-400">No history available.</p>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
