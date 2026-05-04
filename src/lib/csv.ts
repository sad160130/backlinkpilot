import Papa from "papaparse";
import { DohGrade } from "@prisma/client";

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

export type ParseResult = {
  rows: CleanedRow[];
  totalRowsInCsv: number;
  headersFound: string[];
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

export function parseCsv(csvText: string): ParseResult {
  const result = Papa.parse<RawCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: CleanedRow[] = result.data.map((raw) => ({
    businessName: trim(raw.businessName) ?? "",
    instagramUrl: parseUrl(raw.instagramUrl),
    websiteUrl: parseUrl(raw.websiteUrl),
    listingUrl: parseUrl(raw.listingUrl),
    city: trim(raw.city),
    neighborhood: trim(raw.neighborhood),
    businessType: trim(raw.businessType),
    dietaryTags: parseDietaryTags(raw.dietaryTags),
    dohGrade: parseDohGrade(raw.dohGrade),
    contactEmail: parseFirstEmail(raw.contactEmail),
    phone: parsePhone(raw.phone),
    address: trim(raw.address),
    googleRating: parseFloatSafe(raw.googleRating, 0, 5),
    googleReviewCount: parseIntSafe(raw.googleReviewCount, 0),
  }));

  return {
    rows,
    totalRowsInCsv: result.data.length,
    headersFound: result.meta.fields ?? [],
  };
}
