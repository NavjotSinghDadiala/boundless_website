"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
} from "lucide-react";
import MediaFileUpload from "@/components/MediaFileUpload";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";
import { AdminPageHeader, AdminLoadingState } from "@/components/admin";
import CityLocationSelect from "@/components/admin/CityLocationSelect";
import { MEETUP_STATUSES } from "@/lib/cityMeetups";

export default function EditCityMeetupPage({ params }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showArchiveSection, setShowArchiveSection] = useState(false);

  const [campaigns, setCampaigns] = useState([]);
  const [sections, setSections] = useState([]);
  const [subSections, setSubSections] = useState([]);
  const [formData, setFormData] = useState({
    meetupType: "standalone",
    campaignId: "",
    cityName: "",
    title: "",
    eventDate: "",
    startTime: "",
    endTime: "",
    venue: "",
    capacity: "",
    registrationOpen: false,
    registrationDeadline: "",
    status: "published",
    whatsappGroupLink: "",
    mainSection: "",
    subSection: "",
    color: "#FEFAE7",
    img: "",
    participants: "",
    summary: "",
    instagramHandle: "",
    link: "",
    galleryLink: "",
    photos: [],
    videos: [],
    graphData: [],
  });

  const [newImage, setNewImage] = useState({
    file: null,
    preview: null,
    base64: null,
  });

  useEffect(() => {
    if (!id || id === "undefined") return;
    const fetchData = async () => {
      try {
        const [secRes, campRes, meetupRes] = await Promise.all([
          fetch("/api/city-meetups/meetup-sections"),
          fetch("/api/meetup-campaigns"),
          fetch(`/api/city-meetups?id=${encodeURIComponent(id)}`),
        ]);

        const [secData, campData, meetupData] = await Promise.all([
          secRes.json().catch(() => ({})),
          campRes.json().catch(() => ({})),
          meetupRes.json().catch(() => ({})),
        ]);

        if (secRes.ok) setSections(secData.sections || []);
        if (campRes.ok) setCampaigns(campData.campaigns || []);

        if (meetupRes.ok && meetupData.meetup) {
          const m = meetupData.meetup;
          if (m.recordOrigin === "legacy_archive") {
            setShowArchiveSection(true);
          }

          setFormData({
            meetupType: m.meetupType || "standalone",
            campaignId: m.campaignId || "",
            cityName: m.cityName || "",
            title: m.title || "",
            eventDate: m.eventDate || "",
            startTime: m.startTime || "",
            endTime: m.endTime || "",
            venue: m.venue || "",
            capacity:
              m.capacity !== undefined && m.capacity !== null
                ? String(m.capacity)
                : "",
            registrationOpen: Boolean(m.registrationOpen),
            registrationDeadline: m.registrationDeadline || "",
            status: m.status || "published",
            whatsappGroupLink: m.whatsappGroupLink || "",
            mainSection: m.mainSection || "",
            subSection: m.subSection || "",
            color: m.color || "#FEFAE7",
            img: m.img || "",
            participants:
              m.participants !== undefined && m.participants !== null
                ? String(m.participants)
                : "",
            summary: m.summary || "",
            instagramHandle: m.instagramHandle || "",
            link: m.link || "",
            galleryLink: m.galleryLink || "",
            photos: Array.isArray(m.photos) ? m.photos : [],
            videos: Array.isArray(m.videos) ? m.videos : [],
            graphData: Array.isArray(m.graphData) ? m.graphData : [],
          });

          const matched = (secData.sections || []).find(
            (s) => s.name === (m.mainSection || "")
          );
          if (matched) {
            const subRes = await fetch(
              `/api/city-meetups/meetup-sub-sections?sectionId=${encodeURIComponent(matched.id)}`
            );
            const subData = await subRes.json().catch(() => ({}));
            if (subRes.ok) setSubSections(subData.subSections || []);
          }
        } else {
          toast.error(meetupData.error || "Meetup not found");
          router.push("/admin/city-meetups");
        }
      } catch {
        toast.error("Failed to load meetup data");
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id, router]);

  const handleMainSectionChange = async (val) => {
    setFormData((f) => ({ ...f, mainSection: val }));
    const matched = sections.find((s) => s.name === val);
    if (!matched) {
      setSubSections([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/city-meetups/meetup-sub-sections?sectionId=${encodeURIComponent(matched.id)}`
      );
      const data = await res.json();
      if (res.ok) setSubSections(data.subSections || []);
    } catch {
      // ignore
    }
  };

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setNewImage({ file, preview: reader.result, base64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.cityName.trim()) {
      return toast.error("City Name is required.");
    }
    if (formData.meetupType === "campaign_city" && !formData.campaignId) {
      return toast.error("Please select a parent Flagship Campaign.");
    }

    setLoading(true);
    try {
      let imageUrl = formData.img;

      if (newImage.base64) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: [newImage.base64],
            folder: "city_meetups",
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        imageUrl = uploadData.links?.[0];
      }

      const apiRes = await fetch("/api/city-meetups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...formData,
          campaignId:
            formData.meetupType === "campaign_city" ? formData.campaignId : null,
          capacity: formData.capacity !== "" ? Number(formData.capacity) : 0,
          participants:
            formData.participants !== "" ? Number(formData.participants) : 0,
          photos: sanitizeMediaUrls(formData.photos),
          videos: sanitizeMediaUrls(formData.videos),
          img: imageUrl,
        }),
      });

      const resData = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        throw new Error(resData.error || "Failed to update meetup");
      }

      toast.success("City meetup updated successfully!");
      if (formData.meetupType === "campaign_city" && formData.campaignId) {
        router.push(`/admin/city-meetups/campaigns/${formData.campaignId}`);
      } else {
        router.push("/admin/city-meetups");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <AdminLoadingState text="Loading meetup details..." />
      </div>
    );
  }

  const parentCampaign = campaigns.find((c) => c.id === formData.campaignId);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AdminPageHeader
        title={`Edit ${formData.cityName || "City Meetup"}`}
        description="Update this city event independently. Changes here never affect sibling cities or parent campaign branding."
        breadcrumbs={
          formData.meetupType === "campaign_city" && formData.campaignId
            ? [
                { label: "Dashboard", href: "/admin" },
                { label: "City Meetups", href: "/admin/city-meetups" },
                {
                  label: parentCampaign?.title || "Campaign",
                  href: `/admin/city-meetups/campaigns/${formData.campaignId}`,
                },
                { label: formData.cityName || "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/admin" },
                { label: "City Meetups", href: "/admin/city-meetups" },
                { label: formData.cityName || "Edit" },
              ]
        }
      />

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 sm:p-6">
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Type & Parent Campaign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
            <div className="space-y-1.5">
              <Label htmlFor="meetupType">Meetup Classification</Label>
              <select
                id="meetupType"
                value={formData.meetupType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    meetupType: e.target.value,
                    campaignId:
                      e.target.value === "standalone" ? "" : formData.campaignId,
                  })
                }
                className="w-full min-h-[48px] md:min-h-[40px] px-3 py-2 rounded-lg border border-input bg-white text-base md:text-sm"
              >
                <option value="standalone">Standalone City Meetup</option>
                <option value="campaign_city">Flagship Campaign City</option>
              </select>
            </div>

            {formData.meetupType === "campaign_city" && (
              <div className="space-y-1.5">
                <Label htmlFor="campaignId">Parent Flagship Campaign *</Label>
                <select
                  id="campaignId"
                  required
                  value={formData.campaignId}
                  onChange={(e) =>
                    setFormData({ ...formData, campaignId: e.target.value })
                  }
                  className="w-full min-h-[48px] md:min-h-[40px] px-3 py-2 rounded-lg border border-input bg-white text-base md:text-sm"
                >
                  <option value="">-- Select Campaign --</option>
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
              className="text-base md:text-sm min-h-[48px] md:min-h-0"
              value={formData.venue}
              onChange={(e) =>
                setFormData({ ...formData, venue: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (0 = Unlimited)</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
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
                Allow students to register when status is Published.
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
                WhatsApp / Community Link
              </Label>
              <Input
                id="whatsappGroupLink"
                type="url"
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
              <Label>Cover Image</Label>
              {(newImage.preview || formData.img) && (
                <img
                  src={newImage.preview || formData.img}
                  alt="Cover"
                  className="h-28 w-full object-cover rounded-xl border mb-2"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="summary">Summary / Description</Label>
            <textarea
              id="summary"
              rows={3}
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base md:text-sm"
            />
          </div>

          {/* COLLAPSIBLE ARCHIVE & MEDIA SECTION */}
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowArchiveSection((prev) => !prev)}
              className="w-full min-h-[48px] px-4 py-3 bg-stone-50 flex items-center justify-between text-sm font-semibold text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <span>Archive Sections, Media Gallery & Analytics</span>
              <ChevronDownIcon
                className={`size-4 transition-transform ${
                  showArchiveSection ? "rotate-180" : ""
                }`}
              />
            </button>

            {showArchiveSection && (
              <div className="p-4 space-y-5 border-t border-stone-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Main Section</Label>
                    <Select
                      value={formData.mainSection}
                      onValueChange={handleMainSectionChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select main section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((sec) => (
                          <SelectItem key={sec.id} value={sec.name}>
                            {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Sub Section</Label>
                    <Select
                      value={formData.subSection}
                      onValueChange={(val) =>
                        setFormData({ ...formData, subSection: val })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub section" />
                      </SelectTrigger>
                      <SelectContent>
                        {subSections.map((sec) => (
                          <SelectItem key={sec.id} value={sec.name}>
                            {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="color">Card Color</Label>
                    <input
                      id="color"
                      type="color"
                      className="w-14 h-10 p-1 rounded border"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
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
                        placeholder="Label"
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
                formData.meetupType === "campaign_city" && formData.campaignId
                  ? router.push(
                      `/admin/city-meetups/campaigns/${formData.campaignId}`
                    )
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
              {loading ? "Saving..." : "Save City Meetup"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
