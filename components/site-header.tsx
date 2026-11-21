"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeftIcon, MenuIcon } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  admin: "Dashboard",
  trip: "Trips",
  upcoming: "Upcoming Trips",
  "previous-trips": "Previous Trips",
  registrations: "Registrations",
  students: "Students",
  coordinators: "Trip Coordinators",
  gallery: "Photo Gallery",
  "city-meetups": "City Meetups",
  campaigns: "Campaigns",
  election: "HOD Election",
  team: "Team",
  whatsapp: "WhatsApp Groups",
  proud: "Proud Section",
  marquee: "Marquee",
  stats: "Stats",
  settings: "Homepage Settings",
  users: "Admin Access",
  "blocked-users": "Blocked Users",
  add: "Add New",
  edit: "Edit",
  view: "Overview",
};

function isLikelyDynamicId(segment: string): boolean {
  if (routeLabels[segment]) return false;
  return segment.length >= 12 || /^[a-zA-Z0-9_-]{8,}$/.test(segment) && /\d/.test(segment);
}

function formatSegment(segment: string): string {
  if (routeLabels[segment]) {
    return routeLabels[segment];
  }
  if (isLikelyDynamicId(segment)) {
    return "Details";
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SiteHeader({
  mobileAction,
}: {
  mobileAction?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbItems = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    const label = formatSegment(segment);
    const isLast = index === segments.length - 1;

    return {
      label,
      path,
      isLast,
    };
  });

  // Derive mobile page title and contextual back link for nested routes (depth > 2, e.g. /admin/students/[uid])
  const currentTitle =
    breadcrumbItems.length > 0
      ? breadcrumbItems[breadcrumbItems.length - 1].label
      : "Dashboard";

  let mobileBackHref: string | null = null;
  if (segments.length > 2) {
    // e.g. /admin/trip/view/[id] -> /admin/trip; /admin/students/[uid] -> /admin/students
    const secondLast = segments[segments.length - 2];
    if (secondLast === "view" || secondLast === "edit") {
      mobileBackHref = "/" + segments.slice(0, segments.length - 2).join("/");
    } else {
      mobileBackHref = "/" + segments.slice(0, segments.length - 1).join("/");
    }
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-stone-200/80 bg-white/95 backdrop-blur-md pt-[env(safe-area-inset-top)] transition-[width,height] ease-linear">
      {/* Mobile Compact Header (< 768px) */}
      <div className="flex md:hidden h-14 w-full items-center justify-between gap-2 px-2.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation menu"
            className="w-12 h-12 rounded-xl flex items-center justify-center text-stone-700 active:bg-stone-100 shrink-0"
          >
            <MenuIcon className="size-6" />
          </button>

          <Link
            href="/admin"
            aria-label="Boundless Admin Home"
            className="size-8 rounded-lg bg-[#3B001B] flex items-center justify-center overflow-hidden border border-amber-300/30 shadow-2xs shrink-0"
          >
            <Image
              src="/Logo Bound.png"
              alt="Boundless"
              width={22}
              height={22}
              className="object-contain"
            />
          </Link>

          <span className="text-base font-bold tracking-tight text-stone-900 truncate pl-1">
            {currentTitle}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {mobileAction}
          {mobileBackHref && (
            <Link
              href={mobileBackHref}
              aria-label="Go back"
              className="min-w-[44px] h-11 px-2.5 rounded-xl flex items-center justify-center gap-0.5 text-sm font-semibold text-stone-600 active:bg-stone-100"
            >
              <ChevronLeftIcon className="size-4 shrink-0" />
              <span>Back</span>
            </Link>
          )}
        </div>
      </div>

      {/* Desktop Header (>= 768px — Preserved) */}
      <div className="hidden md:flex h-14 w-full items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 text-stone-600 hover:text-stone-900" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 bg-stone-200"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.path}>
                  {index > 0 && (
                    <BreadcrumbSeparator className="text-stone-300" />
                  )}
                  <BreadcrumbItem>
                    {item.isLast ? (
                      <BreadcrumbPage className="font-semibold text-stone-900 text-sm">
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={item.path}
                          className="text-stone-500 hover:text-stone-800 transition-colors text-sm"
                        >
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operations Active
          </span>
        </div>
      </div>
    </header>
  );
}
