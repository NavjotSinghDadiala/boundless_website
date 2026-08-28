"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SaveIcon, TvIcon, HelpCircleIcon } from "lucide-react";

export default function HomepageSettingsPage() {
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current setting
  const fetchSettings = async () => {
    try {
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

  if (loading) {
    return <div className="p-10 text-muted-foreground text-sm font-semibold">Loading homepage settings...</div>;
  }

  return (
    <div className="p-6 bg-card text-card-foreground rounded-xl border border-border shadow-sm m-4 space-y-6 max-w-4xl">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TvIcon className="h-6 w-6 text-[#3B001B]" /> Homepage Video Configuration
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure the YouTube video showcased in the circular background loop on the main landing page.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            YouTube Video URL or ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. https://www.youtube.com/watch?v=6tDnTV1wHKI"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-sm focus:border-[#3B001B]/40 focus:outline-none"
              required
            />
            <Button type="submit" disabled={saving} className="bg-[#3B001B] hover:bg-[#3B001B]/95 text-white font-bold px-6 py-2.5 rounded-xl shrink-0">
              <SaveIcon className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <HelpCircleIcon className="h-3 w-3" /> Supports full video links, watch URLs, share links (youtu.be), or straight 11-digit IDs.
          </span>
        </div>
      </form>

      {/* Video Preview */}
      {youtubeVideoId && (
        <div className="border border-border rounded-xl p-4 bg-muted/40 space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Video Preview</h3>
          <div className="relative aspect-video w-full max-w-2xl bg-black rounded-lg overflow-hidden border border-border">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              title="YouTube video player preview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            ></iframe>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground">
            Current Video ID: <span className="font-semibold text-foreground">{youtubeVideoId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
