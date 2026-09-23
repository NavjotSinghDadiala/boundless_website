"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import UserRegistrationForm from "@/components/UserRegistrationForm";
import CoordinatorRoleModal from "@/components/CoordinatorRoleModal";

interface Trip {
  id: string;
  name: string;
  description?: string;
  registrationOpen: boolean;
  totalSeats: number;
  femaleJoined: number;
  totalJoined: number;
  fee?: number;
  form?: { fields: any[] };
  consentFormTemplateUrl?: string;
  whatsappLink?: string;
  qrCodeUrl?: string;
}

const getDocumentUrl = (url: string) => {
  if (!url) return "";
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  let filename = lastPart;
  return `/api/downloadProxy/${encodeURIComponent(filename)}?url=${encodeURIComponent(url)}`;
};

export default function SecureForm() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [autofillData, setAutofillData] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [reuploadConsent, setReuploadConsent] = useState<File | null>(null);
  const [reuploading, setReuploading] = useState(false);
  const [correctionValues, setCorrectionValues] = useState<Record<string, any>>({});
  const [studentNote, setStudentNote] = useState<string>("");
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Fetch all trips
  useEffect(() => {
    async function fetchTrips() {
      try {
        const res = await fetch("/api/trip");
        if (res.ok) {
          const data = await res.json();
          const allTrips = data.trips || [];
          const activeTrips = allTrips.filter((t: any) => !t.isCompleted && !t.finalRosterSaved);
          setTrips(activeTrips);
          if (activeTrips.length > 0) {
            // Default to first active trip or url param
            const params = new URLSearchParams(window.location.search);
            const urlTripId = params.get("tripId");
            if (urlTripId && activeTrips.some((t: any) => t.id === urlTripId)) {
              setSelectedTripId(urlTripId);
            } else {
              setSelectedTripId(activeTrips[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading trips:", err);
      }
    }
    fetchTrips();
  }, []);

  // Sync selected trip metadata
  useEffect(() => {
    if (selectedTripId) {
      const match = trips.find((t) => t.id === selectedTripId);
      if (match) {
        setSelectedTrip(match);
      } else {
        // Fetch trip directly if not in list
        const fetchSingleTrip = async () => {
          try {
            const res = await fetch(`/api/trip`);
            if (res.ok) {
              const data = await res.json();
              const tripMatch = data.trips?.find((t: any) => t.id === selectedTripId);
              if (tripMatch) setSelectedTrip(tripMatch);
            }
          } catch (e) {
            console.error(e);
          }
        };
        fetchSingleTrip();
      }
    }
  }, [selectedTripId, trips]);

  // Auth subscriber
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__MOCK_USER__) {
      setUser((window as any).__MOCK_USER__);
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email;
        if (!email || !email.endsWith("iitm.ac.in")) {
          alert("Only IIT Madras student email accounts (@study.iitm.ac.in / @iitm.ac.in) are allowed!");
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch registration & autofill details once user and trip are selected
  const fetchStatus = async () => {
    if (!user || !selectedTripId) return;
    setStatusLoading(true);
    try {
      if (typeof window !== "undefined" && (window as any).__MOCK_STATUS__) {
        const mockStatus = (window as any).__MOCK_STATUS__;
        setRegistration(mockStatus.registration);
        setAutofillData(mockStatus.autofillData);
        setStudentProfile(mockStatus.studentProfile || null);
        setStatusLoading(false);
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`/api/user-registration?tripId=${selectedTripId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRegistration(data.registration);
        setAutofillData(data.autofillData);
        setStudentProfile(data.studentProfile || null);
      }
    } catch (err) {
      console.error("Error fetching registration status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user, selectedTripId]);

  // Non-production test harness for deterministic visual QA
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      (window as any).__SET_TEST_STATE__ = (state: {
        user?: any;
        registration?: any;
        autofillData?: any;
        studentProfile?: any;
        selectedTrip?: any;
      }) => {
        if (state.user !== undefined) {
          const u = state.user
            ? {
                ...state.user,
                getIdToken: state.user.getIdToken || (async () => "mock-token"),
              }
            : null;
          setUser(u);
        }
        if (state.registration !== undefined) setRegistration(state.registration);
        if (state.autofillData !== undefined) setAutofillData(state.autofillData);
        if (state.studentProfile !== undefined) setStudentProfile(state.studentProfile);
        if (state.selectedTrip !== undefined) setSelectedTrip(state.selectedTrip);
        if ((state as any).selectedTripId !== undefined) setSelectedTripId((state as any).selectedTripId);
        if ((state as any).showCoordinatorModal !== undefined) {
          setShowCoordinatorModal(Boolean((state as any).showCoordinatorModal));
          if ((state as any).coordinatorName) setCoordinatorName((state as any).coordinatorName);
        }
        setStatusLoading(false);
      };
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      const signedInUser = res?.user;
      if (signedInUser && signedInUser.email && signedInUser.email.toLowerCase().endsWith("iitm.ac.in")) {
        try {
          const token = await signedInUser.getIdToken();
          const checkRes = await fetch("/api/auth/coordinator-status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (checkRes.ok) {
            const data = await checkRes.json();
            if (data.isCoordinator) {
              setCoordinatorName(data.name || signedInUser.displayName || "Coordinator");
              setShowCoordinatorModal(true);
            }
          }
        } catch (coordErr) {
          console.error("Coordinator check error:", coordErr);
        }
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      setAuthError("Google Sign-In is temporarily unavailable. Please try again in a few moments.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRegistration(null);
      setAutofillData(null);
      setStudentProfile(null);
      setStudentNote("");
      setCorrectionError(null);
      setCorrectionValues({});
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };


  const handleReupload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reuploading) return; // Prevent duplicate submissions

    setCorrectionError(null);

    // Check if any corrections or note were made
    const hasFieldCorrections = Object.keys(correctionValues).length > 0;
    const hasNote = studentNote.trim().length > 0;

    if (!hasFieldCorrections && !hasNote) {
      setCorrectionError("Please provide the requested corrections or a note before submitting.");
      return;
    }

    if (!user || !selectedTripId) {
      setCorrectionError("You must be signed in to submit corrections.");
      return;
    }

    setReuploading(true);
    try {
      let token: string;
      try {
        token = await user.getIdToken();
      } catch (authErr) {
        setCorrectionError("Your session has expired. Please sign in again.");
        setReuploading(false);
        return;
      }

      const formDataUpdates: any = { ...correctionValues };

      if (hasNote) {
        formDataUpdates["Custom Reply"] = studentNote.trim();
        formDataUpdates["Notes for Coordinator"] = studentNote.trim();
      }

      // Upload file fields if any
      const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });
      };

      const loadPdfJs = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib);
            return;
          }
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
            resolve((window as any).pdfjsLib);
          };
          script.onerror = () => reject(new Error("Failed to load PDF library"));
          document.head.appendChild(script);
        });
      };

      const convertPdfToJpg = async (file: File): Promise<string> => {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        const pagesData = [];
        let totalHeight = 0;
        let maxWidth = 0;

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          pagesData.push({ page, viewport });
          totalHeight += viewport.height;
          maxWidth = Math.max(maxWidth, viewport.width);
        }

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not get canvas context");
        canvas.height = totalHeight;
        canvas.width = maxWidth;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        let currentY = 0;
        for (const { page, viewport } of pagesData) {
          const renderCanvas = document.createElement("canvas");
          renderCanvas.width = viewport.width;
          renderCanvas.height = viewport.height;
          const renderContext = renderCanvas.getContext("2d");

          await page.render({ canvasContext: renderContext, viewport }).promise;

          context.drawImage(renderCanvas, 0, currentY);
          currentY += viewport.height;
        }

        return canvas.toDataURL("image/jpeg", 0.85);
      };

      try {
        const filePromises = Object.entries(correctionValues).map(async ([key, value]) => {
          if (value instanceof File) {
            let base64Image;
            if (value.type === "application/pdf" || value.name?.toLowerCase().endsWith(".pdf")) {
              try {
                base64Image = await convertPdfToJpg(value);
              } catch (pdfErr) {
                console.error("PDF to JPG conversion failed, falling back to base64 pdf:", pdfErr);
                base64Image = await convertToBase64(value);
              }
            } else {
              base64Image = await convertToBase64(value);
            }

            const fileRes = await fetch("/api/uploadImage", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                images: [base64Image],
                folder: "trip_registrations",
                email: user?.email || "anonymous",
                tripName: selectedTrip?.name || "Event",
                tripId: selectedTripId || "",
                subFolderType: key.includes("ID") ? "Student IDs" : (key.includes("Consent") ? "Consent Forms" : "Form Files"),
                fieldName: key,
              })
            });
            if (!fileRes.ok) throw new Error(`${key} upload failed`);
            const fileJson = await fileRes.json();
            formDataUpdates[key] = fileJson.images[0].secure_url || fileJson.images[0];
          }
        });
        await Promise.all(filePromises);
      } catch (uploadErr) {
        console.error("File upload error during corrections:", uploadErr);
        setCorrectionError("Failed to upload the attached file. Please ensure the file is under 1MB and in a valid format (PDF, JPG, or PNG).");
        setReuploading(false);
        return;
      }

      const patchRes = await fetch("/api/user-registration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          tripId: selectedTripId,
          formDataUpdates,
          studentNote: hasNote ? studentNote.trim() : undefined,
        })
      });

      if (!patchRes.ok) {
        let errMessage = "Could not submit corrections. Please check all fields and try again.";
        try {
          const errData = await patchRes.json();
          if (patchRes.status === 401) {
            errMessage = "Authentication expired. Please sign in again.";
          } else if (patchRes.status === 403) {
            errMessage = "Unauthorized account. Only verified IIT Madras student emails are allowed.";
          } else if (patchRes.status === 400 && errData.error) {
            errMessage = "Some submitted fields were invalid. Please review your updates and retry.";
          }
        } catch {
          // fallback to default errMessage
        }
        setCorrectionError(errMessage);
        setReuploading(false);
        return;
      }

      setCorrectionError(null);
      setCorrectionValues({});
      setStudentNote("");
      await fetchStatus();
    } catch (error) {
      console.error("Re-upload error:", error);
      setCorrectionError("An unexpected error occurred while submitting your updates. Please try again.");
    } finally {
      setReuploading(false);
    }
  };

  const formatMessageTimestamp = (timestamp: any): string => {
    if (!timestamp) return "";
    try {
      let date: Date;
      if (typeof timestamp === "string") {
        date = new Date(timestamp);
      } else if (timestamp?.toDate && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp?.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date(timestamp);
      }
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderConversationHistory = () => {
    const history = registration?.conversationHistory;
    if (!Array.isArray(history) || history.length === 0) {
      return null;
    }

    const safeHistory = history.filter(
      (item) => item && typeof item === "object" && (item.message || item.text || item.type)
    );

    if (safeHistory.length === 0) {
      return null;
    }

    return (
      <div className="w-full mt-4 mb-2 text-left">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]/70">
            💬 Conversation History
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-600">
            {safeHistory.length}
          </span>
        </div>

        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {safeHistory.map((item: any, idx: number) => {
            const isStudent = item.type === "student_reply";
            const messageText =
              typeof item.message === "string"
                ? item.message
                : typeof item.text === "string"
                ? item.text
                : "";
            const formattedDate = formatMessageTimestamp(item.timestamp);

            return (
              <div
                key={`msg-${idx}`}
                className={`p-3 rounded-xl text-xs transition-all ${
                  isStudent
                    ? "bg-zinc-100/90 border border-zinc-200/80 text-zinc-800 ml-3"
                    : "bg-amber-50/90 border border-amber-200/70 text-amber-950 mr-3"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`font-bold font-oswald uppercase tracking-wide text-[11px] ${
                      isStudent ? "text-zinc-600" : "text-amber-800"
                    }`}
                  >
                    {isStudent ? "👤 You" : "🛡️ Coordinator"}
                  </span>
                  {formattedDate && (
                    <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                      {formattedDate}
                    </span>
                  )}
                </div>

                {messageText ? (
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                    {messageText}
                  </p>
                ) : (
                  <p className="italic text-zinc-400 text-[11px]">
                    {isStudent ? "Submitted corrections" : "Requested updates"}
                  </p>
                )}

                {Array.isArray(item.updatedFields) && item.updatedFields.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-zinc-200/60 flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Updated:
                    </span>
                    {item.updatedFields.map((f: string, fIdx: number) => (
                      <span
                        key={fIdx}
                        className="inline-block text-[10px] bg-white/80 px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-600 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStudentIdStatus = () => {
    const idNumber = registration?.formData?.["Student ID Number"];
    const idCopy = registration?.formData?.["Student ID Card Copy"];
    const isVerified = registration?.studentIdVerified || false;
    const labelType = "Student ID";

    if (!registration || !idCopy) return null;
    return (
      <div className="mt-6 bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-4 text-left w-full space-y-2.5">
        <div className="flex items-center gap-2 text-[#3E1126] font-oswald font-bold text-xs uppercase tracking-wider">
          <span>🪪</span> {labelType} Verification Status
        </div>
        {idNumber && (
          <div className="flex justify-between items-center text-xs text-[#3E1126]/80 font-medium">
            <span>{labelType} Number:</span>
            <strong className="font-semibold text-sm text-[#3E1126]">
              {idNumber.length > 4 ? `XXXX-XXXX-${idNumber.slice(-4)}` : idNumber}
            </strong>
          </div>
        )}
        <div className="flex justify-between items-center text-xs text-[#3E1126]/80 font-medium">
          <span>Status:</span>
          <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded border ${isVerified
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-yellow-100 text-yellow-700 border-yellow-200"
            }`}>
            {isVerified ? "Verified ✅" : "Pending Review ⏳"}
          </span>
        </div>
        {idCopy && (
          <div className="pt-2 border-t border-[#3E1126]/10 flex justify-between items-center">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Uploaded Copy:</span>
            <a
              href={getDocumentUrl(idCopy)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#3E1126] underline hover:text-[#3E1126]/85 flex items-center gap-1"
            >
              View Copy ↗
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderExternalForms = () => {
    const forms = registration?.externalForms;
    if (!Array.isArray(forms) || forms.length === 0) return null;

    return (
      <div className="mt-4 bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-4 text-left w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#3E1126] font-oswald font-bold text-xs uppercase tracking-wider">
            <span>📝</span> Additional Forms
          </div>
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            {forms.length} {forms.length === 1 ? "Form" : "Forms"}
          </span>
        </div>
        <div className="space-y-2.5">
          {forms.map((form: any) => {
            const formName = form.name || form.formId;
            const status = (form.status || "").toLowerCase();
            const rawUrl = form.openUrl || form.formUrl || form.url;
            const hasValidUrl = typeof rawUrl === "string" && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"));

            let statusLabel = "Processing";
            let statusClass = "bg-blue-100 text-blue-700 border-blue-200";

            if (status === "matched" || status === "completed") {
              statusLabel = "Completed ✓";
              statusClass = "bg-green-100 text-green-700 border-green-200";
            } else if (status === "submitted") {
              statusLabel = "Submitted";
              statusClass = "bg-blue-100 text-blue-700 border-blue-200";
            } else if (status === "pending" || status === "active" || status === "pending_action") {
              statusLabel = "Pending";
              statusClass = "bg-amber-100 text-amber-800 border-amber-200";
            } else if (status === "inactive" || status === "unavailable") {
              statusLabel = "Unavailable";
              statusClass = "bg-zinc-100 text-zinc-500 border-zinc-200";
            }

            return (
              <div
                key={form.formId}
                className="bg-white border border-[#3E1126]/10 rounded-lg p-3 space-y-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-oswald font-bold text-xs sm:text-sm text-[#3E1126] truncate">
                      {formName}
                    </h4>
                    {form.description && (
                      <p className="text-[11px] text-zinc-500 font-medium mt-0.5 leading-snug">
                        {form.description}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                {hasValidUrl && status !== "matched" && status !== "completed" && status !== "inactive" && (
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-[#3E1126]/75 font-medium leading-relaxed">
                      Please complete this form.
                    </p>
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3E1126] bg-[#FCE16D] hover:bg-[#ebd05c] active:scale-95 px-3 py-1.5 rounded-md shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                      Open Form →
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return null;

  // Decision Gating
  const seatsFull = selectedTrip ? (selectedTrip.totalJoined >= selectedTrip.totalSeats) : false;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 font-sans antialiased bg-dots" style={{ backgroundColor: '#FAF6ED' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Inter:wght@400;500;600;700&display=swap');
        .font-oswald { font-family: 'Oswald', sans-serif; }
        .bg-dots {
          background-image: radial-gradient(rgba(62, 17, 38, 0.08) 2px, transparent 2px);
          background-size: 24px 24px;
        }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 30px white inset !important;
          -webkit-text-fill-color: #3E1126 !important;
        }
      `}} />

      <div className="w-full max-w-md relative flex flex-col items-center justify-center">

        {!user ? (
          <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden relative flex flex-col border border-black/5 p-8 text-center space-y-6" data-lenis-prevent>
            <h1 className="text-3xl font-oswald font-bold text-[#3E1126] uppercase tracking-wide">
              Trip Registration
            </h1>
            {selectedTrip && (
              <div className="px-4 py-2 bg-zinc-50 rounded-xl border-2 border-[#3E1126]/10 text-[#3E1126] font-bold text-sm uppercase tracking-wide">
                Event: {selectedTrip.name}
              </div>
            )}
            <h3 className="text-[#3E1126] font-bold text-sm">
              Sign in with your official IIT Madras student email ID to continue
            </h3>
            <p className="text-xs text-[#3E1126]/70 -mt-3">
              Only student accounts ending in <span className="font-semibold text-[#3E1126]">@study.iitm.ac.in</span> or <span className="font-semibold text-[#3E1126]">@iitm.ac.in</span> are authorized.
            </p>
            {authError && (
              <div className="w-full p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-medium text-left flex items-start justify-between gap-2 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <p className="font-bold text-amber-900 mb-0.5">Sign-In Notice</p>
                    <p className="text-amber-800">{authError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthError(null)}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold px-1"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-black bg-[#FCE16D] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] hover:bg-[#FFE878] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSigningIn ? (
                <span>Connecting to Google...</span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>CONTINUE WITH IITM GOOGLE ACCOUNT</span>
                </>
              )}
            </button>
          </div>
        ) : statusLoading ? (
          <div className="w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-black/5">
            <div className="text-[#3E1126] font-oswald font-bold text-xl uppercase tracking-wide animate-pulse">Verifying status...</div>
          </div>
        ) : !registration ? (
          // Form Registration view
          selectedTrip?.registrationOpen === false ? (
            <div className="w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-black/5">
              <div className="text-red-700 font-bold text-xl p-4 border-2 border-red-500/20 rounded-xl bg-red-50">
                Registration for this trip is currently closed.
              </div>
            </div>
          ) : (
            <UserRegistrationForm
              user={user}
              setUser={setUser}
              tripId={selectedTripId}
              autofillData={autofillData}
              studentProfile={studentProfile}
              onSuccess={fetchStatus}
            />
          )
        ) : (
          // Status steps
          <div className="w-full flex flex-col items-center justify-center">
            {registration.status === "registered" && (
              <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-black/5 p-8 text-center" data-lenis-prevent>
                <div className="w-16 h-16 bg-[#FCE16D] rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
                  <span className="text-3xl">⏳</span>
                </div>
                <h2 className="text-2xl font-oswald font-bold text-[#3E1126] uppercase mb-2">Registration Under Review</h2>
                <p className="text-[#3E1126]/80 text-sm font-medium leading-relaxed mb-6">
                  Your registration has been submitted successfully.
                </p>

                {/* Trip Details Card */}
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-4 text-left w-full space-y-3 mb-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">Trip</span>
                      <h4 className="font-oswald font-bold text-base text-[#3E1126]">
                        {selectedTrip?.name || registration.tripName || "Boundless Expedition"}
                      </h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                      PENDING APPROVAL
                    </span>
                  </div>

                  {registration.submittedAt && (
                    <div className="pt-2 border-t border-zinc-200/60 flex justify-between items-center text-xs text-zinc-500">
                      <span>Submitted:</span>
                      <span className="font-semibold text-[#3E1126] font-mono">
                        {formatMessageTimestamp(registration.submittedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {renderStudentIdStatus()}
                {renderExternalForms()}

                <Link
                  href="/my-trips"
                  className="w-full mt-6 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] hover:bg-[#2A0013] px-6 py-3.5 rounded-full transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🎒 MY TRIPS</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {registration.status === "action_required" && (
              <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-black/5 p-8 text-center" data-lenis-prevent>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
                  <span className="text-3xl text-amber-600">⚠️</span>
                </div>
                <h2 className="text-2xl font-oswald font-bold text-[#3E1126] uppercase mb-2">Action Required</h2>
                <p className="text-[#3E1126]/80 text-sm font-medium leading-relaxed mb-4">
                  Your registration needs a correction.
                </p>

                {registration.issueText && (
                  <div className="text-left text-sm text-amber-950 font-medium p-4 bg-amber-50 rounded-xl border-2 border-amber-200 mb-6 shadow-sm">
                    <span className="font-bold text-amber-900 block mb-1 text-xs uppercase tracking-wider">
                      Review Reason:
                    </span>
                    <p className="whitespace-pre-wrap break-words">{registration.issueText}</p>
                  </div>
                )}

                <form onSubmit={handleReupload} className="space-y-4 text-left bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5">
                  <h4 className="font-oswald font-bold text-sm uppercase tracking-wider text-[#3E1126] mb-3">Re-upload / Corrections</h4>

                  {registration.actionRequiredFields?.map((fieldName: string) => {
                    const isFileField = fieldName === "Student ID Card Copy" || fieldName === "Completed Consent Form" ||
                      fieldName.startsWith("Completed Consent -") ||
                      selectedTrip?.form?.fields?.find((f: any) => f.name === fieldName)?.type === "file";
                    const fieldType = selectedTrip?.form?.fields?.find((f: any) => f.name === fieldName)?.type || "short_text";

                    return (
                      <div key={fieldName} className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{fieldName}</label>

                        {isFileField ? (
                          <input
                            type="file"
                            accept="image/*,.pdf,.docx"
                            required
                            disabled={reuploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && file.size > 10 * 1024 * 1024) {
                                alert("File size must be less than 10MB");
                                e.target.value = '';
                                return;
                              }
                              setCorrectionValues(prev => ({ ...prev, [fieldName]: file || null }));
                            }}
                            className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#3E1126] file:text-white hover:file:bg-[#3E1126]/80 file:cursor-pointer file:transition-colors bg-white border-2 border-zinc-200 rounded-xl p-1 disabled:opacity-50"
                          />
                        ) : fieldType === "long_text" || fieldName === "Custom Reply" ? (
                          <textarea
                            required
                            disabled={reuploading}
                            placeholder={fieldName === "Custom Reply" ? "Type your reply to the organizer's message..." : `Enter corrected ${fieldName.toLowerCase()}...`}
                            value={correctionValues[fieldName] || ""}
                            onChange={(e) => setCorrectionValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                            className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-[#3E1126]/40 focus:outline-none min-h-[80px] resize-none disabled:opacity-50"
                          />
                        ) : (
                          <input
                            type={fieldType === "date" ? "date" : fieldType === "email" ? "email" : "text"}
                            required
                            disabled={reuploading}
                            placeholder={`Enter corrected ${fieldName.toLowerCase()}...`}
                            value={correctionValues[fieldName] || ""}
                            onChange={(e) => setCorrectionValues(prev => ({ ...prev, [fieldName]: e.target.value }))}
                            className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-[#3E1126]/40 focus:outline-none disabled:opacity-50"
                          />
                        )}
                      </div>
                    );
                  })}

                  {(!registration.actionRequiredFields || registration.actionRequiredFields.length === 0) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your Reply</label>
                      <textarea
                        required={!studentNote.trim()}
                        disabled={reuploading}
                        placeholder="Type your reply to the organizer's message..."
                        value={correctionValues["User Reply"] || ""}
                        onChange={(e) => setCorrectionValues(prev => ({ ...prev, ["User Reply"]: e.target.value }))}
                        className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-[#3E1126]/40 focus:outline-none min-h-[80px] resize-none disabled:opacity-50"
                      />
                    </div>
                  )}

                  {/* Conversation History Timeline */}
                  {renderConversationHistory()}

                  {/* Optional Student Note for Coordinator */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Notes for Coordinator (optional)
                    </label>
                    <textarea
                      disabled={reuploading}
                      placeholder="e.g. I have uploaded a clearer scan / corrected the requested details..."
                      value={studentNote}
                      onChange={(e) => setStudentNote(e.target.value)}
                      className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-[#3E1126]/40 focus:outline-none min-h-[70px] resize-none disabled:opacity-50"
                    />
                  </div>

                  {/* User-friendly error message */}
                  {correctionError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium text-left flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">⚠️</span>
                      <span className="leading-relaxed">{correctionError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={reuploading}
                    className="w-full mt-4 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] px-6 py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed shadow-md"
                  >
                    {reuploading ? "Submitting Corrections..." : "REUPLOAD"}
                  </button>
                </form>

                {renderExternalForms()}

                <Link
                  href="/my-trips"
                  className="w-full mt-4 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-[#3E1126] hover:text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 px-6 py-3 rounded-full transition-all"
                >
                  <span>🎒 MY TRIPS</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {(registration.status === "approved_to_pay" || registration.status === "mail_sent") && (
              <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-black/5 p-8 text-center" data-lenis-prevent>
                <div className="w-16 h-16 bg-[#E8F8F5] rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-2xl font-oswald font-bold text-[#3E1126] uppercase mb-2">Registration Approved</h2>
                <p className="text-[#3E1126]/80 text-sm font-medium leading-relaxed mb-6">
                  Your registration has been approved. Welcome aboard!
                </p>

                {/* Trip Details Card */}
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-4 text-left w-full space-y-2 mb-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-0.5">Trip</span>
                      <h4 className="font-oswald font-bold text-base text-[#3E1126]">
                        {selectedTrip?.name || registration.tripName || "Boundless Expedition"}
                      </h4>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-900 border border-green-200 shrink-0">
                      APPROVED
                    </span>
                  </div>
                </div>

                {renderStudentIdStatus()}
                {renderExternalForms()}
                <Link
                  href="/my-trips"
                  className="w-full mt-6 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] hover:bg-[#2A0013] px-6 py-3.5 rounded-full transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🎒 MY TRIPS</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {registration.status === "paid" && (
              <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-black/5 p-8 text-center" data-lenis-prevent>
                <div className="w-16 h-16 bg-[#F0EBF8] rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
                  <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-3xl font-oswald font-bold text-[#3E1126] uppercase mb-2">Seat Confirmed!</h2>
                <p className="text-[#3E1126]/80 text-sm font-medium leading-relaxed mb-6">
                  Your registration and seat are confirmed. Pack your bags!
                </p>

                {renderStudentIdStatus()}
                {renderExternalForms()}
                <Link
                  href="/my-trips"
                  className="w-full mt-6 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] hover:bg-[#2A0013] px-6 py-3.5 rounded-full transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🎒 MY TRIPS</span>
                  <span>→</span>
                </Link>
              </div>
            )}

            {registration.status === "rejected" && (
              <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden border border-black/5 p-8 text-center" data-lenis-prevent>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
                  <span className="text-3xl text-red-600">✕</span>
                </div>
                <h2 className="text-2xl font-oswald font-bold text-[#3E1126] uppercase mb-2">Registration Not Approved</h2>
                <p className="text-[#3E1126]/80 text-sm font-medium leading-relaxed mb-4">
                  Your registration could not be approved for this trip.
                </p>

                {registration.issueText && (
                  <div className="text-left text-sm text-red-950 font-medium p-4 bg-red-50 rounded-xl border border-red-200 mb-6 shadow-sm">
                    <span className="font-bold text-red-900 block mb-1 text-xs uppercase tracking-wider">
                      Reason:
                    </span>
                    <p className="whitespace-pre-wrap break-words">{registration.issueText}</p>
                  </div>
                )}

                {renderStudentIdStatus()}
                <Link
                  href="/my-trips"
                  className="w-full mt-6 flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] hover:bg-[#2A0013] px-6 py-3.5 rounded-full transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>🎒 MY TRIPS</span>
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Coordinator Role Selection Modal */}
        <CoordinatorRoleModal
          isOpen={showCoordinatorModal}
          coordinatorName={coordinatorName}
          onSelectTraveller={() => setShowCoordinatorModal(false)}
          onSelectCoordinator={() => {
            setShowCoordinatorModal(false);
            router.push("/coordinator");
          }}
        />
      </div>
    </div>
  );
}
