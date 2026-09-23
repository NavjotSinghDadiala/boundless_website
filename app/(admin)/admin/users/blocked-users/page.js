"use client";

import React from "react";
import { ShieldAlertIcon } from "lucide-react";
import { AdminPageHeader, AdminEmptyState } from "@/components/admin";

export default function BlockedUsersPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Blocked & Restricted Users"
        description="Review student accounts flagged or restricted from registering for Boundless expeditions."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Blocked Users" },
        ]}
      />

      <AdminEmptyState
        title="No Blocked Users"
        description="No student accounts are currently flagged or restricted. Account restriction enforcement is active."
        icon={ShieldAlertIcon}
      />
    </div>
  );
}