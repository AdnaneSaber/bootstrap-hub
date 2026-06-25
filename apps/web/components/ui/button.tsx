"use client";

import { ReactNode, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?: "default" | "outline" | "destructive" | "ghost" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  asChild?: boolean;
  onClick?: () => void;
}

export function Button({
  children,
  type = "button",
  variant = "default",
  size = "default",
  disabled = false,
  loading = false,
  className,
  asChild = false,
  onClick,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
    outline:
      "border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-900",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
    link: "text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50",
  };
  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-sm",
    lg: "h-11 px-6 text-base",
    icon: "h-10 w-10",
  };

  const classes = cn(base, variants[variant], sizes[size], className);
  const spinner = (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string; children?: ReactNode }>;
    return cloneElement(child, {
      className: cn(classes, child.props.className),
      children: (
        <>
          {loading && spinner}
          {child.props.children}
        </>
      ),
    } as Record<string, unknown>);
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
    >
      {loading && spinner}
      {children}
    </button>
  );
}
