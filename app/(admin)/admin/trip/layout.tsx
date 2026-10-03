import React from "react";
import { requireFullAdmin } from "@/lib/adminAuth";
import { AdminAccessRestricted } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function TripAdminLayout({
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
          sectionTitle="All Trips & Expeditions"
          requiredLevel="Full Administrator"
          description="Detailed trip budgets, coordinator rosters, pricing management, and expedition configurations require Full Administrator clearance."
        />
      );
    }
    throw err;
  }
}
