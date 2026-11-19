"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheckIcon, LockIcon, LogOutIcon, Loader2Icon } from "lucide-react";
import { signOut } from "next-auth/react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AdminVerifyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user?.email) {
        throw new Error("No email associated with this Google account.");
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/admin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          email: user.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Your Google account is not authorized for admin access.");
        return;
      }

      // Successful verification
      router.push(data.redirect || "/admin");
      router.refresh();
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Google Sign-In was cancelled. Please try again.");
      } else if (err?.code === "auth/popup-blocked") {
        setError("Sign-In popup was blocked by your browser. Please allow popups and try again.");
      } else {
        setError(err?.message || "A connection error occurred. Please try again.");
      }
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

        {/* Verification Card */}
        <div className="flex flex-col gap-5 w-full">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">
              <ShieldCheckIcon className="size-4 text-[#3B001B]" />
              Two-Factor Identity Verification
            </div>
            <h1 className="text-2xl sm:text-3xl font-oswald font-bold uppercase tracking-wide text-[#3B001B]">
              Admin Verification
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium leading-relaxed">
              Verify your identity using your authorized Google account. Both <strong>Standard (L1)</strong> and <strong>Full (L2)</strong> admin roles are permitted.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center animate-in fade-in">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white hover:bg-stone-50 text-stone-800 border border-amber-300/80 hover:border-[#3B001B]/40 font-semibold py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] text-sm sm:text-base flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2Icon className="size-5 animate-spin text-[#3B001B]" />
                <span className="font-oswald tracking-wide uppercase text-sm text-[#3B001B]">
                  Verifying Admin Access...
                </span>
              </>
            ) : (
              <>
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-oswald uppercase tracking-wider font-bold text-[#3B001B]">
                  Continue with Google
                </span>
              </>
            )}
          </button>

          <p className="text-[11px] text-stone-500 font-medium text-center">
            Sign in with the Google email registered under your administrator account.
          </p>

          <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-amber-200/60 mt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1 hover:text-[#3B001B] font-medium transition-colors cursor-pointer"
            >
              <LogOutIcon className="size-3.5" />
              Sign in with different credentials
            </button>
            <Link href="/" className="hover:text-[#3B001B] font-medium transition-colors">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
