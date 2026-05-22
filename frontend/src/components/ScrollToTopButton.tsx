import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronUp } from "lucide-react";

const SHOW_AFTER_PX = 240;

export function ScrollToTopButton({ aboveBottomNav = false }: { aboveBottomNav?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={clsx(
        "fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white text-teal-700 shadow-lg shadow-slate-900/15 transition-all duration-300 ease-out motion-reduce:transition-none dark:border-slate-600 dark:bg-slate-900 dark:text-teal-300 dark:shadow-black/40",
        "hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 active:scale-95 dark:hover:border-teal-700 dark:hover:bg-slate-800",
        aboveBottomNav ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-8" : "bottom-6",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ChevronUp className="h-5 w-5 stroke-[2.5]" aria-hidden />
    </button>
  );
}
