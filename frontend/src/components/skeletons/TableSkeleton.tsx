import clsx from "clsx";
import type { ReactNode } from "react";
import { Skeleton } from "../ui";

/** Cell layout variants — mirror common table column types in this app. */
export type SkeletonColumnKind =
  | "index"
  | "text"
  | "text-wide"
  | "text-narrow"
  | "avatar"
  | "badge"
  | "double"
  | "mono"
  | "actions";

export type TableSkeletonProps = {
  columns: SkeletonColumnKind[];
  rows?: number;
  minWidth?: string;
  className?: string;
  /** Screen-reader label for the loading region */
  label?: string;
};

function SkeletonCell({ kind }: { kind: SkeletonColumnKind }) {
  switch (kind) {
    case "index":
      return <Skeleton className="h-4 w-6" />;
    case "text":
      return <Skeleton className="h-4 w-28" />;
    case "text-wide":
      return <Skeleton className="h-4 w-40" />;
    case "text-narrow":
      return <Skeleton className="h-4 w-16" />;
    case "mono":
      return <Skeleton className="h-4 w-14 font-mono" />;
    case "badge":
      return <Skeleton className="h-6 w-20 rounded-full" />;
    case "avatar":
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
      );
    case "double":
      return (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      );
    case "actions":
      return (
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-[4.5rem] rounded-lg" />
          <Skeleton className="h-8 w-[4.5rem] rounded-lg" />
        </div>
      );
    default:
      return <Skeleton className="h-4 w-24" />;
  }
}

function SkeletonHeaderCell({ kind }: { kind: SkeletonColumnKind }) {
  const w =
    kind === "index"
      ? "w-8"
      : kind === "actions"
        ? "w-20 ml-auto"
        : kind === "avatar"
          ? "w-24"
          : "w-20";
  return <Skeleton className={clsx("h-3", w)} />;
}

/** Generic admin-style data table placeholder (header + rows). */
export function TableSkeleton({
  columns,
  rows = 6,
  minWidth = "680px",
  className,
  label = "Loading table",
}: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={clsx("overflow-x-auto", className)}
    >
      <span className="sr-only">{label}</span>
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-slate-50 dark:bg-slate-800/40">
          <tr>
            {columns.map((kind, i) => (
              <th
                key={i}
                className={clsx(
                  "px-4 py-3 text-left",
                  kind === "index" && "w-14",
                  kind === "actions" && "text-right"
                )}
              >
                <SkeletonHeaderCell kind={kind} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-t border-slate-100 dark:border-slate-800">
              {columns.map((kind, colIdx) => (
                <td
                  key={colIdx}
                  className={clsx("px-4 py-3", kind === "actions" && "text-right")}
                >
                  <SkeletonCell kind={kind} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeletonCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx("overflow-hidden", className)}>{children}</div>;
}
