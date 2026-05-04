"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDeferredValue } from "react";
import { Search, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DohGrade, Lead, PipelineStage } from "@prisma/client";
import {
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGE_ORDER,
  parseInstagramHandle,
} from "@/lib/pipeline";
import {
  DEFAULT_FILTERS,
  applyFilters,
  applySort,
  exportToCsv,
  type LeadFilterState,
  type SortDir,
  type SortKey,
} from "@/lib/lead-filters";
import { EditLeadModal } from "./EditLeadModal";
import { BulkImportModal } from "./BulkImportModal";

type LeadReminderLite = {
  id: string;
  status: "PENDING" | "DONE" | "SNOOZED";
  dueDate: Date;
};

export type LeadWithReminders = Lead & { reminders: LeadReminderLite[] };

type AllLeadsTableProps = {
  leads: LeadWithReminders[];
};

const PAGE_SIZE = 50;

const STAGE_PILL_CLASS: Record<PipelineStage, string> = {
  BACKLINK_ACQUIRED: "bg-jade text-white",
  REACH_OUT_1: "bg-forest text-white",
  UPGRADE_APPROVED: "bg-forest text-white",
  UPGRADE_PREVIEW_SENT: "bg-forest text-white",
  UPGRADE_LIVE: "bg-forest text-white",
  BACKLINK_REQUIRED: "bg-forest text-white",
  OPPORTUNITY: "bg-sage text-forest",
  ON_HOLD: "bg-gray-200 text-gray-600",
  NO_RESPONSE: "bg-gray-200 text-gray-600",
  DECLINED_OFFER: "bg-gray-200 text-gray-600",
};

const DOH_PILL_CLASS: Record<DohGrade, string> = {
  A: "bg-jade text-white",
  B: "bg-amber text-white",
  C: "bg-red-500 text-white",
  NA: "bg-gray-300 text-gray-600",
};

function drPillClass(dr: number): string {
  if (dr <= 20) return "bg-gray-200 text-gray-700";
  if (dr <= 40) return "bg-amber/20 text-amber";
  if (dr <= 70) return "bg-jade/20 text-jade";
  return "bg-forest text-white";
}

function truncateEmail(email: string): string {
  return email.length > 24 ? `${email.slice(0, 24)}…` : email;
}

export function AllLeadsTable({ leads }: AllLeadsTableProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<LeadFilterState>(DEFAULT_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>("googleRating");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const deferredFilters = useDeferredValue(filters);

  const filteredLeads = useMemo(
    () => applyFilters(leads, deferredFilters),
    [leads, deferredFilters]
  );

  const sortedLeads = useMemo(
    () => applySort(filteredLeads, sortKey, sortDir),
    [filteredLeads, sortKey, sortDir]
  );

  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages - 1) setPage(0);
  }, [page, totalPages]);

  const pagedLeads = useMemo(
    () => sortedLeads.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [sortedLeads, page]
  );

  const remindersByLeadId = useMemo(() => {
    const map = new Map<string, LeadReminderLite[]>();
    for (const l of leads) map.set(l.id, l.reminders);
    return map;
  }, [leads]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function handleExportCsv() {
    const csv = exportToCsv(sortedLeads);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlinkpilot-leads-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openLead(id: string) {
    setEditingLeadId(id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingLeadId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <FiltersBar
        filters={filters}
        setFilters={setFilters}
        leads={leads}
        onClearAll={() => setFilters(DEFAULT_FILTERS)}
      />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {sortedLeads.length} leads
          {sortedLeads.length !== leads.length && (
            <span className="text-gray-400"> (of {leads.length} total)</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="border border-gray-300 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="border border-gray-300 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Import CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingLeadId(null);
              setModalOpen(true);
            }}
            className="bg-jade text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-forest"
          >
            + New Lead
          </button>
        </div>
      </div>

      <Table
        leads={pagedLeads}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={openLead}
        remindersByLeadId={remindersByLeadId}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <EditLeadModal
        leadId={editingLeadId}
        open={modalOpen}
        onClose={closeModal}
      />

      <BulkImportModal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

// -------------------- FiltersBar --------------------

type FiltersBarProps = {
  filters: LeadFilterState;
  setFilters: (next: LeadFilterState) => void;
  leads: LeadWithReminders[];
  onClearAll: () => void;
};

const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade";

const selectMultipleCls =
  "w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade";

function FiltersBar({
  filters,
  setFilters,
  leads,
  onClearAll,
}: FiltersBarProps) {
  const [expanded, setExpanded] = useState(true);

  const distinctBusinessTypes = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.businessType).filter((v): v is string => !!v))
      ).sort(),
    [leads]
  );
  const distinctCities = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.city).filter((v): v is string => !!v))
      ).sort(),
    [leads]
  );
  const distinctNeighborhoods = useMemo(
    () =>
      Array.from(
        new Set(leads.map((l) => l.neighborhood).filter((v): v is string => !!v))
      ).sort(),
    [leads]
  );
  const distinctDietaryTags = useMemo(
    () => Array.from(new Set(leads.flatMap((l) => l.dietaryTags))).sort(),
    [leads]
  );

  function update<K extends keyof LeadFilterState>(
    key: K,
    value: LeadFilterState[K]
  ) {
    setFilters({ ...filters, [key]: value });
  }

  function readSelectedValues<T extends string>(
    e: React.ChangeEvent<HTMLSelectElement>
  ): T[] {
    return Array.from(e.target.selectedOptions).map((o) => o.value as T);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-sm font-medium text-forest"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Filters
        </button>
        <button
          type="button"
          onClick={onClearAll}
          className="text-jade text-sm underline hover:text-forest"
        >
          Clear all filters
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              className={`${inputCls} pl-10`}
              placeholder="Search leads by name, email, neighborhood…"
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <FilterField label="Stage">
              <select
                multiple
                size={5}
                className={selectMultipleCls}
                value={filters.stages}
                onChange={(e) =>
                  update("stages", readSelectedValues<PipelineStage>(e))
                }
              >
                {PIPELINE_STAGE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {PIPELINE_STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Business Type">
              <select
                multiple
                size={5}
                className={selectMultipleCls}
                value={filters.businessTypes}
                onChange={(e) =>
                  update("businessTypes", readSelectedValues<string>(e))
                }
              >
                {distinctBusinessTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Neighborhood">
              <select
                multiple
                size={5}
                className={selectMultipleCls}
                value={filters.neighborhoods}
                onChange={(e) =>
                  update("neighborhoods", readSelectedValues<string>(e))
                }
              >
                {distinctNeighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <FilterField label="City">
              <select
                multiple
                size={5}
                className={selectMultipleCls}
                value={filters.cities}
                onChange={(e) =>
                  update("cities", readSelectedValues<string>(e))
                }
              >
                {distinctCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Dietary Tags">
              <select
                multiple
                size={5}
                className={selectMultipleCls}
                value={filters.dietaryTags}
                onChange={(e) =>
                  update("dietaryTags", readSelectedValues<string>(e))
                }
              >
                {distinctDietaryTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="DOH Grade">
              <select
                multiple
                size={4}
                className={selectMultipleCls}
                value={filters.dohGrades}
                onChange={(e) =>
                  update("dohGrades", readSelectedValues<DohGrade>(e))
                }
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="NA">NA</option>
              </select>
            </FilterField>

            <FilterField label="Upgrade Status">
              <select
                className={inputCls}
                value={filters.upgradeStatus}
                onChange={(e) =>
                  update(
                    "upgradeStatus",
                    e.target.value as LeadFilterState["upgradeStatus"]
                  )
                }
              >
                <option value="any">Any</option>
                <option value="none">None</option>
                <option value="verified">Verified</option>
                <option value="priority">Priority</option>
                <option value="photos">Photos</option>
                <option value="all-three">All Three</option>
              </select>
            </FilterField>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                Domain Rating
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={filters.drMin}
                  onChange={(e) =>
                    update("drMin", clamp(Number(e.target.value), 0, 100))
                  }
                />
                <span className="text-gray-400 text-sm">to</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={inputCls}
                  value={filters.drMax}
                  onChange={(e) =>
                    update("drMax", clamp(Number(e.target.value), 0, 100))
                  }
                />
              </div>
            </div>

            <div>
              <span className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                <span>Google Rating ≥</span>
                <span className="text-gray-700 normal-case">
                  {filters.googleRatingMin.toFixed(1)}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={filters.googleRatingMin}
                onChange={(e) =>
                  update("googleRatingMin", Number(e.target.value))
                }
                className="w-full accent-jade"
              />
            </div>

            <FilterField label="Min Reviews">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={filters.minReviews}
                onChange={(e) =>
                  update("minReviews", Math.max(0, Number(e.target.value) || 0))
                }
              />
            </FilterField>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ThreeWayToggle
              label="Has Instagram?"
              value={filters.hasInstagram}
              onChange={(v) => update("hasInstagram", v)}
            />
            <ThreeWayToggle
              label="Has Email?"
              value={filters.hasEmail}
              onChange={(v) => update("hasEmail", v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      {children}
    </div>
  );
}

function ThreeWayToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "any" | "yes" | "no";
  onChange: (v: "any" | "yes" | "no") => void;
}) {
  const opts: Array<{ key: "any" | "yes" | "no"; label: string }> = [
    { key: "any", label: "Any" },
    { key: "yes", label: "Yes" },
    { key: "no", label: "No" },
  ];
  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
        {label}
      </span>
      <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
        {opts.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-jade text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

// -------------------- Table --------------------

type TableProps = {
  leads: LeadWithReminders[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  onRowClick: (id: string) => void;
  remindersByLeadId: Map<string, LeadReminderLite[]>;
};

function Table({
  leads,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  remindersByLeadId,
}: TableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream/50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <SortableTh
              label="Business Name"
              k="businessName"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Type"
              k="businessType"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="City"
              k="city"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Neighborhood"
              k="neighborhood"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="px-3 py-2 font-medium">Channel</th>
            <SortableTh
              label="DR"
              k="domainRating"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="DOH"
              k="dohGrade"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="⭐"
              k="googleRating"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTh
              label="Stage"
              k="pipelineStage"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="px-3 py-2 font-medium">Upgrade</th>
            <SortableTh
              label="Last Template"
              k="lastSentAt"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th className="px-3 py-2 font-medium">Reminder</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.length === 0 ? (
            <tr>
              <td
                colSpan={12}
                className="px-3 py-12 text-center text-gray-400 text-sm"
              >
                No leads match the current filters.
              </td>
            </tr>
          ) : (
            leads.map((l) => (
              <Row
                key={l.id}
                lead={l}
                onClick={() => onRowClick(l.id)}
                reminders={remindersByLeadId.get(l.id) ?? []}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortableTh({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 hover:text-forest ${
          active ? "text-forest" : ""
        }`}
      >
        <span>{label}</span>
        {active &&
          (sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          ))}
      </button>
    </th>
  );
}

function Row({
  lead,
  reminders,
  onClick,
}: {
  lead: LeadWithReminders;
  reminders: LeadReminderLite[];
  onClick: () => void;
}) {
  const now = Date.now();
  const hasPendingReminder = reminders.some(
    (r) => r.status === "PENDING"
  );
  const hasOverdue = reminders.some(
    (r) => r.status === "PENDING" && r.dueDate.getTime() <= now
  );

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer hover:bg-cream/30 ${
        hasOverdue ? "bg-purple-50/30" : ""
      }`}
    >
      <td className="px-3 py-2 font-medium text-gray-800">{lead.businessName}</td>
      <td className="px-3 py-2 text-gray-600">{lead.businessType ?? "—"}</td>
      <td className="px-3 py-2 text-gray-600">{lead.city ?? "—"}</td>
      <td className="px-3 py-2 text-gray-600">{lead.neighborhood ?? "—"}</td>
      <td className="px-3 py-2"><ChannelCell lead={lead} /></td>
      <td className="px-3 py-2">
        {lead.domainRating != null ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${drPillClass(
              lead.domainRating
            )}`}
          >
            {lead.domainRating}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        {lead.dohGrade ? (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              DOH_PILL_CLASS[lead.dohGrade]
            }`}
          >
            {lead.dohGrade}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-700">
        {lead.googleRating != null
          ? `${lead.googleRating.toFixed(1)} (${lead.googleReviewCount?.toLocaleString() ?? 0})`
          : "—"}
      </td>
      <td className="px-3 py-2">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            STAGE_PILL_CLASS[lead.pipelineStage]
          }`}
        >
          {PIPELINE_STAGE_LABEL[lead.pipelineStage]}
        </span>
      </td>
      <td className="px-3 py-2">
        <span
          className="inline-flex items-center gap-0.5 text-xs"
          title="Verified / Priority / Photos"
        >
          <span className={lead.verifiedBadge ? "text-jade" : "text-gray-300"}>
            ✓
          </span>
          <span
            className={lead.priorityPlacement ? "text-jade" : "text-gray-300"}
          >
            ✓
          </span>
          <span className={lead.photosRefreshed ? "text-jade" : "text-gray-300"}>
            ✓
          </span>
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-700">
        {lead.lastTemplateSent ? (
          <div>
            <div className="font-medium text-gray-800">
              {lead.lastTemplateSent}
            </div>
            {lead.lastSentAt && (
              <div className="text-gray-500">
                {formatDistanceToNow(new Date(lead.lastSentAt), {
                  addSuffix: true,
                })}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        {hasPendingReminder ? (
          <span className="text-purple-500" aria-label="Pending reminder">
            ✓
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}

function ChannelCell({ lead }: { lead: Lead }) {
  if (lead.instagramUrl) {
    const handle = parseInstagramHandle(lead.instagramUrl);
    return <span className="text-jade text-xs">@{handle ?? ""}</span>;
  }
  if (lead.contactEmail) {
    return (
      <span className="text-gray-500 text-xs">
        {truncateEmail(lead.contactEmail)}
      </span>
    );
  }
  return <span className="text-gray-300">—</span>;
}

// -------------------- Pagination --------------------

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const [inputValue, setInputValue] = useState(String(page + 1));

  useEffect(() => {
    setInputValue(String(page + 1));
  }, [page]);

  if (totalPages <= 1) return null;

  function go(toZeroIndexed: number) {
    const clamped = clamp(toZeroIndexed, 0, totalPages - 1);
    onPageChange(clamped);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(inputValue, 10);
    if (Number.isFinite(n)) go(n - 1);
  }

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      <div className="flex items-center gap-3 text-sm text-gray-600">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <span className="text-gray-500">Go to</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-jade/40"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </form>
      </div>

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-1.5 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
