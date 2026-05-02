"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Accent = "default" | "win" | "warning";

interface StatTileProps {
  label: string;
  value: number;
  accent?: Accent;
  href?: string;
}

const baseClasses =
  "block w-full text-left rounded-xl bg-white border-l-4 border-jade shadow-sm p-5 hover:bg-cream/50 cursor-pointer transition-colors";

function valueColor(accent: Accent, value: number): string {
  if (accent === "win") return "text-jade";
  if (accent === "warning" && value > 0) return "text-amber";
  return "text-forest";
}

export function StatTile({ label, value, accent = "default", href }: StatTileProps) {
  const content: ReactNode = (
    <>
      <div className={`text-3xl font-bold ${valueColor(accent, value)}`}>{value}</div>
      <div className="text-xs tracking-wide text-gray-500 uppercase mt-1">{label}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => {}} className={baseClasses}>
      {content}
    </button>
  );
}
