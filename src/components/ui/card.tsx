import { type HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type CardVariant = "default" | "subtle" | "flat" | "section";

export function Card({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white",
        variant === "default" && "border border-slate-200",
        variant === "subtle" && "border border-slate-100 bg-slate-50/60",
        variant === "flat" && "border border-transparent bg-transparent",
        variant === "section" && "border border-slate-200 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  divider = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & { divider?: boolean }) {
  return (
    <div
      className={cn(
        "px-4 py-3",
        divider && "border-b border-slate-200",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-sm font-semibold text-slate-950", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
