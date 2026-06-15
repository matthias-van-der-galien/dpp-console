import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatPercent,
  titleize,
  toArray,
} from "@/lib/utils/format";

describe("format utilities", () => {
  it("formats readiness scores", () => {
    expect(formatPercent(99.6)).toBe("100%");
    expect(formatPercent("bad")).toBe("0%");
  });

  it("normalizes labels", () => {
    expect(titleize("due_soon")).toBe("Due Soon");
  });

  it("supports array and paginated responses", () => {
    expect(toArray([{ id: "a" }])).toHaveLength(1);
    expect(toArray({ items: [{ id: "b" }], nextCursor: null })).toHaveLength(1);
  });

  it("formats invalid dates safely", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
