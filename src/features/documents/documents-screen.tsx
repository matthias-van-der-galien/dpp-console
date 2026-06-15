"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

export function DocumentsScreen() {
  const [file, setFile] = useState<File | null>(null);
  const [productId, setProductId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const queryClient = useQueryClient();
  const documents = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<unknown>("/documents"),
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first");
      const form = new FormData();
      form.set("file", file);
      form.set("product_id", productId);
      if (supplierId) form.set("supplier_id", supplierId);
      return apiFetch("/documents", { method: "POST", body: form });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
  const retry = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/documents/${id}/retry`, { method: "POST", body: {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });
  const rows = toArray<Record<string, unknown>>(documents.data);

  return (
    <>
      <PageHeading
        title="Documents"
        description="Upload evidence files and monitor extraction status, retries and pack pinning."
      />
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Upload document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Product ID</Label>
              <Input
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
              />
            </div>
            <div>
              <Label>Supplier ID</Label>
              <Input
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              />
            </div>
            <div>
              <Label>File</Label>
              <Input
                type="file"
                accept=".pdf,.xlsx,.csv"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {upload.isError ? <ErrorNote error={upload.error} /> : null}
            <Button
              onClick={() => upload.mutate()}
              disabled={upload.isPending || !file || !productId}
            >
              <Upload className="size-4" />
              Upload and extract
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Document pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.isError ? <ErrorNote error={documents.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>Status</TH>
                  <TH>Pack</TH>
                  <TH>Uploaded</TH>
                  <TH>Retry</TH>
                </tr>
              </THead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.filename ?? row.name ?? row.id)}</TCell>
                    <TCell>
                      <Badge
                        value={row.status ?? "uploaded"}
                        tone={statusTone(row.status)}
                      />
                    </TCell>
                    <TCell>{String(row.packKey ?? "")}</TCell>
                    <TCell>
                      {formatDateTime(row.createdAt ?? row.uploadedAt)}
                    </TCell>
                    <TCell>
                      <Button
                        variant="secondary"
                        onClick={() => retry.mutate(String(row.id))}
                        disabled={retry.isPending}
                      >
                        Retry
                      </Button>
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
