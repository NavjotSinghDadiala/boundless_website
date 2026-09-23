import React from "react";
import AppSidebar from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

async function Layout({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin-login");
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-[#FAF9F6] min-h-screen flex flex-col min-w-0 max-w-full overflow-x-hidden">
        <SiteHeader />
        <div className="flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default Layout;