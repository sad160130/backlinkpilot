"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const addNoteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1, "Note cannot be empty"),
});

export async function addNote(input: unknown) {
  const data = addNoteSchema.parse(input);
  const note = await prisma.note.create({
    data: { leadId: data.leadId, body: data.body },
  });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return note;
}

export async function deleteNote(noteId: string) {
  await prisma.note.delete({ where: { id: noteId } });
  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
}

export async function getNotesForLead(leadId: string) {
  return prisma.note.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });
}
