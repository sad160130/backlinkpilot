export type TimeAgoColor = "green" | "grey" | "amber" | "red";

export interface TimeAgoResult {
  label: string;
  color: TimeAgoColor;
  daysAgo: number;
}

export function getTimeAgo(
  date: Date | string | null | undefined
): TimeAgoResult {
  if (!date) {
    return { label: "Never updated", color: "grey", daysAgo: 9999 };
  }

  const updated = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const updatedMidnight = new Date(
    updated.getFullYear(),
    updated.getMonth(),
    updated.getDate()
  );

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAgo = Math.floor(
    (todayMidnight.getTime() - updatedMidnight.getTime()) / msPerDay
  );

  let label: string;
  if (daysAgo === 0) {
    label = "Today";
  } else if (daysAgo === 1) {
    label = "1d ago";
  } else if (daysAgo < 7) {
    label = `${daysAgo}d ago`;
  } else if (daysAgo < 14) {
    label = "1w ago";
  } else if (daysAgo < 21) {
    label = "2w ago";
  } else if (daysAgo < 30) {
    label = "3w ago";
  } else {
    const months = Math.floor(daysAgo / 30);
    label = `${months}mo ago`;
  }

  let color: TimeAgoColor;
  if (daysAgo === 0) {
    color = "green";
  } else if (daysAgo <= 5) {
    color = "grey";
  } else if (daysAgo <= 13) {
    color = "amber";
  } else {
    color = "red";
  }

  return { label, color, daysAgo };
}

// Project palette note: tailwind.config.ts overrides `amber` with a single
// hex, so `text-amber-500` is not a valid class here — bare `text-amber` is.
export const TIME_AGO_CLASSES: Record<TimeAgoColor, string> = {
  green: "text-green-600 font-semibold",
  grey: "text-gray-400",
  amber: "text-amber font-medium",
  red: "text-red-500 font-semibold",
};

export function getTimeAgoBadge(
  date: Date | string | null | undefined
): TimeAgoResult & { badgeLabel: string } {
  const result = getTimeAgo(date);
  return {
    ...result,
    badgeLabel: `Updated ${result.label}`,
  };
}
