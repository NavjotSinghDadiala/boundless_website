"use client";

import { useEffect, useState, useRef } from "react";
import { app, auth } from "@/lib/firebase";
import {
    getFirestore,
    doc,
    getDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ShieldAlertIcon, Mail, Compass, ArrowRight, ArrowLeft, CheckCircle2, FileText, Upload, MapPin, Phone, User as UserIcon, AlertTriangle, X, Eye } from "lucide-react";
import LocationSelect from "@/components/ui/LocationSelect";
import {
    INDIAN_STATES_AND_UTS,
    getDistrictsForState,
    isValidState,
    isValidDistrict,
} from "@/lib/indiaLocations";

const ScallopDivider = ({ topColor }) => (
  <div className="w-full h-[15px] relative z-10 -mt-[1px] mb-[1px]">
    <svg width="100%" height="15" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0">
      <defs>
        <pattern id={`form-scallop-${topColor.replace('#', '')}`} x="0" y="0" width="30" height="15" patternUnits="userSpaceOnUse">
          <path d="M0,0 a15,15 0 0,0 30,0" fill={topColor} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="15" fill={`url(#form-scallop-${topColor.replace('#', '')})`} />
    </svg>
  </div>
);

const CollapsibleDescription = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = text.length > 250;
  const displayText = shouldTruncate && !isExpanded ? `${text.slice(0, 250)}...` : text;

  return (
    <div className="p-4 bg-[#3E1126]/5 border-2 border-dashed border-[#3E1126]/10 rounded-2xl text-xs sm:text-sm text-[#3E1126]/85 font-medium leading-relaxed whitespace-pre-line relative transition-all duration-300">
      <p>{displayText}</p>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs font-bold text-[#3E1126] underline hover:text-[#3E1126]/80 flex items-center gap-1 focus:outline-none"
        >
          {isExpanded ? "Show Less ▲" : "Read More ▼"}
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Registration submit error reporting (shown in-page, no alert()/DevTools needed)
// ---------------------------------------------------------------------------
const SUBMIT_TIMEOUT_MS = 45_000;

// Plain random reference ID (NOT a hash), e.g. REG-8F29A1C70B
const generateRequestId = () => {
    try {
        const bytes = new Uint8Array(5);
        window.crypto.getRandomValues(bytes);
        return `REG-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    } catch (_) {
        return `REG-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    }
};

const GENERIC_FAILURE_MESSAGE =
    "We couldn't complete your registration right now. Please try again. If the problem continues, contact the Boundless team and provide the reference number.";

// Student-facing messages. Raw backend exception text is never shown; for 4xx
// responses the server's curated message (e.g. "Phone number is required") is used.
const getFriendlySubmitMessage = (code, status, serverMessage) => {
    switch (code) {
        case "QUOTA_EXHAUSTED":
        case "RATE_LIMITED":
            return "Registration service is temporarily busy. Please try again in a few moments.";
        case "REGISTRATION_CLOSED":
            return "Registration for this trip is currently closed.";
        case "ALREADY_REGISTERED":
            return "You already have a registration for this trip.";
        case "CAPACITY_FULL":
            return "All available seats are currently filled. Your registration can be placed on the waiting list.";
        case "TRIP_NOT_FOUND":
            return "This trip could not be found. Please refresh the page and try again.";
        case "AUTH_FAILED":
            if (status === 403 && serverMessage) return serverMessage;
            return "Your Google sign-in session has expired. Please sign in again.";
        case "VALIDATION_FAILED":
            return serverMessage || "Some registration information is missing or invalid. Please review your details.";
        case "NETWORK_ERROR":
            return "We couldn't reach the registration service. Please check your internet connection and try again.";
        case "TIMEOUT":
            return "The registration service took too long to respond. Please check your registration status before trying again.";
        default:
            if (status && status >= 400 && status < 500 && serverMessage) return serverMessage;
            return GENERIC_FAILURE_MESSAGE;
    }
};

const SubmitErrorPanel = ({ error, onRetry, onDismiss, retryDisabled }) => {
    const [copied, setCopied] = useState(false);
    if (!error) return null;
    const copyReference = async () => {
        try {
            await navigator.clipboard.writeText(error.requestId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) {
            // Clipboard unavailable: the reference text is user-select:all so it can be long-pressed.
        }
    };
    return (
        <div
            id="registration-submit-error"
            role="alert"
            aria-live="assertive"
            className="w-full max-w-full overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50 p-4 sm:p-5 text-left space-y-3 animate-in fade-in duration-200"
        >
            <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                    <h3 className="font-oswald font-bold uppercase tracking-wide text-sm sm:text-base text-red-800 leading-tight">
                        Registration couldn't be completed
                    </h3>
                    <p className="text-xs text-red-700/90 font-medium mt-0.5">We couldn't submit your registration.</p>
                </div>
                {onDismiss && (
                    <button
                        type="button"
                        id="registration-submit-error-dismiss"
                        onClick={onDismiss}
                        aria-label="Dismiss error"
                        className="p-1 -m-1 text-red-500 hover:text-red-800 shrink-0 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="rounded-xl bg-white/80 border border-red-100 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Error</span>
                <p className="text-sm text-red-900 font-semibold leading-snug break-words mt-0.5">{error.message}</p>
            </div>

            {error.requestId && (
                <div className="rounded-xl bg-white/80 border border-red-100 p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block">Reference</span>
                        <code
                            id="registration-submit-error-reference"
                            className="text-sm font-mono font-bold text-red-900 break-all select-all"
                        >
                            {error.requestId}
                        </code>
                    </div>
                    <button
                        type="button"
                        id="registration-submit-error-copy"
                        onClick={copyReference}
                        className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-3 py-2 rounded-full border border-red-200 text-red-700 bg-white hover:bg-red-100 cursor-pointer"
                    >
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            )}

            <p className="text-xs text-red-700/90 font-medium">
                Please try again. If it keeps failing, send the reference above to the Boundless team.
            </p>

            {onRetry && (
                <button
                    type="button"
                    id="registration-submit-error-retry"
                    onClick={onRetry}
                    disabled={retryDisabled}
                    className="w-full min-h-[44px] py-3 px-4 rounded-full bg-red-700 hover:bg-red-800 active:scale-[0.98] text-white text-xs sm:text-sm font-oswald font-bold uppercase tracking-wider transition disabled:opacity-60 cursor-pointer"
                >
                    Try Again
                </button>
            )}
        </div>
    );
};

export default function UserRegistrationForm({ user, setUser, tripId, trip, autofillData, studentProfile, onSuccess }) {
    const dbRef = useRef(null);
    const [dbReady, setDbReady] = useState(false);
    const isSubmittingRef = useRef(false);
    
    useEffect(() => {
        dbRef.current = getFirestore(app);
        setDbReady(true);
    }, []);

    const [fields, setFields] = useState([]);
    const [formValues, setFormValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    // In-page submit error: { message, code, requestId }
    const [submitError, setSubmitError] = useState(null);
    const [step, setStep] = useState(1);

    // Consent Form State
    const [showConsent, setShowConsent] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [consentFormTemplateUrl, setConsentFormTemplateUrl] = useState("");
    const [consentTemplates, setConsentTemplates] = useState([]);
    const [consentStatements, setConsentStatements] = useState([]);
    const [consentAccepted, setConsentAccepted] = useState({});
    const [consentFiles, setConsentFiles] = useState({}); // mapping: templateId -> File object
    const [tripName, setTripName] = useState("Event");
    const [tripDescription, setTripDescription] = useState("");

    // Student ID Verification State (canonical studentProfile is source of truth)
    const isIdVerified = Boolean(studentProfile?.studentIdVerified);
    const [studentIdNum, setStudentIdNum] = useState("");
    const [studentIdFile, setStudentIdFile] = useState(null); // stores the uploaded Google Drive URL
    const [studentIdFileId, setStudentIdFileId] = useState(null); // stores the Google Drive File ID

    // Background upload tracking states
    const [uploadingStudentId, setUploadingStudentId] = useState(false);
    const [uploadingConsent, setUploadingConsent] = useState({}); // mapping: templateId -> boolean
    const [uploadingDynamic, setUploadingDynamic] = useState({}); // mapping: fieldName -> boolean

    // Gender Profile State
    const getInitialGender = () => {
        if (studentProfile?.gender && studentProfile.gender !== "unknown") {
            return studentProfile.gender.charAt(0).toUpperCase() + studentProfile.gender.slice(1).toLowerCase();
        }
        if (autofillData?.["Gender"]) {
            const g = String(autofillData["Gender"]).toLowerCase().trim();
            if (g.startsWith("f")) return "Female";
            if (g.startsWith("m")) return "Male";
            if (g) return "Other";
        }
        return "";
    };
    const [genderContact, setGenderContact] = useState(getInitialGender());
    const [isEditingGender, setIsEditingGender] = useState(false);
    const [genderError, setGenderError] = useState(null);

    // Gender Unknown 2-step confirmation modal states (Section 26 & 27)
    const [unknownGenderStep, setUnknownGenderStep] = useState(0); // 0 = none, 1 = first confirmation, 2 = second confirmation, 3 = confirmed unknown
    const [alsoUpdateProfileGender, setAlsoUpdateProfileGender] = useState(false);

    // Contact Phone Profile State
    const [phoneContact, setPhoneContact] = useState(
        studentProfile?.phone || autofillData?.["Contact Number"] || autofillData?.["Phone Number"] || autofillData?.["Phone"] || ""
    );
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneError, setPhoneError] = useState(null);

    // Location Profile State (State + City / District)
    const [stateLocation, setStateLocation] = useState(
        studentProfile?.state || autofillData?.["State"] || ""
    );
    const [districtLocation, setDistrictLocation] = useState(
        studentProfile?.cityDistrict || autofillData?.["City / District"] || ""
    );
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [locationErrors, setLocationErrors] = useState({ state: null, district: null });

    useEffect(() => {
        if (studentProfile?.gender === "unknown") {
            if (unknownGenderStep === 0) {
                setUnknownGenderStep(1);
            }
        } else if (studentProfile?.gender) {
            setGenderContact(studentProfile.gender.charAt(0).toUpperCase() + studentProfile.gender.slice(1).toLowerCase());
        } else if (autofillData?.["Gender"]) {
            const g = String(autofillData["Gender"]).toLowerCase().trim();
            if (g.startsWith("f")) setGenderContact("Female");
            else if (g.startsWith("m")) setGenderContact("Male");
            else if (g === "unknown") {
                if (unknownGenderStep === 0) setUnknownGenderStep(1);
            } else if (g) setGenderContact("Other");
        }

        if (studentProfile?.phone) {
            setPhoneContact(studentProfile.phone);
        } else if (autofillData?.["Contact Number"]) {
            setPhoneContact(autofillData["Contact Number"]);
        } else if (autofillData?.["Phone Number"]) {
            setPhoneContact(autofillData["Phone Number"]);
        } else if (autofillData?.["Phone"]) {
            setPhoneContact(autofillData["Phone"]);
        }

        if (studentProfile?.state) {
            setStateLocation(studentProfile.state);
        } else if (autofillData?.["State"]) {
            setStateLocation(autofillData["State"]);
        }
        if (studentProfile?.cityDistrict) {
            setDistrictLocation(studentProfile.cityDistrict);
        } else if (autofillData?.["City / District"]) {
            setDistrictLocation(autofillData["City / District"]);
        }
    }, [studentProfile, autofillData]);

    // Canonical profile attribute mapper for trip form fields
    const getCanonicalValueForField = (fieldName) => {
        if (!studentProfile) return undefined;
        const lower = (fieldName || "").toLowerCase().trim();

        // Full Name
        if (
            lower === "name" ||
            lower === "full name" ||
            lower === "fullname" ||
            (lower.includes("name") &&
                !lower.includes("father") &&
                !lower.includes("mother") &&
                !lower.includes("emergency") &&
                !lower.includes("parent"))
        ) {
            return studentProfile.name || undefined;
        }

        // Student ID / Roll Number
        if (
            lower === "roll number" ||
            lower === "roll no" ||
            lower === "rollno" ||
            lower === "student id" ||
            lower === "student id number" ||
            lower.includes("roll")
        ) {
            return studentProfile.studentId || undefined;
        }

        // Gender
        if (lower.includes("gender") || lower === "sex") {
            if (studentProfile.gender && studentProfile.gender !== "unknown") {
                return studentProfile.gender.charAt(0).toUpperCase() + studentProfile.gender.slice(1);
            }
        }

        // Date of Birth
        if (lower.includes("dob") || lower.includes("birth") || lower === "date of birth") {
            return studentProfile.dob || undefined;
        }

        // Phone / Contact Number
        if (
            lower === "phone" ||
            lower === "contact" ||
            lower === "mobile" ||
            lower === "contact number" ||
            lower === "phone number" ||
            (lower.includes("phone") && !lower.includes("emergency") && !lower.includes("parent")) ||
            (lower.includes("contact") && !lower.includes("emergency") && !lower.includes("parent"))
        ) {
            return studentProfile.phone || undefined;
        }

        // WhatsApp Number
        if (lower.includes("whatsapp")) {
            return studentProfile.whatsapp || studentProfile.phone || undefined;
        }

        // Residence / Hostel / City
        if (lower.includes("residence") || lower.includes("hostel") || lower.includes("address")) {
            return studentProfile.residence || undefined;
        }

        // State
        if (lower === "state" || (lower.includes("state") && !lower.includes("statement"))) {
            return studentProfile.state || undefined;
        }

        // City / District
        if (
            lower === "city / district" ||
            lower === "city/district" ||
            lower === "citydistrict" ||
            lower === "city or district" ||
            lower === "district"
        ) {
            return studentProfile.cityDistrict || undefined;
        }

        return undefined;
    };

    const isFieldDisabled = (fieldName) => {
        const field = fields.find(f => f.name === fieldName);
        if (!field) return false;
        if (field.allowEditIfPrefilled === false) {
            const canonicalVal = getCanonicalValueForField(fieldName);
            if (canonicalVal !== undefined && canonicalVal !== "") return true;
            if (autofillData && autofillData[fieldName] !== undefined && autofillData[fieldName] !== "") return true;
        }
        return false;
    };

    const isFieldVisible = (f) => {
        if (!f.dependsOnFieldId) return true;
        const parentField = fields.find(p => p.id === f.dependsOnFieldId);
        if (!parentField) return true;
        if (!isFieldVisible(parentField)) return false;
        const parentValue = formValues[parentField.name];
        return parentValue === f.dependsOnValue;
    };

    useEffect(() => {
        if (!tripId) return;

        const populateTripFields = (data) => {
            setTripName(data?.name || "Event");
            setTripDescription(data?.description || "");
            setConsentFormTemplateUrl(data?.consentFormTemplateUrl || "");
            const templates = data?.consentTemplates && data.consentTemplates.length > 0
                ? data.consentTemplates
                : (data?.consentFormTemplateUrl ? [{ id: "legacy-consent", name: "Completed Consent Form", templateUrl: data.consentFormTemplateUrl }] : []);
            setConsentTemplates(templates);
            const statements = data?.consentStatements || [];
            setConsentStatements(statements);
            const initialAccepted = {};
            statements.forEach((s) => {
                initialAccepted[s.id] = false;
            });
            setConsentAccepted(initialAccepted);
            const formFields = data?.form?.fields || [];
            const sorted = [...formFields].sort((a, b) => a.sortOrder - b.sortOrder);
            setFields(sorted);

            // Initialize formValues with priority: studentProfile -> historical autofillData -> empty
            const prefilled = {};
            sorted.forEach((field) => {
                const canonicalVal = getCanonicalValueForField(field.name);
                if (canonicalVal !== undefined && canonicalVal !== "") {
                    prefilled[field.name] = canonicalVal;
                } else if (autofillData && autofillData[field.name] !== undefined) {
                    prefilled[field.name] = autofillData[field.name];
                }
            });
            setFormValues(prefilled);
            setLoading(false);
        };

        // If trip prop was already passed down from parent, use it directly (0 client Firestore reads!)
        if (trip && trip.id === tripId) {
            populateTripFields(trip);
            return;
        }

        // Fallback: fetch trip via client SDK only if trip prop not provided
        if (!dbRef.current) return;
        const fetchForm = async () => {
            try {
                const docRef = doc(dbRef.current, "trips", tripId);
                const snapshot = await getDoc(docRef);

                if (snapshot.exists()) {
                    populateTripFields(snapshot.data());
                }
            } catch (err) {
                console.error("Error loading trip form fields:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchForm();
    }, [trip, dbReady, tripId, autofillData, studentProfile]);

    const handleChange = (fieldName, value) => {
        setFormValues((prev) => ({ ...prev, [fieldName]: value }));
    };

    const renderField = (field) => {
        const isVisible = isFieldVisible(field);
        if (!isVisible) return null;

        const currentVal = formValues[field.name] || "";
        const canonicalVal = getCanonicalValueForField(field.name);
        const hasProfileSource = canonicalVal !== undefined && canonicalVal !== "";
        
        return (
            <div key={field.id} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
                {field.type !== "description_text" && (
                    <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                            {field.name}
                        </label>
                        {hasProfileSource && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3E1126]/10 text-[#3E1126] shrink-0">
                                FROM YOUR PROFILE
                            </span>
                        )}
                    </div>
                )}

                {field.type === "description_text" && (
                    <CollapsibleDescription text={field.name} />
                )}
                
                {field.type === "short_text" && (
                    <input
                        type="text"
                        required
                        value={currentVal}
                        disabled={isFieldDisabled(field.name)}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={`w-full px-4 py-3 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none transition-all ${
                            isFieldDisabled(field.name)
                                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                                : "bg-zinc-50 text-[#3E1126] focus:border-[#3E1126]/10 focus:bg-white"
                        }`}
                    />
                )}

                {field.type === "long_text" && (
                    <textarea
                        rows={2}
                        required
                        value={currentVal}
                        disabled={isFieldDisabled(field.name)}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={`w-full px-4 py-3 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none transition-all resize-none ${
                            isFieldDisabled(field.name)
                                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                                : "bg-zinc-50 text-[#3E1126] focus:border-[#3E1126]/10 focus:bg-white"
                        }`}
                    />
                )}

                {field.type === "date" && (
                    <input
                        type="date"
                        required
                        value={currentVal}
                        disabled={isFieldDisabled(field.name)}
                        onChange={(e) => handleChange(field.name, e.target.value)}
                        className={`w-full px-4 py-3 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none transition-all ${
                            isFieldDisabled(field.name)
                                ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                                : "bg-zinc-50 text-[#3E1126] focus:border-[#3E1126]/10 focus:bg-white"
                        }`}
                    />
                )}

                {field.type === "select" && (
                    <div className="relative">
                        <select
                            required
                            value={currentVal}
                            disabled={isFieldDisabled(field.name)}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            className={`w-full px-4 py-3 border-2 border-transparent rounded-xl text-sm font-medium focus:outline-none transition-all appearance-none ${
                                isFieldDisabled(field.name)
                                    ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border-transparent"
                                    : "bg-zinc-50 text-[#3E1126] focus:border-[#3E1126]/10 focus:bg-white"
                            }`}
                        >
                            <option value="" disabled>Select an option</option>
                            {field.options?.map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-zinc-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                )}

                {field.type === "radio" && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {field.options?.map((option) => {
                            const isDisabled = isFieldDisabled(field.name);
                            return (
                                <label key={option} className={`flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    currentVal === option
                                        ? isDisabled
                                            ? 'border-zinc-300 bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                            : 'border-[#3E1126] bg-[#3E1126]/5 text-[#3E1126]'
                                        : isDisabled
                                        ? 'border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed opacity-50'
                                        : 'border-zinc-100 bg-zinc-50 text-zinc-500 hover:border-[#3E1126]/20'
                                }`}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name={field.name}
                                        value={option}
                                        required
                                        disabled={isDisabled}
                                        checked={currentVal === option}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                    />
                                    <span className="text-sm font-bold">{option}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {field.type === "file" && (
                    <div className="space-y-1.5">
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            required={!currentVal}
                            disabled={isFieldDisabled(field.name) || uploadingDynamic[field.name]}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 10 * 1024 * 1024) {
                                    alert("File size must be less than 10MB");
                                    e.target.value = "";
                                    return;
                                }
                                setUploadingDynamic(prev => ({ ...prev, [field.name]: true }));
                                const uploadResult = await uploadFileToDrive(file, "Form Files", field.name);
                                const url = typeof uploadResult === "object" && uploadResult ? uploadResult.url : uploadResult;
                                if (url) {
                                    handleChange(field.name, url);
                                } else {
                                    e.target.value = "";
                                    handleChange(field.name, "");
                                }
                                setUploadingDynamic(prev => ({ ...prev, [field.name]: false }));
                            }}
                            className={`w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#3E1126] file:text-white hover:file:bg-[#3E1126]/80 file:cursor-pointer file:transition-colors border-2 border-transparent rounded-xl p-1 ${
                                isFieldDisabled(field.name)
                                    ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                    : "bg-zinc-50"
                            }`}
                        />
                        {uploadingDynamic[field.name] && (
                            <p className="text-xs text-amber-600 font-bold animate-pulse">Uploading file... Please wait.</p>
                        )}
                        {currentVal && typeof currentVal === "string" && currentVal.startsWith("http") && (
                            <p className="text-xs text-green-600 font-bold">Uploaded successfully! ✅</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const uploadFileToDrive = async (file, subFolderType, fieldName) => {
        try {
            const token = await user.getIdToken();
            const base64Image = await convertToBase64(file);

            if (!base64Image || typeof base64Image !== "string" || !base64Image.startsWith("data:")) {
                throw new Error("Invalid file format. Please upload an image or a PDF.");
            }

            const uploadRes = await fetch("/api/uploadImage", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    images: [base64Image],
                    folder: "trip_registrations",
                    email: user?.email || studentProfile?.email || autofillData?.email || "anonymous",
                    tripName: tripName || "Event",
                    subFolderType: subFolderType,
                    tripId: tripId || "",
                    fieldName: fieldName || "",
                }),
            });
            const data = await uploadRes.json();
            if (!uploadRes.ok) {
                throw new Error(data.error || "File upload failed");
            }
            const imageUrl = data.images?.[0]?.secure_url || data.images?.[0] || data.fileUrl || data.driveUrl;
            const fileId = data.images?.[0]?.driveFileId || data.images?.[0]?.fileId || data.fileId || data.driveFileId || null;
            const fileName = data.images?.[0]?.fileName || data.fileName || null;
            return { url: imageUrl, fileId, fileName };
        } catch (error) {
            console.error("Instant upload failed:", error);
            alert(`Upload failed for ${fieldName}: ${error.message}`);
            return null;
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    const convertToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const loadPdfJs = () => {
      return new Promise((resolve, reject) => {
        if (window.pdfjsLib) {
          resolve(window.pdfjsLib);
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        };
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    };

    const convertPdfToJpg = async (file) => {
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
      canvas.height = totalHeight;
      canvas.width = maxWidth;

      // Fill background with white to avoid black regions on JPG export
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

    const downloadAsPdf = async (imageUrl, filename) => {
      try {
        if (!window.jspdf) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error("Failed to load image"));
        });

        const imgWidth = img.width;
        const imgHeight = img.height;
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const width = imgWidth * ratio;
        const height = imgHeight * ratio;
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;

        doc.addImage(img, "JPEG", x, y, width, height);
        doc.save(filename);
      } catch (err) {
        console.error("PDF generation failed:", err);
        window.open(imageUrl, "_blank");
      }
    };

    const hasConditional = fields.filter((field) => !!field.dependsOnFieldId).some(isFieldVisible);
    const hasConsents = consentTemplates.length > 0;

    const handleNext = (e) => {
      if (e) e.preventDefault();
      
      if (step === 1) {
        // Compulsory Gender validation
        let hasGenderErr = false;
        if (!genderContact || !genderContact.trim()) {
          setGenderError("Please select your gender.");
          hasGenderErr = true;
        } else {
          setGenderError(null);
        }

        // Compulsory phone number validation
        let hasPhoneErr = false;
        if (!phoneContact || !phoneContact.trim()) {
          setPhoneError("Phone number is required.");
          hasPhoneErr = true;
        } else {
          let digits = phoneContact.replace(/\D/g, "");
          if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
          else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
          if (!/^[6-9]\d{9}$/.test(digits)) {
            setPhoneError("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
            hasPhoneErr = true;
          } else {
            setPhoneError(null);
          }
        }

        let hasLocError = false;
        const errors = { state: null, district: null };
        if (!stateLocation || !stateLocation.trim()) {
          errors.state = "Please select your state.";
          hasLocError = true;
        } else if (!isValidState(stateLocation)) {
          errors.state = "Please select a valid Indian State or Union Territory.";
          hasLocError = true;
        }

        if (!districtLocation || !districtLocation.trim()) {
          errors.district = "Please select your city/district.";
          hasLocError = true;
        } else if (stateLocation && !isValidDistrict(stateLocation, districtLocation)) {
          errors.district = `Please select a valid district for ${stateLocation}.`;
          hasLocError = true;
        }

        if (hasGenderErr || hasPhoneErr || hasLocError) {
          if (hasLocError) setLocationErrors(errors);
          return;
        }
        setLocationErrors({ state: null, district: null });
        setPhoneError(null);
        setGenderError(null);
        setStep(2);
        if (fields.filter((field) => !field.dependsOnFieldId).length === 0) {
          setShowReviewModal(true);
        }
      } else if (step === 2) {
        setShowReviewModal(true);
      } else if (step === 3) {
        if (hasConsents) {
          setStep(4);
        } else {
          setStep(5);
        }
      } else if (step === 4) {
        setStep(5);
      }
    };

    const handleConfirmReviewAndProceed = () => {
      setShowReviewModal(false);
      if (hasConditional) {
        setStep(3);
      } else if (hasConsents) {
        setStep(4);
      } else {
        setStep(5);
      }
    };

    const handleBack = (e) => {
      if (e) e.preventDefault();
      setShowReviewModal(false);
      if (step === 5) {
        if (hasConsents) {
          setStep(4);
        } else if (hasConditional) {
          setStep(3);
        } else {
          setStep(2);
        }
      } else if (step === 4) {
        if (hasConditional) {
          setStep(3);
        } else {
          setStep(2);
        }
      } else if (step === 3) {
        setStep(2);
      } else if (step === 2) {
        setStep(1);
      }
    };

    const handleSubmit = async (e) => {
        e?.preventDefault?.();

        if (!user || !tripId) return;

        // Synchronous lock against rapid multi-click/double-submit
        if (isSubmittingRef.current || submitting) return;

        // One reference ID per submit attempt, sent to the server so client + server logs line up
        const requestId = generateRequestId();
        const showSubmitError = (code, message, refId = requestId) =>
            setSubmitError({ code, message, requestId: refId });
        setSubmitError(null);

        // Prevent submission if anything is still uploading
        if (uploadingStudentId || Object.values(uploadingConsent).some(Boolean) || Object.values(uploadingDynamic).some(Boolean)) {
            showSubmitError("UPLOAD_PENDING", "Please wait for all file uploads to complete before submitting.", null);
            return;
        }

        isSubmittingRef.current = true;
        setSubmitting(true);

        const controller = new AbortController();
        let timedOut = false;
        const timeoutHandle = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, SUBMIT_TIMEOUT_MS);

        try {
            const token = await user.getIdToken();
            
            // Clean dynamic fields: only submit visible input fields
            const sortedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
            const formDataObj = {};
            sortedFields.forEach((field) => {
                if (field.type === "description_text") return; // skip description texts
                if (isFieldVisible(field)) {
                    if (formValues[field.name] !== undefined) {
                        formDataObj[field.name] = formValues[field.name];
                    }
                }
            });

            // Snapshot gender into formData (single canonical entry)
            if (genderContact) {
                formDataObj["Gender"] = genderContact;
            }

            // Snapshot contact phone into formData (single canonical entry)
            if (phoneContact) {
                let digits = phoneContact.replace(/\D/g, "");
                if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
                else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
                formDataObj["Contact Number"] = digits;
            }

            // Snapshot location fields into formData
            if (stateLocation) {
                formDataObj["State"] = stateLocation;
            }
            if (districtLocation) {
                formDataObj["City / District"] = districtLocation;
            }

            if (isIdVerified) {
                // Verified student:
                // If student explicitly uploaded a replacement, submit it; otherwise preserve past ID copy from autofill
                if (studentIdFile && typeof studentIdFile === "string") {
                    formDataObj["Student ID Card Copy"] = studentIdFile;
                    if (studentIdFileId) formDataObj["studentIdFileId"] = studentIdFileId;
                } else if (autofillData?.["Student ID Card Copy"]) {
                    formDataObj["Student ID Card Copy"] = autofillData["Student ID Card Copy"];
                    if (autofillData?.["studentIdFileId"]) formDataObj["studentIdFileId"] = autofillData["studentIdFileId"];
                }
                const studentIdVal = studentProfile?.studentId || autofillData?.["Student ID Number"];
                if (studentIdVal) {
                    formDataObj["Student ID Number"] = studentIdVal;
                }
            } else {
                // Unverified / first-time student:
                const availableIdCopy = studentIdFile || autofillData?.["Student ID Card Copy"];
                if (!availableIdCopy || typeof availableIdCopy !== "string") {
                    showSubmitError("VALIDATION_FAILED", "Please upload your Student ID Card copy.", null);
                    setSubmitting(false);
                    isSubmittingRef.current = false;
                    return;
                }
                formDataObj["Student ID Card Copy"] = availableIdCopy;
                if (studentIdFileId) {
                    formDataObj["studentIdFileId"] = studentIdFileId;
                } else if (autofillData?.["studentIdFileId"]) {
                    formDataObj["studentIdFileId"] = autofillData["studentIdFileId"];
                }
                const studentIdVal = studentProfile?.studentId || autofillData?.["Student ID Number"];
                if (studentIdVal) {
                    formDataObj["Student ID Number"] = studentIdVal;
                }
            }

            if (consentTemplates.length > 0) {
                for (const t of consentTemplates) {
                    const fileUrl = consentFiles[t.id];
                    if (!fileUrl || typeof fileUrl !== "string") {
                        showSubmitError("VALIDATION_FAILED", `Please upload the signed copy of: ${t.name}`, null);
                        setSubmitting(false);
                        isSubmittingRef.current = false;
                        return;
                    }
                    const fileKey = t.id === "legacy-consent" ? "Completed Consent Form" : `Completed Consent - ${t.name}`;
                    formDataObj[fileKey] = fileUrl;
                }
            }

            // Validate mandatory student consent declarations
            if (consentStatements.length > 0) {
                const missing = consentStatements.filter(
                    (s) => s.required !== false && !consentAccepted[s.id]
                );
                if (missing.length > 0) {
                    showSubmitError("VALIDATION_FAILED", "Please accept all required participation declarations before submitting.", null);
                    setSubmitting(false);
                    isSubmittingRef.current = false;
                    return;
                }
            }

            const consentResponses = consentStatements.map((stmt) => ({
                statementId: stmt.id,
                statementText: stmt.text,
                accepted: Boolean(consentAccepted[stmt.id]),
                acceptedAt: new Date().toISOString(),
            }));

            const res = await fetch("/api/user-registration", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                    "X-Request-Id": requestId,
                },
                body: JSON.stringify({
                    tripId,
                    formData: formDataObj,
                    consentResponses,
                    alsoUpdateProfileGender,
                    confirmUnknownGender: genderContact === "Unknown"
                }),
                signal: controller.signal,
            });

            // Tolerate non-JSON bodies (e.g. platform 502/504 HTML pages)
            let data = {};
            try {
                data = await res.json();
            } catch (_) {
                data = {};
            }
            const refId = data?.requestId || res.headers.get("X-Request-Id") || requestId;

            if (!res.ok) {
                // If user is already registered (e.g. from concurrent tab or retry), treat as success and refresh status
                if (data?.code === "ALREADY_REGISTERED" || (data?.error && data.error.includes("already registered"))) {
                    if (onSuccess) onSuccess();
                    return;
                }
                const code = data?.code || (res.status >= 500 ? "INTERNAL_ERROR" : "REGISTRATION_FAILED");
                console.error(`[REGISTRATION][${refId}] submit failed status=${res.status} code=${code}`);
                showSubmitError(code, getFriendlySubmitMessage(code, res.status, data?.error), refId);
                return;
            }
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error(`[REGISTRATION][${requestId}] submission error:`, error);
            // Network failure / timeout recovery: check if registration actually succeeded on the server before showing an error
            try {
                const token = await user.getIdToken();
                const checkRes = await fetch(`/api/user-registration?tripId=${tripId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(10_000) : undefined,
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    if (checkData?.registration) {
                        if (onSuccess) onSuccess();
                        return;
                    }
                }
            } catch (recoveryErr) {
                console.error("Recovery check error:", recoveryErr);
            }
            const code = timedOut ? "TIMEOUT" : "NETWORK_ERROR";
            showSubmitError(code, getFriendlySubmitMessage(code));
        } finally {
            clearTimeout(timeoutHandle);
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    if (loading) {
      return (
        <div className="w-full bg-white rounded-[2rem] shadow-xl p-8 text-center border border-black/5 animate-pulse">
          <div className="text-[#3E1126] font-oswald font-bold text-xl uppercase tracking-wide">Loading Form Fields...</div>
        </div>
      );
    }

    const stepMap = [1, 2];
    if (hasConditional) stepMap.push(3);
    if (hasConsents) stepMap.push(4);
    stepMap.push(5);

    const totalSteps = stepMap.length;
    const currentStepIndex = Math.max(1, stepMap.indexOf(step) + 1);

    let stepLabel = "Personal Details";
    if (step === 2) {
      stepLabel = fields.filter((field) => !field.dependsOnFieldId).length === 0 ? "Review Details" : "Trip Details";
    } else if (step === 3) {
      stepLabel = "Specific Details";
    } else if (step === 4) {
      stepLabel = "Required Consents";
    } else if (step === 5) {
      stepLabel = "Review & Submit";
    }

    return (
      <div className="w-full bg-white rounded-[2rem] shadow-xl overflow-hidden relative flex flex-col border border-black/5">
        
        {/* Thematic Header */}
        <div className="relative pt-8 pb-6 px-8 text-center flex flex-col items-center" style={{ backgroundColor: '#E4D5FF' }}>
          
          {/* Progress Indicators */}
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-2">
            {stepMap.map((s, idx) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentStepIndex >= idx + 1 ? 'w-8 bg-[#3E1126]' : 'w-2 bg-[#3E1126]/20'
                }`}
              />
            ))}
          </div>

          <div className="w-12 h-12 bg-[#3E1126] rounded-full flex items-center justify-center shadow-md mb-3 text-white">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-oswald font-bold text-[#3E1126] uppercase tracking-wide">
            Join The Journey
          </h2>
          <p className="text-xs sm:text-sm font-medium text-[#3E1126]/70 mt-1">
            Step {currentStepIndex} of {totalSteps} • {stepLabel}
          </p>
        </div>

        {/* Scallop transition from Header to Form Body */}
        <ScallopDivider topColor="#E4D5FF" />

        <div className="p-6 sm:p-8 bg-white relative z-20 overflow-y-auto max-h-[60vh] custom-scrollbar" data-lenis-prevent>
          
          {/* STEP 1: Basic Info & Student ID */}
          {step === 1 && (
            <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {tripDescription && (
                <CollapsibleDescription text={tripDescription} />
              )}

              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                    IITM Email Address
                  </label>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3E1126]/10 text-[#3E1126] shrink-0">
                    FROM YOUR PROFILE
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-zinc-100 border-2 border-transparent rounded-xl text-sm text-[#3E1126]/70 font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {isIdVerified ? (
                <div className="bg-green-50 border-2 border-green-600/20 rounded-xl p-5 space-y-2">
                  <div className="flex items-center gap-2 text-green-800 font-oswald font-bold text-sm uppercase tracking-wider">
                    <CheckCircle2 className="w-5 h-5 text-green-600" /> Student ID Verified
                  </div>
                  <p className="text-xs text-green-700/90 font-medium leading-relaxed">
                    Your Student ID is verified in your student profile. No re-upload is required.
                  </p>
                  {studentProfile?.studentId && (
                    <div className="pt-1 text-xs text-green-900 font-semibold">
                      Roll / ID Number: <span className="font-mono">{studentProfile.studentId}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-4">
                  <h4 className="font-oswald font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#3E1126]">
                    <ShieldAlertIcon className="w-4 h-4" /> First-Time Registration
                  </h4>
                  <p className="text-xs text-[#3E1126]/80 font-medium leading-relaxed">
                    Student ID verification is mandatory for first-time event registrations. This will be securely saved for auto-filling future event forms.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Student ID Card Copy (Front & Back)</label>
                    <div className="relative space-y-1.5">
                      <input
                        type="file"
                        required={!studentIdFile && !autofillData?.["Student ID Card Copy"]}
                        accept="image/*,.pdf"
                        disabled={uploadingStudentId}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 10 * 1024 * 1024) {
                            alert("File size must be less than 10MB");
                            e.target.value = "";
                            return;
                          }
                          setUploadingStudentId(true);
                          const uploadResult = await uploadFileToDrive(file, "Student IDs", "Student ID Card Copy");
                          const url = typeof uploadResult === "object" && uploadResult ? uploadResult.url : uploadResult;
                          const fileId = typeof uploadResult === "object" && uploadResult ? uploadResult.fileId : null;
                          if (url) {
                            setStudentIdFile(url);
                            if (fileId) setStudentIdFileId(fileId);
                          } else {
                            e.target.value = "";
                            setStudentIdFile(null);
                            setStudentIdFileId(null);
                          }
                          setUploadingStudentId(false);
                        }}
                        className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#3E1126] file:text-white hover:file:bg-[#3E1126]/80 file:cursor-pointer file:transition-colors bg-white border-2 border-zinc-200 rounded-xl p-1"
                      />
                      {uploadingStudentId && (
                        <p className="text-xs text-amber-600 font-bold animate-pulse">Uploading file... Please wait.</p>
                      )}
                      {studentIdFile && typeof studentIdFile === "string" && studentIdFile.startsWith("http") && (
                        <p className="text-xs text-green-600 font-bold">Uploaded successfully! ✅</p>
                      )}
                      {!studentIdFile && autofillData?.["Student ID Card Copy"] && (
                        <p className="text-xs text-zinc-500 font-medium">Previous ID on file. You can keep it or upload a new copy.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Gender Profile Section */}
              {!isEditingGender && studentProfile?.gender && studentProfile.gender !== "unknown" ? (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Gender
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3E1126]/10 text-[#3E1126] shrink-0">
                        FROM YOUR PROFILE
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingGender(true)}
                        className="text-xs font-bold text-[#3E1126] underline hover:text-[#3E1126]/80 focus:outline-none cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-zinc-200">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Gender</span>
                    <span className="text-sm font-semibold text-[#3E1126] mt-0.5 block capitalize">
                      {genderContact || studentProfile.gender}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-3.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Gender <span className="text-red-500">*</span>
                      </span>
                    </div>
                    {studentProfile?.gender && studentProfile.gender !== "unknown" && (
                      <button
                        type="button"
                        onClick={() => setIsEditingGender(false)}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#3E1126]/75 font-medium leading-relaxed">
                    Please select your gender for trip logistics, rooming allocations, and coordinator rosters.
                  </p>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      {["Male", "Female", "Other"].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setGenderContact(opt);
                            setGenderError(null);
                          }}
                          className={`py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer ${
                            genderContact === opt
                              ? "bg-[#3E1126] text-white border-[#3E1126] shadow-sm scale-[1.02]"
                              : "bg-white text-[#3E1126] border-zinc-200 hover:border-[#3E1126]/30 hover:bg-zinc-50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    {genderError && (
                      <p className="text-[11px] text-red-600 font-semibold">{genderError}</p>
                    )}

                    {/* Also update profile checkbox (Section 27) */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="trip-reg-update-profile-gender"
                        checked={alsoUpdateProfileGender}
                        onChange={(e) => setAlsoUpdateProfileGender(e.target.checked)}
                        className="rounded border-zinc-300 text-[#3E1126] focus:ring-[#3E1126] cursor-pointer"
                      />
                      <label htmlFor="trip-reg-update-profile-gender" className="text-xs text-[#3E1126]/85 font-medium select-none cursor-pointer">
                        Also update my Boundless profile with this gender
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Phone Profile Section */}
              {!isEditingPhone && studentProfile?.phone ? (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Contact Phone Number
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3E1126]/10 text-[#3E1126] shrink-0">
                        FROM YOUR PROFILE
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(true)}
                        className="text-xs font-bold text-[#3E1126] underline hover:text-[#3E1126]/80 focus:outline-none cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-zinc-200">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Mobile Number</span>
                    <span className="text-sm font-semibold text-[#3E1126] mt-0.5 block">{phoneContact || studentProfile.phone}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Contact Phone Number <span className="text-red-500">*</span>
                      </span>
                    </div>
                    {studentProfile?.phone && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPhone(false)}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#3E1126]/75 font-medium leading-relaxed">
                    Please provide your 10-digit mobile number for event coordinators and emergency contact.
                  </p>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Phone className="h-4 w-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phoneContact}
                        onChange={(e) => {
                          setPhoneContact(e.target.value);
                          setPhoneError(null);
                        }}
                        placeholder="e.g. 9876543210"
                        className={`w-full pl-10 pr-4 py-2.5 bg-white border-2 rounded-xl text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none transition-all ${
                          phoneError
                            ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                            : "border-zinc-200 hover:border-zinc-300 focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-red-600 font-semibold">{phoneError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Location Profile Section */}
              {!isEditingLocation && (studentProfile?.state && studentProfile?.cityDistrict) ? (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Current Location
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#3E1126]/10 text-[#3E1126] shrink-0">
                        FROM YOUR PROFILE
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(true)}
                        className="text-xs font-bold text-[#3E1126] underline hover:text-[#3E1126]/80 focus:outline-none"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-xl border border-zinc-200">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">State</span>
                      <span className="text-sm font-semibold text-[#3E1126] mt-0.5 block">{stateLocation}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-zinc-200">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">City / District</span>
                      <span className="text-sm font-semibold text-[#3E1126] mt-0.5 block">{districtLocation}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-4 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#3E1126]" />
                      <span className="text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
                        Current Location <span className="text-red-500">*</span>
                      </span>
                    </div>
                    {studentProfile?.state && (
                      <button
                        type="button"
                        onClick={() => setIsEditingLocation(false)}
                        className="text-xs font-bold text-zinc-500 hover:text-zinc-800"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#3E1126]/75 font-medium leading-relaxed">
                    Please select your general residential state and city/district for event travel coordination.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <LocationSelect
                      id="trip-reg-state"
                      label="State"
                      required
                      value={stateLocation}
                      options={INDIAN_STATES_AND_UTS}
                      placeholder="Select state"
                      searchPlaceholder="Search Indian state..."
                      error={locationErrors.state}
                      onChange={(newState) => {
                        setStateLocation(newState);
                        // Clear district when state changes
                        setDistrictLocation("");
                        setLocationErrors((prev) => ({ ...prev, state: null, district: null }));
                      }}
                    />

                    <LocationSelect
                      id="trip-reg-city-district"
                      label="City / District"
                      required
                      value={districtLocation}
                      options={stateLocation ? getDistrictsForState(stateLocation) : []}
                      disabled={!stateLocation}
                      disabledPlaceholder="Select state first"
                      placeholder={stateLocation ? "Select city / district" : "Select state first"}
                      searchPlaceholder={`Search district in ${stateLocation || "state"}...`}
                      error={locationErrors.district}
                      onChange={(newDistrict) => {
                        setDistrictLocation(newDistrict);
                        setLocationErrors((prev) => ({ ...prev, district: null }));
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploadingStudentId}
                  className="w-full flex justify-center items-center gap-2 text-sm font-bold text-black bg-[#FCE16D] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {uploadingStudentId ? "Uploading ID..." : "Continue"}
                  {!uploadingStudentId && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: General Travel Details */}
          {step === 2 && (
            <form onSubmit={handleNext} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <button 
                type="button"
                onClick={handleBack}
                className="mb-2 -mt-2 inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-zinc-400 hover:text-[#3E1126] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back
              </button>

              {fields.filter((field) => !field.dependsOnFieldId).length === 0 ? (
                <div className="space-y-4 text-left">
                  {/* Notice Box */}
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4.5 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 text-amber-900 font-oswald font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Make sure details filled are correct</span>
                    </div>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      <strong>Warning:</strong> The details you are sending will be reviewed and only based on that will your registration be considered.
                    </p>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-2xl p-5 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2.5">
                      <h4 className="font-oswald font-bold text-xs uppercase tracking-wider text-[#3E1126] flex items-center gap-2">
                        <FileText className="w-4 h-4" /> REVIEW YOUR DETAILS
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowReviewModal(true)}
                        className="text-[11px] font-bold text-[#3E1126] underline hover:text-[#3E1126]/80 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Review Popup</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-zinc-100">
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Student Name:</span>
                        <strong className="text-[#3E1126] font-semibold text-right">
                          {studentProfile?.name || formValues["Full Name"] || formValues["Name"] || user?.displayName || "Student"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Roll No / Student ID:</span>
                        <strong className="text-[#3E1126] font-mono font-semibold text-right">
                          {studentProfile?.studentId || formValues["Student ID Number"] || formValues["Roll Number"] || formValues["Roll No"] || "—"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Student Email:</span>
                        <strong className="text-[#3E1126] font-semibold text-right truncate max-w-[55%]">
                          {user?.email || studentProfile?.email || "—"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Gender:</span>
                        <strong className="text-[#3E1126] font-semibold capitalize text-right">
                          {genderContact || "—"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Mobile Phone:</span>
                        <strong className="text-[#3E1126] font-semibold text-right">
                          {phoneContact || "—"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Location:</span>
                        <strong className="text-[#3E1126] font-semibold text-right">
                          {districtLocation && stateLocation ? `${districtLocation}, ${stateLocation}` : "—"}
                        </strong>
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500 font-medium">Student ID Card:</span>
                        <strong className="text-[#3E1126] font-semibold text-right">
                          {isIdVerified
                            ? "Verified on File ✅"
                            : studentIdFile
                            ? `Attached (${studentIdFile.name}) 📄`
                            : autofillData?.["Student ID Card Copy"]
                            ? "Attached from record 📄"
                            : "Not provided ⚠️"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {fields.filter((field) => !field.dependsOnFieldId).map(renderField)}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={Object.values(uploadingDynamic).some(Boolean)}
                  className="w-full flex justify-center items-center gap-2 text-sm font-bold text-black bg-[#FCE16D] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer"
                >
                  {Object.values(uploadingDynamic).some(Boolean)
                    ? "Uploading Files..."
                    : fields.filter((field) => !field.dependsOnFieldId).length === 0
                    ? "Review & Continue"
                    : "Continue"}
                  {!Object.values(uploadingDynamic).some(Boolean) && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Specific Travel Details (Conditional Fields) */}
          {step === 3 && (
            <form onSubmit={handleNext} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
              <button 
                type="button"
                onClick={handleBack}
                className="mb-2 -mt-2 inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-zinc-400 hover:text-[#3E1126] transition-colors"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back
              </button>

              <div className="space-y-5">
                {fields.filter((field) => !!field.dependsOnFieldId).map(renderField)}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={Object.values(uploadingDynamic).some(Boolean)}
                  className="w-full flex justify-center items-center gap-2 text-sm font-bold text-black bg-[#FCE16D] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {Object.values(uploadingDynamic).some(Boolean) ? "Uploading Files..." : "Continue"}
                  {!Object.values(uploadingDynamic).some(Boolean) && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: Consent Form Checkpoint */}
          {step === 4 && (
            <form onSubmit={handleNext} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 text-left">
              <button 
                type="button"
                onClick={handleBack}
                className="mb-2 -mt-2 inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-zinc-400 hover:text-[#3E1126] transition-colors"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back
              </button>

              {consentTemplates.length > 0 ? (
                <div className="space-y-4">
                  {consentTemplates.map((t) => (
                    <div key={t.id} className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-xl p-5 space-y-4">
                      <h4 className="font-oswald font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#3E1126]">
                        <FileText className="w-4 h-4" /> {t.name}
                      </h4>
                      <p className="text-xs text-[#3E1126]/80 font-medium leading-relaxed">
                        Please download the template, sign it, and upload the signed copy below.
                      </p>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const parts = t.templateUrl.split("/");
                          const lastPart = parts[parts.length - 1];
                          const filename = lastPart || `${t.name}_template.pdf`;
                          const proxyUrl = `/api/downloadProxy/${encodeURIComponent(filename)}?url=${encodeURIComponent(t.templateUrl)}`;
                          window.open(proxyUrl, "_blank");
                        }}
                        className="w-full flex justify-center items-center gap-2 text-xs font-bold text-white bg-zinc-800 px-4 py-2.5 rounded-lg hover:bg-black transition-colors"
                      >
                        Download {t.name} Template
                      </button>

                      <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Upload Signed Copy</label>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          required={!consentFiles[t.id]}
                          disabled={uploadingConsent[t.id]}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File size must be less than 10MB");
                              e.target.value = "";
                              return;
                            }
                            setUploadingConsent((prev) => ({ ...prev, [t.id]: true }));
                            const uploadResult = await uploadFileToDrive(file, "Consent Forms", t.name);
                            const url = typeof uploadResult === "object" && uploadResult ? uploadResult.url : uploadResult;
                            if (url) {
                              setConsentFiles((prev) => ({ ...prev, [t.id]: url }));
                            } else {
                              e.target.value = "";
                              setConsentFiles((prev) => {
                                const copy = { ...prev };
                                delete copy[t.id];
                                return copy;
                              });
                            }
                            setUploadingConsent((prev) => ({ ...prev, [t.id]: false }));
                          }}
                          className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#3E1126] file:text-white hover:file:bg-[#3E1126]/80 file:cursor-pointer file:transition-colors bg-white border-2 border-zinc-200 rounded-xl p-1"
                        />
                        {uploadingConsent[t.id] && (
                          <p className="text-xs text-amber-600 font-bold animate-pulse mt-1">Uploading copy to Google Drive... Please wait.</p>
                        )}
                        {consentFiles[t.id] && typeof consentFiles[t.id] === "string" && consentFiles[t.id].startsWith("http") && (
                          <p className="text-xs text-green-600 font-bold mt-1">Uploaded successfully! ✅</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-[#3E1126]/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-500">No additional consent forms required for this trip.</p>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={Object.values(uploadingConsent).some(Boolean)}
                  className="w-full flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-black bg-[#FCE16D] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(252,225,109,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {Object.values(uploadingConsent).some(Boolean) ? "Uploading Consents..." : "Review Registration"}
                  {!Object.values(uploadingConsent).some(Boolean) && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          )}

          {/* STEP 5: REVIEW YOUR REGISTRATION & FINAL SUBMISSION */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <button 
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="mb-2 -mt-2 inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-zinc-400 hover:text-[#3E1126] transition-colors"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back
              </button>

              <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-2xl p-5 space-y-4 text-left shadow-sm">
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
                  <h4 className="font-oswald font-bold text-sm uppercase tracking-wider text-[#3E1126] flex items-center gap-2">
                    <FileText className="w-4 h-4" /> REVIEW YOUR REGISTRATION
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    Checkpoint
                  </span>
                </div>

                {/* Student Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Name:</span>
                    <strong className="text-[#3E1126] font-semibold">
                      {studentProfile?.name || formValues["Full Name"] || formValues["Name"] || user?.displayName || "Student"}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Student ID / Roll No:</span>
                    <strong className="text-[#3E1126] font-mono font-semibold">
                      {studentProfile?.studentId || formValues["Roll Number"] || formValues["Student ID"] || "—"}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Email:</span>
                    <strong className="text-[#3E1126] font-semibold">{user?.email}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Trip:</span>
                    <strong className="text-[#3E1126] font-semibold">{tripName}</strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Gender:</span>
                    <strong className="text-[#3E1126] font-semibold capitalize">
                      {genderContact || "—"}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Location:</span>
                    <strong className="text-[#3E1126] font-semibold">
                      {stateLocation && districtLocation ? `${districtLocation}, ${stateLocation}` : "—"}
                    </strong>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Phone:</span>
                    <strong className="text-[#3E1126] font-semibold">
                      {phoneContact || "—"}
                    </strong>
                  </div>

                  {/* Dynamic Trip-Specific Fields */}
                  {fields
                    .filter((f) => f.type !== "description_text" && isFieldVisible(f))
                    .filter((f) => !["name", "full name", "fullname", "roll number", "roll no", "rollno", "student id", "email", "gender", "sex", "phone", "contact number", "phone number", "state", "city / district", "district"].includes(f.name.toLowerCase().trim()))
                    .slice(0, 6)
                    .map((f) => (
                      <div key={f.id} className="flex justify-between py-1 border-b border-zinc-100">
                        <span className="text-zinc-500 font-medium truncate max-w-[45%]">{f.name}:</span>
                        <span className="text-[#3E1126] font-medium truncate max-w-[50%]">
                          {String(formValues[f.name] || "—")}
                        </span>
                      </div>
                    ))}

                  {/* Student ID Verification Status */}
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">Student ID Status:</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      isIdVerified
                        ? "bg-green-100 text-green-800"
                        : studentIdFile || autofillData?.["Student ID Card Copy"]
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {isIdVerified ? "Verified ✅" : studentIdFile || autofillData?.["Student ID Card Copy"] ? "Attached (Google Drive) 📄" : "Missing ⚠️"}
                    </span>
                  </div>

                  {/* Consent status */}
                  {consentTemplates.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1.5">Required Consents</span>
                      <div className="space-y-1">
                        {consentTemplates.map((t) => (
                          <div key={t.id} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-lg border border-zinc-200/60">
                            <span className="text-zinc-700 font-medium truncate max-w-[70%]">{t.name}</span>
                            <span className={`text-[10px] font-bold uppercase ${consentFiles[t.id] ? "text-green-600" : "text-amber-600"}`}>
                              {consentFiles[t.id] ? "Uploaded ✅" : "Pending ⚠️"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mandatory Student Participation Declarations */}
              {consentStatements.length > 0 && (
                <div className="bg-[#FFFBEA]/70 border border-[#3E1126]/15 rounded-2xl p-4 sm:p-5 space-y-3 text-left shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#3E1126]/10 pb-2">
                    <CheckCircle2 className="w-4 h-4 text-[#3E1126]" />
                    <h5 className="font-oswald font-bold text-xs uppercase tracking-wider text-[#3E1126]">
                      Student Consents & Declarations
                    </h5>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 ml-auto">
                      Mandatory
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {consentStatements.map((stmt, idx) => (
                      <label
                        key={stmt.id || idx}
                        className="flex items-start gap-2.5 text-xs text-stone-700 cursor-pointer select-none leading-relaxed p-2 rounded-xl hover:bg-[#3E1126]/5 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(consentAccepted[stmt.id])}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setConsentAccepted((prev) => ({ ...prev, [stmt.id]: val }));
                          }}
                          disabled={submitting}
                          className="mt-0.5 w-4 h-4 cursor-pointer accent-[#3E1126] rounded-sm shrink-0"
                        />
                        <span className="flex-1 font-medium">
                          {stmt.text}
                          {stmt.required !== false && <span className="text-red-500 font-bold ml-1">*</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 pt-1 text-left">
                <input
                  type="checkbox"
                  id="review-consent-check"
                  required
                  disabled={submitting}
                  className="mt-1 w-4 h-4 cursor-pointer accent-[#3E1126] rounded-sm"
                />
                <label htmlFor="review-consent-check" className="text-xs font-medium text-zinc-600 cursor-pointer select-none leading-tight">
                  I confirm that all provided details are accurate and agree to the{" "}
                  <button type="button" onClick={() => setShowConsent(true)} className="font-bold text-[#3E1126] hover:underline">
                    Boundless Terms & Conditions
                  </button>.
                </label>
              </div>

              <SubmitErrorPanel
                error={submitError}
                retryDisabled={submitting}
                onDismiss={() => setSubmitError(null)}
                onRetry={submitError?.code === "UPLOAD_PENDING" || submitError?.code === "VALIDATION_FAILED" ? null : () => handleSubmit()}
              />

              <div className="pt-2">
                <button
                  type="submit"
                  id="registration-submit-button"
                  disabled={submitting || Object.values(uploadingConsent).some(Boolean) || uploadingStudentId || Object.values(uploadingDynamic).some(Boolean)}
                  className="w-full flex justify-center items-center gap-2 text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider text-white bg-[#3E1126] px-6 py-3.5 rounded-full shadow-[0_4px_14px_0_rgba(62,17,38,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting Registration...</span>
                  ) : (
                    <>
                      <span>SUBMIT REGISTRATION</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal for Consent Terms Preview */}
        {showConsent && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center backdrop-blur-sm" data-lenis-prevent>
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowConsent(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                ✕
              </button>
              <h3 className="font-oswald font-bold text-xl text-[#3E1126] uppercase mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Terms & Conditions
              </h3>
              <div className="text-sm text-zinc-600 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 leading-relaxed" data-lenis-prevent>
                <p className="font-bold text-zinc-800">UNDERTAKING & CONSENT BY THE PARTICIPANT</p>
                <p>1. I hereby confirm my participation in the upcoming trip organized by the Boundless Society. I acknowledge that I am participating of my own free will.</p>
                <p>2. I certify that I am medically fit to travel and participate in the activities planned during the trip. In case of any emergency, the society coordinators are authorized to arrange medical assistance.</p>
                <p>3. I agree to abide by the code of conduct of IIT Madras and the Boundless Society. Any misbehavior, consumption of prohibited substances, or violation of safety rules will lead to immediate cancellation of my participation and disciplinary action.</p>
                <p>4. I understand that the society will take all reasonable safety precautions but shall not be held liable for any unforeseen losses, damages, or injuries.</p>
              </div>
              <div className="pt-6 mt-6 border-t border-zinc-100">
                <button
                  onClick={() => setShowConsent(false)}
                  className="w-full flex justify-center items-center gap-2 text-sm font-bold text-black bg-[#FCE16D] px-6 py-3 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  I Acknowledge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Details Review Checkpoint */}
        {showReviewModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center backdrop-blur-sm animate-in fade-in duration-200"
            data-lenis-prevent
          >
            <div
              className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden shadow-2xl relative border border-stone-200 my-auto animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-[#E4D5FF] px-6 py-6 text-center relative border-b border-[#3E1126]/10">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="absolute top-4 right-4 text-[#3E1126]/60 hover:text-[#3E1126] p-1.5 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-12 h-12 bg-[#3E1126] text-white rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-md">
                  <AlertTriangle className="w-6 h-6 text-[#FCE16D]" />
                </div>

                <h3 className="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#3E1126]">
                  Make Sure Details Filled Are Correct
                </h3>
                <p className="text-xs text-[#3E1126]/75 font-medium mt-1 leading-relaxed max-w-sm mx-auto">
                  Please review all information you have filled before proceeding.
                </p>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar text-left" data-lenis-prevent>
                {/* Warning Alert */}
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h5 className="font-oswald font-bold text-xs uppercase tracking-wider text-amber-950">
                      Review & Consideration Notice
                    </h5>
                    <p className="text-xs text-amber-900 leading-relaxed font-medium">
                      <strong>Warning:</strong> The details you are sending will be reviewed and only based on that will your registration be considered.
                    </p>
                  </div>
                </div>

                {/* Details Summary Card */}
                <div className="bg-zinc-50 border-2 border-[#3E1126]/10 rounded-2xl p-4.5 space-y-2.5 shadow-sm text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                    <span className="font-oswald font-bold uppercase text-[11px] tracking-wider text-zinc-400">
                      Submitted Information
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Checkpoint
                    </span>
                  </div>

                  <div className="space-y-2 divide-y divide-zinc-100">
                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Student Name:</span>
                      <strong className="text-[#3E1126] font-semibold text-right">
                        {studentProfile?.name || formValues["Full Name"] || formValues["Name"] || user?.displayName || "Student"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Roll No / Student ID:</span>
                      <strong className="text-[#3E1126] font-mono font-semibold text-right">
                        {studentProfile?.studentId || formValues["Student ID Number"] || formValues["Roll Number"] || formValues["Roll No"] || "—"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Student Email:</span>
                      <strong className="text-[#3E1126] font-semibold text-right truncate max-w-[60%]">
                        {user?.email || studentProfile?.email || "—"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Trip:</span>
                      <strong className="text-[#3E1126] font-semibold text-right">
                        {tripName}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Gender:</span>
                      <strong className="text-[#3E1126] font-semibold capitalize text-right">
                        {genderContact || "—"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Mobile Phone:</span>
                      <strong className="text-[#3E1126] font-semibold text-right">
                        {phoneContact || "—"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">State & City / District:</span>
                      <strong className="text-[#3E1126] font-semibold text-right">
                        {districtLocation && stateLocation ? `${districtLocation}, ${stateLocation}` : "—"}
                      </strong>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-zinc-500 font-medium">Student ID Card:</span>
                      <strong className="text-[#3E1126] font-semibold text-right">
                        {isIdVerified
                          ? "Verified on File ✅"
                          : studentIdFile
                          ? `Attached (${studentIdFile.name}) 📄`
                          : autofillData?.["Student ID Card Copy"]
                          ? "Attached from record 📄"
                          : "Not provided ⚠️"}
                      </strong>
                    </div>

                    {/* Any non-empty dynamic trip fields */}
                    {fields
                      .filter((f) => f.type !== "description_text" && isFieldVisible(f))
                      .filter((f) => !["name", "full name", "fullname", "roll number", "roll no", "rollno", "student id", "email", "gender", "sex", "phone", "contact number", "phone number", "state", "city / district", "district"].includes(f.name.toLowerCase().trim()))
                      .filter((f) => formValues[f.name] !== undefined && formValues[f.name] !== "")
                      .map((f) => (
                        <div key={f.id} className="flex justify-between py-1">
                          <span className="text-zinc-500 font-medium">{f.name}:</span>
                          <strong className="text-[#3E1126] font-semibold text-right truncate max-w-[55%]">
                            {String(formValues[f.name])}
                          </strong>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-zinc-50 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    setStep(1);
                  }}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-full border-2 border-stone-300 hover:border-[#3E1126] text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126] hover:bg-white transition-all cursor-pointer"
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReviewAndProceed}
                  className="w-full sm:w-1/2 py-3 px-4 rounded-full bg-[#FCE16D] hover:bg-[#ebd057] active:scale-95 text-xs font-oswald font-bold uppercase tracking-wider text-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Confirm & Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gender = Unknown Special Two-Step Confirmation Modal (Section 26) */}
        {unknownGenderStep > 0 && unknownGenderStep < 3 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 text-center animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-inner">
                ⚠️
              </div>

              {unknownGenderStep === 1 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold font-oswald uppercase text-[#3E1126] tracking-tight">
                    Gender Confirmation
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium">
                    Your gender is currently set as <strong>Unknown</strong>. Would you like to keep Unknown for this trip?
                  </p>
                </div>
              )}

              {unknownGenderStep === 2 && (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold font-oswald uppercase text-[#3E1126] tracking-tight">
                    Please Confirm Again
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium">
                    Please confirm again: your gender will be recorded as <strong>Unknown</strong> for this trip.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {unknownGenderStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setUnknownGenderStep(2)}
                      className="w-full sm:w-1/2 py-3 px-4 rounded-full border-2 border-stone-300 hover:border-[#3E1126] text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126] hover:bg-stone-50 transition cursor-pointer"
                    >
                      Keep Unknown
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnknownGenderStep(0);
                        setIsEditingGender(true);
                        setGenderContact("");
                      }}
                      className="w-full sm:w-1/2 py-3 px-4 rounded-full bg-[#3E1126] text-white hover:bg-[#2A0013] text-xs font-oswald font-bold uppercase tracking-wider transition shadow-md cursor-pointer"
                    >
                      Change Gender
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setUnknownGenderStep(3);
                        setGenderContact("Unknown");
                      }}
                      className="w-full sm:w-1/2 py-3 px-4 rounded-full border-2 border-stone-300 hover:border-[#3E1126] text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126] hover:bg-stone-50 transition cursor-pointer"
                    >
                      Confirm Unknown
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUnknownGenderStep(0);
                        setIsEditingGender(true);
                        setGenderContact("");
                      }}
                      className="w-full sm:w-1/2 py-3 px-4 rounded-full bg-[#3E1126] text-white hover:bg-[#2A0013] text-xs font-oswald font-bold uppercase tracking-wider transition shadow-md cursor-pointer"
                    >
                      Change Gender
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
}