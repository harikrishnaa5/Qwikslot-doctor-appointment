import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { dismissAppointmentScheduleNotice, fetchMyAppointment } from "../api/user";
import { fetchQueue } from "../api/public";
import { Button, Card, PageHeader, Skeleton } from "../components/ui";
import { localTodayStr } from "../lib/dates";

type QueuePayload = {
  doctorId: string;
  date: string;
  current: { token: string; appointmentId: string } | null;
  nextWaiting: { token: string; appointmentId: string } | null;
  appointments: { id: string; token: string; status: string; scheduledAt: string; patientName: string }[];
};

function wsUrl() {
  const p = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${p}//${window.location.host}/ws`;
}

export function TokenLivePage() {
  const loc = useLocation() as { state?: { appointmentId?: string; doctorId?: string } };
  const appointmentId = loc.state?.appointmentId;
  const doctorId = loc.state?.doctorId;
  const qc = useQueryClient();
  const [live, setLive] = useState<QueuePayload | null>(null);

  const apptQ = useQuery({
    queryKey: ["my-appointment", appointmentId],
    queryFn: () => fetchMyAppointment(appointmentId!),
    enabled: Boolean(appointmentId),
  });

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
    queryKey: ["queue", doctorId, dateStr],
    queryFn: () => fetchQueue(doctorId!, dateStr),
    enabled: Boolean(doctorId),
  });

  useEffect(() => {
    setLive(queueQ.data ?? null);
  }, [queueQ.data]);

  useEffect(() => {
    if (!doctorId) return;
    const ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", doctorId }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { event?: string; payload?: QueuePayload };
        if (msg.event === "token_updated" || msg.event === "current_token_changed") {
          if (msg.payload) {
            setLive(msg.payload);
            qc.invalidateQueries({ queryKey: ["queue", doctorId] });
          }
        }
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [doctorId, qc]);

  const snapshot = live ?? queueQ.data ?? null;
  const mine = snapshot?.appointments.find((a) => a.id === appointmentId);

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
              <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">{apptQ.data.appointment.scheduleNotice}</p>
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
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Status: {apptQ.data.appointment.status}</p>
        </Card>
      )}

      <Card>
        <p className="text-xs font-medium uppercase text-slate-500">Now serving</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
          {snapshot?.current?.token ?? "—"}
        </p>
        <p className="mt-4 text-xs font-medium uppercase text-slate-500">Next up</p>
        <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
          {snapshot?.nextWaiting?.token ?? "—"}
        </p>
        {mine && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            You are <span className="font-semibold text-slate-900 dark:text-slate-100">{mine.status}</span> in the
            queue.
          </p>
        )}
      </Card>
    </div>
  );
}
