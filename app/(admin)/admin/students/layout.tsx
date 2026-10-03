import React from "react";
import { requireAdmin } from "@/lib/adminAuth";
import { AdminAccessRestricted } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function StudentsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
    return <>{children}</>;
  } catch (err: any) {
    if (err?.digest === "DYNAMIC_SERVER_USAGE" || err?.message?.includes("Dynamic server usage")) {
      throw err;
    }
    if (err.status === 403 || err.status === 401) {
      return (
        <AdminAccessRestricted
          sectionTitle="Student Directory & Trip History"
          requiredLevel="Administrator"
          description="Accessing the central student directory, student profiles, and historical trip participation records requires verified Administrator privileges."
        />
      );
    }
    throw err;
  }
}
