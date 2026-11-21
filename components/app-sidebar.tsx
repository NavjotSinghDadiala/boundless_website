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
  GraduationCap,
  XIcon,
} from "lucide-react";

import { NavMain, type NavMainGroup } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { AdminContext } from "@/lib/adminAuth";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  admin?: AdminContext;
}

export default function AppSidebar({ admin, ...props }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const navGroups: NavMainGroup[] = [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboardIcon,
          requiredLevel: "standard",
        },
      ],
    },
    {
      label: "Trips & Registrations",
      items: [
        {
          title: "Upcoming Trips",
          url: "/admin/trip/upcoming",
          icon: CalendarIcon,
          requiredLevel: "standard",
        },
        {
          title: "All Trips & Expeditions",
          url: "/admin/trip",
          icon: CompassIcon,
          requiredLevel: "full", // RESTRICTED SECTION 1
        },
        {
          title: "Previous Trips",
          url: "/admin/previous-trips",
          icon: Plane,
          requiredLevel: "standard",
        },
        {
          title: "Registrations",
          url: "/admin/registrations",
          icon: ClipboardListIcon,
          requiredLevel: "full", // RESTRICTED SECTION 2
        },
      ],
    },
    {
      label: "Students & Coordinators",
      items: [
        {
          title: "Students",
          url: "/admin/students",
          icon: GraduationCap,
          requiredLevel: "standard",
        },
        {
          title: "Trip Coordinators",
          url: "/admin/coordinators",
          icon: ShieldCheck,
          requiredLevel: "full", // RESTRICTED SECTION 3
        },
      ],
    },
    {
      label: "Community & Events",
      items: [
        {
          title: "City Meetups",
          url: "/admin/city-meetups",
          icon: MapPinIcon,
          requiredLevel: "standard",
        },
        {
          title: "WhatsApp Groups",
          url: "/admin/whatsapp",
          icon: MessageSquare,
          requiredLevel: "standard",
        },
        {
          title: "Team",
          url: "/admin/team",
          icon: UsersIcon,
          requiredLevel: "standard",
        },
      ],
    },
    {
      label: "Content & Media",
      items: [
        {
          title: "Gallery",
          url: "/admin/gallery",
          icon: CameraIcon,
          requiredLevel: "standard",
        },
        {
          title: "Proud Section",
          url: "/admin/proud",
          icon: Award,
          requiredLevel: "standard",
        },
      ],
    },
    {
      label: "Governance & Settings",
      items: [
        {
          title: "HOD Election",
          url: "/admin/election",
          icon: Vote,
          requiredLevel: "standard",
        },
        {
          title: "Homepage Settings",
          url: "/admin/settings",
          icon: SettingsIcon,
          requiredLevel: "standard",
        },
        {
          title: "Admin Access",
          url: "/admin/users",
          icon: UserCheckIcon,
          requiredLevel: "full", // RESTRICTED SECTION 4
        },
      ],
    },
  ];

  const currentUser = {
    name: admin?.name || "Administrator",
    email: admin?.email || "admin@boundlesssociety.in",
    avatar: "/placeholder-user.jpg",
    studentId: admin?.studentId,
    permissionLevel: admin?.permissionLevel || "standard",
  };

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-stone-200/80 bg-white"
      {...props}
    >
      <SidebarHeader className="border-b border-stone-100 px-4 py-3.5 md:p-4">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between gap-2">
            <Link
              href="/admin"
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className="flex items-center gap-3 p-1 rounded-lg hover:bg-stone-50 transition-colors group min-w-0 flex-1"
            >
              <div className="size-10 md:size-9 rounded-xl bg-[#3B001B] flex items-center justify-center overflow-hidden border border-amber-300/30 shadow-sm shrink-0">
                <Image
                  src="/Logo Bound.png"
                  alt="Boundless"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base md:text-sm font-bold tracking-tight text-stone-900 group-hover:text-[#3B001B] transition-colors truncate">
                  Boundless
                </span>
                <span className="text-xs md:text-[10px] font-semibold tracking-wider uppercase text-stone-500 truncate">
                  Operations Console
                </span>
              </div>
            </Link>

            {isMobile && (
              <button
                type="button"
                onClick={() => setOpenMobile(false)}
                aria-label="Close navigation menu"
                className="w-11 h-11 rounded-xl flex items-center justify-center text-stone-500 active:bg-stone-100 shrink-0"
              >
                <XIcon className="size-5" />
              </button>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-2 overflow-y-auto overscroll-contain">
        <NavMain groups={navGroups} adminPermissionLevel={admin?.permissionLevel} />
      </SidebarContent>

      <SidebarFooter className="border-t border-stone-100 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3 bg-stone-50/50">
        <NavUser user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  );
}
