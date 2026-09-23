"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import {
  UploadIcon,
  ImageIcon,
  Loader2Icon,
  ArrowLeftIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";

import { AdminPageHeader, AdminCard } from "@/components/admin";

export default function AdminUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [registrationLink, setRegistrationLink] = useState("");
  const [details, setDetails] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const convertToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !registrationLink.trim() || !details.trim() || !imageFile) {
      toast.error("All fields including image are required");
      return;
    }

    try {
      setLoading(true);
      const base64Image = await convertToBase64(imageFile);

      if (
        !base64Image ||
        typeof base64Image !== "string" ||
        !base64Image.startsWith("data:image")
      ) {
        throw new Error("Invalid image conversion");
      }

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: [base64Image],
          folder: "upcoming_trips",
        }),
      });

      const data = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(data.error || "Upload failed");
      }

      const imageUrl = data.images[0].secure_url || data.images[0];

      await addDoc(collection(db, "upcoming_trips"), {
        title,
        registrationLink,
        details,
        imageUrl,
        createdAt: serverTimestamp(),
      });

      toast.success("Upcoming flyer published successfully!");
      router.push("/admin/trip/upcoming");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to publish upcoming flyer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <AdminPageHeader
        title="Add Upcoming Trip Flyer"
        description="Configure a new promotional showcase flyer for the Boundless homepage."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Upcoming Flyers", href: "/admin/trip/upcoming" },
          { label: "Add Flyer" },
        ]}
        secondaryActions={
          <Link
            href="/admin/trip/upcoming"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Cancel</span>
          </Link>
        }
      />

      <AdminCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Flyer Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Manali Snow Expedition & Trek"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Registration URL *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. /trips/manali-2026 or full Google Forms link"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              value={registrationLink}
              onChange={(e) => setRegistrationLink(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Trip Details & Highlights *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Provide a concise description of the trip highlights and schedule..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Flyer Poster Image *
            </label>

            {preview ? (
              <div className="relative aspect-[16/9] max-w-md rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-colors">
                <div className="p-3 rounded-full bg-white shadow-sm border border-stone-100 text-stone-400 mb-2">
                  <UploadIcon className="size-6 text-[#3B001B]" />
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  Click to upload flyer image
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  PNG, JPG, WEBP up to 5MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3B001B] text-white text-xs sm:text-sm font-semibold hover:bg-[#46001D] disabled:opacity-50 shadow-sm transition-all"
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              <span>Publish Flyer</span>
            </button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
