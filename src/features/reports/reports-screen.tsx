"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Play, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Badge, ReadinessBar, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiBaseUrl } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { formatDateTime, toArray } from "@/lib/utils/format";
import { PageHeading } from "@/features/common/page-heading";

const reports = [
  {
    key: "product-readiness",
    title: "Product readiness",
    path: "/reports/product-readiness",
    csv: "/reports/product-readiness.csv",
  },
  {
    key: "supplier-performance",
    title: "Supplier performance",
    path: "/reports/supplier-performance",
    csv: "/reports/supplier-performance.csv",
  },
  {
    key: "evidence-quality",
    title: "Evidence quality",
    path: "/reports/evidence-quality",
    csv: "/reports/evidence-quality.csv",
  },
];

export function ReportsScreen() {
  const queryClient = useQueryClient();
  const snapshots = useQuery({
    queryKey: ["report-snapshots"],
    queryFn: () => apiFetch<unknown>("/report-snapshots"),
  });
  const subscription = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/report-subscriptions", {
        method: "POST",
        body: {
          name: "Weekly readiness digest",
          type: "product_readiness",
          format: "both",
          cadence: "weekly",
        },
      }),
  });
  const runNow = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/report-subscriptions/${id}/run-now`, {
        method: "POST",
        body: {},
      }),
  });
  const snapshot = useMutation({
    mutationFn: (type: string) =>
      apiFetch("/report-snapshots", { method: "POST", body: { type } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["report-snapshots"] }),
  });

  return (
    <>
      <PageHeading
        title="Reports"
        description="Workspace intelligence for readiness, supplier performance and evidence quality."
      />
      <div className="grid gap-4 xl:grid-cols-3">
        {reports.map((report) => (
          <ReportCard
            key={report.key}
            report={report}
            onSnapshot={() => snapshot.mutate(report.key.replaceAll("-", "_"))}
          />
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Report snapshots</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots.isError ? <ErrorNote error={snapshots.error} /> : null}
            <Table>
              <THead>
                <tr>
                  <TH>Type</TH>
                  <TH>Pack</TH>
                  <TH>Created</TH>
                  <TH>Exports</TH>
                </tr>
              </THead>
              <tbody>
                {toArray<Record<string, unknown>>(snapshots.data).map((row) => (
                  <tr key={String(row.id)}>
                    <TCell>{String(row.type ?? "")}</TCell>
                    <TCell>{String(row.packKey ?? row.pack_key ?? "")}</TCell>
                    <TCell>
                      {formatDateTime(row.createdAt ?? row.created_at)}
                    </TCell>
                    <TCell>
                      <div className="flex gap-2">
                        <a
                          className="text-sm font-medium text-teal-700 hover:underline"
                          href={`${apiBaseUrl}/report-snapshots/${String(row.id)}/export.json`}
                        >
                          JSON
                        </a>
                        <a
                          className="text-sm font-medium text-teal-700 hover:underline"
                          href={`${apiBaseUrl}/report-snapshots/${String(row.id)}/export.csv`}
                        >
                          CSV
                        </a>
                      </div>
                    </TCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Digest automation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Create a weekly product readiness subscription, then run it now to
              produce a snapshot and notification event.
            </p>
            {subscription.isError ? (
              <ErrorNote error={subscription.error} />
            ) : null}
            {runNow.isError ? <ErrorNote error={runNow.error} /> : null}
            <Button
              onClick={() => subscription.mutate()}
              disabled={subscription.isPending}
            >
              <Save className="size-4" />
              Create digest
            </Button>
            {subscription.data?.id ? (
              <Button
                variant="secondary"
                onClick={() => runNow.mutate(String(subscription.data?.id))}
              >
                <Play className="size-4" />
                Run now
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ReportCard({
  report,
  onSnapshot,
}: {
  report: (typeof reports)[number];
  onSnapshot: () => void;
}) {
  const query = useQuery({
    queryKey: ["report", report.key],
    queryFn: () => apiFetch<unknown>(report.path),
  });
  const rows = toArray<Record<string, unknown>>(query.data);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{report.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isError ? <ErrorNote error={query.error} /> : null}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onSnapshot}>
            <Save className="size-4" />
            Snapshot
          </Button>
          <a
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium"
            href={`${apiBaseUrl}${report.csv}`}
          >
            <Download className="size-4" />
            CSV
          </a>
        </div>
        <div className="max-h-80 overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Score</TH>
              </tr>
            </THead>
            <tbody>
              {rows.slice(0, 8).map((row, index) => (
                <tr key={String(row.id ?? index)}>
                  <TCell>
                    {String(
                      row.productName ??
                        row.supplierName ??
                        row.fieldKey ??
                        row.name ??
                        "row",
                    )}
                  </TCell>
                  <TCell>
                    <Badge
                      value={
                        row.status ??
                        row.slaStatus ??
                        row.validationStatus ??
                        "live"
                      }
                      tone={statusTone(
                        row.status ?? row.slaStatus ?? row.validationStatus,
                      )}
                    />
                  </TCell>
                  <TCell>
                    <ReadinessBar
                      value={row.readinessScore ?? row.averageReadiness ?? 0}
                    />
                  </TCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
