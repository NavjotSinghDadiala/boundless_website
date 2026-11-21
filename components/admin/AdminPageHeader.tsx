"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, MoreHorizontalIcon, XIcon } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  badge,
  primaryAction,
  secondaryActions,
  breadcrumbs,
  className = "",
}: AdminPageHeaderProps) {
  const [actionsDrawerOpen, setActionsDrawerOpen] = useState(false);

  return (
    <div
      className={`flex flex-col gap-3 pb-5 md:pb-6 border-b border-stone-200/80 mb-5 md:mb-6 ${className}`}
    >
      {/* Breadcrumbs: Desktop only (Mobile SiteHeader provides title & back nav) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="hidden md:flex items-center text-xs text-stone-500 gap-1.5 flex-wrap">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <React.Fragment key={index}>
                {index > 0 && (
                  <ChevronRightIcon className="size-3 text-stone-400" />
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-stone-900 transition-colors font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-stone-900 font-semibold" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 sm:space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-[24px] leading-tight sm:text-3xl font-bold tracking-tight text-stone-900">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-sm text-stone-600 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Mobile Actions (< sm): Full-width 48px primary CTA + overflow sheet for secondary actions */}
        {(primaryAction || secondaryActions) && (
          <div className="flex sm:hidden items-center gap-2.5 w-full">
            {primaryAction && (
              <div className="flex-1 min-w-0 [&>*]:w-full [&>*]:min-h-[48px] [&>*]:justify-center [&>*]:text-base [&>*]:py-3">
                {primaryAction}
              </div>
            )}

            {secondaryActions && (
              <>
                <button
                  type="button"
                  onClick={() => setActionsDrawerOpen(true)}
                  aria-label="More page actions"
                  className={`${
                    primaryAction ? "w-12 shrink-0" : "w-full px-4 gap-2"
                  } min-h-[48px] rounded-xl border border-stone-200 bg-white text-stone-700 active:bg-stone-50 flex items-center justify-center font-semibold text-base shadow-2xs`}
                >
                  <MoreHorizontalIcon className="size-5" />
                  {!primaryAction && <span>Actions</span>}
                </button>

                <Drawer
                  open={actionsDrawerOpen}
                  onOpenChange={setActionsDrawerOpen}
                >
                  <DrawerContent className="rounded-t-3xl bg-white border-stone-200 pb-[env(safe-area-inset-bottom)]">
                    <DrawerHeader className="text-left pb-3 border-b border-stone-100">
                      <div className="flex items-center justify-between gap-2">
                        <DrawerTitle className="text-lg font-bold text-stone-900">
                          More Actions
                        </DrawerTitle>
                        <button
                          type="button"
                          onClick={() => setActionsDrawerOpen(false)}
                          aria-label="Close actions menu"
                          className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 active:bg-stone-100"
                        >
                          <XIcon className="size-5" />
                        </button>
                      </div>
                    </DrawerHeader>
                    <div
                      onClick={() => setActionsDrawerOpen(false)}
                      className="p-4 flex flex-col gap-2.5 [&_a]:w-full [&_a]:min-h-[48px] [&_a]:justify-center [&_a]:text-base [&_button]:w-full [&_button]:min-h-[48px] [&_button]:justify-center [&_button]:text-base [&>div]:flex [&>div]:flex-col [&>div]:gap-2.5 [&>div]:w-full"
                    >
                      {secondaryActions}
                    </div>
                  </DrawerContent>
                </Drawer>
              </>
            )}
          </div>
        )}

        {/* Desktop Actions (>= sm — Preserved) */}
        {(primaryAction || secondaryActions) && (
          <div className="hidden sm:flex items-center gap-2.5 flex-wrap self-auto shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </div>
  );
}
