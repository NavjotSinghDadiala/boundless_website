import React from "react";
import { requireFullAdmin } from "@/lib/adminAuth";
import { AdminAccessRestricted } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function CoordinatorsAdminLayout({
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
          sectionTitle="Trip Coordinators"
          requiredLevel="Full Administrator"
          description="Assigning, adding, editing, or managing student trip coordinators and security scopes requires Full Administrator privileges."
        />
      );
    }
    throw err;
  }
}
