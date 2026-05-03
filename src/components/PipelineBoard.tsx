"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PipelineStage } from "@prisma/client";
import {
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_ORDER,
  type PipelineLead,
} from "@/lib/pipeline";
import { LeadCard } from "./LeadCard";
import { PipelineSearch } from "./PipelineSearch";
import { EditLeadModal } from "./EditLeadModal";

type PipelineBoardProps = {
  leads: PipelineLead[];
};

const SEARCHABLE_FIELDS: Array<keyof PipelineLead> = [
  "businessName",
  "businessType",
  "instagramUrl",
  "contactEmail",
  "websiteUrl",
  "neighborhood",
  "city",
  "contactFirstName",
  "listingUrl",
];

function matchesQuery(lead: PipelineLead, q: string): boolean {
  if (!q) return true;
  for (const field of SEARCHABLE_FIELDS) {
    const v = lead[field];
    if (typeof v === "string" && v.toLowerCase().includes(q)) return true;
  }
  return false;
}

function Column({
  stage,
  leads,
  onOpen,
}: {
  stage: PipelineStage;
  leads: PipelineLead[];
  onOpen: (leadId: string) => void;
}) {
  return (
    <div className="w-[280px] flex-shrink-0 bg-cream/60 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="uppercase tracking-wide text-xs font-semibold text-forest">
          {PIPELINE_STAGE_LABEL[stage]}
        </span>
        <span className="bg-white text-forest text-xs font-medium rounded-full px-2 py-0.5">
          {leads.length}
        </span>
      </div>

      {leads.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Empty</p>
      ) : (
        leads.map((lead) => <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />)
      )}
    </div>
  );
}

export function PipelineBoard({ leads }: PipelineBoardProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const grouped: Record<PipelineStage, PipelineLead[]> = {
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
    for (const lead of leads) {
      if (matchesQuery(lead, q)) grouped[lead.pipelineStage].push(lead);
    }
    return grouped;
  }, [leads, searchQuery]);

  function openLead(id: string) {
    setEditingLeadId(id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLeadId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PipelineSearch value={searchQuery} onChange={setSearchQuery} />
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="flex gap-4" style={{ minWidth: "max-content" }}>
          {PIPELINE_STAGE_ORDER.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              leads={byStage[stage] ?? []}
              onOpen={openLead}
            />
          ))}
        </div>
      </div>

      <EditLeadModal
        leadId={editingLeadId}
        open={modalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
