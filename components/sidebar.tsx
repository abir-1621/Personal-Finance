"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Gauge,
  History,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ScrollText,
  Settings,
  ShieldCheck,
  Users
} from "lucide-react";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type SidebarProps = {
  role: Role;
};

const baseLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deposits/add", label: "Add deposit", icon: PlusCircle },
  { href: "/deposits/history", label: "History", icon: History }
];

const adminLinks = [
  { href: "/admin", label: "Admin", icon: ShieldCheck },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/deposits", label: "Deposits", icon: ListChecks },
  { href: "/admin/monthly-report", label: "Reports", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-logs", label: "Audit logs", icon: ScrollText }
];

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-600 text-white">
          <Gauge className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold text-slate-950">Friend Savings</p>
          <p className="text-xs text-slate-500">Private tracker</p>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950",
                active && "bg-teal-50 text-teal-800"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
