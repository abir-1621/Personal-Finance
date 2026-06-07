import Link from "next/link";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand-logo";
import type { Profile } from "@/lib/types";

type NavbarProps = {
  profile: Profile;
};

export function Navbar({ profile }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 md:hidden">
            <Menu className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-950">
              <LogoMark className="h-8 w-8" decorative />
              <span className="truncate">Friends &amp; Fund</span>
            </Link>
          </div>
          <p className="hidden text-sm font-medium text-slate-500 md:block">Private savings tracker</p>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <UserCircle className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-slate-900">{profile.full_name}</p>
              <p className="text-xs text-slate-500">{profile.role}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary px-3" title="Sign out" aria-label="Sign out">
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
