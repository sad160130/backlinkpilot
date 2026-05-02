import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/StatTile";
import { PipelineBoard } from "@/components/PipelineBoard";

export const revalidate = 0;

const ACTIVE_STAGES = [
  "REACH_OUT_1",
  "UPGRADE_APPROVED",
  "UPGRADE_PREVIEW_SENT",
  "UPGRADE_LIVE",
  "BACKLINK_REQUIRED",
] as const;

export default async function PipelinePage() {
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
    prisma.lead.count({ where: { pipelineStage: { in: [...ACTIVE_STAGES] } } }),
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

  return (
    <>
      <h1 className="text-3xl font-bold text-forest mb-6">Pipeline</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatTile label="Opportunities" value={opportunities} />
        <StatTile label="Active Outreach" value={activeOutreach} />
        <StatTile label="Backlinks Acquired" value={backlinksAcquired} accent="win" />
        <StatTile label="Reminders Due" value={remindersDue} accent="warning" />
        <StatTile label="Total Leads" value={totalLeads} />
      </div>

      <PipelineBoard leads={leads} />
    </>
  );
}
