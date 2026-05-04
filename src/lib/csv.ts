import Papa from "papaparse";
import { DohGrade } from "@prisma/client";

const SITE_URL = "https://www.eatrealfoodnyc.com";

export type RawCsvRow = Record<string, string>;

export type CleanedRow = {
  businessName: string;
  instagramUrl: string | null;
  websiteUrl: string | null;
  listingUrl: string | null;
  city: string | null;
  neighborhood: string | null;
  businessType: string | null;
  dietaryTags: string[];
  dohGrade: DohGrade | null;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  googleRating: number | null;
  googleReviewCount: number | null;
};

export type DetectedFormat =
  | "backlinkpilot"
  | "erf-raw"
  | "mixed"
  | "unknown";

export type ParseResult = {
  rows: CleanedRow[];
  totalRowsInCsv: number;
  headersFound: string[];
  detectedFormat: DetectedFormat;
};

const trim = (v: string | undefined | null): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const parseUrl = (v: string | undefined | null): string | null => {
  const s = trim(v);
  if (!s) return null;
  try {
    new URL(s);
    return s;
  } catch {
    return null;
  }
};

const parseFirstEmail = (v: string | undefined | null): string | null => {
  const s = trim(v);
  if (!s) return null;
  const first = s.split(",")[0].trim().toLowerCase();
  return first || null;
};

const parsePhone = (v: string | undefined | null): string | null => {
  const s = trim(v);
  if (!s) return null;
  const cleaned = s.replace(/[^\d+]/g, "");
  return cleaned || null;
};

const parseDohGrade = (v: string | undefined | null): DohGrade | null => {
  const s = trim(v)?.toUpperCase();
  if (!s) return null;
  if (s === "A" || s === "B" || s === "C" || s === "NA") return s;
  return null;
};

const parseDietaryTags = (v: string | undefined | null): string[] => {
  const s = trim(v);
  if (!s) return [];
  return s
    .split(/[|,]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
};

const parseFloatSafe = (
  v: string | undefined | null,
  min: number,
  max: number
): number | null => {
  const s = trim(v);
  if (!s) return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return Math.min(Math.max(n, min), max);
};

const parseIntSafe = (
  v: string | undefined | null,
  min: number
): number | null => {
  const s = trim(v);
  if (!s) return null;
  const n = parseInt(s, 10);
  if (isNaN(n)) return null;
  return Math.max(n, min);
};

// Prefer the BacklinkPilot column name; fall back to the ERF NYC raw name.
const pick = (
  raw: RawCsvRow,
  primary: string,
  fallback?: string
): string | undefined => {
  const p = raw[primary];
  if (p != null && String(p).trim() !== "") return p;
  if (fallback) {
    const f = raw[fallback];
    if (f != null && String(f).trim() !== "") return f;
  }
  return undefined;
};

function resolveListingUrl(raw: RawCsvRow): string | null {
  const direct = parseUrl(raw.listingUrl);
  if (direct) return direct;
  const slug = trim(raw.slug);
  if (slug) return `${SITE_URL}/restaurants/${slug}`;
  return null;
}

function detectFormat(headers: string[]): DetectedFormat {
  const set = new Set(headers);
  if (set.has("businessName")) return "backlinkpilot";
  if (set.has("name") && set.has("slug")) return "erf-raw";
  if (set.has("name")) return "mixed";
  return "unknown";
}

function isEmptyRow(row: CleanedRow): boolean {
  if (row.businessName.trim() !== "") return false;
  if (
    row.instagramUrl ||
    row.websiteUrl ||
    row.listingUrl ||
    row.city ||
    row.neighborhood ||
    row.businessType ||
    row.contactEmail ||
    row.phone ||
    row.address ||
    row.googleRating != null ||
    row.googleReviewCount != null ||
    row.dohGrade ||
    row.dietaryTags.length > 0
  ) {
    return false;
  }
  return true;
}

export function parseCsv(csvText: string): ParseResult {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: CleanedRow[] = result.data
    .map<CleanedRow>((raw) => ({
      businessName: trim(pick(raw, "businessName", "name")) ?? "",
      instagramUrl: parseUrl(pick(raw, "instagramUrl", "company_instagram")),
      websiteUrl: parseUrl(pick(raw, "websiteUrl", "website")),
      listingUrl: resolveListingUrl(raw),
      city: trim(pick(raw, "city", "borough")),
      neighborhood: trim(pick(raw, "neighborhood", "neighborhood")),
      businessType: trim(pick(raw, "businessType", "type")),
      dietaryTags: parseDietaryTags(pick(raw, "dietaryTags", "dietary_tags")),
      dohGrade: parseDohGrade(pick(raw, "dohGrade", "inspection_grade")),
      contactEmail: parseFirstEmail(pick(raw, "contactEmail", "email")),
      phone: parsePhone(pick(raw, "phone", "phone")),
      address: trim(pick(raw, "address", "address")),
      googleRating: parseFloatSafe(pick(raw, "googleRating", "rating"), 0, 5),
      googleReviewCount: parseIntSafe(
        pick(raw, "googleReviewCount", "reviews"),
        0
      ),
    }))
    .filter((row) => !isEmptyRow(row));

  return {
    rows,
    totalRowsInCsv: result.data.length,
    headersFound: result.meta.fields ?? [],
    detectedFormat: detectFormat(result.meta.fields ?? []),
  };
}
