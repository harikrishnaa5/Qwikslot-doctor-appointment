import { useEffect, useState, type CSSProperties } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import clsx from "clsx";
import { toast as sonnerToast } from "sonner";
import { TOAST_DURATION_MS, TOAST_ENTER_MS, TOAST_EXIT_MS } from "../lib/toastConfig";

export type QwikslotToastVariant = "success" | "error" | "warning" | "info";

const icons: Record<QwikslotToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconClass: Record<QwikslotToastVariant, string> = {
  success: "text-teal-600 dark:text-teal-400",
  error: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-teal-600 dark:text-teal-400",
};

const accentBorder: Record<QwikslotToastVariant, string> = {
  success: "border-l-teal-500/90 dark:border-l-teal-400/90",
  error: "border-l-rose-500/90 dark:border-l-rose-400/90",
  warning: "border-l-amber-500/90 dark:border-l-amber-400/90",
  info: "border-l-teal-500/90 dark:border-l-teal-400/90",
};

export function QwikslotToast({
  id,
  message,
  variant,
  duration = TOAST_DURATION_MS,
}: {
  id: string | number;
  message: string;
  variant: QwikslotToastVariant;
  duration?: number;
}) {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const Icon = icons[variant];

  useEffect(() => {
    let enterFrame = 0;
    const startOpen = requestAnimationFrame(() => {
      enterFrame = requestAnimationFrame(() => setOpen(true));
    });
    const exitTimer = window.setTimeout(() => setExiting(true), duration);
    const dismissTimer = window.setTimeout(() => sonnerToast.dismiss(id), duration + TOAST_EXIT_MS);

    return () => {
      cancelAnimationFrame(startOpen);
      cancelAnimationFrame(enterFrame);
      window.clearTimeout(exitTimer);
      window.clearTimeout(dismissTimer);
    };
  }, [id, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        "qwikslot-toast-panel",
        accentBorder[variant],
        open && !exiting && "qwikslot-toast-panel--open",
        exiting && "qwikslot-toast-panel--exit"
      )}
      style={
        {
          "--qwikslot-toast-in-ms": `${TOAST_ENTER_MS}ms`,
          "--qwikslot-toast-out-ms": `${TOAST_EXIT_MS}ms`,
        } as CSSProperties
      }
    >
      <Icon className={clsx("h-5 w-5 shrink-0", iconClass[variant])} strokeWidth={2.25} aria-hidden />
      <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-50">{message}</p>
    </div>
  );
}
