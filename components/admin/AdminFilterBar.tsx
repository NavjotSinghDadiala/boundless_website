"use client";

import React, { useState } from "react";
import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface AdminFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  totalCount?: number;
  totalLabel?: string;
  activeFilterCount?: number;
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
  activeFilterCount,
  onReset,
  children,
  className = "",
}: AdminFilterBarProps) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const hasSearch = Boolean(searchQuery && searchQuery.trim() !== "");
  const hasFilters = Boolean(children);
  const hasActiveFilters = hasSearch || Boolean(activeFilterCount && activeFilterCount > 0);

  return (
    <div
      className={`bg-white rounded-2xl md:rounded-xl border border-stone-200/80 p-3.5 md:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 flex-1 min-w-0">
        {/* Search + Mobile Filter Trigger Row */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {onSearchChange !== undefined && (
            <div className="relative flex-1 md:max-w-md min-w-0">
              <SearchIcon className="absolute left-3.5 md:left-3 top-1/2 -translate-y-1/2 size-5 md:size-4 text-stone-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full min-h-[48px] md:min-h-0 pl-11 md:pl-9 pr-11 md:pr-8 py-2.5 md:py-2 text-base md:text-sm rounded-xl md:rounded-lg border border-stone-200 bg-stone-50/50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear search"
                  className="absolute right-1.5 md:right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-6 md:h-6 flex items-center justify-center text-stone-400 hover:text-stone-600 rounded-lg"
                >
                  <XIcon className="size-4 md:size-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Mobile Filter Drawer Trigger (< md) */}
          {hasFilters && (
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(true)}
              aria-label="Open filters"
              className={`md:hidden min-h-[48px] px-3.5 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 shrink-0 transition-colors ${
                activeFilterCount && activeFilterCount > 0
                  ? "bg-[#3B001B] text-white border-[#3B001B]"
                  : "bg-stone-50 text-stone-700 border-stone-200 active:bg-stone-100"
              }`}
            >
              <SlidersHorizontalIcon className="size-4 shrink-0" />
              <span>Filters</span>
              {activeFilterCount !== undefined && activeFilterCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#FFE878] text-[#3B001B] text-xs font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Desktop Inline Filters (>= md — Preserved) */}
        {hasFilters && (
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            {children}
          </div>
        )}
      </div>

      {/* Results Summary + Reset */}
      {(totalCount !== undefined || (hasActiveFilters && onReset)) && (
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-stone-100">
          {totalCount !== undefined && (
            <span className="text-sm md:text-xs text-stone-500 font-medium">
              <strong className="text-stone-900 font-semibold">
                {totalCount}
              </strong>{" "}
              {totalLabel}
            </span>
          )}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="min-h-[44px] md:min-h-0 px-2 md:px-0 text-sm md:text-xs text-[#3B001B] md:text-stone-500 hover:text-stone-900 underline font-semibold md:font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Mobile Filter Bottom Sheet (< md) */}
      {hasFilters && (
        <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <DrawerContent className="max-h-[85dvh] rounded-t-3xl bg-white border-stone-200 pb-[env(safe-area-inset-bottom)]">
            <DrawerHeader className="text-left pb-3 border-b border-stone-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <DrawerTitle className="text-lg font-bold text-stone-900">
                    Filter Results
                  </DrawerTitle>
                  <DrawerDescription className="text-sm text-stone-500 mt-0.5">
                    Refine displayed records below
                  </DrawerDescription>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterDrawerOpen(false)}
                  aria-label="Close filters"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
            </DrawerHeader>

            <div className="overflow-y-auto p-4 flex flex-col gap-3.5 [&_select]:w-full [&_select]:min-h-[48px] [&_select]:text-base [&_select]:px-3.5 [&_select]:rounded-xl [&_input]:w-full [&_input]:min-h-[48px] [&_input]:text-base [&_button]:min-h-[44px] [&_button]:text-sm">
              {children}
            </div>

            <DrawerFooter className="border-t border-stone-100 pt-3 flex-row gap-3">
              {onReset && (
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setFilterDrawerOpen(false);
                  }}
                  className="flex-1 min-h-[48px] rounded-xl border border-stone-200 bg-white text-stone-700 text-base font-semibold active:bg-stone-50"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 min-h-[48px] rounded-xl bg-[#3B001B] text-white text-base font-semibold active:bg-[#46001D] shadow-sm"
              >
                Apply Filters
              </button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
