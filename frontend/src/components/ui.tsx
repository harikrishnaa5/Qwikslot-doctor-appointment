import clsx from "clsx";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
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

/** Pill-style prev / page indicator / next — centered below tables. */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (total <= 0) return null;

  return (
    <nav
      aria-label="Table pagination"
      className={clsx("flex justify-center border-t border-slate-100 px-4 py-4 dark:border-slate-800", className)}
    >
      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 p-1.5 shadow-inner ring-1 ring-slate-200/60 dark:bg-slate-800/80 dark:ring-slate-700/60">
        <button
          type="button"
          aria-label="Previous page"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95",
            canPrev
              ? "bg-white text-slate-900 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800"
              : "cursor-not-allowed bg-white/40 text-slate-400 dark:bg-slate-900/30 dark:text-slate-600"
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
        <span className="min-w-[5.5rem] px-2 text-center text-sm font-semibold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
          {page} of {totalPages}
        </span>
        <button
          type="button"
          aria-label="Next page"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className={clsx(
            "flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95",
            canNext
              ? "bg-slate-900 text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              : "cursor-not-allowed bg-slate-300/80 text-slate-500 dark:bg-slate-700 dark:text-slate-500"
          )}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "danger",
  variant = "default",
  icon: Icon,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "danger" | "primary";
  /** `logout` — centered layout with icon header and stacked actions */
  variant?: "default" | "logout";
  icon?: LucideIcon;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[100] flex items-end justify-center p-4 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:items-center",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={clsx(
          "absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          variant === "logout"
            ? "bg-slate-950/65 backdrop-blur-md"
            : "bg-slate-950/55 backdrop-blur-[2px]"
        )}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className={clsx(
          "relative w-full overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
          variant === "logout"
            ? "max-w-sm rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-black/40 dark:ring-white/10"
            : "max-w-md rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-6 scale-[0.97] opacity-0 sm:translate-y-3"
        )}
      >
        {variant === "logout" ? (
          <>
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl dark:bg-teal-500/15"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-rose-400/15 blur-2xl dark:bg-rose-500/10"
              aria-hidden
            />
            <div className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 pb-6 pt-8 text-center dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-900">
              {Icon ? (
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-rose-50 shadow-inner ring-1 ring-rose-200/80 dark:from-rose-950/80 dark:to-rose-900/40 dark:ring-rose-800/60"
                  aria-hidden
                >
                  <Icon className="h-7 w-7 text-rose-600 dark:text-rose-400" strokeWidth={2} />
                </div>
              ) : null}
              <h2
                id="confirm-modal-title"
                className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
              >
                {title}
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </div>
            </div>
            <div className="relative space-y-2 px-5 py-5">
              <Button type="button" variant="primary" className="w-full" onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="w-full"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden /> : null}
                {confirmLabel}
              </Button>
            </div>
          </>
        ) : (
          <div className="p-5">
            {Icon ? (
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden />
              </div>
            ) : null}
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
        )}
      </div>
    </div>
  );
}
