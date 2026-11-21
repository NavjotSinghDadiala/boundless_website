"use client";

import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Loader2Icon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface AdminConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function AdminConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  loading = false,
}: AdminConfirmDialogProps) {
  const isMobile = useIsMobile();

  const confirmStyles = {
    danger: "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white focus:ring-rose-500",
    primary: "bg-[#3B001B] hover:bg-[#46001D] active:bg-[#2B0014] text-white focus:ring-[#3B001B]",
    warning: "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white focus:ring-amber-500",
  }[variant];

  const Icon =
    variant === "danger" || variant === "warning"
      ? AlertTriangleIcon
      : InfoIcon;
  const iconColor = {
    danger: "text-rose-600 bg-rose-50",
    primary: "text-[#3B001B] bg-[#3B001B]/10",
    warning: "text-amber-600 bg-amber-50",
  }[variant];

  // Mobile-native vaul Bottom Drawer (< 768px)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
        <DrawerContent className="rounded-t-3xl bg-white border-stone-200 pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left pb-2">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl shrink-0 ${iconColor}`}>
                <Icon className="size-6" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <DrawerTitle className="text-xl font-bold text-stone-900 leading-snug">
                  {title}
                </DrawerTitle>
                <DrawerDescription className="text-base text-stone-600 leading-relaxed">
                  {description}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <DrawerFooter className="pt-4 gap-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={async (e) => {
                e.preventDefault();
                await onConfirm();
              }}
              className={`w-full min-h-[48px] inline-flex items-center justify-center rounded-xl px-4 py-3 text-base font-semibold shadow-sm transition-all disabled:opacity-50 ${confirmStyles}`}
            >
              {loading && <Loader2Icon className="mr-2 size-5 animate-spin" />}
              {confirmText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="w-full min-h-[48px] inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-700 active:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop AlertDialog (>= 768px — Preserved)
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-stone-200 bg-white p-6 shadow-xl duration-200 rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-xl shrink-0 ${iconColor}`}>
              <Icon className="size-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <AlertDialogPrimitive.Title className="text-lg font-semibold text-stone-900 tracking-tight">
                {title}
              </AlertDialogPrimitive.Title>
              <AlertDialogPrimitive.Description className="text-sm text-stone-600 leading-relaxed">
                {description}
              </AlertDialogPrimitive.Description>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-stone-100">
            <AlertDialogPrimitive.Cancel
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </AlertDialogPrimitive.Cancel>
            <button
              type="button"
              disabled={loading}
              onClick={async (e) => {
                e.preventDefault();
                await onConfirm();
              }}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${confirmStyles}`}
            >
              {loading && <Loader2Icon className="mr-2 size-3.5 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
