"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { SaveIcon, TvIcon, HelpCircleIcon, Loader2Icon } from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminLoadingState,
} from "@/components/admin";

export default function HomepageSettingsPage() {
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current setting
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.youtubeVideoId) {
          setYoutubeVideoId(data.youtubeVideoId);
          setInputUrl(`https://www.youtube.com/watch?v=${data.youtubeVideoId}`);
        }
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to load homepage settings");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update setting
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) {
      toast.error("Please enter a YouTube video URL or ID");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeVideoId: inputUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Homepage video updated successfully!");
        if (data.youtubeVideoId) {
          setYoutubeVideoId(data.youtubeVideoId);
          setInputUrl(`https://www.youtube.com/watch?v=${data.youtubeVideoId}`);
        }
      } else {
        throw new Error(data.error || "Failed to save settings");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Homepage Settings"
        description="Configure site-wide media, global notification banners, and landing page hero video playback."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Homepage Settings" },
        ]}
      />

      {loading ? (
        <AdminLoadingState text="Loading homepage settings..." />
      ) : (
        <div className="space-y-6">
          <AdminCard
            title="Homepage Hero Video"
            subtitle="Configure the ambient loop video displayed in the background of the landing page."
            icon={TvIcon}
          >
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block">
                  YouTube Video Link or ID *
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://www.youtube.com/watch?v=6tDnTV1wHKI"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#3B001B] hover:bg-[#46001D] text-white text-xs sm:text-sm font-semibold disabled:opacity-50 shadow-sm transition-all shrink-0"
                  >
                    {saving ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SaveIcon className="size-4" />
                    )}
                    <span>Save Video</span>
                  </button>
                </div>
                <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1.5">
                  <HelpCircleIcon className="size-3.5 text-stone-400 shrink-0" />
                  <span>Supports full YouTube watch URLs, short youtu.be links, or straight 11-character video IDs.</span>
                </p>
              </div>
            </form>
          </AdminCard>

          {/* Active Video Preview */}
          {youtubeVideoId && (
            <AdminCard
              title="Active Video Live Preview"
              subtitle={`Current Embedded ID: ${youtubeVideoId}`}
              icon={TvIcon}
            >
              <div className="relative aspect-video w-full max-w-3xl rounded-xl overflow-hidden border border-stone-200 bg-black shadow-sm">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                  title="YouTube video player preview"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </AdminCard>
          )}
        </div>
      )}
    </div>
  );
}
