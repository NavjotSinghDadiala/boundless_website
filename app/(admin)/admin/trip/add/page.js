"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusIcon,
  Trash2Icon,
  SaveIcon,
  Loader2Icon,
  GripVerticalIcon,
  ImageIcon,
  UploadIcon,
  MapPinIcon,
  CalendarIcon,
  ClockIcon,
  IndianRupeeIcon,
  UsersIcon,
  PhoneIcon,
  CompassIcon,
  InfoIcon,
  MessageSquareIcon,
  ArrowLeftIcon,
  HelpCircleIcon,
  FileCheckIcon,
  LinkIcon,
  AlertTriangleIcon,
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
import { Badge } from "@/components/ui/badge";

// Default Mandatory Student Participation Declarations
const DEFAULT_CONSENT_STATEMENTS = [
  {
    id: "decl_iitm_disclaimer",
    text: "I understand that IIT Madras is not responsible for incidents, injuries, losses, delays, or other circumstances arising during my participation in this trip, except where applicable under law.",
    required: true,
  },
  {
    id: "decl_parent_consent",
    text: "I confirm that my parent/guardian has been informed about my participation in this trip and has provided the necessary consent.",
    required: true,
  },
  {
    id: "decl_voluntary_participation",
    text: "I confirm that I am participating voluntarily and will follow the applicable trip rules and instructions.",
    required: true,
  },
  {
    id: "decl_medical_fitness",
    text: "I confirm that I am medically and physically fit to participate in the activities scheduled for this trip.",
    required: true,
  },
  {
    id: "decl_code_of_conduct",
    text: "I understand that I am responsible for following the instructions, safety guidelines, and code of conduct communicated by the trip organizers.",
    required: true,
  },
  {
    id: "decl_info_accuracy",
    text: "I confirm that the information I have provided is accurate and complete.",
    required: true,
  },
];

const faqSchema = yup.object().shape({
  id: yup.string().required(),
  question: yup.string().trim().optional(),
  answer: yup.string().trim().optional(),
});

const consentStatementSchema = yup.object().shape({
  id: yup.string().required(),
  text: yup.string().required("Declaration text is required").trim(),
  required: yup.boolean().optional().default(true),
});

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
  registrationDeadline: yup
    .string()
    .trim()
    .optional()
    .test(
      "deadline-before-start",
      "Registration deadline must be on or before the trip start date",
      function (value) {
        const { startDate } = this.parent || {};
        if (startDate && value && value > startDate) {
          return false;
        }
        return true;
      }
    ),
  coordinators: yup
    .array()
    .of(
      yup.object().shape({
        name: yup.string().required("Coordinator name is required").trim(),
        email: yup.string().email("Invalid email").required("Coordinator IITM email is required").trim(),
        phone: yup.string().trim().optional(),
        assignedOption: yup.string().trim().nullable().optional(),
      })
    )
    .test(
      "at-least-one",
      "At least one coordinator with name and IITM email is required",
      (value) => value && value.some((c) => c && c.name && c.name.trim() !== "" && c.email && c.email.trim() !== "")
    ),
  totalSeats: yup
    .number()
    .typeError("Total capacity seats is required")
    .required("Total capacity seats is required")
    .positive("Total capacity seats must be greater than 0")
    .integer("Total capacity seats must be a whole number")
    .test(
      "seats-sum-check",
      "Male and female reserved seats cannot exceed total capacity",
      function (total) {
        const { maleReservedSeats = 0, femaleReservedSeats = 0 } = this.parent || {};
        if (total && (Number(maleReservedSeats || 0) + Number(femaleReservedSeats || 0)) > total) {
          return false;
        }
        return true;
      }
    )
    .test(
      "released-seats-check",
      "Initial released seats cannot exceed total capacity",
      function (total) {
        const { releasedSeats = 0 } = this.parent || {};
        if (total && Number(releasedSeats || 0) > total) {
          return false;
        }
        return true;
      }
    ),
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
  itineraryLink: yup.string().url("Itinerary link must be a valid URL").trim().optional(),
  faqs: yup
    .array()
    .of(faqSchema)
    .test(
      "faq-completeness",
      "FAQ items must have both a question and an answer",
      function (items) {
        if (!items || items.length === 0) return true;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const hasQ = item.question && item.question.trim().length > 0;
          const hasA = item.answer && item.answer.trim().length > 0;
          if (hasQ && !hasA) {
            return this.createError({
              path: `faqs.${i}.answer`,
              message: "Please provide an answer for this question.",
            });
          }
          if (!hasQ && hasA) {
            return this.createError({
              path: `faqs.${i}.question`,
              message: "Please provide a question.",
            });
          }
        }
        return true;
      }
    ),
  consentStatements: yup.array().of(consentStatementSchema).optional(),
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
});

function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

// Sortable FAQ Row
function SortableFaqRow({ faq, onUpdate, onDelete, errorQuestion, errorAnswer }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-stone-400 hover:text-stone-700 active:cursor-grabbing p-1"
            title="Drag to reorder"
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            FAQ Item
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(faq.id)}
          className="size-8 text-stone-400 hover:text-destructive hover:bg-rose-50"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-stone-700">Question *</Label>
          <Input
            placeholder="e.g. Is prior trekking experience required?"
            value={faq.question}
            onChange={(e) => onUpdate(faq.id, "question", e.target.value)}
            className={errorQuestion ? "border-destructive" : ""}
          />
          {errorQuestion && <p className="text-xs text-destructive">{errorQuestion}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-stone-700">Answer *</Label>
          <textarea
            rows={2}
            placeholder="e.g. No, but participants should be comfortable walking for several hours."
            value={faq.answer}
            onChange={(e) => onUpdate(faq.id, "answer", e.target.value)}
            className={`flex min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              errorAnswer ? "border-destructive" : "border-input"
            }`}
          />
          {errorAnswer && <p className="text-xs text-destructive">{errorAnswer}</p>}
        </div>
      </div>
    </div>
  );
}

// Sortable Consent Statement Row
function SortableConsentRow({ statement, onUpdate, onDelete, errorText }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: statement.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm flex items-start gap-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-stone-400 hover:text-stone-700 active:cursor-grabbing p-1 mt-1 shrink-0"
        title="Drag to reorder"
      >
        <GripVerticalIcon className="size-4" />
      </button>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Declaration Statement
            </span>
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 font-medium">
              Mandatory Checkbox
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(statement.id)}
            className="size-7 text-stone-400 hover:text-destructive hover:bg-rose-50 shrink-0"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>

        <textarea
          rows={2}
          value={statement.text}
          onChange={(e) => onUpdate(statement.id, "text", e.target.value)}
          placeholder="Enter declaration statement text students must accept..."
          className={`flex min-h-14 w-full rounded-md border bg-background px-3 py-1.5 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            errorText ? "border-destructive" : "border-input"
          }`}
        />
        {errorText && <p className="text-xs text-destructive">{errorText}</p>}
      </div>
    </div>
  );
}

// Sortable Image Thumbnail
function SortableImage({ image, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-video overflow-hidden rounded-lg border bg-muted shadow-sm"
    >
      <img
        src={image.data}
        alt={image.name}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-between p-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-white hover:text-amber-300 active:cursor-grabbing p-1"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          onClick={() => onRemove(image.id)}
          className="size-7"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>
      {image.sortOrder === 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-[#3B001B] px-1.5 py-0.5 text-[10px] font-bold text-[#FFE878]">
          Cover
        </span>
      )}
    </div>
  );
}

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

  // Reposition on scroll/resize while open
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

  // Close on outside click
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
      {/* Row header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Coordinator #{index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="size-7 text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {/* ── Coordinator Dropdown ── */}
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
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      — {coordinator.email}
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <UsersIcon className="size-3.5 shrink-0" />
                    {registeredCoordinators.length === 0
                      ? "No registered coordinators yet"
                      : "Choose from registered coordinators..."}
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
                  {/* Search */}
                  <div className="flex items-center gap-2 border-b px-3 py-2">
                    <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name, email or student ID..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Options */}
                  <div className="max-h-60 overflow-y-auto py-1">
                    {filtered.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                        {registeredCoordinators.length === 0
                          ? "No coordinators registered. Add them via the Coordinators admin page first."
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
                          <button
                            key={rc.id || rc.email}
                            type="button"
                            onMouseDown={handlePick}
                            onClick={handlePick}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left cursor-pointer ${
                              selected ? "bg-primary/5" : ""
                            }`}
                          >
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
          {(nameError || emailError) && (
            <p className="text-xs text-destructive">{nameError || emailError}</p>
          )}
          {isSelected && coordinator.phone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
              <PhoneIcon className="size-3" /> {coordinator.phone}
            </span>
          )}
        </div>

        {/* ── Assigned City / Option ── */}
        <div className="space-y-1">
          <Label className="text-xs">Assigned City / Option</Label>
          <Input
            placeholder="e.g. Chennai / Hyderabad"
            value={coordinator.assignedOption || ""}
            onChange={(e) => onUpdate("assignedOption", e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

export default function AddTripPage() {

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [validationSummary, setValidationSummary] = React.useState([]);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Form State (Default totalSeats is empty string, NOT 999999)
  const [formData, setFormData] = React.useState({
    name: "",
    destination: "",
    description: "",
    startDate: "",
    endDate: "",
    registrationDeadline: "",
    totalSeats: "",
    maleReservedSeats: "0",
    femaleReservedSeats: "0",
    releasedSeats: "0",
    releasedSeatsType: "all",
    fee: "500",
    itineraryLink: "",
    whatsappLink: "",
    qrCodeUrl: "",
    importantInformation: "",
  });

  // Registered Coordinators (fetched from admin panel)
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

  // Coordinators State
  const [coordinators, setCoordinators] = React.useState([
    { id: generateId("coord"), name: "", email: "", phone: "", assignedOption: "" },
  ]);

  // Itinerary State
  const [itinerary, setItinerary] = React.useState([
    { id: generateId("itin"), day: "Day 1", title: "", description: "" },
  ]);

  // FAQ State
  const [faqs, setFaqs] = React.useState([]);

  // Student Consents & Declarations State
  const [consentStatements, setConsentStatements] = React.useState(DEFAULT_CONSENT_STATEMENTS);

  // Images State
  const [images, setImages] = React.useState([]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  );

  const faqSortableId = React.useId();
  const consentSortableId = React.useId();
  const imageSortableId = React.useId();

  const faqIds = React.useMemo(() => faqs.map((f) => f.id), [faqs]);
  const consentIds = React.useMemo(() => consentStatements.map((c) => c.id), [consentStatements]);
  const imageIds = React.useMemo(() => images.map((i) => i.id), [images]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Coordinators Handlers
  const addCoordinator = () => {
    setCoordinators((prev) => [
      ...prev,
      { id: generateId("coord"), name: "", email: "", phone: "", assignedOption: "" },
    ]);
  };

  const selectRegisteredCoordinator = (rowId, registered) => {
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
    setCoordinators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    if (errors.coordinators) {
      setErrors((prev) => ({ ...prev, coordinators: undefined }));
    }
  };

  const removeCoordinator = (id) => {
    if (coordinators.length > 1) {
      setCoordinators((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error("At least one coordinator is required");
    }
  };

  // Itinerary Handlers
  const addItineraryDay = () => {
    setItinerary((prev) => [
      ...prev,
      {
        id: generateId("itin"),
        day: `Day ${prev.length + 1}`,
        title: "",
        description: "",
      },
    ]);
  };

  const updateItineraryDay = (id, field, value) => {
    setItinerary((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItineraryDay = (id) => {
    setItinerary((prev) => prev.filter((item) => item.id !== id));
  };

  // FAQ Handlers
  const addFaq = () => {
    setFaqs((prev) => [
      ...prev,
      { id: generateId("faq"), question: "", answer: "" },
    ]);
  };

  const updateFaq = (id, field, value) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const removeFaq = (id) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFaqDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFaqs((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Consent Statements Handlers
  const addConsentStatement = () => {
    setConsentStatements((prev) => [
      ...prev,
      { id: generateId("decl"), text: "", required: true },
    ]);
  };

  const updateConsentStatement = (id, field, value) => {
    setConsentStatements((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeConsentStatement = (id) => {
    setConsentStatements((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConsentDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setConsentStatements((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // WhatsApp QR Code Upload Handler
  const handleQrCodeChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result;
        toast.loading("Uploading QR Code...", { id: "qr" });

        const formDataPayload = new FormData();
        formDataPayload.append("file", file);
        formDataPayload.append("type", "qr_code");

        const uploadRes = await fetch("/api/uploadImage", {
          method: "POST",
          body: formDataPayload,
        });

        const uploadData = await uploadRes.json();
        toast.dismiss("qr");

        if (uploadRes.ok && uploadData.url) {
          updateField("qrCodeUrl", uploadData.url);
          toast.success("QR Code uploaded successfully");
        } else {
          toast.error("Failed to upload QR Code", {
            description: uploadData.error || "Please try again",
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Error uploading QR Code");
    }
  };

  // Image Upload Handlers
  const processImageFiles = (files) => {
    const validImages = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    validImages.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          {
            id: generateId("img"),
            name: file.name,
            data: e.target.result,
            size: file.size,
            sortOrder: prev.length,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleImageDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((img, index) => ({ ...img, sortOrder: index }));
      });
    }
  };

  const removeImage = (id) => {
    setImages((prev) =>
      prev
        .filter((img) => img.id !== id)
        .map((img, index) => ({ ...img, sortOrder: index }))
    );
  };

  // Fixed uploadImages using updated API contract
  const uploadImages = async () => {
    if (images.length === 0) return [];

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: images.map((img) => img.data),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to upload images");
    }
    return data.images || [];
  };

  // Helper to build structured validation summary
  const buildValidationSummary = (validationErrors) => {
    const summary = [];
    if (validationErrors.name) summary.push({ id: "name", label: "Trip Name", message: validationErrors.name });
    if (validationErrors.totalSeats) summary.push({ id: "totalSeats", label: "Total Capacity Seats", message: validationErrors.totalSeats });
    if (validationErrors.femaleReservedSeats) summary.push({ id: "femaleReservedSeats", label: "Female Reserved Seats", message: validationErrors.femaleReservedSeats });
    if (validationErrors.releasedSeats) summary.push({ id: "releasedSeats", label: "Initial Released Seats", message: validationErrors.releasedSeats });
    if (validationErrors.coordinators) summary.push({ id: "coordinators-section", label: "Trip Coordinators", message: validationErrors.coordinators });
    if (validationErrors.endDate) summary.push({ id: "endDate", label: "Expedition End Date", message: validationErrors.endDate });
    if (validationErrors.registrationDeadline) summary.push({ id: "registrationDeadline", label: "Registration Deadline", message: validationErrors.registrationDeadline });
    if (validationErrors.itineraryLink) summary.push({ id: "itineraryLink", label: "Itinerary Link", message: validationErrors.itineraryLink });

    Object.entries(validationErrors).forEach(([path, msg]) => {
      if (!summary.some((s) => s.message === msg)) {
        let label = path;
        if (path.startsWith("faqs.")) label = "Frequently Asked Questions";
        if (path.startsWith("consentStatements.")) label = "Student Consents & Declarations";
        if (path.startsWith("coordinators[")) label = "Trip Coordinators";
        summary.push({ id: path, label, message: msg });
      }
    });

    return summary;
  };

  // Submit Handler: Consistent Save & Publish Action
  const handleSaveTrip = async () => {
    setErrors({});
    setValidationSummary([]);
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

      // Filter out completely blank FAQs; validate half-filled ones
      const activeFaqs = faqs
        .map((faq, index) => ({
          id: faq.id || `faq_${index}`,
          question: (faq.question || "").trim(),
          answer: (faq.answer || "").trim(),
          sortOrder: index,
        }))
        .filter((faq) => faq.question || faq.answer);

      // Clean consent statements
      const activeConsentStatements = consentStatements
        .map((stmt, index) => ({
          id: stmt.id || `stmt_${index}`,
          text: (stmt.text || "").trim(),
          required: stmt.required !== false,
          sortOrder: index,
        }))
        .filter((stmt) => stmt.text);

      const dataToValidate = {
        ...formData,
        fee: Number(formData.fee) || 0,
        totalSeats: formData.totalSeats === "" ? undefined : Number(formData.totalSeats),
        maleReservedSeats: Number(formData.maleReservedSeats || 0),
        femaleReservedSeats: formData.femaleReservedSeats === "" ? undefined : Number(formData.femaleReservedSeats),
        releasedSeats: formData.releasedSeats === "" ? undefined : Number(formData.releasedSeats),
        coordinators: activeCoordinators,
        itinerary: activeItinerary,
        itineraryLink: formData.itineraryLink.trim(),
        faqs: activeFaqs,
        consentStatements: activeConsentStatements,
      };

      await tripSchema.validate(dataToValidate, { abortEarly: false });

      let uploadedImages = [];
      if (images.length > 0) {
        toast.loading("Uploading photos to gallery...", { id: "upload" });
        uploadedImages = await uploadImages();
        toast.dismiss("upload");
      }

      const response = await fetch("/api/trip", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-dev": "true" },
        body: JSON.stringify({
          ...dataToValidate,
          images: uploadedImages,
          formFields: [],
          thingsToCarry: [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
          const summary = buildValidationSummary(data.details);
          setValidationSummary(summary);
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast.error("Trip could not be published", {
            description: "Please fix the required fields listed in the summary banner above.",
          });
        } else {
          throw new Error(data.error || "Failed to save trip");
        }
        return;
      }

      toast.success("Trip published successfully!", {
        description: `Trip ID: ${data.tripId}`,
      });

      router.push("/admin/trip");
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const validationErrors = {};
        error.inner.forEach((err) => {
          if (err.path) {
            validationErrors[err.path] = err.message;
          }
        });
        setErrors(validationErrors);
        const summary = buildValidationSummary(validationErrors);
        setValidationSummary(summary);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error("Trip cannot be published yet", {
          description: error.errors?.[0] || "Please check the highlighted fields above.",
        });
      } else {
        toast.error("Failed to save trip", {
          description: error.message || "Please try again",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#FAF9F6]">
      {/* Top Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-stone-200/80 bg-white/95 backdrop-blur-sm px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="hover:bg-stone-100 text-stone-700 shrink-0">
            <Link href="/admin/trip">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-stone-900 truncate">Add New Trip</h1>
            <p className="text-xs text-stone-500 hidden sm:block">Configure complete public & admin trip details</p>
          </div>
        </div>

        <Button
          onClick={handleSaveTrip}
          disabled={isSubmitting}
          className="shrink-0 bg-[#3B001B] hover:bg-[#46001D] text-white shadow-sm font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2"
        >
          {isSubmitting ? (
            <Loader2Icon className="mr-1.5 sm:mr-2 size-3.5 sm:size-4 animate-spin" />
          ) : (
            <SaveIcon className="mr-1.5 sm:mr-2 size-3.5 sm:size-4" />
          )}
          <span>Save & Publish Trip</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-[#FAF9F6]">
        <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 space-y-8">

          {/* Validation Summary Banner */}
          {validationSummary.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold text-sm sm:text-base">
                <AlertTriangleIcon className="size-5 shrink-0" />
                <span>Trip cannot be published yet</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-600">
                Please complete or correct the following requirements before publishing:
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2 text-xs sm:text-sm">
                {validationSummary.map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-destructive font-bold">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(err.id);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                          el.focus();
                        }
                      }}
                      className="text-left text-destructive hover:underline font-medium cursor-pointer"
                    >
                      <strong className="text-stone-800">{err.label}:</strong> {err.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SECTION 1: BASIC INFORMATION */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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

          {/* SECTION 2: DATES & SCHEDULE */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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
                    className={errors.registrationDeadline ? "border-destructive" : ""}
                  />
                  {errors.registrationDeadline && (
                    <p className="text-xs text-destructive">{errors.registrationDeadline}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: TRIP MEDIA & GALLERY */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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
                    placeholder="e.g. 50"
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

              <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-4">
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

          {/* SECTION 5: REGISTRATION FEE & FAQS (Replaces custom questionnaire) */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <IndianRupeeIcon className="size-5 text-primary" />
                  5. Registration Fee & Frequently Asked Questions (FAQ)
                </CardTitle>
                <CardDescription>
                  Configure trip fee and common questions/answers displayed on the public trip page
                </CardDescription>
              </div>
              <Button onClick={addFaq} size="sm" variant="outline" className="gap-1">
                <PlusIcon className="size-3.5" />
                Add FAQ
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="max-w-xs space-y-2">
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

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold text-stone-800">Frequently Asked Questions</Label>
                  <span className="text-xs text-stone-500">Drag items to reorder</span>
                </div>

                {faqs.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
                    No FAQs added yet. Click "+ Add FAQ" to provide guidance for students.
                  </div>
                ) : (
                  <DndContext
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleFaqDragEnd}
                    sensors={sensors}
                    id={faqSortableId}
                  >
                    <SortableContext items={faqIds} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-3">
                        {faqs.map((faq, index) => (
                          <SortableFaqRow
                            key={faq.id}
                            faq={faq}
                            onUpdate={updateFaq}
                            onDelete={removeFaq}
                            errorQuestion={errors[`faqs.${index}.question`]}
                            errorAnswer={errors[`faqs.${index}.answer`]}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 6: STUDENT CONSENTS & DECLARATIONS */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <FileCheckIcon className="size-5 text-primary" />
                  6. Student Consents & Declarations
                </CardTitle>
                <CardDescription>
                  Mandatory checkboxes students must accept before completing trip registration
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addConsentStatement}
                className="gap-1"
              >
                <PlusIcon className="size-3.5" /> Add Declaration
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <DndContext
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={handleConsentDragEnd}
                sensors={sensors}
                id={consentSortableId}
              >
                <SortableContext items={consentIds} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-3">
                    {consentStatements.map((statement, index) => (
                      <SortableConsentRow
                        key={statement.id}
                        statement={statement}
                        onUpdate={updateConsentStatement}
                        onDelete={removeConsentStatement}
                        errorText={errors[`consentStatements.${index}.text`]}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          {/* SECTION 7: PRIVATE WHATSAPP GROUP */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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
                        href={formData.qrCodeUrl}
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

          {/* SECTION 8: TRIP COORDINATORS */}
          <Card id="coordinators-section" className="border-stone-200/80 shadow-sm bg-white rounded-xl">
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
                <p className="text-xs text-destructive font-medium">{errors.coordinators}</p>
              )}
              {coordLoadError && (
                <p className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠ Could not load registered coordinators. You can still type details manually below.
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

          {/* SECTION 9: DAY-BY-DAY ITINERARY & ITINERARY LINK */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <CompassIcon className="size-5 text-primary" />
                  9. Day-by-Day Itinerary & Schedule Link
                </CardTitle>
                <CardDescription>
                  Timeline rendered on the public trip detail page and optional link to external document
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItineraryDay} className="gap-1">
                <PlusIcon className="size-3.5" /> Add Day
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Itinerary External Link */}
              <div className="space-y-2 pb-2">
                <Label htmlFor="itineraryLink" className="flex items-center gap-1.5 font-medium">
                  <LinkIcon className="size-3.5 text-muted-foreground" />
                  Itinerary Document Link (Optional)
                </Label>
                <Input
                  id="itineraryLink"
                  placeholder="https://docs.google.com/... or https://notion.so/... or https://example.com/itinerary.pdf"
                  value={formData.itineraryLink}
                  onChange={(e) => updateField("itineraryLink", e.target.value)}
                  className={errors.itineraryLink ? "border-destructive" : ""}
                />
                {errors.itineraryLink && <p className="text-xs text-destructive">{errors.itineraryLink}</p>}
                <p className="text-xs text-muted-foreground">
                  When provided, a "View Full Itinerary" button will appear on the public trip page.
                </p>
              </div>

              <div className="pt-2 border-t space-y-3">
                <Label className="text-sm font-semibold text-stone-800">Timeline Schedule</Label>
                {itinerary.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    No itinerary days added. Click "Add Day" to build the timeline schedule.
                  </p>
                ) : (
                  itinerary.map((item, index) => (
                    <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {item.day || `Day ${index + 1}`}
                        </span>
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

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Day Label</Label>
                          <Input
                            placeholder="e.g. Day 1"
                            value={item.day}
                            onChange={(e) => updateItineraryDay(item.id, "day", e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
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
              </div>
            </CardContent>
          </Card>

          {/* SECTION 10: IMPORTANT INFORMATION */}
          <Card className="border-stone-200/80 shadow-sm bg-white rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <InfoIcon className="size-5 text-primary" />
                10. Important Information & Guidelines
              </CardTitle>
              <CardDescription>
                Travel guidelines, rules, cancellation policies, and health advisories rendered on public trip page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                id="importantInformation"
                rows={5}
                placeholder="Enter important instructions, code of conduct, medical requirements, or travel advice (paragraphs supported)..."
                value={formData.importantInformation}
                onChange={(e) => updateField("importantInformation", e.target.value)}
                className="flex min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </CardContent>
          </Card>

          {/* Bottom Save Action */}
          <div className="flex justify-end pb-12 pt-4">
            <Button
              onClick={handleSaveTrip}
              disabled={isSubmitting}
              size="lg"
              className="min-w-44 bg-[#3B001B] hover:bg-[#46001D] text-white shadow font-semibold"
            >
              {isSubmitting ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <SaveIcon className="mr-2 size-4" />
              )}
              Save & Publish Trip
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
