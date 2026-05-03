"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { PipelineStage } from "@prisma/client";
import { PIPELINE_STAGE_LABEL, PIPELINE_STAGE_ORDER } from "@/lib/pipeline";
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  updateTemplate,
} from "@/app/actions/templates";

type EditTemplateModalProps = {
  templateId: string | null;
  open: boolean;
  onClose: () => void;
};

type FormState = {
  name: string;
  stage: PipelineStage;
  body: string;
  isFirstMessage: boolean;
  order: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  stage: "REACH_OUT_1",
  body: "",
  isFirstMessage: false,
  order: "0",
};

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade";

const SEEDED_NAMES = new Set([
  "1st Template",
  "1st Template - Email",
  "2nd Template",
  "3rd Template",
]);

function isSeededName(name: string): boolean {
  if (SEEDED_NAMES.has(name)) return true;
  return /^Prompt [123][A-C]$/.test(name);
}

function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
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

export function EditTemplateModal({
  templateId,
  open,
  onClose,
}: EditTemplateModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [originalName, setOriginalName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (!templateId) {
      setForm(EMPTY_FORM);
      setOriginalName("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const t = await getTemplate(templateId);
        if (cancelled) return;
        if (t) {
          setForm({
            name: t.name,
            stage: t.stage,
            body: t.body,
            isFirstMessage: t.isFirstMessage,
            order: String(t.order),
          });
          setOriginalName(t.name);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load template");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, templateId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    if (form.name.trim() === "") {
      setError("Name is required");
      return;
    }
    const orderNum = parseInt(form.order, 10);
    if (!Number.isFinite(orderNum) || orderNum < 0) {
      setError("Order must be a non-negative integer");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        stage: form.stage,
        body: form.body,
        isFirstMessage: form.isFirstMessage,
        order: orderNum,
      };
      if (templateId) {
        await updateTemplate(templateId, payload);
      } else {
        await createTemplate(payload);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!templateId) return;
    if (!window.confirm("Delete this template?")) return;
    setSaving(true);
    try {
      await deleteTemplate(templateId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete template");
      setSaving(false);
    }
  }

  if (!open || !mounted) return null;

  const title = templateId ? "Edit Template" : "New Template";
  const showRenameWarning =
    templateId !== null &&
    isSeededName(originalName) &&
    form.name.trim() !== originalName;

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

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : (
              <>
                {error && (
                  <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-x-4 gap-y-4">
                  <label className="block">
                    <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                      Name *
                    </span>
                    <input
                      type="text"
                      required
                      className={inputCls}
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                    />
                    {showRenameWarning && (
                      <p className="text-xs text-amber mt-1">
                        Renaming this template will break auto-advance logic.
                        Only rename if you know what you&apos;re doing.
                      </p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                      Stage
                    </span>
                    <select
                      className={inputCls}
                      value={form.stage}
                      onChange={(e) =>
                        setField("stage", e.target.value as PipelineStage)
                      }
                    >
                      {PIPELINE_STAGE_ORDER.map((stage) => (
                        <option key={stage} value={stage}>
                          {PIPELINE_STAGE_LABEL[stage]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                      Is First Message
                    </span>
                    <Toggle
                      value={form.isFirstMessage}
                      onChange={(v) => setField("isFirstMessage", v)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      First Message templates auto-advance the lead&apos;s
                      pipeline stage when sent. Numbered prompts (1A, 1B, etc.)
                      do not.
                    </p>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                      Order
                    </span>
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={form.order}
                      onChange={(e) => setField("order", e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                    Body
                  </span>
                  <p className="text-xs text-gray-500 mb-2">
                    Available: {"{{businessName}}"} {"{{contactFirstName}}"}{" "}
                    {"{{neighborhood}}"} {"{{city}}"} {"{{listingUrl}}"}{" "}
                    {"{{senderFirstName}}"}
                  </p>
                  <textarea
                    rows={14}
                    className="font-mono text-sm w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade resize-y"
                    value={form.body}
                    onChange={(e) => setField("body", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="sticky bottom-0 p-4 border-t flex justify-end gap-2 bg-white rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {templateId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-md border border-red-300 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 rounded-md bg-jade text-white text-sm font-medium hover:bg-forest transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Template"}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
