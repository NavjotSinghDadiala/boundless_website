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
  SelectValue 
} from "@/components/ui/select";
import { Loader2Icon, PlusIcon, TrashIcon } from "lucide-react";
import MediaFileUpload from "@/components/MediaFileUpload";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";

export default function EditCityMeetupPage({ params }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const id = resolvedParams.id; 
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [sections, setSections] = useState([]);
  const [subSections, setSubSections] = useState([]);
  const [formData, setFormData] = useState({ 
    mainSection: "", 
    subSection: "", 
    cityName: "", 
    color: "#FEFAE7", 
    img: "",
    venue: "",
    participants: "",
    summary: "",
    instagramHandle: "",
    link: "",
    galleryLink: "",
    photos: [],
    videos: [],
    graphData: [],
  });

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
  
  const [newImage, setNewImage] = useState({ file: null, preview: null, base64: null });

  useEffect(() => {
    if (!id || id === "undefined") return;
    const fetchData = async () => {
      try {
        const [secRes, meetupRes] = await Promise.all([
          fetch("/api/city-meetups/meetup-sections"),
          fetch(`/api/city-meetups?id=${id}`),
        ]);

        const secData = await secRes.json();
        const meetupData = await meetupRes.json();

        if (secRes.ok) setSections(secData.sections || []);

        if (meetupRes.ok && meetupData.meetup) {
          const mainName = meetupData.meetup.mainSection || "";
          setFormData({
            mainSection: mainName,
            subSection: meetupData.meetup.subSection || "",
            cityName: meetupData.meetup.cityName || "",
            color: meetupData.meetup.color || "#FEFAE7",
            img: meetupData.meetup.img || "",
            venue: meetupData.meetup.venue || "",
            participants: meetupData.meetup.participants !== undefined && meetupData.meetup.participants !== null ? String(meetupData.meetup.participants) : "",
            summary: meetupData.meetup.summary || "",
            instagramHandle: meetupData.meetup.instagramHandle || "",
            link: meetupData.meetup.link || "",
            galleryLink: meetupData.meetup.galleryLink || "",
            photos: Array.isArray(meetupData.meetup.photos) ? meetupData.meetup.photos : [],
            videos: Array.isArray(meetupData.meetup.videos) ? meetupData.meetup.videos : [],
            graphData: Array.isArray(meetupData.meetup.graphData) ? meetupData.meetup.graphData : [],
          });

          // Find section id for the meetup's main section name and load sub-sections for it
          const matched = (secData.sections || []).find((s) => s.name === mainName);
          if (matched) {
            try {
              const subRes = await fetch(`/api/city-meetups/meetup-sub-sections?sectionId=${matched.id}`);
              const subData = await subRes.json();
              if (subRes.ok) setSubSections(subData.subSections || []);
            } catch (err) {
              console.warn("Failed to load sub-sections for section", matched.id);
            }
          }
        }
      } catch (error) { toast.error("Failed to load data"); } 
      finally { setFetching(false); }
    };
    fetchData();
  }, [id]);

  // When user changes the selected main section, fetch sub-sections for it
  useEffect(() => {
    const loadForSelected = async () => {
      if (!formData.mainSection || sections.length === 0) return;
      const matched = sections.find((s) => s.name === formData.mainSection);
      if (!matched) {
        setSubSections([]);
        setFormData((f) => ({ ...f, subSection: "" }));
        return;
      }

      try {
        const res = await fetch(`/api/city-meetups/meetup-sub-sections?sectionId=${matched.id}`);
        const data = await res.json();
        if (res.ok) {
          setSubSections(data.subSections || []);
          // If the current subSection name is not in the new list, clear it
          if (!data.subSections?.some((ss) => ss.name === formData.subSection)) {
            setFormData((f) => ({ ...f, subSection: "" }));
          }
        }
      } catch (err) {
        console.warn("Failed to load sub-sections for selected section", matched.id);
      }
    };

    loadForSelected();
  }, [formData.mainSection, sections]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage({ file, preview: reader.result, base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.img;

      if (newImage.base64) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [newImage.base64], folder: "city_meetups" }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        imageUrl = uploadData.links?.[0];
      }

      const apiRes = await fetch(`/api/city-meetups`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...formData,
          photos: sanitizeMediaUrls(formData.photos),
          videos: sanitizeMediaUrls(formData.videos),
          img: imageUrl,
        }),
      });

      if (!apiRes.ok) throw new Error("Failed to update meetup");
      toast.success("City Meetup updated successfully!");
      router.push("/admin/city-meetups");

    } catch (error) { toast.error(error.message); } 
    finally { setLoading(false); }
  };

  if (fetching) return <div className="p-10 text-center">Loading meetup data...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card text-card-foreground rounded-xl shadow-sm mt-10 border border-border">
      <h1 className="text-2xl font-bold mb-6">Edit City Meetup</h1>
      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* Main Section */}
        <div className="space-y-2">
          <Label>Main Section</Label>
          <Select 
            value={formData.mainSection} 
            onValueChange={(val) => setFormData({ ...formData, mainSection: val })}
          >
            <SelectTrigger><SelectValue placeholder="Select a main section" /></SelectTrigger>
            <SelectContent>
              {sections.map((sec) => (
                <SelectItem key={sec.id} value={sec.name}>{sec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sub Section */}
        <div className="space-y-2">
          <Label>Sub Section</Label>
          <Select 
            value={formData.subSection} 
            onValueChange={(val) => setFormData({ ...formData, subSection: val })}
          >
            <SelectTrigger><SelectValue placeholder="Select a sub section" /></SelectTrigger>
            <SelectContent>
              {subSections.map((sec) => (
                <SelectItem key={sec.id} value={sec.name}>{sec.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Name */}
        <div className="space-y-2">
          <Label htmlFor="cityName">City Name</Label>
          <Input
            id="cityName"
            required
            value={formData.cityName}
            onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color">Card Color</Label>
          <div className="flex items-center gap-4">
            <input
              id="color"
              type="color"
              className="w-14 h-14 p-1 rounded cursor-pointer border-0"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
            <span className="text-sm text-muted-foreground uppercase">{formData.color}</span>
          </div>
        </div>

        {/* Venue & Participants */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="venue">Venue / Location</Label>
            <Input
              id="venue"
              placeholder="e.g. Connaught Place, Central Park, Delhi"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="participants">Total Participants</Label>
            <Input
              id="participants"
              type="number"
              placeholder="e.g. 35"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
            />
          </div>
        </div>

        {/* Social & Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="instagramHandle">Instagram Handle</Label>
            <Input
              id="instagramHandle"
              placeholder="e.g. @boundless_iitm"
              value={formData.instagramHandle}
              onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Instagram / Action Post Link</Label>
            <Input
              id="link"
              placeholder="e.g. https://instagram.com/p/..."
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>
        </div>

        {/* Gallery Link */}
        <div className="space-y-2">
          <Label htmlFor="galleryLink">Gallery Link (Optional)</Label>
          <Input
            id="galleryLink"
            placeholder="e.g. /gallery/delhi or external album link"
            value={formData.galleryLink}
            onChange={(e) => setFormData({ ...formData, galleryLink: e.target.value })}
          />
        </div>

        {/* Summary / Recap */}
        <div className="space-y-2">
          <Label htmlFor="summary">Summary / Description (Recap)</Label>
          <textarea
            id="summary"
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Write meetup details, highlights, experiences..."
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          />
        </div>

        {/* Glimpses Gallery */}
        <div className="p-4 border border-dashed rounded-lg space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Glimpses Gallery</h3>

          <MediaFileUpload
            label="Photos"
            inputId="glimpses-photos"
            urls={formData.photos}
            onChange={(photos) => setFormData({ ...formData, photos })}
            accept="image/*"
            resourceType="image"
            folder="city_meetups"
          />

          <MediaFileUpload
            label="Videos"
            inputId="glimpses-videos"
            urls={formData.videos}
            onChange={(videos) => setFormData({ ...formData, videos })}
            accept="video/*"
            resourceType="video"
            folder="city_meetups"
          />
        </div>

        {/* Graph Data */}
        <div className="p-4 border border-dashed rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Meetup Statistics / Graph Data</h3>
          
          {(formData.graphData || []).map((entry, index) => (
            <div key={index} className="flex items-end gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`graph-x-${index}`}>Category / Label</Label>
                <Input
                  id={`graph-x-${index}`}
                  placeholder="e.g. Foundation / Degree / Alumni"
                  value={entry.x}
                  onChange={(e) => handleGraphValueChange(index, "x", e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor={`graph-y-${index}`}>Count / Value</Label>
                <Input
                  id={`graph-y-${index}`}
                  type="number"
                  placeholder="e.g. 15"
                  value={entry.y}
                  onChange={(e) => handleGraphValueChange(index, "y", e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removeGraphEntry(index)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addGraphEntry}
            className="w-full mt-2"
          >
            <PlusIcon className="mr-2 h-4 w-4" /> Add Graph Entry
          </Button>
        </div>

        {/* Image Preview & Upload */}
        <div className="space-y-2">
          <Label>Meetup Image</Label>
          <div className="flex flex-col gap-2">
            <img 
              src={newImage.preview || formData.img} 
              alt="Preview" 
              className="h-48 w-full object-cover rounded-md border shadow-sm" 
            />
            <p className="text-xs text-muted-foreground">
              {newImage.preview ? "New image selected" : "Current image"}
            </p>
          </div>
          <Label htmlFor="image" className="mt-4 block">Replace Image (Optional)</Label>
          <Input 
            id="image" 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="cursor-pointer" 
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
          {loading ? "Updating..." : "Update City Meetup"}
        </Button>
      </form>
    </div>
  );
}