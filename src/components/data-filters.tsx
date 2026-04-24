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
};

export function DataFilters({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = "Sök...",
  selects = [],
  onClear,
}: DataFiltersProps) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg text-muted">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <p className="eyebrow">Filter</p>
            <p className="text-xs text-muted">Avgränsa data i vyn</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {selects.map((select) => (
            <label key={select.key} className="space-y-1">
              <span className="block px-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                {select.label}
              </span>
              <select
                value={select.value}
                onChange={(e) => select.onChange(e.target.value)}
                className="input min-w-[150px]"
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
            <button type="button" onClick={onClear} className="btn-secondary">
              <X className="h-4 w-4" />
              Nollställ
            </button>
          ) : null}
        </div>
      </div>

      {typeof searchValue === "string" && onSearchChange ? (
        <form
          className="relative mt-3"
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
            className="input pl-11"
          />
        </form>
      ) : null}
    </section>
  );
}
