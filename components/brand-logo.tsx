import { cn } from "@/lib/utils";

type LogoMarkProps = React.SVGProps<SVGSVGElement> & {
  decorative?: boolean;
};

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
  textClassName?: string;
};

export function LogoMark({ className, decorative = false, ...props }: LogoMarkProps) {
  const accessibilityProps = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-label": "Friends & Fund logo" };

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("h-10 w-10 shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...accessibilityProps}
      {...props}
    >
      {!decorative ? <title>Friends &amp; Fund</title> : null}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0F766E" />
      <path
        d="M18 45V20h24M18 32h18"
        fill="none"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <path
        d="M30 45V24h17M30 36h13"
        fill="none"
        stroke="#BFDBFE"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <circle cx="45.5" cy="44.5" r="8.5" fill="#FBBF24" stroke="#FEF3C7" strokeWidth="3" />
      <path
        d="M45.5 39.5v10M41.5 44.5h8"
        fill="none"
        stroke="#854D0E"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function BrandLogo({ className, markClassName, showTagline = true, textClassName }: BrandLogoProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <LogoMark className={markClassName} decorative />
      <div className={cn("min-w-0", textClassName)}>
        <p className="truncate text-sm font-bold text-slate-950">Friends &amp; Fund</p>
        {showTagline ? <p className="truncate text-xs text-slate-500">Private savings tracker</p> : null}
      </div>
    </div>
  );
}
