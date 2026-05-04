"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseCsv, type CleanedRow } from "@/lib/csv";
import { bulkImportLeads, type ImportSummary } from "@/app/actions/import";

type Phase = "input" | "preview" | "importing" | "done";

const SQL_EXPORT = `SELECT
  r.name AS "businessName",
  r.company_instagram AS "instagramUrl",
  r.website AS "websiteUrl",
  CONCAT('https://www.eatrealfoodnyc.com/restaurants/', r.slug) AS "listingUrl",
  r.borough AS "city",
  r.neighborhood AS "neighborhood",
  r.type AS "businessType",
  COALESCE(r.dietary_tags, '') AS "dietaryTags",
  COALESCE(r.inspection_grade, 'NA') AS "dohGrade",
  TRIM(SPLIT_PART(COALESCE(r.email, ''), ',', 1)) AS "contactEmail",
  r.phone AS "phone",
  r.address AS "address",
  r.rating AS "googleRating",
  r.reviews AS "googleReviewCount"
FROM restaurants r
WHERE r.is_published = true
ORDER BY r.rating DESC NULLS LAST, r.reviews DESC NULLS LAST;`;

export function BulkImportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<CleanedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function reset() {
    setCsvText("");
    setParsedRows([]);
    setHeaders([]);
    setSummary(null);
    setError(null);
    setHelpOpen(false);
    setPhase("input");
  }

  function handleClose() {
    if (phase === "importing") return;
    reset();
    onClose();
  }

  function handlePreview() {
    setError(null);
    try {
      const result = parseCsv(csvText);
      if (result.rows.length === 0) {
        setError(
          "No data rows found. Make sure the first line is a header row."
        );
        return;
      }
      setParsedRows(result.rows);
      setHeaders(result.headersFound);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }

  async function handleImport() {
    setPhase("importing");
    try {
      const result = await bulkImportLeads(parsedRows);
      setSummary(result);
      setPhase("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setPhase("preview");
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Bulk Import CSV"
          className="pointer-events-auto bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        >
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-forest">Bulk Import CSV</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-md p-3">
                {error}
              </div>
            )}

            {phase === "input" && (
              <>
                <p className="text-sm text-gray-600">
                  Paste your CSV content below. The first row must be a header
                  row. See &quot;Help&quot; below for the SQL export query.
                </p>
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="businessName,instagramUrl,websiteUrl,listingUrl,city,neighborhood,businessType,dietaryTags,dohGrade,contactEmail,phone,address,googleRating,googleReviewCount&#10;..."
                  className="w-full h-64 font-mono text-xs border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade resize-y"
                />

                <div className="border border-gray-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => setHelpOpen((o) => !o)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      Help: SQL export query for eatrealfoodnyc.com
                    </span>
                    {helpOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {helpOpen && (
                    <div className="p-3 border-t border-gray-200 bg-cream/30">
                      <p className="text-xs text-gray-600 mb-2">
                        Run this in your eatrealfoodnyc.com Supabase SQL
                        Editor, then download the result as CSV and paste it
                        above.
                      </p>
                      <pre className="text-xs font-mono bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre">
                        {SQL_EXPORT}
                      </pre>
                    </div>
                  )}
                </div>
              </>
            )}

            {phase === "preview" && (
              <>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">
                    {parsedRows.length} rows parsed.
                  </span>{" "}
                  Preview of the first 5 rows below. Click Import to commit.
                </p>
                <p className="text-xs text-gray-500">
                  Headers detected: {headers.join(", ")}
                </p>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="w-full text-xs">
                    <thead className="bg-cream/40">
                      <tr>
                        <th className="text-left p-2 border-b">Business Name</th>
                        <th className="text-left p-2 border-b">Type</th>
                        <th className="text-left p-2 border-b">City</th>
                        <th className="text-left p-2 border-b">Neighborhood</th>
                        <th className="text-left p-2 border-b">Listing URL</th>
                        <th className="text-left p-2 border-b">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="p-2">
                            {r.businessName || (
                              <em className="text-red-500">missing</em>
                            )}
                          </td>
                          <td className="p-2">{r.businessType ?? "—"}</td>
                          <td className="p-2">{r.city ?? "—"}</td>
                          <td className="p-2">{r.neighborhood ?? "—"}</td>
                          <td className="p-2 truncate max-w-[200px]">
                            {r.listingUrl ?? "—"}
                          </td>
                          <td className="p-2">{r.googleRating ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {phase === "importing" && (
              <div className="text-center py-12">
                <p className="text-lg font-medium text-forest">Importing…</p>
                <p className="text-sm text-gray-500 mt-2">
                  Inserting {parsedRows.length} leads into the database.
                </p>
              </div>
            )}

            {phase === "done" && summary && (
              <div className="space-y-3">
                <div className="bg-jade/10 border border-jade/30 rounded-md p-4">
                  <p className="text-jade font-semibold">Import complete!</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Imported{" "}
                    <span className="font-medium">{summary.imported}</span>{" "}
                    leads.
                    {summary.skippedDuplicates > 0 && (
                      <>
                        {" "}
                        Skipped{" "}
                        <span className="font-medium">
                          {summary.skippedDuplicates}
                        </span>{" "}
                        duplicates.
                      </>
                    )}
                    {summary.invalidRows.length > 0 && (
                      <>
                        {" "}
                        <span className="font-medium text-amber">
                          {summary.invalidRows.length}
                        </span>{" "}
                        invalid rows.
                      </>
                    )}
                  </p>
                </div>
                {summary.invalidRows.length > 0 && (
                  <div className="bg-amber/5 border border-amber/30 rounded-md p-3">
                    <p className="text-sm font-medium text-amber mb-2">
                      Invalid rows:
                    </p>
                    <ul className="text-xs text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                      {summary.invalidRows.slice(0, 50).map((r, i) => (
                        <li key={i}>
                          Row {r.rowNumber}: {r.reason}
                        </li>
                      ))}
                      {summary.invalidRows.length > 50 && (
                        <li className="italic">
                          …and {summary.invalidRows.length - 50} more.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t flex justify-end gap-2">
            {phase === "input" && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={!csvText.trim()}
                  className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Preview
                </button>
              </>
            )}
            {phase === "preview" && (
              <>
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {parsedRows.length} Leads
                </button>
              </>
            )}
            {phase === "importing" && (
              <button
                type="button"
                disabled
                className="bg-jade/50 text-white px-4 py-2 rounded-md text-sm"
              >
                Importing…
              </button>
            )}
            {phase === "done" && (
              <button
                type="button"
                onClick={handleClose}
                className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
