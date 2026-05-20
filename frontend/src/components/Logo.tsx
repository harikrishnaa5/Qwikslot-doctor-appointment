import { Link } from "react-router-dom";
import clsx from "clsx";

const sizes = {
  sm: { img: "h-8 w-8", text: "text-lg" },
  md: { img: "h-9 w-9", text: "text-xl" },
  lg: { img: "h-11 w-11", text: "text-2xl" },
} as const;

export function Logo({
  to = "/",
  size = "md",
  variant = "default",
  className,
}: {
  to?: string;
  size?: keyof typeof sizes;
  variant?: "default" | "onDark";
  className?: string;
}) {
  const s = sizes[size];
  const onDark = variant === "onDark";

  return (
    <Link
      to={to}
      className={clsx(
        "inline-flex min-h-11 items-center gap-2.5 rounded-lg outline-none ring-teal-500/30 focus-visible:ring-2",
        className
      )}
      aria-label="QwikSlot home"
    >
      <img src="/qwikslot-mark.svg" alt="" className={clsx(s.img, "shrink-0 rounded-lg shadow-sm")} />
      <span
        className={clsx(
          "font-semibold tracking-tight",
          s.text,
          onDark ? "text-white" : "text-slate-900 dark:text-white"
        )}
      >
        Qwik
        <span className={onDark ? "text-teal-200" : "text-teal-600 dark:text-teal-400"}>Slot</span>
      </span>
    </Link>
  );
}
