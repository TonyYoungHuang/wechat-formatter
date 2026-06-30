import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white shadow-sm shadow-emerald-900/[0.08]",
        className,
      )}
    >
      <svg viewBox="0 0 64 64" className="size-10" role="img">
        <defs>
          <linearGradient id="paibanmao-paw-main" x1="13" x2="50" y1="10" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#baf5d4" />
            <stop offset="1" stopColor="#5bd59a" />
          </linearGradient>
          <linearGradient id="paibanmao-paw-soft" x1="18" x2="45" y1="13" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f7fff9" />
            <stop offset="1" stopColor="#d9fae7" />
          </linearGradient>
          <filter id="paibanmao-paw-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#047857" floodOpacity="0.12" />
          </filter>
        </defs>
        <circle cx="32" cy="32" r="29" fill="#f1fff6" />
        <path
          d="M15.2 35.8c-1.8-2.3-1.7-6.1.8-8.4 2.2-2 5.4-1.7 7.1.7 1.8 2.4 1.4 6.3-1 8.4-2.3 2-5.2 1.7-6.9-.7Zm25.7-7.7c1.8-2.4 4.9-2.7 7.1-.7 2.5 2.3 2.6 6.1.8 8.4-1.7 2.4-4.6 2.7-6.9.7-2.4-2.1-2.8-6-1-8.4Z"
          fill="url(#paibanmao-paw-main)"
          filter="url(#paibanmao-paw-shadow)"
        />
        <path
          d="M32 34.4c8.8 0 15.3 6.2 15.3 13.1 0 4.6-3.1 7.5-7.5 7.5-2.7 0-4.7-1.2-7.8-1.2s-5.1 1.2-7.8 1.2c-4.4 0-7.5-2.9-7.5-7.5 0-6.9 6.5-13.1 15.3-13.1Z"
          fill="url(#paibanmao-paw-main)"
          filter="url(#paibanmao-paw-shadow)"
        />
        <path
          d="M19.3 16.2c3.7-.7 7.1 2.9 7.7 7.7.5 4.8-1.9 8.7-5.6 9.4-3.6.7-7.1-2.9-7.6-7.7-.6-4.8 1.9-8.7 5.5-9.4Zm25.4 0c3.6.7 6.1 4.6 5.5 9.4-.5 4.8-4 8.4-7.6 7.7-3.7-.7-6.1-4.6-5.6-9.4.6-4.8 4-8.4 7.7-7.7ZM32 10.4c3.8 0 6.7 3.8 6.7 8.6s-2.9 8.6-6.7 8.6-6.7-3.8-6.7-8.6 2.9-8.6 6.7-8.6Z"
          fill="url(#paibanmao-paw-main)"
          filter="url(#paibanmao-paw-shadow)"
        />
        <path d="M23.2 44.8c2.3-3 5.1-4.5 8.8-4.5s6.5 1.5 8.8 4.5c-2.9-1.5-5.8-2.2-8.8-2.2s-5.9.7-8.8 2.2ZM16.8 23.2c1.2-2.8 3-4.3 5-4.1 2.3.3 4.1 2.7 4.4 5.7-3.1-2-6.2-2.5-9.4-1.6Zm21 1.6c.3-3 2.1-5.4 4.4-5.7 2-.2 3.8 1.3 5 4.1-3.2-.9-6.3-.4-9.4 1.6Zm-9.5-9.6c1.1-2 2.3-3 3.7-3s2.6 1 3.7 3c-2.5-.6-4.9-.6-7.4 0Z" fill="url(#paibanmao-paw-soft)" opacity="0.8" />
        <path d="M19.8 39.7c-2.1 1.2-3.8 3.3-4.4 5.9m28.8-5.9c2.1 1.2 3.8 3.3 4.4 5.9M12.2 29.4c-1.3 1.1-2.1 2.8-2.1 4.6m43.8-4.6c1.3 1.1 2.1 2.8 2.1 4.6" fill="none" stroke="#d9fae7" strokeLinecap="round" strokeWidth="2.4" opacity="0.9" />
      </svg>
    </span>
  );
}

export function BrandLogo({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 text-lg font-semibold text-slate-950", className)}>
      <BrandMark />
      {compact ? null : <span>排版猫</span>}
    </Link>
  );
}
