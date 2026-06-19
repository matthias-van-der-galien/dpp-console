import { expect, test, type Page } from "@playwright/test";

const apiBase = "http://127.0.0.1:3000";

const product = {
  id: "product-1",
  sku: "BAT-001",
  name: "Battery Module A",
  batteryCategory: "industrial",
  supplierId: "supplier-1",
};

const supplier = {
  id: "supplier-1",
  name: "Cell Supplier",
  contactEmail: "quality@supplier.example",
};

const inbox = {
  pack: { key: "battery-passport-readiness" },
  items: [
    {
      fieldKey: "manufacturer_name",
      label: "Manufacturer name",
      status: "conflicting",
      validationStatus: "invalid",
      qualityFlags: ["conflict"],
      candidates: [
        {
          id: "field-1",
          fieldKey: "manufacturer_name",
          value: "Cell Supplier Ltd",
          validationStatus: "invalid",
          sourceRef: {
            documentId: "document-1",
            page: 2,
            snippet: "Manufacturer: Cell Supplier Ltd",
          },
        },
      ],
    },
    {
      fieldKey: "recycled_content",
      label: "Recycled content",
      status: "missing",
      validationStatus: "missing",
      qualityFlags: [],
      candidates: [],
    },
  ],
};

async function mockCoreApi(page: Page) {
  await page.route(`${apiBase}/me`, async (route) => {
    await route.fulfill({
      json: {
        authMethod: "api_key",
        scopes: ["*"],
        workspace: { id: "workspace-demo", name: "Demo Workspace" },
        user: { id: "user-demo", email: "buyer@example.local", role: "admin" },
      },
    });
  });
  await page.route(`${apiBase}/reports/overview`, async (route) => {
    await route.fulfill({
      json: {
        counts: { products: 1 },
        readiness: { average: 88 },
        quality: { invalid: 0 },
      },
    });
  });
  await page.route(`${apiBase}/ready`, async (route) => {
    await route.fulfill({
      json: { status: "ready", checks: { db: "ok", processRole: "combined" } },
    });
  });
  await page.route(`${apiBase}/queue/health`, async (route) => {
    await route.fulfill({ json: { status: "ready", jobs: { failed: 0 } } });
  });
  await page.route(`${apiBase}/products`, async (route) => {
    await route.fulfill({ json: [product] });
  });
  await page.route(`${apiBase}/suppliers`, async (route) => {
    await route.fulfill({ json: [supplier] });
  });
  await page.route(`${apiBase}/documents`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: {
          id: "document-processed",
          filename: "supplier-evidence.pdf",
          status: "processed",
          productId: "product-1",
          supplierId: "supplier-1",
          packKey: "battery-passport-readiness",
          createdAt: "2026-06-19T00:00:00.000Z",
        },
      });
      return;
    }
    await route.fulfill({
      json: { items: [], nextCursor: null },
    });
  });
  await page.route(`${apiBase}/documents?*`, async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            id: "document-processed",
            filename: "supplier-evidence.pdf",
            status: "processed",
            productId: "product-1",
            supplierId: "supplier-1",
            packKey: "battery-passport-readiness",
            createdAt: "2026-06-19T00:00:00.000Z",
          },
          {
            id: "document-failed",
            filename: "failed-evidence.pdf",
            status: "failed",
            productId: "product-1",
            supplierId: "supplier-1",
            packKey: "battery-passport-readiness",
            createdAt: "2026-06-18T00:00:00.000Z",
          },
        ],
        nextCursor: null,
      },
    });
  });
  await page.route(
    `${apiBase}/documents/document-processed/extracted-fields`,
    async (route) => {
      await route.fulfill({
        json: Array.from({ length: 8 }, (_, index) => ({
          id: `candidate-${index + 1}`,
          fieldKey: `field_${index + 1}`,
          value: `value ${index + 1}`,
        })),
      });
    },
  );
  await page.route(
    `${apiBase}/documents/document-failed/retry`,
    async (route) => {
      await route.fulfill({
        json: {
          id: "document-failed",
          filename: "failed-evidence.pdf",
          status: "processing",
        },
      });
    },
  );
  await page.route(
    `${apiBase}/products/product-1/evidence-inbox`,
    async (route) => {
      await route.fulfill({ json: inbox });
    },
  );
  await page.route(`${apiBase}/products/product-1/readiness`, async (route) => {
    await route.fulfill({
      json: {
        product,
        pack: { key: "battery-passport-readiness" },
        readinessScore: 42,
        qualitySummary: {
          acceptedValid: 1,
          missing: 1,
          conflicting: 1,
          expired: 0,
          lowConfidence: 0,
        },
      },
    });
  });
  await page.route(
    `${apiBase}/products/product-1/evidence-history`,
    async (route) => {
      await route.fulfill({ json: { items: [], nextCursor: null } });
    },
  );
  await page.route(
    `${apiBase}/products/product-1/audit-events`,
    async (route) => {
      await route.fulfill({ json: { items: [], nextCursor: null } });
    },
  );
  await page.route(
    `${apiBase}/products/product-1/evidence-requests`,
    async (route) => {
      await route.fulfill({
        json: [
          {
            id: "request-1",
            status: "open",
            productId: "product-1",
            supplierId: "supplier-1",
          },
        ],
      });
    },
  );
  await page.route(`${apiBase}/evidence-requests`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        json: {
          id: "request-1",
          status: "open",
          productId: "product-1",
          supplierId: "supplier-1",
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        items: [
          {
            id: "request-1",
            status: "open",
            productSku: "BAT-001",
            supplierName: "Cell Supplier",
            dueAt: "2026-06-30T00:00:00.000Z",
          },
        ],
        nextCursor: null,
      },
    });
  });
  await page.route(
    `${apiBase}/evidence-requests/request-1/supplier-invites`,
    async (route) => {
      await route.fulfill({
        status: 201,
        json: {
          id: "invite-1",
          uploadUrl: "http://localhost:3001/supplier-submissions/test-token",
        },
      });
    },
  );
  await page.route(
    `${apiBase}/evidence-requests/request-1/request-correction`,
    async (route) => {
      await route.fulfill({ json: { id: "request-1", status: "open" } });
    },
  );
  await page.route(
    `${apiBase}/extracted-fields/field-1/accept`,
    async (route) => {
      await route.fulfill({
        json: {
          id: "evidence-1",
          fieldKey: "manufacturer_name",
          value: "Cell Supplier Ltd",
        },
      });
    },
  );
  await page.route(
    `${apiBase}/supplier-submissions/test-token`,
    async (route) => {
      await route.fulfill({
        json: {
          evidenceRequest: {
            status: "open",
            dueAt: "2026-06-30T00:00:00.000Z",
            requestedFieldKeys: ["manufacturer_name", "recycled_content"],
          },
          product: { name: "Battery Module A" },
          supplier: { name: "Cell Supplier" },
          acceptedFileTypes: ["PDF", "XLSX", "CSV"],
          maxUploadBytes: 10000000,
        },
      });
    },
  );
  await page.route(
    `${apiBase}/supplier-submissions/test-token/documents`,
    async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          json: { id: "doc_2", filename: "new-evidence.pdf" },
        });
        return;
      }
      await route.fulfill({
        json: {
          items: [
            {
              id: "doc_1",
              filename: "evidence.pdf",
              status: "processed",
            },
          ],
          nextCursor: null,
        },
      });
    },
  );
  await page.route(
    `${apiBase}/supplier-submissions/test-token/complete`,
    async (route) => {
      await route.fulfill({ json: { status: "submitted" } });
    },
  );
}

test.beforeEach(async ({ page }) => {
  await mockCoreApi(page);
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Bearer token").fill("dev-token");
  await page.getByRole("button", { name: "Validate and enter" }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace Overview" }),
  ).toBeVisible();
}

test("login loads operational overview", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Bearer token").fill("dev-token");
  await page.getByRole("button", { name: "Validate and enter" }).click();

  await expect(
    page.getByRole("heading", { name: "Workspace Overview" }),
  ).toBeVisible();
  await expect(page.getByText("Demo Workspace")).toBeVisible();
  await expect(page.getByText("88%")).toBeVisible();
});

test("readiness check previews valid CSV and commits import", async ({
  page,
}) => {
  await page.route(
    `${apiBase}/imports/product-suppliers/preview`,
    async (route) => {
      await route.fulfill({
        json: {
          valid: true,
          rows: [
            {
              product_sku: "BAT-001",
              product_name: "Battery Module A",
              supplier_name: "Cell Supplier",
              supplier_contact_email: "quality@supplier.example",
              battery_category: "industrial",
            },
          ],
          errors: [],
        },
      });
    },
  );
  await page.route(`${apiBase}/imports/product-suppliers`, async (route) => {
    await route.fulfill({
      json: {
        valid: true,
        imported: 1,
        rows: [],
        errors: [],
        products: [product],
        suppliers: [supplier],
      },
    });
  });

  await login(page);
  await page.goto("/readiness-check");
  await page.getByLabel("CSV or XLSX file").setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "product_sku,product_name,supplier_name\nBAT-001,Battery Module A,Cell Supplier",
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText("BAT-001")).toBeVisible();
  await page.getByRole("button", { name: "Import rows" }).click();
  await expect(page.getByText("Imported 1 rows.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Upload first supplier document" }),
  ).toBeVisible();
  await page.getByLabel("Supplier document").setInputFiles({
    name: "supplier-evidence.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("demo pdf"),
  });
  const uploadRequest = page.waitForRequest(
    (request) =>
      request.url() === `${apiBase}/documents` && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Upload and extract" }).click();
  await uploadRequest;
  await expect(page.getByText("Document uploaded.")).toBeVisible();
  await expect(page.getByText("8 candidates")).toBeVisible();
  await expect(
    page.getByText("First blockers are ready to review"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review evidence" }).first(),
  ).toHaveAttribute("href", "/products/product-1");
});

test("readiness pilot moves from processing document to review CTA", async ({
  page,
}) => {
  let uploaded = false;
  let processed = false;
  let documentPolls = 0;

  await page.route(
    `${apiBase}/imports/product-suppliers/preview`,
    async (route) => {
      await route.fulfill({
        json: {
          valid: true,
          rows: [
            {
              product_sku: "BAT-001",
              product_name: "Battery Module A",
              supplier_name: "Cell Supplier",
              supplier_contact_email: "quality@supplier.example",
              battery_category: "industrial",
            },
          ],
          errors: [],
        },
      });
    },
  );
  await page.route(`${apiBase}/imports/product-suppliers`, async (route) => {
    await route.fulfill({
      json: {
        valid: true,
        imported: 1,
        rows: [],
        errors: [],
        products: [product],
        suppliers: [supplier],
      },
    });
  });
  await page.route(`${apiBase}/documents`, async (route) => {
    if (route.request().method() === "POST") {
      uploaded = true;
      await route.fulfill({
        status: 201,
        json: {
          id: "document-live",
          filename: "pilot-evidence.csv",
          status: "processing",
          productId: "product-1",
          supplierId: "supplier-1",
          packKey: "battery-passport-readiness",
          createdAt: "2026-06-19T00:00:00.000Z",
        },
      });
      return;
    }
    await route.fallback();
  });
  await page.route(`${apiBase}/documents?*`, async (route) => {
    const status = uploaded && documentPolls > 0 ? "processed" : "processing";
    if (uploaded) {
      documentPolls += 1;
      processed = status === "processed";
    }
    await route.fulfill({
      json: {
        items: uploaded
          ? [
              {
                id: "document-live",
                filename: "pilot-evidence.csv",
                status,
                productId: "product-1",
                supplierId: "supplier-1",
                packKey: "battery-passport-readiness",
                createdAt: "2026-06-19T00:00:00.000Z",
              },
            ]
          : [],
        nextCursor: null,
      },
    });
  });
  await page.route(
    `${apiBase}/documents/document-live/extracted-fields`,
    async (route) => {
      await route.fulfill({
        json: [
          {
            id: "candidate-live-1",
            fieldKey: "manufacturer_name",
            value: "Cell Supplier",
          },
          {
            id: "candidate-live-2",
            fieldKey: "chemistry",
            value: "LFP",
          },
        ],
      });
    },
  );
  await page.route(
    `${apiBase}/products/product-1/evidence-inbox`,
    async (route) => {
      await route.fulfill({
        json: processed
          ? inbox
          : { pack: { key: "battery-passport-readiness" }, items: [] },
      });
    },
  );
  await page.route(`${apiBase}/products/product-1/readiness`, async (route) => {
    await route.fulfill({
      json: {
        product,
        pack: { key: "battery-passport-readiness" },
        readinessScore: processed ? 42 : 0,
        qualitySummary: processed
          ? {
              acceptedValid: 0,
              missing: 1,
              conflicting: 1,
              expired: 0,
              lowConfidence: 0,
            }
          : {
              acceptedValid: 0,
              missing: 0,
              conflicting: 0,
              expired: 0,
              lowConfidence: 0,
            },
      },
    });
  });

  await login(page);
  await page.goto("/readiness-check");
  await page.getByLabel("CSV or XLSX file").setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "product_sku,product_name,supplier_name\nBAT-001,Battery Module A,Cell Supplier",
    ),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await page.getByRole("button", { name: "Import rows" }).click();
  await expect(
    page.getByText("Upload a supplier document to start extraction"),
  ).toBeVisible();

  await page.getByLabel("Supplier document").setInputFiles({
    name: "pilot-evidence.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("field,value\nchemistry,LFP"),
  });
  await page.getByRole("button", { name: "Upload and extract" }).click();

  await expect(page.getByText("Processing")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review evidence" }),
  ).toBeVisible();
  await expect(page.getByText("2 candidates")).toBeVisible();
  await expect(
    page.getByText("First blockers are ready to review"),
  ).toBeVisible();
});

test("readiness check shows invalid import row errors", async ({ page }) => {
  await page.route(
    `${apiBase}/imports/product-suppliers/preview`,
    async (route) => {
      await route.fulfill({
        json: {
          valid: false,
          rows: [],
          errors: [
            {
              row: 2,
              field: "supplier_name",
              message: "Required",
            },
          ],
        },
      });
    },
  );

  await login(page);
  await page.goto("/readiness-check");
  await page.getByLabel("CSV or XLSX file").setInputFiles({
    name: "products.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("product_sku,product_name\nBAT-001,Battery Module A"),
  });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByText("needs fixes")).toBeVisible();
  await expect(page.getByRole("cell", { name: "supplier_name" })).toBeVisible();
});

test("request composer creates request and supplier invite", async ({
  page,
}) => {
  await login(page);
  await page.goto("/evidence-requests");
  await page.getByLabel("Product").selectOption("product-1");
  await page.getByLabel("Supplier").selectOption("supplier-1");
  await page.getByLabel("Additional field keys").fill("carbon_footprint");
  await page
    .getByRole("button", { name: "Create request and invite supplier" })
    .click();

  await expect(page.getByText("supplier-submissions/test-token")).toBeVisible();
});

test("product detail prioritizes blockers and accepts evidence", async ({
  page,
}) => {
  await login(page);
  await page.goto("/products/product-1");

  await expect(page.getByText("Conflicts")).toBeVisible();
  await expect(page.getByText("Manufacturer: Cell Supplier Ltd")).toBeVisible();
  await page.getByRole("button", { name: "Accept" }).first().click();
  await page
    .getByLabel("Correction reason")
    .fill("Please send a current cert.");
  await page.getByRole("button", { name: "Request correction" }).click();
});

test("supplier token page uploads and completes without bearer auth", async ({
  page,
}) => {
  await page.goto("/supplier-submissions/test-token");

  await expect(
    page.getByRole("heading", { name: "Supplier Evidence Upload" }),
  ).toBeVisible();
  await expect(page.getByText("Battery Module A")).toBeVisible();
  await expect(
    page.getByText("manufacturer_name, recycled_content"),
  ).toBeVisible();
  await page.getByLabel("Document").setInputFiles({
    name: "evidence.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("demo pdf"),
  });
  await page.getByRole("button", { name: "Upload document" }).click();
  await expect(page.getByText("Document uploaded.")).toBeVisible();
  await page.getByRole("button", { name: "Complete submission" }).click();
  await expect(page.getByText("Submission completed.")).toBeVisible();
});

test("documents page exposes failed document retry", async ({ page }) => {
  await login(page);
  await page.goto("/documents");
  await page.getByLabel("Product").selectOption("product-1");

  await expect(page.getByText("failed-evidence.pdf")).toBeVisible();
  const retryResponse = page.waitForResponse(
    (response) =>
      response.url() === `${apiBase}/documents/document-failed/retry` &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Retry" }).click();
  await retryResponse;
});
