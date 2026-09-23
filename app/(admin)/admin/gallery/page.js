"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  UploadIcon,
  XIcon,
  ImageIcon,
  PencilIcon,
  Trash2Icon,
  CameraIcon,
  ExternalLinkIcon,
  SaveIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";

import {
  AdminPageHeader,
  AdminCard,
  AdminEmptyState,
  AdminLoadingState,
  AdminConfirmDialog,
} from "@/components/admin";

export default function AdminGallery() {
  const [gallery, setGallery] = useState([]);
  const [name, setName] = useState("");
  const [existingImgUrl, setExistingImgUrl] = useState("");
  const [newFile, setNewFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [link, setLink] = useState("");
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  /* ── Fetch All ── */
  const loadGallery = async () => {
    try {
      setPageLoading(true);
      const res = await fetch("/api/gallery");
      const data = await res.json();
      setGallery(data || []);
    } catch (err) {
      toast.error("Failed to load gallery photos");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  /* ── Process picked file ── */
  const processFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    setNewFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExistingImgUrl("");
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleFileSelect = (e) => {
    processFile(e.target.files?.[0]);
  };

  const clearImage = () => {
    setNewFile(null);
    setExistingImgUrl("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Read File → base64 data URI ── */
  const readFileAsDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Trip or photo title is required");
      return;
    }
    if (!newFile && !existingImgUrl) {
      toast.error("Please select an image file to upload");
      return;
    }

    setLoading(true);
    try {
      if (editId) {
        const body = { id: editId, name: name.trim(), link, img: existingImgUrl };

        if (newFile) {
          body.imageData = await readFileAsDataUrl(newFile);
          delete body.img;
        }

        const res = await fetch("/api/gallery", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Update failed");
        toast.success("Gallery item updated successfully!");
      } else {
        const imageData = await readFileAsDataUrl(newFile);

        const res = await fetch("/api/gallery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), imageData, link }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Create failed");
        toast.success("Photo added to gallery successfully!");
      }

      resetForm();
      loadGallery();
    } catch (err) {
      toast.error(err.message || "Failed to save photo");
    } finally {
      setLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await fetch(`/api/gallery?id=${deleteId}`, { method: "DELETE" });
      toast.success("Photo deleted from gallery");
      setDeleteId(null);
      loadGallery();
    } catch (err) {
      toast.error("Failed to delete photo");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Edit ── */
  const handleEdit = (item) => {
    setEditId(item.id);
    setName(item.name);
    setLink(item.link || "");
    setExistingImgUrl(item.img);
    setNewFile(null);
    setImagePreview(item.img);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setLink("");
    clearImage();
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <AdminPageHeader
        title="Photo Gallery Manager"
        description="Curate society memories, event photo albums, and visual highlights showcased to students."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin" },
          { label: "Gallery" },
        ]}
      />

      {/* Upload / Edit Card */}
      <AdminCard
        title={editId ? "Edit Gallery Item" : "Upload New Photo"}
        subtitle={
          editId
            ? "Update photo title, redirect link, or replace image"
            : "Add a high resolution photo with title and optional expedition link"
        }
        icon={CameraIcon}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Photo Title / Trip Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Manali Summit Glimpse 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Redirect Link (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. /trips/manali-2026"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3B001B]/20 focus:border-[#3B001B] transition-all"
              />
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Image File *
            </label>

            {imagePreview ? (
              <div className="relative aspect-[16/9] max-w-sm rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDraggingOver
                    ? "border-[#3B001B] bg-[#3B001B]/5"
                    : "border-stone-200 bg-stone-50/50 hover:bg-stone-50"
                }`}
              >
                <div className="p-3 rounded-full bg-white shadow-sm border border-stone-100 text-stone-400 mb-2">
                  <UploadIcon className="size-5 text-[#3B001B]" />
                </div>
                <span className="text-xs font-semibold text-stone-700">
                  Drop image here or click to browse
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  PNG, JPG, WEBP up to 10MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
              >
                Cancel Edit
              </button>
            )}
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
              <span>{editId ? "Update Photo" : "Upload to Gallery"}</span>
            </button>
          </div>
        </form>
      </AdminCard>

      {/* Gallery Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Published Gallery Images ({gallery.length})
          </h2>
        </div>

        {pageLoading ? (
          <AdminLoadingState type="cards" cards={6} />
        ) : gallery.length === 0 ? (
          <AdminEmptyState
            title="Gallery is Empty"
            description="No society photos uploaded yet. Use the form above to add your first photo."
            icon={ImageIcon}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-[#3B001B]/40"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 relative">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute top-2.5 left-2.5 p-1.5 rounded-full bg-white/90 text-stone-700 hover:bg-white shadow-sm transition-colors"
                      title="View target link"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  )}
                </div>

                <div className="p-3.5 flex items-center justify-between gap-2 border-t border-stone-100 bg-white">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-stone-900 truncate">
                      {item.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
                      title="Edit photo"
                    >
                      <PencilIcon className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 rounded-lg border border-stone-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                      title="Delete photo"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AdminConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Photo from Gallery?"
        description="Are you sure you want to remove this photo? It will no longer appear on the public website."
        confirmText="Delete Photo"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}