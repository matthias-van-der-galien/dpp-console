import { type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function InlineState({
  title,
  detail,
  tone = "neutral",
  action,
}: {
  title: string;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm",
        tone === "neutral" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "success" && "border-green-200 bg-green-50 text-green-900",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "danger" && "border-red-200 bg-red-50 text-red-900",
      )}
    >
      <span>
        <span className="font-medium">{title}</span>
        {detail ? <span className="ml-1 text-slate-600">{detail}</span> : null}
      </span>
      {action}
    </div>
  );
}

export function FieldList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-3 text-sm",
        columns === 1 && "grid-cols-1",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 font-medium text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RecordList({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {children}
    </div>
  );
}

export function RecordRow({
  title,
  description,
  meta,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-950">{title}</div>
        {description ? (
          <div className="mt-1 text-sm text-slate-600">{description}</div>
        ) : null}
        {meta ? (
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            {meta}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
