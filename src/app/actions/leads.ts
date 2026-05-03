"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PipelineStage, DohGrade } from "@prisma/client";

const leadInputSchema = z.object({
  businessName: z.string().trim().min(1, "Business name required"),
  businessType: z.string().trim().nullable(),
  websiteUrl: z.string().trim().url().nullable().or(z.literal("").transform(() => null)),
  instagramUrl: z.string().trim().url().nullable().or(z.literal("").transform(() => null)),
  contactFirstName: z.string().trim().nullable(),
  contactEmail: z.string().trim().email().nullable().or(z.literal("").transform(() => null)),
  phone: z.string().trim().nullable(),
  address: z.string().trim().nullable(),
  city: z.string().trim().nullable(),
  neighborhood: z.string().trim().nullable(),
  dietaryTags: z.array(z.string()),
  dohGrade: z.nativeEnum(DohGrade).nullable(),
  googleRating: z.number().min(0).max(5).nullable(),
  googleReviewCount: z.number().int().min(0).nullable(),
  domainRating: z.number().int().min(0).max(100).nullable(),
  listingUrl: z.string().trim().url().nullable().or(z.literal("").transform(() => null)),
  verifiedBadge: z.boolean(),
  priorityPlacement: z.boolean(),
  photosRefreshed: z.boolean(),
  backlinkUrl: z.string().trim().url().nullable().or(z.literal("").transform(() => null)),
  pipelineStage: z.nativeEnum(PipelineStage),
  lastTemplateSent: z.string().trim().nullable(),
});

export async function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      reminders: { orderBy: { dueDate: "asc" } },
    },
  });
}

export async function getDistinctBusinessTypes() {
  const rows = await prisma.lead.findMany({
    where: { businessType: { not: null } },
    select: { businessType: true },
    distinct: ["businessType"],
  });
  return rows.map((r) => r.businessType!).sort();
}

export async function createLead(input: unknown) {
  const data = leadInputSchema.parse(input);
  const lead = await prisma.lead.create({
    data: {
      ...data,
      upgradedAt:
        data.verifiedBadge || data.priorityPlacement || data.photosRefreshed
          ? new Date()
          : null,
    },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return lead;
}

export async function updateLead(id: string, input: unknown) {
  const data = leadInputSchema.parse(input);
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw new Error("Lead not found");
  const justUpgraded =
    !existing.upgradedAt &&
    (data.verifiedBadge || data.priorityPlacement || data.photosRefreshed);
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      upgradedAt: justUpgraded ? new Date() : existing.upgradedAt,
    },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return lead;
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
}

const moveLeadSchema = z.object({
  leadId: z.string().min(1),
  newStage: z.nativeEnum(PipelineStage),
});

export async function moveLead(input: unknown) {
  const data = moveLeadSchema.parse(input);
  const lead = await prisma.lead.update({
    where: { id: data.leadId },
    data: { pipelineStage: data.newStage },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return lead;
}
