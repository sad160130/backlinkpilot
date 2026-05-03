"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

export function HeaderBell({ dueCount }: { dueCount: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="relative text-white/70 hover:text-white"
      aria-label={`${dueCount} reminders due`}
      title={
        dueCount > 0
          ? `${dueCount} reminders due — click to re-show`
          : "No reminders due"
      }
    >
      <Bell className="h-5 w-5" />
      {dueCount > 0 && (
        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber" />
      )}
    </button>
  );
}
