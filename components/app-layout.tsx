import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { Navbar } from "@/components/navbar";
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
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={profile.role} />
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
