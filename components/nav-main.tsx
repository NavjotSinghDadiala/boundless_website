"use client";

import { type LucideIcon, LockIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  requiredLevel?: "standard" | "full";
}

export interface NavMainGroup {
  label: string;
  items: NavMainItem[];
}

export function NavMain({
  items,
  groups,
  adminPermissionLevel,
}: {
  items?: NavMainItem[];
  groups?: NavMainGroup[];
  adminPermissionLevel?: "standard" | "full";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleNavigate = (url: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    router.push(url);
  };

  const isFullAdmin = adminPermissionLevel === "full";

  const resolvedGroups: NavMainGroup[] =
    groups && groups.length > 0
      ? groups
      : items && items.length > 0
      ? [{ label: "", items }]
      : [];

  return (
    <div className="space-y-1">
      {resolvedGroups.map((group, groupIdx) => (
        <SidebarGroup
          key={group.label || `group-${groupIdx}`}
          className="px-2.5 py-1.5 md:px-2 md:py-1"
        >
          {group.label && (
            <SidebarGroupLabel className="px-3 md:px-2.5 pb-1 text-xs md:text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {group.items.map((item) => {
                const isActive =
                  item.url === "/admin"
                    ? pathname === "/admin"
                    : item.url === "/admin/trip"
                    ? pathname === "/admin/trip" ||
                      (pathname.startsWith("/admin/trip/") &&
                        !pathname.startsWith("/admin/trip/upcoming"))
                    : pathname === item.url || pathname.startsWith(item.url + "/");

                const isRestrictedForUser =
                  item.requiredLevel === "full" && !isFullAdmin;

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      onClick={() => handleNavigate(item.url)}
                      className={`relative flex items-center gap-3 min-h-[48px] md:min-h-[38px] px-3.5 md:px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg text-base md:text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#3B001B] text-white shadow-sm font-semibold hover:bg-[#46001D] hover:text-white"
                          : isRestrictedForUser
                          ? "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                          : "text-stone-700 md:text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                      }`}
                    >
                      {item.icon && (
                        <item.icon
                          className={`size-5 md:size-4 shrink-0 transition-colors ${
                            isActive
                              ? "text-amber-300"
                              : isRestrictedForUser
                              ? "text-stone-300"
                              : "text-stone-400 group-hover:text-stone-600"
                          }`}
                        />
                      )}
                      <span className="truncate flex-1">{item.title}</span>

                      {item.requiredLevel === "full" && (
                        <span
                          className={`text-[11px] md:text-[9px] font-bold uppercase tracking-wider px-2 md:px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-1 md:gap-0.5 ${
                            isActive
                              ? "bg-amber-400/20 text-amber-200 border-amber-400/30"
                              : isRestrictedForUser
                              ? "bg-stone-100 text-stone-400 border-stone-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                          title={
                            isRestrictedForUser
                              ? "Requires Full Administrator Privileges"
                              : "Full Admin Section"
                          }
                        >
                          {isRestrictedForUser && (
                            <LockIcon className="size-3 md:size-2.5" />
                          )}
                          Full
                        </span>
                      )}

                      {isActive && (
                        <span className="size-2 md:size-1.5 rounded-full bg-amber-300 shrink-0" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </div>
  );
}
