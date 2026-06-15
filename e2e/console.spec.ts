import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:3000/me", async (route) => {
    await route.fulfill({
      json: {
        authMethod: "api_key",
        scopes: ["*"],
        workspace: { id: "workspace-demo", name: "Demo Workspace" },
        user: { id: "user-demo", email: "buyer@example.local", role: "admin" },
      },
    });
  });
  await page.route("http://127.0.0.1:3000/reports/overview", async (route) => {
    await route.fulfill({
      json: {
        counts: { products: 1 },
        readiness: { average: 88 },
        quality: { invalid: 0 },
      },
    });
  });
  await page.route("http://127.0.0.1:3000/ready", async (route) => {
    await route.fulfill({
      json: { status: "ready", checks: { db: "ok", processRole: "combined" } },
    });
  });
  await page.route("http://127.0.0.1:3000/queue/health", async (route) => {
    await route.fulfill({ json: { status: "ready", jobs: { failed: 0 } } });
  });
  await page.route(
    "http://127.0.0.1:3000/supplier-submissions/test-token",
    async (route) => {
      await route.fulfill({
        json: {
          evidenceRequest: {
            status: "open",
            dueAt: "2026-06-30T00:00:00.000Z",
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
    "http://127.0.0.1:3000/supplier-submissions/test-token/documents",
    async (route) => {
      await route.fulfill({
        json: {
          items: [
            {
              id: "doc_1",
              filename: "evidence.pdf",
              status: "processed",
              packKey: "battery-passport-readiness",
            },
          ],
          nextCursor: null,
        },
      });
    },
  );
});

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

test("supplier token page loads without bearer auth", async ({ page }) => {
  await page.goto("/supplier-submissions/test-token");

  await expect(
    page.getByRole("heading", { name: "Supplier Evidence Submission" }),
  ).toBeVisible();
  await expect(page.getByText("Battery Module A")).toBeVisible();
  await expect(page.getByText("evidence.pdf")).toBeVisible();
});
