export function getNextTemplateInCadence(
  currentTemplate: string | null
): string | null {
  if (!currentTemplate) return "1st Template";

  const progression: Record<string, string | null> = {
    "1st Template": "Prompt 1A",
    "1st Template - Email": "Prompt 1A",
    "Prompt 1A": "Prompt 1B",
    "Prompt 1B": "Prompt 1C",
    "Prompt 1C": "2nd Template",
    "2nd Template": "Prompt 2A",
    "Prompt 2A": "Prompt 2B",
    "Prompt 2B": "Prompt 2C",
    "Prompt 2C": "3rd Template",
    "3rd Template": "Prompt 3A",
    "Prompt 3A": "Prompt 3B",
    "Prompt 3B": "Prompt 3C",
    "Prompt 3C": null,
  };

  return progression[currentTemplate] ?? null;
}

export function wasUpdatedToday(updatedAt: Date | string): boolean {
  const updated =
    typeof updatedAt === "string" ? new Date(updatedAt) : updatedAt;
  const now = new Date();
  return (
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate()
  );
}

export function formatDueLabel(dueDate: Date | string): string {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();

  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  return due.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
