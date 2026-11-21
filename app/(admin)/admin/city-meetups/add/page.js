"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  TrashIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  Loader2Icon,
  PencilIcon,
  ChevronDownIcon,
  SparklesIcon,
  LockIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MediaFileUpload from "@/components/MediaFileUpload";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";
import { AdminPageHeader } from "@/components/admin";
import CityLocationSelect from "@/components/admin/CityLocationSelect";
import { MEETUP_STATUSES } from "@/lib/cityMeetups";

function AddCityMeetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lockedCampaignId = searchParams.get("campaignId")?.trim() || "";
  const initialType =
    lockedCampaignId || searchParams.get("type") === "campaign_city"
      ? "campaign_city"
      : "standalone";

  const [loading, setLoading] = useState(false);
  const [showArchiveSection, setShowArchiveSection] = useState(false);

  // Parent Campaigns list
  const [campaigns, setCampaigns] = useState([]);
  const [meetupType, setMeetupType] = useState(initialType);
  const [campaignId, setCampaignId] = useState(lockedCampaignId);

  // Legacy Section & Sub-Section State (preserved for archive compatibility)
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editingSectionName, setEditingSectionName] = useState("");

  const [subSections, setSubSections] = useState([]);
  const [selectedSubSectionId, setSelectedSubSectionId] = useState("");
  const [isAddingSubSection, setIsAddingSubSection] = useState(false);
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [isEditingSubSection, setIsEditingSubSection] = useState(false);
  const [editingSubSectionName, setEditingSubSectionName] = useState("");

  // Form Data
  const [formData, setFormData] = useState({
    cityName: "",
    title: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venue: "",
    capacity: "",
    registrationOpen: true,
    registrationDeadline: "",
    status: "published",
    whatsappGroupLink: "",
    color: "#FEFAE7",
    participants: "",
    summary: "",
    instagramHandle: "",
    link: "",
    galleryLink: "",
    photos: [],
    videos: [],
    graphData: [],
  });

  const [image, setImage] = useState({ file: null, preview: null, base64: null });

  const fetchInitialData = async () => {
    try {
      const [secRes, campRes] = await Promise.all([
        fetch("/api/city-meetups/meetup-sections"),
        fetch("/api/meetup-campaigns"),
      ]);
      const [secData, campData] = await Promise.all([
        secRes.json().catch(() => ({})),
        campRes.json().catch(() => ({})),
      ]);
      if (secRes.ok) setSections(secData.sections || []);
      if (campRes.ok) setCampaigns(campData.campaigns || []);
    } catch {
      toast.error("Failed to load campaigns or sections");
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchSubSectionsForSection = async () => {
      if (!selectedSectionId) {
        setSubSections([]);
        setSelectedSubSectionId("");
        return;
      }
      try {
        const res = await fetch(
          `/api/city-meetups/meetup-sub-sections?sectionId=${encodeURIComponent(selectedSectionId)}`
        );
        const data = await res.json();
        if (res.ok) setSubSections(data.subSections || []);
      } catch {
        toast.error("Failed to load sub-sections");
      }
    };
    fetchSubSectionsForSection();
  }, [selectedSectionId]);

  const handleGraphValueChange = (index, field, value) => {
    const updated = [...(formData.graphData || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, graphData: updated });
  };

  const addGraphEntry = () => {
    setFormData({
      ...formData,
      graphData: [...(formData.graphData || []), { x: "", y: "" }],
    });
  };

  const removeGraphEntry = (index) => {
    const updated = [...(formData.graphData || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, graphData: updated });
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) return toast.error("Section name cannot be empty");
    try {
      const res = await fetch("/api/city-meetups/meetup-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Main Section added!");
        setNewSectionName("");
        setIsAddingSection(false);
        await fetchInitialData();
        setSelectedSectionId(data.id);
      } else throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || "Failed to create section");
    }
  };

  const handleUpdateSection = async () => {
    if (!selectedSectionId || !editingSectionName.trim()) return;
    try {
      const res = await fetch(`/api/city-meetups/meetup-sections/${selectedSectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingSectionName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Section updated!");
        setIsEditingSection(false);
        setEditingSectionName("");
        await fetchInitialData();
      } else throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || "Failed to update section");
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSectionId || !confirm("Delete this main section?")) return;
    try {
      const res = await fetch(`/api/city-meetups/meetup-sections/${selectedSectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Main Section removed");
        setSelectedSectionId("");
        fetchInitialData();
      } else throw new Error("Failed to delete");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddSubSection = async () => {
    if (!newSubSectionName.trim()) return toast.error("Sub-section name cannot be empty");
    if (!selectedSectionId) return toast.error("Select a main section first");
    try {
      const res = await fetch("/api/city-meetups/meetup-sub-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubSectionName, sectionId: selectedSectionId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Sub Section added!");
        setNewSubSectionName("");
        setIsAddingSubSection(false);
        const secRes = await fetch(
          `/api/city-meetups/meetup-sub-sections?sectionId=${encodeURIComponent(selectedSectionId)}`
        );
        const secData = await secRes.json();
        if (secRes.ok) setSubSections(secData.subSections || []);
        setSelectedSubSectionId(data.id);
      } else throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || "Failed to create sub-section");
    }
  };

  const handleUpdateSubSection = async () => {
    if (!selectedSubSectionId || !editingSubSectionName.trim()) return;
    try {
      const res = await fetch(`/api/city-meetups/meetup-sub-sections/${selectedSubSectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingSubSectionName }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Sub-section updated!");
        setIsEditingSubSection(false);
        setEditingSubSectionName("");
        const secRes = await fetch(
          `/api/city-meetups/meetup-sub-sections?sectionId=${encodeURIComponent(selectedSectionId)}`
        );
        const secData = await secRes.json();
        if (secRes.ok) setSubSections(secData.subSections || []);
      } else throw new Error(data.error);
    } catch (err) {
      toast.error(err.message || "Failed to update sub-section");
    }
  };

  const handleDeleteSubSection = async () => {
    if (!selectedSubSectionId || !confirm("Delete this sub-section?")) return;
    try {
      const res = await fetch(
        `/api/city-meetups/meetup-sub-sections/${selectedSubSectionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        toast.success("Sub Section removed");
        setSelectedSubSectionId("");
        fetchInitialData();
      } else throw new Error("Failed to delete");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImage({ file, preview: reader.result, base64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAndSave = async (e) => {
    e.preventDefault();
    if (!formData.cityName.trim()) {
      return toast.error("City Name is required.");
    }
    if (meetupType === "campaign_city" && !campaignId) {
      return toast.error("Please select a parent Flagship Campaign.");
    }

    setLoading(true);
    try {
      let imageUrl = "";
      if (image.base64) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [image.base64], folder: "city_meetups" }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Image upload failed");
        imageUrl = uploadData.links?.[0] || "";
      }

      const mainSecName =
        sections.find((s) => s.id === selectedSectionId)?.name || "";
      const subSecName =
        subSections.find((s) => s.id === selectedSubSectionId)?.name || "";

      const payload = {
        meetupType,
        campaignId: meetupType === "campaign_city" ? campaignId : null,
        cityName: formData.cityName.trim(),
        cityKey: formData.cityKey || null,
        mapX: typeof formData.mapX === "number" ? formData.mapX : null,
        mapY: typeof formData.mapY === "number" ? formData.mapY : null,
        title: formData.title.trim(),
        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue.trim(),
        capacity: formData.capacity !== "" ? Number(formData.capacity) : 0,
        registrationOpen: Boolean(formData.registrationOpen),
        registrationDeadline: formData.registrationDeadline,
        status: formData.status,
        whatsappGroupLink: formData.whatsappGroupLink.trim(),
        // Legacy archive-compatible fields
        mainSection: mainSecName,
        subSection: subSecName,
        color: formData.color,
        img: imageUrl,
        participants: formData.participants !== "" ? Number(formData.participants) : 0,
        summary: formData.summary,
        instagramHandle: formData.instagramHandle,
        link: formData.link,
        galleryLink: formData.galleryLink,
        photos: sanitizeMediaUrls(formData.photos),
        videos: sanitizeMediaUrls(formData.videos),
        graphData: formData.graphData,
      };

      const apiRes = await fetch("/api/city-meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        throw new Error(resData.error || "Failed to save city meetup");
      }

      toast.success(
        meetupType === "campaign_city"
          ? `${formData.cityName} added to campaign!`
          : `Standalone meetup for ${formData.cityName} created!`
      );

      if (meetupType === "campaign_city" && campaignId) {
        router.push(`/admin/city-meetups/campaigns/${campaignId}`);
      } else {
        router.push("/admin/city-meetups");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const lockedCampaignObj = campaigns.find((c) => c.id === lockedCampaignId);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AdminPageHeader
        title={
          lockedCampaignId
            ? `Add City Event${lockedCampaignObj ? ` — ${lockedCampaignObj.title}` : ""}`
            : "Create City Meetup"
        }
        description={
          lockedCampaignId
            ? "Add an independent city event under this flagship campaign with its own date, venue, capacity, and status."
            : "Create a Standalone City Meetup or link a new city event under an existing Flagship Campaign."
        }
        breadcrumbs={
          lockedCampaignId
            ? [
                { label: "Dashboard", href: "/admin" },
                { label: "City Meetups", href: "/admin/city-meetups" },
                {
                  label: lockedCampaignObj?.title || "Campaign",
                  href: `/admin/city-meetups/campaigns/${lockedCampaignId}`,
                },
                { label: "Add City" },
              ]
            : [
                { label: "Dashboard", href: "/admin" },
                { label: "City Meetups", href: "/admin/city-meetups" },
                { label: "Add Meetup" },
              ]
        }
      />

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 sm:p-6">
        <form onSubmit={handleUploadAndSave} className="space-y-6">
          {/* MEETUP TYPE & PARENT CAMPAIGN ASSOCIATION */}
          {lockedCampaignId ? (
            <div className="rounded-xl border border-[#3B001B]/20 bg-[#3B001B]/5 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SparklesIcon className="size-5 text-[#3B001B] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3B001B]">
                    Linked Flagship Campaign
                  </p>
                  <p className="text-base font-bold text-stone-900 truncate">
                    {lockedCampaignObj?.title || "Parent Campaign"}
                    {lockedCampaignObj?.edition ? ` · ${lockedCampaignObj.edition}` : ""}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-stone-200 text-stone-600 shrink-0">
                <LockIcon className="size-3" /> Locked
              </span>
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="space-y-2">
                <Label>Meetup Type *</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMeetupType("standalone");
                      setCampaignId("");
                    }}
                    className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-all ${
                      meetupType === "standalone"
                        ? "bg-[#3B001B] text-white border-[#3B001B] shadow-xs"
                        : "bg-white text-stone-800 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <p className="text-sm font-bold">Standalone City Meetup</p>
                    <p
                      className={`text-xs ${
                        meetupType === "standalone"
                          ? "text-amber-100/90"
                          : "text-stone-500"
                      }`}
                    >
                      Independent city event (no parent campaign)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMeetupType("campaign_city")}
                    className={`min-h-[48px] px-4 py-2.5 rounded-xl border text-left transition-all ${
                      meetupType === "campaign_city"
                        ? "bg-[#3B001B] text-white border-[#3B001B] shadow-xs"
                        : "bg-white text-stone-800 border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <p className="text-sm font-bold">Flagship Campaign City</p>
                    <p
                      className={`text-xs ${
                        meetupType === "campaign_city"
                          ? "text-amber-100/90"
                          : "text-stone-500"
                      }`}
                    >
                      City event belonging to a flagship campaign
                    </p>
                  </button>
                </div>
              </div>

              {meetupType === "campaign_city" && (
                <div className="space-y-1.5">
                  <Label htmlFor="campaignSelect">Parent Flagship Campaign *</Label>
                  <select
                    id="campaignSelect"
                    required
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full min-h-[48px] md:min-h-[40px] px-3 py-2 rounded-lg border border-input bg-white text-base md:text-sm"
                  >
                    <option value="">-- Select Flagship Campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || c.city}
                        {c.edition ? ` (${c.edition})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* CORE CITY EVENT DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CityLocationSelect
              value={formData.cityName}
              cityKey={formData.cityKey}
              onSelect={({ cityName, cityKey, mapX, mapY }) =>
                setFormData({
                  ...formData,
                  cityName,
                  cityKey,
                  mapX,
                  mapY,
                })
              }
            />

            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g. Mumbai Garba & Chai Meetup"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eventDate">Event Date</Label>
              <Input
                id="eventDate"
                type="date"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.eventDate}
                onChange={(e) =>
                  setFormData({ ...formData, eventDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="venue">Venue / Meeting Point</Label>
            <Input
              id="venue"
              placeholder="e.g. Carter Road Amphitheatre, Bandra West"
              className="text-base md:text-sm min-h-[48px] md:min-h-0"
              value={formData.venue}
              onChange={(e) =>
                setFormData({ ...formData, venue: e.target.value })
              }
            />
          </div>

          {/* CAPACITY, STATUS & REGISTRATION SETTINGS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (0 = Unlimited)</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
                placeholder="e.g. 50"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Event Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full min-h-[48px] md:min-h-[40px] px-3 py-2 rounded-md border border-input bg-background text-base md:text-sm"
              >
                {MEETUP_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="registrationDeadline">Registration Deadline</Label>
              <Input
                id="registrationDeadline"
                type="datetime-local"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.registrationDeadline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registrationDeadline: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-stone-50 border border-stone-200/80">
            <div>
              <p className="text-sm font-semibold text-stone-900">
                Registration Open
              </p>
              <p className="text-xs text-stone-500">
                Controls whether students can RSVP when the event is published.
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.registrationOpen}
              onChange={(e) =>
                setFormData({ ...formData, registrationOpen: e.target.checked })
              }
              className="size-5 accent-[#3B001B] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsappGroupLink">
                WhatsApp / Community Link (Optional)
              </Label>
              <Input
                id="whatsappGroupLink"
                type="url"
                placeholder="https://chat.whatsapp.com/..."
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.whatsappGroupLink}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsappGroupLink: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coverImg">Cover Image (Optional)</Label>
              <Input
                id="coverImg"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {image.preview && (
                <img
                  src={image.preview}
                  alt="Cover Preview"
                  className="h-28 w-full object-cover rounded-xl border mt-2"
                />
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">Meetup Summary / Description</Label>
            <textarea
              id="summary"
              rows={3}
              placeholder="Highlights, agenda, or meetup briefing..."
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base md:text-sm"
            />
          </div>

          {/* COLLAPSIBLE ARCHIVE, TAXONOMY & MEDIA SECTION */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowArchiveSection((prev) => !prev)}
              className="w-full min-h-[48px] px-4 py-3 bg-stone-50 flex items-center justify-between text-sm font-semibold text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <span>Archive Sections, Media Gallery & Analytics (Optional)</span>
              <ChevronDownIcon
                className={`size-4 transition-transform ${
                  showArchiveSection ? "rotate-180" : ""
                }`}
              />
            </button>

            {showArchiveSection && (
              <div className="p-4 space-y-5 border-t border-stone-200">
                {/* Main Section */}
                <div className="space-y-2">
                  <Label>Legacy Main Section</Label>
                  {isAddingSection ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="New section name"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                      />
                      <Button type="button" onClick={handleAddSection} size="icon">
                        <CheckIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddingSection(false)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  ) : isEditingSection ? (
                    <div className="flex gap-2">
                      <Input
                        value={editingSectionName}
                        onChange={(e) => setEditingSectionName(e.target.value)}
                      />
                      <Button type="button" onClick={handleUpdateSection} size="icon">
                        <CheckIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsEditingSection(false)}
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={selectedSectionId}
                        onValueChange={setSelectedSectionId}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Optional main section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsAddingSection(true)}
                      >
                        <PlusIcon className="size-4" />
                      </Button>
                      {selectedSectionId && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const found = sections.find(
                                (s) => s.id === selectedSectionId
                              );
                              setEditingSectionName(found?.name || "");
                              setIsEditingSection(true);
                            }}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={handleDeleteSection}
                          >
                            <TrashIcon className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub Section */}
                {selectedSectionId && (
                  <div className="space-y-2">
                    <Label>Legacy Sub-Section</Label>
                    {isAddingSubSection ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="New sub-section name"
                          value={newSubSectionName}
                          onChange={(e) => setNewSubSectionName(e.target.value)}
                        />
                        <Button
                          type="button"
                          onClick={handleAddSubSection}
                          size="icon"
                        >
                          <CheckIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsAddingSubSection(false)}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ) : isEditingSubSection ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingSubSectionName}
                          onChange={(e) =>
                            setEditingSubSectionName(e.target.value)
                          }
                        />
                        <Button
                          type="button"
                          onClick={handleUpdateSubSection}
                          size="icon"
                        >
                          <CheckIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsEditingSubSection(false)}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select
                          value={selectedSubSectionId}
                          onValueChange={setSelectedSubSectionId}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Optional sub-section" />
                          </SelectTrigger>
                          <SelectContent>
                            {subSections.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setIsAddingSubSection(true)}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                        {selectedSubSectionId && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const found = subSections.find(
                                  (s) => s.id === selectedSubSectionId
                                );
                                setEditingSubSectionName(found?.name || "");
                                setIsEditingSubSection(true);
                              }}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={handleDeleteSubSection}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="color">Card Color</Label>
                    <input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-14 h-10 p-1 rounded border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="participants">Historical Participants</Label>
                    <Input
                      id="participants"
                      type="number"
                      min={0}
                      value={formData.participants}
                      onChange={(e) =>
                        setFormData({ ...formData, participants: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="instagramHandle">Instagram Handle</Label>
                    <Input
                      id="instagramHandle"
                      placeholder="@boundless_iitm"
                      value={formData.instagramHandle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          instagramHandle: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="link">Instagram / Recap Link</Label>
                    <Input
                      id="link"
                      type="url"
                      placeholder="https://instagram.com/..."
                      value={formData.link}
                      onChange={(e) =>
                        setFormData({ ...formData, link: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="galleryLink">External Gallery Link</Label>
                    <Input
                      id="galleryLink"
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={formData.galleryLink}
                      onChange={(e) =>
                        setFormData({ ...formData, galleryLink: e.target.value })
                      }
                    />
                  </div>
                </div>

                <MediaFileUpload
                  label="Glimpses Photos"
                  mediaType="image"
                  folder="city_meetups"
                  urls={formData.photos}
                  onChange={(urls) => setFormData({ ...formData, photos: urls })}
                />
                <MediaFileUpload
                  label="Glimpses Videos"
                  mediaType="video"
                  folder="city_meetups"
                  urls={formData.videos}
                  onChange={(urls) => setFormData({ ...formData, videos: urls })}
                />

                {/* Graph Data */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Archive Statistics (Pie Chart Data)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGraphEntry}
                    >
                      <PlusIcon className="size-3.5 mr-1" /> Add Row
                    </Button>
                  </div>
                  {(formData.graphData || []).map((entry, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="Label (e.g. Foundation)"
                        value={entry.x}
                        onChange={(e) =>
                          handleGraphValueChange(idx, "x", e.target.value)
                        }
                      />
                      <Input
                        placeholder="Value"
                        value={entry.y}
                        onChange={(e) =>
                          handleGraphValueChange(idx, "y", e.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGraphEntry(idx)}
                      >
                        <TrashIcon className="size-4 text-rose-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] md:min-h-0 text-base md:text-sm"
              onClick={() =>
                lockedCampaignId
                  ? router.push(`/admin/city-meetups/campaigns/${lockedCampaignId}`)
                  : router.push("/admin/city-meetups")
              }
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 min-h-[48px] md:min-h-0 bg-[#3B001B] hover:bg-[#46001D] text-white text-base md:text-sm font-semibold"
            >
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {loading
                ? "Saving..."
                : meetupType === "campaign_city"
                ? "Add City Event to Campaign"
                : "Create Standalone Meetup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddCityMeetupPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-stone-500">
          Loading meetup form...
        </div>
      }
    >
      <AddCityMeetupContent />
    </Suspense>
  );
}
