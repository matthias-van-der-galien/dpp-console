"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorNote } from "@/components/ui/error-note";
import { Badge, statusTone } from "@/components/ui/status";
import { TCell, TH, THead, Table } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { PageHeading } from "@/features/common/page-heading";
import { toArray } from "@/lib/utils/format";

export function OpsScreen() {
  const queryClient = useQueryClient();
  const ready = useQuery({
    queryKey: ["ready"],
    queryFn: () => apiFetch<Record<string, unknown>>("/ready"),
  });
  const diagnostics = useQuery({
    queryKey: ["ops", "diagnostics"],
    queryFn: () => apiFetch<Record<string, unknown>>("/ops/diagnostics"),
  });
  const queue = useQuery({
    queryKey: ["queue", "jobs"],
    queryFn: () => apiFetch<unknown>("/queue/jobs?status=failed"),
  });
  const retry = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/queue/jobs/${id}/retry`, { method: "POST", body: {} }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["queue", "jobs"] }),
  });

  return (
    <>
      <PageHeading
        title="Ops"
        description="Readiness, diagnostics and failed queue job retry controls."
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ready.isError ? <ErrorNote error={ready.error} /> : null}
            <Badge
              value={ready.data?.status ?? "unknown"}
              tone={statusTone(ready.data?.status)}
            />
            <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(ready.data?.checks ?? ready.data ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
          </CardHeader>
          <CardContent>
            {diagnostics.isError ? (
              <ErrorNote error={diagnostics.error} />
            ) : null}
            <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(diagnostics.data ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Failed queue jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.isError ? <ErrorNote error={queue.error} /> : null}
          <Table>
            <THead>
              <tr>
                <TH>ID</TH>
                <TH>Queue</TH>
                <TH>Status</TH>
                <TH>Error</TH>
                <TH>Retry</TH>
              </tr>
            </THead>
            <tbody>
              {toArray<Record<string, unknown>>(queue.data).map((row) => (
                <tr key={String(row.id)}>
                  <TCell>{String(row.id)}</TCell>
                  <TCell>{String(row.queueName ?? row.queue ?? "")}</TCell>
                  <TCell>
                    <Badge value={row.status ?? "failed"} tone="bad" />
                  </TCell>
                  <TCell>{String(row.error ?? row.lastError ?? "")}</TCell>
                  <TCell>
                    <Button
                      variant="secondary"
                      onClick={() => retry.mutate(String(row.id))}
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
    </>
  );
}
