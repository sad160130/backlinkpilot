import { MapPin } from "lucide-react";
import { Toaster } from "sonner";
import { NavTabs } from "./_components/NavTabs";
import { logout } from "@/app/actions/auth";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="w-full bg-[#0B1A2E] text-white py-3 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6 text-jade" />
          <span className="font-bold text-xl">BacklinkPilot</span>
          <span className="bg-white/10 rounded-full px-2 py-0.5 text-xs">v1.0</span>
        </div>

        <NavTabs />

        <div className="flex items-center gap-3">
          <form action={logout}>
            <button
              type="submit"
              className="text-white/60 text-sm hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </form>
          <span className="bg-jade/20 text-sage rounded-full px-3 py-1 text-xs">
            Connected
          </span>
          <div className="h-8 w-8 rounded-full bg-jade text-white flex items-center justify-center font-semibold">
            S
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
