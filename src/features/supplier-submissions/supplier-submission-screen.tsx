"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Input, Label } from "@/components/ui/field";
import { Badge, StatusText, statusTone } from "@/components/ui/status";
import {
  FieldList,
  InlineState,
  RecordList,
  RecordRow,
} from "@/components/ui/structured";
import { apiFetch } from "@/lib/api/client";
import {
  evidenceLabel,
  formatBytes,
  formatDateTime,
  humanizeKey,
  toArray,
} from "@/lib/utils/format";

export function SupplierSubmissionScreen({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedNotice, setUploadedNotice] = useState("");
  const [completedNotice, setCompletedNotice] = useState("");
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
    onSuccess: () => {
      setUploadedNotice("Document uploaded. We will process it for the buyer.");
      setCompletedNotice("");
      setFile(null);
      queryClient.invalidateQueries({
        queryKey: ["supplier-submission", token, "documents"],
      });
    },
  });
  const complete = useMutation({
    mutationFn: () =>
      apiFetch(`/supplier-submissions/${token}/complete`, {
        method: "POST",
        body: {},
        auth: false,
      }),
    onSuccess: () => {
      setCompletedNotice("Submission completed. The buyer can now review it.");
      queryClient.invalidateQueries({
        queryKey: ["supplier-submission", token],
      });
    },
  });

  const product = context.data?.product as Record<string, unknown> | undefined;
  const supplier = context.data?.supplier as
    | Record<string, unknown>
    | undefined;
  const request = context.data?.evidenceRequest as
    | Record<string, unknown>
    | undefined;
  const requestedFields = Array.isArray(request?.requestedFieldKeys)
    ? request.requestedFieldKeys.map((item) => humanizeKey(String(item)))
    : Array.isArray(context.data?.requestedFieldKeys)
      ? context.data.requestedFieldKeys.map((item) => humanizeKey(String(item)))
      : [];
  const documentRows = toArray<Record<string, unknown>>(documents.data);
  const canComplete = documentRows.length > 0;
  const hasProcessingDocument = documentRows.some((row) =>
    ["uploaded", "processing"].includes(String(row.status ?? "")),
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <h1 className="text-xl font-semibold text-slate-950">
            Supplier Evidence Upload
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Upload the requested product evidence. No account is needed.
          </p>
        </div>
        {context.isError ? <ErrorNote error={context.error} /> : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Request context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldList
                items={[
                  {
                    label: "Product",
                    value: String(product?.name ?? product?.sku ?? "Product"),
                  },
                  {
                    label: "Supplier",
                    value: String(supplier?.name ?? "Supplier"),
                  },
                  {
                    label: "Status",
                    value: (
                      <Badge
                        value={request?.status ?? "open"}
                        tone={statusTone(request?.status)}
                      />
                    ),
                  },
                  {
                    label: "Due",
                    value: formatDateTime(
                      request?.dueAt ?? context.data?.dueAt,
                    ),
                  },
                  {
                    label: "Accepted files",
                    value: Array.isArray(context.data?.acceptedFileTypes)
                      ? context.data?.acceptedFileTypes.join(", ")
                      : "PDF, XLSX, CSV",
                  },
                  {
                    label: "Max upload",
                    value: formatBytes(context.data?.maxUploadBytes),
                  },
                ]}
              />
              <div>
                <div className="text-xs font-medium text-slate-500">
                  Requested evidence
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {requestedFields.length > 0 ? (
                    requestedFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                      >
                        {field}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-600">
                      Battery Passport readiness documents
                    </span>
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
                <Label htmlFor="supplier-document">Document</Label>
                <Input
                  id="supplier-document"
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              {upload.isError ? <ErrorNote error={upload.error} /> : null}
              {complete.isError ? <ErrorNote error={complete.error} /> : null}
              {uploadedNotice ? (
                <InlineState title={uploadedNotice} tone="success" />
              ) : null}
              {completedNotice ? (
                <InlineState title={completedNotice} tone="success" />
              ) : null}
              {!canComplete ? (
                <InlineState
                  title="Upload first."
                  detail="The buyer needs at least one document before you can complete."
                />
              ) : hasProcessingDocument ? (
                <InlineState
                  title="Processing."
                  detail="You can complete now; the buyer will review extracted evidence when ready."
                  tone="warning"
                />
              ) : (
                <InlineState
                  title="Ready for buyer review."
                  detail="Your uploaded documents are available to the buyer."
                  tone="success"
                />
              )}
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
                disabled={!canComplete || complete.isPending}
              >
                <CheckCircle className="size-4" />
                Complete submission
              </Button>
            </CardContent>
          </Card>
        </div>
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Documents shared with buyer</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.isError ? <ErrorNote error={documents.error} /> : null}
            {documentRows.length === 0 ? (
              <InlineState
                title="No documents shared yet."
                detail="Upload a PDF, XLSX or CSV to start."
              />
            ) : (
              <RecordList>
                {documentRows.map((row) => (
                  <RecordRow
                    key={String(row.id)}
                    title={String(row.filename ?? row.name ?? row.id)}
                    description={formatDateTime(
                      row.createdAt ?? row.uploadedAt,
                    )}
                    meta={
                      <>
                        <StatusText value={row.status ?? "uploaded"} />
                        {row.packKey ? (
                          <span>
                            {evidenceLabel({ fieldKey: row.packKey })}
                          </span>
                        ) : null}
                      </>
                    }
                  />
                ))}
              </RecordList>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
