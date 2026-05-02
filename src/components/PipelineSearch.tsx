"use client";

import { Search } from "lucide-react";

type PipelineSearchProps = {
  value: string;
  onChange: (v: string) => void;
};

export function PipelineSearch({ value, onChange }: PipelineSearchProps) {
  return (
    <div className="relative">
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search pipeline..."
        className="w-full max-w-md pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-jade/40 focus:border-jade"
      />
    </div>
  );
}
