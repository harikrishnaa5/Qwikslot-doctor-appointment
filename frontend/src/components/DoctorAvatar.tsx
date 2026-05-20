import { useState } from "react";
import clsx from "clsx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function DoctorAvatar({
  name,
  imageUrl,
  size = "md",
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const dim =
    size === "sm" ? "h-12 w-12 min-h-12 min-w-12 text-sm" : size === "lg" ? "h-20 w-20 min-h-20 min-w-20 text-xl" : "h-14 w-14 min-h-14 min-w-14 text-base";

  const showImg = imageUrl && !failed;

  return (
    <div
      className={clsx(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-100 to-teal-200 font-semibold text-teal-900 ring-1 ring-teal-500/15 dark:from-teal-900/50 dark:to-teal-950 dark:text-teal-100 dark:ring-teal-500/25",
        dim,
        className
      )}
      aria-hidden={!!showImg}
    >
      {showImg ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="select-none">{initials(name)}</span>
      )}
    </div>
  );
}
