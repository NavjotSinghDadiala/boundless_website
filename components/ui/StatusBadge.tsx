import * as React from "react"
import { cn } from "@/lib/utils"

export type RegistrationStatus =
  | "registered"
  | "action_required"
  | "approved_to_pay"
  | "mail_sent"
  | "paid"
  | "rejected"
  | "verified"
  | "pending"
  | "processing"
  | "completed"
  | "unavailable"
  | string

interface StatusConfig {
  label: string
  icon?: string
  classes: string
}

const STATUS_MAP: Record<string, StatusConfig> = {
  registered: {
    label: "Under Review",
    icon: "⏳",
    classes: "bg-amber-50 text-amber-900 border-amber-200/80",
  },
  action_required: {
    label: "Action Required",
    icon: "⚠️",
    classes: "bg-orange-50 text-orange-900 border-orange-200/80 animate-pulse",
  },
  approved_to_pay: {
    label: "Approved to Pay",
    icon: "💳",
    classes: "bg-sky-50 text-sky-900 border-sky-200/80",
  },
  mail_sent: {
    label: "Mail Sent",
    icon: "✉️",
    classes: "bg-indigo-50 text-indigo-900 border-indigo-200/80",
  },
  paid: {
    label: "Registration Confirmed",
    icon: "✓",
    classes: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
  },
  rejected: {
    label: "Unsuccessful",
    icon: "✕",
    classes: "bg-rose-50 text-rose-900 border-rose-200/80",
  },
  verified: {
    label: "Verified ✓",
    icon: "✓",
    classes: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
  },
  pending: {
    label: "Pending",
    icon: "⏳",
    classes: "bg-amber-50 text-amber-900 border-amber-200/80",
  },
  processing: {
    label: "Processing",
    icon: "⚙️",
    classes: "bg-sky-50 text-sky-900 border-sky-200/80",
  },
  completed: {
    label: "Completed ✓",
    icon: "✓",
    classes: "bg-emerald-50 text-emerald-900 border-emerald-200/80",
  },
  unavailable: {
    label: "Unavailable",
    icon: "—",
    classes: "bg-stone-100 text-stone-600 border-stone-200",
  },
}

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: RegistrationStatus
  customLabel?: string
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
}

export function StatusBadge({
  status,
  customLabel,
  showIcon = true,
  size = "md",
  className,
  ...props
}: StatusBadgeProps) {
  const normalizedKey = (status || "").toLowerCase().trim()
  const config = STATUS_MAP[normalizedKey] || {
    label: customLabel || status || "Unknown",
    icon: "•",
    classes: "bg-stone-50 text-stone-800 border-stone-200",
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3.5 py-1.5 text-sm gap-2",
  }[size]

  return (
    <span
      className={cn(
        "inline-flex items-center font-oswald uppercase tracking-wider font-bold rounded-full border shadow-sm select-none",
        sizeClasses,
        config.classes,
        className
      )}
      {...props}
    >
      {showIcon && config.icon && (
        <span className="text-[11px] leading-none shrink-0" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span>{customLabel || config.label}</span>
    </span>
  )
}
