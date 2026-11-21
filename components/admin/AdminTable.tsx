"use client";

import React, { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

interface AdminTableProps {
  children: React.ReactNode;
  /**
   * Optional mobile card representation (< md).
   * When provided, the desktop table renders on `md:` and up while `mobileContent`
   * renders on `< md` without horizontal scrolling.
   */
  mobileContent?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export function AdminTable({
  children,
  mobileContent,
  className = "",
  wrapperClassName = "",
}: AdminTableProps) {
  return (
    <>
      {mobileContent && <div className="md:hidden">{mobileContent}</div>}
      <div
        className={`${
          mobileContent ? "hidden md:block" : "block"
        } w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm ${wrapperClassName}`}
      >
        <div className="overflow-x-auto w-full min-w-0">
          <table
            className={`w-full text-left text-sm text-stone-700 ${className}`}
          >
            {children}
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminTableHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={`border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold uppercase tracking-wider text-stone-500 ${className}`}
    >
      {children}
    </thead>
  );
}

export function AdminTableBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tbody className={`divide-y divide-stone-100 bg-white ${className}`}>
      {children}
    </tbody>
  );
}

export function AdminTableRow({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-stone-50/80 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function AdminTableCell({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`px-4 sm:px-6 py-3.5 sm:py-4 align-middle text-xs sm:text-sm ${className}`}
    >
      {children}
    </td>
  );
}

export function AdminTableHeaderCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 sm:px-6 py-3.5 text-left font-semibold text-stone-600 ${className}`}
    >
      {children}
    </th>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Reusable Mobile Card Primitives for Responsive Table Replacement (< md)
 * ────────────────────────────────────────────────────────────────────────── */

export function AdminMobileCardList({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`space-y-3 ${className}`}>{children}</div>;
}

export interface AdminMobileCardFieldItem {
  label: string;
  value: React.ReactNode;
}

interface AdminMobileCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  leading?: React.ReactNode;
  fields?: AdminMobileCardFieldItem[];
  /** Secondary details hidden behind a 44px progressive-disclosure toggle */
  details?: React.ReactNode;
  detailsLabel?: string;
  /** Primary & contextual row actions (recommended 48px height buttons) */
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AdminMobileCard({
  title,
  subtitle,
  badge,
  leading,
  fields,
  details,
  detailsLabel = "More details",
  actions,
  onClick,
  className = "",
}: AdminMobileCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-3 ${
        onClick ? "cursor-pointer active:bg-stone-50/80" : ""
      } ${className}`}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {leading && <div className="shrink-0 mt-0.5">{leading}</div>}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-base font-bold text-stone-900 leading-snug break-words">
              {title}
            </div>
            {subtitle && (
              <div className="text-sm text-stone-600 break-words">
                {subtitle}
              </div>
            )}
          </div>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Key-Value Metadata Grid */}
      {fields && fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-2.5 border-t border-stone-100">
          {fields.map((field, idx) => (
            <div key={idx} className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {field.label}
              </dt>
              <dd className="text-sm font-medium text-stone-900 mt-0.5 break-words">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Progressive Disclosure Section */}
      {details && (
        <div
          className="pt-1 border-t border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-full min-h-[44px] flex items-center justify-between text-sm font-semibold text-[#3B001B] active:opacity-75"
          >
            <span>{expanded ? "Hide details" : detailsLabel}</span>
            <ChevronDownIcon
              className={`size-4 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {expanded && (
            <div className="pb-2 text-sm text-stone-700 space-y-2">
              {details}
            </div>
          )}
        </div>
      )}

      {/* Action Footer */}
      {actions && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-2.5 border-t border-stone-100 flex items-center gap-2.5 flex-wrap [&_a]:min-h-[44px] [&_button]:min-h-[44px]"
        >
          {actions}
        </div>
      )}
    </div>
  );
}
