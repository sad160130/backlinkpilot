"use client";

import { AlertTriangle, CheckCircle2, Mail, ChevronsRight } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { parseInstagramHandle } from "@/lib/pipeline";
import {
  formatDueLabel,
  getNextTemplateInCadence,
  wasUpdatedToday,
} from "@/lib/template-progression";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

type LeadCardProps = {
  lead: {
    id: string;
    businessName: string;
    businessType: string | null;
    instagramUrl: string | null;
    contactEmail: string | null;
    neighborhood: string | null;
    city: string | null;
    googleRating: number | null;
    googleReviewCount: number | null;
    verifiedBadge: boolean;
    ownerTag: string;
    lastTemplateSent: string | null;
    lastSentAt: Date | null;
    updatedAt: Date;
    reminders: { id: string; status: "PENDING" | "DONE" | "SNOOZED"; dueDate: Date }[];
  };
  onOpen?: (leadId: string) => void;
};

function truncateEmail(email: string): string {
  return email.length > 24 ? `${email.slice(0, 24)}...` : email;
}

function ChannelIndicator({
  instagramUrl,
  contactEmail,
}: {
  instagramUrl: string | null;
  contactEmail: string | null;
}) {
  if (instagramUrl) {
    const handle = parseInstagramHandle(instagramUrl);
    return (
      <div className="text-xs flex items-center gap-1 text-jade">
        <InstagramIcon className="h-3 w-3 text-jade" />
        <span>@{handle ?? ""}</span>
      </div>
    );
  }
  if (contactEmail) {
    return (
      <div className="text-xs flex items-center gap-1 text-gray-600">
        <Mail className="h-3 w-3 text-gray-500" />
        <span>{truncateEmail(contactEmail)}</span>
      </div>
    );
  }
  return (
    <div className="text-xs flex items-center gap-1 text-amber">
      <AlertTriangle className="h-3 w-3 text-amber" />
      <span>no contact</span>
    </div>
  );
}

function dueLabelClass(label: string): string {
  if (label === "overdue") return "text-red-500 font-medium";
  if (label === "today" || label === "tomorrow") return "text-amber font-medium";
  return "text-gray-500 font-medium";
}

export function LeadCard({ lead, onOpen }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const now = Date.now();
  const hasOverdue = lead.reminders.some(
    (r) => r.status === "PENDING" && r.dueDate.getTime() <= now
  );

  const baseClass =
    "w-full text-left bg-white rounded-lg shadow-sm border border-transparent hover:border-jade/30 transition p-3 space-y-1.5 cursor-pointer";
  const ringClass = hasOverdue ? " ring-2 ring-purple-400" : "";
  const dragClass = isDragging ? " opacity-30" : "";
  const className = `${baseClass}${ringClass}${dragClass}`;

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const nextTemplate = lead.lastTemplateSent
    ? getNextTemplateInCadence(lead.lastTemplateSent)
    : null;

  const nextReminder = lead.reminders.find((r) => r.status === "PENDING");
  const reminderDueLabel = nextReminder
    ? formatDueLabel(nextReminder.dueDate)
    : null;

  const lastSentRelative =
    !nextReminder && lead.lastSentAt
      ? formatDistanceToNow(new Date(lead.lastSentAt), { addSuffix: true })
      : null;

  const showTodayPill = wasUpdatedToday(lead.updatedAt);

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onOpen?.(lead.id)}
      className={className}
      style={style}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-forest leading-tight">{lead.businessName}</div>
        {lead.verifiedBadge && (
          <CheckCircle2 className="h-4 w-4 text-jade shrink-0" aria-label="Verified" />
        )}
      </div>

      {lead.businessType && (
        <div className="text-xs text-gray-500">{lead.businessType}</div>
      )}

      <ChannelIndicator
        instagramUrl={lead.instagramUrl}
        contactEmail={lead.contactEmail}
      />

      {lead.googleRating !== null && (
        <div className="text-xs text-gray-500">
          ⭐ {lead.googleRating.toFixed(1)} ({lead.googleReviewCount?.toLocaleString() ?? 0})
        </div>
      )}

      {lead.lastTemplateSent && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1 text-gray-700 min-w-0">
              <Mail className="h-3 w-3 text-jade shrink-0" />
              <span className="font-medium truncate">{lead.lastTemplateSent}</span>
            </span>
            {reminderDueLabel ? (
              <span className={`shrink-0 ${dueLabelClass(reminderDueLabel)}`}>
                {reminderDueLabel}
              </span>
            ) : lastSentRelative ? (
              <span className="shrink-0 text-gray-500">{lastSentRelative}</span>
            ) : null}
          </div>
          {nextTemplate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <ChevronsRight className="h-3 w-3" />
              <span>
                Next: <span className="text-gray-700">{nextTemplate}</span>
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-2 gap-2">
        <span className="text-xs text-gray-600">
          📍 {lead.neighborhood ?? lead.city ?? "—"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="bg-jade/10 text-jade rounded-full px-2 py-0.5 text-xs">
            {lead.ownerTag}
          </span>
          {showTodayPill && (
            <span className="bg-jade text-white text-xs rounded-full px-2 py-0.5 font-medium">
              Today
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
