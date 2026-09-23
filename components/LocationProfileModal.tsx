"use client";

import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { MapPin, X, Loader2, CheckCircle2 } from "lucide-react";
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
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [stateError, setStateError] = useState<string | null>(null);
  const [districtError, setDistrictError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync initial state if available
  useEffect(() => {
    if (isOpen) {
      const stateVal = initialProfile?.state || "";
      const districtVal = initialProfile?.cityDistrict || "";
      setSelectedState(stateVal);
      setSelectedDistrict(districtVal);
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
    setStateError(null);
    setDistrictError(null);
    setServerError(null);

    let hasError = false;

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
          state: selectedState,
          cityDistrict: selectedDistrict,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update location.");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onSuccess(data.student);
      }, 500);
    } catch (err: any) {
      console.error("Location profile update error:", err);
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
            {initialProfile?.state && initialProfile?.cityDistrict
              ? "Update Residential Location"
              : "Location Profile Completion"}
          </h3>
          <p className="text-xs text-[#3E1126]/75 font-medium mt-1 leading-relaxed max-w-xs mx-auto">
            Please select your general residential state and city / district for trip planning and student records.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 sm:p-7 space-y-5">
          {serverError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>Location updated successfully!</span>
            </div>
          )}

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
                  <span>Saving Location...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Location Profile</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
