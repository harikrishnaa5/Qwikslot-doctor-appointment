import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { fetchDepartments } from "../api/public";
import { Card, PageHeader, Skeleton } from "../components/ui";
import { departmentNameToSlug } from "../lib/departmentSlug";

export function BrowsePage() {
  const q = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  return (
    <div>
      <PageHeader title="Find specialty" />
      <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Pick a specialty to browse doctors and see which appointment times are open.
      </p>
      <ul className="flex flex-col gap-3">
        {q.isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <Skeleton className="h-24 w-full rounded-2xl" />
            </li>
          ))}
        {q.data?.map((d) => (
          <li key={d.id}>
            <Link to={`/departments/${departmentNameToSlug(d.name)}/doctors`}>
              <Card className="transition hover:border-teal-400/50 hover:shadow-md dark:hover:border-teal-600/40">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{d.name}</h2>
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
    </div>
  );
}
