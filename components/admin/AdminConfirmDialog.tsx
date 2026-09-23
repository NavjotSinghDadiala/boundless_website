"use client";

import React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Loader2Icon, AlertTriangleIcon, InfoIcon } from "lucide-react";

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
  const confirmStyles = {
    danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500",
    primary: "bg-[#3B001B] hover:bg-[#46001D] text-white focus:ring-[#3B001B]",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
  }[variant];

  const Icon = variant === "danger" || variant === "warning" ? AlertTriangleIcon : InfoIcon;
  const iconColor = {
    danger: "text-rose-600 bg-rose-50",
    primary: "text-[#3B001B] bg-[#3B001B]/10",
    warning: "text-amber-600 bg-amber-50",
  }[variant];

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-stone-200 bg-white p-6 shadow-xl duration-200 sm:rounded-2xl animate-in fade-in-0 zoom-in-95">
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
