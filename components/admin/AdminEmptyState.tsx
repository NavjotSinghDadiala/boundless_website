"use client";

import React from "react";
import { FolderOpenIcon } from "lucide-react";

interface AdminEmptyStateProps {
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export function AdminEmptyState({
  title,
  description,
  icon: Icon = FolderOpenIcon,
  action,
  compact = false,
  className = "",
}: AdminEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 ${
        compact ? "py-8 px-4" : "py-16 px-6"
      } ${className}`}
    >
      <div className="flex items-center justify-center size-12 rounded-full bg-stone-100 text-stone-400 mb-3.5">
        <Icon className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-stone-900 tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
