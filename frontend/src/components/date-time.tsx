import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { CalendarDays, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import dayjs, { type Dayjs } from "dayjs";
import { toast } from "../lib/toast";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { MobileTimePicker } from "@mui/x-date-pickers/MobileTimePicker";
import { localTodayStr } from "../lib/dates";
import { DropdownSelect, type DropdownOption } from "./DropdownSelect";

type DatePickerProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  minDateIso?: string;
  className?: string;
};

function dateToIso(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function toMonthStart(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), 1);
}

type DayPickerMonthOption = {
  value: number;
  label: string;
  disabled: boolean;
};

function CalendarMonthsDropdown(props: {
  options?: DayPickerMonthOption[];
  value?: string | number | readonly string[];
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  name?: string;
}) {
  const options: DropdownOption[] = (props.options ?? []).map((opt) => ({
    value: String(opt.value),
    label: opt.label,
    disabled: opt.disabled,
  }));

  return (
    <DropdownSelect
      value={String(props.value ?? "")}
      onChange={(next) => {
        props.onChange?.({
          target: { value: next, name: props.name },
          currentTarget: { value: next, name: props.name },
        } as ChangeEvent<HTMLSelectElement>);
      }}
      options={options}
      clearable={false}
      searchable={false}
      className="w-[10.5rem] sm:w-[12rem]"
      placeholder="Month"
    />
  );
}

export function CalendarDatePicker({ label, value, onChange, minDateIso, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [openUpward, setOpenUpward] = useState(false);
  const minDate = useMemo(() => (minDateIso ? isoToDate(minDateIso) : undefined), [minDateIso]);
  const startMonth = useMemo(() => {
    if (minDate) return toMonthStart(minDate);
    return toMonthStart(new Date());
  }, [minDate]);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => {
    if (value) return toMonthStart(isoToDate(value));
    return startMonth;
  });
  useEffect(() => {
    if (!open) return;
    if (value) {
      setDisplayMonth(toMonthStart(isoToDate(value)));
      return;
    }
    setDisplayMonth(startMonth);
  }, [open, value, startMonth]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (!triggerRect) return;

      const panelWidth = Math.min(320, window.innerWidth - 16);
      const panelHeight = 340;
      const gap = 8;
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      // Prefer the side with enough room; if neither side fits fully, use the side with more space.
      const shouldOpenUpward =
        (spaceBelow < panelHeight + gap && spaceAbove >= panelHeight) ||
        (spaceBelow < panelHeight + gap && spaceAbove > spaceBelow);

      const left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - panelWidth - 8));
      const desiredTop = shouldOpenUpward ? triggerRect.top - panelHeight - gap : triggerRect.bottom + gap;
      const top = Math.max(8, Math.min(desiredTop, window.innerHeight - panelHeight - 8));

      setOpenUpward(shouldOpenUpward);
      setPanelPos({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={clsx("relative", className)}>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="flex items-center gap-2">
        <div ref={triggerRef} className="flex-1">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm shadow-sm dark:border-slate-600 dark:bg-slate-900"
            onClick={() => setOpen((s) => !s)}
          >
            <span className={value ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}>{value ?? "Select date"}</span>
            <CalendarDays className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          disabled={!value}
          aria-label={`Clear ${label}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {open && (
        <div
          className={clsx(
            "fixed z-[90] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900",
            openUpward ? "origin-bottom" : "origin-top"
          )}
          style={{
            top: panelPos.top,
            left: panelPos.left,
            width: "min(320px, calc(100vw - 1rem))",
            maxHeight: "min(330px, calc(100vh - 1rem))",
            overflow: "visible",
          }}
        >
          <DayPicker
            mode="single"
            selected={value ? isoToDate(value) : undefined}
            month={displayMonth}
            onMonthChange={(next) => setDisplayMonth(toMonthStart(next))}
            onSelect={(day) => {
              onChange(day ? dateToIso(day) : null);
              if (day) setOpen(false);
            }}
            captionLayout="dropdown-months"
            components={{ MonthsDropdown: CalendarMonthsDropdown }}
            startMonth={startMonth}
            disabled={minDate ? { before: minDate } : undefined}
            weekStartsOn={1}
          />
        </div>
      )}
    </div>
  );
}

type ClockPickerProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** `YYYY-MM-DD` — calendar day used by the picker (needed for correct `minTime` vs “today”). */
  referenceDate?: string | null;
  /** When the reference date is today (local), times before now are blocked. */
  disallowPastTimes?: boolean;
  /** `HH:mm` on `referenceDate` — selection must be strictly after this (e.g. end after start). */
  notBeforeTime?: string | null;
};

function timeHmValid(h: string | null | undefined): h is string {
  return Boolean(h && /^\d{2}:\d{2}$/.test(h));
}

function combineMinTime(refDay: string, disallowPast: boolean | undefined, notBefore: string | null | undefined): Dayjs | undefined {
  const candidates: Dayjs[] = [];
  if (disallowPast && refDay === localTodayStr()) {
    candidates.push(dayjs());
  }
  if (timeHmValid(notBefore)) {
    const t = dayjs(`${refDay}T${notBefore}`);
    if (t.isValid()) candidates.push(t.add(1, "minute"));
  }
  if (candidates.length === 0) return undefined;
  return candidates.reduce((a, b) => (a.isAfter(b) ? a : b));
}

export function ClockTimePicker({
  label,
  value,
  onChange,
  referenceDate,
  disallowPastTimes,
  notBeforeTime,
}: ClockPickerProps) {
  const refDay = referenceDate && referenceDate.length >= 10 ? referenceDate : "2022-04-17";
  const timePart = timeHmValid(value) ? value : "15:30";
  const pickerValue = useMemo(() => {
    const d = dayjs(`${refDay}T${timePart}`);
    return d.isValid() ? d : dayjs(`${refDay}T15:30`);
  }, [refDay, timePart]);

  const minTime = useMemo(
    () => combineMinTime(refDay, disallowPastTimes, notBeforeTime),
    [refDay, disallowPastTimes, notBeforeTime]
  );

  const [open, setOpen] = useState(false);
  /** Prevents OK/Cancel click-through from immediately reopening the picker. */
  const suppressOpenUntilRef = useRef(0);
  const suppressReopen = (ms = 900) => {
    suppressOpenUntilRef.current = Date.now() + ms;
  };

  const handleClose = () => {
    setOpen(false);
    suppressReopen();
  };

  const tryOpen = () => {
    if (Date.now() < suppressOpenUntilRef.current) return;
    setOpen(true);
  };

  const applyTime = (next: Dayjs) => {
    const nextHm = next.format("HH:mm");
    const nextFull = dayjs(`${refDay}T${nextHm}`);
    if (!nextFull.isValid()) return;
    if (minTime && nextFull.isBefore(minTime, "minute")) {
      if (disallowPastTimes && refDay === localTodayStr() && nextFull.isBefore(dayjs(), "minute")) {
        toast.error("That time has already passed. Choose a later time.");
      } else if (notBeforeTime) {
        toast.error("End time must be after start time.");
      } else {
        toast.error("That time is not allowed for this date.");
      }
      return;
    }
    onChange(nextHm);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <div className="cursor-pointer rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <MobileTimePicker
            open={open}
            onOpen={() => tryOpen()}
            onClose={handleClose}
            onAccept={() => handleClose()}
            ampm
            format="hh:mm A"
            value={pickerValue}
            minTime={minTime}
            onChange={(next) => {
              if (!next || !next.isValid()) return;
              applyTime(next);
            }}
            slotProps={{
              actionBar: {
                actions: ["cancel", "accept"],
              },
              textField: {
                variant: "standard",
                fullWidth: true,
                size: "small",
                slotProps: {
                  input: { disableUnderline: true },
                  htmlInput: { readOnly: true },
                },
                onClick: (e) => {
                  e.stopPropagation();
                  tryOpen();
                },
                sx: {
                  m: 0,
                  color: "inherit",
                  cursor: "pointer",
                  "& .MuiPickersInputBase-root": {
                    color: "inherit",
                    cursor: "pointer",
                    minHeight: 40,
                    paddingLeft: "4px",
                    paddingRight: "4px",
                    marginTop: 0,
                    marginBottom: 0,
                    border: "none",
                    backgroundColor: "transparent",
                    "&::before": { display: "none" },
                    "&::after": { display: "none" },
                  },
                  "& .MuiInputAdornment-root": {
                    cursor: "pointer",
                  },
                  "& .MuiInputBase-input": {
                    color: "inherit",
                    WebkitTextFillColor: "inherit",
                    cursor: "pointer",
                    paddingTop: "6px",
                    paddingBottom: "6px",
                  },
                  "& .MuiIconButton-root": {
                    color: "inherit",
                    cursor: "pointer",
                    padding: "6px",
                  },
                  "& .MuiSvgIcon-root": {
                    color: "inherit",
                  },
                  "html.dark & .MuiIconButton-root": {
                    color: "rgb(241 245 249)",
                  },
                  "html.dark & .MuiSvgIcon-root": {
                    color: "rgb(241 245 249)",
                  },
                },
              },
            }}
          />
        </LocalizationProvider>
      </div>
    </div>
  );
}
