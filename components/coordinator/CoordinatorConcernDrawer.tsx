"use client";

import React from "react";
import { Loader2Icon, PhoneIcon, XIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { ApprovedStudent } from "./types";

interface CoordinatorConcernDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: ApprovedStudent | null;
  concernText: string;
  onConcernTextChange: (text: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const QUICK_REASONS = [
  "Unreachable on phone",
  "Delayed arrival",
  "Health / medical note",
  "Gear / ID check needed",
];

export function CoordinatorConcernDrawer({
  open,
  onOpenChange,
  student,
  concernText,
  onConcernTextChange,
  isSubmitting,
  onSubmit,
}: CoordinatorConcernDrawerProps) {
  const isMobile = useIsMobile();

  if (!student) return null;

  const handleQuickChip = (reason: string) => {
    const trimmed = concernText.trim();
    if (!trimmed) {
      onConcernTextChange(reason);
    } else if (!trimmed.toLowerCase().includes(reason.toLowerCase())) {
      onConcernTextChange(`${trimmed}. ${reason}`);
    }
  };

  // Mobile-native vaul Bottom Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh] rounded-t-3xl bg-[#FFFDF9] border-[#E2D9CE] pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left pb-3 border-b border-[#E2D9CE]/80">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="text-xl font-serif font-bold text-[#5B1313]">
                  Flag Student Concern
                </DrawerTitle>
                <DrawerDescription className="text-sm text-stone-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <strong className="text-stone-900">{student.name}</strong>
                  {student.phone && (
                    <span className="inline-flex items-center gap-1 text-stone-600">
                      <PhoneIcon className="w-3.5 h-3.5" />
                      {student.phone}
                    </span>
                  )}
                </DrawerDescription>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close concern drawer"
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100 shrink-0"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </DrawerHeader>

          <form onSubmit={onSubmit} className="overflow-y-auto p-4 space-y-4">
            {/* Quick-fill operational chips */}
            <div>
              <p className="text-sm font-semibold text-stone-700 mb-2">Quick tags</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleQuickChip(reason)}
                    className="min-h-[40px] px-3.5 py-2 rounded-full border border-[#E2D9CE] bg-white active:bg-[#FAF7F2] text-sm font-medium text-stone-700"
                  >
                    + {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="mobile-concern-textarea"
                className="block text-sm font-bold text-stone-800 mb-1.5"
              >
                Concern Details
              </label>
              <textarea
                id="mobile-concern-textarea"
                required
                rows={4}
                value={concernText}
                onChange={(e) => onConcernTextChange(e.target.value)}
                placeholder="Detail the concern (e.g. unreachable, delayed arrival, health consideration, gear check)..."
                className="w-full px-3.5 py-3 border border-stone-300 rounded-xl text-base bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B1313]/25 focus:border-[#5B1313] resize-y"
              />
            </div>

            <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E2D9CE] text-sm text-stone-700 leading-relaxed">
              ℹ️ Raising a concern flags this student for team coordination. It does not alter official registration status.
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !concernText.trim()}
                className="w-full min-h-[48px] bg-amber-800 active:bg-amber-900 text-white px-4 py-3 rounded-xl text-base font-semibold flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Concern</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-700 text-base font-semibold active:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop modal preserved as-is
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#C5A059]/40 rounded-2xl shadow-2xl p-6 max-w-md w-full relative">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-[#5B1313]">
              Flag Student Concern
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Student: <strong className="text-stone-800">{student.name}</strong> ({student.phone})
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Concern Details
            </label>
            <textarea
              required
              rows={3}
              value={concernText}
              onChange={(e) => onConcernTextChange(e.target.value)}
              placeholder="Detail the concern (e.g. unreachable, delayed arrival, health consideration, gear check)..."
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#5B1313] resize-y"
            />
          </div>

          <div className="bg-[#FAF7F2] p-3 rounded-lg border border-[#E2D9CE] text-[11px] text-stone-600 leading-relaxed">
            ℹ️ Raising a concern flags this student for team coordination. It does not alter official registration status.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !concernText.trim()}
              className="bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Concern</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
