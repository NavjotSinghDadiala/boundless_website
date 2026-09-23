"use client";

import React from "react";

interface AdminCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

export function AdminCard({
  children,
  title,
  subtitle,
  icon: Icon,
  headerActions,
  footer,
  className = "",
  bodyClassName = "",
  noPadding = false,
}: AdminCardProps) {
  const hasHeader = Boolean(title || subtitle || headerActions || Icon);

  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col transition-all ${className}`}
    >
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-stone-100 bg-stone-50/40">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="flex items-center justify-center size-8 rounded-lg bg-[#3B001B]/5 text-[#3B001B]">
                <Icon className="size-4" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-stone-900 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {headerActions}
            </div>
          )}
        </div>
      )}

      <div className={`${noPadding ? "" : "p-5 sm:p-6"} flex-1 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 sm:px-6 py-3.5 bg-stone-50/60 border-t border-stone-100 text-xs text-stone-500 flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

export function AdminSection({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || subtitle) && (
        <div className="space-y-0.5">
          {title && (
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
