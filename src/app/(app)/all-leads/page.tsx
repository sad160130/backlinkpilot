import { prisma } from "@/lib/prisma";
import { AllLeadsTable } from "@/components/AllLeadsTable";

export default async function AllLeadsPage() {
  const leads = await prisma.lead.findMany({
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
  });
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-forest">All Leads</h1>
      <AllLeadsTable leads={leads} />
    </div>
  );
}
