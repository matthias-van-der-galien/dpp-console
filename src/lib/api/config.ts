export const apiBaseUrl =
  process.env.NEXT_PUBLIC_DPP_API_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:3000";

export const authMode = process.env.NEXT_PUBLIC_AUTH_MODE ?? "jwt-token";
