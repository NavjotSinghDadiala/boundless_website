"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  Loader2Icon,
  GripVerticalIcon,
  XIcon,
  ImageIcon,
  UploadIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  IndianRupeeIcon,
  UsersIcon,
  PhoneIcon,
  MailIcon,
  CompassIcon,
  InfoIcon,
  BackpackIcon,
  MessageSquareIcon,
  QrCodeIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  ArchiveIcon,
  ChevronDownIcon,
  CheckIcon,
  SearchIcon,
  UserCheckIcon,
} from "lucide-react";
import * as yup from "yup";
import { toast } from "sonner";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "radio", label: "Radio" },
  { value: "select", label: "Select" },
  { value: "date", label: "Date" },
  { value: "file", label: "File" },
  { value: "email", label: "Email" },
  { value: "description_text", label: "Description Text" },
];

const tripSchema = yup.object().shape({
  name: yup.string().required("Trip name is required").trim(),
  destination: yup.string().trim().optional(),
  description: yup.string().trim().optional(),
  startDate: yup.string().trim().optional(),
  endDate: yup
    .string()
    .trim()
    .optional()
    .test("end-after-start", "End date cannot be before start date", function (value) {
      const { startDate } = this.parent || {};
      if (startDate && value && value < startDate) {
        return false;
      }
      return true;
    }),
  registrationDeadline: yup.string().trim().optional(),
  coordinators: yup
    .array()
    .of(
      yup.object().shape({
        name: yup.string().required("Coordinator name is required").trim(),
        email: yup.string().email("Invalid email").required("Coordinator email is required").trim(),
        phone: yup.string().trim().optional(),
        assignedOption: yup.string().trim().nullable().optional(),
      })
    )
    .test(
      "at-least-one",
      "At least one coordinator with name and email is required",
      (value) => value && value.some((c) => c && c.name && c.name.trim() !== "")
    ),
  totalSeats: yup
    .number()
    .typeError("Total seats must be a number")
    .required("Total seats is required")
    .positive("Total seats must be greater than 0")
    .integer("Total seats must be a whole number"),
  femaleReservedSeats: yup
    .number()
    .typeError("Female reserved seats must be a number")
    .required("Female reserved seats is required")
    .min(0, "Cannot be negative")
    .integer("Must be a whole number"),
  maleReservedSeats: yup
    .number()
    .typeError("Male reserved seats must be a number")
    .optional()
    .min(0, "Cannot be negative")
    .integer("Must be a whole number"),
  releasedSeats: yup
    .number()
    .typeError("Released seats must be a number")
    .required("Released seats is required")
    .min(0, "Cannot be negative")
    .integer("Must be a whole number"),
  releasedSeatsType: yup
    .string()
    .oneOf(["female_only", "all"], "Invalid quota type")
    .required(),
  fee: yup.number().typeError("Fee must be a number").min(0, "Fee cannot be negative").default(500),
  formFields: yup
    .array()
    .min(1, "At least one form field is required")
    .test("valid-fields", "Each form field must have a name", (value) =>
      value.every((f) => f.name && f.name.trim() !== "")
    )
    .test(
      "radio-select-options",
      "Radio and Select fields must have at least one option",
      (value) =>
        value.every((f) => {
          if (f.type === "radio" || f.type === "select") {
            return (
              f.options &&
              f.options.length > 0 &&
              f.options.some((opt) => opt && opt.trim() !== "")
            );
          }
          return true;
        })
    ),
  whatsappLink: yup.string().trim().optional(),
  qrCodeUrl: yup.string().trim().optional(),
  itinerary: yup
    .array()
    .of(
      yup.object().shape({
        day: yup.string().trim().optional(),
        title: yup.string().trim().optional(),
        description: yup.string().trim().optional(),
      })
    )
    .optional(),
  importantInformation: yup.string().trim().optional(),
  thingsToCarry: yup.array().of(yup.string().trim()).optional(),
});

function generateId() {
  return crypto.randomUUID();
}

function DragHandle({ id }) {
  const { attributes, listeners } = useSortable({ id });

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-8 cursor-grab text-muted-foreground hover:bg-transparent active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-4" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function SortableFieldRow({ field, onUpdate, onDelete, hasError }) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showOptions = field.type === "radio" || field.type === "select";
  const options = field.options || [];

  const addOption = () => {
    onUpdate(field.id, { options: [...options, ""] });
  };

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onUpdate(field.id, { options: newOptions });
  };

  const removeOption = (index) => {
    if (options.length > 1) {
      onUpdate(field.id, { options: options.filter((_, i) => i !== index) });
    }
  };

  const handleTypeChange = (newType) => {
    const updates = { type: newType };
    if (newType === "radio" || newType === "select") {
      if (!field.options || field.options.length === 0) {
        updates.options = [""];
      }
    } else {
      updates.options = undefined;
    }
    onUpdate(field.id, updates);
  };

  const hasOptionsError =
    hasError &&
    showOptions &&
    (!options.length || !options.some((opt) => opt && opt.trim() !== ""));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      } ${hasError ? "border-destructive" : ""}`}
    >
      <div className="flex items-center gap-3">
        <DragHandle id={field.id} />

        <div className="flex-1">
          <Input
            placeholder="Field name"
            value={field.name}
            onChange={(e) => onUpdate(field.id, { name: e.target.value })}
            className={`h-9 ${
              hasError && !field.name ? "border-destructive" : ""
            }`}
          />
        </div>

        <div className="w-40">
          <Select value={field.type} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(field.id)}
        >
          <Trash2Icon className="size-4" />
          <span className="sr-only">Delete field</span>
        </Button>
      </div>

      {showOptions && (
        <div className="ml-11 mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Options</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addOption}
              className="h-7 gap-1 text-xs"
            >
              <PlusIcon className="size-3" />
              Add Option
            </Button>
          </div>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className={`h-8 text-sm ${
                    hasOptionsError && !option ? "border-destructive" : ""
                  }`}
                />
                {options.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {hasOptionsError && (
            <p className="text-xs text-destructive">
              At least one option is required
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SortableImage({ image, onRemove }) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden rounded-lg border bg-muted ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <img
        src={image.preview || image.url}
        alt={`Trip photo ${image.sortOrder + 1}`}
        className="h-full w-full cursor-grab object-cover active:cursor-grabbing"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute right-1 top-1 size-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
      >
        <XIcon className="size-3" />
      </Button>
      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white font-mono">
        {image.sortOrder + 1}
      </div>
    </div>
  );
}

const getDocumentUrl = (url) => {
  if (!url) return "#";
  if (url.includes("res.cloudinary.com")) {
    return `/api/downloadProxy/custom_file?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// ─── Coordinator Picker Row ────────────────────────────────────────────────
// Uses a fixed-position dropdown so it escapes overflow:hidden parent cards.
function CoordinatorPickerRow({
  coordinator,
  index,
  registeredCoordinators,
  canRemove,
  onSelect,
  onUpdate,
  onRemove,
  nameError,
  emailError,
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [dropdownStyle, setDropdownStyle] = React.useState({});
  const buttonRef = React.useRef(null);

  // Position dropdown using fixed coords from button bounds, constrained to viewport on mobile
  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = typeof window !== "undefined" ? window.innerWidth : 360;
    const margin = 12;
    const width = Math.min(rect.width, vw - margin * 2);
    let left = rect.left;
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - width - margin);
    }
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: Math.max(margin, left),
      width: width,
      maxWidth: "calc(100vw - 24px)",
      zIndex: 9999,
    });
  }, []);

  const openDropdown = () => {
    updatePosition();
    setOpen(true);
    setSearch("");
  };

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = registeredCoordinators.filter((rc) => {
    const q = search.toLowerCase();
    return (
      rc.name?.toLowerCase().includes(q) ||
      rc.email?.toLowerCase().includes(q) ||
      rc.studentId?.toLowerCase().includes(q)
    );
  });

  const isSelected = Boolean(coordinator.email);

  return (
    <div className="rounded-lg border border-stone-200 bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Coordinator #{index + 1}
        </span>
        {canRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}
            className="size-7 text-muted-foreground hover:text-destructive">
            <Trash2Icon className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* Dropdown */}
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-xs">Select Coordinator *</Label>
          <div data-coord-picker="true">
            <button
              ref={buttonRef}
              type="button"
              onClick={() => open ? setOpen(false) : openDropdown()}
              className={`flex w-full items-center justify-between gap-2 h-9 rounded-md border px-3 text-sm bg-background transition-colors hover:bg-accent
                ${nameError || emailError ? "border-destructive" : "border-input"}
                ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                {isSelected ? (
                  <>
                    <UserCheckIcon className="size-3.5 text-primary shrink-0" />
                    <span className="truncate font-medium">{coordinator.name}</span>
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">— {coordinator.email}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UsersIcon className="size-3.5 shrink-0" />
                    {registeredCoordinators.length === 0 ? "No registered coordinators yet" : "Choose from registered coordinators..."}
                  </span>
                )}
              </span>
              <ChevronDownIcon className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && typeof window !== "undefined" && window.document.body &&
              createPortal(
                <div
                  ref={dropdownRef}
                  data-coord-picker="true"
                  style={dropdownStyle}
                  className="rounded-md border bg-popover shadow-xl"
                >
                  <div className="flex items-center gap-2 border-b px-3 py-2">
                    <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, email or student ID..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                        {registeredCoordinators.length === 0
                          ? "No coordinators registered. Add via the Coordinators admin page first."
                          : "No coordinators match your search."}
                      </p>
                    ) : (
                      filtered.map((rc) => {
                        const selected = coordinator.email === rc.email;
                        const handlePick = (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelect(rc);
                          setOpen(false);
                          setSearch("");
                        };
                        return (
                          <button key={rc.id || rc.email} type="button"
                            onMouseDown={handlePick}
                            onClick={handlePick}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left cursor-pointer ${selected ? "bg-primary/5" : ""}`}>
                            <div className="size-7 rounded-full bg-[#3B001B]/10 text-[#3B001B] font-bold flex items-center justify-center text-[10px] shrink-0">
                              {(rc.name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{rc.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{rc.email}</p>
                            </div>
                            {rc.studentId && (
                              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5 shrink-0">
                                {rc.studentId}
                              </span>
                            )}
                            {selected && <CheckIcon className="size-4 text-primary shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>,
                window.document.body
              )
            }
          </div>
          {(nameError || emailError) && <p className="text-xs text-destructive">{nameError || emailError}</p>}
          {isSelected && coordinator.phone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
              <PhoneIcon className="size-3" /> {coordinator.phone}
            </span>
          )}
        </div>

        {/* Assigned City */}
        <div className="space-y-1">
          <Label className="text-xs">Assigned City / Option</Label>
          <Input placeholder="e.g. Chennai / Hyderabad" value={coordinator.assignedOption || ""}
            onChange={(e) => onUpdate("assignedOption", e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
    </div>
  );
}

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params?.id;

  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Form State
  const [formData, setFormData] = React.useState({
    name: "",
    destination: "",
    description: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    totalSeats: "999999",
    maleReservedSeats: "0",
    femaleReservedSeats: "0",
    releasedSeats: "0",
    releasedSeatsType: "all",
    fee: "500",
    registrationOpen: true,
    isCompleted: false,
    whatsappLink: "",
    qrCodeUrl: "",
    importantInformation: "",
    emailsDisabled: false,
    cityWhatsappSettings: {},
  });

  // Coordinators State
  const [coordinators, setCoordinators] = React.useState([]);

  // Registered Coordinators (from admin panel)
  const [registeredCoordinators, setRegisteredCoordinators] = React.useState([]);
  const [coordLoadError, setCoordLoadError] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/admin/coordinators?limit=200", {
      headers: { "x-admin-dev": "true" },
    })
      .then((r) => r.json())
      .then((data) => {
        const list = data.coordinators || (Array.isArray(data) ? data : []);
        setRegisteredCoordinators(list.filter((c) => c.active !== false));
      })
      .catch(() => setCoordLoadError(true));
  }, []);

  // Itinerary State
  const [itinerary, setItinerary] = React.useState([]);

  // Things to Carry State
  const [thingsToCarry, setThingsToCarry] = React.useState([]);

  // Consent Templates
  const [consentTemplates, setConsentTemplates] = React.useState([]);

  // Form Fields
  const [formFields, setFormFields] = React.useState([]);

  // Images
  const [images, setImages] = React.useState([]);

  // Unsaved changes warning
  React.useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Load existing trip
  React.useEffect(() => {
    async function loadTrip() {
      if (!tripId) return;
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetch("/api/trip", {
          headers: { "x-admin-dev": "true" },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load trip");

        const found = (data.trips || []).find((t) => t.id === tripId);
        if (!found) {
          throw new Error("Trip not found");
        }

        setFormData({
          name: found.name || "",
          destination: found.destination || "",
          description: found.description || "",
          startDate: found.startDate || "",
          endDate: found.endDate || "",
          registrationDeadline: found.registrationDeadline || "",
          totalSeats: String(found.totalSeats !== undefined ? found.totalSeats : "999999"),
          maleReservedSeats: String(found.maleReservedSeats !== undefined ? found.maleReservedSeats : Math.max(0, (found.totalSeats || 0) - (found.femaleReservedSeats || 0))),
          femaleReservedSeats: String(found.femaleReservedSeats || "0"),
          releasedSeats: String(found.releasedSeats || "0"),
          releasedSeatsType: found.releasedSeatsType || "all",
          fee: found.fee !== undefined ? String(found.fee) : "500",
          registrationOpen: found.registrationOpen !== false,
          isCompleted: Boolean(found.isCompleted),
          whatsappLink: found.whatsappLink || "",
          qrCodeUrl: found.qrCodeUrl || "",
          importantInformation: found.importantInformation || "",
          emailsDisabled: found.emailsDisabled || false,
          cityWhatsappSettings: found.cityWhatsappSettings || {},
        });

        // Coordinators
        if (found.coordinators && found.coordinators.length > 0) {
          setCoordinators(
            found.coordinators.map((c) => {
              if (typeof c === "object" && c !== null) {
                return {
                  id: generateId(),
                  name: c.name || "",
                  email: c.email || "",
                  phone: c.phone || "",
                  assignedOption: c.assignedOption || "",
                };
              }
              const match = String(c).match(/^(.*?)\s*\((.*?)\)$/);
              if (match) {
                return {
                  id: generateId(),
                  name: match[1].trim(),
                  email: match[2].trim(),
                  phone: "",
                  assignedOption: "",
                };
              }
              return {
                id: generateId(),
                name: String(c).trim(),
                email: "",
                phone: "",
                assignedOption: "",
              };
            })
          );
        } else {
          setCoordinators([
            { id: generateId(), name: "", email: "", phone: "", assignedOption: "" },
          ]);
        }

        // Itinerary
        if (found.itinerary && found.itinerary.length > 0) {
          setItinerary(
            found.itinerary.map((item, idx) => ({
              id: generateId(),
              day: item.day || `Day ${idx + 1}`,
              title: item.title || "",
              description: item.description || "",
            }))
          );
        } else {
          setItinerary([]);
        }

        // Things to carry
        if (found.thingsToCarry && found.thingsToCarry.length > 0) {
          setThingsToCarry(found.thingsToCarry);
        } else {
          setThingsToCarry([]);
        }

        // Consent templates
        if (found.consentTemplates && found.consentTemplates.length > 0) {
          setConsentTemplates(found.consentTemplates);
        } else if (found.consentFormTemplateUrl) {
          setConsentTemplates([
            {
              id: "legacy-consent",
              name: "Consent Form",
              templateUrl: found.consentFormTemplateUrl,
            },
          ]);
        } else {
          setConsentTemplates([]);
        }

        // Form fields
        if (found.form?.fields && found.form.fields.length > 0) {
          setFormFields(
            found.form.fields.map((f, idx) => ({
              id: f.id || generateId(),
              name: f.name || "",
              type: f.type || "short_text",
              sortOrder: f.sortOrder !== undefined ? f.sortOrder : idx,
              options: f.options || [],
            }))
          );
        } else {
          setFormFields([
            { id: generateId(), name: "", type: "short_text", sortOrder: 0 },
          ]);
        }

        // Images
        if (found.images && found.images.length > 0) {
          setImages(
            found.images.map((img, idx) => ({
              id: img.publicId || generateId(),
              url: img.url,
              preview: img.url,
              publicId: img.publicId || "",
              sortOrder: img.sortOrder !== undefined ? img.sortOrder : idx,
            }))
          );
        } else {
          setImages([]);
        }
      } catch (err) {
        setLoadError(err.message || "Failed to load trip");
      } finally {
        setIsLoading(false);
      }
    }

    loadTrip();
  }, [tripId]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const sortableId = React.useId();
  const imageSortableId = React.useId();
  const fieldIds = React.useMemo(() => formFields.map((f) => f.id), [formFields]);
  const imageIds = React.useMemo(() => images.map((i) => i.id), [images]);

  const updateField = (field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Coordinators Handlers
  const addCoordinator = () => {
    setIsDirty(true);
    setCoordinators((prev) => [
      ...prev,
      { id: generateId(), name: "", email: "", phone: "", assignedOption: "" },
    ]);
  };

  const selectRegisteredCoordinator = (rowId, registered) => {
    setIsDirty(true);
    setCoordinators((prev) =>
      prev.map((c) =>
        c.id === rowId
          ? { ...c, name: registered.name || "", email: registered.email || "", phone: registered.phone || "", studentId: registered.studentId || "" }
          : c
      )
    );
    if (errors.coordinators) setErrors((prev) => ({ ...prev, coordinators: undefined }));
  };

  const updateCoordinator = (id, field, value) => {
    setIsDirty(true);
    setCoordinators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    if (errors.coordinators) {
      setErrors((prev) => ({ ...prev, coordinators: undefined }));
    }
  };

  const removeCoordinator = (id) => {
    setIsDirty(true);
    if (coordinators.length > 1) {
      setCoordinators((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error("At least one coordinator is required");
    }
  };

  // Itinerary Handlers
  const addItineraryDay = () => {
    setIsDirty(true);
    setItinerary((prev) => [
      ...prev,
      {
        id: generateId(),
        day: `Day ${prev.length + 1}`,
        title: "",
        description: "",
      },
    ]);
  };

  const updateItineraryDay = (id, field, value) => {
    setIsDirty(true);
    setItinerary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItineraryDay = (id) => {
    setIsDirty(true);
    setItinerary((prev) => prev.filter((item) => item.id !== id));
  };

  // Things to Carry Handlers
  const addThingToCarry = () => {
    setIsDirty(true);
    setThingsToCarry((prev) => [...prev, ""]);
  };

  const updateThingToCarry = (index, value) => {
    setIsDirty(true);
    setThingsToCarry((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeThingToCarry = (index) => {
    setIsDirty(true);
    setThingsToCarry((prev) => prev.filter((_, i) => i !== index));
  };

  // Consent Templates Handlers
  const handleAddTemplateRow = () => {
    setIsDirty(true);
    setConsentTemplates((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", templateUrl: "" },
    ]);
  };

  const handleUpdateTemplateName = (id, name) => {
    setIsDirty(true);
    setConsentTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const handleUploadTemplateFile = async (e, id) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    try {
      const base64File = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj);
      });

      toast.loading("Uploading consent template...", { id: `upload-${id}` });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "consent_templates",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(data.error || "Upload failed");

      const fileUrl = data.images[0].secure_url || data.images[0];
      setConsentTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, templateUrl: fileUrl } : t))
      );
      setIsDirty(true);
      toast.success("Template file uploaded successfully!", { id: `upload-${id}` });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload template file.", { id: `upload-${id}` });
    }
  };

  const handleRemoveTemplateRow = (id) => {
    setIsDirty(true);
    setConsentTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // QR Code Upload
  const handleQrCodeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64File = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      toast.loading("Uploading QR Code image...", { id: "upload-qr" });

      const uploadRes = await fetch("/api/uploadImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [base64File],
          folder: "trip_qrs",
        }),
      });

      const data = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(data.error || "Upload failed");

      const fileUrl = data.images[0].secure_url || data.images[0];
      setFormData((prev) => ({ ...prev, qrCodeUrl: fileUrl }));
      setIsDirty(true);
      toast.success("QR Code uploaded successfully!", { id: "upload-qr" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to upload QR Code.", { id: "upload-qr" });
    }
  };

  // Form Fields Handlers
  const addFormField = () => {
    setIsDirty(true);
    const newField = {
      id: generateId(),
      name: "",
      type: "short_text",
      sortOrder: formFields.length,
    };
    setFormFields([...formFields, newField]);
    if (errors.formFields) {
      setErrors((prev) => ({ ...prev, formFields: undefined }));
    }
  };

  const updateFormField = (id, updates) => {
    setIsDirty(true);
    setFormFields(
      formFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
    if (errors.formFields) {
      setErrors((prev) => ({ ...prev, formFields: undefined }));
    }
  };

  const deleteFormField = (id) => {
    setIsDirty(true);
    if (formFields.length > 1) {
      setFormFields(
        formFields
          .filter((field) => field.id !== id)
          .map((field, index) => ({ ...field, sortOrder: index }))
      );
    } else {
      toast.error("At least one form field is required");
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setIsDirty(true);
      setFormFields((currentFields) => {
        const oldIndex = fieldIds.indexOf(active.id);
        const newIndex = fieldIds.indexOf(over.id);
        const reorderedFields = arrayMove(currentFields, oldIndex, newIndex);
        return reorderedFields.map((field, index) => ({
          ...field,
          sortOrder: index,
        }));
      });
    }
  };

  // Images Drag & Upload Handlers
  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setIsDirty(true);
      setImages((currentImages) => {
        const oldIndex = imageIds.indexOf(active.id);
        const newIndex = imageIds.indexOf(over.id);
        const reorderedImages = arrayMove(currentImages, oldIndex, newIndex);
        return reorderedImages.map((img, index) => ({
          ...img,
          sortOrder: index,
        }));
      });
    }
  };

  const processFiles = (files) => {
    const validFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length === 0) {
      toast.error("Please select valid image files");
      return;
    }

    setIsDirty(true);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          {
            id: generateId(),
            file,
            preview: e.target.result,
            data: e.target.result,
            sortOrder: prev.length,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (id) => {
    setIsDirty(true);
    setImages((prev) =>
      prev
        .filter((img) => img.id !== id)
        .map((img, index) => ({ ...img, sortOrder: index }))
    );
  };

  const uploadNewImages = async () => {
    const newImages = images.filter((img) => img.data);
    if (newImages.length === 0) {
      return images.map((img, index) => ({
        url: img.url,
        publicId: img.publicId || "",
        sortOrder: index,
      }));
    }

    toast.loading("Uploading new images...", { id: "upload-imgs" });
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: newImages.map((img) => ({ data: img.data })),
      }),
    });
    const data = await response.json();
    toast.dismiss("upload-imgs");

    if (!response.ok) {
      throw new Error(data.error || "Failed to upload images");
    }

    let newUploadIdx = 0;
    return images.map((img, index) => {
      if (img.data) {
        const uploaded = data.images[newUploadIdx++];
        return {
          url: uploaded.url,
          publicId: uploaded.publicId || "",
          sortOrder: index,
        };
      }
      return {
        url: img.url,
        publicId: img.publicId || "",
        sortOrder: index,
      };
    });
  };

  // Submit Handler
  const handleSaveTrip = async () => {
    setErrors({});
    setIsSubmitting(true);

    try {
      const activeCoordinators = coordinators.map(({ id, ...c }) => ({
        name: c.name.trim(),
        email: c.email.trim(),
        phone: String(c.phone || "").trim(),
        assignedOption: c.assignedOption ? c.assignedOption.trim() : null,
      }));

      const activeItinerary = itinerary
        .map(({ id, ...item }) => ({
          day: item.day.trim(),
          title: item.title.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.title || item.description);

      const activeThingsToCarry = thingsToCarry
        .map((t) => t.trim())
        .filter(Boolean);

      const dataToValidate = {
        ...formData,
        fee: Number(formData.fee) || 0,
        totalSeats: Number(formData.totalSeats),
        maleReservedSeats: Number(formData.maleReservedSeats || 0),
        femaleReservedSeats: Number(formData.femaleReservedSeats || 0),
        releasedSeats: Number(formData.releasedSeats || 0),
        coordinators: activeCoordinators,
        itinerary: activeItinerary,
        thingsToCarry: activeThingsToCarry,
        formFields,
      };

      await tripSchema.validate(dataToValidate, { abortEarly: false });

      const finalImages = await uploadNewImages();

      const payload = {
        tripId,
        name: formData.name.trim(),
        destination: formData.destination.trim(),
        description: formData.description.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        registrationDeadline: formData.registrationDeadline,
        registrationOpen: Boolean(formData.registrationOpen),
        isCompleted: Boolean(formData.isCompleted),
        totalSeats: Number(formData.totalSeats),
        maleReservedSeats: Number(formData.maleReservedSeats || 0),
        femaleReservedSeats: Number(formData.femaleReservedSeats || 0),
        releasedSeats: Number(formData.releasedSeats || 0),
        releasedSeatsType: formData.releasedSeatsType,
        fee: Number(formData.fee) || 0,
        whatsappLink: formData.whatsappLink.trim(),
        qrCodeUrl: formData.qrCodeUrl,
        emailsDisabled: formData.emailsDisabled || false,
        cityWhatsappSettings: formData.cityWhatsappSettings || {},
        coordinators: activeCoordinators,
        itinerary: activeItinerary,
        importantInformation: formData.importantInformation.trim(),
        thingsToCarry: activeThingsToCarry,
        consentTemplates,
        formFields,
        images: finalImages,
      };

      const response = await fetch("/api/trip", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-dev": "true" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update trip");
      }

      setIsDirty(false);
      toast.success("Trip updated successfully!");
      router.push(`/admin/trip/view/${tripId}`);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const validationErrors = {};
        error.inner.forEach((err) => {
          if (err.path) {
            validationErrors[err.path] = err.message;
          }
        });
        setErrors(validationErrors);
        toast.error("Please fix the validation errors", {
          description: error.errors?.[0] || "Some required fields are missing or invalid",
        });
      } else {
        toast.error("Failed to update trip", {
          description: error.message || "Please try again",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-destructive font-medium">{loadError}</p>
        <Button asChild variant="outline">
          <Link href="/admin/trip">
            <ArrowLeftIcon className="mr-2 size-4" /> Back to Trips
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#FAF9F6]">
      {/* Top Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-700 shrink-0">
            <Link href={`/admin/trip/view/${tripId}`}>
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-stone-900 truncate">
                Edit: {formData.name || "Untitled Trip"}
              </h1>
              {isDirty && (
                <Badge variant="outline" className="hidden sm:inline-flex text-amber-800 border-amber-300 bg-amber-50 text-[10px] font-semibold shrink-0">
                  Unsaved
                </Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 font-mono truncate">ID: {tripId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs px-2.5 sm:px-3 h-8 sm:h-9">
            <Link href={`/admin/trip/view/${tripId}`}>Cancel</Link>
          </Button>
          <Button
            onClick={handleSaveTrip}
            disabled={isSubmitting}
            size="sm"
            className="bg-[#3B001B] hover:bg-[#46001D] text-white shadow-sm font-semibold text-xs px-3 sm:px-4 h-8 sm:h-9"
          >
            {isSubmitting ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 size-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#FAF9F6]">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8">

          {/* TRIP STATUS CONTROLS */}
          <Card className="border-primary/30 bg-primary/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-primary" />
                Trip Lifecycle & Registration Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <div>
                    <Label className="text-sm font-medium">Registration Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Controls if students can register on the public trip page
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={formData.registrationOpen ? "default" : "secondary"}
                    size="sm"
                    onClick={() => updateField("registrationOpen", !formData.registrationOpen)}
                  >
                    {formData.registrationOpen ? "Open" : "Closed"}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <div>
                    <Label className="text-sm font-medium">Trip Archive Status</Label>
                    <p className="text-xs text-muted-foreground">
                      Mark as completed after the expedition returns
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={formData.isCompleted ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => updateField("isCompleted", !formData.isCompleted)}
                  >
                    {formData.isCompleted ? "Completed" : "Active"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* SECTION 1: BASIC INFORMATION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CompassIcon className="size-5 text-primary" />
                1. Basic Information
              </CardTitle>
              <CardDescription>Primary identification and overview of the expedition</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Trip Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Gokarna Beach Trek & Camping"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination" className="flex items-center gap-1.5">
                    <MapPinIcon className="size-3.5 text-muted-foreground" />
                    Destination Location
                  </Label>
                  <Input
                    id="destination"
                    placeholder="e.g. Gokarna, Karnataka"
                    value={formData.destination}
                    onChange={(e) => updateField("destination", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Trip Overview & Description</Label>
                <textarea
                  id="description"
                  rows={4}
                  placeholder="Provide an enticing overview of what students will experience on this trip..."
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: DATES & TIMING */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarIcon className="size-5 text-primary" />
                2. Dates & Schedule
              </CardTitle>
              <CardDescription>Trip schedule dates and student registration closure deadline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Expedition Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateField("startDate", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Expedition End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => updateField("endDate", e.target.value)}
                    className={errors.endDate ? "border-destructive" : ""}
                  />
                  {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationDeadline" className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 text-muted-foreground" />
                    Registration Deadline
                  </Label>
                  <Input
                    id="registrationDeadline"
                    type="date"
                    value={formData.registrationDeadline}
                    onChange={(e) => updateField("registrationDeadline", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: TRIP MEDIA & GALLERY */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ImageIcon className="size-5 text-primary" />
                3. Trip Photos & Gallery
              </CardTitle>
              <CardDescription>High quality photos shown in the hero carousel and public gallery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  isDraggingOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="mb-2 size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Drop images here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload multiple photos. Drag items below to reorder (1st image will be cover photo).
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {images.length > 0 && (
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleImageDragEnd}
                  sensors={sensors}
                  id={imageSortableId}
                >
                  <SortableContext items={imageIds} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                      {images.map((image) => (
                        <SortableImage
                          key={image.id}
                          image={image}
                          onRemove={removeImage}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* SECTION 4: CAPACITY & QUOTAS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UsersIcon className="size-5 text-primary" />
                4. Seat Capacity & Quotas
              </CardTitle>
              <CardDescription>Configure seat counts, female reservations, and release batches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="totalSeats">Total Capacity Seats *</Label>
                  <Input
                    id="totalSeats"
                    type="number"
                    value={formData.totalSeats}
                    onChange={(e) => updateField("totalSeats", e.target.value)}
                    className={errors.totalSeats ? "border-destructive" : ""}
                  />
                  {errors.totalSeats && <p className="text-xs text-destructive">{errors.totalSeats}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maleReservedSeats">Male Reserved Seats</Label>
                  <Input
                    id="maleReservedSeats"
                    type="number"
                    value={formData.maleReservedSeats}
                    onChange={(e) => updateField("maleReservedSeats", e.target.value)}
                    className={errors.maleReservedSeats ? "border-destructive" : ""}
                  />
                  {errors.maleReservedSeats && (
                    <p className="text-xs text-destructive">{errors.maleReservedSeats}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="femaleReservedSeats">Female Reserved Seats *</Label>
                  <Input
                    id="femaleReservedSeats"
                    type="number"
                    value={formData.femaleReservedSeats}
                    onChange={(e) => updateField("femaleReservedSeats", e.target.value)}
                    className={errors.femaleReservedSeats ? "border-destructive" : ""}
                  />
                  {errors.femaleReservedSeats && (
                    <p className="text-xs text-destructive">{errors.femaleReservedSeats}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="releasedSeats">Initial Released Seats *</Label>
                  <Input
                    id="releasedSeats"
                    type="number"
                    value={formData.releasedSeats}
                    onChange={(e) => updateField("releasedSeats", e.target.value)}
                    className={errors.releasedSeats ? "border-destructive" : ""}
                  />
                  {errors.releasedSeats && (
                    <p className="text-xs text-destructive">{errors.releasedSeats}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">Released Seats Quota Pool:</span>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="releasedSeatsType"
                    value="all"
                    checked={formData.releasedSeatsType === "all"}
                    onChange={(e) => updateField("releasedSeatsType", e.target.value)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">All Applicants</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="releasedSeatsType"
                    value="female_only"
                    checked={formData.releasedSeatsType === "female_only"}
                    onChange={(e) => updateField("releasedSeatsType", e.target.value)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-sm">Female Only Pool</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 5: REGISTRATION & CUSTOM FORM FIELDS */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IndianRupeeIcon className="size-5 text-primary" />
                  5. Registration Fee & Custom Form Fields
                </CardTitle>
                <CardDescription>Participant fee and questions required during registration</CardDescription>
              </div>
              <Button onClick={addFormField} size="sm" variant="outline" className="gap-1">
                <PlusIcon className="size-3.5" />
                Add Field
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-xs space-y-2 pb-2">
                <Label htmlFor="fee">Trip Fee (₹ Per Participant)</Label>
                <Input
                  id="fee"
                  type="number"
                  placeholder="500"
                  value={formData.fee}
                  onChange={(e) => updateField("fee", e.target.value)}
                  className={errors.fee ? "border-destructive" : ""}
                />
                {errors.fee && <p className="text-xs text-destructive">{errors.fee}</p>}
              </div>

              <div className="pt-2">
                <Label className="block mb-2 font-medium">Custom Form Questionnaire</Label>
                {errors.formFields && (
                  <p className="text-xs text-destructive mb-2">{errors.formFields}</p>
                )}

                <DndContext
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleDragEnd}
                  sensors={sensors}
                  id={sortableId}
                >
                  <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-3">
                      {formFields.map((field) => (
                        <SortableFieldRow
                          key={field.id}
                          field={field}
                          onUpdate={updateFormField}
                          onDelete={deleteFormField}
                          hasError={!!errors.formFields}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 6: CONSENT FORM TEMPLATES */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <InfoIcon className="size-5 text-primary" />
                  6. Consent Form Templates
                </CardTitle>
                <CardDescription>Documents students must download, fill, sign, and submit</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTemplateRow}
                className="gap-1"
              >
                <PlusIcon className="size-3.5" /> Add Consent Form
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {consentTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No consent templates attached. Click "Add Consent Form" to attach parental or medical consent forms.
                </p>
              ) : (
                consentTemplates.map((t) => (
                  <div key={t.id} className="bg-muted/40 p-3 rounded-lg border flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                          Template Name
                        </span>
                        <Input
                          placeholder="e.g. Parental Consent Form"
                          value={t.name}
                          onChange={(e) => handleUpdateTemplateName(t.id, e.target.value)}
                          className="h-8 text-xs bg-background"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                          Choose Template File (.pdf, .doc)
                        </span>
                        {t.templateUrl ? (
                          <div className="flex items-center gap-3">
                            <a
                              href={getDocumentUrl(t.templateUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              📝 View Uploaded Template ↗
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive h-6 px-2 text-[10px]"
                              onClick={() => {
                                setConsentTemplates((prev) =>
                                  prev.map((item) =>
                                    item.id === t.id ? { ...item, templateUrl: "" } : item
                                  )
                                );
                              }}
                            >
                              Replace File
                            </Button>
                          </div>
                        ) : (
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => handleUploadTemplateFile(e, t.id)}
                            className="h-8 text-xs cursor-pointer bg-background"
                          />
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive self-start mt-4"
                      onClick={() => handleRemoveTemplateRow(t.id)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SECTION 7: PRIVATE COMMUNICATION LINKS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MessageSquareIcon className="size-5 text-primary" />
                7. WhatsApp Group & Communication (Private)
              </CardTitle>
              <CardDescription>
                Confidential invite links. Strictly hidden from public visitors and only accessible by admins/approved students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsappLink">WhatsApp Group Invite Link</Label>
                  <Input
                    id="whatsappLink"
                    placeholder="https://chat.whatsapp.com/..."
                    value={formData.whatsappLink}
                    onChange={(e) => updateField("whatsappLink", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrCode">WhatsApp Group QR Code Image</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="qrCode"
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeChange}
                      className="cursor-pointer"
                    />
                    {formData.qrCodeUrl && (
                      <a
                        href={getDocumentUrl(formData.qrCodeUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-primary underline shrink-0"
                      >
                        View QR ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 8: COORDINATORS */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <PhoneIcon className="size-5 text-primary" />
                  8. Trip Coordinators
                </CardTitle>
                <CardDescription>
                  Select coordinators from registered members. Names are public on the trip page.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCoordinator} className="gap-1">
                <PlusIcon className="size-3.5" /> Add Coordinator
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {errors.coordinators && (
                <p className="text-xs text-destructive">{errors.coordinators}</p>
              )}
              {coordLoadError && (
                <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ Could not load registered coordinators.
                </p>
              )}

              {coordinators.map((c, index) => (
                <CoordinatorPickerRow
                  key={c.id}
                  coordinator={c}
                  index={index}
                  registeredCoordinators={registeredCoordinators}
                  canRemove={coordinators.length > 1}
                  onSelect={(reg) => selectRegisteredCoordinator(c.id, reg)}
                  onUpdate={(field, value) => updateCoordinator(c.id, field, value)}
                  onRemove={() => removeCoordinator(c.id)}
                  nameError={errors[`coordinators.${index}.name`]}
                  emailError={errors[`coordinators.${index}.email`]}
                />
              ))}
            </CardContent>
          </Card>

          {/* SECTION 9: ITINERARY */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CompassIcon className="size-5 text-primary" />
                  9. Day-by-Day Itinerary
                </CardTitle>
                <CardDescription>
                  Timeline rendered on the public trip detail page. Optional.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItineraryDay} className="gap-1">
                <PlusIcon className="size-3.5" /> Add Day
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {itinerary.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No itinerary days added. Click "Add Day" to detail the schedule.
                </p>
              ) : (
                itinerary.map((item, index) => (
                  <div key={item.id} className="rounded-lg border bg-card p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {item.day || `Day ${index + 1}`}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItineraryDay(item.id)}
                        className="size-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-xs">Day Label</Label>
                        <Input
                          placeholder="e.g. Day 1"
                          value={item.day}
                          onChange={(e) => updateItineraryDay(item.id, "day", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Day Title</Label>
                        <Input
                          placeholder="e.g. Arrival & Sunset Beach Trek"
                          value={item.title}
                          onChange={(e) => updateItineraryDay(item.id, "title", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description / Activities</Label>
                      <textarea
                        rows={2}
                        placeholder="Detailed schedule of activities for this day..."
                        value={item.description}
                        onChange={(e) => updateItineraryDay(item.id, "description", e.target.value)}
                        className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* SECTION 10: IMPORTANT INFORMATION */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <InfoIcon className="size-5 text-primary" />
                10. Important Information & Guidelines
              </CardTitle>
              <CardDescription>
                Travel guidelines, rules, cancellation policies, and health advisories. Rendered on public trip page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                rows={5}
                placeholder="Enter important instructions, code of conduct, medical requirements, or travel advice (paragraphs supported)..."
                value={formData.importantInformation}
                onChange={(e) => updateField("importantInformation", e.target.value)}
                className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* SECTION 11: THINGS TO CARRY */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <BackpackIcon className="size-5 text-primary" />
                  11. Things to Carry (Packing Checklist)
                </CardTitle>
                <CardDescription>
                  List of items students should pack. Displayed as a clean checklist on the public trip page.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addThingToCarry} className="gap-1">
                <PlusIcon className="size-3.5" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {thingsToCarry.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No packing checklist items added. Click "Add Item" to add suggestions.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {thingsToCarry.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder={`e.g. College ID Card, Trekking Shoes...`}
                        value={item}
                        onChange={(e) => updateThingToCarry(index, e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeThingToCarry(index)}
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Save Action */}
          <div className="flex items-center justify-between pb-12 pt-4">
            <Button asChild variant="outline" size="lg">
              <Link href={`/admin/trip/view/${tripId}`}>Cancel</Link>
            </Button>
            <Button onClick={handleSaveTrip} disabled={isSubmitting} size="lg" className="min-w-40 shadow">
              {isSubmitting ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 size-4" />
              )}
              Update Trip
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
