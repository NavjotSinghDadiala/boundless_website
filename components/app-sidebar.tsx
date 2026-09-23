"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CameraIcon,
  ClipboardListIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
  Plane,
  CalendarIcon,
  MapPinIcon,
  Vote,
  MessageSquare,
  Award,
  CompassIcon,
  UserCheckIcon,
  ShieldCheck,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Admin",
    email: "admin@boundless.com",
    avatar: "/placeholder-user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Upcoming Trips",
      url: "/admin/trip/upcoming",
      icon: CalendarIcon,
    },
    {
      title: "All Trips & Expeditions",
      url: "/admin/trip",
      icon: CompassIcon,
    },
    {
      title: "Previous Trips",
      url: "/admin/previous-trips",
      icon: Plane,
    },
    {
      title: "Registrations",
      url: "/admin/registrations",
      icon: ClipboardListIcon,
    },
    {
      title: "Trip Coordinators",
      url: "/admin/coordinators",
      icon: ShieldCheck,
    },
    {
      title: "Gallery",
      url: "/admin/gallery",
      icon: CameraIcon,
    },
    {
      title: "City Meetups",
      url: "/admin/city-meetups",
      icon: MapPinIcon,
    },
    {
      title: "HOD Election",
      url: "/admin/election",
      icon: Vote,
    },
    {
      title: "Team",
      url: "/admin/team",
      icon: UsersIcon,
    },
    {
      title: "WhatsApp Groups",
      url: "/admin/whatsapp",
      icon: MessageSquare,
    },
    {
      title: "Proud Section",
      url: "/admin/proud",
      icon: Award,
    },
    {
      title: "Homepage Settings",
      url: "/admin/settings",
      icon: SettingsIcon,
    },
    {
      title: "Registered Users",
      url: "/admin/users",
      icon: UserCheckIcon,
    },
  ],
};

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" className="border-r border-stone-200/80 bg-white" {...props}>
      <SidebarHeader className="border-b border-stone-100 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              href="/admin"
              className="flex items-center gap-3 p-1 rounded-lg hover:bg-stone-50 transition-colors group"
            >
              <div className="size-9 rounded-xl bg-[#3B001B] flex items-center justify-center overflow-hidden border border-amber-300/30 shadow-sm shrink-0">
                <Image
                  src="/Logo Bound.png"
                  alt="Boundless"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-stone-900 group-hover:text-[#3B001B] transition-colors truncate">
                  Boundless
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-stone-500">
                  Operations Console
                </span>
              </div>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter className="border-t border-stone-100 p-3 bg-stone-50/50">
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}