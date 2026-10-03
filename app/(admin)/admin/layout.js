import React from "react";
import AppSidebar from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAdminAccess } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function Layout({ children }) {
  // 1. Check primary NextAuth session
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/admin-login");
  }

  // 2. Check second-layer Student ID verification & active adminUsers record
  const authResult = await getAdminAccess();

  if (!authResult.ok || !authResult.admin) {
    // Authenticated via credentials, but requires Student ID verification or is deactivated
    redirect("/admin-verify");
  }

  const admin = authResult.admin;

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" admin={admin} />
      <SidebarInset className="bg-[#FAF9F6] min-h-screen flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <SiteHeader />
        <div className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}