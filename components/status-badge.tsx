import type { DepositStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: DepositStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-20 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        status === "APPROVED" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        status === "PENDING" && "border-amber-200 bg-amber-50 text-amber-700",
        status === "REJECTED" && "border-red-200 bg-red-50 text-red-700"
      )}
    >
      {status[0] + status.slice(1).toLowerCase()}
    </span>
  );
}
