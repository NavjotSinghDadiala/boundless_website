"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import { AdminPageHeader, AdminLoadingState } from "@/components/admin";
import { CAMPAIGN_STATUSES } from "@/lib/cityMeetups";

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    city: "",
    title: "",
    edition: "",
    description: "",
    badge: "",
    status: "published",
    logo: "",
    img: "",
  });
  const [newImage, setNewImage] = useState({ file: null, preview: null, base64: null });
  const [newLogo, setNewLogo] = useState({ file: null, preview: null, base64: null });

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/meetup-campaigns?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (res.ok && data.campaign) {
          setFormData({
            city: data.campaign.city || "",
            title: data.campaign.title || "",
            edition: data.campaign.edition || "",
            description: data.campaign.description || "",
            badge: data.campaign.badge || "",
            status: data.campaign.status || "published",
            logo: data.campaign.logo || "",
            img: data.campaign.img || "",
          });
        } else {
          throw new Error(data.error || "Failed to load campaign");
        }
      } catch (error) {
        toast.error(error.message);
        router.push("/admin/city-meetups");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchCampaign();
  }, [id, router]);

  const handleFileChange = (e, setter) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setter({ file, preview: reader.result, base64: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = formData.img;
      let logoUrl = formData.logo;

      if (newImage.base64) {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [newImage.base64], folder: "meetup_campaigns" }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Banner upload failed");
        imageUrl = uploadData.links?.[0];
      }

      if (newLogo.base64) {
        const logoRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: [newLogo.base64], folder: "meetup_campaigns" }),
        });
        const logoData = await logoRes.json();
        if (!logoRes.ok) throw new Error(logoData.error || "Logo upload failed");
        logoUrl = logoData.links?.[0];
      }

      const res = await fetch("/api/meetup-campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...formData,
          city: formData.city.trim() || formData.title.trim(),
          img: imageUrl,
          logo: logoUrl,
        }),
      });

      if (res.ok) {
        toast.success("Campaign details updated!");
        router.push(`/admin/city-meetups/campaigns/${id}`);
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update campaign");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <AdminLoadingState text="Loading campaign details..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <AdminPageHeader
        title="Edit Flagship Campaign"
        description="Update campaign-level branding and metadata. Individual city events under this campaign remain untouched."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "City Meetups", href: "/admin/city-meetups" },
          { label: formData.title || "Campaign", href: `/admin/city-meetups/campaigns/${id}` },
          { label: "Edit" },
        ]}
      />

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm p-5 sm:p-6">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Campaign Title *</Label>
              <Input
                id="title"
                required
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
                placeholder="e.g. Autumn 2026"
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
              <Label htmlFor="city">Homepage Slider Label</Label>
              <Input
                id="city"
                className="text-base md:text-sm min-h-[48px] md:min-h-0"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
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
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2.5 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Banner Image</Label>
              <img
                src={newImage.preview || formData.img || "/placeholder.jpg"}
                alt="Banner Preview"
                className="h-36 w-full object-cover rounded-xl border shadow-xs"
              />
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setNewImage)}
              />
            </div>

            <div className="space-y-2">
              <Label>Campaign Logo (Optional)</Label>
              {(newLogo.preview || formData.logo) && (
                <img
                  src={newLogo.preview || formData.logo}
                  alt="Logo Preview"
                  className="h-20 w-20 object-contain rounded-xl border p-1 bg-stone-50"
                />
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setNewLogo)}
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
              onClick={() => router.push(`/admin/city-meetups/campaigns/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:flex-1 min-h-[48px] md:min-h-0 bg-[#3B001B] hover:bg-[#46001D] text-white text-base md:text-sm font-semibold"
              disabled={saving}
            >
              {saving && <Loader2Icon className="mr-2 size-4 animate-spin" />}
              {saving ? "Updating..." : "Save Campaign Details"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
