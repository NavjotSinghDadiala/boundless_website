"use client";

import React from "react";
import { Loader2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminLoadingState({
  text = "Loading data...",
  type = "spinner",
  rows = 5,
  cards = 4,
  className = "",
}: {
  text?: string;
  type?: "spinner" | "table" | "cards" | "form";
  rows?: number;
  cards?: number;
  className?: string;
}) {
  if (type === "spinner") {
    return (
      <div
        className={`flex flex-col items-center justify-center py-16 gap-3 text-stone-400 ${className}`}
      >
        <Loader2Icon className="size-8 animate-spin text-[#3B001B]" />
        <p className="text-xs font-medium text-stone-500">{text}</p>
      </div>
    );
  }

  if (type === "cards") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-stone-200/80 bg-white shadow-sm space-y-3"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-20 bg-stone-100" />
              <Skeleton className="size-8 rounded-lg bg-stone-100" />
            </div>
            <Skeleton className="h-7 w-16 bg-stone-100" />
            <Skeleton className="h-3 w-32 bg-stone-100" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className={`rounded-xl border border-stone-200/80 bg-white overflow-hidden shadow-sm ${className}`}>
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex gap-4">
          <Skeleton className="h-4 w-28 bg-stone-200/70" />
          <Skeleton className="h-4 w-40 bg-stone-200/70" />
          <Skeleton className="h-4 w-24 bg-stone-200/70" />
        </div>
        <div className="divide-y divide-stone-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <Skeleton className="size-9 rounded-full bg-stone-100 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-48 bg-stone-100" />
                  <Skeleton className="h-3 w-32 bg-stone-100" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full bg-stone-100" />
              <Skeleton className="h-8 w-16 rounded-md bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "form") {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="p-6 rounded-xl border border-stone-200/80 bg-white space-y-4">
          <Skeleton className="h-5 w-40 bg-stone-100" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full bg-stone-100" />
            <Skeleton className="h-10 w-full bg-stone-100" />
          </div>
          <Skeleton className="h-24 w-full bg-stone-100" />
        </div>
      </div>
    );
  }

  return null;
}
