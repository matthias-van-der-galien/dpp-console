import { describe, expect, it } from "vitest";

import { DppApiError, isDppError, userFacingError } from "@/lib/api/errors";

describe("api error helpers", () => {
  it("renders DPP envelopes for operators", () => {
    const error = new DppApiError(403, {
      error: "insufficient_scope",
      message: "Missing scope",
      requestId: "req_1",
    });

    expect(isDppError(error)).toBe(true);
    expect(userFacingError(error)).toContain("insufficient_scope");
  });
});
