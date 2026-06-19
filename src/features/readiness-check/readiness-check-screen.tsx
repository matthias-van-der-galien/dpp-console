"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Download,
  FileSpreadsheet,
  SearchCheck,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label, Select } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { PageHeading } from "@/features/common/page-heading";
import { apiFetch, buildQuery } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";

type ImportRow = {
  product_sku?: string;
  product_name?: string;
  supplier_name?: string;
  supplier_external_id?: string;
  supplier_contact_email?: string;
  battery_category?: string;
};

type ImportError = {
  row?: number;
  field?: string;
  message?: string;
};

type ImportPreview = {
  valid?: boolean;
  rows?: ImportRow[];
  errors?: ImportError[];
};

type ImportResult = ImportPreview & {
  imported?: number;
  products?: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
};

const templateCsv = [
  "product_sku,product_name,supplier_name,supplier_external_id,supplier_contact_email,battery_category",
  "BAT-001,Industrial Battery Pack,Acme Cells,ACME-001,quality@acme.example,industrial",
].join("\n");

const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv)}`;

function importForm(file: File) {
  const form = new FormData();
  form.set("file", file);
  return form;
}

function productName(product: Record<string, unknown>) {
  return String(
    product.name ?? product.productName ?? product.sku ?? product.id,
  );
}

function productSupplierId(product: Record<string, unknown> | undefined) {
  if (!product) return "";
  return String(product.supplierId ?? product.supplier_id ?? "");
}

function documentForm(
  file: File,
  productId: string,
  supplierId: string | undefined,
) {
  const form = new FormData();
  form.set("file", file);
  form.set("product_id", productId);
  form.set("pack_key", "battery-passport-readiness");
  if (supplierId) form.set("supplier_id", supplierId);
  return form;
}

export function ReadinessCheckScreen() {
  const [file, setFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const queryClient = useQueryClient();

  const previewImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV or XLSX file first.");
      return apiFetch<ImportPreview>("/imports/product-suppliers/preview", {
        method: "POST",
        body: importForm(file),
      });
    },
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
    },
  });

  const commitImport = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV or XLSX file first.");
      return apiFetch<ImportResult>("/imports/product-suppliers", {
        method: "POST",
        body: importForm(file),
      });
    },
    onSuccess: (data) => {
      setResult(data);
      setPreview(data);
      setSelectedProductId(String(data.products?.[0]?.id ?? ""));
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["reports", "overview"] });
    },
  });

  const rows = preview?.rows ?? [];
  const errors = preview?.errors ?? [];
  const importedProducts = result?.products ?? [];
  const selectedProduct = importedProducts.find(
    (product) => String(product.id) === selectedProductId,
  );
  const documents = useQuery({
    queryKey: ["documents", selectedProductId],
    queryFn: () =>
      apiFetch<unknown>(
        `/documents${buildQuery({ product_id: selectedProductId })}`,
      ),
    enabled: Boolean(selectedProductId),
    refetchInterval: (query) => {
      const items = toArray<Record<string, unknown>>(query.state.data);
      return items.some((item) =>
        ["uploaded", "processing"].includes(String(item.status ?? "")),
      )
        ? 3000
        : false;
    },
  });
  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!documentFile) throw new Error("Choose a supplier document first.");
      if (!selectedProductId) throw new Error("Select a product first.");
      return apiFetch<Record<string, unknown>>("/documents", {
        method: "POST",
        body: documentForm(
          documentFile,
          selectedProductId,
          productSupplierId(selectedProduct) || undefined,
        ),
      });
    },
    onSuccess: () => {
      setDocumentFile(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({
        queryKey: ["product", selectedProductId],
      });
    },
  });
  const documentRows = toArray<Record<string, unknown>>(documents.data);

  return (
    <>
      <PageHeading
        title="Battery Passport Readiness Check"
        description="Upload product and supplier data, preview issues, then start the evidence workflow."
      />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Import product suppliers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950">
              <div className="font-medium">Expected columns</div>
              <div className="mt-1 text-teal-900">
                product_sku, product_name, supplier_name, supplier_external_id,
                supplier_contact_email, battery_category
              </div>
            </div>
            <div>
              <Label htmlFor="readiness-import">CSV or XLSX file</Label>
              <Input
                id="readiness-import"
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setResult(null);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => previewImport.mutate()}
                disabled={!file || previewImport.isPending}
              >
                <FileSpreadsheet className="size-4" />
                Preview import
              </Button>
              <Button
                variant="secondary"
                onClick={() => commitImport.mutate()}
                disabled={
                  !file || commitImport.isPending || preview?.valid === false
                }
              >
                <Upload className="size-4" />
                Import rows
              </Button>
              <a
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                href={templateHref}
                download="battery-readiness-import-template.csv"
              >
                <Download className="size-4" />
                Template
              </a>
            </div>
            {previewImport.isError ? (
              <ErrorNote error={previewImport.error} />
            ) : null}
            {commitImport.isError ? (
              <ErrorNote error={commitImport.error} />
            ) : null}
            {preview ? (
              <div className="flex items-center gap-2 text-sm">
                <Badge
                  value={preview.valid ? "ready to import" : "needs fixes"}
                  tone={preview.valid ? "good" : "bad"}
                />
                <span className="text-slate-600">
                  {preview.valid
                    ? `${rows.length} rows are ready.`
                    : `${errors.length} import issues found.`}
                </span>
              </div>
            ) : null}
            {result ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="size-4" />
                  Imported {String(result.imported ?? rows.length)} rows.
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {importedProducts.map((product) => (
                    <Link
                      key={String(product.id)}
                      className="rounded-full border border-green-200 bg-white px-2 py-1 text-xs font-medium text-green-900 hover:underline"
                      href={`/products/${String(product.id)}`}
                    >
                      {productName(product)}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preview rows</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Preview an import file to see product and supplier rows.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <tr>
                        <TH>SKU</TH>
                        <TH>Product</TH>
                        <TH>Supplier</TH>
                        <TH>Contact</TH>
                        <TH>Category</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={`${row.product_sku ?? "row"}-${index}`}>
                          <TCell>{row.product_sku}</TCell>
                          <TCell>{row.product_name}</TCell>
                          <TCell>{row.supplier_name}</TCell>
                          <TCell>{row.supplier_contact_email}</TCell>
                          <TCell>{row.battery_category}</TCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {errors.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Import issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Row</TH>
                        <TH>Field</TH>
                        <TH>Issue</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {errors.map((error, index) => (
                        <tr key={`${error.row ?? "file"}-${index}`}>
                          <TCell>{String(error.row ?? "File")}</TCell>
                          <TCell>{String(error.field ?? "")}</TCell>
                          <TCell>{String(error.message ?? "")}</TCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Upload first supplier document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {importedProducts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Import product and supplier rows first, then upload the first PDF,
              XLSX or CSV evidence document.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <div>
                  <Label htmlFor="readiness-product">Product</Label>
                  <Select
                    id="readiness-product"
                    value={selectedProductId}
                    onChange={(event) =>
                      setSelectedProductId(event.target.value)
                    }
                  >
                    {importedProducts.map((product) => (
                      <option
                        key={String(product.id)}
                        value={String(product.id)}
                      >
                        {String(product.sku ?? product.id)} -{" "}
                        {productName(product)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="readiness-document">Supplier document</Label>
                  <Input
                    id="readiness-document"
                    type="file"
                    accept=".pdf,.xlsx,.csv"
                    onChange={(event) =>
                      setDocumentFile(event.target.files?.[0] ?? null)
                    }
                  />
                </div>
                <Button
                  className="mt-5"
                  onClick={() => uploadDocument.mutate()}
                  disabled={
                    !documentFile ||
                    !selectedProductId ||
                    uploadDocument.isPending
                  }
                >
                  <Upload className="size-4" />
                  Upload and extract
                </Button>
              </div>
              {uploadDocument.isError ? (
                <ErrorNote error={uploadDocument.error} />
              ) : null}
              {documents.isError ? <ErrorNote error={documents.error} /> : null}
              {documentRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No documents uploaded for this product yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <tr>
                        <TH>Name</TH>
                        <TH>Status</TH>
                        <TH>Pack</TH>
                        <TH>Uploaded</TH>
                        <TH>Review</TH>
                      </tr>
                    </THead>
                    <tbody>
                      {documentRows.map((document) => (
                        <tr key={String(document.id)}>
                          <TCell>
                            {String(
                              document.filename ?? document.name ?? document.id,
                            )}
                          </TCell>
                          <TCell>
                            <Badge
                              value={document.status ?? "uploaded"}
                              tone={statusTone(document.status)}
                            />
                          </TCell>
                          <TCell>{String(document.packKey ?? "")}</TCell>
                          <TCell>
                            {formatDateTime(
                              document.createdAt ?? document.uploadedAt,
                            )}
                          </TCell>
                          <TCell>
                            <Link
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                              href={`/products/${selectedProductId}`}
                            >
                              <SearchCheck className="size-4" />
                              Review evidence
                            </Link>
                          </TCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
