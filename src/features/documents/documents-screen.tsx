"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorNote } from "@/components/ui/error-note";
import { PageHeading } from "@/features/common/page-heading";
import { BuyerDocumentWorkflow } from "@/features/documents/buyer-document-workflow";
import { apiFetch } from "@/lib/api/client";
import { toArray } from "@/lib/utils/format";

export function DocumentsScreen() {
  const products = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<unknown>("/products"),
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<unknown>("/suppliers"),
  });
  const productRows = toArray<Record<string, unknown>>(products.data);
  const supplierRows = toArray<Record<string, unknown>>(suppliers.data);

  return (
    <>
      <PageHeading
        title="Documents"
        description="Upload evidence files and monitor extraction status, retries and pack pinning."
      />
      {products.isError ? <ErrorNote error={products.error} /> : null}
      {suppliers.isError ? <ErrorNote error={suppliers.error} /> : null}
      <BuyerDocumentWorkflow
        title="Upload buyer evidence document"
        description="Select a product, upload supplier evidence and jump to the product inbox when extraction is ready."
        products={productRows}
        suppliers={supplierRows}
        emptyState="Import products before uploading supplier evidence."
      />
    </>
  );
}
