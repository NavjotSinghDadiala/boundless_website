import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthenticatedCoordinator,
  getCoordinatorTripScope,
} from "@/lib/coordinatorAuth";

// Strict whitelist of fields that a coordinator is authorized to edit
const ALLOWED_COORDINATOR_FIELDS = new Set([
  "description",
  "destination",
  "startDate",
  "endDate",
  "itinerary",
  "importantInformation",
  "thingsToCarry",
  "images",
]);

export async function PATCH(request: Request) {
  try {
    // 1. Derive coordinator identity exclusively from the verified Firebase ID token
    const coordinator = await getAuthenticatedCoordinator(request);
    if (!coordinator || !coordinator.email) {
      return NextResponse.json(
        { error: "Unauthorized: Valid coordinator authentication token required." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload: Expected JSON object." },
        { status: 400 }
      );
    }

    const { tripId } = body;
    if (!tripId || typeof tripId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid tripId parameter." },
        { status: 400 }
      );
    }

    // 2. Enforce coordinator trip scope check (must be assigned to this trip)
    const scope = await getCoordinatorTripScope(coordinator.email, tripId);
    if (!scope.isAssigned) {
      return NextResponse.json(
        { error: "Forbidden: You are not assigned to coordinate this trip." },
        { status: 403 }
      );
    }

    const tripData = scope.tripData || {};
    if (tripData.isCompleted) {
      return NextResponse.json(
        { error: "Trip is completed. Completed trips cannot be modified." },
        { status: 400 }
      );
    }

    // 3. Strict field whitelisting: filter out any admin-only configuration or state
    const updatePayload: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_COORDINATOR_FIELDS.has(key)) {
        if (key === "description" || key === "destination" || key === "importantInformation") {
          if (typeof value === "string") {
            updatePayload[key] = value.trim();
          }
        } else if (key === "startDate" || key === "endDate") {
          if (typeof value === "string") {
            updatePayload[key] = value.trim();
          }
        } else if (key === "thingsToCarry") {
          if (Array.isArray(value)) {
            updatePayload[key] = value.map((item) => String(item).trim()).filter(Boolean);
          }
        } else if (key === "itinerary") {
          if (Array.isArray(value)) {
            updatePayload[key] = value;
          }
        } else if (key === "images") {
          if (Array.isArray(value)) {
            updatePayload[key] = value.map((img) => String(img).trim()).filter(Boolean);
          }
        }
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No editable trip fields were provided." },
        { status: 400 }
      );
    }

    // 4. Update trip document in Firestore
    updatePayload.updatedAt = FieldValue.serverTimestamp();
    await adminDb.collection("trips").doc(tripId).update(updatePayload);

    return NextResponse.json(
      {
        success: true,
        message: "Trip details updated successfully.",
        updatedFields: Object.keys(updatePayload).filter((k) => k !== "updatedAt"),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH Coordinator Trip Error:", error);
    return NextResponse.json(
      { error: "Failed to update trip details." },
      { status: 500 }
    );
  }
}
