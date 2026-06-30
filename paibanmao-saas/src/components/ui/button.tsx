import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "default" | "lg" | "sm";
  variant?: "primary" | "secondary" | "ghost";
  asChild?: false;
};

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

const sizeClass = {
  sm: "h-9 px-3 text-sm",
  default: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const variantClass = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary: "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  className,
  size = "default",
  variant = "primary",
  asChild,
  children,
  ...props
}: ButtonProps | (Omit<ButtonProps, "asChild"> & { asChild: true; children: ReactNode })) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-60",
    sizeClass[size],
    variantClass[variant],
    className,
  );

  if (asChild) {
    const child = children as ReactElement<ButtonLinkProps>;
    return (
      <Link className={classes} href={child.props.href}>
        {child.props.children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
