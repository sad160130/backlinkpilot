"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DohGrade } from "@prisma/client";

const importRowSchema = z.object({
  businessName: z.string().trim().min(1),
  instagramUrl: z.string().trim().nullable(),
  websiteUrl: z.string().trim().nullable(),
  listingUrl: z.string().trim().nullable(),
  city: z.string().trim().nullable(),
  neighborhood: z.string().trim().nullable(),
  businessType: z.string().trim().nullable(),
  dietaryTags: z.array(z.string()),
  dohGrade: z.nativeEnum(DohGrade).nullable(),
  contactEmail: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  address: z.string().trim().nullable(),
  googleRating: z.number().min(0).max(5).nullable(),
  googleReviewCount: z.number().int().min(0).nullable(),
});

export type ImportSummary = {
  imported: number;
  skippedDuplicates: number;
  invalidRows: { rowNumber: number; reason: string }[];
};

export async function bulkImportLeads(
  rows: unknown[]
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    imported: 0,
    skippedDuplicates: 0,
    invalidRows: [],
  };

  const existing = await prisma.lead.findMany({
    where: {
      OR: [{ listingUrl: { not: null } }, { instagramUrl: { not: null } }],
    },
    select: { listingUrl: true, instagramUrl: true },
  });
  const existingListingUrls = new Set(
    existing.map((l) => l.listingUrl).filter((v): v is string => !!v)
  );
  const existingInstagramUrls = new Set(
    existing.map((l) => l.instagramUrl).filter((v): v is string => !!v)
  );

  const settings = await prisma.settings.findUnique({
    where: { id: "default" },
  });
  const ownerTag = settings?.defaultOwnerTag ?? "sanket";

  const seenListingUrls = new Set<string>();
  const seenInstagramUrls = new Set<string>();
  const validRows: ReturnType<typeof importRowSchema.parse>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2;
    try {
      const parsed = importRowSchema.parse(rows[i]);

      if (parsed.listingUrl && existingListingUrls.has(parsed.listingUrl)) {
        summary.skippedDuplicates++;
        continue;
      }
      if (
        parsed.instagramUrl &&
        existingInstagramUrls.has(parsed.instagramUrl)
      ) {
        summary.skippedDuplicates++;
        continue;
      }
      if (parsed.listingUrl && seenListingUrls.has(parsed.listingUrl)) {
        summary.skippedDuplicates++;
        continue;
      }
      if (parsed.instagramUrl && seenInstagramUrls.has(parsed.instagramUrl)) {
        summary.skippedDuplicates++;
        continue;
      }

      if (parsed.listingUrl) seenListingUrls.add(parsed.listingUrl);
      if (parsed.instagramUrl) seenInstagramUrls.add(parsed.instagramUrl);
      validRows.push(parsed);
    } catch (err) {
      const reason =
        err instanceof z.ZodError
          ? err.issues
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join("; ")
          : "Unknown error";
      summary.invalidRows.push({ rowNumber, reason });
    }
  }

  if (validRows.length > 0) {
    const created = await prisma.lead.createMany({
      data: validRows.map((r) => ({
        ...r,
        ownerTag,
      })),
      skipDuplicates: true,
    });
    summary.imported = created.count;
  }

  revalidatePath("/pipeline");
  revalidatePath("/all-leads");
  return summary;
}
