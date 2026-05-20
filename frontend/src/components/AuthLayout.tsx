import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col md:flex-row">
        <aside className="relative hidden min-h-0 flex-1 md:flex md:flex-col">
          <div className="absolute left-6 top-6 z-20 lg:left-10 lg:top-10">
            <Logo to="/" size="lg" variant="onDark" />
          </div>
          <div className="relative min-h-[50vh] flex-1 overflow-hidden bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-teal-950/40" />
            <div className="relative z-10 flex h-full flex-col justify-end p-10 lg:p-14">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">QwikSlot</p>
              <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight tracking-tight text-white lg:text-4xl">
                Care that fits your day — book quickly and see when it’s your turn.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-200/90">
                Simple scheduling, clear updates from the waiting room, and your visits in one place — on the device you
                already use.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex w-full flex-1 flex-col justify-center px-4 py-10 sm:px-8 md:max-w-lg md:py-12 lg:max-w-xl lg:px-12">
          <div className="mb-8 flex justify-center md:hidden">
            <Logo to="/" size="md" />
          </div>
          <div className="md:pt-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-10 text-center text-xs text-slate-500 dark:text-slate-500">
              <Link to="/" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
