"use server";

import { prisma } from "@/lib/prisma";

export async function getAllTemplates() {
  return prisma.template.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      stage: true,
      isFirstMessage: true,
      order: true,
    },
  });
}
