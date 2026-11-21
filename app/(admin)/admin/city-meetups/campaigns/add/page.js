"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { AdminPageHeader } from "@/components/admin";
import { CAMPAIGN_STATUSES } from "@/lib/cityMeetups";

export default function AddCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    edition: "",
    city: "",
    description: "",
    badge: "",
    status: "published",
    logo: "",
  });
  const [image, setImage] = useState({ file: null, preview: null, base64: null });
  const [logoImage, setLogoImage] = useState({ file: null, preview: null, base64: null });

  const handleFileChange = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setter({ file, preview: reader.result, base64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!image.base64) return toast.error("Please select a campaign banner image.");

    setLoading(true);
    try {
      // 1. Upload banner image
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [image.base64], folder: "meetup_campaigns" }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Banner upload failed");

      // 2. Upload optional logo image if selected
      let logoUrl = formData.logo.trim();
      if (logoImage.base64) {
        const logoRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [logoImage.base64], folder: "meetup_campaigns" }),
        });
        const logoData = await logoRes.json();
        if (!logoRes.ok) throw new Error(logoData.error || "Logo upload failed");
        logoUrl = logoData.links?.[0] || "";
      }

      // 3. Save campaign details
      const apiRes = await fetch("/api/meetup-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          city: formData.city.trim() || formData.title.trim(),
          img: uploadData.links?.[0],
          logo: logoUrl,
        }),
      });

      const resData = await apiRes.json().catch(() => ({}));
      if (apiRes.ok) {
        toast.success("Flagship campaign created! You can now add city events.");
        if (resData.id) {
          router.push(`/admin/city-meetups/campaigns/${resData.id}`);
        } else {
          router.push("/admin/city-meetups");
        }
      } else {
        throw new Error(resData.error || "Failed to save campaign");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AdminPageHeader
        title="Create Flagship Campaign"
        description="Configure campaign-level branding, edition, and banner. After creating, you'll be taken straight to the Campaign Hub to add city events."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "City Meetups", href: "/admin/city-meetups" },
          { label: "Create Campaign" },
        ]}
      />

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Campaign Title *</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Navrang 4.0"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edition">Edition (Optional)</Label>
              <Input
                id="edition"
                placeholder="e.g. Autumn 2026 / 4th Edition"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.edition}
                onChange={(e) =>
                  setFormData({ ...formData, edition: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">Homepage Slider Label (Optional)</Label>
              <Input
                id="city"
                placeholder="Defaults to Campaign Title"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
              <p className="text-xs text-stone-500">
                Displayed on the homepage campaign slider badge.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Campaign Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full min-h-[48px] md:min-h-[40px] px-3 py-2 rounded-md border border-input bg-background text-base md:text-sm"
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="badge">Badge / Tagline (Optional)</Label>
            <Input
              id="badge"
              placeholder="e.g. 15+ Cities · Flagship Series"
              className="text-base md:text-sm min-h-[48px] md:min-h-0"
              value={formData.badge}
              onChange={(e) =>
                setFormData({ ...formData, badge: e.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Campaign Description *</Label>
            <textarea
              id="description"
              required
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2.5 text-base md:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe the flagship campaign theme, vision, and highlights..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="image">Campaign Banner Image *</Label>
              {image.preview && (
                <img
                  src={image.preview}
                  alt="Banner Preview"
                  className="h-36 w-full object-cover rounded-xl border shadow-xs"
                />
              )}
              <Input
                id="image"
                type="file"
                accept="image/*"
                required
                onChange={(e) => handleFileChange(e, setImage)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUpload">Campaign Logo (Optional)</Label>
              {logoImage.preview && (
                <img
                  src={logoImage.preview}
                  alt="Logo Preview"
                  className="h-20 w-20 object-contain rounded-xl border p-1 bg-stone-50"
                />
              )}
              <Input
                id="logoUpload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setLogoImage)}
              />
              <Input
                type="url"
                placeholder="Or paste logo https:// URL"
                className="text-base md:text-sm min-h-[44px] md:min-h-0"
                value={formData.logo}
                onChange={(e) =>
                  setFormData({ ...formData, logo: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-3 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-h-[48px] md:min-h-0 text-base md:text-sm"
              onClick={() => router.push("/admin/city-meetups")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 min-h-[48px] md:min-h-0 bg-[#3B001B] hover:bg-[#46001D] text-white text-base md:text-sm font-semibold"
              disabled={loading}
            >
              {loading && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {loading ? "Creating Campaign..." : "Create Campaign & Manage Cities"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
