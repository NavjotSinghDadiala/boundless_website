"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Search, X, Check } from "lucide-react";

interface LocationSelectProps {
  id?: string;
  label: string;
  required?: boolean;
  value: string;
  options: readonly string[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  error?: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export default function LocationSelect({
  id,
  label,
  required = true,
  value,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Type to search...",
  disabled = false,
  disabledPlaceholder = "Select state first",
  error,
  onChange,
  className = "",
}: LocationSelectProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options based on user search query
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.trim().toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearch("");
    }
  };

  return (
    <div
      className={`space-y-1.5 text-left relative ${isOpen ? "z-30" : "z-10"} ${className}`}
      ref={containerRef}
    >
      <label
        htmlFor={inputId}
        className="block text-xs font-bold uppercase tracking-wider text-[#3E1126] font-oswald"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Main trigger button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required}
        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between text-left border-2 ${
          disabled
            ? "bg-zinc-100 text-zinc-400 border-zinc-200/60 cursor-not-allowed"
            : error
            ? "bg-red-50/50 text-[#3E1126] border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : isOpen
            ? "bg-white text-[#3E1126] border-[#3E1126] shadow-sm ring-2 ring-[#3E1126]/10"
            : "bg-zinc-50 text-[#3E1126] border-transparent hover:border-zinc-300 focus:bg-white focus:border-[#3E1126]/30"
        }`}
      >
        <span className={`truncate ${!value ? "text-zinc-400 font-normal" : "text-[#3E1126] font-semibold"}`}>
          {disabled ? disabledPlaceholder : value || placeholder}
        </span>

        <div className="flex items-center gap-1 ml-2 shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-full hover:bg-zinc-200 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-[#3E1126]" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2 border-b border-stone-100 bg-stone-50/70 flex items-center gap-2">
            <Search className="w-4 h-4 text-stone-400 ml-1.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none py-1"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-48 sm:max-h-52 overflow-y-auto py-1 text-xs sm:text-sm custom-scrollbar"
            data-lenis-prevent
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-stone-400 font-medium">
                No matching locations found for &ldquo;{search}&rdquo;
              </li>
            ) : (
              filteredOptions.map((option, idx) => {
                const isSelected = value.toLowerCase() === option.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={option}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-[#3E1126]/10 text-[#3E1126] font-bold"
                        : isHighlighted
                        ? "bg-stone-100 text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#3E1126] shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Inline Validation Error */}
      {error && (
        <p className="text-xs font-semibold text-red-600 mt-1 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
