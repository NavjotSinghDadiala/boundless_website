"use client";

import React from "react";

interface AdminTableProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}

export function AdminTable({
  children,
  className = "",
  wrapperClassName = "",
}: AdminTableProps) {
  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-sm ${wrapperClassName}`}
    >
      <div className="overflow-x-auto w-full min-w-0">
        <table className={`w-full text-left text-sm text-stone-700 ${className}`}>
          {children}
        </table>
      </div>
    </div>
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
