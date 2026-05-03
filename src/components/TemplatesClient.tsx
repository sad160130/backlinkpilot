"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Template, PipelineStage } from "@prisma/client";
import { PIPELINE_STAGE_LABEL, PIPELINE_STAGE_ORDER } from "@/lib/pipeline";
import { EditTemplateModal } from "./EditTemplateModal";

type TemplatesClientProps = {
  templates: Template[];
};

export function TemplatesClient({ templates }: TemplatesClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map: Record<PipelineStage, Template[]> = {
      OPPORTUNITY: [],
      REACH_OUT_1: [],
      UPGRADE_APPROVED: [],
      UPGRADE_PREVIEW_SENT: [],
      UPGRADE_LIVE: [],
      BACKLINK_REQUIRED: [],
      BACKLINK_ACQUIRED: [],
      ON_HOLD: [],
      NO_RESPONSE: [],
      DECLINED_OFFER: [],
    };
    for (const t of templates) {
      map[t.stage].push(t);
    }
    for (const stage of PIPELINE_STAGE_ORDER) {
      map[stage].sort((a, b) => a.order - b.order);
    }
    return map;
  }, [templates]);

  function openNew() {
    setEditingId(null);
    setOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditingId(null);
    router.refresh();
  }

  const stagesWithTemplates = PIPELINE_STAGE_ORDER.filter(
    (stage) => grouped[stage].length > 0
  );

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-forest">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit the body text of each template. Variables like{" "}
            {"{{businessName}}"} are replaced when sending.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest transition flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="space-y-8 mt-6">
        {stagesWithTemplates.map((stage) => (
          <section key={stage}>
            <h2 className="uppercase tracking-wide text-xs font-semibold text-forest mb-2">
              {PIPELINE_STAGE_LABEL[stage]}
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-cream/50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Stage</th>
                    <th className="px-4 py-2 font-medium">First Message?</th>
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Last Updated</th>
                    <th className="px-4 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {grouped[stage].map((t) => (
                    <tr key={t.id} className="hover:bg-cream/30">
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {t.name}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {PIPELINE_STAGE_LABEL[t.stage]}
                      </td>
                      <td className="px-4 py-2">
                        {t.isFirstMessage ? (
                          <Check className="h-4 w-4 text-jade" />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{t.order}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(t.updatedAt), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(t.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-md border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {stagesWithTemplates.length === 0 && (
          <p className="text-sm text-gray-500">
            No templates yet — click &quot;New Template&quot; to create one.
          </p>
        )}
      </div>

      <EditTemplateModal templateId={editingId} open={open} onClose={close} />
    </>
  );
}
