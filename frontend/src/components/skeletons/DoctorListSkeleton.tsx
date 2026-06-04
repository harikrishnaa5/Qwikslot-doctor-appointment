import clsx from "clsx";
import { Card, Skeleton } from "../ui";

/** Department doctor list row (avatar + text). */
export function DoctorListRowSkeleton() {
  return (
    <Card className="flex gap-4">
      <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </Card>
  );
}

export function DoctorListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <ul className={clsx("flex flex-col gap-3", className)} role="status" aria-busy="true" aria-label="Loading doctors">
      <span className="sr-only">Loading doctors</span>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <DoctorListRowSkeleton />
        </li>
      ))}
    </ul>
  );
}
