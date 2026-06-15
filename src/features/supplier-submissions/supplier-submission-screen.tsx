"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";

export function SupplierSubmissionScreen({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const context = useQuery({
    queryKey: ["supplier-submission", token],
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/supplier-submissions/${token}`, {
        auth: false,
      }),
    retry: false,
  });
  const documents = useQuery({
    queryKey: ["supplier-submission", token, "documents"],
    queryFn: () =>
      apiFetch<unknown>(`/supplier-submissions/${token}/documents`, {
        auth: false,
      }),
    retry: false,
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a file first");
      const body = new FormData();
      body.set("file", file);
      return apiFetch(`/supplier-submissions/${token}/documents`, {
        method: "POST",
        body,
        auth: false,
      });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["supplier-submission", token, "documents"],
      }),
  });
  const complete = useMutation({
    mutationFn: () =>
      apiFetch(`/supplier-submissions/${token}/complete`, {
        method: "POST",
        body: {},
        auth: false,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["supplier-submission", token],
      }),
  });

  const product = context.data?.product as Record<string, unknown> | undefined;
  const supplier = context.data?.supplier as
    | Record<string, unknown>
    | undefined;
  const request = context.data?.evidenceRequest as
    | Record<string, unknown>
    | undefined;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-slate-950">
            Supplier Evidence Submission
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload requested documents and complete the submission when ready.
          </p>
        </div>
        {context.isError ? <ErrorNote error={context.error} /> : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Request context</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">Product</div>
                <div className="font-medium">
                  {String(product?.name ?? product?.sku ?? "Product")}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Supplier</div>
                <div className="font-medium">
                  {String(supplier?.name ?? "Supplier")}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Status</div>
                <Badge
                  value={request?.status ?? "open"}
                  tone={statusTone(request?.status)}
                />
              </div>
              <div>
                <div className="text-xs text-slate-500">Due</div>
                <div>
                  {formatDateTime(request?.dueAt ?? context.data?.dueAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  Accepted file types
                </div>
                <div>
                  {Array.isArray(context.data?.acceptedFileTypes)
                    ? context.data?.acceptedFileTypes.join(", ")
                    : "PDF, XLSX, CSV"}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Max upload</div>
                <div>
                  {String(
                    context.data?.maxUploadBytes ?? "Configured by buyer",
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Document</Label>
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              {upload.isError ? <ErrorNote error={upload.error} /> : null}
              {complete.isError ? <ErrorNote error={complete.error} /> : null}
              <Button
                className="w-full"
                onClick={() => upload.mutate()}
                disabled={!file || upload.isPending}
              >
                <Upload className="size-4" />
                Upload document
              </Button>
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => complete.mutate()}
                disabled={complete.isPending}
              >
                <CheckCircle className="size-4" />
                Complete submission
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Uploaded documents</CardTitle>
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
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(documents.data).map((row) => (
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
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
