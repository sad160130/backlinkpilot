"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const upsertReminderSchema = z.object({
  leadId: z.string().min(1),
  dueDate: z.coerce.date(),
  label: z.string().trim().nullable(),
});

export async function upsertReminder(input: unknown) {
  const data = upsertReminderSchema.parse(input);

  await prisma.reminder.updateMany({
    where: { leadId: data.leadId, status: "PENDING" },
    data: { status: "SNOOZED" },
  });

  const reminder = await prisma.reminder.create({
    data: {
      leadId: data.leadId,
      dueDate: data.dueDate,
      label: data.label,
      status: "PENDING",
    },
  });

  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return reminder;
}

export async function markReminderDone(reminderId: string) {
  const reminder = await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "DONE" },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return reminder;
}

export async function deleteReminder(reminderId: string) {
  await prisma.reminder.delete({ where: { id: reminderId } });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
}

export async function getActiveReminderForLead(leadId: string) {
  return prisma.reminder.findFirst({
    where: { leadId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

const snoozeReminderSchema = z.object({
  reminderId: z.string().min(1),
  days: z.number().int().min(1).max(30),
});

export async function snoozeReminder(input: unknown) {
  const data = snoozeReminderSchema.parse(input);
  const existing = await prisma.reminder.findUnique({
    where: { id: data.reminderId },
  });
  if (!existing) throw new Error("Reminder not found");

  const newDueDate = new Date(existing.dueDate);
  newDueDate.setDate(newDueDate.getDate() + data.days);

  const reminder = await prisma.reminder.update({
    where: { id: data.reminderId },
    data: { dueDate: newDueDate },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return reminder;
}

export async function getDueReminders() {
  return prisma.reminder.findMany({
    where: {
      status: "PENDING",
      dueDate: { lte: new Date() },
    },
    include: {
      lead: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}
