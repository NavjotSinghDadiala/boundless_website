"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { MapPinIcon, SearchIcon, CheckIcon, ChevronDownIcon, AlertTriangleIcon } from "lucide-react";
import {
  CANONICAL_CITY_LOCATIONS,
  resolveCanonicalCityLocation,
  type CanonicalCityLocation,
} from "@/lib/cityMapLocations";

interface CityLocationSelectProps {
  value: string;
  cityKey?: string | null;
  onSelect: (selection: {
    cityName: string;
    cityKey: string;
    mapX: number;
    mapY: number;
  }) => void;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export default function CityLocationSelect({
  value,
  cityKey,
  onSelect,
  disabled = false,
  label = "City (India Map Location)",
  required = true,
}: CityLocationSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const resolved = useMemo(
    () =>
      resolveCanonicalCityLocation({
        cityKey: cityKey || null,
        cityName: value || "",
      }),
    [value, cityKey]
  );

  const isLegacyUnmatched = Boolean(value && value.trim() && !resolved.matched);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CANONICAL_CITY_LOCATIONS;
    return CANONICAL_CITY_LOCATIONS.filter(
      (loc) =>
        loc.canonicalName.toLowerCase().includes(q) ||
        loc.key.toLowerCase().includes(q) ||
        loc.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [query]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleChoose = (loc: CanonicalCityLocation) => {
    onSelect({
      cityName: loc.canonicalName,
      cityKey: loc.key,
      mapX: loc.x,
      mapY: loc.y,
    });
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <label className="block text-sm font-semibold text-stone-800">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[48px] px-3.5 rounded-xl border border-stone-300 bg-white hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 flex items-center justify-between gap-2 text-left transition-colors disabled:opacity-60"
      >
        <span className="flex items-center gap-2 min-w-0">
          <MapPinIcon className="size-4 text-[#3B001B] shrink-0" />
          {value ? (
            <span className="truncate font-medium text-stone-900">
              {resolved.matched ? resolved.canonicalName : value}
            </span>
          ) : (
            <span className="text-stone-400">Select a city on the India map...</span>
          )}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {resolved.matched && (
            <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Map Ready
            </span>
          )}
          <ChevronDownIcon className="size-4 text-stone-400" />
        </span>
      </button>

      {isLegacyUnmatched && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Unmatched legacy location (&ldquo;{value}&rdquo;):</strong> Select a
            canonical city from the dropdown to plot this meetup accurately on the India map.
          </span>
        </div>
      )}

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2.5 border-b border-stone-100 bg-stone-50/70">
            <div className="relative">
              <SearchIcon className="size-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search supported India map cities (e.g. Mumbai, Pune, Gaya)..."
                className="w-full min-h-[40px] pl-9 pr-3 rounded-lg border border-stone-200 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredCities.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-stone-500">
                No matching map city found for &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filteredCities.map((loc) => {
                const isSelected = resolved.matched && resolved.key === loc.key;
                return (
                  <button
                    key={loc.key}
                    type="button"
                    onClick={() => handleChoose(loc)}
                    className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? "bg-[#3B001B]/10 text-[#3B001B] font-semibold"
                        : "text-stone-800 hover:bg-stone-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <span>{loc.canonicalName}</span>
                      {loc.aliases.length > 0 && (
                        <span className="ml-2 text-xs text-stone-400">
                          ({loc.aliases.join(", ")})
                        </span>
                      )}
                    </div>
                    {isSelected && <CheckIcon className="size-4 text-[#3B001B] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
