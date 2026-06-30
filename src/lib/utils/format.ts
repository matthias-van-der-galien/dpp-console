export function formatPercent(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return "0%";
  return `${Math.round(numberValue)}%`;
}

export function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: unknown) {
  if (!value || typeof value !== "string") return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function titleize(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return "Unknown";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

export function humanizeKey(value: unknown) {
  if (typeof value !== "string" || value.length === 0)
    return "Evidence requirement";
  return titleize(value);
}

export function evidenceLabel(value: Record<string, unknown>) {
  return String(
    value.label ??
      value.fieldLabel ??
      value.title ??
      humanizeKey(value.fieldKey ?? value.key),
  );
}

export function formatBytes(value: unknown) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Configured by buyer";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

export function toArray<T = Record<string, unknown>>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "items" in value) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  return [];
}

export function getId(value: Record<string, unknown>) {
  return String(value.id ?? value.productId ?? value.supplierId ?? "");
}
