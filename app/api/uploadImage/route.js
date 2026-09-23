import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { uploadImage } from "@/lib/cloudinary";
import { checkRateLimit, getClientIp, isStaffRequest } from "@/lib/rateLimit";
import { getOrCreateStudentProfile } from "@/lib/studentProfile";

export async function POST(req) {
  try {
    // 1. Dual Auth Gating (NextAuth session for admin, Firebase ID token for students)
    const session = await getServerSession();
    let authorized = !!session;

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

    const body = await req.json();
    const {
      images,
      folder,
      email: clientEmail,
      tripName: clientTripName,
      subFolderType,
      token: bodyToken,
      tripId: clientTripId,
      fieldName: clientFieldName,
    } = body;

    const token = bearerToken || bodyToken;
    let decodedToken = null;

    if (token) {
      try {
        decodedToken = await adminAuth.verifyIdToken(token);
        authorized = true;
      } catch (err) {
        console.error("Firebase upload authentication failed:", err);
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized: Access is denied." },
        { status: 401 }
      );
    }

    const verifiedEmail = decodedToken?.email || "";
    const uid = decodedToken?.uid || "";

    // If not an admin session, enforce @iitm.ac.in domain requirement
    if (!session) {
      if (!verifiedEmail || !verifiedEmail.endsWith("iitm.ac.in")) {
        return NextResponse.json(
          { error: "Unauthorized domain. Only IITM emails are allowed." },
          { status: 403 }
        );
      }
    }

    // Rate limit: 20 uploads per IP per 10 minutes — skipped for admin/coordinators
    const isStaff = await isStaffRequest(session, token);
    if (!isStaff) {
      const ip = getClientIp(req);
      const rl = checkRateLimit(`upload:${ip}`, { limit: 20, windowMs: 10 * 60_000 });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: "Too many uploads. Please wait before uploading more files." },
          { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } }
        );
      }
    }

    // ---- Validation ----
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const image = images[0];

    const isDoc =
      image.startsWith("data:application/msword") ||
      image.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document");

    if (
      !image ||
      typeof image !== "string" ||
      (!image.startsWith("data:image") && !image.startsWith("data:application/pdf") && !isDoc)
    ) {
      return NextResponse.json(
        { error: "Invalid file format. Please provide an image, PDF, or Word document." },
        { status: 400 }
      );
    }

    // ---- File size check (skipped for admin sessions) ----
    if (!session) {
      // base64 length → approximate bytes: (base64Length * 3) / 4
      const base64Part = image.split(",")[1] || "";
      const fileSizeBytes = Math.ceil((base64Part.length * 3) / 4);
      const MAX_SIZE = 10 * 1024 * 1024; // 10 MB for student uploads

      if (fileSizeBytes > MAX_SIZE) {
        return NextResponse.json(
          { error: "File is too large. Maximum allowed size is 10 MB." },
          { status: 413 }
        );
      }
    }

    // ====================================================================
    // PATH A: Trip Registration (student form) → Google Drive ONLY
    // Detected by presence of subFolderType ("Student IDs", "Consent Forms", "Form Files")
    // ====================================================================
    if (subFolderType) {
      if (!process.env.DRIVE_UPLOAD_URL) {
        return NextResponse.json(
          { error: "File storage is not configured. Please contact the administrator." },
          { status: 503 }
        );
      }

      if (process.env.DRIVE_UPLOAD_URL.includes("drive.google.com")) {
        return NextResponse.json(
          {
            error:
              "Configuration error: DRIVE_UPLOAD_URL is set to a Google Drive folder link (drive.google.com). It must be a Google Apps Script Web App URL (https://script.google.com/macros/s/.../exec).",
          },
          { status: 500 }
        );
      }

      // Load canonical student profile from students/{uid}
      let studentDoc = null;
      if (uid && verifiedEmail) {
        try {
          studentDoc = await getOrCreateStudentProfile(uid, verifiedEmail);
        } catch (profileErr) {
          console.error("Failed to load canonical student document in uploadImage:", profileErr);
        }
      }

      // Resolve trip and canonical tripName
      let tripId = clientTripId || "";
      let tripName = clientTripName || "Event";

      if (tripId) {
        try {
          const tripSnap = await adminDb.collection("trips").doc(tripId).get();
          if (tripSnap.exists) {
            const tripData = tripSnap.data();
            tripName = tripData?.name || tripData?.title || tripName;
          }
        } catch (tripErr) {
          console.error("Failed to resolve trip from tripId:", tripErr);
        }
      } else if (tripName && tripName !== "Event") {
        try {
          const tripQuery = await adminDb.collection("trips").where("name", "==", tripName).limit(1).get();
          if (!tripQuery.empty) {
            tripId = tripQuery.docs[0].id;
          }
        } catch (tripErr) {
          console.error("Failed to resolve tripId from tripName:", tripErr);
        }
      }

      // Determine documentType and fieldName
      let documentType = "Student ID";
      if (subFolderType === "Consent Forms") {
        documentType = "Consent Form";
      } else if (subFolderType === "Form Files") {
        documentType = "Dynamic Form File";
      } else if (subFolderType === "Student IDs") {
        documentType = "Student ID";
      } else {
        documentType = subFolderType;
      }

      let fieldName = clientFieldName || "";
      if (!fieldName) {
        if (documentType === "Student ID") fieldName = "Student ID Card Copy";
        else if (documentType === "Consent Form") fieldName = "Completed Consent Form";
        else fieldName = subFolderType;
      }

      const matches = image.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json({ error: "Invalid base64 format" }, { status: 400 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      let extension = "bin";
      if (mimeType.includes("pdf")) extension = "pdf";
      else if (mimeType.includes("word") || mimeType.includes("msword")) extension = "doc";
      else if (mimeType.includes("officedocument")) extension = "docx";
      else if (mimeType.includes("image/jpeg") || mimeType.includes("image/jpg")) extension = "jpg";
      else if (mimeType.includes("image/png")) extension = "png";
      else {
        const parts = mimeType.split("/");
        if (parts[1]) extension = parts[1].split(";")[0];
      }

      const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

      // 30-second timeout — no Cloudinary fallback for student form uploads
      const driveTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Drive upload timed out after 30 seconds")), 30000)
      );

      let driveRes;
      try {
        driveRes = await Promise.race([
          fetch(process.env.DRIVE_UPLOAD_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName,
              mimeType,
              fileBase64: base64Data,
              email: studentDoc?.email || verifiedEmail || clientEmail || "anonymous",
              tripName: tripName || "Event",
              subFolderType,
              secret: process.env.DRIVE_UPLOAD_SECRET || "",
              uid: uid || "",
              tripId: tripId || "",
              studentName: studentDoc?.name || "",
              studentEmail: studentDoc?.email || verifiedEmail || clientEmail || "anonymous",
              studentId: studentDoc?.studentId || "",
              gender: studentDoc?.gender || "",
              dob: studentDoc?.dob || "",
              phone: studentDoc?.phone || "",
              whatsapp: studentDoc?.whatsapp || "",
              residence: studentDoc?.residence || "",
              documentType,
              fieldName,
            }),
            redirect: "follow",
          }),
          driveTimeout,
        ]);
      } catch (err) {
        console.error("Google Drive upload failed:", err.message);
        return NextResponse.json(
          { error: "Failed to upload file to Google Drive. Please try again." },
          { status: 502 }
        );
      }

      const rawText = await driveRes.text();
      let driveResult;
      try {
        driveResult = JSON.parse(rawText);
      } catch {
        console.error(
          `Google Drive endpoint returned non-JSON response (HTTP ${driveRes.status}):`,
          rawText.substring(0, 300)
        );

        if (rawText.includes("accounts.google.com") || rawText.includes("ServiceLogin")) {
          return NextResponse.json(
            {
              error:
                "Google Apps Script requires authorization. In Apps Script, click Deploy > New Deployment > Web App, set 'Execute as: Me' and 'Who has access: Anyone'.",
            },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            error: `Google Drive upload endpoint returned an invalid response (HTTP ${driveRes.status}). Please ensure DRIVE_UPLOAD_URL points to a deployed Google Apps Script Web App.`,
          },
          { status: 502 }
        );
      }

      if (driveResult.status === "success" && driveResult.fileUrl) {
        return NextResponse.json(
          {
            success: true,
            images: [
              {
                secure_url: driveResult.fileUrl,
                public_id: fileName,
                width: 0,
                height: 0,
              },
            ],
          },
          { status: 200 }
        );
      }

      if (driveResult.status === "error" && driveResult.message === "Unauthorized") {
        console.error("Google Drive upload failed: Apps Script reported Unauthorized (shared secret mismatch).");
        return NextResponse.json(
          { error: "Upload authorization failed. Please contact the administrator." },
          { status: 401 }
        );
      }

      console.error("Google Drive Apps Script returned error:", driveResult);
      return NextResponse.json(
        {
          error:
            driveResult.message ||
            driveResult.error ||
            "Failed to upload file to Google Drive. Please try again.",
        },
        { status: 502 }
      );
    }

    // ====================================================================
    // PATH B: Admin Panel uploads → Cloudinary ONLY
    // ====================================================================
    const result = await uploadImage(image, {
      folder: folder || "uploads",
    });

    return NextResponse.json(
      {
        success: true,
        images: [
          {
            secure_url: result.secure_url || result.url,
            public_id: result.public_id || result.publicId,
            width: result.width,
            height: result.height,
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
