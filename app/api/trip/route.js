import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import * as yup from "yup";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthenticatedCoordinator } from "@/lib/coordinatorAuth";

const formFieldSchema = yup.object().shape({
  id: yup.string().required(),
  name: yup.string().required("Field name is required").trim(),
  type: yup
    .string()
    .oneOf(
      ["short_text", "long_text", "radio", "select", "date", "file", "email", "description_text"],
      "Invalid field type"
    )
    .required(),
  sortOrder: yup.number().required().min(0),
  allowEditIfPrefilled: yup.boolean().optional().default(true),
  dependsOnFieldId: yup.string().optional().nullable(),
  dependsOnValue: yup.string().optional().nullable(),
  options: yup
    .array()
    .of(yup.string().trim())
    .when("type", {
      is: (type) => type === "radio" || type === "select",
      then: (schema) =>
        schema
          .min(1, "At least one option is required for radio/select fields")
          .test(
            "has-valid-option",
            "At least one non-empty option is required",
            (value) => value && value.some((opt) => opt && opt.trim() !== "")
          ),
      otherwise: (schema) => schema.optional(),
    }),
});

const faqSchema = yup.object().shape({
  id: yup.string().required(),
  question: yup.string().required("Please provide a question.").trim(),
  answer: yup.string().required("Please provide an answer for this question.").trim(),
  sortOrder: yup.number().optional().default(0),
});

const consentStatementSchema = yup.object().shape({
  id: yup.string().required(),
  text: yup.string().required("Declaration text is required").trim(),
  required: yup.boolean().optional().default(true),
  sortOrder: yup.number().optional().default(0),
});

const tripSchema = yup.object().shape({
  name: yup.string().required("Trip name is required").trim(),
  description: yup.string().trim().optional().default(""),
  destination: yup.string().trim().optional().default(""),
  startDate: yup.string().trim().optional().default(""),
  endDate: yup
    .string()
    .trim()
    .optional()
    .default("")
    .test(
      "valid-date-range",
      "End date cannot be before start date",
      function (value) {
        const { startDate } = this.parent || {};
        if (startDate && value && value < startDate) {
          return false;
        }
        return true;
      }
    ),
  registrationDeadline: yup
    .string()
    .trim()
    .optional()
    .default("")
    .test(
      "deadline-before-start",
      "Registration deadline must be on or before the trip start date",
      function (value) {
        const { startDate } = this.parent || {};
        if (startDate && value && value > startDate) {
          return false;
        }
        return true;
      }
    ),
  registrationOpen: yup.boolean().optional().default(true),
  isCompleted: yup.boolean().optional().default(false),
  itinerary: yup
    .array()
    .of(
      yup.object().shape({
        day: yup.string().trim().optional().default(""),
        title: yup.string().trim().optional().default(""),
        description: yup.string().trim().optional().default(""),
      })
    )
    .optional()
    .default([]),
  itineraryLink: yup.string().url("Itinerary link must be a valid URL").trim().optional().default(""),
  faqs: yup.array().of(faqSchema).optional().default([]),
  consentStatements: yup.array().of(consentStatementSchema).optional().default([]),
  importantInformation: yup.string().trim().optional().default(""),
  thingsToCarry: yup
    .array()
    .of(yup.string().trim())
    .optional()
    .default([]),
  coordinators: yup
    .array()
    .of(
      yup.lazy((val) => {
        if (typeof val === "object" && val !== null) {
          return yup.object().shape({
            name: yup.string().required("Coordinator name is required").trim(),
            email: yup.string().email("Invalid email").required("Coordinator email is required").trim(),
            phone: yup.string().trim().optional().default(""),
            assignedOption: yup.string().trim().nullable().optional(),
          });
        }
        return yup.string().trim();
      })
    )
    .test(
      "at-least-one",
      "At least one coordinator is required",
      (value) => value && value.length > 0
    ),
  totalSeats: yup
    .number()
    .typeError("Total capacity seats is required")
    .required("Total capacity seats is required")
    .positive("Total capacity seats must be greater than 0")
    .integer("Total capacity seats must be a whole number")
    .test(
      "seats-sum-check",
      "Male and female reserved seats cannot exceed total capacity",
      function (total) {
        const { maleReservedSeats = 0, femaleReservedSeats = 0 } = this.parent || {};
        if (total && (Number(maleReservedSeats || 0) + Number(femaleReservedSeats || 0)) > total) {
          return false;
        }
        return true;
      }
    )
    .test(
      "released-seats-check",
      "Initial released seats cannot exceed total capacity",
      function (total) {
        const { releasedSeats = 0 } = this.parent || {};
        if (total && Number(releasedSeats || 0) > total) {
          return false;
        }
        return true;
      }
    ),
  fee: yup.number().min(0).default(500),
  consentFormTemplateUrl: yup.string().trim().optional(),
  femaleReservedSeats: yup
    .number()
    .typeError("Female reserved seats must be a number")
    .required("Female reserved seats is required")
    .min(0, "Cannot be negative")
    .integer("Must be a whole number"),
  maleReservedSeats: yup
    .number()
    .typeError("Male reserved seats must be a number")
    .optional()
    .min(0, "Cannot be negative")
    .integer("Must be a whole number")
    .default(0),
  releasedSeats: yup
    .number()
    .typeError("Released seats must be a number")
    .required("Released seats is required")
    .min(0, "Cannot be negative")
    .integer("Must be a whole number"),
  releasedSeatsType: yup
    .string()
    .oneOf(["female_only", "all"], "Invalid type")
    .required(),
  femaleJoined: yup.number().default(0),
  totalJoined: yup.number().default(0),
  formFields: yup
    .array()
    .of(formFieldSchema)
    .optional()
    .default([]),
  images: yup
    .array()
    .of(
      yup.object().shape({
        url: yup.string().required(),
        publicId: yup.string().required(),
        sortOrder: yup.number().required(),
      })
    )
    .default([]),
  whatsappLink: yup.string().trim().optional().default(""),
  qrCodeUrl: yup.string().trim().optional().default(""),
  consentTemplates: yup
    .array()
    .of(
      yup.object().shape({
        id: yup.string().required(),
        name: yup.string().required(),
        templateUrl: yup.string().required(),
      })
    )
    .optional()
    .default([]),
  emailsDisabled: yup.boolean().optional().default(false),
  cityWhatsappSettings: yup.object().optional().default({}),
});

export async function POST(request) {
  try {
    const session = await getServerSession();
    const isAdmin = !!session || (process.env.NODE_ENV === "development" && request.headers.get("x-admin-dev") === "true");
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const validatedData = await tripSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const validCoordinators = (validatedData.coordinators || []).map((c) => {
      if (typeof c === "object" && c !== null) {
        return {
          name: String(c.name || "").trim(),
          email: String(c.email || "").trim(),
          phone: String(c.phone || "").trim(),
          assignedOption: c.assignedOption ? String(c.assignedOption).trim() : null,
        };
      }
      return String(c).trim();
    }).filter((c) => {
      if (typeof c === "object" && c !== null) {
        return c.name && c.email;
      }
      return c !== "";
    });

    const tripData = {
      name: validatedData.name,
      description: validatedData.description || "",
      destination: validatedData.destination || "",
      startDate: validatedData.startDate || "",
      endDate: validatedData.endDate || "",
      registrationDeadline: validatedData.registrationDeadline || "",
      registrationOpen: validatedData.registrationOpen !== false,
      isCompleted: validatedData.isCompleted || false,
      itinerary: (validatedData.itinerary || []).map((item, idx) => ({
        day: item.day ? String(item.day).trim() : `Day ${idx + 1}`,
        title: String(item.title || "").trim(),
        description: String(item.description || "").trim(),
      })).filter((item) => item.title || item.description),
      itineraryLink: validatedData.itineraryLink || "",
      faqs: (validatedData.faqs || []).map((faq, index) => ({
        id: faq.id || `faq_${index}`,
        question: String(faq.question).trim(),
        answer: String(faq.answer).trim(),
        sortOrder: faq.sortOrder !== undefined ? faq.sortOrder : index,
      })),
      consentStatements: (validatedData.consentStatements || []).map((stmt, index) => ({
        id: stmt.id || `stmt_${index}`,
        text: String(stmt.text).trim(),
        required: stmt.required !== false,
        sortOrder: stmt.sortOrder !== undefined ? stmt.sortOrder : index,
      })),
      importantInformation: validatedData.importantInformation || "",
      thingsToCarry: (validatedData.thingsToCarry || []).map((item) => String(item).trim()).filter(Boolean),
      coordinators: validCoordinators,
      totalSeats: validatedData.totalSeats,
      fee: validatedData.fee !== undefined ? Number(validatedData.fee) : 500,
      consentFormTemplateUrl: validatedData.consentFormTemplateUrl || "",
      consentTemplates: validatedData.consentTemplates || [],
      femaleReservedSeats: validatedData.femaleReservedSeats,
      maleReservedSeats: validatedData.maleReservedSeats !== undefined
        ? validatedData.maleReservedSeats
        : Math.max(0, (validatedData.totalSeats || 0) - (validatedData.femaleReservedSeats || 0)),
      releasedSeats: validatedData.releasedSeats,
      releasedSeatsType: validatedData.releasedSeatsType,
      femaleJoined: validatedData.femaleJoined || 0,
      totalJoined: validatedData.totalJoined || 0,
      form: {
        fields: (validatedData.formFields || []).map((field) => {
          const fieldData = {
            id: field.id,
            name: field.name,
            type: field.type,
            sortOrder: field.sortOrder,
            allowEditIfPrefilled: field.allowEditIfPrefilled !== false,
            dependsOnFieldId: field.dependsOnFieldId || null,
            dependsOnValue: field.dependsOnValue || null,
          };
          if (field.type === "radio" || field.type === "select") {
            fieldData.options = (field.options || []).filter(
              (opt) => opt && opt.trim() !== ""
            );
          }
          return fieldData;
        }),
      },
      images: (validatedData.images || []).map((img, index) => ({
        url: img.url,
        publicId: img.publicId,
        sortOrder: index,
      })),
      whatsappLink: validatedData.whatsappLink || "",
      qrCodeUrl: validatedData.qrCodeUrl || "",
      emailsDisabled: validatedData.emailsDisabled || false,
      cityWhatsappSettings: validatedData.cityWhatsappSettings || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection("trips").add(tripData);

    return NextResponse.json(
      {
        message: "Trip created successfully",
        tripId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating trip:", error);

    if (error instanceof yup.ValidationError) {
      const validationErrors = {};
      error.inner.forEach((err) => {
        if (err.path) {
          validationErrors[err.path] = err.message;
        }
      });
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create trip. Please try again." },
      { status: 500 }
    );
  }
}

function formatTripDoc(doc, { isAdmin, coordinator }) {
  const data = doc.data();

  // Determine coordinator objects returned
  let coordinators = [];
  let isUserAssigned = false;

  if (isAdmin) {
    // Admin gets full coordinator objects with all emails and phones
    coordinators = (data.coordinators || []).map((c) => {
      if (typeof c === "object" && c !== null) {
        return {
          name: String(c.name || "").trim(),
          email: String(c.email || "").trim(),
          phone: String(c.phone || "").trim(),
          assignedOption: c.assignedOption ? String(c.assignedOption).trim() : null,
        };
      }
      return { name: String(c) };
    });
  } else if (coordinator) {
    // Coordinator mode: only include assignments, protect other coordinators' private data
    coordinators = (data.coordinators || []).map((c) => {
      const cEmail = typeof c === "object" && c !== null ? c.email : String(c);
      const isMe = cEmail && String(cEmail).toLowerCase().trim() === coordinator.email;
      if (isMe) {
        isUserAssigned = true;
        return {
          name: typeof c === "object" && c !== null ? c.name : cEmail,
          email: coordinator.email,
          phone: typeof c === "object" && c !== null ? String(c.phone || "") : "",
          assignedOption: typeof c === "object" && c !== null ? c.assignedOption || null : null,
        };
      }
      // Other coordinators: strip email and phone
      if (typeof c === "object" && c !== null) return { name: c.name || "" };
      return { name: String(c) };
    });
  } else {
    // Public: ONLY expose names, NEVER email or phone
    coordinators = (data.coordinators || []).map((c) => {
      if (typeof c === "object" && c !== null) return { name: c.name || "" };
      return { name: String(c) };
    });
  }

  // Public callers must never see whatsappLink or qrCodeUrl
  const whatsappLink = (isAdmin || coordinator) ? (data.whatsappLink || "") : "";
  const qrCodeUrl = (isAdmin || coordinator) ? (data.qrCodeUrl || "") : "";

  return {
    id: doc.id,
    name: data.name,
    description: data.description || "",
    destination: data.destination || "",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    registrationDeadline: data.registrationDeadline || "",
    itinerary: data.itinerary || [],
    itineraryLink: data.itineraryLink || "",
    faqs: data.faqs || [],
    consentStatements: data.consentStatements || [],
    importantInformation: data.importantInformation || "",
    thingsToCarry: data.thingsToCarry || [],
    coordinators,
    totalSeats: data.totalSeats,
    femaleReservedSeats: data.femaleReservedSeats,
    maleReservedSeats: data.maleReservedSeats !== undefined ? Number(data.maleReservedSeats) : Math.max(0, (data.totalSeats || 0) - (data.femaleReservedSeats || 0)),
    releasedSeats: data.releasedSeats,
    releasedSeatsType: data.releasedSeatsType,
    femaleJoined: data.femaleJoined || 0,
    totalJoined: data.totalJoined || 0,
    registrationOpen: data.registrationOpen !== false,
    isCompleted: data.isCompleted || false,
    finalRosterSaved: data.finalRosterSaved || false,
    form: data.form,
    consentFormTemplateUrl: data.consentFormTemplateUrl || "",
    consentTemplates: data.consentTemplates || [],
    images: data.images || [],
    fee: data.fee !== undefined ? Number(data.fee) : 500,
    whatsappLink,
    qrCodeUrl,
    emailsDisabled: isAdmin ? (data.emailsDisabled || false) : false,
    cityWhatsappSettings: isAdmin ? (data.cityWhatsappSettings || {}) : {},
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    _isUserAssigned: isUserAssigned,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get("id") || searchParams.get("tripId");

    // Check if the caller is an authenticated admin
    const session = await getServerSession();
    const isAdmin = !!session || (process.env.NODE_ENV === "development" && request.headers.get("x-admin-dev") === "true");

    // If not admin, check if caller is an authenticated coordinator
    let coordinator = null;
    if (!isAdmin) {
      coordinator = await getAuthenticatedCoordinator(request);
    }

    if (singleId) {
      const doc = await adminDb.collection("trips").doc(singleId).get();
      if (!doc.exists) {
        return NextResponse.json(
          { error: "Trip not found" },
          { status: 404 }
        );
      }
      const formattedTrip = formatTripDoc(doc, { isAdmin, coordinator });
      const isAssigned = formattedTrip._isUserAssigned;
      delete formattedTrip._isUserAssigned;

      // If caller is an authenticated coordinator, ensure they can only view trips assigned to them
      if (coordinator && !isAssigned) {
        return NextResponse.json(
          { error: "Forbidden: You are not assigned to coordinate this trip." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { trip: formattedTrip, trips: [formattedTrip] },
        { status: 200 }
      );
    }

    const querySnapshot = await adminDb
      .collection("trips")
      .orderBy("createdAt", "desc")
      .get();

    let trips = querySnapshot.docs.map((doc) =>
      formatTripDoc(doc, { isAdmin, coordinator })
    );

    // If caller is coordinator, return only trips assigned to them!
    if (coordinator) {
      trips = trips.filter((t) => t._isUserAssigned);
    }

    // Clean up internal flag
    trips.forEach((t) => delete t._isUserAssigned);

    return NextResponse.json({ trips }, { status: 200 });
  } catch (error) {
    console.error("Error fetching trips:", error);
    return NextResponse.json(
      { error: "Failed to fetch trips. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession();
    const isAdmin = !!session || (process.env.NODE_ENV === "development" && request.headers.get("x-admin-dev") === "true");
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    await adminDb.collection("trips").doc(id).delete();
    return NextResponse.json({ success: true, message: "Trip deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE Trip Error:", error);
    return NextResponse.json({ error: "Failed to delete trip. Please try again." }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession();
    const isAdmin = !!session || (process.env.NODE_ENV === "development" && request.headers.get("x-admin-dev") === "true");
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tripId,
      name,
      description,
      destination,
      startDate,
      endDate,
      registrationDeadline,
      itinerary,
      itineraryLink,
      faqs,
      consentStatements,
      importantInformation,
      thingsToCarry,
      registrationOpen,
      isCompleted,
      coordinators,
      totalSeats,
      formFields,
      fee,
      consentFormTemplateUrl,
      consentTemplates,
      whatsappLink,
      qrCodeUrl,
      emailsDisabled,
      cityWhatsappSettings,
      femaleReservedSeats,
      maleReservedSeats,
      releasedSeats,
      releasedSeatsType,
      images,
    } = body;

    if (!tripId) {
      return NextResponse.json({ error: "Trip ID is required" }, { status: 400 });
    }

    // Date range validation
    if (startDate && endDate && String(endDate).trim() < String(startDate).trim()) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    const tripRef = adminDb.collection("trips").doc(tripId);
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (destination !== undefined) updateData.destination = String(destination || "").trim();
    if (startDate !== undefined) updateData.startDate = String(startDate || "").trim();
    if (endDate !== undefined) updateData.endDate = String(endDate || "").trim();
    if (registrationDeadline !== undefined) updateData.registrationDeadline = String(registrationDeadline || "").trim();
    if (registrationOpen !== undefined) updateData.registrationOpen = Boolean(registrationOpen);
    if (isCompleted !== undefined) updateData.isCompleted = Boolean(isCompleted);

    if (itinerary !== undefined) {
      updateData.itinerary = Array.isArray(itinerary)
        ? itinerary.map((item, idx) => ({
            day: item.day ? String(item.day).trim() : `Day ${idx + 1}`,
            title: String(item.title || "").trim(),
            description: String(item.description || "").trim(),
          })).filter((item) => item.title || item.description)
        : [];
    }

    if (itineraryLink !== undefined) {
      updateData.itineraryLink = String(itineraryLink || "").trim();
    }

    if (faqs !== undefined) {
      updateData.faqs = Array.isArray(faqs) ? faqs : [];
    }

    if (consentStatements !== undefined) {
      updateData.consentStatements = Array.isArray(consentStatements) ? consentStatements : [];
    }

    if (importantInformation !== undefined) {
      updateData.importantInformation = String(importantInformation || "").trim();
    }

    if (thingsToCarry !== undefined) {
      updateData.thingsToCarry = Array.isArray(thingsToCarry)
        ? thingsToCarry.map((item) => String(item).trim()).filter(Boolean)
        : [];
    }

    if (coordinators !== undefined) {
      updateData.coordinators = coordinators.map((c) => {
        if (typeof c === "object" && c !== null) {
          return {
            name: String(c.name || "").trim(),
            email: String(c.email || "").trim(),
            phone: String(c.phone || "").trim(),
            assignedOption: c.assignedOption ? String(c.assignedOption).trim() : null,
          };
        }
        return String(c).trim();
      });
    }

    if (totalSeats !== undefined) updateData.totalSeats = Number(totalSeats);
    if (fee !== undefined) updateData.fee = Number(fee);
    if (femaleReservedSeats !== undefined) updateData.femaleReservedSeats = Number(femaleReservedSeats);
    if (maleReservedSeats !== undefined) updateData.maleReservedSeats = Number(maleReservedSeats);
    if (releasedSeats !== undefined) updateData.releasedSeats = Number(releasedSeats);
    if (releasedSeatsType !== undefined) updateData.releasedSeatsType = releasedSeatsType;
    if (images !== undefined) {
      updateData.images = images.map((img, index) => ({
        url: img.url,
        publicId: img.publicId || "",
        sortOrder: img.sortOrder !== undefined ? img.sortOrder : index,
      }));
    }
    if (consentFormTemplateUrl !== undefined) updateData.consentFormTemplateUrl = consentFormTemplateUrl;
    if (consentTemplates !== undefined) updateData.consentTemplates = consentTemplates;
    if (whatsappLink !== undefined) updateData.whatsappLink = whatsappLink;
    if (qrCodeUrl !== undefined) updateData.qrCodeUrl = qrCodeUrl;
    if (emailsDisabled !== undefined) updateData.emailsDisabled = emailsDisabled;
    if (cityWhatsappSettings !== undefined) updateData.cityWhatsappSettings = cityWhatsappSettings;
    
    if (formFields !== undefined) {
      updateData.form = {
        fields: formFields.map((field, idx) => {
          const fieldData = {
            id: field.id || crypto.randomUUID(),
            name: field.name,
            type: field.type,
            sortOrder: field.sortOrder !== undefined ? field.sortOrder : idx,
            allowEditIfPrefilled: field.allowEditIfPrefilled !== false,
            dependsOnFieldId: field.dependsOnFieldId || null,
            dependsOnValue: field.dependsOnValue || null,
          };
          if (field.type === "radio" || field.type === "select") {
            fieldData.options = (field.options || []).filter(
              (opt) => opt && opt.trim() !== ""
            );
          }
          return fieldData;
        }),
      };
    }

    await tripRef.update(updateData);
    return NextResponse.json({ success: true, message: "Trip details updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("PUT Trip Error:", error);
    return NextResponse.json({ error: "Failed to update trip. Please try again." }, { status: 500 });
  }
}
