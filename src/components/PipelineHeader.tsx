"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { EditLeadModal } from "./EditLeadModal";

export function PipelineHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleClose() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-forest">Pipeline</h1>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest transition flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        New Lead
      </button>

      <EditLeadModal leadId={null} open={open} onClose={handleClose} />
    </div>
  );
}
