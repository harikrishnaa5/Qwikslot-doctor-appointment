import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronsUpDown, X } from "lucide-react";

export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  clearable?: boolean;
  /** When true, shows a search field to filter options by label (default: true). */
  searchable?: boolean;
};

export function DropdownSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  className,
  clearable = true,
  searchable = true,
}: DropdownSelectProps) {
  const [query, setQuery] = useState("");
  const selected = options.find((opt) => opt.value === value) ?? null;

  useEffect(() => {
    setQuery("");
  }, [value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || !q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className={clsx("relative", className)}>
        <div className="relative">
          <ListboxButton className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-16 text-left text-[13px] leading-5 shadow-sm sm:py-2.5 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <span className={selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </ListboxButton>
          {clearable && value ? (
            <button
              type="button"
              className="absolute right-7 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-teal-100 hover:text-teal-700 dark:text-slate-500 dark:hover:bg-teal-900/45 dark:hover:text-teal-200"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }}
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <ListboxOptions
          anchor={{ to: "bottom start", gap: 6 }}
          className="z-[120] max-h-64 w-[var(--button-width)] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl [--anchor-padding:8px] dark:border-slate-700 dark:bg-slate-900"
        >
          {searchable ? (
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search…"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
                autoComplete="off"
              />
            </div>
          ) : null}
          {filteredOptions.length === 0 ? (
            <p className="px-2.5 py-3 text-center text-[13px] text-slate-500 dark:text-slate-400">No matches</p>
          ) : null}
          {filteredOptions.map((opt) => (
            <ListboxOption
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              className={({ focus, selected: isSelected, disabled }) =>
                clsx(
                  "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-[13px] leading-5 transition-colors sm:text-sm",
                  "hover:bg-teal-100 hover:text-teal-900 dark:hover:bg-teal-900/45 dark:hover:text-teal-100",
                  focus && "bg-teal-100 text-teal-900 dark:bg-teal-900/45 dark:text-teal-100",
                  isSelected && "font-semibold text-teal-700 dark:text-teal-300",
                  disabled && "cursor-not-allowed opacity-50"
                )
              }
            >
              {({ selected: isSelected }) => (
                <>
                  <span>{opt.label}</span>
                  <Check className={clsx("h-4 w-4", !isSelected && "invisible")} />
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
