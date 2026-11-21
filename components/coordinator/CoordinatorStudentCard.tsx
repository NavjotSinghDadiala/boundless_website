"use client";

import { MessageSquareWarningIcon, PhoneIcon } from "lucide-react";
import type { ApprovedStudent, Concern } from "./types";

interface CoordinatorStudentCardProps {
  student: ApprovedStudent;
  studentConcerns: Concern[];
  onRaiseConcern: (student: ApprovedStudent) => void;
}

export function CoordinatorStudentCard({
  student,
  studentConcerns,
  onRaiseConcern,
}: CoordinatorStudentCardProps) {
  return (
    <div className="bg-white border border-[#E2D9CE] md:hover:border-[#C5A059] rounded-2xl md:rounded-xl p-4 shadow-xs transition flex flex-col justify-between gap-3.5 md:gap-0">
      <div>
        <div className="flex justify-between items-start gap-2.5">
          <h3 className="font-serif font-bold text-base md:text-sm text-[#5B1313] leading-snug break-words min-w-0">
            {student.name}
          </h3>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs md:text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
            Approved
          </span>
        </div>

        <div className="mt-2 md:mt-2.5 flex items-center gap-2 text-sm md:text-xs text-stone-600">
          <PhoneIcon className="w-4 h-4 md:w-3.5 md:h-3.5 text-stone-400 shrink-0" />
          {student.phone ? (
            <a
              href={`tel:${student.phone}`}
              className="text-[#5B1313] hover:underline font-semibold tracking-wide"
            >
              {student.phone}
            </a>
          ) : (
            <span className="text-stone-400 italic">No phone provided</span>
          )}
        </div>

        {studentConcerns.length > 0 && (
          <div className="mt-3 md:mt-2.5 border-l-3 border-amber-500 pl-3 py-1 bg-amber-50/70 md:bg-amber-50 md:border md:border-amber-200 rounded-r-lg md:rounded-lg md:p-2 text-sm md:text-[11px] text-amber-950 md:text-amber-900 leading-relaxed">
            <span className="font-bold">⚠️ Flagged Note:</span>{" "}
            {studentConcerns[0].concernText}
            {studentConcerns.length > 1 && (
              <span className="ml-1 text-amber-700 font-semibold">
                (+{studentConcerns.length - 1} more)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile Action Row (Prominent 48px Call + Flag Concern buttons) */}
      <div className="md:hidden grid grid-cols-2 gap-2.5 pt-1">
        {student.phone ? (
          <a
            href={`tel:${student.phone}`}
            className="min-h-[48px] px-3 py-2.5 rounded-xl bg-[#5B1313] active:bg-[#450A0A] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors"
          >
            <PhoneIcon className="w-4 h-4 shrink-0" />
            <span>Call</span>
          </a>
        ) : (
          <span className="min-h-[48px] px-3 py-2.5 rounded-xl bg-stone-100 text-stone-400 text-sm font-medium flex items-center justify-center gap-2">
            <PhoneIcon className="w-4 h-4 shrink-0" />
            <span>No Phone</span>
          </span>
        )}

        <button
          type="button"
          onClick={() => onRaiseConcern(student)}
          className="min-h-[48px] px-3 py-2.5 rounded-xl bg-amber-50 active:bg-amber-100 text-amber-900 border border-amber-300 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <MessageSquareWarningIcon className="w-4 h-4 shrink-0" />
          <span>Flag Concern</span>
        </button>
      </div>

      {/* Desktop Action Footer (Preserved) */}
      <div className="hidden md:flex mt-4 pt-3 border-t border-stone-100 items-center justify-between">
        {student.phone && (
          <a
            href={`tel:${student.phone}`}
            className="text-xs font-bold text-stone-600 hover:text-[#5B1313] flex items-center gap-1"
          >
            <PhoneIcon className="w-3 h-3" /> Call
          </a>
        )}
        <button
          type="button"
          onClick={() => onRaiseConcern(student)}
          className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md transition cursor-pointer ml-auto"
        >
          Raise Concern
        </button>
      </div>
    </div>
  );
}
