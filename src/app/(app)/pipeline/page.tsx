import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/StatTile";
import { PipelineBoard } from "@/components/PipelineBoard";
import { PipelineHeader } from "@/components/PipelineHeader";
import type { PipelineStage } from "@prisma/client";

export const revalidate = 0;

const ACTIVE_STAGES: PipelineStage[] = [
  "REACH_OUT_1",
  "UPGRADE_APPROVED",
  "UPGRADE_PREVIEW_SENT",
  "UPGRADE_LIVE",
  "BACKLINK_REQUIRED",
];

const FILTER_LABEL: Record<string, string> = {
  opportunities: "Opportunities",
  active: "Active Outreach",
  won: "Backlinks Acquired",
  due: "Reminders Due",
};

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { openLead?: string; filter?: string };
}) {
  const now = new Date();

  const [
    opportunities,
    activeOutreach,
    backlinksAcquired,
    remindersDue,
    totalLeads,
    leads,
  ] = await Promise.all([
    prisma.lead.count({ where: { pipelineStage: "OPPORTUNITY" } }),
    prisma.lead.count({ where: { pipelineStage: { in: ACTIVE_STAGES } } }),
    prisma.lead.count({ where: { pipelineStage: "BACKLINK_ACQUIRED" } }),
    prisma.reminder.count({ where: { status: "PENDING", dueDate: { lte: now } } }),
    prisma.lead.count(),
    prisma.lead.findMany({
      include: {
        reminders: {
          where: { status: "PENDING" },
          select: { id: true, status: true, dueDate: true },
        },
      },
      orderBy: [
        { googleRating: { sort: "desc", nulls: "last" } },
        { googleReviewCount: { sort: "desc", nulls: "last" } },
      ],
    }),
  ]);

  const filter = searchParams.filter ?? null;
  const filterLabel = filter ? FILTER_LABEL[filter] ?? null : null;

  const filteredLeads = leads.filter((l) => {
    if (filter === "opportunities") return l.pipelineStage === "OPPORTUNITY";
    if (filter === "active")
      return ACTIVE_STAGES.includes(l.pipelineStage);
    if (filter === "won") return l.pipelineStage === "BACKLINK_ACQUIRED";
    if (filter === "due") {
      return l.reminders.some(
        (r) => r.status === "PENDING" && r.dueDate <= now
      );
    }
    return true;
  });

  return (
    <>
      <PipelineHeader />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatTile
          label="Opportunities"
          value={opportunities}
          href="/pipeline?filter=opportunities"
          active={filter === "opportunities"}
        />
        <StatTile
          label="Active Outreach"
          value={activeOutreach}
          href="/pipeline?filter=active"
          active={filter === "active"}
        />
        <StatTile
          label="Backlinks Acquired"
          value={backlinksAcquired}
          accent="win"
          href="/pipeline?filter=won"
          active={filter === "won"}
        />
        <StatTile
          label="Reminders Due"
          value={remindersDue}
          accent="warning"
          href="/pipeline?filter=due"
          active={filter === "due"}
        />
        <StatTile
          label="Total Leads"
          value={totalLeads}
          href="/pipeline"
          active={!filter}
        />
      </div>

      {filterLabel && (
        <div className="mb-2 text-sm text-gray-600">
          Showing:{" "}
          <span className="font-medium text-forest">{filterLabel}</span>
          <Link href="/pipeline" className="text-jade underline ml-2">
            Clear filter
          </Link>
        </div>
      )}

      <PipelineBoard
        leads={filteredLeads}
        initialOpenLeadId={searchParams.openLead ?? null}
      />
    </>
  );
}
