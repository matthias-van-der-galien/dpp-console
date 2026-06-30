"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, RotateCcw, Send, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Label, Textarea } from "@/components/ui/field";
import {
  Badge,
  MetricStrip,
  ReadinessBar,
  StatusText,
  statusTone,
} from "@/components/ui/status";
import { RecordList, RecordRow } from "@/components/ui/structured";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch, downloadApiFile } from "@/lib/api/client";
import { evidenceLabel, formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

type Props = { productId: string };

function qualityList(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item)).join(", ");
}

function qualityValue(summary: unknown, key: string) {
  if (!summary || typeof summary !== "object") return 0;
  return Number((summary as Record<string, unknown>)[key] ?? 0);
}

const blockerOrder: Record<string, number> = {
  conflicting: 0,
  expired: 1,
  low_confidence: 2,
  missing: 3,
  accepted: 4,
};

function sortedInboxRows(rows: Array<Record<string, unknown>>) {
  return [...rows].sort((left, right) => {
    const leftStatus = String(left.status ?? "");
    const rightStatus = String(right.status ?? "");
    return (
      (blockerOrder[leftStatus] ?? 10) - (blockerOrder[rightStatus] ?? 10) ||
      String(left.fieldKey ?? "").localeCompare(String(right.fieldKey ?? ""))
    );
  });
}

function sourceDetails(value: unknown) {
  if (!value || typeof value !== "object") return [];
  const ref = value as Record<string, unknown>;
  return [
    ref.documentId ? `Document ${String(ref.documentId).slice(0, 8)}` : "",
    ref.page ? `Page ${String(ref.page)}` : "",
    ref.sheet ? `Sheet ${String(ref.sheet)}` : "",
    ref.row ? `Row ${String(ref.row)}` : "",
    ref.cell ? `Cell ${String(ref.cell)}` : "",
  ].filter(Boolean);
}

function sourceSnippet(value: unknown) {
  if (!value || typeof value !== "object") return "";
  return String((value as Record<string, unknown>).snippet ?? "");
}

export function ProductDetailScreen({ productId }: Props) {
  const [tab, setTab] = useState("inbox");
  const [correctionReason, setCorrectionReason] = useState("");
  const [rejectingFieldId, setRejectingFieldId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
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
  const requests = useQuery({
    queryKey: ["product", productId, "requests"],
    queryFn: () =>
      apiFetch<unknown>(`/products/${productId}/evidence-requests`),
  });
  const snapshot = useMutation({
    mutationFn: () =>
      apiFetch(`/products/${productId}/output-snapshots`, {
        method: "POST",
        body: {},
      }),
  });
  const download = useMutation({
    mutationFn: ({ path, filename }: { path: string; filename: string }) =>
      downloadApiFile(path, filename),
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
    onSuccess: () => {
      setRejectingFieldId("");
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });
  const correction = useMutation({
    mutationFn: (requestId: string) =>
      apiFetch(`/evidence-requests/${requestId}/request-correction`, {
        method: "POST",
        body: {
          reason:
            correctionReason.trim() ||
            "Please correct the highlighted evidence blockers.",
          reissue_invite: true,
        },
      }),
    onSuccess: () => {
      setCorrectionReason("");
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
    },
  });

  const inboxRows = sortedInboxRows(
    toArray<Record<string, unknown>>(inbox.data),
  );
  const historyRows = toArray<Record<string, unknown>>(history.data);
  const auditRows = toArray<Record<string, unknown>>(audit.data);
  const requestRows = toArray<Record<string, unknown>>(requests.data);
  const activeRequest = requestRows.find((request) =>
    ["open", "correction_requested"].includes(String(request.status ?? "open")),
  );
  const activeRequestId = String(activeRequest?.id ?? "");
  const qualitySummary = readiness.data?.qualitySummary;

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
            <div className="text-sm text-slate-600">
              Pack:{" "}
              {String(
                readiness.data?.packKey ??
                  (readiness.data?.pack &&
                  typeof readiness.data.pack === "object"
                    ? (readiness.data.pack as Record<string, unknown>).key
                    : undefined) ??
                  "default",
              )}
            </div>
            <MetricStrip
              items={[
                {
                  label: "Accepted",
                  value: qualityValue(qualitySummary, "acceptedValid"),
                  tone: "good",
                },
                {
                  label: "Missing",
                  value: qualityValue(qualitySummary, "missing"),
                  tone: "warn",
                },
                {
                  label: "Conflicts",
                  value: qualityValue(qualitySummary, "conflicting"),
                  tone: "bad",
                },
                {
                  label: "Expired",
                  value: qualityValue(qualitySummary, "expired"),
                  tone: "warn",
                },
                {
                  label: "Low confidence",
                  value: qualityValue(qualitySummary, "lowConfidence"),
                  tone: "warn",
                },
              ]}
            />
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
            <Button
              variant="secondary"
              onClick={() =>
                download.mutate({
                  path: `/products/${productId}/export.json`,
                  filename: `product-${productId}.json`,
                })
              }
              disabled={download.isPending}
            >
              <Download className="size-4" />
              JSON
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                download.mutate({
                  path: `/products/${productId}/export.csv`,
                  filename: `product-${productId}.csv`,
                })
              }
              disabled={download.isPending}
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                download.mutate({
                  path: `/products/${productId}/audit-pack.zip`,
                  filename: `product-${productId}-audit-pack.zip`,
                })
              }
              disabled={download.isPending}
            >
              <Download className="size-4" />
              Audit ZIP
            </Button>
            {download.isError ? <ErrorNote error={download.error} /> : null}
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
              <RecordList>
                {inboxRows.map((row, index) => {
                  const candidate = (
                    Array.isArray(row.candidates) && row.candidates[0]
                      ? row.candidates[0]
                      : row
                  ) as Record<string, unknown>;
                  const fieldId = String(
                    candidate.id ?? row.extractedFieldId ?? row.id ?? "",
                  );
                  const sourceRef = candidate.sourceRef ?? row.sourceRef;
                  const source = sourceDetails(sourceRef);
                  const snippet = sourceSnippet(sourceRef);
                  const requirement = evidenceLabel({
                    ...row,
                    ...candidate,
                  });
                  const status = row.status ?? candidate.status ?? "candidate";
                  const validation =
                    row.validationStatus ??
                    candidate.validationStatus ??
                    "unknown";
                  return (
                    <RecordRow
                      key={fieldId || index}
                      title={requirement}
                      description={
                        <span>
                          <span className="font-medium text-slate-900">
                            {String(candidate.value ?? row.value ?? "No value")}
                          </span>
                          {source.length > 0 ? (
                            <span className="ml-2 text-xs text-slate-500">
                              {source.join(" · ")}
                            </span>
                          ) : null}
                          {snippet ? (
                            <span className="mt-1 block text-xs text-slate-500">
                              {snippet}
                            </span>
                          ) : null}
                        </span>
                      }
                      meta={
                        <>
                          <StatusText
                            value={status}
                            tone={statusTone(status)}
                          />
                          <StatusText
                            value={validation}
                            tone={statusTone(validation)}
                          />
                          {qualityList(row.qualityFlags) ? (
                            <span className="text-amber-700">
                              {qualityList(row.qualityFlags)}
                            </span>
                          ) : null}
                        </>
                      }
                      action={
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => accept.mutate(fieldId)}
                              disabled={!fieldId || accept.isPending}
                            >
                              <Check className="size-4" />
                              Accept value
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setRejectingFieldId(fieldId);
                                setRejectReason("");
                              }}
                              disabled={!fieldId || reject.isPending}
                            >
                              <X className="size-4" />
                              Reject and ask supplier
                            </Button>
                          </div>
                          {rejectingFieldId === fieldId ? (
                            <div className="w-80 rounded-md border border-slate-200 bg-slate-50 p-2">
                              <Label htmlFor={`reject-${fieldId}`}>
                                Rejection reason
                              </Label>
                              <Textarea
                                id={`reject-${fieldId}`}
                                className="mt-1 min-h-20"
                                value={rejectReason}
                                placeholder="Tell the supplier what is wrong or missing."
                                onChange={(event) =>
                                  setRejectReason(event.target.value)
                                }
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  onClick={() => setRejectingFieldId("")}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="danger"
                                  disabled={
                                    reject.isPending || !rejectReason.trim()
                                  }
                                  onClick={() =>
                                    reject.mutate({
                                      fieldId,
                                      reason: rejectReason.trim(),
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ) : null}
                          <button
                            className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
                            type="button"
                            disabled
                          >
                            Edit / override
                          </button>
                        </div>
                      }
                    />
                  );
                })}
              </RecordList>
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
          <CardTitle>Request supplier correction</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_220px]">
          <div>
            <Label htmlFor="correction">Correction reason</Label>
            <Textarea
              id="correction"
              value={correctionReason}
              placeholder="Describe what the supplier needs to fix."
              onChange={(event) => setCorrectionReason(event.target.value)}
            />
            {!activeRequestId ? (
              <p className="mt-2 text-xs text-slate-500">
                Create an evidence request for this product before asking a
                supplier for corrections.
              </p>
            ) : null}
            {correction.isError ? <ErrorNote error={correction.error} /> : null}
          </div>
          <Button
            className="mt-5"
            variant="secondary"
            disabled={!activeRequestId || correction.isPending}
            onClick={() => correction.mutate(activeRequestId)}
          >
            <Send className="size-4" />
            Request correction
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
