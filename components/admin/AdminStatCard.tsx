"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  badge?: string;
  href?: string;
  variant?: "maroon" | "amber" | "emerald" | "blue" | "stone";
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  badge,
  href,
  variant = "maroon",
  className = "",
}: AdminStatCardProps) {
  const variantStyles = {
    maroon: {
      iconBg: "bg-[#3B001B]/10 text-[#3B001B]",
      accent: "hover:border-[#3B001B]/30",
    },
    amber: {
      iconBg: "bg-amber-100 text-amber-800",
      accent: "hover:border-amber-400",
    },
    emerald: {
      iconBg: "bg-emerald-100 text-emerald-800",
      accent: "hover:border-emerald-400",
    },
    blue: {
      iconBg: "bg-sky-100 text-sky-800",
      accent: "hover:border-sky-400",
    },
    stone: {
      iconBg: "bg-stone-100 text-stone-700",
      accent: "hover:border-stone-400",
    },
  }[variant];

  const content = (
    <div
      className={`group relative bg-white rounded-xl border border-stone-200/80 p-5 shadow-sm transition-all duration-200 hover:shadow-md ${variantStyles.accent} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {value}
            </span>
            {badge && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-stone-500 pt-0.5">{subtitle}</p>
          )}
        </div>

        <div className={`p-3 rounded-xl ${variantStyles.iconBg} shrink-0`}>
          <Icon className="size-5" />
        </div>
      </div>

      {href && (
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 group-hover:text-stone-900 transition-colors">
          <span>View details</span>
          <ArrowUpRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
