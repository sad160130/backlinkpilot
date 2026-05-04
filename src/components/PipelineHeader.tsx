"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload } from "lucide-react";
import { EditLeadModal } from "./EditLeadModal";
import { BulkImportModal } from "./BulkImportModal";

export function PipelineHeader() {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  function closeEdit() {
    setEditOpen(false);
    router.refresh();
  }

  function closeImport() {
    setImportOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-forest">Pipeline</h1>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="border border-gray-300 px-4 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Bulk Import CSV
        </button>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="bg-jade text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-forest transition flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </button>
      </div>

      <EditLeadModal leadId={null} open={editOpen} onClose={closeEdit} />
      <BulkImportModal open={importOpen} onClose={closeImport} />
    </div>
  );
}
