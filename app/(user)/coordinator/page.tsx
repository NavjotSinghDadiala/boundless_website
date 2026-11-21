"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2Icon,
  ShieldAlertIcon,
  CheckCircle2Icon,
  LogOutIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  PhoneIcon,
  Edit3Icon,
  SaveIcon,
  XIcon,
  PlusIcon,
  AlertCircleIcon,
  SearchIcon,
  CompassIcon,
  InfoIcon,
  SparklesIcon,
  MessageSquareWarningIcon,
  ChevronDownIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { CoordinatorMobileHeader } from "@/components/coordinator/CoordinatorMobileHeader";
import { CoordinatorBottomNav } from "@/components/coordinator/CoordinatorBottomNav";
import { CoordinatorConcernDrawer } from "@/components/coordinator/CoordinatorConcernDrawer";
import { CoordinatorStudentCard } from "@/components/coordinator/CoordinatorStudentCard";
import type {
  TripSummary,
  TripDetail,
  ApprovedStudent,
  Concern,
  DashboardStats,
  CoordinatorTab,
  TripEditFormState,
} from "@/components/coordinator/types";

export default function CoordinatorDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Trips & selected trip
  const [assignedTrips, setAssignedTrips] = useState<TripSummary[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [dataLoading, setDataLoading] = useState(false);

  // Current trip dashboard state
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [approvedStudents, setApprovedStudents] = useState<ApprovedStudent[]>([]);
  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Search & tab controls
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<CoordinatorTab>("overview");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [importantInfoExpanded, setImportantInfoExpanded] = useState(false);

  // Trip Edit state
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [editForm, setEditForm] = useState<TripEditFormState>({
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    importantInformation: "",
    thingsToCarry: [],
    newCarryItem: "",
  });

  // Concern Modal state
  const [showConcernModal, setShowConcernModal] = useState(false);
  const [concernTarget, setConcernTarget] = useState<ApprovedStudent | null>(null);
  const [concernText, setConcernText] = useState("");
  const [isSubmittingConcern, setIsSubmittingConcern] = useState(false);
  const [isUnauthorizedCoordinator, setIsUnauthorizedCoordinator] = useState(false);

  // Firebase auth state subscription
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__BOUNDLESS_COORDINATOR_MOCK_STATE__) {
      const mock = (window as any).__BOUNDLESS_COORDINATOR_MOCK_STATE__;
      setUser(mock.user || { email: "coordinator@boundless.com" });
      setIsAuthenticated(true);
      setIsUnauthorizedCoordinator(Boolean(mock.isUnauthorizedCoordinator));
      setAssignedTrips(mock.assignedTrips || []);
      setSelectedTripId(mock.selectedTripId || mock.assignedTrips?.[0]?.id || "");
      setTripDetail(mock.tripDetail || null);
      if (mock.tripDetail) {
        setEditForm({
          destination: mock.tripDetail.destination || "",
          startDate: mock.tripDetail.startDate || "",
          endDate: mock.tripDetail.endDate || "",
          description: mock.tripDetail.description || "",
          importantInformation: mock.tripDetail.importantInformation || "",
          thingsToCarry: Array.isArray(mock.tripDetail.thingsToCarry) ? [...mock.tripDetail.thingsToCarry] : [],
          newCarryItem: "",
        });
      }
      setApprovedStudents(mock.approvedStudents || []);
      setConcerns(mock.concerns || []);
      setStats(mock.stats || null);
      setInitialLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
        setIsUnauthorizedCoordinator(false);
        await loadAssignedTrips(firebaseUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setIsUnauthorizedCoordinator(false);
        setAssignedTrips([]);
        setSelectedTripId("");
        setTripDetail(null);
      }
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch list of assigned trips for coordinator
  const loadAssignedTrips = async (currentUser: User) => {
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/coordinator/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const trips: TripSummary[] = data.trips || [];
        setAssignedTrips(trips);
        setIsUnauthorizedCoordinator(false);
        if (trips.length > 0) {
          // If current selection is invalid or empty, default to first trip
          setSelectedTripId((prev) => {
            if (prev && trips.some((t) => t.id === prev)) return prev;
            return trips[0].id;
          });
        } else {
          setSelectedTripId("");
        }
      } else if (res.status === 401 || res.status === 403) {
        setIsUnauthorizedCoordinator(true);
        setAssignedTrips([]);
      } else {
        toast.error("Failed to load assigned trips.");
      }
    } catch (err) {
      console.error("Error loading assigned trips:", err);
      toast.error("Network error while loading assigned trips.");
    }
  };

  // Load details for the currently selected trip
  const loadTripDashboardData = async (tripId: string) => {
    if (!tripId || !user) return;
    if (typeof window !== "undefined" && (window as any).__BOUNDLESS_COORDINATOR_MOCK_STATE__) {
      setDescriptionExpanded(false);
      setImportantInfoExpanded(false);
      return;
    }
    setDataLoading(true);
    setIsEditingTrip(false);
    setDescriptionExpanded(false);
    setImportantInfoExpanded(false);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/coordinator/dashboard?tripId=${encodeURIComponent(tripId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTripDetail(data.trip || null);
        setApprovedStudents(data.approvedStudents || []);
        setConcerns(data.concerns || []);
        setStats(data.stats || null);

        // Prepopulate edit form with current values
        if (data.trip) {
          setEditForm({
            destination: data.trip.destination || "",
            startDate: data.trip.startDate || "",
            endDate: data.trip.endDate || "",
            description: data.trip.description || "",
            importantInformation: data.trip.importantInformation || "",
            thingsToCarry: Array.isArray(data.trip.thingsToCarry) ? [...data.trip.thingsToCarry] : [],
            newCarryItem: "",
          });
        }
      } else if (res.status === 403) {
        toast.error("Access forbidden: You are not assigned to coordinate this trip.");
        setTripDetail(null);
      } else {
        toast.error("Failed to load trip dashboard data.");
      }
    } catch (err) {
      console.error("Error fetching trip details:", err);
      toast.error("Network error while fetching trip data.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && selectedTripId) {
      loadTripDashboardData(selectedTripId);
    }
  }, [isAuthenticated, selectedTripId]);

  // Google Sign-In
  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      setAuthError(error?.message || "Google Sign-In failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthenticated(false);
      setAssignedTrips([]);
      setTripDetail(null);
      setApprovedStudents([]);
      setConcerns([]);
      toast.success("Signed out successfully");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  // Save Trip Edits (PATCH /api/coordinator/trip)
  const handleSaveTripEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId) return;

    setIsSavingTrip(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        tripId: selectedTripId,
        destination: editForm.destination,
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        description: editForm.description,
        importantInformation: editForm.importantInformation,
        thingsToCarry: editForm.thingsToCarry,
      };

      const res = await fetch("/api/coordinator/trip", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Trip details updated successfully!");
        setIsEditingTrip(false);
        // Refresh data
        await loadTripDashboardData(selectedTripId);
      } else {
        toast.error(data.error || "Failed to update trip details.");
      }
    } catch (err) {
      console.error("Error saving trip edits:", err);
      toast.error("Network error while updating trip.");
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Add Item to Things to Carry
  const handleAddCarryItem = () => {
    if (!editForm.newCarryItem.trim()) return;
    setEditForm((prev) => ({
      ...prev,
      thingsToCarry: [...prev.thingsToCarry, prev.newCarryItem.trim()],
      newCarryItem: "",
    }));
  };

  // Remove Item from Things to Carry
  const handleRemoveCarryItem = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      thingsToCarry: prev.thingsToCarry.filter((_, i) => i !== index),
    }));
  };

  // Raise Student Concern
  const handleOpenConcernModal = (student: ApprovedStudent) => {
    setConcernTarget(student);
    setConcernText("");
    setShowConcernModal(true);
  };

  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTripId || !concernTarget || !concernText.trim()) return;

    setIsSubmittingConcern(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/coordinator/concerns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: selectedTripId,
          registrationId: concernTarget.id,
          studentPhone: concernTarget.phone,
          concernText: concernText.trim(),
          token,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Concern noted for ${concernTarget.name}`);
        setShowConcernModal(false);
        setConcernTarget(null);
        setConcernText("");
        // Reload concerns and dashboard data
        await loadTripDashboardData(selectedTripId);
      } else {
        toast.error(data.error || "Failed to submit concern.");
      }
    } catch (err) {
      console.error("Error submitting concern:", err);
      toast.error("Network error submitting concern.");
    } finally {
      setIsSubmittingConcern(false);
    }
  };

  // Filtered Approved Students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return approvedStudents;
    const q = searchQuery.toLowerCase().trim();
    return approvedStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""))
    );
  }, [approvedStudents, searchQuery]);

  // Loading initial authentication state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-4">
        <Loader2Icon className="animate-spin text-[#5B1313] w-10 h-10 mb-3" />
        <p className="text-base md:text-sm font-medium text-[#5B1313]/80">Loading coordinator portal...</p>
      </div>
    );
  }

  // Authenticated user is not an authorized coordinator
  if (isAuthenticated && isUnauthorizedCoordinator) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] via-[#F3EDE2] to-[#E9DFCF] flex items-center justify-center p-4">
        <div className="bg-white border border-[#3B001B]/20 rounded-3xl shadow-2xl p-6 md:p-8 max-w-md w-full relative overflow-hidden text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-oswald font-bold text-[#3B001B] uppercase tracking-wide mb-2">
            Coordinator Access Restricted
          </h2>
          <p className="text-base md:text-sm text-[#3B001B]/80 leading-relaxed mb-4 break-words">
            The account <strong>{user?.email}</strong> is not listed as an active coordinator in the Boundless system.
          </p>
          <p className="text-sm md:text-xs text-[#3B001B]/65 mb-6">
            Coordinator privileges are granted by the Boundless Administration Team.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/my-trips"
              className="w-full min-h-[48px] flex items-center justify-center bg-[#FFE878] text-[#3B001B] border border-[#3B001B]/20 font-oswald font-bold py-3 px-4 rounded-xl text-base md:text-sm tracking-wider uppercase hover:bg-[#FCE16D] transition-all shadow"
            >
              Go to My Trips
            </Link>
            <Link
              href="/"
              className="w-full min-h-[48px] flex items-center justify-center bg-white text-[#3B001B] border border-[#3B001B]/20 font-oswald font-bold py-3 px-4 rounded-xl text-base md:text-sm tracking-wider uppercase hover:bg-[#FAF7F2] transition-all"
            >
              Return to Home
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[44px] text-sm md:text-xs text-[#3B001B]/75 hover:text-red-700 py-2 transition-colors font-medium mt-1 cursor-pointer"
            >
              Sign out from this account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Coordinator Sign-In
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] via-[#F3EDE2] to-[#E9DFCF] flex items-center justify-center p-4">
        <div className="bg-white border border-[#C5A059]/40 rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full relative overflow-hidden">
          {/* Decorative Gold Header Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#5B1313] via-[#C5A059] to-[#5B1313]" />

          <div className="text-center mb-6 pt-2">
            <div className="w-16 h-16 rounded-full bg-[#5B1313]/10 border border-[#C5A059]/30 flex items-center justify-center mx-auto mb-4">
              <CompassIcon className="w-8 h-8 text-[#5B1313]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#5B1313] tracking-wide">
              Boundless Society
            </h1>
            <p className="text-sm md:text-xs uppercase tracking-widest text-[#C5A059] font-semibold mt-1">
              Coordinator Portal
            </p>
          </div>

          <div className="bg-[#FAF7F2] border border-[#E2D9CE] rounded-xl p-4 text-center mb-6">
            <p className="text-base md:text-sm text-stone-700 leading-relaxed">
              Sign in with your verified coordinator Google account to access your assigned trips and manage students.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm md:text-xs flex items-start gap-2">
              <AlertCircleIcon className="w-5 h-5 md:w-4 md:h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{authError}</div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                aria-label="Dismiss error"
                className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className="w-full min-h-[48px] bg-[#5B1313] hover:bg-[#450A0A] text-white py-3 px-4 rounded-xl text-base md:text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer"
          >
            {authLoading ? (
              <>
                <Loader2Icon className="w-5 h-5 md:w-4 md:h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-800 font-sans overflow-x-hidden pb-28 md:pb-16">
      {/* Compact Sticky Mobile Header + Trip Switcher & Account Bottom Sheets */}
      <CoordinatorMobileHeader
        userEmail={user?.email || ""}
        assignedTrips={assignedTrips}
        selectedTripId={selectedTripId}
        onSelectTrip={setSelectedTripId}
        onLogout={handleLogout}
      />

      {/* Desktop Top Navigation Header (Preserved) */}
      <header className="hidden md:block bg-white border-b border-[#E2D9CE] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#5B1313] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-lg shadow-xs">
              B
            </div>
            <div>
              <span className="font-serif font-bold text-[#5B1313] text-lg block leading-tight">
                Boundless
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#C5A059] font-bold block">
                Coordinator Control Room
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/my-trips"
              id="coordinator-switch-traveller-btn"
              className="bg-[#FFE878] hover:bg-[#FCE16D] text-[#3B001B] border border-[#3B001B]/20 px-3 py-1.5 rounded-lg text-xs font-bold font-oswald uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <span>✈</span>
              <span>Traveller Mode</span>
            </Link>

            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-stone-700">{user?.email}</span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                Authorized Coordinator
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#5B1313] border border-[#E2D9CE] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOutIcon className="w-3.5 h-3.5 text-[#5B1313]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
        {/* Empty Assigned Trips State (Visible on Mobile & Desktop) */}
        {assignedTrips.length === 0 ? (
          <div className="mb-6 bg-white border border-[#E2D9CE] rounded-2xl md:rounded-xl p-6 md:p-8 text-center shadow-xs">
            <ShieldAlertIcon className="w-10 h-10 text-[#C5A059] mx-auto mb-3" />
            <h3 className="text-lg md:text-base font-serif font-bold text-[#5B1313] mb-1.5">
              No Active Trip Assignments Found
            </h3>
            <p className="text-sm md:text-xs text-stone-600 max-w-md mx-auto leading-relaxed break-words">
              You are currently signed in as <strong className="text-stone-800">{user?.email}</strong>. If you are coordinating an upcoming trip, please contact the administrator to ensure your email is added to the trip roster.
            </p>
          </div>
        ) : (
          /* Desktop Assigned Trips Bar (Mobile uses Searchable Trip Switcher Bottom Sheet) */
          <div className="hidden md:block mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CompassIcon className="w-4 h-4 text-[#5B1313]" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#5B1313]">
                  My Assigned Trips
                </h2>
              </div>
              <span className="text-xs font-medium text-stone-500">
                {assignedTrips.length} {assignedTrips.length === 1 ? "Trip" : "Trips"} Assigned
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {assignedTrips.map((trip) => {
                const isSelected = trip.id === selectedTripId;
                return (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`shrink-0 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#5B1313] text-white border-[#5B1313] shadow-md"
                        : "bg-white text-stone-700 border-[#E2D9CE] hover:border-[#C5A059]"
                    }`}
                  >
                    <p className={`font-serif font-bold text-sm truncate max-w-[200px] ${isSelected ? "text-white" : "text-[#5B1313]"}`}>
                      {trip.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[11px] flex items-center gap-1 ${isSelected ? "text-[#FAF7F2]/80" : "text-stone-500"}`}>
                        <MapPinIcon className="w-3 h-3" /> {trip.destination || "Destination"}
                      </span>
                      {trip.isCompleted && (
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${isSelected ? "bg-white/20 text-white" : "bg-stone-100 text-stone-600"}`}>
                          Completed
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading Trip Data State */}
        {dataLoading && !tripDetail && (
          <div className="py-16 flex flex-col items-center justify-center text-stone-500">
            <Loader2Icon className="w-8 h-8 animate-spin text-[#5B1313] mb-3" />
            <p className="text-base md:text-sm font-medium">Loading trip details...</p>
          </div>
        )}

        {/* Selected Trip Content */}
        {selectedTripId && tripDetail && (
          <div className="space-y-5 md:space-y-6">
            {/* Quick Stats Grid (Readable 14px labels on mobile; shown on Overview on mobile, always visible on desktop) */}
            <div className={`${activeTab === "overview" ? "grid" : "hidden md:grid"} grid-cols-2 md:grid-cols-4 gap-3`}>
              <div className="bg-white border border-[#E2D9CE] p-4 rounded-2xl md:rounded-xl shadow-xs">
                <p className="text-sm md:text-[11px] md:uppercase md:tracking-wider text-stone-600 md:text-stone-500 font-semibold md:font-bold">
                  Total Capacity
                </p>
                <p className="text-2xl font-serif font-bold text-[#5B1313] mt-1">
                  {stats?.totalSeats || tripDetail.capacity || 0}
                </p>
                <p className="text-xs md:text-[10px] text-stone-500 md:text-stone-400 mt-0.5">
                  Total seats opened
                </p>
              </div>

              <div className="bg-white border border-[#E2D9CE] p-4 rounded-2xl md:rounded-xl shadow-xs">
                <p className="text-sm md:text-[11px] md:uppercase md:tracking-wider text-emerald-700 font-semibold md:font-bold">
                  Approved
                </p>
                <p className="text-2xl font-serif font-bold text-emerald-700 mt-1">
                  {stats?.totalApproved || approvedStudents.length}
                </p>
                <p className="text-xs md:text-[10px] text-emerald-700/80 md:text-emerald-600/80 mt-0.5">
                  Roster approved
                </p>
              </div>

              <div className="bg-white border border-[#E2D9CE] p-4 rounded-2xl md:rounded-xl shadow-xs">
                <p className="text-sm md:text-[11px] md:uppercase md:tracking-wider text-stone-600 md:text-stone-500 font-semibold md:font-bold">
                  Remaining
                </p>
                <p className="text-2xl font-serif font-bold text-[#C5A059] mt-1">
                  {stats?.remainingSeats ?? 0}
                </p>
                <p className="text-xs md:text-[10px] text-stone-500 md:text-stone-400 mt-0.5">
                  Unfilled spots
                </p>
              </div>

              <div className="bg-white border border-[#E2D9CE] p-4 rounded-2xl md:rounded-xl shadow-xs">
                <p className="text-sm md:text-[11px] md:uppercase md:tracking-wider text-amber-800 md:text-amber-700 font-semibold md:font-bold">
                  Concerns
                </p>
                <p className="text-2xl font-serif font-bold text-amber-800 mt-1">
                  {concerns.length}
                </p>
                <p className="text-xs md:text-[10px] text-stone-500 md:text-stone-400 mt-0.5">
                  Notes recorded
                </p>
              </div>
            </div>

            {/* Desktop Navigation Tabs (Mobile uses Fixed Bottom Navigation Bar) */}
            <div className="hidden md:flex border-b border-[#E2D9CE] gap-2">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2.5 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "overview"
                    ? "border-[#5B1313] text-[#5B1313] font-bold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <InfoIcon className="w-4 h-4" />
                <span>Trip Details</span>
              </button>

              <button
                onClick={() => setActiveTab("students")}
                className={`py-2.5 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "students"
                    ? "border-[#5B1313] text-[#5B1313] font-bold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <UsersIcon className="w-4 h-4" />
                <span>Approved Students ({approvedStudents.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("concerns")}
                className={`py-2.5 px-4 font-medium text-sm border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "concerns"
                    ? "border-[#5B1313] text-[#5B1313] font-bold"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                <MessageSquareWarningIcon className="w-4 h-4" />
                <span>Concerns ({concerns.length})</span>
              </button>
            </div>

            {/* TAB 1: TRIP DETAILS (VIEW + EDIT) */}
            {activeTab === "overview" && (
              <div className="bg-white border border-[#E2D9CE] rounded-2xl p-4 sm:p-6 shadow-xs">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 border-b border-[#E2D9CE] pb-4 mb-5 md:mb-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-[#5B1313] leading-snug">
                      {tripDetail.name}
                    </h2>
                    <p className="text-sm md:text-xs text-stone-500 mt-0.5">
                      {tripDetail.isCompleted ? "Trip Completed (Read-Only)" : "Active Trip Roster"}
                    </p>
                  </div>

                  {!tripDetail.isCompleted && (
                    <div>
                      {isEditingTrip ? (
                        <div className="hidden md:flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingTrip(false)}
                            disabled={isSavingTrip}
                            className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveTripEdits}
                            disabled={isSavingTrip}
                            className="bg-[#5B1313] hover:bg-[#450A0A] text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-60"
                          >
                            {isSavingTrip ? (
                              <>
                                <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <SaveIcon className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingTrip(true)}
                          className="w-full md:w-auto min-h-[48px] md:min-h-0 bg-[#FAF7F2] hover:bg-[#F3EDE2] active:bg-[#EFE7DA] text-[#5B1313] border border-[#C5A059]/50 px-4 md:px-3.5 py-2.5 md:py-1.5 rounded-xl md:rounded-lg text-base md:text-xs font-bold flex items-center justify-center gap-2 md:gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Edit3Icon className="w-4 h-4 md:w-3.5 md:h-3.5 text-[#5B1313]" />
                          <span>Edit Trip Details</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditingTrip ? (
                  /* TRIP EDIT FORM */
                  <form id="coordinator-trip-edit-form" onSubmit={handleSaveTripEdits} className="space-y-5 md:space-y-6">
                    <div className="border-l-3 border-[#C5A059] pl-3.5 py-1.5 md:bg-[#FAF7F2] md:p-4 md:rounded-xl md:border md:border-[#E2D9CE]">
                      <p className="text-sm md:text-xs text-[#5B1313] font-semibold flex items-center gap-1.5">
                        <SparklesIcon className="w-4 h-4 md:w-3.5 md:h-3.5 text-[#C5A059] shrink-0" />
                        <span>Coordinator Editable Details</span>
                      </p>
                      <p className="text-sm md:text-[11px] text-stone-600 md:text-stone-500 mt-1 leading-relaxed">
                        Trip name, fees, form templates, and coordinator assignments are managed by administrators.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                          Destination
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.destination}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, destination: e.target.value }))}
                          className="w-full min-h-[48px] md:min-h-0 px-3.5 md:px-3 py-2.5 md:py-2 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                          Start Date
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2026-10-15 or Oct 15, 2026"
                          value={editForm.startDate}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, startDate: e.target.value }))}
                          className="w-full min-h-[48px] md:min-h-0 px-3.5 md:px-3 py-2.5 md:py-2 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                          End Date
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 2026-10-20 or Oct 20, 2026"
                          value={editForm.endDate}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, endDate: e.target.value }))}
                          className="w-full min-h-[48px] md:min-h-0 px-3.5 md:px-3 py-2.5 md:py-2 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                        Trip Description
                      </label>
                      <textarea
                        rows={4}
                        value={editForm.description}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3.5 md:px-3 py-3 md:py-2 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313] resize-y"
                      />
                    </div>

                    <div>
                      <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                        Important Information
                      </label>
                      <textarea
                        rows={3}
                        value={editForm.importantInformation}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, importantInformation: e.target.value }))}
                        placeholder="Guidelines, meet-up spots, rules, or briefing notes..."
                        className="w-full px-3.5 md:px-3 py-3 md:py-2 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313] resize-y"
                      />
                    </div>

                    {/* Things to Carry Editor */}
                    <div>
                      <label className="block text-sm md:text-xs font-bold md:uppercase md:tracking-wider text-stone-700 mb-1.5 md:mb-1">
                        Things to Carry
                      </label>
                      <div className="flex gap-2 mb-3 md:mb-2">
                        <input
                          type="text"
                          value={editForm.newCarryItem}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, newCarryItem: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCarryItem();
                            }
                          }}
                          placeholder="Add item (e.g. Valid Student ID)..."
                          className="flex-1 min-w-0 min-h-[48px] md:min-h-0 px-3.5 md:px-3 py-2.5 md:py-1.5 border border-stone-300 rounded-xl md:rounded-lg text-base md:text-sm bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCarryItem}
                          className="min-h-[48px] md:min-h-0 bg-[#5B1313] text-white px-4 md:px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-lg text-sm md:text-xs font-bold hover:bg-[#450A0A] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <PlusIcon className="w-4 h-4 md:w-3.5 md:h-3.5" /> Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {editForm.thingsToCarry.map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-[#FAF7F2] border border-[#E2D9CE] text-stone-800 text-sm md:text-xs pl-3.5 pr-2 md:px-2.5 py-1.5 md:py-1 rounded-full flex items-center gap-2 md:gap-1.5"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveCarryItem(idx)}
                              aria-label={`Remove ${item}`}
                              className="w-7 h-7 md:w-auto md:h-auto rounded-full flex items-center justify-center text-stone-500 hover:text-red-700 active:bg-red-50 cursor-pointer"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </form>
                ) : (
                  /* TRIP VIEW DETAILS (Clean flat sections on mobile, preserved on desktop) */
                  <div className="space-y-5 md:space-y-6">
                    <div className="divide-y divide-[#E2D9CE]/70 md:divide-y-0 md:grid md:grid-cols-3 md:gap-4 md:bg-[#FAF7F2] md:p-4 md:rounded-xl md:border md:border-[#E2D9CE]">
                      <div className="flex items-start md:items-center gap-3 md:gap-2 pb-3.5 md:pb-0">
                        <MapPinIcon className="w-5 h-5 md:w-4 md:h-4 text-[#5B1313] shrink-0 mt-0.5 md:mt-0" />
                        <div className="min-w-0">
                          <p className="text-xs md:text-[10px] uppercase font-bold text-stone-500">Destination</p>
                          <p className="text-base md:text-sm font-semibold text-stone-900 md:text-stone-800 break-words">
                            {tripDetail.destination || "Not specified"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start md:items-center gap-3 md:gap-2 py-3.5 md:py-0">
                        <CalendarIcon className="w-5 h-5 md:w-4 md:h-4 text-[#5B1313] shrink-0 mt-0.5 md:mt-0" />
                        <div className="min-w-0">
                          <p className="text-xs md:text-[10px] uppercase font-bold text-stone-500">Dates</p>
                          <p className="text-base md:text-sm font-semibold text-stone-900 md:text-stone-800">
                            {tripDetail.startDate ? `${tripDetail.startDate} — ${tripDetail.endDate}` : "TBA"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start md:items-center gap-3 md:gap-2 pt-3.5 md:pt-0">
                        <UsersIcon className="w-5 h-5 md:w-4 md:h-4 text-[#5B1313] shrink-0 mt-0.5 md:mt-0" />
                        <div className="min-w-0">
                          <p className="text-xs md:text-[10px] uppercase font-bold text-stone-500">Capacity & Joined</p>
                          <p className="text-base md:text-sm font-semibold text-stone-900 md:text-stone-800">
                            {tripDetail.totalJoined} / {tripDetail.totalSeats} seats
                          </p>
                        </div>
                      </div>
                    </div>

                    {tripDetail.description && (
                      <div className="border-t border-[#E2D9CE]/70 md:border-t-0 pt-4 md:pt-0">
                        <h3 className="text-sm md:text-xs font-bold uppercase tracking-wider text-stone-600 md:text-stone-500 mb-2 md:mb-1.5">
                          Description
                        </h3>
                        <p
                          className={`text-base md:text-sm text-stone-700 leading-relaxed whitespace-pre-line md:bg-stone-50/50 md:p-3.5 md:rounded-xl md:border md:border-stone-200 ${
                            !descriptionExpanded && tripDetail.description.length > 220
                              ? "line-clamp-4 md:line-clamp-none"
                              : ""
                          }`}
                        >
                          {tripDetail.description}
                        </p>
                        {tripDetail.description.length > 220 && (
                          <button
                            type="button"
                            onClick={() => setDescriptionExpanded((prev) => !prev)}
                            className="md:hidden mt-2 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-[#5B1313]"
                          >
                            <span>{descriptionExpanded ? "Show less" : "Read full description"}</span>
                            <ChevronDownIcon
                              className={`w-4 h-4 transition-transform ${
                                descriptionExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    )}

                    {tripDetail.importantInformation && (
                      <div className="border-t border-[#E2D9CE]/70 md:border-t-0 pt-4 md:pt-0">
                        <h3 className="text-sm md:text-xs font-bold uppercase tracking-wider text-stone-600 md:text-stone-500 mb-2 md:mb-1.5">
                          Important Information
                        </h3>
                        <p
                          className={`text-base md:text-sm text-stone-800 md:text-stone-700 leading-relaxed whitespace-pre-line border-l-3 border-amber-500 pl-3.5 py-1 bg-amber-50/50 rounded-r-lg md:rounded-xl md:border md:border-amber-200/80 md:bg-amber-50/60 md:p-3.5 ${
                            !importantInfoExpanded && tripDetail.importantInformation.length > 220
                              ? "line-clamp-4 md:line-clamp-none"
                              : ""
                          }`}
                        >
                          {tripDetail.importantInformation}
                        </p>
                        {tripDetail.importantInformation.length > 220 && (
                          <button
                            type="button"
                            onClick={() => setImportantInfoExpanded((prev) => !prev)}
                            className="md:hidden mt-2 min-h-[44px] inline-flex items-center gap-1 text-sm font-bold text-amber-900"
                          >
                            <span>{importantInfoExpanded ? "Show less" : "Read all instructions"}</span>
                            <ChevronDownIcon
                              className={`w-4 h-4 transition-transform ${
                                importantInfoExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    )}

                    {Array.isArray(tripDetail.thingsToCarry) && tripDetail.thingsToCarry.length > 0 && (
                      <div className="border-t border-[#E2D9CE]/70 md:border-t-0 pt-4 md:pt-0">
                        <h3 className="text-sm md:text-xs font-bold uppercase tracking-wider text-stone-600 md:text-stone-500 mb-2.5 md:mb-2">
                          Things to Carry
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {tripDetail.thingsToCarry.map((item, i) => (
                            <span
                              key={i}
                              className="bg-[#FAF7F2] md:bg-white border border-[#E2D9CE] text-stone-800 md:text-stone-700 text-sm md:text-xs px-3 py-1.5 md:py-1 rounded-full shadow-2xs font-medium"
                            >
                              • {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coordinators on Trip */}
                    {Array.isArray(tripDetail.coordinators) && tripDetail.coordinators.length > 0 && (
                      <div className="border-t border-[#E2D9CE] pt-4">
                        <h3 className="text-sm md:text-xs font-bold uppercase tracking-wider text-stone-600 md:text-stone-500 mb-2.5 md:mb-2">
                          Coordinators Roster
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {tripDetail.coordinators.map((c, i) => {
                            const isMe = c.email?.toLowerCase() === user?.email?.toLowerCase();
                            return (
                              <div
                                key={i}
                                className={`p-3.5 md:p-3 rounded-xl border text-sm md:text-xs flex items-center justify-between gap-2 ${
                                  isMe
                                    ? "bg-[#FAF7F2] border-[#C5A059]/50"
                                    : "bg-white border-[#E2D9CE]"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-base md:text-xs text-stone-900 md:text-stone-800 truncate">
                                    {c.name} {isMe && <span className="text-[#5B1313] font-bold">(You)</span>}
                                  </p>
                                  {c.phone && (
                                    <a
                                      href={`tel:${c.phone}`}
                                      className="text-sm md:text-[11px] text-[#5B1313] md:text-stone-500 hover:underline mt-0.5 inline-block font-medium"
                                    >
                                      {c.phone}
                                    </a>
                                  )}
                                </div>
                                {c.assignedOption && (
                                  <span className="bg-[#5B1313]/10 text-[#5B1313] px-2.5 py-1 md:px-2 md:py-0.5 rounded-md text-xs md:text-[10px] font-bold shrink-0">
                                    {c.assignedOption}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APPROVED STUDENTS ONLY (NAME + PHONE) */}
            {activeTab === "students" && (
              <div className="space-y-4">
                <div className="md:bg-white md:border md:border-[#E2D9CE] md:rounded-2xl md:p-4 md:shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                  <div>
                    <h2 className="text-lg md:text-base font-serif font-bold text-[#5B1313] flex items-center gap-2">
                      <CheckCircle2Icon className="w-5 h-5 md:w-4 md:h-4 text-emerald-700 shrink-0" />
                      <span>Approved Students Roster</span>
                    </h2>
                    <p className="text-sm md:text-xs text-stone-600 md:text-stone-500 mt-0.5">
                      Showing verified approved students only ({filteredStudents.length} of {approvedStudents.length})
                    </p>
                  </div>

                  <div className="w-full md:w-64 relative">
                    <SearchIcon className="w-5 h-5 md:w-4 md:h-4 text-stone-400 absolute left-3.5 md:left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full min-h-[48px] md:min-h-0 pl-11 md:pl-9 pr-11 md:pr-8 py-2.5 md:py-1.5 border border-[#E2D9CE] md:border-stone-300 rounded-xl md:rounded-lg text-base md:text-xs bg-white focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-[#5B1313]/30 focus:border-[#5B1313]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear student search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 md:w-6 md:h-6 flex items-center justify-center text-stone-400 hover:text-stone-700"
                      >
                        <XIcon className="w-4 h-4 md:w-3.5 md:h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="bg-white border border-[#E2D9CE] rounded-2xl p-8 text-center text-stone-500 shadow-xs">
                    <p className="text-base md:text-sm font-medium text-stone-700">No approved registrations found.</p>
                    {searchQuery && (
                      <p className="text-sm md:text-xs text-stone-500 mt-1">Try clearing your search query.</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-3">
                    {filteredStudents.map((student) => {
                      const studentConcerns = concerns.filter(
                        (c) => c.studentName === student.name || c.studentPhone === student.phone
                      );

                      return (
                        <CoordinatorStudentCard
                          key={student.id}
                          student={student}
                          studentConcerns={studentConcerns}
                          onRaiseConcern={handleOpenConcernModal}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONCERNS / NOTES */}
            {activeTab === "concerns" && (
              <div className="space-y-4">
                <div className="md:bg-white md:border md:border-[#E2D9CE] md:rounded-2xl md:p-4 md:shadow-xs flex justify-between items-center">
                  <div>
                    <h2 className="text-lg md:text-base font-serif font-bold text-[#5B1313] flex items-center gap-2">
                      <MessageSquareWarningIcon className="w-5 h-5 md:w-4 md:h-4 text-amber-700 shrink-0" />
                      <span>Coordinator Concern Records</span>
                    </h2>
                    <p className="text-sm md:text-xs text-stone-600 md:text-stone-500 mt-0.5">
                      Operational notes and flags logged by coordinators ({concerns.length})
                    </p>
                  </div>
                </div>

                {concerns.length === 0 ? (
                  <div className="bg-white border border-[#E2D9CE] rounded-2xl p-8 text-center text-stone-500 shadow-xs">
                    <p className="text-base md:text-sm font-medium text-stone-700">No concerns recorded for this trip.</p>
                    <p className="text-sm md:text-xs text-stone-500 mt-1.5 leading-relaxed">
                      You can flag concerns for approved students directly from the Students tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {concerns.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white border border-[#E2D9CE] rounded-2xl md:rounded-xl p-4 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-stone-100 pb-2.5 mb-2.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-base md:text-sm text-[#5B1313]">{c.studentName}</span>
                            {c.studentPhone && (
                              <a
                                href={`tel:${c.studentPhone}`}
                                className="inline-flex items-center gap-1 text-sm md:text-xs text-[#5B1313] md:text-stone-500 hover:underline font-medium"
                              >
                                <PhoneIcon className="w-3.5 h-3.5 md:hidden" />
                                <span>{c.studentPhone}</span>
                              </a>
                            )}
                          </div>
                          <span className="text-xs md:text-[11px] text-stone-500 md:text-stone-400">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        <p className="text-base md:text-xs text-stone-800 md:text-stone-700 leading-relaxed whitespace-pre-line">
                          {c.concernText}
                        </p>
                        <p className="text-xs md:text-[10px] text-stone-500 md:text-stone-400 mt-2.5 break-all">
                          Logged by: {c.coordinatorEmail}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Sticky Save/Cancel Bar while Editing Trip Details */}
      {isEditingTrip && activeTab === "overview" && tripDetail && !tripDetail.isCompleted && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2D9CE] shadow-[0_-4px_20px_rgba(91,19,19,0.08)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsEditingTrip(false)}
              disabled={isSavingTrip}
              className="min-h-[48px] px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-700 text-base font-semibold active:bg-stone-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTripEdits}
              disabled={isSavingTrip}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-[#5B1313] active:bg-[#450A0A] text-white text-base font-semibold flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              {isSavingTrip ? (
                <>
                  <Loader2Icon className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="w-5 h-5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      {selectedTripId && tripDetail && (
        <CoordinatorBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "overview") {
              setIsEditingTrip(false);
            }
          }}
          studentsCount={approvedStudents.length}
          concernsCount={concerns.length}
          hidden={isEditingTrip && activeTab === "overview"}
        />
      )}

      {/* Raise Concern Drawer (Mobile vaul Drawer / Desktop Modal) */}
      <CoordinatorConcernDrawer
        open={showConcernModal}
        onOpenChange={(open) => {
          setShowConcernModal(open);
          if (!open) {
            setConcernTarget(null);
            setConcernText("");
          }
        }}
        student={concernTarget}
        concernText={concernText}
        onConcernTextChange={setConcernText}
        isSubmitting={isSubmittingConcern}
        onSubmit={handleSubmitConcern}
      />
    </div>
  );
}
