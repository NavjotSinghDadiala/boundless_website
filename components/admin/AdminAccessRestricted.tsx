"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlertIcon, ArrowLeftIcon, LockIcon } from "lucide-react";

interface AdminAccessRestrictedProps {
  sectionTitle: string;
  requiredLevel?: string;
  description?: string;
}

export function AdminAccessRestricted({
  sectionTitle,
  requiredLevel = "Full Administrator",
  description = "This administrative module contains sensitive operational controls and financial/roster records. Elevated privileges are required to view or modify this resource.",
}: AdminAccessRestrictedProps) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-white border border-rose-200/80 shadow-lg text-center flex flex-col items-center">
        <div className="size-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlertIcon className="size-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100/70 text-rose-900 border border-rose-200 mb-2">
          <LockIcon className="size-3" />
          Access Restricted
        </div>

        <h1 className="text-xl sm:text-2xl font-oswald font-bold uppercase tracking-wide text-stone-900">
          {sectionTitle}
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed max-w-md">
          {description}
        </p>

        <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 my-5 text-left text-xs">
          <div className="flex justify-between items-center py-1 border-b border-stone-200/60">
            <span className="text-stone-500 font-medium">Required Clearance:</span>
            <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
              {requiredLevel}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 pt-1.5">
            <span className="text-stone-500 font-medium">Your Current Role:</span>
            <span className="font-semibold text-stone-700 bg-stone-200/60 px-2 py-0.5 rounded">
              Standard Administrator
            </span>
          </div>
        </div>

        <p className="text-[11px] text-stone-400 mb-6">
          If you require access to this section, please contact an active Full Administrator or the Society Secretariat.
        </p>

        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B001B] hover:bg-[#46001D] text-[#FFE878] font-oswald uppercase tracking-wider text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeftIcon className="size-4" />
          Return to Operations Dashboard
        </Link>
      </div>
    </div>
  );
}
