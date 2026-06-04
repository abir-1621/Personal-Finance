import Link from "next/link";
import { ClipboardList, ListChecks, Settings, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const adminCards = [
  {
    href: "/admin/members",
    title: "Members",
    description: "Create users, assign shares, and activate or deactivate members.",
    icon: Users
  },
  {
    href: "/admin/deposits",
    title: "Deposits",
    description: "Approve, reject, edit, and delete transaction records.",
    icon: ListChecks
  },
  {
    href: "/admin/monthly-report",
    title: "Monthly report",
    description: "Review expected, collected, pending, paid, and missing members.",
    icon: ClipboardList
  },
  {
    href: "/admin/settings",
    title: "Settings",
    description: "Update share price and currency for future deposits.",
    icon: Settings
  }
];

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Admin" description="Manage the private savings group." />
      <div className="grid gap-4 sm:grid-cols-2">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="panel block p-5 transition hover:border-teal-200 hover:shadow-md">
              <Icon className="h-6 w-6 text-teal-700" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
