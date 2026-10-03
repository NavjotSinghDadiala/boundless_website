"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheckIcon, ArrowRightIcon, LockIcon, LogOutIcon } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AdminVerifyPage() {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: studentId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to verify admin access.");
        return;
      }

      // Successful verification
      router.push(data.redirect || "/admin");
      router.refresh();
    } catch {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/admin-logout", { method: "POST" }).catch(() => {});
    await signOut({ callbackUrl: "/admin-login" });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-amber-50 via-[#FFFBEA] to-orange-50">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 shadow-2xl border border-amber-200/70 flex flex-col">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="w-10 h-10 bg-[#3B001B] rounded-full flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity border border-[#FFE878]/30 shadow-sm"
          >
            <Image src="/Logo Bound.png" alt="Boundless Logo" width={36} height={36} className="object-contain" />
          </Link>
          <span className="text-xs font-oswald uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300/60 flex items-center gap-1.5">
            <LockIcon className="size-3 text-amber-800" />
            Step 2 of 2
          </span>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="flex flex-col gap-4 w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">
              <ShieldCheckIcon className="size-4 text-[#3B001B]" />
              Two-Factor Identity Verification
            </div>
            <h1 className="text-2xl sm:text-3xl font-oswald font-bold uppercase tracking-wide text-[#3B001B]">
              Admin Verification
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium leading-relaxed">
              Enter your registered IITM Student ID to complete administrator authorization and load the operations console.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label htmlFor="admin_student_id" className="text-xs font-oswald uppercase tracking-wider font-bold text-[#3B001B]">
              Registered Student ID
            </label>
            <input
              id="admin_student_id"
              className="bg-white/90 border border-amber-300/80 focus:border-[#3B001B] focus:ring-2 focus:ring-[#FFE878] outline-none px-3.5 py-2.5 rounded-xl shadow-sm text-sm text-stone-900 placeholder:text-stone-400 font-mono transition-all uppercase tracking-wider"
              type="text"
              placeholder="e.g. 23F2000835"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value.toUpperCase())}
              required
              autoFocus
              autoComplete="off"
            />
            <p className="text-[11px] text-stone-500 font-medium">
              Only authorized Student IDs in the administrative registry are permitted.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center animate-in fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !studentId.trim()}
            className="w-full bg-[#3B001B] hover:bg-[#46001D] text-[#FFE878] font-oswald uppercase tracking-wider py-3 rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] font-bold text-sm sm:text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Verifying Identity...</span>
            ) : (
              <>
                <span>Verify Admin Access</span>
                <ArrowRightIcon className="size-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-amber-200/60 mt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 hover:text-[#3B001B] font-medium transition-colors"
            >
              <LogOutIcon className="size-3.5" />
              Sign in with different account
            </button>
            <Link href="/" className="hover:text-[#3B001B] font-medium transition-colors">
              Return Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
