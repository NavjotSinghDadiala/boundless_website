"use client";

import React from "react";
import { XIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface AdminResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string;
}

/**
 * Reusable responsive modal primitive for Admin modules:
 * - Mobile (< 768px): Native `vaul` Bottom Drawer with safe-area padding & scrollable body.
 * - Desktop (>= 768px): Centered overlay modal with backdrop blur.
 */
export function AdminResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidthClassName = "max-w-lg",
}: AdminResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90dvh] rounded-t-3xl bg-white border-stone-200 pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left pb-3 border-b border-stone-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <DrawerTitle className="text-xl font-bold text-stone-900 leading-snug">
                  {title}
                </DrawerTitle>
                {description && (
                  <DrawerDescription className="text-sm text-stone-600 mt-1">
                    {description}
                  </DrawerDescription>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close dialog"
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100 shrink-0"
              >
                <XIcon className="size-5" />
              </button>
            </div>
          </DrawerHeader>

          <div className="overflow-y-auto px-4 py-4 flex-1">{children}</div>

          {footer && (
            <DrawerFooter className="border-t border-stone-100 pt-3">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClassName} max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-stone-100 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-stone-900 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-stone-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors shrink-0"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 flex-1">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
