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

const optionsPanelClass = clsx(
  "z-[120] max-h-64 w-[var(--button-width)] min-w-[var(--button-width)] overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
  "origin-top transition duration-150 ease-out will-change-[opacity,transform]",
  "data-closed:scale-[0.98] data-closed:opacity-0",
  "data-[anchor~=top]:origin-bottom"
);

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
      <div className={clsx("relative isolate", className)}>
        <div className="relative">
          <ListboxButton
            className={clsx(
              "group w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-16 text-left text-sm shadow-sm outline-none",
              "transition-[box-shadow,border-color] duration-150",
              "focus-visible:ring-2 focus-visible:ring-teal-500/40",
              "data-open:border-teal-400 data-open:ring-2 data-open:ring-teal-500/30",
              "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
              "dark:data-open:border-teal-600 dark:data-open:ring-teal-500/25"
            )}
          >
            <span className={selected ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown
              className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-150 group-data-open:rotate-180"
              aria-hidden
            />
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
          modal={false}
          portal
          transition
          anchor={{ to: "bottom start", gap: 6, padding: 8 }}
          className={optionsPanelClass}
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
                  <Check className={clsx("h-4 w-4 shrink-0", !isSelected && "invisible")} />
                </>
              )}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
