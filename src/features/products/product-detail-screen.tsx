"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, RotateCcw, Send, X } from "lucide-react";
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
                <div className="text-xs text-slate-500">Accepted</div>
                <div className="font-medium">
                  {String(qualityValue(qualitySummary, "acceptedValid"))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Missing</div>
                <div className="font-medium">
                  {String(qualityValue(qualitySummary, "missing"))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Conflicts</div>
                <div className="font-medium">
                  {String(qualityValue(qualitySummary, "conflicting"))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Expired</div>
                <div className="font-medium">
                  {String(qualityValue(qualitySummary, "expired"))}
                </div>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <div className="text-xs text-slate-500">Low confidence</div>
                <div className="font-medium">
                  {String(qualityValue(qualitySummary, "lowConfidence"))}
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
                          {source.length > 0 || snippet ? (
                            <div className="mt-2 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
                              {source.length > 0 ? (
                                <div className="font-medium text-slate-700">
                                  {source.join(" · ")}
                                </div>
                              ) : null}
                              {snippet ? (
                                <div className="mt-1">{snippet}</div>
                              ) : null}
                            </div>
                          ) : null}
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
