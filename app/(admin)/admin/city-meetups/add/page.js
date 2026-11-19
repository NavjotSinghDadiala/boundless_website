"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TrashIcon, PlusIcon, XIcon, CheckIcon, Loader2Icon, PencilIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MediaFileUpload from "@/components/MediaFileUpload";
import { sanitizeMediaUrls } from "@/lib/previous-trip-media";

export default function AddCityMeetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // -- MAIN SECTION STATE --
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [isEditingSection, setIsEditingSection] = useState(false);
  const [editingSectionName, setEditingSectionName] = useState("");

  // -- SUB SECTION STATE --
  const [subSections, setSubSections] = useState([]);
  const [selectedSubSectionId, setSelectedSubSectionId] = useState("");
  const [isAddingSubSection, setIsAddingSubSection] = useState(false);
  const [newSubSectionName, setNewSubSectionName] = useState("");
  const [isEditingSubSection, setIsEditingSubSection] = useState(false);
  const [editingSubSectionName, setEditingSubSectionName] = useState("");

  // -- FORM DATA STATE --
  const [formData, setFormData] = useState({
    cityName: "",
    color: "#FFD700",
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

  // -- IMAGE STATE --
  const [image, setImage] = useState({ file: null, preview: null, base64: null });

  // 1. Fetch data on load
  const fetchData = async () => {
    try {
      const secRes = await fetch("/api/city-meetups/meetup-sections");
      const secData = await secRes.json();
      if (secRes.ok) setSections(secData.sections || []);
    } catch (error) {
      toast.error("Failed to load sections data");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When main section changes, fetch sub-sections belonging to it
  useEffect(() => {
    const fetchSubSectionsForSection = async () => {
      if (!selectedSectionId) {
        setSubSections([]);
        setSelectedSubSectionId("");
        return;
      }

      try {
        const res = await fetch(`/api/city-meetups/meetup-sub-sections?sectionId=${selectedSectionId}`);
        const data = await res.json();
        if (res.ok) setSubSections(data.subSections || []);
      } catch (error) {
        toast.error("Failed to load sub-sections for selected section");
      }
    };

    fetchSubSectionsForSection();
  }, [selectedSectionId]);

  // 2. Handlers for Main Section
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
        setNewSectionName(""); setIsAddingSection(false);
        await fetchData();
        setSelectedSectionId(data.id);
      } else throw new Error(data.error);
    } catch (error) { toast.error("Failed to create section"); }
  };

  const handleStartEditSection = () => {
    const selectedSection = sections.find((section) => section.id === selectedSectionId);
    if (!selectedSection) return toast.error("Select a section first");
    setEditingSectionName(selectedSection.name || "");
    setIsEditingSection(true);
    setIsAddingSection(false);
  };

  const handleUpdateSection = async () => {
    if (!selectedSectionId) return toast.error("Select a section first");
    if (!editingSectionName.trim()) return toast.error("Section name cannot be empty");

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
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update section");
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSectionId || !confirm("Delete this main section?")) return;
    try {
      const res = await fetch(`/api/city-meetups/meetup-sections/${selectedSectionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Main Section removed");
        setSelectedSectionId("");
        fetchData();
      } else throw new Error("Failed to delete");
    } catch (error) { toast.error(error.message); }
  };

  // 3. Handlers for Sub Section
  const handleAddSubSection = async () => {
    if (!newSubSectionName.trim()) return toast.error("Sub-section name cannot be empty");
    if (!selectedSectionId) return toast.error("Select a main section before adding a sub-section");
    try {
      const res = await fetch("/api/city-meetups/meetup-sub-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSubSectionName, sectionId: selectedSectionId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Sub Section added!");
        setNewSubSectionName(""); setIsAddingSubSection(false);
        // Refresh sub-sections for the current section and select the new one
        const secRes = await fetch(`/api/city-meetups/meetup-sub-sections?sectionId=${selectedSectionId}`);
        const secData = await secRes.json();
        if (secRes.ok) setSubSections(secData.subSections || []);
        setSelectedSubSectionId(data.id);
      } else throw new Error(data.error);
    } catch (error) { toast.error("Failed to create sub-section"); }
  };

  const handleStartEditSubSection = () => {
    const selectedSubSection = subSections.find((subSection) => subSection.id === selectedSubSectionId);
    if (!selectedSubSection) return toast.error("Select a sub-section first");
    setEditingSubSectionName(selectedSubSection.name || "");
    setIsEditingSubSection(true);
    setIsAddingSubSection(false);
  };

  const handleUpdateSubSection = async () => {
    if (!selectedSubSectionId) return toast.error("Select a sub-section first");
    if (!editingSubSectionName.trim()) return toast.error("Sub-section name cannot be empty");

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
        const secRes = await fetch(`/api/city-meetups/meetup-sub-sections?sectionId=${selectedSectionId}`);
        const secData = await secRes.json();
        if (secRes.ok) setSubSections(secData.subSections || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update sub-section");
    }
  };

  const handleDeleteSubSection = async () => {
    if (!selectedSubSectionId || !confirm("Delete this sub-section?")) return;
    try {
      const res = await fetch(`/api/city-meetups/meetup-sub-sections/${selectedSubSectionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Sub Section removed");
        setSelectedSubSectionId("");
        fetchData();
      } else throw new Error("Failed to delete");
    } catch (error) { toast.error(error.message); }
  };

 // 4. Handle File Change
const handleFileChange = (e) => {
  // Corrected line: added after the optional chaining operator
  const file = e.target.files?.[0]; 
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => {
       setImage({ file, preview: reader.result, base64: reader.result });
    };
    reader.readAsDataURL(file);
   }
  };

  // 5. Final Form Submission
  const handleUploadAndSave = async (e) => {
    e.preventDefault();

    const selectedSection = sections.find((s) => s.id === selectedSectionId);
    const selectedSubSection = subSections.find((s) => s.id === selectedSubSectionId);

    if (!selectedSection || !selectedSubSection) {
      toast.error("Please select or create both a Main Section and a Sub Section.");
      return;
    }

    if (!image.base64) {
      toast.error("Please select an image first.");
      return;
    }

    setLoading(true);

    try {
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [image.base64],
          folder: "city_meetups"
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
      const imageUrl = uploadData.links?.[0];

      // 2. Save to DB
      const apiRes = await fetch("/api/city-meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainSection: selectedSection.name, 
          subSection: selectedSubSection.name,
          cityName: formData.cityName,
          color: formData.color,
          venue: formData.venue,
          participants: formData.participants,
          summary: formData.summary,
          instagramHandle: formData.instagramHandle,
          link: formData.link,
          galleryLink: formData.galleryLink,
          photos: sanitizeMediaUrls(formData.photos),
          videos: sanitizeMediaUrls(formData.videos),
          graphData: formData.graphData,
          img: imageUrl,
        }),
      });

      if (!apiRes.ok) throw new Error("Failed to save meetup to database");

      toast.success("City Meetup added successfully!");
      router.push("/admin/city-meetups");

    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card text-card-foreground rounded-xl shadow-sm mt-10 border border-border">
      <h1 className="text-2xl font-bold mb-6">Add City Meetup Photo</h1>
      
      <form onSubmit={handleUploadAndSave} className="space-y-6">
        
        {/* MAIN SECTION SELECTOR */}
        <div className="space-y-2 p-4 border rounded-md bg-muted/30">
          <Label>Main Section</Label>
          {isAddingSection ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Name (e.g. Tri-Colour Trails)"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                autoFocus
              />
              <Button type="button" onClick={handleAddSection} size="icon" variant="default">
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button type="button" onClick={() => setIsAddingSection(false)} size="icon" variant="ghost">
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : isEditingSection ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Edit section name"
                value={editingSectionName}
                onChange={(e) => setEditingSectionName(e.target.value)}
                autoFocus
              />
              <Button type="button" onClick={handleUpdateSection} size="icon" variant="default">
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsEditingSection(false);
                  setEditingSectionName("");
                }}
                size="icon"
                variant="ghost"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                  <SelectTrigger><SelectValue placeholder="Select a main section" /></SelectTrigger>
                  <SelectContent>
                    {sections.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No sections found</div>}
                    {sections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingSection(true)} title="Add New">
                <PlusIcon className="h-4 w-4" />
              </Button>
              {selectedSectionId && (
                <Button type="button" variant="outline" size="icon" onClick={handleStartEditSection} title="Edit">
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
              {selectedSectionId && (
                <Button type="button" variant="destructive" size="icon" onClick={handleDeleteSection} title="Delete">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* SUB SECTION SELECTOR */}
        <div className="space-y-2 p-4 border rounded-md bg-muted/30">
          <Label>Sub Section (Used as Heading)</Label>
          {isAddingSubSection ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Name (e.g. Tri-Colour Trails 2.0)"
                value={newSubSectionName}
                onChange={(e) => setNewSubSectionName(e.target.value)}
                autoFocus
              />
              <Button type="button" onClick={handleAddSubSection} size="icon" variant="default">
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button type="button" onClick={() => setIsAddingSubSection(false)} size="icon" variant="ghost">
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : isEditingSubSection ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Edit sub-section name"
                value={editingSubSectionName}
                onChange={(e) => setEditingSubSectionName(e.target.value)}
                autoFocus
              />
              <Button type="button" onClick={handleUpdateSubSection} size="icon" variant="default">
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setIsEditingSubSection(false);
                  setEditingSubSectionName("");
                }}
                size="icon"
                variant="ghost"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select value={selectedSubSectionId} onValueChange={setSelectedSubSectionId}>
                  <SelectTrigger><SelectValue placeholder="Select a sub section" /></SelectTrigger>
                  <SelectContent>
                    {subSections.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">No sub-sections found</div>}
                    {subSections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id}>
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={() => setIsAddingSubSection(true)} title="Add New">
                <PlusIcon className="h-4 w-4" />
              </Button>
              {selectedSubSectionId && (
                <Button type="button" variant="outline" size="icon" onClick={handleStartEditSubSection} title="Edit">
                  <PencilIcon className="h-4 w-4" />
                </Button>
              )}
              {selectedSubSectionId && (
                <Button type="button" variant="destructive" size="icon" onClick={handleDeleteSubSection} title="Delete">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* CITY NAME FIELD */}
        <div className="space-y-2">
          <Label htmlFor="cityName">City Name</Label>
          <Input
            id="cityName"
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            required
            value={formData.cityName}
            onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
          />
        </div>

        {/* COLOR PICKER */}
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

        {/* VENUE & PARTICIPANTS */}
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

        {/* SOCIAL & LINKS */}
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

        {/* GALLERY LINK */}
        <div className="space-y-2">
          <Label htmlFor="galleryLink">Gallery Link (Optional)</Label>
          <Input
            id="galleryLink"
            placeholder="e.g. /gallery/delhi or external album link"
            value={formData.galleryLink}
            onChange={(e) => setFormData({ ...formData, galleryLink: e.target.value })}
          />
        </div>

        {/* SUMMARY / RECAP */}
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

        {/* GLIMPSES GALLERY */}
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

        {/* GRAPH DATA */}
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

        {/* IMAGE UPLOAD FIELD */}
        <div className="space-y-2">
          <Label htmlFor="image">Meetup Image</Label>
          {image.preview && (
            <img src={image.preview} alt="Preview" className="h-40 object-cover rounded-md mb-2 border" />
          )}
          <Input 
            id="image" 
            type="file" 
            accept="image/*" 
            required 
            onChange={handleFileChange} 
            className="cursor-pointer file:text-foreground" 
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
          {loading ? "Saving..." : "Add City Meetup"}
        </Button>
      </form>
    </div>
  );
}