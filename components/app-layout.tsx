"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { NavigationLoading } from "@/components/navigation-loading";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

type AppLayoutProps = {
  profile: Profile;
  children: React.ReactNode;
};

const mobileLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/deposits/add", label: "Add" },
  { href: "/deposits/history", label: "History" },
  { href: "/admin", label: "Admin", adminOnly: true }
];

export function AppLayout({ profile, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const ToggleIcon = sidebarOpen ? PanelLeftClose : PanelLeftOpen;

  useEffect(() => {
    const stored = window.localStorage.getItem("friends-fund-sidebar-open");

    if (stored) {
      setSidebarOpen(stored === "true");
    }
  }, []);

  function toggleSidebar() {
    setSidebarOpen((current) => {
      const next = !current;
      window.localStorage.setItem("friends-fund-sidebar-open", String(next));
      return next;
    });
  }

  return (
    <div className="relative flex min-h-screen bg-slate-50">
      <Suspense fallback={null}>
        <NavigationLoading />
      </Suspense>
      <Sidebar role={profile.role} collapsed={!sidebarOpen} />
      <button
        type="button"
        className={cn(
          "fixed top-1/2 z-30 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-panel transition-[left,color,background-color,border-color] hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-200 md:flex",
          sidebarOpen ? "left-64" : "left-0 translate-x-1/2"
        )}
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <ToggleIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar profile={profile} />
        <nav className="border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {mobileLinks
              .filter((link) => !link.adminOnly || profile.role === "ADMIN")
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  {link.label}
                </Link>
              ))}
          </div>
        </nav>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
