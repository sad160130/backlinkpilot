"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import type { PipelineStage, DohGrade, Note, Reminder } from "@prisma/client";
import { PIPELINE_STAGE_LABEL, PIPELINE_STAGE_ORDER } from "@/lib/pipeline";
import {
  BUSINESS_TYPE_SUGGESTIONS,
  DIETARY_TAG_SUGGESTIONS,
} from "@/lib/business-types";
import {
  createLead,
  deleteLead,
  getDistinctBusinessTypes,
  getLead,
  updateLead,
} from "@/app/actions/leads";
import { getAllTemplates } from "@/app/actions/templates";
import {
  addNote,
  deleteNote,
  getNotesForLead,
} from "@/app/actions/notes";
import {
  deleteReminder,
  getActiveReminderForLead,
  markReminderDone,
  upsertReminder,
} from "@/app/actions/reminders";
import {
  fromDateInputValue,
  nextBusinessDay,
  toDateInputValue,
} from "@/lib/dates";

type EditLeadModalProps = {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
};

type TemplateOption = {
  id: string;
  name: string;
  stage: PipelineStage;
  isFirstMessage: boolean;
  order: number;
};

type FormState = {
  businessName: string;
  businessType: string;
  websiteUrl: string;
  instagramUrl: string;
  contactFirstName: string;
  contactEmail: string;
  phone: string;
  address: string;
  city: string;
  neighborhood: string;
  dietaryTags: string[];
  dohGrade: DohGrade | "";
  googleRating: string;
  googleReviewCount: string;
  domainRating: string;
  listingUrl: string;
  verifiedBadge: boolean;
  priorityPlacement: boolean;
  photosRefreshed: boolean;
  backlinkUrl: string;
  pipelineStage: PipelineStage;
  lastTemplateSent: string;
};

const EMPTY_FORM: FormState = {
  businessName: "",
  businessType: "",
  websiteUrl: "",
  instagramUrl: "",
  contactFirstName: "",
  contactEmail: "",
  phone: "",
  address: "",
  city: "",
  neighborhood: "",
  dietaryTags: [],
  dohGrade: "",
  googleRating: "",
  googleReviewCount: "",
  domainRating: "",
  listingUrl: "",
  verifiedBadge: false,
  priorityPlacement: false,
  photosRefreshed: false,
  backlinkUrl: "",
  pipelineStage: "OPPORTUNITY",
  lastTemplateSent: "",
};

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade";

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        value ? "bg-jade" : "bg-gray-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition",
          value ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

const clientLeadSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  websiteUrl: z.string().trim().url("Website URL is invalid").or(z.literal("")),
  instagramUrl: z.string().trim().url("Instagram URL is invalid").or(z.literal("")),
  contactEmail: z.string().trim().email("Contact email is invalid").or(z.literal("")),
  listingUrl: z.string().trim().url("Listing URL is invalid").or(z.literal("")),
  backlinkUrl: z.string().trim().url("Backlink URL is invalid").or(z.literal("")),
  googleRating: z
    .number()
    .min(0, "Google rating must be 0–5")
    .max(5, "Google rating must be 0–5")
    .nullable(),
  googleReviewCount: z.number().int().min(0, "Review count must be ≥ 0").nullable(),
  domainRating: z
    .number()
    .int()
    .min(0, "Domain rating must be 0–100")
    .max(100, "Domain rating must be 0–100")
    .nullable(),
});

function parseNullableNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseNullableInt(raw: string): number | null {
  if (raw.trim() === "") return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function NotesTab({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getNotesForLead(leadId);
      setNotes(fresh);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load notes");
    }
  }, [leadId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const fresh = await getNotesForLead(leadId);
        if (!cancelled) setNotes(fresh);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const trimmed = body.trim();
  const canAdd = trimmed.length > 0 && !busy;

  async function handleAdd() {
    if (!canAdd) return;
    setBusy(true);
    try {
      await addNote({ leadId, body: trimmed });
      setBody("");
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(noteId: string) {
    if (!window.confirm("Delete this note?")) return;
    setBusy(true);
    try {
      await deleteNote(noteId);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete note");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <textarea
          rows={3}
          className={inputCls}
          placeholder="Add a note..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Notes save instantly — no need to click Save Lead.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Note
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          No notes yet — add one above.
        </p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-cream/50 rounded-lg p-3 border border-cream group relative"
            >
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {note.body}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(note.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  disabled={busy}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderTab({ leadId }: { leadId: string }) {
  const [active, setActive] = useState<Reminder | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [labelValue, setLabelValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const fresh = await getActiveReminderForLead(leadId);
      setActive(fresh);
      if (fresh) {
        setDateValue(toDateInputValue(new Date(fresh.dueDate)));
        setLabelValue(fresh.label ?? "");
      } else {
        setDateValue("");
        setLabelValue("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load reminder");
    }
  }, [leadId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const fresh = await getActiveReminderForLead(leadId);
        if (cancelled) return;
        setActive(fresh);
        if (fresh) {
          setDateValue(toDateInputValue(new Date(fresh.dueDate)));
          setLabelValue(fresh.label ?? "");
        } else {
          setDateValue("");
          setLabelValue("");
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load reminder");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  async function handleSave() {
    if (!dateValue) return;
    setBusy(true);
    try {
      await upsertReminder({
        leadId,
        dueDate: fromDateInputValue(dateValue),
        label: labelValue.trim() || null,
      });
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save reminder");
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkDone() {
    if (!active) return;
    setBusy(true);
    try {
      await markReminderDone(active.id);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to mark reminder done");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!active) return;
    if (!window.confirm("Delete this reminder?")) return;
    setBusy(true);
    try {
      await deleteReminder(active.id);
      setErr(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to delete reminder");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {active && (
        <div className="bg-jade/5 border border-jade/20 rounded-lg p-3 mb-4">
          <p className="text-sm">
            <span className="font-medium text-forest">Active reminder:</span>{" "}
            <span className="text-gray-700">
              {format(new Date(active.dueDate), "EEEE, MMMM d, yyyy")}
            </span>
          </p>
          {active.label && (
            <p className="text-sm text-gray-600 mt-1">&quot;{active.label}&quot;</p>
          )}
        </div>
      )}

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
          Due Date
        </span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className={inputCls}
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setDateValue(toDateInputValue(nextBusinessDay()))}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
          >
            Next Biz Day
          </button>
          <button
            type="button"
            onClick={() => setDateValue("")}
            className="p-2 rounded-md border border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            aria-label="Clear date"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
          Label
        </span>
        <input
          type="text"
          className={inputCls}
          placeholder="What's this reminder for? (optional)"
          value={labelValue}
          onChange={(e) => setLabelValue(e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">
          Set a date to follow up with this lead. The Reminders Due widget on
          the dashboard counts every lead with a pending reminder. When the
          date arrives or passes, you&apos;ll see a toast notification on next
          sync — and the lead card will be highlighted with a purple ring on
          the pipeline.
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        {active && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-red-300 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Delete Reminder
          </button>
        )}
        {active && (
          <button
            type="button"
            onClick={handleMarkDone}
            disabled={busy}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Mark Done
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || !dateValue}
          className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Reminder
        </button>
      </div>
    </div>
  );
}

export function EditLeadModal({ leadId, open, onClose }: EditLeadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "notes" | "reminder">(
    "details"
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradedAt, setUpgradedAt] = useState<Date | null>(null);
  const [businessTypeOptions, setBusinessTypeOptions] =
    useState<string[]>(BUSINESS_TYPE_SUGGESTIONS);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [tagInput, setTagInput] = useState("");
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load data when opening
  useEffect(() => {
    if (!open) return;
    setActiveTab("details");
    setError(null);
    setTagInput("");

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const [distinctTypes, allTemplates] = await Promise.all([
          getDistinctBusinessTypes(),
          getAllTemplates(),
        ]);
        if (cancelled) return;

        const merged = Array.from(
          new Set([...BUSINESS_TYPE_SUGGESTIONS, ...distinctTypes])
        ).sort();
        setBusinessTypeOptions(merged);
        setTemplates(allTemplates);

        if (leadId) {
          const lead = await getLead(leadId);
          if (cancelled) return;
          if (lead) {
            setForm({
              businessName: lead.businessName ?? "",
              businessType: lead.businessType ?? "",
              websiteUrl: lead.websiteUrl ?? "",
              instagramUrl: lead.instagramUrl ?? "",
              contactFirstName: lead.contactFirstName ?? "",
              contactEmail: lead.contactEmail ?? "",
              phone: lead.phone ?? "",
              address: lead.address ?? "",
              city: lead.city ?? "",
              neighborhood: lead.neighborhood ?? "",
              dietaryTags: lead.dietaryTags ?? [],
              dohGrade: lead.dohGrade ?? "",
              googleRating:
                lead.googleRating === null || lead.googleRating === undefined
                  ? ""
                  : String(lead.googleRating),
              googleReviewCount:
                lead.googleReviewCount === null ||
                lead.googleReviewCount === undefined
                  ? ""
                  : String(lead.googleReviewCount),
              domainRating:
                lead.domainRating === null || lead.domainRating === undefined
                  ? ""
                  : String(lead.domainRating),
              listingUrl: lead.listingUrl ?? "",
              verifiedBadge: lead.verifiedBadge,
              priorityPlacement: lead.priorityPlacement,
              photosRefreshed: lead.photosRefreshed,
              backlinkUrl: lead.backlinkUrl ?? "",
              pipelineStage: lead.pipelineStage,
              lastTemplateSent: lead.lastTemplateSent ?? "",
            });
            setUpgradedAt(lead.upgradedAt ?? null);
          }
        } else {
          setForm(EMPTY_FORM);
          setUpgradedAt(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load lead");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, leadId]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus first field when content shows
  useEffect(() => {
    if (open && !loading && activeTab === "details") {
      firstFieldRef.current?.focus();
    }
  }, [open, loading, activeTab]);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.stage === form.pipelineStage),
    [templates, form.pipelineStage]
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    setForm((prev) =>
      prev.dietaryTags.includes(tag)
        ? prev
        : { ...prev, dietaryTags: [...prev.dietaryTags, tag] }
    );
  }

  function removeTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.filter((t) => t !== tag),
    }));
  }

  function buildPayload() {
    return {
      businessName: form.businessName.trim(),
      businessType: emptyToNull(form.businessType),
      websiteUrl: form.websiteUrl.trim() === "" ? null : form.websiteUrl.trim(),
      instagramUrl:
        form.instagramUrl.trim() === "" ? null : form.instagramUrl.trim(),
      contactFirstName: emptyToNull(form.contactFirstName),
      contactEmail:
        form.contactEmail.trim() === "" ? null : form.contactEmail.trim(),
      phone: emptyToNull(form.phone),
      address: emptyToNull(form.address),
      city: emptyToNull(form.city),
      neighborhood: emptyToNull(form.neighborhood),
      dietaryTags: form.dietaryTags,
      dohGrade: form.dohGrade === "" ? null : form.dohGrade,
      googleRating: parseNullableNumber(form.googleRating),
      googleReviewCount: parseNullableInt(form.googleReviewCount),
      domainRating: parseNullableInt(form.domainRating),
      listingUrl:
        form.listingUrl.trim() === "" ? null : form.listingUrl.trim(),
      verifiedBadge: form.verifiedBadge,
      priorityPlacement: form.priorityPlacement,
      photosRefreshed: form.photosRefreshed,
      backlinkUrl:
        form.backlinkUrl.trim() === "" ? null : form.backlinkUrl.trim(),
      pipelineStage: form.pipelineStage,
      lastTemplateSent: emptyToNull(form.lastTemplateSent),
    };
  }

  function clientValidate(): string | null {
    const result = clientLeadSchema.safeParse({
      businessName: form.businessName,
      websiteUrl: form.websiteUrl.trim(),
      instagramUrl: form.instagramUrl.trim(),
      contactEmail: form.contactEmail.trim(),
      listingUrl: form.listingUrl.trim(),
      backlinkUrl: form.backlinkUrl.trim(),
      googleRating: parseNullableNumber(form.googleRating),
      googleReviewCount: parseNullableInt(form.googleReviewCount),
      domainRating: parseNullableInt(form.domainRating),
    });
    if (!result.success) {
      return result.error.issues[0]?.message ?? "Form is invalid";
    }
    return null;
  }

  async function handleSave() {
    setError(null);
    const errMsg = clientValidate();
    if (errMsg) {
      setError(errMsg);
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (leadId) {
        await updateLead(leadId, payload);
      } else {
        await createLead(payload);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save lead");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!leadId) return;
    if (!window.confirm("Delete this lead? This cannot be undone.")) return;
    setSaving(true);
    try {
      await deleteLead(leadId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete lead");
      setSaving(false);
    }
  }

  if (!open || !mounted) return null;

  const title = leadId ? "Edit Lead" : "New Lead";

  const tabBtn = (key: typeof activeTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={cn(
        "py-3",
        activeTab === key
          ? "text-jade font-medium border-b-2 border-jade -mb-px"
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      {label}
    </button>
  );

  const remainingTagSuggestions = DIETARY_TAG_SUGGESTIONS.filter(
    (s) => !form.dietaryTags.includes(s)
  );

  const modal = (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        >
          <div className="sticky top-0 p-5 border-b flex items-center justify-between bg-white rounded-t-xl">
            <h2 className="text-xl font-bold text-forest">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b flex gap-6 px-5">
            {tabBtn("details", "Details")}
            {tabBtn("notes", "Notes")}
            {tabBtn("reminder", "Reminder")}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : activeTab === "details" ? (
              <>
                {error && (
                  <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-x-4 gap-y-4">
                  <Field label="Business Name *">
                    <input
                      ref={firstFieldRef}
                      type="text"
                      required
                      className={inputCls}
                      value={form.businessName}
                      onChange={(e) => setField("businessName", e.target.value)}
                    />
                  </Field>

                  <Field label="Business Type">
                    <input
                      type="text"
                      list="business-types-list"
                      className={inputCls}
                      value={form.businessType}
                      onChange={(e) => setField("businessType", e.target.value)}
                    />
                  </Field>

                  <Field label="Website URL">
                    <input
                      type="url"
                      className={inputCls}
                      value={form.websiteUrl}
                      onChange={(e) => setField("websiteUrl", e.target.value)}
                    />
                  </Field>

                  <Field label="First Name">
                    <input
                      type="text"
                      className={inputCls}
                      value={form.contactFirstName}
                      onChange={(e) =>
                        setField("contactFirstName", e.target.value)
                      }
                    />
                  </Field>

                  <Field label="City / Borough">
                    <input
                      type="text"
                      className={inputCls}
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  </Field>

                  <Field label="Neighborhood">
                    <input
                      type="text"
                      className={inputCls}
                      value={form.neighborhood}
                      onChange={(e) => setField("neighborhood", e.target.value)}
                    />
                  </Field>

                  <Field label="Domain Rating">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={inputCls}
                      value={form.domainRating}
                      onChange={(e) => setField("domainRating", e.target.value)}
                    />
                  </Field>

                  <Field label="DOH Grade">
                    <select
                      className={inputCls}
                      value={form.dohGrade}
                      onChange={(e) =>
                        setField(
                          "dohGrade",
                          (e.target.value as DohGrade | "") || ""
                        )
                      }
                    >
                      <option value="">—</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="NA">NA</option>
                    </select>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Instagram URL">
                      <input
                        type="url"
                        className={inputCls}
                        value={form.instagramUrl}
                        onChange={(e) =>
                          setField("instagramUrl", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Contact Email">
                    <input
                      type="email"
                      className={inputCls}
                      value={form.contactEmail}
                      onChange={(e) => setField("contactEmail", e.target.value)}
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      type="tel"
                      className={inputCls}
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Address">
                      <input
                        type="text"
                        className={inputCls}
                        value={form.address}
                        onChange={(e) => setField("address", e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="md:col-span-2">
                    <Field label="Dietary Tags">
                      <div className="space-y-2">
                        {form.dietaryTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {form.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-jade/10 text-jade rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(tag)}
                                  aria-label={`Remove ${tag}`}
                                  className="hover:text-forest"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          className={inputCls}
                          placeholder="Type a tag and press Enter"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag(tagInput);
                              setTagInput("");
                            }
                          }}
                        />
                        {remainingTagSuggestions.length > 0 && (
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {remainingTagSuggestions.map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => addTag(s)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs whitespace-nowrap flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </Field>
                  </div>

                  <Field label="Google Rating">
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      max={5}
                      className={inputCls}
                      value={form.googleRating}
                      onChange={(e) => setField("googleRating", e.target.value)}
                    />
                  </Field>

                  <Field label="Google Review Count">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.googleReviewCount}
                      onChange={(e) =>
                        setField("googleReviewCount", e.target.value)
                      }
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Listing URL">
                      <input
                        type="url"
                        className={inputCls}
                        value={form.listingUrl}
                        onChange={(e) => setField("listingUrl", e.target.value)}
                      />
                    </Field>
                    <p className="text-xs text-gray-500 mt-1">
                      The URL of this restaurant&apos;s existing listing on
                      eatrealfoodnyc.com. Used in templates as{" "}
                      {"{{listingUrl}}"}.
                    </p>
                  </div>

                  <Field label="Verified Badge">
                    <Toggle
                      value={form.verifiedBadge}
                      onChange={(v) => setField("verifiedBadge", v)}
                    />
                  </Field>

                  <Field label="Priority Placement">
                    <Toggle
                      value={form.priorityPlacement}
                      onChange={(v) => setField("priorityPlacement", v)}
                    />
                  </Field>

                  <Field label="Photos Refreshed">
                    <Toggle
                      value={form.photosRefreshed}
                      onChange={(v) => setField("photosRefreshed", v)}
                    />
                  </Field>

                  <Field label="Upgraded At">
                    <p className="text-sm text-gray-700 py-2">
                      {upgradedAt ? (
                        formatDate(upgradedAt)
                      ) : (
                        <span className="text-gray-400">Not yet upgraded</span>
                      )}
                    </p>
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Backlink URL">
                      <input
                        type="url"
                        className={inputCls}
                        value={form.backlinkUrl}
                        onChange={(e) => setField("backlinkUrl", e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Pipeline Stage">
                    <select
                      className={inputCls}
                      value={form.pipelineStage}
                      onChange={(e) =>
                        setField(
                          "pipelineStage",
                          e.target.value as PipelineStage
                        )
                      }
                    >
                      {PIPELINE_STAGE_ORDER.map((stage) => (
                        <option key={stage} value={stage}>
                          {PIPELINE_STAGE_LABEL[stage]}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Last Message Sent">
                    <select
                      className={inputCls}
                      value={form.lastTemplateSent}
                      onChange={(e) =>
                        setField("lastTemplateSent", e.target.value)
                      }
                    >
                      <option value="">—</option>
                      {filteredTemplates.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <datalist id="business-types-list">
                  {businessTypeOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </>
            ) : activeTab === "notes" ? (
              leadId ? (
                <NotesTab leadId={leadId} />
              ) : (
                <p className="text-gray-500 text-sm">
                  Save the lead first before adding notes.
                </p>
              )
            ) : leadId ? (
              <ReminderTab leadId={leadId} />
            ) : (
              <p className="text-gray-500 text-sm">
                Save the lead first before setting a reminder.
              </p>
            )}
          </div>

          <div className="sticky bottom-0 p-4 border-t flex justify-end gap-2 bg-white rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            {leadId && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-md border border-red-300 text-sm text-red-600 hover:bg-red-50"
                disabled={saving}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-jade text-white text-sm font-medium hover:bg-forest transition disabled:opacity-60"
              disabled={saving || loading}
            >
              {saving ? "Saving…" : "Save Lead"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
