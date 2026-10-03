"use client";

import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { MapPin, Phone, X, Loader2, CheckCircle2, User as UserIcon } from "lucide-react";
import LocationSelect from "@/components/ui/LocationSelect";
import {
  INDIAN_STATES_AND_UTS,
  getDistrictsForState,
  isValidState,
  isValidDistrict,
} from "@/lib/indiaLocations";
import { StudentDocument } from "@/lib/studentProfile";

interface LocationProfileModalProps {
  isOpen: boolean;
  user: User | null;
  initialProfile?: Partial<StudentDocument> | null;
  onSuccess: (updatedStudent: StudentDocument) => void;
  onClose?: () => void;
  canDismiss?: boolean;
}

export default function LocationProfileModal({
  isOpen,
  user,
  initialProfile,
  onSuccess,
  onClose,
  canDismiss = false,
}: LocationProfileModalProps) {
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [genderError, setGenderError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [stateError, setStateError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync initial state if available
  useEffect(() => {
    if (isOpen) {
      const rawGender = initialProfile?.gender || "";
      const genderVal = rawGender && rawGender !== "unknown" ? (rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()) : "";
      const phoneVal = initialProfile?.phone || "";
      const stateVal = initialProfile?.state || "";
      const districtVal = initialProfile?.cityDistrict || "";
      setGender(genderVal);
      setPhone(phoneVal);
      setSelectedState(stateVal);
      setSelectedDistrict(districtVal);
      setGenderError(null);
      setPhoneError(null);
      setStateError(null);
      setDistrictError(null);
      setServerError(null);
      setSaveSuccess(false);
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  // Options for dependent City/District dropdown
  const districtOptions = selectedState ? getDistrictsForState(selectedState) : [];

  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setStateError(null);
    // Dependency behavior: clear previously selected City/District when State changes
    setSelectedDistrict("");
    setDistrictError(null);
    setServerError(null);
  };

  const handleDistrictChange = (newDistrict: string) => {
    setSelectedDistrict(newDistrict);
    setDistrictError(null);
    setServerError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenderError(null);
    setPhoneError(null);
    setStateError(null);
    setDistrictError(null);
    setServerError(null);

    let hasError = false;
    let cleanPhone = "";

    // Compulsory Gender Validation
    if (!gender || !gender.trim()) {
      setGenderError("Please select your gender.");
      hasError = true;
    }

    // Compulsory Phone Number Validation
    if (!phone.trim()) {
      setPhoneError("Phone number is required to complete your profile.");
      hasError = true;
    } else {
      let digits = phone.replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) {
        digits = digits.slice(2);
      } else if (digits.length === 11 && digits.startsWith("0")) {
        digits = digits.slice(1);
      }
      if (!/^[6-9]\d{9}$/.test(digits)) {
        setPhoneError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
        hasError = true;
      } else {
        cleanPhone = digits;
      }
    }

    if (!selectedState.trim()) {
      setStateError("Please select your state.");
      hasError = true;
    } else if (!isValidState(selectedState)) {
      setStateError("Please select a valid Indian State or Union Territory.");
      hasError = true;
    }

    if (!selectedDistrict.trim()) {
      setDistrictError("Please select your city/district.");
      hasError = true;
    } else if (selectedState && !isValidDistrict(selectedState, selectedDistrict)) {
      setDistrictError(`Please select a valid district for ${selectedState}.`);
      hasError = true;
    }

    if (hasError || !user) return;

    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gender: gender.toLowerCase(),
          phone: cleanPhone,
          state: selectedState,
          cityDistrict: selectedDistrict,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess(data.student);
      }, 500);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setServerError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="min-h-full flex items-center justify-center py-6 sm:py-10">
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 relative my-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header Ribbon */}
        <div className="bg-[#E4D5FF] px-6 py-6 text-center relative border-b border-[#3E1126]/10 rounded-t-3xl">
          {canDismiss && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-[#3E1126]/60 hover:text-[#3E1126] p-1.5 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="w-12 h-12 bg-[#3E1126] text-white rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-md">
            <MapPin className="w-6 h-6" />
          </div>

          <h3 className="font-oswald text-xl sm:text-2xl font-bold uppercase tracking-wider text-[#3E1126]">
            {initialProfile?.state && initialProfile?.cityDistrict && initialProfile?.phone && initialProfile?.gender && initialProfile.gender !== "unknown"
              ? "Update Profile Details"
              : "Complete Your Profile"}
          </h3>
          <p className="text-xs text-[#3E1126]/75 font-medium mt-1 leading-relaxed max-w-xs mx-auto">
            Please provide your gender, contact phone number, state, and city / district to complete your student profile and coordinate trip activities.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-7 space-y-4">
          {serverError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Gender Selection (Compulsory) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]">
              Gender <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              {["Male", "Female", "Other"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setGender(opt);
                    setGenderError(null);
                    setServerError(null);
                  }}
                  className={`py-2 px-3 rounded-xl border-2 text-xs font-bold font-oswald uppercase tracking-wider transition-all cursor-pointer ${
                    gender === opt
                      ? "bg-[#3E1126] text-white border-[#3E1126] shadow-sm scale-[1.02]"
                      : "bg-white text-[#3E1126] border-stone-200 hover:border-[#3E1126]/30 hover:bg-stone-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {genderError ? (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{genderError}</p>
            ) : (
              <p className="text-[10px] text-stone-400 mt-0.5">
                Required for event logistics, rooming allocations, and coordinator rosters.
              </p>
            )}
          </div>

          {/* Mobile Phone Number (Compulsory) */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="student-profile-phone"
              className="block text-xs font-oswald font-bold uppercase tracking-wider text-[#3E1126]"
            >
              Mobile Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Phone className="h-4 w-4" />
              </div>
              <input
                id="student-profile-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(null);
                  setServerError(null);
                }}
                placeholder="e.g. 9876543210"
                className={`w-full pl-10 pr-4 py-2.5 bg-white border-2 rounded-xl text-sm font-medium text-stone-800 placeholder:text-stone-400 focus:outline-none transition-all ${
                  phoneError
                    ? "border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                    : "border-stone-200 hover:border-stone-300 focus:border-[#3E1126] focus:ring-1 focus:ring-[#3E1126]"
                }`}
              />
            </div>
            {phoneError ? (
              <p className="text-[11px] text-red-600 font-semibold mt-1">{phoneError}</p>
            ) : (
              <p className="text-[10px] text-stone-400 mt-0.5">
                Compulsory for event coordination, emergency communications, and coordinator roster.
              </p>
            )}
          </div>

          {/* State Dropdown */}
          <LocationSelect
            id="student-profile-state"
            label="State / Union Territory"
            required
            value={selectedState}
            options={INDIAN_STATES_AND_UTS}
            placeholder="Select your state"
            searchPlaceholder="Search Indian state or UT..."
            error={stateError}
            onChange={handleStateChange}
          />

          {/* City / District Dropdown */}
          <LocationSelect
            id="student-profile-city-district"
            label="City / District"
            required
            value={selectedDistrict}
            options={districtOptions}
            disabled={!selectedState}
            disabledPlaceholder="Select state first"
            placeholder={selectedState ? "Select city or district" : "Select state first"}
            searchPlaceholder={`Search district in ${selectedState || "state"}...`}
            error={districtError}
            onChange={handleDistrictChange}
          />

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || saveSuccess}
              className="w-full py-3.5 px-6 rounded-full font-oswald uppercase tracking-wider font-bold text-xs sm:text-sm bg-[#FCE16D] hover:bg-[#ebd057] active:scale-[0.98] text-black shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
