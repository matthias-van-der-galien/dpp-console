"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, RotateCcw, SearchCheck, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label, Select } from "@/components/ui/field";
import { StatusText, statusTone } from "@/components/ui/status";
import { InlineState, RecordList, RecordRow } from "@/components/ui/structured";
import { apiFetch, buildQuery } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";

type Props = {
  title?: string;
  description?: string;
  products: Array<Record<string, unknown>>;
  suppliers?: Array<Record<string, unknown>>;
  initialProductId?: string;
  emptyState?: string;
  onProductChange?: (productId: string) => void;
};

function productName(product: Record<string, unknown>) {
  return String(
    product.name ?? product.productName ?? product.sku ?? product.id,
  );
}

function supplierName(supplier: Record<string, unknown>) {
  return String(supplier.name ?? supplier.supplierName ?? supplier.id ?? "");
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

function documentName(document: Record<string, unknown>) {
  return String(document.filename ?? document.name ?? document.id);
}

function EvidenceCandidateCount({ documentId }: { documentId: string }) {
  const fields = useQuery({
    queryKey: ["document", documentId, "extracted-fields"],
    queryFn: () =>
      apiFetch<unknown>(`/documents/${documentId}/extracted-fields`),
    enabled: Boolean(documentId),
  });

  if (fields.isError) {
    return <span className="text-xs text-red-700">Fields unavailable</span>;
  }

  if (fields.isLoading) {
    return (
      <span className="text-sm text-slate-500">Counting candidates...</span>
    );
  }

  return (
    <span className="text-sm text-slate-600">
      {toArray(fields.data).length} candidates
    </span>
  );
}

function DocumentRow({
  document,
  productId,
}: {
  document: Record<string, unknown>;
  productId: string;
}) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/documents/${id}/retry`, { method: "POST", body: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
  const status = String(document.status ?? "uploaded");
  const documentId = String(document.id ?? "");
  const failureReason = String(document.failureReason ?? "");

  const extraction =
    status === "processed" ? (
      <EvidenceCandidateCount documentId={documentId} />
    ) : status === "failed" ? (
      <span className="text-sm text-red-700">
        {failureReason || "Extraction failed"}
      </span>
    ) : (
      <span className="text-sm text-slate-500">Waiting for extraction</span>
    );

  return (
    <RecordRow
      title={documentName(document)}
      description={formatDateTime(document.createdAt ?? document.uploadedAt)}
      meta={
        <>
          <StatusText value={status} tone={statusTone(status)} />
          {document.packKey ? <span>{String(document.packKey)}</span> : null}
          {extraction}
        </>
      }
      action={
        status === "failed" ? (
          <Button
            variant="secondary"
            onClick={() => retry.mutate(documentId)}
            disabled={retry.isPending}
          >
            <RotateCcw className="size-4" />
            Retry
          </Button>
        ) : status === "processed" ? (
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            href={`/products/${productId}`}
          >
            <SearchCheck className="size-4" />
            Review evidence
          </Link>
        ) : (
          <span className="inline-flex h-9 items-center gap-2 text-sm text-slate-500">
            <Clock className="size-4" />
            Processing
          </span>
        )
      }
    />
  );
}

export function BuyerDocumentWorkflow({
  title = "Upload supplier document",
  description = "Upload a supplier PDF, XLSX or CSV and review extracted evidence when processing is done.",
  products,
  suppliers = [],
  initialProductId = "",
  emptyState = "Select a product before uploading supplier evidence.",
  onProductChange,
}: Props) {
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
      onProductChange?.(initialProductId);
    }
  }, [initialProductId, onProductChange]);

  const selectedProduct = products.find(
    (product) => String(product.id) === selectedProductId,
  );
  const effectiveSupplierId =
    selectedSupplierId || productSupplierId(selectedProduct) || undefined;
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
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a supplier document first.");
      if (!selectedProductId) throw new Error("Select a product first.");
      return apiFetch<Record<string, unknown>>("/documents", {
        method: "POST",
        body: documentForm(file, selectedProductId, effectiveSupplierId),
      });
    },
    onSuccess: () => {
      setFile(null);
      setNotice("Document uploaded. Extraction status will update here.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({
        queryKey: ["product", selectedProductId],
      });
    },
  });
  const documentRows = toArray<Record<string, unknown>>(documents.data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-500">{description}</p>
        {products.length === 0 ? (
          <InlineState title={emptyState} />
        ) : (
          <>
            <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <Label htmlFor="buyer-document-product">Product</Label>
                <Select
                  id="buyer-document-product"
                  value={selectedProductId}
                  onChange={(event) => {
                    const productId = event.target.value;
                    setSelectedProductId(productId);
                    onProductChange?.(productId);
                    setSelectedSupplierId("");
                  }}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={String(product.id)} value={String(product.id)}>
                      {String(product.sku ?? product.id)} -{" "}
                      {productName(product)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="buyer-document-supplier">Supplier</Label>
                <Select
                  id="buyer-document-supplier"
                  value={selectedSupplierId}
                  onChange={(event) =>
                    setSelectedSupplierId(event.target.value)
                  }
                >
                  <option value="">Use product supplier</option>
                  {suppliers.map((supplier) => (
                    <option
                      key={String(supplier.id)}
                      value={String(supplier.id)}
                    >
                      {supplierName(supplier)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="buyer-document-file">Supplier document</Label>
                <Input
                  id="buyer-document-file"
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <Button
                className="mt-5"
                onClick={() => upload.mutate()}
                disabled={!file || !selectedProductId || upload.isPending}
              >
                <Upload className="size-4" />
                Upload and extract
              </Button>
            </div>
            {notice ? <InlineState title={notice} tone="success" /> : null}
            {upload.isError ? <ErrorNote error={upload.error} /> : null}
            {documents.isError ? <ErrorNote error={documents.error} /> : null}
            {selectedProductId && documentRows.length === 0 ? (
              <InlineState
                title="No documents uploaded yet."
                detail="Upload the first supplier document to start extraction."
              />
            ) : null}
            {documentRows.length > 0 ? (
              <RecordList>
                {documentRows.map((document) => (
                  <DocumentRow
                    key={String(document.id)}
                    document={document}
                    productId={selectedProductId}
                  />
                ))}
              </RecordList>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
