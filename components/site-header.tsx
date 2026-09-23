"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  gallery: "Photo Gallery",
  "city-meetups": "City Meetups",
  election: "HOD Election",
  team: "Team",
  whatsapp: "WhatsApp Groups",
  proud: "Proud Section",
  settings: "Homepage Settings",
  users: "Users",
  "blocked-users": "Blocked Users",
  add: "Add New",
  edit: "Edit",
  view: "Overview",
};

function formatSegment(segment: string): string {
  if (routeLabels[segment]) {
    return routeLabels[segment];
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function SiteHeader() {
  const pathname = usePathname();
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

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm px-4 lg:px-6 transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 text-stone-600 hover:text-stone-900" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 bg-stone-200"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => (
                <React.Fragment key={item.path}>
                  {index > 0 && <BreadcrumbSeparator className="text-stone-300" />}
                  <BreadcrumbItem>
                    {item.isLast ? (
                      <BreadcrumbPage className="font-semibold text-stone-900 text-xs sm:text-sm">
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={item.path}
                          className="text-stone-500 hover:text-stone-800 transition-colors text-xs sm:text-sm"
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

        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operations Active
          </span>
        </div>
      </div>
    </header>
  );
}
