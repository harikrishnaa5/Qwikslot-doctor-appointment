import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { bookAppointment, createMockIntent } from "../api/user";
import { formatSlotLabel } from "../lib/dates";
import { Card, Button, PageHeader } from "../components/ui";

type LocState = { doctorId: string; scheduledAt: string; doctorName?: string };

export function BookingConfirmPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const state = (loc.state ?? {}) as Partial<LocState>;

  const bookMut = useMutation({
    mutationFn: async () => {
      if (!state.doctorId || !state.scheduledAt) throw new Error("Missing booking details");
      const intent = await createMockIntent(state.doctorId, state.scheduledAt);
      return bookAppointment({
        doctorId: state.doctorId,
        scheduledAt: state.scheduledAt,
        paymentRef: intent.paymentRef,
      });
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      toast.success("Appointment confirmed");
      nav("/token", {
        replace: true,
        state: {
          appointmentId: data.appointment.id,
          doctorId: data.appointment.doctorId,
        },
      });
    },
    onError: (e: Error) => toast.error(e.message ?? "Booking failed"),
  });

  if (!state.doctorId || !state.scheduledAt) {
    return (
      <div>
        <PageHeader title="Booking" />
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-400">No slot selected. Go back to a doctor.</p>
          <Button className="mt-4" variant="ghost" onClick={() => nav(-1)}>
            Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Confirm" />
      <Card>
        <p className="text-sm text-slate-600 dark:text-slate-400">Doctor</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{state.doctorName ?? "Selected"}</p>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Time</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatSlotLabel(state.scheduledAt)}</p>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Mock payment runs instantly. Razorpay can replace this step later.
        </p>
        <Button className="mt-6 w-full" disabled={bookMut.isPending} onClick={() => bookMut.mutate()}>
          {bookMut.isPending ? "Processing…" : "Pay (mock) & book"}
        </Button>
      </Card>
    </div>
  );
}
