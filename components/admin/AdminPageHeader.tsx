"use client";

import React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  badge,
  primaryAction,
  secondaryActions,
  breadcrumbs,
  className = "",
}: AdminPageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 pb-6 border-b border-stone-200/80 mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-xs text-stone-500 gap-1.5 flex-wrap">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRightIcon className="size-3 text-stone-400" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-stone-900 transition-colors font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-stone-900 font-semibold" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
