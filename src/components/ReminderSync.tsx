import { getDueReminders } from "@/app/actions/reminders";
import { ReminderToaster } from "./ReminderToaster";

export async function ReminderSync() {
  const due = await getDueReminders();
  return (
    <ReminderToaster
      reminders={due.map((r) => ({
        id: r.id,
        leadId: r.leadId,
        label: r.label,
        dueDate: r.dueDate.toISOString(),
        lead: { id: r.lead.id, businessName: r.lead.businessName },
      }))}
    />
  );
}
