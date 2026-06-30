import { cn } from "@/lib/utils/cn";
import { titleize } from "@/lib/utils/format";

export type Tone = "neutral" | "good" | "warn" | "bad" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
  good: "border-green-200 bg-green-50 text-green-800",
  warn: "border-amber-200 bg-amber-50 text-amber-800",
  bad: "border-red-200 bg-red-50 text-red-800",
  info: "border-teal-200 bg-teal-50 text-teal-800",
};

export function Badge({
  value,
  tone = "neutral",
}: {
  value: unknown;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {titleize(value)}
    </span>
  );
}

const dotClasses: Record<Tone, string> = {
  neutral: "bg-slate-400",
  good: "bg-green-600",
  warn: "bg-amber-600",
  bad: "bg-red-600",
  info: "bg-teal-600",
};

export function StatusText({
  value,
  tone = statusTone(value),
  className,
}: {
  value: unknown;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-slate-600",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClasses[tone])} />
      {titleize(value)}
    </span>
  );
}

export function statusTone(value: unknown): Tone {
  const status = String(value ?? "").toLowerCase();
  if (
    [
      "active",
      "ready",
      "processed",
      "sent",
      "delivered",
      "valid",
      "completed",
      "submitted",
    ].includes(status)
  )
    return "good";
  if (
    [
      "pending",
      "queued",
      "processing",
      "due_soon",
      "correction_requested",
      "override",
    ].includes(status)
  )
    return "warn";
  if (
    ["failed", "invalid", "overdue", "revoked", "disabled", "expired"].includes(
      status,
    )
  )
    return "bad";
  if (["open", "draft", "uploaded"].includes(status)) return "info";
  return "neutral";
}

export function ReadinessBar({ value }: { value: unknown }) {
  const numberValue = Math.max(0, Math.min(100, Number(value ?? 0)));
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-teal-700"
          style={{
            width: `${Number.isFinite(numberValue) ? numberValue : 0}%`,
          }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-slate-700">
        {Math.round(numberValue)}%
      </span>
    </div>
  );
}

export function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: unknown; tone?: Tone }>;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {items.map((item) => (
        <div key={item.label} className="min-w-20">
          <div className="text-xs text-slate-500">{item.label}</div>
          <div
            className={cn(
              "mt-0.5 font-semibold text-slate-900",
              item.tone === "bad" && "text-red-800",
              item.tone === "warn" && "text-amber-800",
              item.tone === "good" && "text-green-800",
            )}
          >
            {String(item.value ?? 0)}
          </div>
        </div>
      ))}
    </div>
  );
}
