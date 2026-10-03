import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminDb } from "@/lib/firebase-admin";

/**
 * POST /api/auth/admin-logout
 * Destroys the server-side adminSessions record and clears the session cookie.
 */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("boundless_admin_session");

    if (sessionCookie?.value) {
      await adminDb.collection("adminSessions").doc(sessionCookie.value).delete().catch(() => {});
    }

    const response = NextResponse.json({ ok: true, message: "Logged out successfully." });
    response.cookies.set("boundless_admin_session", "", {
      path: "/",
      httpOnly: true,
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
