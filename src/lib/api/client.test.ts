import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadApiFile } from "@/lib/api/client";
import { setStoredToken, clearStoredToken } from "@/lib/auth/token-store";

describe("downloadApiFile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearStoredToken();
    document.body.innerHTML = "";
  });

  it("downloads with bearer auth", async () => {
    setStoredToken("dev-token");
    const click = vi.fn();
    const anchor = document.createElement("a");
    anchor.click = click;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue(
      new Response("id,value\n1,ok", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="export.csv"',
        },
      }),
    );

    await downloadApiFile("/products/product-1/export.csv", "fallback.csv");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/products/product-1/export.csv",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit)
      .headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer dev-token");
    expect(anchor.download).toBe("export.csv");
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("throws API envelopes on failed downloads", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      Response.json(
        { error: "forbidden", message: "Nope", requestId: "req_1" },
        { status: 403 },
      ),
    );

    await expect(
      downloadApiFile("/products/product-1/export.csv", "fallback.csv"),
    ).rejects.toMatchObject({
      status: 403,
      envelope: { error: "forbidden" },
    });
  });
});
