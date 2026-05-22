import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, ChevronRight, ListOrdered, Lock, Sparkles } from "lucide-react";
import { fetchDepartments } from "../api/public";
import { ButtonLink, Card, Skeleton } from "../components/ui";
import { departmentNameToSlug } from "../lib/departmentSlug";

const services = [
  {
    title: "Book in a few taps",
    body: "Choose a doctor, pick a time that fits your day, and lock in your visit",
    icon: CalendarClock,
  },
  {
    title: "Know when it’s your turn",
    body: "Follow your place in line live, so you can wait comfortably instead of hovering at the front desk.",
    icon: ListOrdered,
  },
  {
    title: "Your visits, kept private",
    body: "Your account shows only your appointments and history. We handle your details with care — the same way you’d expect from a trusted clinic.",
    icon: Lock,
  },
];

export function HomePage() {
  const deptQ = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  return (
    <div className="space-y-12 pb-8 md:space-y-16">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="grid md:grid-cols-2 md:gap-0">
          <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-12">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Welcome to QwikSlot
            </p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              Healthcare scheduling, <span className="text-teal-600 dark:text-teal-400">simplified.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Book appointments, see who’s next in line, and stay updated — all in one simple app, whether you’re at home
              or on the go.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink to="/browse" className="w-full gap-2 sm:w-auto">
                Find a specialist
                <ChevronRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              {/* <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-medium text-slate-700 underline-offset-4 hover:underline dark:text-slate-300"
              >
                Already have an account? Sign in
              </Link> */}
            </div>
          </div>
          <div className="relative min-h-[220px] md:min-h-full">
            <img
              src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=900&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent dark:from-slate-950 dark:via-slate-950/30 md:from-white/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent md:hidden" />
          </div>
        </div>
      </section>

      <section aria-labelledby="services-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="services-heading" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
              How QwikSlot helps you
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Less waiting and less stress — so you can focus on feeling better.
            </p>
          </div>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.title}>
              <Card className="h-full border-slate-200/90 dark:border-slate-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                  <s.icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-900 text-white dark:border-slate-800">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[280px]">
            <img
              src="https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent md:bg-gradient-to-r" />
          </div>
          <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[280px]">
            <img
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent md:bg-gradient-to-l" />
          </div>
        </div>
        <div className="px-6 py-8 sm:px-10">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">A smoother visit, start to finish</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
            Whether it’s a check-up or a specialist visit, QwikSlot helps you book online, see what’s happening in the
            waiting room, and walk in knowing what to expect — without the usual hassle.
          </p>
          <ButtonLink
            to="/browse"
            variant="ghost"
            className="mt-6 gap-2 border border-white/20 bg-white/10 text-white hover:bg-white/15 dark:border-white/20"
          >
            Book now
            <ChevronRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="specialties-heading">
        <h2 id="specialties-heading" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white md:text-2xl">
          Popular specialties
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Choose a specialty below to browse doctors and available times near you.
        </p>
        <ul className="mt-6 flex flex-col gap-3 sm:grid sm:grid-cols-2">
          {deptQ.isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-24 w-full rounded-2xl" />
              </li>
            ))}
          {deptQ.data?.slice(0, 4).map((d) => (
            <li key={d.id}>
              <Link to={`/departments/${departmentNameToSlug(d.name)}/doctors`}>
                <Card className="transition hover:border-teal-400/60 hover:shadow-md dark:hover:border-teal-600/50">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{d.name}</h3>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{d.description}</p>
                  )}
                  <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-400">
                    View doctors <ChevronRight className="h-4 w-4" aria-hidden />
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center sm:text-left">
          <Link
            to="/browse"
            className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
          >
            View all specialties
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-500">
        <p>© {new Date().getFullYear()} QwikSlot — booking care on your schedule.</p>
      </footer>
    </div>
  );
}
