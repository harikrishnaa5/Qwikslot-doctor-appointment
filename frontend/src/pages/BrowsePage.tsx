import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight, Stethoscope } from "lucide-react";
import { fetchDepartments } from "../api/public";
import { Card, PageHeader } from "../components/ui";
import { DirectoryCardListSkeleton } from "../components/skeletons";
import { departmentNameToSlug } from "../lib/departmentSlug";

export function BrowsePage() {
  const q = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  return (
    <div>
      <PageHeader title="Find specialty" />
      <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Pick a specialty to browse doctors and see which appointment times are open.
      </p>
      {q.isLoading ? (
        <DirectoryCardListSkeleton count={6} tall className="grid grid-cols-2 gap-3 sm:gap-4" />
      ) : (
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {q.data?.map((d) => (
          <li key={d.id} className="min-w-0">
            <Link
              to={`/departments/${departmentNameToSlug(d.name)}/doctors`}
              className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 rounded-[var(--radius-card)]"
            >
              <Card className="flex h-full min-h-[9.5rem] flex-col transition group-hover:border-teal-400/60 group-hover:shadow-md dark:group-hover:border-teal-600/50 sm:min-h-[10.5rem] sm:p-5">
                <div
                  className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition group-hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-400 dark:group-hover:bg-teal-900/60"
                  aria-hidden
                >
                  <Stethoscope className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-white sm:text-lg">
                  {d.name}
                </h2>
                {d.description ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                    {d.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500 sm:text-sm">Browse available doctors</p>
                )}
                <p className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-teal-700 dark:text-teal-400 sm:text-sm">
                  View doctors
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
