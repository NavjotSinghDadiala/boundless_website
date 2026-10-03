"use client"

import { LogOutIcon, MoreVerticalIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react"
import { signOut } from "next-auth/react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
    studentId?: string
    permissionLevel?: "standard" | "full"
  }
}) {
  const { isMobile } = useSidebar()

  const handleLogout = async () => {
    await fetch("/api/auth/admin-logout", { method: "POST" }).catch(() => {});
    await signOut({ callbackUrl: "/admin-login" });
  }

  const isFull = user.permissionLevel === "full";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                  {user.name?.slice(0, 2).toUpperCase() || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold text-stone-900">{user.name}</span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border ${
                      isFull
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-stone-100 text-stone-700 border-stone-300"
                    }`}
                  >
                    {isFull ? "Full" : "Std"}
                  </span>
                </div>
                <span className="truncate text-[11px] font-mono text-stone-500">
                  {user.studentId || user.email}
                </span>
              </div>
              <MoreVerticalIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-amber-100 text-amber-900 font-bold text-xs">
                    {user.name?.slice(0, 2).toUpperCase() || "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-stone-900">{user.name}</span>
                  {user.studentId && (
                    <span className="truncate text-xs font-mono font-semibold text-amber-900">
                      ID: {user.studentId}
                    </span>
                  )}
                  <span className="truncate text-[11px] text-stone-500">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="px-2 pb-2">
                <div
                  className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1.5 font-medium ${
                    isFull
                      ? "bg-amber-50 text-amber-900 border-amber-200"
                      : "bg-stone-50 text-stone-700 border-stone-200"
                  }`}
                >
                  {isFull ? (
                    <ShieldCheckIcon className="size-3.5 text-amber-700 shrink-0" />
                  ) : (
                    <ShieldAlertIcon className="size-3.5 text-stone-500 shrink-0" />
                  )}
                  <span>
                    {isFull ? "Full Administrator Privileges" : "Standard Administrator"}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive py-2"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              <span>Log out of Console</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
