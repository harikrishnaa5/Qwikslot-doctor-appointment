import clsx from "clsx";
import { useEffect } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition active:scale-[0.98] disabled:opacity-45",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
        variant === "primary" &&
          "bg-teal-600 text-white shadow-md shadow-teal-900/20 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-900/25 dark:bg-teal-500 dark:shadow-teal-950/40 dark:hover:bg-teal-400 focus-visible:ring-teal-500/90",
        variant === "ghost" &&
          "border border-slate-300/90 bg-white text-slate-800 shadow-sm hover:border-teal-300/80 hover:bg-teal-50/80 hover:text-teal-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800 dark:hover:text-teal-100 focus-visible:ring-teal-500/60",
        variant === "danger" &&
          "bg-rose-600 text-white shadow-md shadow-rose-900/20 hover:bg-rose-700 hover:shadow-lg dark:bg-rose-600 dark:hover:bg-rose-500 focus-visible:ring-rose-500/80",
        className
      )}
      {...rest}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  ...rest
}: LinkProps & { variant?: "primary" | "ghost" | "danger" }) {
  return (
    <Link
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold tracking-tight transition active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
        variant === "primary" &&
          "bg-teal-600 text-white shadow-md shadow-teal-900/20 hover:bg-teal-700 hover:shadow-lg dark:bg-teal-500 dark:shadow-teal-950/40 dark:hover:bg-teal-400 focus-visible:ring-teal-500/90",
        variant === "ghost" &&
          "border border-slate-300/90 bg-white text-slate-800 shadow-sm hover:border-teal-300/80 hover:bg-teal-50/80 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-700 dark:hover:bg-slate-800 focus-visible:ring-teal-500/60",
        variant === "danger" &&
          "bg-rose-600 text-white shadow-md shadow-rose-900/20 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500 focus-visible:ring-rose-500/80",
        className
      )}
      {...rest}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800", className)}
      aria-hidden
    />
  );
}

export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
      {right}
    </header>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-label="Dismiss dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="confirm-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant === "danger" ? "danger" : "primary"}
            className="w-full sm:w-auto"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
