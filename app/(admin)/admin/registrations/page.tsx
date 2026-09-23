"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  Loader2Icon, 
  SettingsIcon, 
  UsersIcon, 
  ShieldAlertIcon, 
  CheckCircle2Icon, 
  XCircleIcon,
  SaveIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  EditIcon,
  PlusCircleIcon,
  FileWarning,
  XIcon,
  RotateCcwIcon,
  SearchIcon,
  AlertTriangleIcon,
  CheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  DownloadIcon,
  MailIcon,
  AlertCircleIcon
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SubmissionsTable from "./SubmissionsTable";

interface Trip {
  id: string;
  name: string;
  coordinators: any[];
  registrationOpen?: boolean;
  totalSeats?: number;
  femaleReservedSeats?: number;
  maleReservedSeats?: number;
  femaleJoined?: number;
  totalJoined?: number;
  finalRosterSaved?: boolean;
  isCompleted?: boolean;
  description?: string;
  form?: { fields: any[] };
  fee?: number;
  consentFormTemplateUrl?: string;
  consentTemplates?: Array<{ id: string; name: string; templateUrl: string }>;
  whatsappLink?: string;
  qrCodeUrl?: string;
  emailsDisabled?: boolean;
  cityWhatsappSettings?: Record<string, { whatsappLink: string, qrCodeUrl: string }>;
}

export interface Registration {
  id: string;
  email: string;
  uid: string;
  status: string;
  gender: string;
  submittedAt: string;
  formData: Record<string, string>;
  issueText?: string;
  actionRequiredFields?: string[];
  studentIdVerified?: boolean;
  consentFormFileUrl?: string;
  consentFormVerified?: boolean;
  verifiedConsentForms?: Record<string, boolean>;
  approvalEmailSentAt?: string;
  approvalEmailStatus?: "pending" | "sent" | "failed" | "disabled";
  approvalEmailError?: string;
  approvalEmailLastAttemptAt?: string;
  approvalEmailMessageId?: string;
  conversationHistory?: Array<{
    type: string;
    actor?: string;
    message?: string;
    reason?: string;
    fields?: string[];
    updatedFields?: string[];
    fileFields?: string[];
    timestamp: string | null;
  }>;
}

interface Concern {
  id: string;
  studentEmail: string;
  concernText: string;
  coordinatorEmail: string;
}

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "radio", label: "Radio Options" },
  { value: "select", label: "Select List" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Upload" },
  { value: "email", label: "Email" },
  { value: "description_text", label: "Description / Section Header" },
];

const getDocumentUrl = (url: string) => {
  if (!url) return "";
  const parts = url.split("/");
  const lastPart = parts[parts.length - 1];
  let filename = lastPart;
  return `/api/downloadProxy/${encodeURIComponent(filename)}?url=${encodeURIComponent(url)}`;
};

const isUrlOrDriveLink = (val: unknown): boolean => {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("drive.google.com") ||
    trimmed.startsWith("docs.google.com") ||
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com") ||
    trimmed.includes("res.cloudinary.com") ||
    trimmed.includes("storage.googleapis.com")
  );
};

export default function SubmissionsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeConcernEmail, setActiveConcernEmail] = useState<string | null>(null);
  const [activeProfileReg, setActiveProfileReg] = useState<Registration | null>(null);

  const [reuploadRegId, setReuploadRegId] = useState<string | null>(null);
  const [reuploadIssueText, setReuploadIssueText] = useState("");
  const [reuploadFields, setReuploadFields] = useState<string[]>([]);

  // Stage 4 Queue & Action states
  const [queueTab, setQueueTab] = useState<"pending" | "approved" | "action_required" | "rejected" | "all">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [approveConfirmReg, setApproveConfirmReg] = useState<Registration | null>(null);
  const [rejectConfirmReg, setRejectConfirmReg] = useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revokeConfirmReg, setRevokeConfirmReg] = useState<Registration | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Tabs Navigation
  const [activeTab, setActiveTab] = useState<"students" | "controls" | "edit-event" | "create-event">("students");
  const [subTab, setSubTab] = useState<"all" | "female" | "male" | "other">("all");
  const [tableViewMode, setTableViewMode] = useState<"queue" | "responses">("queue");

  // Quick Controls Form
  const [regOpen, setRegOpen] = useState(true);
  const [controlsTotalSeats, setControlsTotalSeats] = useState<number | string>(50);
  const [controlsMaleSeats, setControlsMaleSeats] = useState<number | string>(25);
  const [controlsFemaleSeats, setControlsFemaleSeats] = useState<number | string>(25);

  // Edit Event Form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editTotalSeats, setEditTotalSeats] = useState<number | string>(50);
  const [editMaleSeats, setEditMaleSeats] = useState<number | string>(25);
  const [editFemaleSeats, setEditFemaleSeats] = useState<number | string>(25);
  const [editCoordinators, setEditCoordinators] = useState<any[]>([]);
  const [editFields, setEditFields] = useState<any[]>([]);
  const [editFee, setEditFee] = useState<number | string>(0);
  const [editConsentTemplate, setEditConsentTemplate] = useState("");
  const [editWhatsappLink, setEditWhatsappLink] = useState("");
  const [editQrCode, setEditQrCode] = useState("");

  // Create Event Form state
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createTotalSeats, setCreateTotalSeats] = useState<number | string>(50);
  const [createMaleSeats, setCreateMaleSeats] = useState<number | string>(25);
  const [createFemaleSeats, setCreateFemaleSeats] = useState<number | string>(25);
  const [createCoordinators, setCreateCoordinators] = useState<any[]>([
    { id: "c1", name: "", email: "" }
  ]);
  const [createFields, setCreateFields] = useState<any[]>([
    { id: "1", name: "Full Name", type: "short_text", sortOrder: 0 },
    { id: "2", name: "Roll Number", type: "short_text", sortOrder: 1 },
    { id: "3", name: "Gender", type: "radio", options: ["Male", "Female", "Other"], sortOrder: 2 },
  ]);
  const [createFee, setCreateFee] = useState<number | string>(0);

  const availableAssignedOptions = Array.from(
    new Set(
      editFields
        .filter((f) => f.type === "radio" || f.type === "select")
        .flatMap((f) => f.options || [])
    )
  ).filter((opt) => opt && opt.trim() !== "");

  const createAvailableAssignedOptions = Array.from(
    new Set(
      createFields
        .filter((f) => f.type === "radio" || f.type === "select")
        .flatMap((f) => f.options || [])
    )
  ).filter((opt) => opt && opt.trim() !== "");
  const [createConsentTemplate, setCreateConsentTemplate] = useState("");
  const [createConsentTemplates, setCreateConsentTemplates] = useState<any[]>([]);
  const [editConsentTemplates, setEditConsentTemplates] = useState<any[]>([]);
  const [createTempTemplateName, setCreateTempTemplateName] = useState("");
  const [editTempTemplateName, setEditTempTemplateName] = useState("");
  const [createWhatsappLink, setCreateWhatsappLink] = useState("");
  const [createQrCode, setCreateQrCode] = useState("");
  const [editEmailsDisabled, setEditEmailsDisabled] = useState(false);
  const [createEmailsDisabled, setCreateEmailsDisabled] = useState(false);
  const [editCityWhatsapp, setEditCityWhatsapp] = useState<Record<string, { whatsappLink: string, qrCodeUrl: string }>>({});
  const [createCityWhatsapp, setCreateCityWhatsapp] = useState<Record<string, { whatsappLink: string, qrCodeUrl: string }>>({});

  const [tripSearch, setTripSearch] = useState("");
  const [tripDropdownOpen, setTripDropdownOpen] = useState(false);

  // Fetch trips list
  useEffect(() => {
    async function loadTrips() {
      try {
        const res = await fetch("/api/trip");
        if (res.ok) {
          const data = await res.json();
          const tripList = data.trips || [];
          setTrips(tripList);
          const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
          const queryTripId = urlParams?.get("tripId");
          const matched = tripList.find((t: any) => t.id === queryTripId);
          if (matched) {
            setSelectedTripId(matched.id);
          } else if (tripList.length > 0) {
            setSelectedTripId(tripList[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading trips:", err);
      }
    }
    loadTrips();
  }, []);

  // Fetch registrations and concerns for selected trip
  const fetchTripData = async () => {
    if (!selectedTripId) return;
    setLoading(true);
    try {
      const regRes = await fetch(`/api/admin/registrations?tripId=${selectedTripId}`);
      const concernsRes = await fetch(`/api/coordinator/concerns?tripId=${selectedTripId}`);
      
      if (regRes.ok && concernsRes.ok) {
        const regData = await regRes.json();
        const concernsData = await concernsRes.json();
        setRegistrations(regData.registrations || []);
        setConcerns(concernsData.concerns || []);
      }

      // Load specific trip metadata
      const tripMatch = trips.find((t) => t.id === selectedTripId);
      if (tripMatch) {
        setSelectedTrip(tripMatch);
        setRegOpen(tripMatch.registrationOpen !== false);
        setControlsTotalSeats(tripMatch.totalSeats !== undefined ? tripMatch.totalSeats : 50);
        setControlsFemaleSeats(tripMatch.femaleReservedSeats !== undefined ? tripMatch.femaleReservedSeats : 0);
        setControlsMaleSeats(tripMatch.maleReservedSeats !== undefined ? tripMatch.maleReservedSeats : Math.max(0, (tripMatch.totalSeats || 50) - (tripMatch.femaleReservedSeats || 0)));
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load registration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTripId) {
      fetchTripData();
    }
  }, [selectedTripId, trips]);

  const handleDownloadCSV = () => {
    if (!registrations.length) return;

    // Collect all unique form field keys across all registrations
    const allFormFieldKeys = new Set<string>();
    registrations.forEach((reg) => {
      if (reg.formData && typeof reg.formData === "object") {
        Object.keys(reg.formData).forEach((k) => allFormFieldKeys.add(k));
      }
    });

    const consentTemplates: any[] = selectedTrip?.consentTemplates || [];

    // Columns for consent form links and verification per template
    const consentLinkHeaders = consentTemplates.map((t: any) => `Consent Form - ${t.name} (Link)`);
    const consentVerifiedHeaders = consentTemplates.map((t: any) => `Consent Form - ${t.name} (Verified)`);

    // Dynamic form field columns — exclude file-upload field names handled separately
    const skipKeys = new Set(["Student ID Card Copy", "Completed Consent Form"]);
    const formFieldHeaders = Array.from(allFormFieldKeys).filter(
      (k) => !skipKeys.has(k) && !k.startsWith("Completed Consent -")
    );

    const headers = [
      "Registration ID",
      "Email",
      "Gender",
      "Status",
      "Student ID Verified",
      "Consent Form Verified",
      "Student ID Copy Link",
      ...consentLinkHeaders,
      ...consentVerifiedHeaders,
      ...formFieldHeaders,
    ];

    const escapeCSV = (val: any): string => {
      if (val == null) return "";
      const str = String(val);
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = registrations.map((reg) => {
      const fd: Record<string, any> = reg.formData || {};

      // Student ID Link — check common field key names
      const studentIdLink =
        fd["Student ID Card Copy"] ||
        fd["ID Copy"] ||
        "";

      // Per-template consent form upload links
      const consentLinks = consentTemplates.map((t: any) => {
        // Look for formData key matching this template's name or id
        const matchKey = Object.keys(fd).find((k) => {
          const lower = k.toLowerCase();
          return lower.includes("consent") && (
            lower.includes(t.id?.toLowerCase()) ||
            lower.includes(t.name?.toLowerCase())
          );
        });
        return matchKey ? fd[matchKey] : (fd["Completed Consent Form"] || "");
      });

      const consentVerifiedValues = consentTemplates.map((t: any) => {
        const verifiedMap: Record<string, boolean> = reg.verifiedConsentForms || {};
        return verifiedMap[t.id] ? "Verified" : "Unverified";
      });

      const formValues = formFieldHeaders.map((k) => escapeCSV(fd[k]));

      return [
        escapeCSV(reg.id),
        escapeCSV(reg.email),
        escapeCSV(reg.gender),
        escapeCSV(reg.status),
        escapeCSV(reg.studentIdVerified ? "Verified" : "Unverified"),
        escapeCSV(reg.consentFormVerified ? "Verified" : "Unverified"),
        escapeCSV(studentIdLink),
        ...consentLinks.map(escapeCSV),
        ...consentVerifiedValues,
        ...formValues,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `${selectedTrip?.name || "registrations"}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  // Lock background scroll when modals are open
  useEffect(() => {
    if (activeProfileReg || activeConcernEmail) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeProfileReg, activeConcernEmail]);

  const handleDeleteConcern = async (concernId: string) => {
    if (!confirm("Are you sure you want to delete this concern flag?")) return;
    try {
      const res = await fetch(`/api/coordinator/concerns?id=${concernId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Concern flag deleted successfully!");
        fetchTripData();
        const remaining = concerns.filter(
          (c) => c.id !== concernId && c.studentEmail.toLowerCase() === activeConcernEmail?.toLowerCase()
        );
        if (remaining.length === 0) {
          setActiveConcernEmail(null);
        }
      } else {
        toast.error("Failed to delete concern flag.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    }
  };

  const getStudentIdDocUrl = (reg: Registration): string | null => {
    if (!reg || !reg.formData) return null;

    if (reg.formData["Student ID Card Copy"] && isUrlOrDriveLink(reg.formData["Student ID Card Copy"])) {
      return reg.formData["Student ID Card Copy"];
    }
    if (reg.formData["Aadhaar Card Copy"] && isUrlOrDriveLink(reg.formData["Aadhaar Card Copy"])) {
      return reg.formData["Aadhaar Card Copy"];
    }

    for (const [k, v] of Object.entries(reg.formData)) {
      const lower = k.toLowerCase();
      if ((lower.includes("id") || lower.includes("card") || lower.includes("roll")) && isUrlOrDriveLink(v)) {
        return String(v);
      }
    }

    for (const [, v] of Object.entries(reg.formData)) {
      if (typeof v === "string" && (v.includes("drive.google.com") || v.includes("docs.google.com"))) {
        return v;
      }
    }

    return null;
  };

  const getStudentId = (reg: Registration): string => {
    if (!reg) return "—";

    if (reg.formData) {
      const textIdKey = Object.keys(reg.formData).find((k) => {
        const lower = k.toLowerCase();
        const val = reg.formData[k];
        if (isUrlOrDriveLink(val)) return false;
        if (lower.includes("copy") || lower.includes("file") || lower.includes("upload") || lower.includes("link")) return false;
        return lower.includes("roll") || lower.includes("student id") || lower.includes("studentid") || lower.includes("id number");
      });

      if (textIdKey && reg.formData[textIdKey]) {
        const val = String(reg.formData[textIdKey]).trim();
        if (val && !isUrlOrDriveLink(val)) {
          return val;
        }
      }
    }

    if (reg.email) {
      const prefix = reg.email.split("@")[0]?.trim();
      if (prefix && prefix.length >= 5) {
        return prefix.toUpperCase();
      }
    }

    if (reg.uid) {
      return reg.uid.slice(0, 10);
    }

    return "—";
  };

  const getStudentName = (reg: Registration): string => {
    if (!reg) return "Student";
    if (reg.formData) {
      const nameKey = Object.keys(reg.formData).find((k) => {
        const lower = k.toLowerCase();
        const val = reg.formData[k];
        if (isUrlOrDriveLink(val)) return false;
        return lower.includes("name") || lower.includes("fullname");
      });
      if (nameKey && reg.formData[nameKey] && !isUrlOrDriveLink(reg.formData[nameKey])) {
        const val = String(reg.formData[nameKey]).trim();
        if (val) return val;
      }
    }
    if (reg.email) {
      const prefix = reg.email.split("@")[0]?.trim();
      if (prefix) return prefix;
    }
    return "Student";
  };

  const isApprovable = (reg: Registration) => {
    if (!reg.studentIdVerified) return false;
    const templates = selectedTrip?.consentTemplates && selectedTrip.consentTemplates.length > 0
      ? selectedTrip.consentTemplates
      : (selectedTrip?.consentFormTemplateUrl ? [{ id: "legacy-consent" }] : []);
    if (templates.length > 0 && !reg.consentFormVerified) return false;
    return true;
  };

  const handleToggleStudentIdVerification = async (regId: string, verified: boolean = true) => {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: regId,
          action: "verify_student_id",
          studentIdVerified: verified,
        }),
      });

      if (res.ok) {
        toast.success(verified ? "Student ID verified successfully!" : "Student ID verification revoked.");
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === regId) {
          setActiveProfileReg((prev) => prev ? { ...prev, studentIdVerified: verified } : null);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update Student ID verification.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    }
  };

  const handleToggleConsentVerification = async (
    regId: string,
    templateId: string = "legacy-consent",
    verified: boolean = true
  ) => {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: regId,
          action: "verify_consent_form",
          consentTemplateId: templateId,
          verified,
        }),
      });

      if (res.ok) {
        toast.success(verified ? "Consent Form verified successfully!" : "Consent Form verification revoked.");
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === regId) {
          setActiveProfileReg((prev) => {
            if (!prev) return null;
            const updatedMap = { ...(prev.verifiedConsentForms || {}), [templateId]: verified };
            const templates = selectedTrip?.consentTemplates && selectedTrip.consentTemplates.length > 0
              ? selectedTrip.consentTemplates
              : (selectedTrip?.consentFormTemplateUrl ? [{ id: "legacy-consent" }] : []);
            const allOk = templates.length > 0 && templates.every((t) => updatedMap[t.id]);
            return {
              ...prev,
              verifiedConsentForms: updatedMap,
              consentFormVerified: allOk,
            };
          });
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update Consent Form verification.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    }
  };

  const handleApproveRegistration = async (reg: Registration) => {
    if (!isApprovable(reg)) {
      toast.error("Cannot approve: Student ID and all required consent forms must be verified first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: reg.id,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.email?.sent) {
          toast.success("✓ Student approved & confirmation email sent!");
        } else if (data.email?.status === "already_sent") {
          toast.success("✓ Student approved (confirmation email was already sent previously).");
        } else if (data.email?.status === "disabled") {
          toast.success("✓ Student approved (trip emails are disabled).");
        } else if (data.email?.status === "failed") {
          toast.warning(`⚠ Student approved, but confirmation email could not be sent: ${data.email.error || "Delivery error"}`);
        } else {
          toast.success("✓ Student approved successfully.");
        }
        setApproveConfirmReg(null);
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === reg.id) {
          setActiveProfileReg((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.registrationStatus || data.status || "mail_sent",
                  approvalEmailStatus: data.email?.status || prev.approvalEmailStatus,
                  approvalEmailError: data.email?.error || prev.approvalEmailError,
                }
              : null
          );
        }
      } else {
        toast.error(data.error || "Failed to approve registration.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while approving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendApprovalEmail = async (reg: Registration) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: reg.id,
          action: "resend_approval_email",
        }),
      });

      const data = await res.json();
      if (res.ok && data.email?.sent) {
        toast.success("✓ Confirmation email resent successfully!");
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === reg.id) {
          setActiveProfileReg((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.registrationStatus || data.status || "mail_sent",
                  approvalEmailStatus: "sent",
                  approvalEmailError: undefined,
                }
              : null
          );
        }
      } else {
        toast.error(data.email?.error || data.error || "Failed to resend confirmation email.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while resending the email.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectRegistration = async () => {
    if (!rejectConfirmReg) return;
    if (!rejectReason.trim()) {
      toast.error("Rejection reason is mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: rejectConfirmReg.id,
          action: "reject",
          reason: rejectReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Registration rejected.");
        const regId = rejectConfirmReg.id;
        setRejectConfirmReg(null);
        setRejectReason("");
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === regId) {
          setActiveProfileReg((prev) => prev ? { ...prev, status: "rejected", issueText: rejectReason.trim() } : null);
        }
      } else {
        toast.error(data.error || "Failed to reject registration.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while rejecting.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeApproval = async () => {
    if (!revokeConfirmReg) return;
    if (!revokeReason.trim()) {
      toast.error("Revocation reason is mandatory.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: revokeConfirmReg.id,
          action: "revoke_approval",
          reason: revokeReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Approval revoked. Registration returned to pending review.");
        const regId = revokeConfirmReg.id;
        setRevokeConfirmReg(null);
        setRevokeReason("");
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === regId) {
          setActiveProfileReg((prev) => prev ? { ...prev, status: "registered", issueText: revokeReason.trim() } : null);
        }
      } else {
        toast.error(data.error || "Failed to revoke approval.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while revoking approval.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReuploadRequest = async () => {
    if (!reuploadRegId) return;
    if (!reuploadIssueText.trim()) {
      toast.error("Correction reason is mandatory.");
      return;
    }
    if (reuploadFields.length === 0) {
      toast.error("Please select at least one field or document requiring correction.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: reuploadRegId,
          action: "request_reupload",
          reason: reuploadIssueText.trim(),
          actionRequiredFields: reuploadFields,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Correction request sent to student.");
        const regId = reuploadRegId;
        setReuploadRegId(null);
        setReuploadIssueText("");
        setReuploadFields([]);
        await fetchTripData();
        if (activeProfileReg && activeProfileReg.id === regId) {
          setActiveProfileReg((prev) => prev ? {
            ...prev,
            status: "action_required",
            issueText: reuploadIssueText.trim(),
            actionRequiredFields: reuploadFields,
          } : null);
        }
      } else {
        toast.error(data.error || "Failed to request correction.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred while sending correction request.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyRegistrationLink = () => {
    if (!selectedTripId) return;
    const origin = window.location.origin;
    const link = `${origin}/trip-registration?tripId=${selectedTripId}`;
    navigator.clipboard.writeText(link);
    alert("Event registration link copied to clipboard! 📋");
  };

  const handleConsentTemplateChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      toast.loading("Uploading consent form template...", { id: "upload-template" });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "consent_templates",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const fileUrl = data.images[0].secure_url || data.images[0];
      if (isEdit) {
        setEditConsentTemplate(fileUrl);
      } else {
        setCreateConsentTemplate(fileUrl);
      }
      toast.success("Consent form template uploaded successfully!", { id: "upload-template" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload template.", { id: "upload-template" });
    }
  };

  const handleAddTemplateRow = (isEdit: boolean) => {
    const newTemplate = {
      id: crypto.randomUUID(),
      name: "",
      templateUrl: "",
    };
    if (isEdit) {
      setEditConsentTemplates((prev) => [...prev, newTemplate]);
    } else {
      setCreateConsentTemplates((prev) => [...prev, newTemplate]);
    }
  };

  const handleUpdateTemplateName = (id: string, name: string, isEdit: boolean) => {
    if (isEdit) {
      setEditConsentTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name } : t))
      );
    } else {
      setCreateConsentTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name } : t))
      );
    }
  };

  const handleUploadTemplateFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
    isEdit: boolean
  ) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      toast.loading("Uploading consent template...", { id: `upload-${id}` });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "consent_templates",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const fileUrl = data.images[0].secure_url || data.images[0];
      
      if (isEdit) {
        setEditConsentTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, templateUrl: fileUrl } : t))
        );
      } else {
        setCreateConsentTemplates((prev) =>
          prev.map((t) => (t.id === id ? { ...t, templateUrl: fileUrl } : t))
        );
      }
      
      toast.success("Template file uploaded successfully!", { id: `upload-${id}` });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload template file.", { id: `upload-${id}` });
    }
  };

  const handleRemoveTemplateRow = (id: string, isEdit: boolean) => {
    if (isEdit) {
      setEditConsentTemplates((prev) => prev.filter((t) => t.id !== id));
    } else {
      setCreateConsentTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };


  const handleQrCodeChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      toast.loading("Uploading QR Code image...", { id: "upload-qr" });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "trip_qrs",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const fileUrl = data.images[0].secure_url || data.images[0];
      if (isEdit) {
        setEditQrCode(fileUrl);
      } else {
        setCreateQrCode(fileUrl);
      }
      toast.success("QR Code uploaded successfully!", { id: "upload-qr" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload QR Code.", { id: "upload-qr" });
    }
  };

  const handleCityQrCodeChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    option: string,
    isEdit: boolean
  ) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      const base64File = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      toast.loading(`Uploading QR Code for ${option}...`, { id: "upload-city-qr" });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "trip_qrs",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const fileUrl = data.images[0].secure_url || data.images[0];
      
      if (isEdit) {
        setEditCityWhatsapp((prev) => ({
          ...prev,
          [option]: {
            ...(prev[option] || { whatsappLink: "" }),
            qrCodeUrl: fileUrl,
          },
        }));
      } else {
        setCreateCityWhatsapp((prev) => ({
          ...prev,
          [option]: {
            ...(prev[option] || { whatsappLink: "" }),
            qrCodeUrl: fileUrl,
          },
        }));
      }
      toast.success(`QR Code for ${option} uploaded successfully!`, { id: "upload-city-qr" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload QR Code.", { id: "upload-city-qr" });
    }
  };


  // Update quick controls
  const handleSaveControls = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          registrationOpen: regOpen,
          totalSeats: Number(controlsTotalSeats) || 0,
          femaleReservedSeats: Number(controlsFemaleSeats) || 0,
          maleReservedSeats: Number(controlsMaleSeats) || 0,
        }),
      });

      if (res.ok) {
        toast.success("Event controls and slots updated successfully!");
        const updatedTrips = trips.map((t) => {
          if (t.id === selectedTripId) {
            return {
              ...t,
              registrationOpen: regOpen,
              totalSeats: Number(controlsTotalSeats) || 0,
              femaleReservedSeats: Number(controlsFemaleSeats) || 0,
              maleReservedSeats: Number(controlsMaleSeats) || 0,
            };
          }
          return t;
        });
        setTrips(updatedTrips);
      } else {
        toast.error("Failed to update controls.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Complete and Archive Event
  const handleCompleteEvent = async () => {
    if (!selectedTripId) return;
    if (!confirm("Are you sure you want to mark this event as completed? This will archive the roster, close registration, and remove user access to register.")) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          isCompleted: true,
        }),
      });

      if (res.ok) {
        toast.success("Event marked as completed & archived!");
        const updatedTrips = trips.map((t) => {
          if (t.id === selectedTripId) {
            return {
              ...t,
              isCompleted: true,
              finalRosterSaved: true,
              registrationOpen: false,
            };
          }
          return t;
        });
        setTrips(updatedTrips);
      } else {
        toast.error("Failed to complete event.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Trip Handler
  const handleDeleteTrip = async () => {
    if (!selectedTripId) return;
    if (!confirm("Are you sure you want to delete this event completely? This action cannot be undone.")) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`/api/trip?id=${selectedTripId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Event deleted successfully!");
        const remaining = trips.filter((t) => t.id !== selectedTripId);
        setTrips(remaining);
        if (remaining.length > 0) {
          setSelectedTripId(remaining[0].id);
        } else {
          setSelectedTripId("");
          setSelectedTrip(null);
          setRegistrations([]);
        }
      } else {
        toast.error("Failed to delete the event.");
      }
    } catch (e) {
      console.error(e);
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };


  // Change individual registration status
  const handleStatusChange = async (regId: string, nextStatus: string, issueText?: string, actionRequiredFields?: string[]) => {
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId, status: nextStatus, issueText, actionRequiredFields }),
      });

      if (res.ok) {
        toast.success(`Registration status set to: ${nextStatus}`);
        fetchTripData();
      } else {
        toast.error("Failed to update status.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ----------------------------------------------------
  // Edit Form Fields Builders
  // ----------------------------------------------------
  const addEditField = () => {
    setEditFields([
      ...editFields,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        type: "short_text",
        options: [],
        allowEditIfPrefilled: true,
        sortOrder: editFields.length,
      },
    ]);
  };

  const updateEditField = (id: string, keyOrObj: string | Record<string, any>, value?: any) => {
    setEditFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (typeof keyOrObj === "object" && keyOrObj !== null) {
          return { ...f, ...keyOrObj };
        }
        return { ...f, [keyOrObj]: value };
      })
    );
  };

  const removeEditField = (id: string) => {
    setEditFields(editFields.filter((f) => f.id !== id));
  };

  const moveEditField = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= editFields.length) return;
    const copy = [...editFields];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    setEditFields(copy.map((f, idx) => ({ ...f, sortOrder: idx })));
  };

  // Edit Coordinators Builder
  const addEditCoordinator = () => {
    setEditCoordinators([
      ...editCoordinators,
      { id: Math.random().toString(36).substr(2, 9), name: "", email: "" }
    ]);
  };

  const updateEditCoordinator = (id: string, key: string, value: string) => {
    setEditCoordinators(
      editCoordinators.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const removeEditCoordinator = (id: string) => {
    setEditCoordinators(editCoordinators.filter((c) => c.id !== id));
  };

  const handleSaveEventDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/trip", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: selectedTripId,
          name: editName,
          description: editDesc,
          coordinators: editCoordinators.map((c) => ({
            name: c.name.trim(),
            email: c.email.trim(),
            assignedOption: c.assignedOption ? c.assignedOption.trim() : "",
          })).filter((c) => c.name && c.email),
          totalSeats: Number(editTotalSeats) || 0,
          femaleReservedSeats: Number(editFemaleSeats) || 0,
          maleReservedSeats: Number(editMaleSeats) || 0,
          formFields: editFields,
          fee: Number(editFee) || 0,
          consentFormTemplateUrl: editConsentTemplate,
          consentTemplates: editConsentTemplates,
          whatsappLink: editWhatsappLink,
          qrCodeUrl: editQrCode,
          emailsDisabled: editEmailsDisabled,
          cityWhatsappSettings: editCityWhatsapp,
        }),
      });

      if (res.ok) {
        toast.success("Event details and registration form saved successfully!");
        
        const tripRes = await fetch("/api/trip");
        if (tripRes.ok) {
          const tripData = await tripRes.json();
          setTrips(tripData.trips || []);
        }
        setActiveTab("students");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to save changes.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Create Form Fields Builders
  // ----------------------------------------------------
  const addCreateField = () => {
    setCreateFields([
      ...createFields,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: "",
        type: "short_text",
        options: [],
        allowEditIfPrefilled: true,
        sortOrder: createFields.length,
      },
    ]);
  };

  const updateCreateField = (id: string, keyOrObj: string | Record<string, any>, value?: any) => {
    setCreateFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (typeof keyOrObj === "object" && keyOrObj !== null) {
          return { ...f, ...keyOrObj };
        }
        return { ...f, [keyOrObj]: value };
      })
    );
  };

  const removeCreateField = (id: string) => {
    setCreateFields(createFields.filter((f) => f.id !== id));
  };

  const moveCreateField = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= createFields.length) return;
    const copy = [...createFields];
    const temp = copy[index];
    copy[index] = copy[nextIndex];
    copy[nextIndex] = temp;
    setCreateFields(copy.map((f, idx) => ({ ...f, sortOrder: idx })));
  };

  // Create Coordinators Builder
  const addCreateCoordinator = () => {
    setCreateCoordinators([
      ...createCoordinators,
      { id: Math.random().toString(36).substr(2, 9), name: "", email: "", assignedOption: "" }
    ]);
  };

  const updateCreateCoordinator = (id: string, key: string, value: string) => {
    setCreateCoordinators(
      createCoordinators.map((c) => (c.id === id ? { ...c, [key]: value } : c))
    );
  };

  const removeCreateCoordinator = (id: string) => {
    setCreateCoordinators(createCoordinators.filter((c) => c.id !== id));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          description: createDesc,
          coordinators: createCoordinators.map((c) => ({
            name: c.name.trim(),
            email: c.email.trim(),
            assignedOption: c.assignedOption ? c.assignedOption.trim() : "",
          })).filter((c) => c.name && c.email),
          totalSeats: Number(createTotalSeats) || 0,
          femaleReservedSeats: Number(createFemaleSeats) || 0,
          maleReservedSeats: Number(createMaleSeats) || 0,
          releasedSeats: 0,
          releasedSeatsType: "all",
          formFields: createFields,
          fee: Number(createFee) || 0,
          consentFormTemplateUrl: createConsentTemplate,
          consentTemplates: createConsentTemplates,
          whatsappLink: createWhatsappLink,
          qrCodeUrl: createQrCode,
          emailsDisabled: createEmailsDisabled,
          cityWhatsappSettings: createCityWhatsapp,
        }),
      });

      if (res.ok) {
        toast.success("New event created successfully!");
        
        const tripRes = await fetch("/api/trip");
        if (tripRes.ok) {
          const tripData = await tripRes.json();
          setTrips(tripData.trips || []);
          if (tripData.trips && tripData.trips.length > 0) {
            setSelectedTripId(tripData.trips[0].id);
          }
        }
        setActiveTab("students");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create event.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRegistrationsTable = (filteredRegs: any[]) => {
    if (filteredRegs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-xl text-muted-foreground text-sm font-semibold bg-muted/10 p-6 text-center">
          <FileTextIcon className="w-8 h-8 mb-2 opacity-40" />
          <p>No registration submissions found in this category.</p>
          <p className="text-xs text-muted-foreground mt-1">Try switching tabs or adjusting your search query.</p>
        </div>
      );
    }

    const hasTripConsents = Boolean(
      selectedTrip?.consentFormTemplateUrl ||
      (selectedTrip?.consentTemplates && selectedTrip.consentTemplates.length > 0)
    );

    return (
      <div className="border border-stone-200/80 rounded-xl overflow-hidden shadow-xs bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50/70 border-b border-stone-200/80">
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Student Name</TableHead>
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Student ID</TableHead>
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Gender</TableHead>
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Submitted At</TableHead>
              <TableHead className="font-semibold text-stone-600 text-xs uppercase tracking-wider">Verification Status</TableHead>
              <TableHead className="text-right font-semibold text-stone-600 text-xs uppercase tracking-wider">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegs.map((reg) => {
              const studentName = getStudentName(reg);
              const studentId = getStudentId(reg);
              const studentIdDoc = getStudentIdDocUrl(reg);
              const approvable = isApprovable(reg);
              const isPending = reg.status === "registered";
              const isApproved = reg.status === "approved_to_pay" || reg.status === "mail_sent" || reg.status === "paid";
              const isActionRequired = reg.status === "action_required";
              const isRejected = reg.status === "rejected";

              const formattedDate = reg.submittedAt
                ? new Date(reg.submittedAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—";

              return (
                <TableRow
                  key={reg.id}
                  onClick={() => setActiveProfileReg(reg)}
                  className="hover:bg-stone-50/80 transition cursor-pointer border-b border-stone-100 last:border-0"
                >
                  {/* 1. Student Name */}
                  <TableCell>
                    <div className="font-bold text-sm text-stone-900 hover:text-[#3B001B] transition">
                      {studentName}
                    </div>
                    <span className="text-[10px] text-stone-400">Click row to review ↗</span>
                  </TableCell>

                  {/* 2. Student ID */}
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/80 text-stone-800">
                        {studentId}
                      </span>
                      {studentIdDoc && (
                        <a
                          href={studentIdDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/20 transition-all shadow-xs shrink-0"
                          title="Open Google Drive document in new tab"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>View ID</span>
                          <ExternalLinkIcon className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </TableCell>

                  {/* 3. Email */}
                  <TableCell>
                    <span className="text-xs text-stone-600 font-mono font-medium">{reg.email}</span>
                  </TableCell>

                  {/* 4. Gender */}
                  <TableCell>
                    <span className="capitalize text-xs font-medium text-stone-700">
                      {reg.gender || "—"}
                    </span>
                  </TableCell>

                  {/* 5. Submitted At */}
                  <TableCell>
                    <span className="text-xs text-stone-500 whitespace-nowrap">
                      {formattedDate}
                    </span>
                  </TableCell>

                  {/* 6. Verification Status */}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold px-1.5 py-0.5 rounded border uppercase text-[9px] ${
                            reg.studentIdVerified
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          ID: {reg.studentIdVerified ? "Verified ✅" : "Missing ❌"}
                        </span>
                        {hasTripConsents ? (
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded border uppercase text-[9px] ${
                              reg.consentFormVerified
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-red-100 text-red-700 border-red-200"
                            }`}
                          >
                            Consent: {reg.consentFormVerified ? "Verified ✅" : "Missing ❌"}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[9px]">Consent: N/A</span>
                        )}
                      </div>
                      {isPending && (
                        <div>
                          {approvable ? (
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                              ● Ready for Approval
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold text-[10px]">
                              ● Verification Needed
                            </span>
                          )}
                        </div>
                      )}
                      {!isPending && (
                        <div className="flex flex-col gap-1">
                          <span
                            className={`font-bold px-2 py-0.5 rounded border uppercase text-[9px] ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : isActionRequired
                                ? "bg-amber-100 text-amber-800 border-amber-300"
                                : isRejected
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-stone-100 text-stone-700 border-stone-200"
                            }`}
                          >
                            {reg.status === "mail_sent"
                              ? "Approved (Mail Sent)"
                              : reg.status === "approved_to_pay"
                              ? "Approved"
                              : reg.status === "paid"
                              ? "Paid"
                              : reg.status === "action_required"
                              ? "Reupload Requested"
                              : reg.status}
                          </span>
                          {reg.approvalEmailStatus === "failed" && (
                            <span
                              className="text-[9px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1"
                              title={reg.approvalEmailError || "Approval email failed to send"}
                            >
                              <AlertCircleIcon className="w-2.5 h-2.5 shrink-0" /> Mail Failed
                            </span>
                          )}
                          {(reg.approvalEmailStatus === "sent" || reg.status === "mail_sent") && (
                            <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-1">
                              <MailIcon className="w-2.5 h-2.5" /> Email Sent
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* 7. Action */}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-semibold rounded-lg shadow-xs"
                        onClick={() => setActiveProfileReg(reg)}
                      >
                        Review
                      </Button>

                      {isPending && !selectedTrip?.isCompleted && (
                        <>
                          <Button
                            size="sm"
                            title={
                              !approvable
                                ? "Student ID and all required consent forms must be verified before approving"
                                : "Approve this student's registration"
                            }
                            disabled={!approvable || submitting}
                            className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-stone-100 disabled:text-stone-400 disabled:border-stone-200 disabled:cursor-not-allowed font-semibold rounded-lg shadow-xs"
                            onClick={() => setApproveConfirmReg(reg)}
                          >
                            <CheckCircle2Icon className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold rounded-lg"
                            onClick={() => {
                              setReuploadRegId(reg.id);
                              setReuploadIssueText("");
                              setReuploadFields([]);
                            }}
                          >
                            <FileWarning className="w-3.5 h-3.5 mr-1" /> Re-upload
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 bg-red-50 border-red-200 text-red-700 hover:bg-red-100 font-semibold rounded-lg"
                            onClick={() => {
                              setRejectConfirmReg(reg);
                              setRejectReason("");
                            }}
                          >
                            <XCircleIcon className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </>
                      )}

                      {(reg.status === "approved_to_pay" || reg.status === "mail_sent" || reg.status === "paid") && !selectedTrip?.isCompleted && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Resend approval confirmation email"
                            disabled={submitting}
                            className="text-xs h-7 px-2 bg-stone-50 border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold rounded-lg"
                            onClick={() => handleResendApprovalEmail(reg)}
                          >
                            <MailIcon className="w-3.5 h-3.5 mr-1 text-stone-500" /> Resend Mail
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100 font-semibold rounded-lg"
                            onClick={() => {
                              setRevokeConfirmReg(reg);
                              setRevokeReason("");
                            }}
                          >
                            <RotateCcwIcon className="w-3.5 h-3.5 mr-1" /> Revoke
                          </Button>
                        </>
                      )}

                      {isRejected && !selectedTrip?.isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200 font-semibold rounded-lg"
                          onClick={() => handleStatusChange(reg.id, "registered")}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              Registrations Console
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#3B001B]/10 text-[#3B001B] border border-[#3B001B]/20">
              Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 max-w-2xl">
            Review and verify student registrations, inspect credential documents, and manage approval queues.
          </p>
        </div>

        {/* Trip Searchable Dropdown & Link Copier */}
        {trips.length > 0 && activeTab !== "create-event" && (
          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <button
                type="button"
                onClick={() => setTripDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between p-2 border border-border rounded bg-background text-sm font-semibold outline-none hover:border-primary/50 transition"
              >
                <span className="truncate">{trips.find((t) => t.id === selectedTripId)?.name || "Select trip"}</span>
                <svg className="w-4 h-4 ml-2 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {tripDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search trip..."
                      value={tripSearch}
                      onChange={(e) => setTripSearch(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-border rounded outline-none focus:border-primary bg-background"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {trips
                      .filter((t) => t.name.toLowerCase().includes(tripSearch.toLowerCase()))
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm font-semibold hover:bg-muted transition ${
                            t.id === selectedTripId ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={() => {
                            setSelectedTripId(t.id);
                            setTripSearch("");
                            setTripDropdownOpen(false);
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    {trips.filter((t) => t.name.toLowerCase().includes(tripSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-3 text-xs text-muted-foreground italic">No trips found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleCopyRegistrationLink}
              variant="outline"
              size="sm"
              className="font-bold flex items-center gap-1.5 text-xs h-[38px] px-3"
              title="Copy student registration link for this event"
            >
              🔗 Copy Link
            </Button>

            <Button
              onClick={() => {
                const url = selectedTripId
                  ? `/api/admin/email-preview?tripId=${encodeURIComponent(selectedTripId)}&dev=true`
                  : "/api/admin/email-preview?dev=true";
                window.open(url, "_blank");
              }}
              variant="outline"
              size="sm"
              className="font-bold flex items-center gap-1.5 text-xs h-[38px] px-3 bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300"
              title="Preview approval confirmation email template"
            >
              <MailIcon className="w-3.5 h-3.5 text-stone-600" />
              <span>Preview Email</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 sm:gap-4 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("students")}
          className={`pb-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "students" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UsersIcon className="w-4 h-4" /> Students List (Pending & Approved)
          {registrations.length > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-mono">
              {registrations.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("controls")}
          className={`pb-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "controls" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Registration & Controls
        </button>
        <button
          onClick={() => {
            if (selectedTrip) {
              setEditName(selectedTrip.name);
              setEditDesc(selectedTrip.description || "");
              setEditTotalSeats(selectedTrip.totalSeats !== undefined ? selectedTrip.totalSeats : 50);
              setEditFemaleSeats(selectedTrip.femaleReservedSeats !== undefined ? selectedTrip.femaleReservedSeats : 0);
              setEditMaleSeats(selectedTrip.maleReservedSeats !== undefined ? selectedTrip.maleReservedSeats : Math.max(0, (selectedTrip.totalSeats || 50) - (selectedTrip.femaleReservedSeats || 0)));
              
              // Map coordinators (strings to objects backward compatible)
              const coords = (selectedTrip.coordinators || []).map((c: any, idx: number) => {
                if (typeof c === "object" && c !== null) {
                  return { id: c.id || String(idx), name: c.name || "", email: c.email || "", assignedOption: c.assignedOption || "" };
                }
                return { id: String(idx), name: "", email: String(c), assignedOption: "" };
              });
              setEditCoordinators(coords);
              setEditFields(selectedTrip.form?.fields || []);
              setEditFee(selectedTrip.fee !== undefined ? selectedTrip.fee : 0);
              setEditConsentTemplate(selectedTrip.consentFormTemplateUrl || "");
              setEditConsentTemplates(selectedTrip.consentTemplates || []);
              setEditWhatsappLink(selectedTrip.whatsappLink || "");
              setEditQrCode(selectedTrip.qrCodeUrl || "");
              setEditEmailsDisabled(selectedTrip.emailsDisabled || false);
              setEditCityWhatsapp(selectedTrip.cityWhatsappSettings || {});
            }
            setActiveTab("edit-event");
          }}
          disabled={!selectedTripId}
          className={`pb-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            !selectedTripId ? "opacity-50 cursor-not-allowed" : ""
          } ${
            activeTab === "edit-event" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <EditIcon className="w-4 h-4" /> Edit Selected Event & Form
        </button>
        <button
          onClick={() => {
            setCreateName("");
            setCreateDesc("");
            setCreateTotalSeats(50);
            setCreateMaleSeats(25);
            setCreateFemaleSeats(25);
            setCreateFee(0);
            setCreateCoordinators([{ id: "c1", name: "", email: "", assignedOption: "" }]);
            setCreateFields([
              { id: "1", name: "Full Name", type: "short_text", allowEditIfPrefilled: false, sortOrder: 0 },
              { id: "2", name: "Roll Number", type: "short_text", allowEditIfPrefilled: true, sortOrder: 1 },
              { id: "3", name: "Gender", type: "radio", options: ["Male", "Female", "Other"], allowEditIfPrefilled: false, sortOrder: 2 },
            ]);
            setCreateWhatsappLink("");
            setCreateQrCode("");
            setCreateEmailsDisabled(false);
            setCreateCityWhatsapp({});
            setActiveTab("create-event");
          }}
          className={`pb-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "create-event" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <PlusCircleIcon className="w-4 h-4" /> Create New Event
        </button>
      </div>

      {/* Reusable Registrations Table Helper */}
      {(() => {
        // Define it as a local constant so it is evaluated within the component block
        return null;
      })()}

      {/* Tab 1: Students List (Pending & Approved) - 100% Full Width */}
      {(activeTab === "students" || (activeTab as string) === "registrations") && (
        <div className="space-y-6">
          {(() => {
            // Calculate stats dynamically based on loaded registration data
            const femaleRegs = registrations.filter(r => r.gender?.toLowerCase() === "female");
            const maleRegs = registrations.filter(r => r.gender?.toLowerCase() === "male");
            const otherRegs = registrations.filter(r => r.gender?.toLowerCase() !== "female" && r.gender?.toLowerCase() !== "male");

            const approvedRegs = registrations.filter(r => r.status === "paid" || r.status === "approved_to_pay" || r.status === "mail_sent");
            const pendingRegs = registrations.filter(r => r.status === "registered");
            const actionRequiredRegs = registrations.filter(r => r.status === "action_required");
            const rejectedRegs = registrations.filter(r => r.status === "rejected");

            const approvedFemales = femaleRegs.filter(r => r.status === "paid" || r.status === "approved_to_pay" || r.status === "mail_sent").length;
            const approvedMales = maleRegs.filter(r => r.status === "paid" || r.status === "approved_to_pay" || r.status === "mail_sent").length;

            // Filter by queue status tab
            let queueFiltered = registrations;
            if (queueTab === "pending") queueFiltered = pendingRegs;
            else if (queueTab === "approved") queueFiltered = approvedRegs;
            else if (queueTab === "action_required") queueFiltered = actionRequiredRegs;
            else if (queueTab === "rejected") queueFiltered = rejectedRegs;

            // Filter by gender subTab
            if (subTab === "female") {
              queueFiltered = queueFiltered.filter(r => r.gender?.toLowerCase() === "female");
            } else if (subTab === "male") {
              queueFiltered = queueFiltered.filter(r => r.gender?.toLowerCase() === "male");
            } else if (subTab === "other") {
              queueFiltered = queueFiltered.filter(r => r.gender?.toLowerCase() !== "female" && r.gender?.toLowerCase() !== "male");
            }

            // Filter by search query
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase().trim();
              queueFiltered = queueFiltered.filter(r => {
                const sName = getStudentName(r).toLowerCase();
                const sId = getStudentId(r).toLowerCase();
                const sEmail = (r.email || "").toLowerCase();
                return sName.includes(q) || sId.includes(q) || sEmail.includes(q);
              });
            }

            return (
              <>
                {/* Dynamic Counters Card Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700">Pending</span>
                      <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">⏳</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-stone-900 tracking-tight">
                        {pendingRegs.length}
                      </div>
                      <span className="text-xs text-stone-500 font-medium">Awaiting review</span>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Approved</span>
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">✅</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-stone-900 tracking-tight">
                        {approvedRegs.length}
                      </div>
                      <span className="text-xs text-stone-500 font-medium">Confirmed / Mail sent</span>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">Gender Slots</span>
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">👥</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-base font-bold text-stone-900 tracking-tight flex items-center justify-between gap-1">
                        <span className="text-sky-800">🚹 {approvedMales} / {selectedTrip?.maleReservedSeats !== undefined ? selectedTrip.maleReservedSeats : Math.max(0, (selectedTrip?.totalSeats || 0) - (selectedTrip?.femaleReservedSeats || 0))}</span>
                        <span className="text-stone-300">|</span>
                        <span className="text-rose-800">🚺 {approvedFemales} / {selectedTrip?.femaleReservedSeats ?? 0}</span>
                      </div>
                      <span className="text-xs text-stone-500 font-medium block mt-1">Approved / Allocated slots</span>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-600">Total</span>
                      <span className="w-7 h-7 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center text-sm">📋</span>
                    </div>
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-stone-900 tracking-tight">
                        {registrations.length}
                      </div>
                      <span className="text-xs text-stone-500 font-medium">Total submissions</span>
                    </div>
                  </div>
                </div>

                {/* Stage 4: Admin Registration Queue Filter Tabs */}
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    {/* Status Queue Tabs - Segmented control */}
                    <div className="flex items-center gap-1 overflow-x-auto bg-stone-100/90 p-1 rounded-xl border border-stone-200/70">
                      <button
                        type="button"
                        onClick={() => setQueueTab("pending")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          queueTab === "pending"
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <span>Pending</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          queueTab === "pending" ? "bg-amber-100 text-amber-800" : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {pendingRegs.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueTab("approved")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          queueTab === "approved"
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <span>Approved</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          queueTab === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {approvedRegs.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueTab("action_required")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          queueTab === "action_required"
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <span>Reupload</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          queueTab === "action_required" ? "bg-amber-100 text-amber-800" : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {actionRequiredRegs.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueTab("rejected")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          queueTab === "rejected"
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <span>Rejected</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          queueTab === "rejected" ? "bg-rose-100 text-rose-800" : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {rejectedRegs.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueueTab("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          queueTab === "all"
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                        }`}
                      >
                        <span>All</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          queueTab === "all" ? "bg-stone-200 text-stone-800" : "bg-stone-200/80 text-stone-600"
                        }`}>
                          {registrations.length}
                        </span>
                      </button>
                    </div>

                    {/* View Mode & CSV Download */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setTableViewMode("queue")}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                            tableViewMode === "queue"
                              ? "bg-white text-stone-900 shadow-2xs"
                              : "text-stone-500 hover:text-stone-900"
                          }`}
                        >
                          Review Queue
                        </button>
                        <button
                          type="button"
                          onClick={() => setTableViewMode("responses")}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                            tableViewMode === "responses"
                              ? "bg-white text-stone-900 shadow-2xs"
                              : "text-stone-500 hover:text-stone-900"
                          }`}
                        >
                          All Form Responses
                        </button>
                      </div>

                      <Button
                        onClick={handleDownloadCSV}
                        variant="outline"
                        size="sm"
                        disabled={registrations.length === 0}
                        className="font-bold flex items-center gap-1.5 text-xs h-8 px-3 text-stone-700 bg-white hover:bg-stone-50 border-stone-200"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" /> Download CSV
                      </Button>
                    </div>
                  </div>

                  {/* Search and Gender Filter Sub-bar */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                    <div className="relative flex-1">
                      <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        placeholder="Search student name, roll number, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70 text-xs self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setSubTab("all")}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          subTab === "all" ? "bg-white text-stone-900 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        All ({queueFiltered.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTab("female")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          subTab === "female" ? "bg-white text-rose-700 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <span>🚺 Female</span>
                        <span className="text-[10px] text-stone-400">({femaleRegs.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTab("male")}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                          subTab === "male" ? "bg-white text-sky-700 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                        }`}
                      >
                        <span>🚹 Male</span>
                        <span className="text-[10px] text-stone-400">({maleRegs.length})</span>
                      </button>
                      {otherRegs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSubTab("other")}
                          className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                            subTab === "other" ? "bg-white text-stone-900 shadow-xs font-semibold" : "text-stone-600 hover:text-stone-900"
                          }`}
                        >
                          <span>👤 Other</span>
                          <span className="text-[10px] text-stone-400">({otherRegs.length})</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loading / Table Render - Full Width */}
                {loading ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-semibold">
                    <Loader2Icon className="animate-spin mr-2" /> Fetching registration submissions...
                  </div>
                ) : tableViewMode === "responses" ? (
                  <SubmissionsTable submissions={queueFiltered} />
                ) : (
                  renderRegistrationsTable(queueFiltered)
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Tab 2: Trip Settings & Controls - Dedicated Clean View */}
      {activeTab === "controls" && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
              <div>
                <h2 className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-stone-500" /> Trip Settings & Controls
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                  {selectedTrip ? `Managing controls for: ${selectedTrip.name}` : "Select a trip from the header dropdown to modify controls"}
                </p>
              </div>
              {selectedTrip && (
                <span className="text-xs font-mono text-stone-400 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200 self-start sm:self-auto">
                  ID: {selectedTrip.id}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveControls} className="space-y-6">
              {/* Registration Status switch */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-stone-50/80 p-4 rounded-xl border border-stone-200/80 gap-3">
                <div>
                  <span className="text-sm font-semibold text-stone-800 block">Registration Access Window</span>
                  <span className="text-xs text-stone-500">Toggle whether students can view and submit new registrations for this trip</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRegOpen(!regOpen)}
                  className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all flex items-center gap-2 shadow-2xs self-start sm:self-auto ${
                    regOpen 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100" 
                      : "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${regOpen ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                  <span>{regOpen ? "REGISTRATIONS OPEN" : "REGISTRATIONS CLOSED"}</span>
                </button>
              </div>

              {/* Capacity & Quotas Quick Controls */}
              <div className="space-y-4 pt-4 border-t border-stone-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-800 uppercase tracking-wider">
                      Capacity & Slots Allocation
                    </h3>
                    <p className="text-xs text-stone-500">
                      Configure total seat cap and gender-specific quotas for male and female applicants.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                    {selectedTrip ? `${selectedTrip.totalJoined || 0} / ${controlsTotalSeats} Filled` : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                    <label className="text-xs font-bold text-stone-700 uppercase flex items-center justify-between">
                      <span>Total Slots</span>
                      <span className="text-stone-400 font-normal text-[10px]">Capacity</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={controlsTotalSeats}
                      onChange={(e) => setControlsTotalSeats(e.target.value)}
                      className="bg-white font-semibold text-stone-800"
                    />
                    <p className="text-[10px] text-stone-500">Maximum allowed participants</p>
                  </div>

                  <div className="space-y-1.5 bg-sky-50/40 p-3.5 rounded-xl border border-sky-200/70">
                    <label className="text-xs font-bold text-sky-900 uppercase flex items-center justify-between">
                      <span>🚹 Male Slots</span>
                      <span className="text-sky-600 font-normal text-[10px]">Quota</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={controlsMaleSeats}
                      onChange={(e) => setControlsMaleSeats(e.target.value)}
                      className="bg-white font-semibold text-stone-800"
                    />
                    <p className="text-[10px] text-stone-500">Reserved for male students</p>
                  </div>

                  <div className="space-y-1.5 bg-rose-50/40 p-3.5 rounded-xl border border-rose-200/70">
                    <label className="text-xs font-bold text-rose-900 uppercase flex items-center justify-between">
                      <span>🚺 Female Slots</span>
                      <span className="text-rose-600 font-normal text-[10px]">Quota</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={controlsFemaleSeats}
                      onChange={(e) => setControlsFemaleSeats(e.target.value)}
                      className="bg-white font-semibold text-stone-800"
                    />
                    <p className="text-[10px] text-stone-500">Reserved for female students</p>
                  </div>
                </div>

                {/* Helper chips & Validation feedback */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const total = Number(controlsTotalSeats) || 0;
                        const half = Math.floor(total / 2);
                        setControlsMaleSeats(half);
                        setControlsFemaleSeats(total - half);
                      }}
                      className="text-xs h-7 px-2.5 font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100"
                    >
                      ⚡ Split Evenly 50 / 50
                    </Button>
                    <span className="text-xs text-stone-500 font-mono">
                      Sum: {Number(controlsMaleSeats || 0) + Number(controlsFemaleSeats || 0)} / {Number(controlsTotalSeats || 0)}
                    </span>
                  </div>

                  {Number(controlsMaleSeats || 0) + Number(controlsFemaleSeats || 0) > Number(controlsTotalSeats || 0) && (
                    <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                      ⚠️ Male + Female slots ({Number(controlsMaleSeats || 0) + Number(controlsFemaleSeats || 0)}) exceed total capacity ({Number(controlsTotalSeats || 0)})
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full sm:w-auto text-sm px-6 h-10 bg-[#3B001B] hover:bg-[#2A0013] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <SaveIcon className="w-4 h-4" /> {submitting ? "Saving Controls..." : "Save Event Controls & Slots"}
                </Button>
              </div>
            </form>

            {/* Lifecycle & Danger Zone */}
            {selectedTrip && (
              <div className="pt-6 border-t border-stone-200/80 space-y-4">
                <h3 className="text-xs sm:text-sm font-bold text-stone-800 uppercase tracking-wider">
                  Event Lifecycle & Maintenance
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Roster Completion */}
                  <div className="bg-stone-50/80 p-4 rounded-xl border border-stone-200/70 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-stone-700 uppercase">Roster Status</span>
                        <span className={`font-semibold px-2 py-0.5 rounded-md border text-[11px] ${
                          selectedTrip.isCompleted || selectedTrip.finalRosterSaved 
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {selectedTrip.isCompleted || selectedTrip.finalRosterSaved ? "Archived ✅" : "Active / Live"}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500">
                        Marking as completed will archive the roster, close registration, and finalize records.
                      </p>
                    </div>

                    {(!selectedTrip.isCompleted && !selectedTrip.finalRosterSaved) && (
                      <Button
                        onClick={handleCompleteEvent}
                        disabled={submitting}
                        className="text-xs h-9 bg-stone-800 hover:bg-stone-900 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-2xs font-semibold transition-all"
                      >
                        Complete & Archive Event
                      </Button>
                    )}
                  </div>

                  {/* Danger Zone: Delete Trip */}
                  <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200/70 flex flex-col justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-rose-800 uppercase block mb-1">Danger Zone</span>
                      <p className="text-xs text-stone-500">
                        Permanently delete this event and remove all associated configuration data.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="text-xs h-9 text-rose-600 hover:text-white hover:bg-rose-600 border-rose-200/80 hover:border-rose-600 rounded-xl transition-all font-semibold"
                      disabled={submitting}
                      onClick={handleDeleteTrip}
                    >
                      Delete Event Completely
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Selected Event Tab */}
      {activeTab === "edit-event" && selectedTripId && (
        <form onSubmit={handleSaveEventDetails} className="space-y-6 max-w-4xl bg-muted/20 p-6 rounded-xl border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Event Name *</label>
              <Input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Coorg Exploration 2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Event Fee (₹)</label>
              <Input
                type="number"
                min={0}
                value={editFee}
                onChange={(e) => setEditFee(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <input
                id="editEmailsDisabled"
                type="checkbox"
                checked={editEmailsDisabled}
                onChange={(e) => setEditEmailsDisabled(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-900 focus:ring-indigo-900 cursor-pointer h-4 w-4"
              />
              <label htmlFor="editEmailsDisabled" className="text-sm font-bold text-zinc-700 cursor-pointer select-none">
                ⛔ Disable Email Notifications (Do not send any automated emails for approvals or re-uploads)
              </label>
            </div>
          </div>

          {/* Event Capacity & Gender Slots Allocation Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#3B001B] uppercase tracking-wide flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-[#8B263E]" /> Event Capacity & Gender Slots Allocation
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set total allowed participants and reserve slots specifically for male and female students.
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 self-start sm:self-auto ${
                (Number(editMaleSeats || 0) + Number(editFemaleSeats || 0) > Number(editTotalSeats || 0))
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                <span>
                  {Number(editMaleSeats || 0) + Number(editFemaleSeats || 0) > Number(editTotalSeats || 0) ? "⚠️ Quota Overallocated" : "✅ Slots Balanced"}
                </span>
                <span className="text-[11px] opacity-75 font-mono">
                  ({Number(editMaleSeats || 0)}M + {Number(editFemaleSeats || 0)}F = {Number(editMaleSeats || 0) + Number(editFemaleSeats || 0)} / {Number(editTotalSeats || 0)} Total)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Slots */}
              <div className="space-y-1.5 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    Total Slots *
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">Capacity</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  required
                  value={editTotalSeats}
                  onChange={(e) => setEditTotalSeats(e.target.value)}
                  placeholder="e.g. 50"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Maximum registrations allowed</p>
              </div>

              {/* Male Slots */}
              <div className="space-y-1.5 bg-sky-50/40 p-3.5 rounded-xl border border-sky-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚹</span> Male Slots *
                  </label>
                  <span className="text-[10px] text-sky-600 font-mono">Quota</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={editMaleSeats}
                  onChange={(e) => setEditMaleSeats(e.target.value)}
                  placeholder="e.g. 25"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Reserved quota for male participants</p>
              </div>

              {/* Female Slots */}
              <div className="space-y-1.5 bg-rose-50/40 p-3.5 rounded-xl border border-rose-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚺</span> Female Slots *
                  </label>
                  <span className="text-[10px] text-rose-600 font-mono">Quota</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={editFemaleSeats}
                  onChange={(e) => setEditFemaleSeats(e.target.value)}
                  placeholder="e.g. 25"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Reserved quota for female participants</p>
              </div>
            </div>

            {/* Helper status & Auto-balance */}
            {Number(editMaleSeats || 0) + Number(editFemaleSeats || 0) > Number(editTotalSeats || 0) ? (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Male and female reserved slots ({Number(editMaleSeats || 0) + Number(editFemaleSeats || 0)}) exceed total slots ({Number(editTotalSeats || 0)}). Please adjust the quotas to avoid overbooking.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50/50 p-2.5 rounded-xl border border-stone-200/50">
                <span>
                  {Number(editTotalSeats || 0) - (Number(editMaleSeats || 0) + Number(editFemaleSeats || 0)) > 0 ? (
                    <>🔓 <strong>{Number(editTotalSeats || 0) - (Number(editMaleSeats || 0) + Number(editFemaleSeats || 0))} unreserved slots</strong> available for either gender.</>
                  ) : (
                    <>🎯 100% of event capacity allocated across male and female quotas.</>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const total = Number(editTotalSeats) || 50;
                    const half = Math.floor(total / 2);
                    setEditMaleSeats(half);
                    setEditFemaleSeats(total - half);
                  }}
                  className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2 shrink-0 cursor-pointer"
                >
                  Split 50 / 50
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-dashed">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Global WhatsApp Group Joining Link</label>
              <Input
                type="url"
                value={editWhatsappLink}
                onChange={(e) => setEditWhatsappLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Global WhatsApp Group QR Code (Image)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrCodeChange(e, true)}
                  className="cursor-pointer"
                />
                {editQrCode && (
                  <a
                    href={getDocumentUrl(editQrCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-900 underline shrink-0"
                  >
                    View QR ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Option-Specific WhatsApp Settings */}
          {availableAssignedOptions.length > 0 && (
            <div className="pt-4 border-t border-dashed space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#6d432b] uppercase">Option/City Specific WhatsApp Settings</h4>
                <p className="text-xs text-muted-foreground">Define different WhatsApp joining links and QR codes for different cities. Registrations matching these choices will receive their specific WhatsApp Link/QR code upon approval (falls back to global settings if empty).</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableAssignedOptions.map((opt) => (
                  <div key={opt} className="bg-zinc-50/50 p-4 rounded-xl border border-border space-y-3">
                    <span className="text-xs font-black text-indigo-950 uppercase block border-b pb-1.5">📍 City / Option: {opt}</span>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">WhatsApp Link</label>
                      <Input
                        type="url"
                        value={editCityWhatsapp[opt]?.whatsappLink || ""}
                        onChange={(e) => setEditCityWhatsapp(prev => ({
                          ...prev,
                          [opt]: {
                            ...(prev[opt] || { qrCodeUrl: "" }),
                            whatsappLink: e.target.value,
                          }
                        }))}
                        placeholder={`e.g. WhatsApp Link for ${opt}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block">WhatsApp QR Code</label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCityQrCodeChange(e, opt, true)}
                          className="cursor-pointer text-xs"
                        />
                        {editCityWhatsapp[opt]?.qrCodeUrl && (
                          <a
                            href={getDocumentUrl(editCityWhatsapp[opt].qrCodeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-900 underline shrink-0"
                          >
                            View QR ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-dashed space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-muted-foreground uppercase block">Consent Form Templates</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTemplateRow(true)}
                  className="h-8 text-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add Consent Form
                </Button>
              </div>
              
              <div className="space-y-3">
                {editConsentTemplates.map((t) => (
                  <div key={t.id} className="bg-zinc-50/50 p-3 rounded-lg border flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Template Description / Name</span>
                        <Input
                          placeholder="e.g. Parental Consent Form"
                          value={t.name}
                          onChange={(e) => handleUpdateTemplateName(t.id, e.target.value, true)}
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Choose Template File</span>
                        {t.templateUrl ? (
                          <div className="flex items-center gap-3">
                            <a
                              href={getDocumentUrl(t.templateUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-indigo-900 hover:text-indigo-800 underline flex items-center gap-1"
                            >
                              📝 View Uploaded Template ↗
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-6 px-2 hover:bg-red-50 text-[10px] font-bold"
                              onClick={() => {
                                setEditConsentTemplates((prev) =>
                                  prev.map((item) => item.id === t.id ? { ...item, templateUrl: "" } : item)
                                );
                              }}
                            >
                              Change File
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleUploadTemplateFile(e, t.id, true)}
                            className="h-8 text-xs cursor-pointer"
                          />
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-750 self-start mt-4"
                      onClick={() => handleRemoveTemplateRow(t.id, true)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase">Description</label>
            <textarea
              rows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Enter trip highlights and itineraries..."
              className="w-full p-2.5 text-sm border rounded bg-background focus:outline-none"
            />
          </div>

          {/* Edit Coordinators Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted-foreground uppercase">Trip Coordinators</label>
              <Button type="button" size="sm" onClick={addEditCoordinator} className="bg-indigo-900 text-white hover:bg-indigo-800">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Coordinator
              </Button>
            </div>
            
            <div className="space-y-3">
              {editCoordinators.map((c) => (
                <div key={c.id} className="flex gap-3 items-center bg-background p-3 rounded-lg border shadow-sm">
                  <div className="flex-1">
                    <Input
                      placeholder="Name"
                      required
                      value={c.name}
                      onChange={(e) => updateEditCoordinator(c.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Email"
                      type="email"
                      required
                      value={c.email}
                      onChange={(e) => updateEditCoordinator(c.id, "email", e.target.value)}
                    />
                  </div>
                  <div className="w-56">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={c.assignedOption || ""}
                      onChange={(e) => updateEditCoordinator(c.id, "assignedOption", e.target.value)}
                    >
                      <option value="">All Cities / Options</option>
                      {availableAssignedOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editCoordinators.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeEditCoordinator(c.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-md text-[#6d432b] uppercase">Custom Registration Fields</h3>
              <Button type="button" size="sm" onClick={addEditField} className="bg-indigo-900 text-white hover:bg-indigo-800">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Question Field
              </Button>
            </div>
            <div className="space-y-3">
              {editFields.map((field, idx) => {
                const parentCandidates = editFields.filter(
                  (f) => f.id !== field.id && f.sortOrder < field.sortOrder && (f.type === "radio" || f.type === "select") && f.name
                );

                return (
                  <div key={field.id} className="bg-background p-3 rounded-lg border shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      
                      {/* Field Name */}
                      <div className="flex-1 w-full">
                        {field.type === "description_text" ? (
                          <textarea
                            placeholder="Enter description or section header text here..."
                            required
                            value={field.name}
                            onChange={(e) => updateEditField(field.id, "name", e.target.value)}
                            className="w-full p-2 text-sm border rounded bg-background min-h-[70px] resize-none focus:outline-none"
                          />
                        ) : (
                          <Input
                            placeholder="Question Name (e.g. Roll Number)"
                            required
                            value={field.name}
                            onChange={(e) => updateEditField(field.id, "name", e.target.value)}
                          />
                        )}
                      </div>

                      {/* Field Type selector */}
                      <div className="w-full sm:w-44">
                        <select
                          value={field.type}
                          onChange={(e) => updateEditField(field.id, "type", e.target.value)}
                          className="w-full p-2 text-sm border rounded bg-background"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Options Input (Only for radio/select types) */}
                      {(field.type === "radio" || field.type === "select") && (
                        <div className="w-full sm:w-60">
                          <Input
                            placeholder="Options (comma-separated)"
                            required
                            value={Array.isArray(field.options) ? field.options.join(", ") : ""}
                            onChange={(e) => updateEditField(field.id, "options", e.target.value.split(",").map((o: string) => o.trim()))}
                          />
                        </div>
                      )}

                      {/* Allow Edit Checkbox */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 px-2 py-1 rounded border">
                        <input
                          type="checkbox"
                          id={`edit-allow-prefilled-${field.id}`}
                          checked={field.allowEditIfPrefilled !== false}
                          onChange={(e) => updateEditField(field.id, "allowEditIfPrefilled", e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-indigo-900 rounded"
                        />
                        <label htmlFor={`edit-allow-prefilled-${field.id}`} className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                          Allow Edit
                        </label>
                      </div>

                      {/* Move & Delete buttons */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={idx === 0}
                          onClick={() => moveEditField(idx, "up")}
                          className="w-8 h-8"
                        >
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={idx === editFields.length - 1}
                          onClick={() => moveEditField(idx, "down")}
                          className="w-8 h-8"
                        >
                          <ArrowDownIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeEditField(field.id)}
                          className="w-8 h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>

                    {/* Conditional visibility configuration UI */}
                    {parentCandidates.length > 0 && (
                      <div className="ml-0 mt-2 space-y-2 border-t pt-2 pl-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`edit-cond-${field.id}`}
                            checked={!!field.dependsOnFieldId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const first = parentCandidates[0];
                                updateEditField(field.id, {
                                  dependsOnFieldId: first.id,
                                  dependsOnValue: first.options?.[0] || "",
                                });
                              } else {
                                updateEditField(field.id, {
                                  dependsOnFieldId: null,
                                  dependsOnValue: null,
                                });
                              }
                            }}
                            className="size-4 rounded border-gray-300 accent-primary cursor-pointer"
                          />
                          <label htmlFor={`edit-cond-${field.id}`} className="text-xs font-semibold cursor-pointer text-muted-foreground select-none">
                            Make this field conditional (show only if another field matches an option)
                          </label>
                        </div>

                        {field.dependsOnFieldId && (
                          <div className="flex flex-wrap items-center gap-2 pl-6 mt-1 text-xs text-muted-foreground">
                            <span>Show only when</span>
                            <select
                              value={field.dependsOnFieldId}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matched = parentCandidates.find(c => c.id === val);
                                updateEditField(field.id, "dependsOnFieldId", val);
                                updateEditField(field.id, "dependsOnValue", matched?.options?.[0] || "");
                              }}
                              className="p-1 border rounded bg-background text-xs"
                            >
                              {parentCandidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name || `Field (${c.type})`}
                                </option>
                              ))}
                            </select>

                            <span>equals</span>

                            <select
                              value={field.dependsOnValue || ""}
                              onChange={(e) => {
                                updateEditField(field.id, "dependsOnValue", e.target.value);
                              }}
                              className="p-1 border rounded bg-background text-xs"
                            >
                              {(parentCandidates.find(c => c.id === field.dependsOnFieldId)?.options || []).map((opt: any) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/95 px-8">
              {submitting ? "Saving..." : "Save Event Details & Form Fields"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("students")}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Create New Event Tab */}
      {activeTab === "create-event" && (
        <form onSubmit={handleCreateEvent} className="space-y-6 max-w-4xl bg-muted/20 p-6 rounded-xl border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Event Name *</label>
              <Input
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Himachal Trek 2026"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Event Fee (₹)</label>
              <Input
                type="number"
                min={0}
                value={createFee}
                onChange={(e) => setCreateFee(e.target.value)}
                placeholder="e.g. 500"
              />
            </div>
            <div className="flex items-center gap-2 pt-2 sm:col-span-2">
              <input
                id="createEmailsDisabled"
                type="checkbox"
                checked={createEmailsDisabled}
                onChange={(e) => setCreateEmailsDisabled(e.target.checked)}
                className="rounded border-zinc-300 text-indigo-900 focus:ring-indigo-900 cursor-pointer h-4 w-4"
              />
              <label htmlFor="createEmailsDisabled" className="text-sm font-bold text-zinc-700 cursor-pointer select-none">
                ⛔ Disable Email Notifications (Do not send any automated emails for approvals or re-uploads)
              </label>
            </div>
          </div>

          {/* Event Capacity & Gender Slots Allocation Card */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#3B001B] uppercase tracking-wide flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-[#8B263E]" /> Event Capacity & Gender Slots Allocation
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Set total allowed participants and reserve slots specifically for male and female students.
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 self-start sm:self-auto ${
                (Number(createMaleSeats || 0) + Number(createFemaleSeats || 0) > Number(createTotalSeats || 0))
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                <span>
                  {Number(createMaleSeats || 0) + Number(createFemaleSeats || 0) > Number(createTotalSeats || 0) ? "⚠️ Quota Overallocated" : "✅ Slots Balanced"}
                </span>
                <span className="text-[11px] opacity-75 font-mono">
                  ({Number(createMaleSeats || 0)}M + {Number(createFemaleSeats || 0)}F = {Number(createMaleSeats || 0) + Number(createFemaleSeats || 0)} / {Number(createTotalSeats || 0)} Total)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Slots */}
              <div className="space-y-1.5 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    Total Slots *
                  </label>
                  <span className="text-[10px] text-stone-400 font-mono">Capacity</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  required
                  value={createTotalSeats}
                  onChange={(e) => setCreateTotalSeats(e.target.value)}
                  placeholder="e.g. 50"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Maximum registrations allowed</p>
              </div>

              {/* Male Slots */}
              <div className="space-y-1.5 bg-sky-50/40 p-3.5 rounded-xl border border-sky-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚹</span> Male Slots *
                  </label>
                  <span className="text-[10px] text-sky-600 font-mono">Quota</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={createMaleSeats}
                  onChange={(e) => setCreateMaleSeats(e.target.value)}
                  placeholder="e.g. 25"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Reserved quota for male participants</p>
              </div>

              {/* Female Slots */}
              <div className="space-y-1.5 bg-rose-50/40 p-3.5 rounded-xl border border-rose-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚺</span> Female Slots *
                  </label>
                  <span className="text-[10px] text-rose-600 font-mono">Quota</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  value={createFemaleSeats}
                  onChange={(e) => setCreateFemaleSeats(e.target.value)}
                  placeholder="e.g. 25"
                  className="bg-white font-semibold text-stone-800"
                />
                <p className="text-[10px] text-stone-500">Reserved quota for female participants</p>
              </div>
            </div>

            {/* Helper status & Auto-balance */}
            {Number(createMaleSeats || 0) + Number(createFemaleSeats || 0) > Number(createTotalSeats || 0) ? (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
                <AlertTriangleIcon className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Male and female reserved slots ({Number(createMaleSeats || 0) + Number(createFemaleSeats || 0)}) exceed total slots ({Number(createTotalSeats || 0)}). Please adjust the quotas to avoid overbooking.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-50/50 p-2.5 rounded-xl border border-stone-200/50">
                <span>
                  {Number(createTotalSeats || 0) - (Number(createMaleSeats || 0) + Number(createFemaleSeats || 0)) > 0 ? (
                    <>🔓 <strong>{Number(createTotalSeats || 0) - (Number(createMaleSeats || 0) + Number(createFemaleSeats || 0))} unreserved slots</strong> available for either gender.</>
                  ) : (
                    <>🎯 100% of event capacity allocated across male and female quotas.</>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const total = Number(createTotalSeats) || 50;
                    const half = Math.floor(total / 2);
                    setCreateMaleSeats(half);
                    setCreateFemaleSeats(total - half);
                  }}
                  className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 underline ml-2 shrink-0 cursor-pointer"
                >
                  Split 50 / 50
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-dashed">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Global WhatsApp Group Joining Link</label>
              <Input
                type="url"
                value={createWhatsappLink}
                onChange={(e) => setCreateWhatsappLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase">Global WhatsApp Group QR Code (Image)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleQrCodeChange(e, false)}
                  className="cursor-pointer"
                />
                {createQrCode && (
                  <a
                    href={getDocumentUrl(createQrCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-indigo-900 underline shrink-0"
                  >
                    View QR ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Option-Specific WhatsApp Settings */}
          {createAvailableAssignedOptions.length > 0 && (
            <div className="pt-4 border-t border-dashed space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#6d432b] uppercase">Option/City Specific WhatsApp Settings</h4>
                <p className="text-xs text-muted-foreground">Define different WhatsApp joining links and QR codes for different cities. Registrations matching these choices will receive their specific WhatsApp Link/QR code upon approval (falls back to global settings if empty).</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {createAvailableAssignedOptions.map((opt) => (
                  <div key={opt} className="bg-zinc-50/50 p-4 rounded-xl border border-border space-y-3">
                    <span className="text-xs font-black text-indigo-950 uppercase block border-b pb-1.5">📍 City / Option: {opt}</span>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">WhatsApp Link</label>
                      <Input
                        type="url"
                        value={createCityWhatsapp[opt]?.whatsappLink || ""}
                        onChange={(e) => setCreateCityWhatsapp(prev => ({
                          ...prev,
                          [opt]: {
                            ...(prev[opt] || { qrCodeUrl: "" }),
                            whatsappLink: e.target.value,
                          }
                        }))}
                        placeholder={`e.g. WhatsApp Link for ${opt}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase block">WhatsApp QR Code</label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCityQrCodeChange(e, opt, false)}
                          className="cursor-pointer text-xs"
                        />
                        {createCityWhatsapp[opt]?.qrCodeUrl && (
                          <a
                            href={getDocumentUrl(createCityWhatsapp[opt].qrCodeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-indigo-900 underline shrink-0"
                          >
                            View QR ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-dashed space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-muted-foreground uppercase block">Consent Form Templates</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTemplateRow(false)}
                  className="h-8 text-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5 mr-1" /> Add Consent Form
                </Button>
              </div>
              
              <div className="space-y-3">
                {createConsentTemplates.map((t) => (
                  <div key={t.id} className="bg-zinc-50/50 p-3 rounded-lg border flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Template Description / Name</span>
                        <Input
                          placeholder="e.g. Parental Consent Form"
                          value={t.name}
                          onChange={(e) => handleUpdateTemplateName(t.id, e.target.value, false)}
                          className="h-8 text-xs"
                        />
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Choose Template File</span>
                        {t.templateUrl ? (
                          <div className="flex items-center gap-3">
                            <a
                              href={getDocumentUrl(t.templateUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-indigo-900 hover:text-indigo-800 underline flex items-center gap-1"
                            >
                              📝 View Uploaded Template ↗
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 h-6 px-2 hover:bg-red-50 text-[10px] font-bold"
                              onClick={() => {
                                setCreateConsentTemplates((prev) =>
                                  prev.map((item) => item.id === t.id ? { ...item, templateUrl: "" } : item)
                                );
                              }}
                            >
                              Change File
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleUploadTemplateFile(e, t.id, false)}
                            className="h-8 text-xs cursor-pointer"
                          />
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-750 self-start mt-4"
                      onClick={() => handleRemoveTemplateRow(t.id, false)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase">Description</label>
            <textarea
              rows={3}
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="Enter trip highlights, itinerary plans..."
              className="w-full p-2.5 text-sm border rounded bg-background focus:outline-none"
            />
          </div>

          {/* Create Coordinators Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-muted-foreground uppercase">Trip Coordinators</label>
              <Button type="button" size="sm" onClick={addCreateCoordinator} className="bg-indigo-900 text-white hover:bg-indigo-800">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Coordinator
              </Button>
            </div>
            
            <div className="space-y-3">
              {createCoordinators.map((c) => (
                <div key={c.id} className="flex gap-3 items-center bg-background p-3 rounded-lg border shadow-sm">
                  <div className="flex-1">
                    <Input
                      placeholder="Name"
                      required
                      value={c.name}
                      onChange={(e) => updateCreateCoordinator(c.id, "name", e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Email"
                      type="email"
                      required
                      value={c.email}
                      onChange={(e) => updateCreateCoordinator(c.id, "email", e.target.value)}
                    />
                  </div>
                  <div className="w-56">
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={c.assignedOption || ""}
                      onChange={(e) => updateCreateCoordinator(c.id, "assignedOption", e.target.value)}
                    >
                      <option value="">All Cities / Options</option>
                      {createAvailableAssignedOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  {createCoordinators.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCreateCoordinator(c.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Fields Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-md text-[#6d432b] uppercase">Custom Registration Fields</h3>
              <Button type="button" size="sm" onClick={addCreateField} className="bg-indigo-900 text-white hover:bg-indigo-800">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Question Field
              </Button>
            </div>

            <div className="space-y-3">
              {createFields.map((field, idx) => {
                const parentCandidates = createFields.filter(
                  (f) => f.id !== field.id && f.sortOrder < field.sortOrder && (f.type === "radio" || f.type === "select") && f.name
                );

                return (
                  <div key={field.id} className="bg-background p-3 rounded-lg border shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      
                      {/* Field Name */}
                      <div className="flex-1 w-full">
                        {field.type === "description_text" ? (
                          <textarea
                            placeholder="Enter description or section header text here..."
                            required
                            value={field.name}
                            onChange={(e) => updateCreateField(field.id, "name", e.target.value)}
                            className="w-full p-2 text-sm border rounded bg-background min-h-[70px] resize-none focus:outline-none"
                          />
                        ) : (
                          <Input
                            placeholder="Question Name (e.g. Roll Number)"
                            required
                            value={field.name}
                            onChange={(e) => updateCreateField(field.id, "name", e.target.value)}
                          />
                        )}
                      </div>

                      {/* Field Type selector */}
                      <div className="w-full sm:w-44">
                        <select
                          value={field.type}
                          onChange={(e) => updateCreateField(field.id, "type", e.target.value)}
                          className="w-full p-2 text-sm border rounded bg-background"
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Options Input (Only for radio/select types) */}
                      {(field.type === "radio" || field.type === "select") && (
                        <div className="w-full sm:w-60">
                          <Input
                            placeholder="Options (comma-separated)"
                            required
                            value={Array.isArray(field.options) ? field.options.join(", ") : ""}
                            onChange={(e) => updateCreateField(field.id, "options", e.target.value.split(",").map((o: string) => o.trim()))}
                          />
                        </div>
                      )}

                      {/* Allow Edit Checkbox */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 px-2 py-1 rounded border">
                        <input
                          type="checkbox"
                          id={`create-allow-prefilled-${field.id}`}
                          checked={field.allowEditIfPrefilled !== false}
                          onChange={(e) => updateCreateField(field.id, "allowEditIfPrefilled", e.target.checked)}
                          className="w-4 h-4 cursor-pointer accent-indigo-900 rounded"
                        />
                        <label htmlFor={`create-allow-prefilled-${field.id}`} className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                          Allow Edit
                        </label>
                      </div>

                      {/* Move & Delete buttons */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={idx === 0}
                          onClick={() => moveCreateField(idx, "up")}
                          className="w-8 h-8"
                        >
                          <ArrowUpIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          disabled={idx === createFields.length - 1}
                          onClick={() => moveCreateField(idx, "down")}
                          className="w-8 h-8"
                        >
                          <ArrowDownIcon className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCreateField(field.id)}
                          className="w-8 h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>

                    {/* Conditional visibility configuration UI */}
                    {parentCandidates.length > 0 && (
                      <div className="ml-0 mt-2 space-y-2 border-t pt-2 pl-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`create-cond-${field.id}`}
                            checked={!!field.dependsOnFieldId}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const first = parentCandidates[0];
                                updateCreateField(field.id, {
                                  dependsOnFieldId: first.id,
                                  dependsOnValue: first.options?.[0] || "",
                                });
                              } else {
                                updateCreateField(field.id, {
                                  dependsOnFieldId: null,
                                  dependsOnValue: null,
                                });
                              }
                            }}
                            className="size-4 rounded border-gray-300 accent-primary cursor-pointer"
                          />
                          <label htmlFor={`create-cond-${field.id}`} className="text-xs font-semibold cursor-pointer text-muted-foreground select-none">
                            Make this field conditional (show only if another field matches an option)
                          </label>
                        </div>

                        {field.dependsOnFieldId && (
                          <div className="flex flex-wrap items-center gap-2 pl-6 mt-1 text-xs text-muted-foreground">
                            <span>Show only when</span>
                            <select
                              value={field.dependsOnFieldId}
                              onChange={(e) => {
                                const val = e.target.value;
                                const matched = parentCandidates.find(c => c.id === val);
                                updateCreateField(field.id, "dependsOnFieldId", val);
                                updateCreateField(field.id, "dependsOnValue", matched?.options?.[0] || "");
                              }}
                              className="p-1 border rounded bg-background text-xs"
                            >
                              {parentCandidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name || `Field (${c.type})`}
                                </option>
                              ))}
                            </select>

                            <span>equals</span>

                            <select
                              value={field.dependsOnValue || ""}
                              onChange={(e) => {
                                updateCreateField(field.id, "dependsOnValue", e.target.value);
                              }}
                              className="p-1 border rounded bg-background text-xs"
                            >
                              {(parentCandidates.find(c => c.id === field.dependsOnFieldId)?.options || []).map((opt: any) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/95 px-8">
              {submitting ? "Creating..." : "Create & Initialize Event"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setActiveTab("students")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {activeConcernEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-lenis-prevent>
          <div className="bg-white border-2 border-black rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-black">
            <button
              onClick={() => setActiveConcernEmail(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-black font-black"
            >
              ✕
            </button>
            <h3 className="font-bold text-lg text-red-700 flex items-center gap-1.5 uppercase">
              <ShieldAlertIcon className="w-5 h-5" /> Coordinator Flags
            </h3>
            <p className="text-xs text-gray-500 font-bold border-b pb-2">Student: {activeConcernEmail}</p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1" data-lenis-prevent>
              {concerns
                .filter((c) => c.studentEmail.toLowerCase() === activeConcernEmail.toLowerCase())
                .map((c) => (
                  <div key={c.id} className="bg-red-50 p-3 rounded border border-red-200 text-xs flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-red-900 mb-1">{c.concernText}</p>
                      <p className="text-[10px] text-gray-400">Flagged by: {c.coordinatorEmail}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteConcern(c.id)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0 shrink-0"
                      title="Delete concern flag"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveConcernEmail(null)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Detailed Admin Review Modal */}
      {activeProfileReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-lenis-prevent>
          <div className="bg-white border border-stone-200/90 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative text-stone-900 text-left max-h-[92vh] flex flex-col">
            <button
              onClick={() => setActiveProfileReg(null)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 p-1 rounded-full hover:bg-stone-100 z-10 transition-colors"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-stone-100 pb-3 shrink-0 space-y-1">
              <div className="flex items-center justify-between pr-8 flex-wrap gap-2">
                <h3 className="font-bold text-xl text-stone-900 flex items-center gap-2">
                  <span>👤</span> {getStudentName(activeProfileReg)}
                </h3>
                <span className={`font-semibold px-2.5 py-0.5 rounded-full border text-[11px] tracking-wide ${
                  activeProfileReg.status === "mail_sent" || activeProfileReg.status === "approved_to_pay" || activeProfileReg.status === "paid"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : activeProfileReg.status === "action_required"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : activeProfileReg.status === "rejected"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}>
                  {activeProfileReg.status === "mail_sent"
                    ? "Approved (Mail Sent)"
                    : activeProfileReg.status === "approved_to_pay"
                    ? "Approved to Pay"
                    : activeProfileReg.status === "paid"
                    ? "Confirmed / Paid"
                    : activeProfileReg.status === "action_required"
                    ? "Re-upload Requested"
                    : activeProfileReg.status === "rejected"
                    ? "Rejected"
                    : "Registered"}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Review applicant profile, verify credentials and consent forms, and approve registration.
              </p>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm" data-lenis-prevent>
              
              {/* Approval Email Delivery Status Banner */}
              {activeProfileReg.approvalEmailStatus === "failed" && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-900">
                  <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-800">Approval email delivery failed</p>
                    <p className="text-rose-700 mt-0.5">
                      {activeProfileReg.approvalEmailError || "The email provider encountered an error while attempting delivery."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleResendApprovalEmail(activeProfileReg)}
                    className="h-7 text-xs bg-white border-rose-300 text-rose-800 hover:bg-rose-50 font-bold shrink-0"
                  >
                    Retry Sending
                  </Button>
                </div>
              )}
              {(activeProfileReg.approvalEmailStatus === "sent" || activeProfileReg.status === "mail_sent") && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <CheckCircle2Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Confirmation email successfully sent to <strong>{activeProfileReg.email}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => handleResendApprovalEmail(activeProfileReg)}
                    className="h-6 text-[11px] text-emerald-800 hover:bg-emerald-100/60 font-semibold"
                  >
                    Resend
                  </Button>
                </div>
              )}

              {/* Profile Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
                <div className="min-w-0">
                  <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">Student ID / Roll No</span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-stone-900 truncate">
                      {getStudentId(activeProfileReg)}
                    </span>
                    {getStudentIdDocUrl(activeProfileReg) && (
                      <a
                        href={getDocumentUrl(getStudentIdDocUrl(activeProfileReg)!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/15 transition-all shadow-2xs shrink-0"
                        title="View Student ID Document"
                      >
                        <span>View ID</span>
                        <ExternalLinkIcon className="size-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">Email Address</span>
                  <span className="font-semibold text-xs text-stone-900 break-all select-all block mt-0.5" title={activeProfileReg.email}>
                    {activeProfileReg.email}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">Gender</span>
                  <span className="font-semibold text-xs text-stone-900 capitalize block mt-0.5">
                    {activeProfileReg.gender || "—"}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">Submitted At</span>
                  <span className="font-semibold text-xs text-stone-900 block mt-0.5">
                    {activeProfileReg.submittedAt ? new Date(activeProfileReg.submittedAt).toLocaleDateString("en-IN") : "—"}
                  </span>
                </div>
              </div>

              {/* Student Residential Location */}
              {(() => {
                const regState = activeProfileReg.formData?.["State"] || activeProfileReg.formData?.["state"];
                const regDistrict = activeProfileReg.formData?.["City / District"] || activeProfileReg.formData?.["cityDistrict"] || activeProfileReg.formData?.["district"];
                return (
                  <div className="grid grid-cols-2 gap-3 bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80">
                    <div className="min-w-0">
                      <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">State</span>
                      <span className="font-semibold text-xs text-stone-900 block mt-0.5">
                        {regState || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[10px] text-stone-500 uppercase tracking-wider block">City / District</span>
                      <span className="font-semibold text-xs text-stone-900 block mt-0.5">
                        {regDistrict || "—"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Trip Context Box */}
              {selectedTrip && (
                <div className="bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/80 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block">{selectedTrip.name}</span>
                    <span className="text-[10px] text-stone-500">Destination & Event</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-900 block">{selectedTrip.fee ? `₹${selectedTrip.fee}` : "Free"}</span>
                    <span className="text-[10px] text-stone-500">Trip Fee</span>
                  </div>
                </div>
              )}

              {/* Checkpoints Section */}
              <div className="space-y-3 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2Icon className="w-4 h-4 text-amber-800" /> Verification Checkpoints
                </h4>

                {/* 1. Student ID Checkpoint */}
                {(() => {
                  const idCopy = activeProfileReg.formData?.["Student ID Card Copy"];
                  const isVerified = Boolean(activeProfileReg.studentIdVerified);

                  return (
                    <div className="bg-white p-3 rounded-xl border border-stone-200 text-xs flex justify-between items-center flex-wrap gap-2 shadow-2xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">🪪 Student ID Document</span>
                          <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] ${
                            isVerified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {isVerified ? "Verified ✅" : "Unverified ❌"}
                          </span>
                        </div>
                        {idCopy ? (
                          <a
                            href={getDocumentUrl(idCopy)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/15 hover:border-[#3B001B] transition-all shadow-2xs mt-1.5"
                          >
                            <span>View Student ID</span>
                            <ExternalLinkIcon className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic block mt-1">No document uploaded</span>
                        )}
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleToggleStudentIdVerification(activeProfileReg.id, !isVerified)}
                          className={`text-xs h-7 px-3 font-semibold rounded-lg transition-all border ${
                            isVerified
                              ? "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs"
                          }`}
                        >
                          {isVerified ? "Revoke ID Verification" : "Verify Student ID"}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Consent Forms Checkpoints */}
                {(() => {
                  const templates = selectedTrip?.consentTemplates && selectedTrip.consentTemplates.length > 0
                    ? selectedTrip.consentTemplates
                    : (selectedTrip?.consentFormTemplateUrl ? [{ id: "legacy-consent", name: "Completed Consent Form", templateUrl: selectedTrip.consentFormTemplateUrl }] : []);

                  if (templates.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-stone-700 block">Required Consent Documents:</span>
                      {templates.map((t) => {
                        const fileKey = t.id === "legacy-consent" ? "Completed Consent Form" : `Completed Consent - ${t.name}`;
                        const uploadedUrl = activeProfileReg.formData?.[fileKey];
                        const isVerified = t.id === "legacy-consent" 
                          ? Boolean(activeProfileReg.consentFormVerified)
                          : Boolean(activeProfileReg.verifiedConsentForms?.[t.id]);

                        return (
                          <div key={t.id} className="bg-white p-3 rounded-xl border border-stone-200 text-xs flex justify-between items-center flex-wrap gap-2 shadow-2xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-900">📝 {t.name}</span>
                                <span className={`font-semibold px-2 py-0.5 rounded-md border text-[10px] ${
                                  isVerified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}>
                                  {isVerified ? "Verified ✅" : "Unverified ❌"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                                {t.templateUrl && (
                                  <a href={getDocumentUrl(t.templateUrl)} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-800 underline">
                                    Blank Template ↗
                                  </a>
                                )}
                                {uploadedUrl ? (
                                  <a
                                    href={getDocumentUrl(uploadedUrl)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/15 hover:border-[#3B001B] transition-all shadow-2xs"
                                  >
                                    <span>View Signed Copy</span>
                                    <ExternalLinkIcon className="size-3" />
                                  </a>
                                ) : (
                                  <span className="text-rose-500 italic">Signed copy missing</span>
                                )}
                              </div>
                            </div>

                            <div>
                              <button
                                type="button"
                                onClick={() => handleToggleConsentVerification(activeProfileReg.id, t.id, !isVerified)}
                                className={`text-xs h-7 px-3 font-semibold rounded-lg transition-all border ${
                                  isVerified
                                    ? "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs"
                                }`}
                              >
                                {isVerified ? "Revoke Form" : "Verify Form"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Checkpoint Status Banner */}
                {(() => {
                  const approvable = isApprovable(activeProfileReg);

                  if (approvable) {
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                        <CheckCircle2Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>All verification checkpoints passed. Registration is ready for approval.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-semibold flex items-center gap-2">
                      <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Registration cannot be approved until Student ID and all required Consent Forms are verified.</span>
                    </div>
                  );
                })()}
              </div>

              {/* Form Answers */}
              {(() => {
                const filteredResponses = Object.entries(activeProfileReg.formData || {}).filter(
                  ([k]) =>
                    k !== "Student ID Number" &&
                    k !== "Student ID Card Copy" &&
                    k !== "Completed Consent Form" &&
                    !k.startsWith("Completed Consent -") &&
                    k !== "Custom Reply" &&
                    k !== "User Reply"
                );

                return (
                  <div className="space-y-2">
                    <span className="font-bold text-xs text-stone-700 uppercase tracking-wider block">
                      Registration Form Responses
                    </span>
                    {filteredResponses.length === 0 ? (
                      <div className="bg-stone-50/70 p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-400 font-medium">
                        No additional custom question responses recorded for this registration.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                        {filteredResponses.map(([key, val]) => (
                          <div key={key} className="border-b border-stone-200/60 pb-2 last:border-0 last:pb-0 text-xs">
                            <span className="font-bold text-stone-500 block text-[10px] uppercase tracking-wider">{key}</span>
                            {typeof val === "string" && isUrlOrDriveLink(val) ? (
                              <a
                                href={
                                  val.includes("res.cloudinary.com")
                                    ? `/api/downloadProxy/custom_file?url=${encodeURIComponent(val)}`
                                    : val.startsWith("http://") || val.startsWith("https://")
                                    ? val
                                    : `https://${val}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/15 hover:border-[#3B001B] transition-all shadow-2xs mt-1"
                              >
                                <span>View Document</span>
                                <ExternalLinkIcon className="size-3" />
                              </a>
                            ) : (
                              <span className="font-semibold text-stone-900 block mt-0.5">{String(val || "—")}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Conversation & Audit History */}
              {activeProfileReg.conversationHistory && activeProfileReg.conversationHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <span className="font-bold text-xs text-stone-700 uppercase tracking-wider block">
                    Audit & Conversation History ({activeProfileReg.conversationHistory.length} events)
                  </span>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {activeProfileReg.conversationHistory.map((entry, idx) => {
                      const type = entry.type || "admin_request";
                      const isApproved = type === "approved";
                      const isRejected = type === "rejected";
                      const isReupload = type === "reupload_requested" || type === "admin_request";
                      const isRevoked = type === "approval_revoked";
                      const isVerified = type === "checkpoint_verified";
                      const isReply = type === "student_reply";

                      const badgeClass = isApproved
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : isRejected
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : isReupload
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : isRevoked
                        ? "bg-orange-50 text-orange-800 border-orange-200"
                        : isVerified
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-blue-50 text-blue-800 border-blue-200";

                      const badgeLabel = isApproved
                        ? "Approved"
                        : isRejected
                        ? "Rejected"
                        : isReupload
                        ? "Correction Requested"
                        : isRevoked
                        ? "Approval Revoked"
                        : isVerified
                        ? "Checkpoint Update"
                        : "Student Reply";

                      return (
                        <div key={idx} className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className={`font-semibold px-2 py-0.5 rounded border text-[9px] uppercase ${badgeClass}`}>
                              {badgeLabel}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-stone-500">
                              {entry.actor && <span className="font-semibold">By: {entry.actor}</span>}
                              {entry.timestamp && (
                                <span>{new Date(entry.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                              )}
                            </div>
                          </div>
                          {(entry.message || entry.reason) && (
                            <p className="text-stone-800 font-medium leading-relaxed mt-1">
                              {entry.message || entry.reason}
                            </p>
                          )}
                          {entry.fields && entry.fields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {entry.fields.map((f: string) => (
                                <span key={f} className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-semibold">
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
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-stone-100 shrink-0 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {activeProfileReg.status === "registered" && !selectedTrip?.isCompleted && (
                  <>
                    <button
                      type="button"
                      disabled={!isApprovable(activeProfileReg) || submitting}
                      onClick={() => setApproveConfirmReg(activeProfileReg)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl h-9 px-4 shadow-2xs disabled:bg-stone-100 disabled:text-stone-400 disabled:border-stone-200 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 border border-emerald-600"
                    >
                      <CheckCircle2Icon className="w-3.5 h-3.5" />
                      <span>Approve Registration</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReuploadRegId(activeProfileReg.id);
                        setReuploadIssueText("");
                        setReuploadFields([]);
                      }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl h-9 px-4 transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileWarning className="w-3.5 h-3.5 text-amber-700" />
                      <span>Request Re-Upload</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRejectConfirmReg(activeProfileReg);
                        setRejectReason("");
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-semibold rounded-xl h-9 px-4 transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <XCircleIcon className="w-3.5 h-3.5 text-rose-700" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {(activeProfileReg.status === "approved_to_pay" || activeProfileReg.status === "mail_sent" || activeProfileReg.status === "paid") && !selectedTrip?.isCompleted && (
                  <>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleResendApprovalEmail(activeProfileReg)}
                      className="bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold rounded-xl h-9 px-4 transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    >
                      <MailIcon className="w-3.5 h-3.5 text-stone-600" />
                      <span>Resend Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRevokeConfirmReg(activeProfileReg);
                        setRevokeReason("");
                      }}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold rounded-xl h-9 px-4 transition-all flex items-center gap-1.5 shadow-2xs"
                    >
                      <RotateCcwIcon className="w-3.5 h-3.5 text-amber-700" />
                      <span>Revoke Approval</span>
                    </button>
                  </>
                )}
              </div>

              <button 
                type="button"
                onClick={() => setActiveProfileReg(null)} 
                className="text-xs h-9 px-4 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 font-semibold transition-all shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Approve Confirmation Dialog */}
      {approveConfirmReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-lenis-prevent>
          <div className="bg-white border-2 border-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2Icon className="w-6 h-6" />
              <h3 className="font-bold text-lg text-zinc-900">Approve this student's registration?</h3>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              Are you sure you want to approve registration for <strong>{getStudentName(approveConfirmReg)}</strong> ({approveConfirmReg.email})?
            </p>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 space-y-1">
              <p className="font-bold">✉️ What happens upon approval:</p>
              <ul className="list-disc list-inside space-y-0.5 text-emerald-800">
                <li>Confirmation email will be dispatched to their canonical IITM email.</li>
                <li>Includes official trip WhatsApp joining link and coordinator contacts.</li>
                <li>Confirms trip seat and updates confirmed seat counter.</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setApproveConfirmReg(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={submitting}
                onClick={() => handleApproveRegistration(approveConfirmReg)}
              >
                {submitting ? "Approving..." : "Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Reject Confirmation Dialog */}
      {rejectConfirmReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-lenis-prevent>
          <div className="bg-white border-2 border-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircleIcon className="w-6 h-6" />
              <h3 className="font-bold text-lg text-zinc-900">Reject Registration</h3>
            </div>
            <p className="text-sm text-zinc-600">
              Rejecting registration for <strong>{getStudentName(rejectConfirmReg)}</strong> ({rejectConfirmReg.email}).
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Rejection Reason <span className="text-red-500">* (Mandatory)</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this registration is rejected..."
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-red-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setRejectConfirmReg(null); setRejectReason(""); }} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
                disabled={submitting || !rejectReason.trim()}
                onClick={handleRejectRegistration}
              >
                {submitting ? "Rejecting..." : "Reject Registration"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Revoke Approval Confirmation Dialog */}
      {revokeConfirmReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" data-lenis-prevent>
          <div className="bg-white border-2 border-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangleIcon className="w-6 h-6" />
              <h3 className="font-bold text-lg text-zinc-900">Revoke Registration Approval</h3>
            </div>
            <p className="text-sm text-zinc-600">
              Are you sure you want to revoke approval for <strong>{getStudentName(revokeConfirmReg)}</strong> ({revokeConfirmReg.email})?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold">⚠️ Revocation Actions:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>Registration returns to <strong>Pending Review</strong> status.</li>
                <li>WhatsApp community link and coordinator contacts are deactivated on student portal.</li>
                <li>Confirmed seat counter is decremented and seat is released.</li>
                <li>Student is excluded from coordinator attendee roster.</li>
              </ul>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Revocation Reason <span className="text-red-500">* (Mandatory)</span>
              </label>
              <textarea
                required
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="State why approval is being revoked..."
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setRevokeConfirmReg(null); setRevokeReason(""); }} disabled={submitting}>
                Cancel
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={submitting || !revokeReason.trim()}
                onClick={handleRevokeApproval}
              >
                {submitting ? "Revoking..." : "Revoke Approval"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 4: Request Re-Upload / Correction Modal */}
      {reuploadRegId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 flex items-center justify-center backdrop-blur-sm" data-lenis-prevent>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => { setReuploadRegId(null); setReuploadIssueText(""); setReuploadFields([]); }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <h3 className="font-oswald font-bold text-xl text-[#3E1126] uppercase">Request Re-Upload / Correction</h3>
            <p className="text-sm text-zinc-600">
              Select which fields or documents need correction, and provide a mandatory explanation for the student.
            </p>

            {/* Checkboxes for fields */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Select Fields / Documents Needing Correction <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2 border-2 border-zinc-100 rounded-xl p-3 max-h-48 overflow-y-auto bg-zinc-50">
                {[
                  "Student ID Card Copy",
                  ...(selectedTrip?.consentTemplates && selectedTrip.consentTemplates.length > 0
                    ? selectedTrip.consentTemplates.map(t => `Completed Consent - ${t.name}`)
                    : (selectedTrip?.consentFormTemplateUrl ? ["Completed Consent Form"] : [])),
                  ...(selectedTrip?.form?.fields?.map(f => f.name) || []),
                ].map(fieldName => (
                  <label key={fieldName} className="flex items-center gap-2 text-sm font-semibold text-zinc-700 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="rounded text-[#3E1126] focus:ring-[#3E1126]"
                      checked={reuploadFields.includes(fieldName)}
                      onChange={(e) => {
                        if (e.target.checked) setReuploadFields([...reuploadFields, fieldName]);
                        else setReuploadFields(reuploadFields.filter(f => f !== fieldName));
                      }}
                    />
                    {fieldName}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Correction Reason / Instructions <span className="text-red-500">* (Mandatory)</span>
              </label>
              <textarea
                className="w-full border-2 border-zinc-200 rounded-xl p-3 text-sm focus:border-[#3E1126]/40 focus:outline-none min-h-[100px] resize-none"
                placeholder="Describe what needs to be fixed or re-uploaded (mandatory)..."
                value={reuploadIssueText}
                onChange={(e) => setReuploadIssueText(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => { setReuploadRegId(null); setReuploadIssueText(""); setReuploadFields([]); }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                disabled={submitting || !reuploadIssueText.trim() || reuploadFields.length === 0}
                onClick={handleSendReuploadRequest}
              >
                {submitting ? "Sending..." : "Submit Request"}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
