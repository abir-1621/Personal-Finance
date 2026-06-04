import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  caption?: string;
  icon: LucideIcon;
  tone?: "teal" | "blue" | "amber" | "red" | "slate";
};

const toneClasses = {
  teal: "bg-teal-50 text-teal-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  slate: "bg-slate-100 text-slate-700"
};

export function StatCard({ title, value, caption, icon: Icon, tone = "teal" }: StatCardProps) {
  return (
    <section className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-normal text-slate-950">{value}</p>
          {caption ? <p className="mt-2 text-sm text-slate-500">{caption}</p> : null}
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}
