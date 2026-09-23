"use client";

import React from "react";
import { SearchIcon, XIcon } from "lucide-react";

interface AdminFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  totalCount?: number;
  totalLabel?: string;
  onReset?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AdminFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  totalCount,
  totalLabel = "results",
  onReset,
  children,
  className = "",
}: AdminFilterBarProps) {
  const hasActiveFilters = Boolean(searchQuery && searchQuery.trim() !== "");

  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/80 p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        {onSearchChange !== undefined && (
          <div className="relative flex-1 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-lg border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {children && (
          <div className="flex items-center gap-2 flex-wrap">{children}</div>
        )}
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
        {totalCount !== undefined && (
          <span className="text-xs text-stone-500 font-medium">
            <strong className="text-stone-900 font-semibold">{totalCount}</strong>{" "}
            {totalLabel}
          </span>
        )}

        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-stone-500 hover:text-stone-900 underline font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
