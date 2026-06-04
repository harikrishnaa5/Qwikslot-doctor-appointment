import clsx from "clsx";
import type { ReactNode } from "react";
import { Card, Skeleton } from "../ui";

function LoadingRegion({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Patient booking card (BookingsPage — upcoming). */
export function UserBookingCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <LoadingRegion label="Loading booking">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-52" />
        <Skeleton className="mt-2 h-4 w-24" />
        <Skeleton className="mt-3 h-3 w-20" />
      </LoadingRegion>
    </Card>
  );
}

export function UserBookingCardsSkeleton({
  count = 3,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <ul className={clsx("flex flex-col gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <UserBookingCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** Patient history table (BookingsPage). */
export function UserBookingHistoryTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden p-0 shadow-sm">
      <LoadingRegion label="Loading booking history">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40">
                {["Doctor", "Date & time", "Token", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800/80">
                  <td className="px-4 py-3.5">
                    <Skeleton className="h-4 w-32" />
                  </td>
                  <td className="px-4 py-3.5">
                    <Skeleton className="h-4 w-36" />
                  </td>
                  <td className="px-4 py-3.5">
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className="px-4 py-3.5">
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </LoadingRegion>
    </Card>
  );
}

/** Browse / home department or doctor list card. */
export function DirectoryCardSkeleton({ tall }: { tall?: boolean }) {
  return (
    <Card>
      <Skeleton className={clsx("w-full rounded-2xl", tall ? "h-36 sm:h-40" : "h-24")} />
      <Skeleton className="mt-3 h-5 w-3/5 max-w-[12rem]" />
      {tall ? <Skeleton className="mt-2 h-4 w-full max-w-md" /> : null}
    </Card>
  );
}

export function DirectoryCardListSkeleton({
  count = 4,
  tall,
  className,
}: {
  count?: number;
  tall?: boolean;
  className?: string;
}) {
  return (
    <ul className={clsx("flex flex-col gap-3 sm:grid sm:grid-cols-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <DirectoryCardSkeleton tall={tall} />
        </li>
      ))}
    </ul>
  );
}

/** Doctor profile page. */
export function DoctorProfileSkeleton() {
  return (
    <LoadingRegion label="Loading profile" className="flex flex-col gap-4">
      <div className="flex flex-col items-center pt-6">
        <Skeleton className="h-28 w-28 rounded-full" />
        <Skeleton className="mt-4 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <Card>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <Skeleton className="mt-2 h-4 w-4/5 max-w-sm" />
        <Skeleton className="mt-2 h-4 w-2/3 max-w-xs" />
      </Card>
    </LoadingRegion>
  );
}

/** Doctor detail header (patient). */
export function DoctorDetailHeaderSkeleton() {
  return (
    <div className="mb-6 flex gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
    </div>
  );
}

/** Doctor detail — header + slot grid. */
export function DoctorDetailSkeleton() {
  return (
    <LoadingRegion label="Loading doctor" className="flex flex-col gap-4">
      <DoctorDetailHeaderSkeleton />
      <div>
        <Skeleton className="mb-2 h-4 w-28" />
        <SlotGridSkeleton />
      </div>
    </LoadingRegion>
  );
}

export function SlotGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      className="mb-24 grid grid-cols-2 gap-2 sm:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Loading time slots"
    >
      <span className="sr-only">Loading time slots</span>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <Skeleton className="h-12 w-full rounded-xl" />
        </li>
      ))}
    </ul>
  );
}

/** Live token / queue page header card. */
export function TokenLiveSkeleton() {
  return <Skeleton className="mb-4 h-24 w-full rounded-2xl" />;
}

/** Admin patient tab — filter row above table. */
export function AdminPatientFiltersSkeleton() {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[12rem] flex-1">
        <Skeleton className="mb-1.5 h-4 w-14" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="max-w-sm flex-1">
        <Skeleton className="mb-1.5 h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="max-w-xs flex-1">
        <Skeleton className="mb-1.5 h-4 w-12" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </Card>
  );
}

/** Date filter card (doctor dashboard, admin appointments). */
export function DateFilterCardSkeleton() {
  return (
    <Card>
      <Skeleton className="mb-1.5 h-4 w-28" />
      <Skeleton className="h-11 max-w-sm rounded-xl" />
    </Card>
  );
}
