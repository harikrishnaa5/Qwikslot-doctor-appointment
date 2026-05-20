import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "../lib/toast";
import { dismissAppointmentScheduleNotice, fetchMyAppointment } from "../api/user";
import { fetchDoctorQueue, type QueueSnapshot } from "../api/queue";
import { Button, Card, PageHeader, Skeleton } from "../components/ui";
import { formatAppointmentStatus } from "../lib/appointmentStatus";
import { localTodayStr } from "../lib/dates";

function wsUrl() {
  const p = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${p}//${window.location.host}/ws`;
}

export function TokenLivePage() {
  const loc = useLocation() as { state?: { appointmentId?: string; doctorId?: string } };
  const appointmentId = loc.state?.appointmentId;
  const doctorId = loc.state?.doctorId;
  const qc = useQueryClient();
  const [live, setLive] = useState<QueueSnapshot | null>(null);

  const apptQ = useQuery({
    queryKey: ["my-appointment", appointmentId],
    queryFn: () => fetchMyAppointment(appointmentId!),
    enabled: Boolean(appointmentId),
  });

  const sessionId = apptQ.data?.appointment.sessionId;

  const dismissNotice = useMutation({
    mutationFn: () => dismissAppointmentScheduleNotice(appointmentId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointment", appointmentId] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dateStr = useMemo(() => {
    const iso = apptQ.data?.appointment.scheduledAt;
    if (!iso) return localTodayStr();
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [apptQ.data?.appointment.scheduledAt]);

  const queueQ = useQuery({
    queryKey: ["queue", doctorId, sessionId, dateStr, appointmentId],
    queryFn: () =>
      fetchDoctorQueue(doctorId!, {
        date: dateStr,
        sessionId: sessionId ?? undefined,
        appointmentId: appointmentId ?? undefined,
      }),
    enabled: Boolean(doctorId) && (Boolean(sessionId) || apptQ.isSuccess),
  });

  useEffect(() => {
    setLive(queueQ.data ?? null);
  }, [queueQ.data]);

  useEffect(() => {
    const sid = sessionId ?? live?.sessionId;
    if (!sid) return;

    const ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", sessionId: sid }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          event?: string;
          payload?: QueueSnapshot;
        };
        if (msg.event === "queue_updated" && msg.payload) {
          setLive(msg.payload);
          qc.invalidateQueries({ queryKey: ["queue", doctorId, sid] });
        }
        if (msg.event === "current_token_changed" && live) {
          qc.invalidateQueries({ queryKey: ["queue", doctorId, sid] });
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [sessionId, live?.sessionId, doctorId, qc]);

  const snapshot = live ?? queueQ.data ?? null;
  const myStatus = apptQ.data?.appointment.status;
  const myToken = apptQ.data?.appointment.token;

  const isCompleted = myStatus === "COMPLETED";
  const doctorName = apptQ.data?.appointment.doctorName;

  const isYourTurn = useMemo(() => {
    if (isCompleted) return false;
    if (myStatus === "IN_PROGRESS") return true;
    if (snapshot?.current?.appointmentId === appointmentId) return true;
    if (
      myToken &&
      snapshot?.current?.token === myToken &&
      snapshot.current.appointmentId != null
    ) {
      return true;
    }
    const mine = snapshot?.appointments.find((a) => a.id === appointmentId);
    return mine?.status === "IN_PROGRESS";
  }, [isCompleted, myStatus, myToken, appointmentId, snapshot]);

  if (!appointmentId || !doctorId) {
    return (
      <div>
        <PageHeader title="Live token" />
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-400">Open this screen from a booking.</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Live queue" />
      {apptQ.isLoading && <Skeleton className="mb-4 h-24 w-full" />}
      {apptQ.data && (
        <Card className="mb-4">
          {apptQ.data.appointment.scheduleNotice ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Schedule notice</p>
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
                {apptQ.data.appointment.scheduleNotice}
              </p>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-9 px-3 text-xs text-amber-900 dark:text-amber-100"
                disabled={dismissNotice.isPending}
                onClick={() => dismissNotice.mutate()}
              >
                Dismiss
              </Button>
            </div>
          ) : null}
          <p className="text-xs font-medium uppercase text-slate-500">Your token</p>
          <p className="font-mono text-xl font-semibold text-teal-800 dark:text-teal-300">
            {apptQ.data.appointment.token}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {apptQ.data.appointment.session?.label ?? "Clinic session"}
          </p>
          {isCompleted ? (
            <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              Completed your consultation
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Status: {formatAppointmentStatus(apptQ.data.appointment.status)}
            </p>
          )}
        </Card>
      )}

      <Card>
        {isCompleted ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Completed your consultation
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {doctorName
                ? `Hope you had a good visit with ${doctorName}`
                : "Hope you had a good consultation today"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Thank you for choosing QWICKSLOT. Take care!
            </p>
            <Link
              to="/bookings"
              className="mt-4 inline-block text-sm font-medium text-teal-700 dark:text-teal-400"
            >
              Back to My bookings →
            </Link>
          </div>
        ) : isYourTurn ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center dark:border-emerald-800/80 dark:bg-emerald-950/50">
            <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
              It&apos;s your turn now
            </p>
            <p className="mt-2 text-sm text-emerald-700/90 dark:text-emerald-200/90">
              Your token is being called. Please proceed to the doctor&apos;s room.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-medium uppercase text-slate-500">Now serving</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-50">
              {snapshot?.current?.token ?? "—"}
            </p>

            <p className="mt-4 text-xs font-medium uppercase text-slate-500">Next up</p>
            <p className="mt-1 font-mono text-lg font-semibold text-slate-900 dark:text-slate-50">
              {snapshot?.nextWaiting?.token ?? "—"}
            </p>

            {snapshot?.patient && (
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Patients ahead of you:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.patient.patientsAhead}
                  </span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Estimated wait:{" "}
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {snapshot.patient.estimatedWaitMinutes <= 0
                      ? "You're next"
                      : `~${snapshot.patient.estimatedWaitMinutes} min`}
                  </span>
                </p>
              </div>
            )}

            {snapshot && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                {snapshot.remainingPatients} patient(s) waiting in this session · updates in real
                time
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
