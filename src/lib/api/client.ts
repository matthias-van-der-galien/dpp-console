import { apiBaseUrl } from "@/lib/api/config";
import { DppApiError, type DppErrorEnvelope } from "@/lib/api/errors";
import { getStoredToken } from "@/lib/auth/token-store";

export type JsonRecord = Record<string, unknown>;
export type PageResponse<T = JsonRecord> = {
  items: T[];
  nextCursor: string | null;
};

type ApiOptions = Omit<RequestInit, "body" | "headers"> & {
  body?: BodyInit | JsonRecord | null;
  headers?: HeadersInit;
  auth?: boolean;
};

function isJsonBody(body: unknown): body is JsonRecord {
  return (
    Boolean(body) &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob)
  );
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = options.auth === false ? null : getStoredToken();
  let body = options.body as BodyInit | undefined;

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (isJsonBody(options.body)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    body,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const envelope = contentType.includes("application/json")
      ? ((await response.json()) as DppErrorEnvelope)
      : {
          error: "http_error",
          message: await response.text(),
          requestId: response.headers.get("x-request-id") ?? "unknown",
        };
    throw new DppApiError(response.status, envelope);
  }

  if (response.status === 204) return undefined as T;
  if (contentType.includes("application/json"))
    return (await response.json()) as T;
  return (await response.text()) as T;
}

export async function downloadApiFile(path: string, fallbackFilename: string) {
  const headers = new Headers();
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, { headers });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const envelope = contentType.includes("application/json")
      ? ((await response.json()) as DppErrorEnvelope)
      : {
          error: "download_failed",
          message: await response.text(),
          requestId: response.headers.get("x-request-id") ?? "unknown",
        };
    throw new DppApiError(response.status, envelope);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename =
    disposition.match(/filename="?([^"]+)"?/)?.[1] ?? fallbackFilename;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
