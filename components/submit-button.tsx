"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function SubmitButton({
  children,
  className,
  pendingLabel = "Saving",
  variant = "primary"
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const variantClass =
    variant === "danger" ? "btn-danger" : variant === "secondary" ? "btn-secondary" : "btn-primary";

  return (
    <button type="submit" className={cn(variantClass, className)} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
