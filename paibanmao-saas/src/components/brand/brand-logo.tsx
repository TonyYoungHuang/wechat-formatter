import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-white shadow-sm shadow-emerald-900/[0.08]",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" className="size-8" role="img">
        <defs>
          <linearGradient id="paibanmao-paw-main" x1="10" x2="38" y1="9" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#28d989" />
            <stop offset="1" stopColor="#07945f" />
          </linearGradient>
          <linearGradient id="paibanmao-paw-soft" x1="13" x2="35" y1="8" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e8fff2" />
            <stop offset="1" stopColor="#9af0c2" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="21" fill="#ecfff4" />
        <path
          d="M16.8 23.7c2.5 0 4.5 2.7 4.5 5.9 0 3.4-2 5.8-4.5 5.8s-4.5-2.4-4.5-5.8c0-3.2 2-5.9 4.5-5.9Zm14.4 0c2.5 0 4.5 2.7 4.5 5.9 0 3.4-2 5.8-4.5 5.8s-4.5-2.4-4.5-5.8c0-3.2 2-5.9 4.5-5.9Z"
          fill="url(#paibanmao-paw-main)"
          opacity="0.96"
        />
        <path
          d="M24 25.7c5.4 0 9.7 4.1 9.7 8.8 0 3.1-2.1 5.1-5.3 5.1-1.5 0-2.8-.5-4.4-.5s-2.9.5-4.4.5c-3.2 0-5.3-2-5.3-5.1 0-4.7 4.3-8.8 9.7-8.8Z"
          fill="url(#paibanmao-paw-main)"
        />
        <path d="M15.5 12.2c2.4-.5 4.7 1.9 5.1 5.1.4 3.2-1.2 5.8-3.7 6.2-2.4.4-4.7-1.9-5.1-5.1-.4-3.1 1.3-5.7 3.7-6.2Zm17 0c2.4.5 4.1 3.1 3.7 6.2-.4 3.2-2.7 5.5-5.1 5.1-2.5-.4-4.1-3-3.7-6.2.4-3.2 2.7-5.6 5.1-5.1ZM24 8.5c2.5 0 4.5 2.5 4.5 5.8 0 3.2-2 5.8-4.5 5.8s-4.5-2.6-4.5-5.8c0-3.3 2-5.8 4.5-5.8Z" fill="url(#paibanmao-paw-main)" />
        <path d="M20.4 32.4h7.2v1.8h-7.2v-1.8Zm1.1-3.2h5v1.7h-5v-1.7Zm-.9 6.3h6.8v1.6h-6.8v-1.6Z" fill="#ffffff" opacity="0.9" />
        <path d="M13.8 16.4c.7-1.5 1.8-2.4 3-2.2 1.5.3 2.6 1.8 2.8 3.8-1.9-1.4-3.8-1.9-5.8-1.6Zm14.8 1.6c.3-2 1.4-3.5 2.8-3.8 1.2-.2 2.3.7 3 2.2-2-.3-3.9.2-5.8 1.6Zm-6.8-5.3c.7-1.4 1.4-2.1 2.2-2.1s1.5.7 2.2 2.1c-1.5-.4-2.9-.4-4.4 0Z" fill="url(#paibanmao-paw-soft)" opacity="0.45" />
      </svg>
    </span>
  );
}

export function BrandLogo({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold text-slate-950", className)}>
      <BrandMark />
      {compact ? null : <span>排版猫</span>}
    </Link>
  );
}
