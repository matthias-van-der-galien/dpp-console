import { describe, expect, it } from "vitest";

import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth/token-store";

describe("token store", () => {
  it("stores auth token in session storage", () => {
    setStoredToken("dev-token");
    expect(getStoredToken()).toBe("dev-token");
    clearStoredToken();
    expect(getStoredToken()).toBeNull();
  });
});
