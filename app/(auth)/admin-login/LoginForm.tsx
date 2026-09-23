"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function LoginForm() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (!res?.error) {
        router.push("/admin")
      } else {
        setError("Invalid credentials. Please verify your email and password.")
      }
    } catch {
      setError("A connection error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-amber-50 via-[#FFFBEA] to-orange-50">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 shadow-2xl border border-amber-200/70 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="w-10 h-10 bg-[#3B001B] rounded-full flex items-center justify-center overflow-hidden hover:opacity-90 transition-opacity border border-[#FFE878]/30 shadow-sm"
          >
            <Image src="/Logo Bound.png" alt="Boundless Logo" width={36} height={36} className="object-contain" />
          </Link>
          <span className="text-xs font-oswald uppercase tracking-wider font-bold px-2.5 py-1 rounded-full bg-amber-200/70 text-amber-900 border border-amber-300/60">
            Admin Portal
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-oswald font-bold uppercase tracking-wide text-[#3B001B]">
              Admin Sign In
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1 font-medium">
              Enter your credentials to access the administrative dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label htmlFor="admin_email" className="text-xs font-oswald uppercase tracking-wider font-bold text-[#3B001B]">
              Login Email
            </label>
            <input
              id="admin_email"
              className="bg-white/90 border border-amber-300/80 focus:border-[#3B001B] focus:ring-2 focus:ring-[#FFE878] outline-none px-3.5 py-2.5 rounded-xl shadow-sm text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              type="email"
              placeholder="admin@boundless.iitmbs.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin_password" className="text-xs font-oswald uppercase tracking-wider font-bold text-[#3B001B]">
              Password
            </label>
            <input
              id="admin_password"
              className="bg-white/90 border border-amber-300/80 focus:border-[#3B001B] focus:ring-2 focus:ring-[#FFE878] outline-none px-3.5 py-2.5 rounded-xl shadow-sm text-sm text-stone-900 placeholder:text-stone-400 transition-all"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#3B001B] hover:bg-[#46001D] text-[#FFE878] font-oswald uppercase tracking-wider py-3 rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] font-bold text-sm sm:text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Login to Console"}
          </button>

          <Link
            href="/"
            className="text-xs text-center text-stone-500 hover:text-[#3B001B] font-medium transition-colors mt-2"
          >
            ← Back to Homepage
          </Link>
        </form>
      </div>
    </div>
  )
}