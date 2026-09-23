"use client";

import { type LucideIcon } from "lucide-react";
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
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
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

  return (
    <SidebarGroup className="p-2">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive =
              item.url === "/admin"
                ? pathname === "/admin"
                : pathname === item.url || pathname.startsWith(item.url + "/");

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={() => handleNavigate(item.url)}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#3B001B] text-white shadow-sm font-semibold hover:bg-[#46001D] hover:text-white"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  }`}
                >
                  {item.icon && (
                    <item.icon
                      className={`size-4 shrink-0 transition-colors ${
                        isActive ? "text-amber-300" : "text-stone-400 group-hover:text-stone-600"
                      }`}
                    />
                  )}
                  <span className="truncate">{item.title}</span>
                  {isActive && (
                    <span className="ml-auto size-1.5 rounded-full bg-amber-300 shrink-0" />
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