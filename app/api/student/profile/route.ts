import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import {
  getOrCreateStudentProfile,
  updateStudentProfile,
} from "@/lib/studentProfile";

async function authenticateStudent(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const { searchParams } = new URL(request.url);
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : searchParams.get("token");

  if (!token) {
    return { error: "Missing authentication token", status: 401 };
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (err) {
    return { error: "Invalid authentication token", status: 401 };
  }

  const email = decoded.email;
  const uid = decoded.uid;

  if (!email || !email.endsWith("iitm.ac.in")) {
    return {
      error: "Unauthorized domain. Only IITM student emails are allowed.",
      status: 403,
    };
  }

  return { uid, email, decoded };
}

/* GET → Retrieve or seed canonical student profile */
export async function GET(request: Request) {
  try {
    const authResult = await authenticateStudent(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { uid, email, decoded } = authResult;
    const student = await getOrCreateStudentProfile(uid, email, decoded.name);

    return NextResponse.json({ success: true, student }, { status: 200 });
  } catch (error: any) {
    console.error("GET /api/student/profile error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* PATCH → Safely update student profile attributes */
export async function PATCH(request: Request) {
  try {
    const authResult = await authenticateStudent(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { uid } = authResult;
    const body = await request.json();

    const student = await updateStudentProfile(uid, body);

    return NextResponse.json(
      { success: true, message: "Profile updated successfully", student },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PATCH /api/student/profile error:", error);
    const isClientError =
      error.message?.includes("Invalid") ||
      error.message?.includes("No valid fields") ||
      error.message?.includes("Please select") ||
      error.message?.includes("Missing");

    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: isClientError ? 400 : 500 }
    );
  }
}
