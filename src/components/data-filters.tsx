"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

type FilterOption = {
  value: string;
  label: string;
};

type FilterSelect = {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type DataFiltersProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  onClear?: () => void;
  className?: string;
};

export function DataFilters({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Sök...",
  selects = [],
  onClear,
  className,
}: DataFiltersProps) {
  return (
    <section
      className={`rounded-2xl border border-border/60 bg-white/20 px-3 py-2.5 shadow-none backdrop-blur-[1px] sm:px-4 ${className ?? ""}`}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="hidden items-center gap-2 pt-1.5 sm:flex">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/65 text-muted">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Filter</p>
            <p className="text-[11px] text-muted">Avgränsa data</p>
          </div>
        </div>

        <div className="ml-auto flex w-full flex-wrap items-end justify-end gap-2">
            {typeof searchValue === "string" && onSearchChange ? (
              <form
                className="relative w-full md:w-[300px] lg:w-[340px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearchSubmit?.();
                }}
              >
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-full border border-border/75 bg-white/80 px-4 py-2.5 pl-11 text-sm text-fg shadow-none outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </form>
            ) : null}

          {selects.map((select) => (
            <label key={select.key} className="space-y-1">
              <span className="block px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                {select.label}
              </span>
              <select
                value={select.value}
                onChange={(e) => select.onChange(e.target.value)}
                className="min-w-[145px] rounded-full border border-border/75 bg-white/80 px-4 py-2.5 text-sm text-fg shadow-none outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                {select.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          {onClear ? (
            <button type="button" onClick={onClear} className="btn-secondary px-4 py-2.5">
              <X className="h-4 w-4" />
              Nollställ
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
