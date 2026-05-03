"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PipelineStage } from "@prisma/client";
import { addBusinessDays } from "@/lib/dates";

export async function getAllTemplates() {
  return prisma.template.findMany({
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
}

export async function getTemplate(id: string) {
  return prisma.template.findUnique({ where: { id } });
}

const templateInputSchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  stage: z.nativeEnum(PipelineStage),
  body: z.string(),
  isFirstMessage: z.boolean(),
  order: z.number().int().min(0),
});

export async function createTemplate(input: unknown) {
  const data = templateInputSchema.parse(input);
  const template = await prisma.template.create({ data });
  revalidatePath("/templates");
  return template;
}

export async function updateTemplate(id: string, input: unknown) {
  const data = templateInputSchema.parse(input);
  const template = await prisma.template.update({
    where: { id },
    data,
  });
  revalidatePath("/templates");
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return template;
}

export async function deleteTemplate(id: string) {
  await prisma.template.delete({ where: { id } });
  revalidatePath("/templates");
}

export async function markTemplateSent(leadId: string, templateName: string) {
  const [template, lead, settings] = await Promise.all([
    prisma.template.findUnique({ where: { name: templateName } }),
    prisma.lead.findUnique({ where: { id: leadId } }),
    prisma.settings.findUnique({ where: { id: "default" } }),
  ]);
  if (!template) throw new Error(`Template "${templateName}" not found`);
  if (!lead) throw new Error("Lead not found");
  if (!settings) throw new Error("Settings not found");

  const now = new Date();
  const reminderDays = settings.defaultReminderDays;
  const dueDate = addBusinessDays(now, reminderDays);

  const [updatedLead] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: {
        lastTemplateSent: template.name,
        lastSentAt: now,
        pipelineStage: template.isFirstMessage
          ? template.stage
          : lead.pipelineStage,
      },
    }),
    prisma.reminder.updateMany({
      where: { leadId, status: "PENDING" },
      data: { status: "SNOOZED" },
    }),
    prisma.reminder.create({
      data: {
        leadId,
        dueDate,
        label: `Follow up after ${template.name}`,
        status: "PENDING",
      },
    }),
  ]);

  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return { lead: updatedLead, reminderDueDate: dueDate };
}
