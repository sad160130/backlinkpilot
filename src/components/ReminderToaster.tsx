"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { snoozeReminder } from "@/app/actions/reminders";

type ToastReminder = {
  id: string;
  leadId: string;
  label: string | null;
  dueDate: string;
  lead: { id: string; businessName: string };
};

export function ReminderToaster({
  reminders,
}: {
  reminders: ToastReminder[];
}) {
  const router = useRouter();

  useEffect(() => {
    reminders.forEach((r) => {
      toast(`⏰ ${r.lead.businessName}`, {
        id: r.id,
        description: r.label || "Follow up",
        duration: Infinity,
        action: {
          label: "Open",
          onClick: () => {
            router.push(`/pipeline?openLead=${r.leadId}`);
          },
        },
        cancel: {
          label: "Snooze 1d",
          onClick: async () => {
            try {
              await snoozeReminder({ reminderId: r.id, days: 1 });
              toast.success(`Snoozed ${r.lead.businessName} for 1 day`);
              router.refresh();
            } catch {
              toast.error("Snooze failed");
            }
          },
        },
      });
    });
  }, [reminders, router]);

  return null;
}
