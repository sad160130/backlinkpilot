import type { PipelineStage } from "@prisma/client";

export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "OPPORTUNITY",
  "REACH_OUT_1",
  "UPGRADE_APPROVED",
  "UPGRADE_PREVIEW_SENT",
  "UPGRADE_LIVE",
  "BACKLINK_REQUIRED",
  "BACKLINK_ACQUIRED",
  "ON_HOLD",
  "NO_RESPONSE",
  "DECLINED_OFFER",
];

export const PIPELINE_STAGE_LABEL: Record<PipelineStage, string> = {
  OPPORTUNITY: "Opportunity",
  REACH_OUT_1: "1st Reach Out",
  UPGRADE_APPROVED: "Upgrade Approved",
  UPGRADE_PREVIEW_SENT: "Upgrade Preview Sent",
  UPGRADE_LIVE: "Upgrade Live",
  BACKLINK_REQUIRED: "Backlink Required",
  BACKLINK_ACQUIRED: "Backlink Acquired",
  ON_HOLD: "On Hold",
  NO_RESPONSE: "No Response",
  DECLINED_OFFER: "Declined Offer",
};

export function parseInstagramHandle(url: string | null): string | null {
  if (!url) return null;
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .replace(/^\/\//, "")
    .replace(/^www\./, "")
    .replace(/^instagram\.com\//, "")
    .replace(/\/$/, "")
    .trim();
  return cleaned || null;
}

export type PipelineReminder = {
  id: string;
  status: "PENDING" | "DONE" | "SNOOZED";
  dueDate: Date;
};

export type PipelineLead = {
  id: string;
  businessName: string;
  businessType: string | null;
  instagramUrl: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  neighborhood: string | null;
  city: string | null;
  contactFirstName: string | null;
  listingUrl: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
  verifiedBadge: boolean;
  ownerTag: string;
  pipelineStage: PipelineStage;
  updatedAt: Date;
  reminders: PipelineReminder[];
};
