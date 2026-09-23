"use client";

import React from "react";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "maroon"
  | "amber";

interface AdminBadgeProps {
  children?: React.ReactNode;
  status?: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
}

export function AdminBadge({
  children,
  status,
  variant,
  size = "md",
  className = "",
}: AdminBadgeProps) {
  let computedVariant: BadgeVariant = variant || "neutral";
  let label = children;

  if (status) {
    const s = status.toLowerCase();
    if (s === "approved" || s === "approved_to_pay" || s === "mail_sent" || s === "paid" || s === "open") {
      computedVariant = "success";
      label = label || (s === "open" ? "Registration Open" : "Approved");
    } else if (s === "action_required" || s === "action required" || s === "draft") {
      computedVariant = "warning";
      label = label || (s === "draft" ? "Draft" : "Action Required");
    } else if (s === "rejected") {
      computedVariant = "danger";
      label = label || "Rejected";
    } else if (s === "revoked") {
      computedVariant = "neutral";
      label = label || "Revoked";
    } else if (s === "closed" || s === "registration closed") {
      computedVariant = "neutral";
      label = label || "Closed";
    } else if (s === "completed") {
      computedVariant = "info";
      label = label || "Completed";
    } else if (s === "registered" || s === "pending") {
      computedVariant = "amber";
      label = label || "Pending Approval";
    }
  }

  const variantClasses: Record<BadgeVariant, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    danger: "bg-rose-50 text-rose-700 border-rose-200/80",
    info: "bg-sky-50 text-sky-700 border-sky-200/80",
    neutral: "bg-stone-100 text-stone-600 border-stone-200",
    maroon: "bg-[#3B001B]/10 text-[#3B001B] border-[#3B001B]/20",
    amber: "bg-[#FFFBEA] text-amber-900 border-amber-300/80",
  };

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 font-medium",
    md: "text-xs px-2.5 py-0.5 font-medium",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border tracking-wide uppercase ${sizeClasses} ${variantClasses[computedVariant]} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {label}
    </span>
  );
}
