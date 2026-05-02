"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "All Leads", href: "/all-leads" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Templates", href: "/templates" },
  { label: "Settings", href: "/settings" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "text-white border-b-2 border-jade pb-1 font-medium"
                : "text-white/60 pb-1 hover:text-white/80 transition-colors"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
