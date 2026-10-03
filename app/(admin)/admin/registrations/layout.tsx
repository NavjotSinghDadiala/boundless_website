import React from "react";
import { requireFullAdmin } from "@/lib/adminAuth";
import { AdminAccessRestricted } from "@/components/admin";

export const dynamic = "force-dynamic";

export default async function RegistrationsAdminLayout({
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
          sectionTitle="Trip Registrations & Attendee Records"
          requiredLevel="Full Administrator"
          description="Reviewing student applicant records, approving/rejecting registrations, verifying student identity documents, and dispatching approval notifications requires Full Administrator clearance."
        />
      );
    }
    throw err;
  }
}
