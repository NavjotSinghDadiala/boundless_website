"use client";

import { type LucideIcon, LockIcon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  adminPermissionLevel,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    requiredLevel?: "standard" | "full";
  }[];
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

  return (
    <SidebarGroup className="p-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive =
              item.url === "/admin"
                ? pathname === "/admin"
                : pathname === item.url || pathname.startsWith(item.url + "/");

            const isRestrictedForUser = item.requiredLevel === "full" && !isFullAdmin;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleNavigate(item.url)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#3B001B] text-white shadow-sm font-semibold hover:bg-[#46001D] hover:text-white"
                      : isRestrictedForUser
                      ? "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  {item.icon && (
                    <item.icon
                      className={`size-4 shrink-0 transition-colors ${
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
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 flex items-center gap-0.5 ${
                        isActive
                          ? "bg-amber-400/20 text-amber-200 border-amber-400/30"
                          : isRestrictedForUser
                          ? "bg-stone-100 text-stone-400 border-stone-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                      title={isRestrictedForUser ? "Requires Full Administrator Privileges" : "Full Admin Section"}
                    >
                      {isRestrictedForUser && <LockIcon className="size-2.5" />}
                      Full
                    </span>
                  )}

                  {isActive && (
                    <span className="size-1.5 rounded-full bg-amber-300 shrink-0" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}