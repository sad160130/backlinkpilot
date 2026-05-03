import type { Lead, PipelineStage, DohGrade } from "@prisma/client";

export type LeadFilterState = {
  search: string;
  stages: PipelineStage[];
  businessTypes: string[];
  cities: string[];
  neighborhoods: string[];
  dietaryTags: string[];
  drMin: number;
  drMax: number;
  dohGrades: DohGrade[];
  googleRatingMin: number;
  minReviews: number;
  hasInstagram: "any" | "yes" | "no";
  hasEmail: "any" | "yes" | "no";
  upgradeStatus:
    | "any"
    | "none"
    | "verified"
    | "priority"
    | "photos"
    | "all-three";
};

export const DEFAULT_FILTERS: LeadFilterState = {
  search: "",
  stages: [],
  businessTypes: [],
  cities: [],
  neighborhoods: [],
  dietaryTags: [],
  drMin: 0,
  drMax: 100,
  dohGrades: [],
  googleRatingMin: 0,
  minReviews: 0,
  hasInstagram: "any",
  hasEmail: "any",
  upgradeStatus: "any",
};

export type SortKey =
  | "businessName"
  | "businessType"
  | "city"
  | "neighborhood"
  | "domainRating"
  | "dohGrade"
  | "googleRating"
  | "googleReviewCount"
  | "pipelineStage"
  | "lastSentAt"
  | "createdAt";

export type SortDir = "asc" | "desc";

export function applyFilters<T extends Lead>(
  leads: T[],
  f: LeadFilterState
): T[] {
  const q = f.search.trim().toLowerCase();
  return leads.filter((l) => {
    if (q) {
      const haystack = [
        l.businessName,
        l.businessType,
        l.websiteUrl,
        l.instagramUrl,
        l.contactEmail,
        l.contactFirstName,
        l.neighborhood,
        l.city,
        l.listingUrl,
        l.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (f.stages.length && !f.stages.includes(l.pipelineStage)) return false;
    if (
      f.businessTypes.length &&
      (!l.businessType || !f.businessTypes.includes(l.businessType))
    )
      return false;
    if (f.cities.length && (!l.city || !f.cities.includes(l.city)))
      return false;
    if (
      f.neighborhoods.length &&
      (!l.neighborhood || !f.neighborhoods.includes(l.neighborhood))
    )
      return false;
    if (
      f.dietaryTags.length &&
      !f.dietaryTags.some((t) => l.dietaryTags.includes(t))
    )
      return false;
    if (l.domainRating != null) {
      if (l.domainRating < f.drMin || l.domainRating > f.drMax) return false;
    } else if (f.drMin > 0 || f.drMax < 100) {
      return false;
    }
    if (
      f.dohGrades.length &&
      (!l.dohGrade || !f.dohGrades.includes(l.dohGrade))
    )
      return false;
    if (f.googleRatingMin > 0 && (l.googleRating ?? 0) < f.googleRatingMin)
      return false;
    if (f.minReviews > 0 && (l.googleReviewCount ?? 0) < f.minReviews)
      return false;
    if (f.hasInstagram === "yes" && !l.instagramUrl) return false;
    if (f.hasInstagram === "no" && l.instagramUrl) return false;
    if (f.hasEmail === "yes" && !l.contactEmail) return false;
    if (f.hasEmail === "no" && l.contactEmail) return false;
    if (
      f.upgradeStatus === "none" &&
      (l.verifiedBadge || l.priorityPlacement || l.photosRefreshed)
    )
      return false;
    if (f.upgradeStatus === "verified" && !l.verifiedBadge) return false;
    if (f.upgradeStatus === "priority" && !l.priorityPlacement) return false;
    if (f.upgradeStatus === "photos" && !l.photosRefreshed) return false;
    if (
      f.upgradeStatus === "all-three" &&
      !(l.verifiedBadge && l.priorityPlacement && l.photosRefreshed)
    )
      return false;
    return true;
  });
}

export function applySort<T extends Lead>(
  leads: T[],
  key: SortKey,
  dir: SortDir
): T[] {
  const sorted = [...leads].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    if (av instanceof Date && bv instanceof Date)
      return av.getTime() - bv.getTime();
    return String(av).localeCompare(String(bv));
  });
  return dir === "asc" ? sorted : sorted.reverse();
}

export function exportToCsv(leads: Lead[]): string {
  const headers = [
    "Business Name",
    "Business Type",
    "Instagram URL",
    "Website URL",
    "Listing URL",
    "City",
    "Neighborhood",
    "Dietary Tags",
    "DOH Grade",
    "Domain Rating",
    "Google Rating",
    "Google Review Count",
    "Pipeline Stage",
    "Last Template Sent",
    "Last Sent At",
    "Verified Badge",
    "Priority Placement",
    "Photos Refreshed",
    "Backlink URL",
    "Contact Email",
    "Phone",
    "Address",
    "Created At",
  ];
  const rows = leads.map((l) => [
    l.businessName,
    l.businessType ?? "",
    l.instagramUrl ?? "",
    l.websiteUrl ?? "",
    l.listingUrl ?? "",
    l.city ?? "",
    l.neighborhood ?? "",
    l.dietaryTags.join("|"),
    l.dohGrade ?? "",
    l.domainRating ?? "",
    l.googleRating ?? "",
    l.googleReviewCount ?? "",
    l.pipelineStage,
    l.lastTemplateSent ?? "",
    l.lastSentAt ? l.lastSentAt.toISOString() : "",
    l.verifiedBadge,
    l.priorityPlacement,
    l.photosRefreshed,
    l.backlinkUrl ?? "",
    l.contactEmail ?? "",
    l.phone ?? "",
    l.address ?? "",
    l.createdAt.toISOString(),
  ]);
  const escape = (v: unknown) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}
