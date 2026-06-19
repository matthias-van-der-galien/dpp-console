import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000";
const token = process.env.DPP_DEV_TOKEN ?? "dev-token";
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const productCsv = await readFixture("products.csv");
const evidenceCsv = await readFixture("supplier-evidence.csv");
const sku = `BAT-PILOT-${suffix}`;
const supplierEmail = `pilot-supplier-${suffix}@example.test`;
const pilotCsv = productCsv
  .replace("BAT-PILOT-001", sku)
  .replace("Readiness Pilot Battery Pack", `Readiness Pilot Battery ${suffix}`)
  .replace("PILOT-SUP-001", `PILOT-SUP-${suffix}`)
  .replace("pilot-supplier@example.test", supplierEmail);

const preview = await json("POST", "/imports/product-suppliers/preview", {
  filename: "readiness-pilot-products.csv",
  content: pilotCsv,
});
assert(preview.valid === true, "import preview must be valid");

const imported = await json("POST", "/imports/product-suppliers", {
  filename: "readiness-pilot-products.csv",
  content: pilotCsv,
});
const product = imported.products?.[0];
const supplier = imported.suppliers?.[0];
assert(product?.id, "import must return a product id");
assert(supplier?.id, "import must return a supplier id");

const uploaded = await json("POST", "/documents", {
  filename: "readiness-pilot-supplier-evidence.csv",
  product_id: product.id,
  supplier_id: supplier.id,
  pack_key: "battery-passport-readiness",
  content: evidenceCsv,
});
assert(uploaded?.id, "document upload must return a document id");

const document = await waitForDocument(uploaded.id);
assert(
  document.status === "processed",
  `document must process successfully, got ${document.status}`,
);

const fields = await json("GET", `/documents/${document.id}/extracted-fields`);
assert(Array.isArray(fields), "extracted fields response must be an array");
assert(fields.length > 0, "document must produce extracted fields");

const inbox = await json("GET", `/products/${product.id}/evidence-inbox`);
const inboxItems = Array.isArray(inbox.items) ? inbox.items : [];
assert(inboxItems.length > 0, "product evidence inbox must include fields");

let accepted = 0;
for (const item of inboxItems) {
  const candidate = Array.isArray(item.candidates) ? item.candidates[0] : null;
  if (!candidate?.id) continue;
  await json("POST", `/extracted-fields/${candidate.id}/accept`, {});
  accepted += 1;
}
assert(accepted > 0, "pilot must accept at least one extracted candidate");

const readiness = await json("GET", `/products/${product.id}/readiness`);
assert(
  typeof readiness.readinessScore === "number",
  "readiness must include readinessScore",
);

console.log(
  JSON.stringify(
    {
      ok: true,
      productId: product.id,
      sku,
      documentId: document.id,
      extractedFields: fields.length,
      acceptedCandidates: accepted,
      readinessScore: readiness.readinessScore,
      qualitySummary: readiness.qualitySummary,
      reviewUrl: `/products/${product.id}`,
    },
    null,
    2,
  ),
);

async function readFixture(name) {
  return readFile(resolve(root, "fixtures/readiness-pilot", name), "utf8");
}

async function json(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const detail = parsed?.message ?? parsed?.error ?? text;
    throw new Error(`${method} ${path} failed (${response.status}): ${detail}`);
  }
  return parsed;
}

async function waitForDocument(documentId) {
  const deadline = Date.now() + 30_000;
  let lastDocument;
  while (Date.now() < deadline) {
    lastDocument = await json("GET", `/documents/${documentId}`);
    if (["processed", "failed"].includes(lastDocument.status)) {
      return lastDocument;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `document ${documentId} did not finish processing; last status ${lastDocument?.status}`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
