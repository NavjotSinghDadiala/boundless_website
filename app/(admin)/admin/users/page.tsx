"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, isFirebaseEnabled } from "@/lib/firebase";
import { UserCheckIcon, UsersIcon, MailIcon } from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminLoadingState,
  AdminEmptyState,
  AdminFilterBar,
  AdminTable,
  AdminTableHead,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from "@/components/admin";

interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!isFirebaseEnabled || !db) {
          setError("Firebase is not configured");
          setLoading(false);
          return;
        }

        const snapshot = await getDocs(collection(db, "users"));
        const data: UserProfile[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...(doc.data() as any),
        }));
        setUsers(data);
      } catch (err) {
        setError("Failed to fetch registered users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.uid?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Registered Members"
        description="Comprehensive roster of authenticated students and society members registered on Boundless."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Users" },
        ]}
      />

      {/* Filter Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name, email, or student ID..."
        totalCount={filteredUsers.length}
        totalLabel="users found"
        onReset={() => setSearchQuery("")}
      />

      {loading ? (
        <AdminLoadingState type="table" rows={6} />
      ) : error ? (
        <div className="p-8 rounded-xl border border-rose-200 bg-rose-50 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <AdminEmptyState
          title={searchQuery ? "No matching members found" : "No Registered Members"}
          description={
            searchQuery
              ? `No user profiles matched "${searchQuery}". Try a different keyword.`
              : "No student user accounts found in the database yet."
          }
          icon={UsersIcon}
        />
      ) : (
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeaderCell>Member Profile</AdminTableHeaderCell>
              <AdminTableHeaderCell>Email Address</AdminTableHeaderCell>
              <AdminTableHeaderCell>Account UID</AdminTableHeaderCell>
              <AdminTableHeaderCell className="text-right">Status</AdminTableHeaderCell>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {filteredUsers.map((user) => (
              <AdminTableRow key={user.uid}>
                <AdminTableCell>
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <div className="size-10 rounded-full overflow-hidden border border-stone-200 bg-stone-100 shrink-0">
                        <img
                          src={user.photoURL}
                          alt={user.name || "User"}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="size-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 shrink-0">
                        {user.name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-stone-900">
                        {user.name || "Student"}
                      </div>
                    </div>
                  </div>
                </AdminTableCell>

                <AdminTableCell className="text-stone-600 font-mono text-xs">
                  <div className="flex items-center gap-1.5">
                    <MailIcon className="size-3.5 text-stone-400" />
                    <span>{user.email || "—"}</span>
                  </div>
                </AdminTableCell>

                <AdminTableCell className="text-stone-400 font-mono text-xs">
                  {user.uid}
                </AdminTableCell>

                <AdminTableCell className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Active Member
                  </span>
                </AdminTableCell>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </div>
  );
}
