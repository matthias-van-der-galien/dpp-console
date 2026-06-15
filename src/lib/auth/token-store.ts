const TOKEN_KEY = "dpp-console-token";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.sessionStorage.removeItem(TOKEN_KEY);
}
