import React from "react";
import { requireFullAdmin } from "@/lib/adminAuth";
import { AdminAccessRestricted } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function UsersAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireFullAdmin();
    return <>{children}</>;
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    if (err.status === 403 || err.status === 401) {
      return (
        <AdminAccessRestricted
          sectionTitle="Registered Administrators & Access Control"
          requiredLevel="Full Administrator"
          description="Authorizing administrators, managing permission levels, deactivating accounts, and reviewing administrative credentials requires Full Administrator privileges."
        />
      );
    }
    throw err;
  }
}
