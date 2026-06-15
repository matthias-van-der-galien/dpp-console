"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Label, Textarea } from "@/components/ui/field";
import { Badge, ReadinessBar, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiBaseUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

type Props = { productId: string };

function qualityList(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).join(", ");
}

export function ProductDetailScreen({ productId }: Props) {
  const [tab, setTab] = useState("inbox");
  const queryClient = useQueryClient();
  const readiness = useQuery({
    queryKey: ["product", productId, "readiness"],
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/products/${productId}/readiness`),
  });
  const inbox = useQuery({
    queryKey: ["product", productId, "inbox"],
    queryFn: () => apiFetch<unknown>(`/products/${productId}/evidence-inbox`),
  });
  const history = useQuery({
    queryKey: ["product", productId, "history"],
    queryFn: () => apiFetch<unknown>(`/products/${productId}/evidence-history`),
  });
  const audit = useQuery({
    queryKey: ["product", productId, "audit"],
    queryFn: () => apiFetch<unknown>(`/products/${productId}/audit-events`),
  });
  const snapshot = useMutation({
    mutationFn: () =>
      apiFetch(`/products/${productId}/output-snapshots`, {
        method: "POST",
        body: {},
      }),
  });
  const accept = useMutation({
    mutationFn: (fieldId: string) =>
      apiFetch(`/extracted-fields/${fieldId}/accept`, {
        method: "POST",
        body: {},
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["product", productId] }),
  });
  const reject = useMutation({
    mutationFn: ({ fieldId, reason }: { fieldId: string; reason: string }) =>
      apiFetch(`/extracted-fields/${fieldId}/reject`, {
        method: "POST",
        body: { reason },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["product", productId] }),
  });

  const inboxRows = toArray<Record<string, unknown>>(inbox.data);
  const historyRows = toArray<Record<string, unknown>>(history.data);
  const auditRows = toArray<Record<string, unknown>>(audit.data);

  return (
    <>
      <PageHeading
        title="Product Detail"
        description={`Readiness, evidence review and immutable exports for ${productId}.`}
      />
      <div className="mb-4 grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readiness.isError ? <ErrorNote error={readiness.error} /> : null}
            <ReadinessBar
              value={readiness.data?.readinessScore ?? readiness.data?.score}
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Pack</div>
                <div className="font-medium">
                  {String(
                    readiness.data?.packKey ??
                      (readiness.data?.pack &&
                      typeof readiness.data.pack === "object"
                        ? (readiness.data.pack as Record<string, unknown>).key
                        : undefined) ??
                      "default",
                  )}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Overrides</div>
                <div className="font-medium">
                  {String(
                    (
                      readiness.data?.qualitySummary as
                        | Record<string, unknown>
                        | undefined
                    )?.overrides ?? 0,
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outputs</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={() => snapshot.mutate()}
              disabled={snapshot.isPending}
            >
              <RotateCcw className="size-4" />
              Create snapshot
            </Button>
            <a
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
              href={`${apiBaseUrl}/products/${productId}/export.json`}
            >
              <Download className="size-4" />
              JSON
            </a>
            <a
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
              href={`${apiBaseUrl}/products/${productId}/export.csv`}
            >
              <Download className="size-4" />
              CSV
            </a>
            <a
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
              href={`${apiBaseUrl}/products/${productId}/audit-pack.zip`}
            >
              <Download className="size-4" />
              Audit ZIP
            </a>
          </CardContent>
        </Card>
      </div>
      <div className="mb-4 flex gap-2">
        {["inbox", "history", "audit"].map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "secondary"}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      {tab === "inbox" ? (
        <Card>
          <CardHeader>
            <CardTitle>Evidence inbox</CardTitle>
          </CardHeader>
          <CardContent>
            {inbox.isError ? <ErrorNote error={inbox.error} /> : null}
            {inboxRows.length === 0 ? (
              <p className="text-sm text-slate-500">
                No evidence candidates returned.
              </p>
            ) : null}
            {inboxRows.length > 0 ? (
              <div className="space-y-3">
                {inboxRows.map((row, index) => {
                  const candidate = (
                    Array.isArray(row.candidates) ? row.candidates[0] : row
                  ) as Record<string, unknown>;
                  const fieldId = String(
                    candidate.id ?? row.extractedFieldId ?? row.id ?? "",
                  );
                  return (
                    <div
                      key={fieldId || index}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-slate-950">
                            {String(
                              row.fieldKey ?? candidate.fieldKey ?? "field",
                            )}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {String(candidate.value ?? row.value ?? "No value")}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge
                              value={
                                row.status ?? candidate.status ?? "candidate"
                              }
                              tone={statusTone(row.status ?? candidate.status)}
                            />
                            <Badge
                              value={
                                row.validationStatus ??
                                candidate.validationStatus ??
                                "unknown"
                              }
                              tone={statusTone(
                                row.validationStatus ??
                                  candidate.validationStatus,
                              )}
                            />
                            {qualityList(row.qualityFlags) ? (
                              <span className="text-xs text-amber-700">
                                {qualityList(row.qualityFlags)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => accept.mutate(fieldId)}
                            disabled={!fieldId || accept.isPending}
                          >
                            <Check className="size-4" />
                            Accept
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() =>
                              reject.mutate({
                                fieldId,
                                reason: "Rejected in console review",
                              })
                            }
                            disabled={!fieldId || reject.isPending}
                          >
                            <X className="size-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {tab === "history" ? (
        <Card>
          <CardHeader>
            <CardTitle>Evidence history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  <TH>Field</TH>
                  <TH>Value</TH>
                  <TH>Status</TH>
                  <TH>Source</TH>
                </tr>
              </THead>
              <tbody>
                {historyRows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    <TCell>{String(row.fieldKey ?? "")}</TCell>
                    <TCell>
                      {String(row.value ?? row.normalizedValue ?? "")}
                    </TCell>
                    <TCell>
                      <Badge
                        value={row.status ?? row.validationStatus ?? "accepted"}
                        tone={statusTone(row.status ?? row.validationStatus)}
                      />
                    </TCell>
                    <TCell>
                      {String(row.documentId ?? row.sourceDocumentId ?? "")}
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      {tab === "audit" ? (
        <Card>
          <CardHeader>
            <CardTitle>Audit events</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  <TH>Type</TH>
                  <TH>Actor</TH>
                  <TH>When</TH>
                </tr>
              </THead>
              <tbody>
                {auditRows.map((row, index) => (
                  <tr key={String(row.id ?? index)}>
                    <TCell>{String(row.type ?? row.eventType ?? "")}</TCell>
                    <TCell>{String(row.actorUserId ?? row.userId ?? "")}</TCell>
                    <TCell>
                      {formatDateTime(row.createdAt ?? row.occurredAt)}
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Manual correction note</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_220px]">
          <div>
            <Label htmlFor="correction">Correction reason</Label>
            <Textarea
              id="correction"
              placeholder="Describe what the supplier needs to fix."
            />
          </div>
          <Button className="mt-5" variant="secondary" disabled>
            Correction is request-scoped
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
