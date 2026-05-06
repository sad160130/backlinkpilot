import { getTimeAgoBadge, TIME_AGO_CLASSES } from "@/lib/time-ago";

type UpdatedAtBadgeProps = {
  date: Date | string | null | undefined;
  className?: string;
};

export function UpdatedAtBadge({ date, className = "" }: UpdatedAtBadgeProps) {
  const { badgeLabel, color } = getTimeAgoBadge(date);

  return (
    <span
      className={`text-xs ${TIME_AGO_CLASSES[color]} ${className}`}
      title={date ? new Date(date).toLocaleString() : "Never updated"}
    >
      {badgeLabel}
    </span>
  );
}
