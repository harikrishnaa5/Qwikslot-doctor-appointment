import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "../lib/toast";
import { dismissAppointmentScheduleNotice, fetchMyAppointments } from "../api/user";
import type { AppointmentRow } from "../api/types";
import { formatAppointmentStatus } from "../lib/appointmentStatus";
import { formatSlotLabel } from "../lib/dates";
import { Button, Card, PageHeader, Skeleton, TablePagination } from "../components/ui";

const HISTORY_PAGE_SIZE = 10;

const ACTIVE_STATUSES = new Set(["WAITING", "IN_PROGRESS"]);

function formatHistoryWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function historyStatusClass(status: string) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (status === "CANCELLED") return "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300";
  if (status === "SKIPPED") return "bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function BookingHistoryTable({
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onDismissNotice,
  dismissPending,
}: {
  rows: AppointmentRow[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onDismissNotice: (id: string) => void;
  dismissPending: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-slate-200/80 bg-slate-50/80 text-left dark:border-slate-800 dark:bg-slate-800/40">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Doctor
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Date & time
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Token
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <Fragment key={a.id}>
                {a.scheduleNotice ? (
                  <tr className="border-b border-slate-100 bg-amber-50/80 dark:border-slate-800/80 dark:bg-amber-950/30">
                    <td colSpan={4} className="px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                        Schedule notice
                      </p>
                      <p className="mt-1 text-sm text-amber-950/90 dark:text-amber-100/90">{a.scheduleNotice}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 h-9 self-start px-3 text-xs text-amber-900 dark:text-amber-100"
                        disabled={dismissPending}
                        onClick={() => onDismissNotice(a.id)}
                      >
                        Dismiss
                      </Button>
                    </td>
                  </tr>
                ) : null}
                <tr className="border-b border-slate-100 last:border-b-0 dark:border-slate-800/80">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-50">{a.doctorName}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400">{formatHistoryWhen(a.scheduledAt)}</td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-sm font-medium text-slate-800 dark:text-slate-200">{a.token}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${historyStatusClass(a.status)}`}
                    >
                      {formatAppointmentStatus(a.status)}
                    </span>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </Card>
  );
}

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
  const [historyPage, setHistoryPage] = useState(1);

  const upcomingQ = useQuery({
    queryKey: ["my-appointments", "active"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", pageSize: "50", scope: "active" });
      return fetchMyAppointments(p);
    },
    retry: 1,
  });

  const historyQ = useQuery({
    queryKey: ["my-appointments", "history", historyPage],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(historyPage),
        pageSize: String(HISTORY_PAGE_SIZE),
        scope: "history",
      });
      return fetchMyAppointments(p);
    },
    retry: 1,
  });

  const upcoming = useMemo(
    () =>
      [...(upcomingQ.data?.appointments ?? [])].sort(
        (x, y) => new Date(x.scheduledAt).getTime() - new Date(y.scheduledAt).getTime()
      ),
    [upcomingQ.data?.appointments]
  );
  const history = historyQ.data?.appointments ?? [];

  const dismissNotice = useMutation({
    mutationFn: (id: string) => dismissAppointmentScheduleNotice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (upcomingQ.isError) {
      toast.error(upcomingQ.error instanceof Error ? upcomingQ.error.message : "Could not load bookings");
    }
  }, [upcomingQ.isError, upcomingQ.error]);

  useEffect(() => {
    if (historyQ.isError) {
      toast.error(historyQ.error instanceof Error ? historyQ.error.message : "Could not load booking history");
    }
  }, [historyQ.isError, historyQ.error]);

  useEffect(() => {
    if (!upcoming.length) return;
    for (const a of upcoming) {
      if (a.scheduleNotice && !toastedIds.current.has(a.id)) {
        toastedIds.current.add(a.id);
        toast.warning("Schedule update: one of your visits may no longer match the clinic hours. See details below.", {
          duration: 10_000,
        });
      }
    }
  }, [upcoming]);

  const dismissPending = dismissNotice.isPending;
  const historyTotal = historyQ.data?.total ?? 0;
  const showSections = !upcomingQ.isPending && !historyQ.isPending;
  const loadError = upcomingQ.isError || historyQ.isError;

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
          {loadError ? (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/80 dark:bg-amber-950/40">
              <p className="text-sm text-amber-950 dark:text-amber-100">
                Could not load your bookings. Showing an empty list — try again or contact the clinic.
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-9 px-3 text-xs"
                onClick={() => {
                  upcomingQ.refetch();
                  historyQ.refetch();
                }}
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
                {upcoming.length === 0 && historyTotal === 0 ? (
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
            {historyTotal > 0 || historyQ.isLoading ? (
              history.length > 0 && historyQ.data ? (
                <BookingHistoryTable
                  rows={history}
                  page={historyPage}
                  pageSize={historyQ.data.pageSize}
                  total={historyQ.data.total}
                  onPageChange={setHistoryPage}
                  onDismissNotice={(id) => dismissNotice.mutate(id)}
                  dismissPending={dismissPending}
                />
              ) : historyQ.isLoading ? (
                <Skeleton className="h-36 w-full rounded-2xl" />
              ) : null
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
