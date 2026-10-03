"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  ShieldCheck,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Home,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
} from "lucide-react";
import LocationSelect from "@/components/ui/LocationSelect";
import {
  INDIAN_STATES_AND_UTS,
  getDistrictsForState,
} from "@/lib/indiaLocations";

interface StudentProfile {
  uid: string;
  email: string;
  name: string;
  studentId: string;
  gender: string;
  studentIdVerified: boolean;
  phone?: string;
  whatsapp?: string;
  dob?: string;
  residence?: string;
  state?: string;
  cityDistrict?: string;
  studentIdUrl?: string | null;
}

export default function StudentProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Profile Form States
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [residence, setResidence] = useState("");
  const [stateLoc, setStateLoc] = useState("");
  const [cityDistrict, setCityDistrict] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/student/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.student) {
            const s = data.student;
            setProfile(s);
            setName(s.name || user.displayName || "");
            setStudentId(s.studentId || "");
            const g = (s.gender || "unknown").toLowerCase().trim();
            if (g.startsWith("f")) setGender("female");
            else if (g.startsWith("m")) setGender("male");
            else if (g.startsWith("o") || g === "non-binary") setGender("other");
            else setGender("unknown");

            setDob(s.dob || "");
            setPhone(s.phone || "");
            setWhatsapp(s.whatsapp || s.phone || "");
            setResidence(s.residence || "");
            setStateLoc(s.state || "");
            setCityDistrict(s.cityDistrict || "");
          }
        } else {
          const err = await res.json();
          setErrorMessage(err.error || "Failed to load student profile");
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setErrorMessage(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setFieldErrors({});

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, "");
    if (phone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setFieldErrors((prev) => ({
        ...prev,
        phone: "Please enter a valid 10-digit Indian mobile number",
      }));
      setSaving(false);
      return;
    }

    // Validate state & district
    if (stateLoc && !cityDistrict) {
      setFieldErrors((prev) => ({
        ...prev,
        cityDistrict: "Please select your city / district",
      }));
      setSaving(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const payload: Record<string, any> = {
        name: name.trim(),
        gender,
        dob: dob.trim(),
        phone: cleanPhone || phone.trim(),
        whatsapp: whatsapp.replace(/\D/g, "") || whatsapp.trim(),
        residence: residence.trim(),
        state: stateLoc.trim(),
        cityDistrict: cityDistrict.trim(),
      };

      // Only allow sending studentId if unverified
      if (!profile?.studentIdVerified) {
        payload.studentId = studentId.trim();
      }

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("✓ Profile updated successfully! Future trip registrations will autofill your latest details.");
        if (data.student) {
          setProfile(data.student);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMessage(data.error || "Failed to update profile. Please try again.");
      }
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setErrorMessage(err.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <Loader2 className="w-8 h-8 animate-spin text-[#3E1126]" />
          <p className="text-sm font-semibold tracking-wide">Loading your Boundless profile...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-[#3E1126]/10 text-[#3E1126] rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
            👤
          </div>
          <h2 className="text-2xl font-bold text-stone-900 font-oswald uppercase">Student Sign In Required</h2>
          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            Please log in with your official IIT Madras student account (<strong>@smail.iitm.ac.in</strong> or <strong>@ds.study.iitm.ac.in</strong>) to view and manage your Boundless profile.
          </p>
          <Link
            href="/my-trips"
            className="w-full inline-flex justify-center items-center gap-2 py-3 px-6 rounded-full bg-[#3E1126] text-white font-bold text-sm hover:bg-[#2A0013] transition shadow-md"
          >
            <span>Sign In to Student Portal</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-800 pb-20 pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/my-trips"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-[#3E1126] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Trips</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Canonical Student Profile</span>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-[#3E1126] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 rounded-full bg-[#FFE878]/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shrink-0 shadow-inner">
                🎓
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-oswald uppercase tracking-tight text-[#FFE878]">
                  My Profile
                </h1>
                <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
                  Your permanent Boundless Society student credentials and travel information.
                </p>
              </div>
            </div>

            {profile?.studentIdVerified && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE878]/20 border border-[#FFE878]/40 text-[#FFE878] text-xs font-bold uppercase tracking-wider shrink-0">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Student</span>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs sm:text-sm text-emerald-900 font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs sm:text-sm text-rose-900 font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Edit Form */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-base font-bold font-oswald uppercase tracking-wider text-[#3E1126] flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Permanent Identity Details
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Your registered email and verified student ID are securely anchored to your account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* IITM Email (Locked) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                <span>IITM Student Email</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 font-normal">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-100/80 border border-stone-200 rounded-xl text-xs font-mono text-stone-600 cursor-not-allowed">
                <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="truncate">{profile?.email || currentUser.email}</span>
              </div>
            </div>

            {/* Student ID / Roll Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center justify-between">
                <span>Student ID / Roll Number</span>
                {profile?.studentIdVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-semibold">Unverified</span>
                )}
              </label>
              {profile?.studentIdVerified ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-stone-100/80 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-700 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{studentId || profile?.studentId || "—"}</span>
                </div>
              ) : (
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g. 23F1000123"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-900 focus:outline-none focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
                />
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full official name"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
              />
            </div>
          </div>

          <div className="border-b border-stone-100 pt-3 pb-3">
            <h2 className="text-base font-bold font-oswald uppercase tracking-wider text-[#3E1126] flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Personal & Travel Demographics
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gender */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Gender <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {(["male", "female", "other"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setGender(opt)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-xs font-bold font-oswald uppercase tracking-wider transition cursor-pointer ${
                      gender === opt
                        ? "bg-[#3E1126] text-white border-[#3E1126] shadow-sm scale-[1.01]"
                        : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {opt === "male" ? "Male" : opt === "female" ? "Female" : "Other"}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
              />
            </div>

            {/* Residence / Hostel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Hostel / Residence
              </label>
              <input
                type="text"
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                placeholder="e.g. Alakananda Hostel / Day Scholar"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
              />
            </div>

            {/* Mobile Contact Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Contact Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, phone: null }));
                  }}
                  placeholder="10-digit mobile number"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-stone-900 focus:outline-none ${
                    fieldErrors.phone
                      ? "border-red-500 focus:ring-1 focus:ring-red-500"
                      : "border-stone-300 focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="text-[11px] text-red-600 font-semibold">{fieldErrors.phone}</p>
              )}
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600">
                WhatsApp Number
              </label>
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="For trip WhatsApp coordination groups"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
                />
              </div>
            </div>
          </div>

          <div className="border-b border-stone-100 pt-3 pb-3">
            <h2 className="text-base font-bold font-oswald uppercase tracking-wider text-[#3E1126] flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Home State & District
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Used for event origin planning, city meetups, and travel coordination.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LocationSelect
              id="profile-state"
              label="State / Union Territory"
              required={false}
              value={stateLoc}
              options={INDIAN_STATES_AND_UTS}
              placeholder="Select state..."
              searchPlaceholder="Search Indian state..."
              onChange={(newState) => {
                setStateLoc(newState);
                setCityDistrict("");
                setFieldErrors((prev) => ({ ...prev, cityDistrict: null }));
              }}
            />

            <LocationSelect
              id="profile-district"
              label="City / District"
              required={false}
              value={cityDistrict}
              options={stateLoc ? getDistrictsForState(stateLoc) : []}
              disabled={!stateLoc}
              disabledPlaceholder="Select state first"
              placeholder={stateLoc ? "Select district..." : "Select state first"}
              searchPlaceholder={`Search district in ${stateLoc || "state"}...`}
              error={fieldErrors.cityDistrict}
              onChange={(newDist) => {
                setCityDistrict(newDist);
                setFieldErrors((prev) => ({ ...prev, cityDistrict: null }));
              }}
            />
          </div>

          {/* Submission and Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
            <p className="text-[11px] text-stone-500 font-medium text-center sm:text-left">
              Changes saved here will automatically autofill future trip registration forms.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#3E1126] text-[#FFE878] font-bold text-xs sm:text-sm font-oswald uppercase tracking-wider hover:bg-[#2A0013] transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
